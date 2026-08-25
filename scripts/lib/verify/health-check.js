/**
 * 插件健康检查（dsh-plugin-doctor 风格）
 * 检查项：manifest 合法性、dsh.bundle 声明、apply() 入口、CI 构建状态。
 * 输出 health 对象 + 各项布尔结果，置信度分数由上层汇总。
 */
const https = require('https');
const acorn = require('acorn');

function fetchJson(url, headers = {}, timeoutMs = 8000) {
  return new Promise(resolve => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'dsh-plugin-sync-bot', Accept: 'application/vnd.github+json', ...headers },
      timeout: timeoutMs
    }, res => {
      if (res.statusCode < 200 || res.statusCode >= 300) { res.resume(); return resolve(null); }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => { body += c; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

// manifest 合法性：可解析且含 name/version 字符串字段
function checkManifest(pkgJson) {
  return Boolean(
    pkgJson &&
    typeof pkgJson.name === 'string' && pkgJson.name.length > 0 &&
    typeof pkgJson.version === 'string' && /^\d+\.\d+/.test(pkgJson.version)
  );
}

// dsh.bundle 声明：package.json 中存在 dsh.bundle / dsh.entry / dsh.main 任一声明
function checkDshBundle(pkgJson) {
  const dsh = pkgJson && typeof pkgJson.dsh === 'object' ? pkgJson.dsh : null;
  if (!dsh) return false;
  return ['bundle', 'entry', 'main'].some(k =>
    typeof dsh[k] === 'string' && dsh[k].length > 0);
}

// 在入口文件 AST 中查找导出的 apply 函数（命名导出 / module.exports.apply / exports.apply）
// 找不到声明文件时降级为：任一已扫描源码文本中出现 apply 定义特征
function checkApplyEntry(entryPath, scannedFiles) {
  const byPath = new Map(scannedFiles.map(f => [f.path, f.content]));
  const candidates = [];
  if (entryPath && byPath.has(entryPath)) candidates.push(byPath.get(entryPath));
  else candidates.push(...scannedFiles.map(f => f.content));

  for (const src of candidates) {
    if (astExportsApply(src)) return true;
  }
  // 降级：正则兜底（AST 解析失败的文件）
  return candidates.some(src => /\b(apply)\s*[:=]\s*(async\s*)?(function\b|\()/.
    test(src) || /\bexport\s+(async\s+)?function\s+apply\b/.test(src));
}

function astExportsApply(src) {
  let ast;
  try {
    ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', allowReturnOutsideFunction: true });
  } catch (e) {
    try {
      ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true });
    } catch (e2) { return false; }
  }

  let found = false;
  (function walk(node) {
    if (!node || typeof node !== 'object' || found) return;
    if (node.type === 'ExportNamedDeclaration' && node.declaration) {
      const d = node.declaration;
      if ((d.type === 'FunctionDeclaration' || d.type === 'VariableDeclaration')) {
        const names = d.type === 'FunctionDeclaration'
          ? [d.id && d.id.name]
          : d.declarations.map(v => v.id.name);
        if (names.includes('apply')) found = true;
      }
    }
    // exports.apply = ... / module.exports.apply = ... / module.exports = { apply }
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression') {
      const obj = node.left.object;
      const prop = node.left.property;
      const isExportsObj = (obj.name === 'exports') ||
        (obj.object && obj.object.name === 'module' && obj.property && obj.property.name === 'exports');
      if (isExportsObj && prop.name === 'apply') found = true;
      if (obj.name === 'module' && prop.name === 'exports' &&
          node.right.type === 'ObjectExpression' &&
          node.right.properties.some(p => p.key && p.key.name === 'apply')) found = true;
    }
    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'start' || key === 'end') continue;
      const v = node[key];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object' && typeof v.type === 'string') walk(v);
    }
  })(ast);
  return found;
}

// CI 构建状态：GitHub combined status（success → passing；failure/error → failing；其余 unknown）
async function checkBuildStatus(fullName, branch, headers) {
  const res = await fetchJson(
    `https://api.github.com/repos/${fullName}/commits/${encodeURIComponent(branch)}/status`, headers);
  if (!res || !res.state) return 'unknown';
  if (res.state === 'success') return 'passing';
  if (res.state === 'failure' || res.state === 'error') return 'failing';
  return 'unknown';
}

/**
 * 汇总健康检查。
 * @param {object} opts { pkgJson, entryPath, scannedFiles:[{path,content}], fullName, branch, headers }
 */
async function healthCheck(opts) {
  const manifestValid = checkManifest(opts.pkgJson);
  const dshBundleDeclared = checkDshBundle(opts.pkgJson);

  // 入口路径归一化（去掉 ./ 前缀）
  let entryPath = null;
  const declared = opts.pkgJson &&
    (opts.pkgJson.dsh && (opts.pkgJson.dsh.entry || opts.pkgJson.dsh.bundle || opts.pkgJson.dsh.main) ||
     opts.pkgJson.main);
  if (typeof declared === 'string') entryPath = declared.replace(/^\.\//, '');

  const applyEntry = checkApplyEntry(entryPath, opts.scannedFiles);
  const buildStatus = await checkBuildStatus(opts.fullName, opts.branch, opts.headers);

  return {
    manifestValid,
    dshBundleDeclared,
    applyEntry,
    buildStatus
  };
}

module.exports = { healthCheck, checkManifest, checkDshBundle, checkApplyEntry };
