/**
 * 插件资源画像：面向 token 消耗痛点的静态推断。
 *
 * 通过分析插件入口 JS 中 apply(ctx) 挂载的 API 调用，粗略回答三个问题：
 *   1) 是否 hook 每请求热路径事件（重）——llm/stream、agent/request 等
 *   2) 是否一次性命令/仪表盘型（轻）——不订阅任何运行时事件
 *   3) 是否需要额外模型调用——ctx.llm / complete() / 直连 chat API
 *
 * ⚠️ 定位是启发式估算而非精确承诺：基于入口文件正则匹配，混淆或间接注册
 *    会漏判；UI 层必须标注「静态推断」。失败返回 null，绝不阻塞同步。
 */
const ENTRY_TIMEOUT_MS = 15_000;
// 单文件上限与安全扫描对齐；最多探测 2 个候选入口
const MAX_FILE_BYTES = 200_000;

// 入口探测顺序：包声明优先，其后是社区惯例路径（recon 显示多数插件实际代码在 lib/index.js）
const DEFAULT_ENTRY_PATHS = ['lib/index.js', 'src/index.js', 'dist/index.js', 'index.js'];

// 每请求热路径事件：每次 LLM 请求 / agent 步骤 / 工具执行都会触发
function isHotEvent(name) {
  return /^(llm|chat)\//.test(name) ||
    name === 'agent/request' || name === 'agent/pre-step' ||
    /^tools\/(pre|post)-execute$/.test(name);
}
// 会话/代理/工作流生命周期：频率与用户活动线性相关但不在单次请求热路径上
function isLifecycleEvent(name) {
  return /^(session|subagent|workflow|message)\//.test(name) ||
    /^agent\/(status|created|error|disposed|inbox)/.test(name) ||
    name === 'approval/request';
}

// ctx 作用域的事件订阅（限定 ctx. 前缀，避免误捕 Node 流的 res.on('data') 噪音）
const CTX_ON_RE = /\bctx\.(?:on|before|after)\(\s*['"`]([\w/.:-]+)['"`]/g;
const MODEL_CALL_RES = [
  /\bctx\.llm\b/,
  /\bcomplete\s*\(/,
  /\bgenerateText\b/,
  /chat\/completions/,
  /api\.(?:deepseek|openai)\.com/
];
const COMMAND_RES = [/\bctx\.command\s*\(/, /\bregisterCommand\b/];
const WEB_SERVER_RE = /\bwebServer\.register\s*\(/g;
// 入口文件有效性：必须像插件代码而不是 patch 配置
const APPLIES_RE = /\bapply\s*\(|ctx\.(?:on|effect|command)\(/;

async function fetchEntry(url, headers) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'dsh-plugin-sync-bot', ...headers },
    signal: AbortSignal.timeout(ENTRY_TIMEOUT_MS)
  });
  if (!res.ok) return null;
  const text = await res.text();
  return text.length <= MAX_FILE_BYTES ? text : null;
}

// 入口文件发现：声明入口优先，未命中则按惯例路径探测（最多取 2 个有效文件）
async function loadSources(fullName, branch, pkgJson, headers) {
  const declared = [];
  if (pkgJson) {
    const dsh = pkgJson.dsh && typeof pkgJson.dsh === 'object' ? pkgJson.dsh : {};
    [dsh.entry, dsh.main].forEach(v => {
      // 声明可能是字符串或 {file}/{path} 形态
      if (typeof v === 'string') declared.push(v);
      else if (v && typeof v === 'object' && typeof (v.file || v.path) === 'string') declared.push(v.file || v.path);
    });
    if (typeof pkgJson.main === 'string') declared.push(pkgJson.main);
  }
  const candidates = [...new Set(declared.map(p => String(p).replace(/^\.\//, '')))
    , ...DEFAULT_ENTRY_PATHS].slice(0, 6);

  const sources = [];
  for (const p of candidates) {
    try {
      const text = await fetchEntry(`https://raw.githubusercontent.com/${fullName}/${branch}/${p}`, headers);
      if (!text) continue;
      sources.push({ path: p, text });
      // 拿到真实插件代码即可停止（patch yml 等非 JS 文件已被后缀天然过滤）
      if (APPLIES_RE.test(text) || sources.length >= 2) break;
    } catch (e) { /* 单文件失败静默跳过 */ }
  }
  return sources;
}

/**
 * 构建资源画像。
 * @returns {Promise<object|null>} 失败或无有效入口时返回 null（调用方降级为无画像）
 */
async function buildResourceProfile(plugin, pkgJson, headers) {
  const branch = plugin.defaultBranch || 'main';
  const sources = await loadSources(plugin.fullName, branch, pkgJson, headers);
  if (!sources.length) return null;

  const merged = sources.map(s => s.text).join('\n');

  const hotPathHooks = [];
  const lifecycleHooks = [];
  let m;
  CTX_ON_RE.lastIndex = 0;
  while ((m = CTX_ON_RE.exec(merged)) !== null) {
    const name = m[1];
    if (isHotEvent(name)) { if (!hotPathHooks.includes(name)) hotPathHooks.push(name); }
    else if (isLifecycleEvent(name)) { if (!lifecycleHooks.includes(name)) lifecycleHooks.push(name); }
    // 其余（internal/service、settings/updated 等基础设施事件）不影响重量评级
  }

  const modelCalls = MODEL_CALL_RES.some(re => re.test(merged));
  const hasCommands = COMMAND_RES.some(re => re.test(merged));
  const dashboards = (merged.match(WEB_SERVER_RE) || []).length;

  // 三档重量：热路径=重；生命周期钩子或额外模型调用=中；纯命令/仪表盘/静态=轻
  let weight;
  if (hotPathHooks.length) weight = 'heavy';
  else if (lifecycleHooks.length || modelCalls) weight = 'medium';
  else weight = 'light';

  return {
    weight,
    hotPathHooks: hotPathHooks.slice(0, 10),
    lifecycleHooks: lifecycleHooks.slice(0, 10),
    modelCalls,
    hasCommands,
    dashboards,
    scannedFiles: sources.length,
    scannedAt: new Date().toISOString()
  };
}

module.exports = { buildResourceProfile };
