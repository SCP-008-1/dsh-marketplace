/**
 * AST 安全扫描器（dsh-poison-guard 风格）
 * 基于 acorn 真解析：动态导入、eval/new Function/vm、混淆特征、外泄端点检测。
 *
 * 设计取舍：
 * - 自实现 ~20 行通用 AST 走查器，避免额外引入 acorn-walk 依赖
 * - 扫描预算受限（文件数/单文件体积），防止超大仓库拖垮每小时 CI
 * - 所有规则输出 findings[{rule,severity,file,line,detail}]，severity ∈ high|medium|low
 */
const https = require('https');
const acorn = require('acorn');

// ---- 扫描预算（防止恶意巨型仓库拖垮 CI）----
const MAX_FILES = 30;            // 单仓库最多扫描的 JS 文件数
const MAX_FILE_BYTES = 200_000;  // 单文件体积上限
const MAX_TOTAL_BYTES = 3_000_000;

// 排除目录/文件：依赖、构建产物、压缩包与测试不参与扫描
const EXCLUDE_PATH_RE = /(^|\/)(node_modules|vendor|dist|build|min|coverage)\/|\.min\.[cm]?js$|(^|\/)(test|tests|__tests__|spec|examples?|docs?)\//i;
const SCAN_EXT_RE = /\.(mjs|cjs|js)$/i;

// 允许的外联端点（插件生态常规域名）；之外的字符串字面量 URL 记为 low 级发现
const ALLOWED_HOST_RE = /(^|\.)github\.com$|(^|\.)githubusercontent\.com$|(^|\.)npmjs\.org$|(^|\.)npmjs\.com$|^localhost$|127\.0\.0\.1$/;

function fetchText(url, headers = {}, timeoutMs = 8000, maxBytes = MAX_FILE_BYTES) {
  return new Promise(resolve => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'dsh-plugin-sync-bot', ...headers },
      timeout: timeoutMs
    }, res => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return resolve(null);
      }
      // 上限裁剪：超过预算的响应直接放弃内容（调用方按需放宽，如 git tree）
      let size = 0;
      const chunks = [];
      res.on('data', c => {
        size += c.length;
        if (size <= maxBytes) chunks.push(c);
        else res.destroy();
      });
      res.on('end', () => resolve(size <= maxBytes ? Buffer.concat(chunks).toString('utf8') : null));
      res.on('close', () => resolve(size <= maxBytes ? Buffer.concat(chunks).toString('utf8') : null));
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

// 从 git tree 中挑选待扫描文件（浅层优先：入口文件几乎总在根/一级目录）
function pickScanFiles(tree) {
  return (tree || [])
    .filter(f => f.type === 'blob' && SCAN_EXT_RE.test(f.path) && !EXCLUDE_PATH_RE.test(f.path))
    .filter(f => (f.size || 0) <= MAX_FILE_BYTES)
    .sort((a, b) =>
      (a.path.split('/').length - b.path.split('/').length) || a.path.localeCompare(b.path))
    .slice(0, MAX_FILES);
}

// 通用 AST 走查器：遍历所有节点，enter 返回 true 则递归子节点
function walk(node, enter, seen = new Set()) {
  if (!node || typeof node.type !== 'string' || seen.has(node)) return;
  seen.add(node);
  enter(node);
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end') continue;
    const v = node[key];
    if (Array.isArray(v)) v.forEach(c => walk(c, enter, seen));
    else if (v && typeof v === 'object' && typeof v.type === 'string') walk(v, enter, seen);
  }
}

function parseSource(src) {
  try {
    return acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', allowReturnOutsideFunction: true, locations: true });
  } catch (e) {
    try {
      return acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true, locations: true });
    } catch (e2) {
      return null; // 非 JS 或语法损坏：不计入 findings，由健康检查另行体现
    }
  }
}

// 混淆启发式：超长疑似 base64 字符串
const LONG_B64_RE = /^[A-Za-z0-9+/=]{200,}$/;
// 字符串原始文本中十六进制转义密度（\xNN 出现 >10 次）
function countHexEscapes(raw) { return (raw.match(/\\x[0-9a-fA-F]{2}/g) || []).length; }

// require/import 的模块名
// 构建/工具链脚本路径：其中的高危模块引用常见且合理（打包、发布脚本），
// 降级为 medium 避免把正常仓库误标为 danger；运行时入口代码仍保持 high
const TOOLING_PATH_RE = /^(scripts?|tools?|bin|\.github|ci)\/|(^|\/)(postinstall|preinstall|release|deploy)[\w.-]*\.(mjs|cjs|js)$/i;

function importedModuleName(node) {
  if (node.type === 'ImportDeclaration' && node.source) return node.source.value;
  if (node.type === 'CallExpression' && node.callee &&
      ((node.callee.name === 'require') ||
       (node.callee.type === 'MemberExpression' && node.callee.object && node.callee.object.name === 'import')) &&
      node.arguments && node.arguments[0] && node.arguments[0].type === 'Literal') {
    return node.arguments[0].value;
  }
  return null;
}

const DANGEROUS_MODULE_RE = /^(node:)?(vm|child_process|worker_threads|injected)(\/.*)?$/;

