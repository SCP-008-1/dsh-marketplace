/**
 * 失效检测：识别已删除 / 归档 / 改名的插件仓库。
 *
 * 关键事实：仓库被删除后会从 topic 消失，若只处理本轮抓取结果，
 * 条目会在下一轮同步中静默蒸发——因此必须 diff 上一轮数据找出消失者并主动探测。
 *
 * 状态机（写入 plugin.lifecycle，向后兼容：旧数据无此字段视为 active）：
 *   { status: 'active',    repoMissing?: true }  仓库不可达但 npm 仍可安装（双源规则防误杀）
 *   { status: 'archived' }                       元数据 archived===true，可访问但不再维护
 *   { status: 'dead' }                           仓库 404 且 npm 也失效，不可安装
 *
 * 改名处理：GitHub API 对改名仓库返回 301，fetch 自动跟随；
 * 通过最终 URL 识别新名后，在新条目上附加 formerIds 供前端迁移本地收藏。
 */
const FETCH_TIMEOUT_MS = 15_000;
// 探测并发：消失条目通常很少，小并发足够且对 API 友好
const PROBE_CONCURRENCY = 3;

function extractRepoPath(url) {
  // 兼容两种形态：api.github.com/repos/owner/name 与 github.com/owner/name
  const m = String(url || "").match(/(?:api\.)?github\.com[/:](?:repos\/)?([\w.-]+\/[\w.-]+)/i);
  return m ? m[1].replace(/\.git$/, "").toLowerCase() : null;
}

async function probeRepo(fullName, headers) {
  try {
    const res = await fetch(`https://api.github.com/repos/${fullName}`, {
      headers: { 'User-Agent': 'dsh-plugin-sync-bot', ...headers },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      // 改名检测：请求的 fullName 与响应实际指向不一致（fetch 已自动跟随 301）
      const finalPath = extractRepoPath(res.url) || extractRepoPath(data.html_url);
      const renamedTo = finalPath && finalPath !== fullName.toLowerCase() ? finalPath : null;
      return { alive: true, archived: data.archived === true, renamedTo };
    }
    if (res.status === 404) return { alive: false };
    // 403 限流 / 5xx 等：无法判定，交由调用方保持原状避免误杀
    return { unknown: true };
  } catch (e) {
    return { unknown: true };
  }
}

async function probeNpm(npmName) {
  if (!npmName) return false;
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(npmName)}`, {
      headers: { 'Accept': 'application/vnd.npm.install-v1+json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * 失效检测主流程。
 * @param {Array} pluginsData 本轮 topic 抓取构建的插件列表（就地写入 lifecycle）
 * @param {Array} prevPlugins 上一轮 data/plugins.json 的插件列表
 * @param {object} headers GitHub API 鉴权头
 * @returns {{archived:number, dead:number, orphan:number, renamedMerged:number, retainedMissing:number}}
 */
async function runLivenessStage(pluginsData, prevPlugins, headers) {
  console.log(`\n[3.6/5] 执行失效检测（归档标记 + 消失条目探测）...`);
  const startedAt = Date.now();
  if (!Array.isArray(prevPlugins)) prevPlugins = [];

  const currentByFullName = new Map(pluginsData.map(p => [p.fullName.toLowerCase(), p]));
  const stats = { archived: 0, dead: 0, orphan: 0, renamedMerged: 0, retainedMissing: 0 };

  // Pass 1：现存条目的归档标记（元数据现成字段，零额外请求）
  for (const p of pluginsData) {
    if (p.archived) {
      p.lifecycle = { status: 'archived', checkedAt: new Date().toISOString() };
      stats.archived++;
    }
  }

  // Pass 2：上一轮存在但本轮 topic 中消失的条目 → 逐个探测
  const missing = prevPlugins.filter(p =>
    p && p.fullName && !currentByFullName.has(p.fullName.toLowerCase()));

  async function probeOne(old) {
    const result = await probeRepo(old.fullName, headers);

    // 无法判定（限流/网络）：保持原样，绝不凭单次失败判死
    if (result.unknown) {
      pluginsData.push({ ...old, lifecycle: old.lifecycle || null });
      stats.retainedMissing++;
      return;
    }

    // 存活但脱离 topic：保留条目避免数据静默蒸发
    if (result.alive && !result.renamedTo) {
      pluginsData.push({
        ...old,
        lifecycle: { status: 'active', note: 'not-in-topic', checkedAt: new Date().toISOString() }
      });
      stats.retainedMissing++;
      return;
    }

    // 改名：
    if (result.alive && result.renamedTo) {
      const target = currentByFullName.get(result.renamedTo);
      if (target) {
        // 新名已在本轮收录：合并 formerIds，前端据此迁移收藏；旧条目不重复添加
        target.formerIds = [...new Set([...(target.formerIds || []), old.id])];
        stats.renamedMerged++;
        return;
      }
      // 新名不在本轮（未打 topic 等）：以旧数据为基迁移字段保留条目
      const newName = result.renamedTo.split('/')[1];
      pluginsData.push({
        ...old,
        id: result.renamedTo,
        name: newName,
        fullName: result.renamedTo,
        repoUrl: (old.repoUrl || '').replace(/github\.com\/[^/]+\/[^/]+/, `github.com/${result.renamedTo}`),
        readmeUrl: `https://raw.githubusercontent.com/${result.renamedTo}/${old.defaultBranch || 'main'}/README.md`,
        formerIds: [old.id],
        lifecycle: { status: 'active', note: `renamed-from:${old.fullName}`, checkedAt: new Date().toISOString() }
      });
      stats.retainedMissing++;
      return;
    }

    // 仓库 404：双源规则——npm 仍可安装则不判死，仅标源码不可达
    const npmAlive = await probeNpm(old.npmName);
    if (npmAlive) {
      pluginsData.push({
        ...old,
        lifecycle: { status: 'active', repoMissing: true, checkedAt: new Date().toISOString() }
      });
      stats.orphan++;
      return;
    }

    pluginsData.push({
      ...old,
      lifecycle: { status: 'dead', checkedAt: new Date().toISOString() }
    });
    stats.dead++;
  }

  for (let i = 0; i < missing.length; i += PROBE_CONCURRENCY) {
    await Promise.all(missing.slice(i, i + PROBE_CONCURRENCY).map(probeOne));
  }

  console.log(`失效检测完成：归档 ${stats.archived} · 死链 ${stats.dead} · 仅剩npm ${stats.orphan} · 改名合并 ${stats.renamedMerged} · 脱离topic保留 ${stats.retainedMissing}，耗时 ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  return stats;
}

module.exports = { runLivenessStage, probeRepo, probeNpm, extractRepoPath };
