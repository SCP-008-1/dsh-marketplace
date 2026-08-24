/**
 * 验证编排入口：安全扫描 + 健康检查 + 置信度汇总。
 *
 * verification 数据结构（写入 data/plugins.json 每条插件，向后兼容追加）：
 * {
 *   status: 'verified' | 'unverified',   // unverified = 扫描失败/超时，不代表插件危险
 *   scannedAt: ISO 时间,
 *   confidence: 0~100,                    // 可安装置信度
 *   security: { level: 'pass'|'warn'|'danger', findings: [...], scannedFiles: n },
 *   health: { manifestValid, dshBundleDeclared, applyEntry, buildStatus },
 *   lastVerifiedAt: ISO 时间              // 真正重新扫描的时间（缓存命中不刷新）
 * }
 */
const { securityScan } = require('./security-scan');
const { healthCheck } = require('./health-check');
const cache = require('./cache');
const { buildResourceProfile } = require('./resource-profile');

// 单仓库扫描整体超时；到时放弃并标记 unverified，绝不阻塞整轮同步
const SCAN_TIMEOUT_MS = 90_000;
// 单个入口文件的拉取超时：防止对 raw.githubusercontent.com 的挂起连接永不 settle
const FETCH_TIMEOUT_MS = 15_000;
// 扫描并发批次大小（GitHub API 友好）
const VERIFY_CONCURRENCY = 5;

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('scan timeout')), ms);
  });
  // 关键：超时后底层 promise 仍会继续运行，若它随后 reject 会变成
  // unhandled rejection（Node ≥15 默认致命），必须挂空 catch 吸收
  promise.catch(() => {});
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// 可安装置信度（0-100）：
//   安全扫描 50（pass=50 / warn=25 / danger=0）
//   manifest 合法 15 · dsh.bundle 声明 10 · apply() 入口 10
//   构建状态 15（passing=15 / unknown|无 CI=5 / failing=0）
function computeConfidence(security, health) {
  let score = 0;
  score += security.level === 'pass' ? 50 : security.level === 'warn' ? 25 : 0;
  if (health.manifestValid) score += 15;
  if (health.dshBundleDeclared) score += 10;
  if (health.applyEntry) score += 10;
  score += health.buildStatus === 'passing' ? 15 : health.buildStatus === 'failing' ? 0 : 5;
  return score;
}

async function verifyRepo(plugin, pkgJson, headers) {
  const branch = plugin.defaultBranch || 'main';
  const scan = await withTimeout(securityScan(plugin.fullName, branch, headers), SCAN_TIMEOUT_MS);

  // 健康检查的入口文件拉取也纳入超时保护（此前 await 在 withTimeout 之外，
  // 挂起的 raw.githubusercontent.com 连接会绕过 SCAN_TIMEOUT_MS 阻塞整批）
  const health = await withTimeout((async () => {
    const scannedFiles = await fetchEntryFiles(plugin.fullName, branch, pkgJson, headers);
    return healthCheck({
      pkgJson,
      fullName: plugin.fullName,
      branch,
      scannedFiles,
      headers  // 透传 GitHub Token，避免 combined-status 匿名限流(60次/h)导致构建状态全部降级 unknown
    });
  })(), SCAN_TIMEOUT_MS);

  // 资源画像与安全扫描相互独立：失败仅放弃画像，不影响 verification 结果；
  // 内部最多 6 次串行 fetch，必须纳入扫描总超时（与 fetchEntryFiles 同类防护）
  let resource = null;
  try {
    resource = await withTimeout(buildResourceProfile(plugin, pkgJson, headers), SCAN_TIMEOUT_MS);
  } catch (e) { /* 静态推断失败/超时降级为无画像 */ }

  const now = new Date().toISOString();
  return {
    status: 'verified',
    scannedAt: now,
    confidence: computeConfidence(scan, health),
    security: { level: scan.level, findings: scan.findings.slice(0, 20), scannedFiles: scan.scannedFiles },
    health,
    lastVerifiedAt: now,
    resource
  };
}