// 单文件扫描：返回 findings 数组
function scanSource(filePath, src) {
  const findings = [];
  const push = (rule, severity, line, detail) =>
    findings.push({ rule, severity, file: filePath, line: line || 1, detail });

  const ast = parseSource(src);

  // 无 AST 时的降级正则检查（仅混淆特征，与语法无关）
  if (!ast) {
    if (LONG_B64_RE.test(src)) push('long-base64-blob', 'medium', 1, '存在超长 base64 文本块（无法解析为 JS，疑似混淆载荷）');
    return findings;
  }

  walk(ast, node => {
    switch (node.type) {
      case 'CallExpression': {
        const calleeName = node.callee && (node.callee.name ||
          (node.callee.property && node.callee.property.name));
        if (calleeName === 'eval') push('eval-call', 'high', node.loc && node.loc.start.line, '调用 eval() 动态执行代码');
        if (calleeName === 'fromCharCode' && node.arguments.length >= 32) {
          push('fromcharcode-chain', 'high', node.loc && node.loc.start.line,
               `String.fromCharCode 链含 ${node.arguments.length} 个参数，典型反检测混淆手法`);
        }
        const mod = importedModuleName(node);
        if (mod && DANGEROUS_MODULE_RE.test(mod)) {
          const severity = TOOLING_PATH_RE.test(filePath) ? 'medium' : 'high';
          push('dangerous-module', severity, node.loc && node.loc.start.line,
            `${severity === 'medium' ? '工具链脚本' : '运行时代码'}引入 ${mod}`);
        }
        break;
      }
      case 'NewExpression':
        if (node.callee && node.callee.name === 'Function') {
          push('new-function', 'high', node.loc && node.loc.start.line, 'new Function() 动态构造并执行代码');
        }
        break;
      case 'ImportDeclaration': {
        const mod = importedModuleName(node);
        if (mod && DANGEROUS_MODULE_RE.test(mod)) {
          const severity = TOOLING_PATH_RE.test(filePath) ? 'medium' : 'high';
          push('dangerous-module', severity, node.loc && node.loc.start.line,
            `静态引入 ${mod}（${severity === 'medium' ? '工具链脚本' : '运行时代码'}）`);
        }
        break;
      }
      case 'ImportExpression': {
        const arg = node.source;
        const line = node.loc && node.loc.start.line;
        if (arg.type === 'Literal' && typeof arg.value === 'string') {
          if (/^https?:/i.test(arg.value)) push('dynamic-import-url', 'high', line, `import() 远程 URL ${arg.value}`);
          else push('dynamic-import-literal', 'low', line, `动态 import() 固定路径 ${arg.value}`);
        } else if (arg.type !== 'Literal') {
          push('dynamic-import-dynamic', 'medium', line, 'import() 参数为运行时表达式，路径不可静态审计');
        }
        break;
      }
      case 'Literal': {
        const line = node.loc && node.loc.start.line;
        if (typeof node.value === 'string') {
          if (LONG_B64_RE.test(node.value)) {
            push('long-base64-string', 'medium', line, `超长 base64 字符串（${node.value.length} 字符），疑似编码载荷`);
          }
          if (countHexEscapes(node.raw || '') > 10) {
            push('hex-escape-storm', 'high', line, '字符串含大量 \\x 十六进制转义，典型混淆特征');
          }
          if (/^https?:\/\//i.test(node.value)) {
            let host;
            try { host = new URL(node.value).hostname; } catch (e) { host = null; }
            if (host && !ALLOWED_HOST_RE.test(host)) {
              push('external-endpoint', 'low', line, `硬编码外联地址 ${host}（非生态白名单域）`);
            }
          }
        }
        break;
      }
      default:
        break;
    }
  });

  return findings;
}

const SEVERITY_WEIGHT = { high: 3, medium: 2, low: 1 };

// 汇总等级：任一 high → danger；否则任一 medium → warn；否则 pass
function aggregateLevel(findings) {
  if (findings.some(f => f.severity === 'high')) return 'danger';
  if (findings.some(f => f.severity === 'medium')) return 'warn';
  return 'pass';
}

// 对外入口：拉取仓库源码并完成全部规则扫描
async function securityScan(fullName, branch, headers) {
  const treeRes = await fetchText(
    `https://api.github.com/repos/${fullName}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    { ...headers, Accept: 'application/vnd.github+json' }, 10_000, 20_000_000);
  if (!treeRes) throw new Error('tree fetch failed');
  let treeJson;
  try { treeJson = JSON.parse(treeRes); } catch (e) { throw new Error('tree parse failed'); }

  const candidates = pickScanFiles(treeJson.tree || []);
  const findings = [];
  let totalBytes = 0;

  // 串行小并发（4）拉取，兼顾速度与对 raw.githubusercontent 的友好性
  for (let i = 0; i < candidates.length; i += 4) {
    const batch = candidates.slice(i, i + 4);
    const contents = await Promise.all(batch.map(f =>
      fetchText(`https://raw.githubusercontent.com/${fullName}/${branch}/${f.path}`, headers)));
    batch.forEach((f, j) => {
      const src = contents[j];
      if (!src) return;
      totalBytes += src.length;
      if (totalBytes > MAX_TOTAL_BYTES) return;
      findings.push(...scanSource(f.path, src));
    });
  }

  findings.sort((a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]);
  return { level: aggregateLevel(findings), findings, scannedFiles: candidates.length };
}

module.exports = { securityScan, scanSource, aggregateLevel };
