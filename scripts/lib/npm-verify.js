/**
 * 严格 NPM 真实性双向校验：
 * 仓库 package.json -> npm registry 存在性 -> repository/homepage/bugs 元数据双向匹配
 */
const { fetchJson } = require('./http');

// 获取仓库的 package.json（依次尝试 default_branch / main / master）
async function fetchRepoPackageJson(fullName, defaultBranch = 'main') {
  const branches = [defaultBranch, 'main', 'master'].filter((v, i, a) => a.indexOf(v) === i);
  for (const branch of branches) {
    const pkg = await fetchJson(`https://raw.githubusercontent.com/${fullName}/${branch}/package.json`);
    if (pkg && typeof pkg === 'object') {
      return pkg;
    }
  }
  return null;
}

// 严格校验 NPM 包真实归属性
async function verifyNpmPackage(repo) {
  const pkgJson = await fetchRepoPackageJson(repo.full_name, repo.default_branch || 'main');

  // 1. 无 package.json：仓库不是 npm 包，`npm i github:` 必然 ENOENT 失败 → 不生成安装命令
  if (!pkgJson) {
    return {
      hasNpm: false,
      pkgJson: null,
      installCmd: null
    };
  }

  // 标记为私有项目 (private: true) 或无 name 字段：未发布到 npm，回退 GitHub 直装
  if (pkgJson.private === true || !pkgJson.name || typeof pkgJson.name !== 'string') {
    return {
      hasNpm: false,
      pkgJson,
      installCmd: `npm i github:${repo.full_name}`
    };
  }

  const cleanName = pkgJson.name.trim();

  // 包名格式校验（npm 命名规则子集）：防止第三方 package.json 构造恶意字符串流入商城页面
  if (!/^(@[a-zA-Z0-9][a-zA-Z0-9._-]*\/)?[a-zA-Z0-9][a-zA-Z0-9._-]{0,213}$/.test(cleanName)) {
    return {
      hasNpm: false,
      pkgJson,
      installCmd: null
    };
  }

  // 2. 请求 npm registry 确认存在性与发布版本
  const npmData = await fetchJson(`https://registry.npmjs.org/${encodeURIComponent(cleanName).replace('%40', '@')}`);
  const latestVersion = npmData?.['dist-tags']?.latest;

  if (!npmData || !latestVersion) {
    return {
      hasNpm: false,
      pkgJson,
      installCmd: `npm i github:${repo.full_name}`
    };
  }
  // 注：此处保留 github 直装 —— 仓库根目录存在有效 package.json，npm git 协议可安装

  // 3. 双向关联验证：NPM 元数据中的 repository / homepage / bugs / versions 必须与当前 GitHub 仓库相符
  const repoMetaStr = JSON.stringify(npmData.repository || '').toLowerCase();
  const homepage = (npmData.homepage || '').toLowerCase();
  const bugs = JSON.stringify(npmData.bugs || '').toLowerCase();
  const targetLower = repo.full_name.toLowerCase();

  const isRepoMatched = repoMetaStr.includes(targetLower) ||
                        homepage.includes(targetLower) ||
                        bugs.includes(targetLower);

  const isVersionMatched = pkgJson.version && npmData.versions && Boolean(npmData.versions[pkgJson.version]);

  // 仓库归属必须匹配；版本匹配仅作辅助信号，不能单独证明归属
  //（"1.0.0" 几乎存在于所有 npm 包，仅靠版本号会把冒名的同名仓库标记为已验证）
  if (!isRepoMatched) {
    // 同名但属于完全不同第三方的废弃/无关 npm 包
    return {
      hasNpm: false,
      pkgJson,
      installCmd: `npm i github:${repo.full_name}`
    };
  }

  return {
    hasNpm: true,
    npmName: cleanName,
    npmUrl: `https://www.npmjs.com/package/${cleanName}`,
    version: latestVersion,
    installCmd: `npm i ${cleanName}`,
    pkgJson
  };
}

// 版本号消毒：仅保留安全字符，防止流入商城页面
function sanitizeVersion(v) {
  if (v === null || v === undefined) return null;
  return String(v).replace(/[^\w.+-]/g, '').slice(0, 32) || null;
}

module.exports = { fetchRepoPackageJson, verifyNpmPackage, sanitizeVersion };