// 健康检查只需入口文件（main / dsh.entry），最多拉取 2 个文件做 AST 分析
async function fetchEntryFiles(fullName, branch, pkgJson, headers) {
  const declared = [];
  if (pkgJson) {
    if (pkgJson.dsh && typeof pkgJson.dsh === 'object') {
      ['entry', 'bundle', 'main'].forEach(k => {
        if (typeof pkgJson.dsh[k] === 'string') declared.push(pkgJson.dsh[k]);
      });
    }
    if (typeof pkgJson.main === 'string') declared.push(pkgJson.main);
  }
  if (!declared.length) return [];

  const files = await Promise.all([...new Set(declared)].slice(0, 2).map(async p => {
    const clean = p.replace(/^\.\//, '');
    const url = `https://raw.githubusercontent.com/${fullName}/${branch}/${clean}`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'dsh-plugin-sync-bot', ...headers },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
      });
      if (!res.ok) return null;
      const text = await res.text();
      return text.length <= 200_000 ? { path: clean, content: text } : null;
    } catch (e) {
      return null;
    }
  }));
  return files.filter(Boolean);
}

/**
 * 验证主流程：遍历本轮全部插件，增量扫描并就地写入 plugin.verification。
 * @returns 缓存对象（调用方在写完 plugins.json 后 saveCache）
 */
async function runVerificationStage(pluginsData, prevPkgJsonMap, headers) {
  console.log(`\n[3.5/5] 执行可信度验证（AST 安全扫描 + 健康检查）...`);
  const startedAt = Date.now();
  const verCache = cache.loadCache();

  let rescanned = 0, reused = 0, failed = 0;

  async function verifyOne(plugin) {
    const pushedAt = plugin.pushedAt || null;

    // 增量命中：源码未变，直接复用
    const fresh = cache.getFreshEntry(verCache, plugin.fullName, pushedAt);
    if (fresh) {
      plugin.verification = fresh.verification;
      // 画像随缓存复用；旧条目无 resource 字段则保持 undefined（向后兼容）
      if (fresh.resource) plugin.resource = fresh.resource;
      reused++;
      return;
    }

    try {
      const verification = await verifyRepo(plugin, prevPkgJsonMap[plugin.fullName] || null, headers);
      plugin.verification = verification;
      if (verification.resource) plugin.resource = verification.resource;
      cache.putEntry(verCache, plugin.fullName, pushedAt, verification, verification.resource);
      rescanned++;
    } catch (err) {
      // 扫描失败 ≠ 插件危险：显式标记未验证，保留上轮旧结果供前端展示历史置信度
      const previous = verCache.entries[plugin.fullName] && verCache.entries[plugin.fullName].verification;
      plugin.verification = {
        status: 'unverified',
        scannedAt: new Date().toISOString(),
        confidence: previous ? previous.confidence : null,
        security: previous ? previous.security : null,
        health: previous ? previous.health : null,
        lastVerifiedAt: previous ? previous.lastVerifiedAt : null,
        reason: err.message || 'scan failed'
      };
      if (previous && previous.resource) plugin.resource = previous.resource;
      failed++;
    }
  }

  for (let i = 0; i < pluginsData.length; i += VERIFY_CONCURRENCY) {
    await Promise.all(pluginsData.slice(i, i + VERIFY_CONCURRENCY).map(verifyOne));
    process.stdout.write(`可信度验证进度: ${Math.min(i + VERIFY_CONCURRENCY, pluginsData.length)}/${pluginsData.length} (新扫 ${rescanned} · 缓存 ${reused} · 失败 ${failed})\r`);
  }

  cache.pruneCache(verCache, pluginsData.map(p => p.fullName));
  cache.saveCache(verCache);

  const dangerCount = pluginsData.filter(p => p.verification && p.verification.security && p.verification.security.level === 'danger').length;
  console.log(`\n可信度验证完成：新增扫描 ${rescanned}，缓存复用 ${reused}，失败 ${failed}，危险标记 ${dangerCount}，耗时 ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  return verCache;
}

module.exports = { runVerificationStage, computeConfidence };
