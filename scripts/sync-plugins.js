/**
 * dsh Plugin Sync Script (Strict NPM Verification)
 * 编排入口 —— 各职责拆分于 scripts/lib/:
 *   http.js        HTTP/JSON 请求辅助
 *   github.js      GitHub Search API 拉取与黑名单过滤
 *   npm-verify.js  严格 NPM 真实性双向校验
 *   plugin-type.js Topic -> 插件类型判定
 *   bootstrap.js   index.html 内嵌数据同步
 *   wiki.js        GitHub Wiki Markdown 生成
 *
 * 流程:
 * 1. Queries GitHub Search API for topic:dsh-plugin
 * 2. Filters out blacklisted repos (deepseek-ai/deepseek-harness 等)
 * 3. Strictly verifies if the GitHub repo is legitimately published to NPM Registry
 *    - If verified: `npm i <npm-name>`
 *    - If not on npm but repo has root package.json: `npm i github:<owner>/<repo>`
 *    - If repo has NO root package.json: no npm install command (installCmd = null)，
 *      因为 `npm i github:` 对非 npm 仓库必然报 ENOENT
 * 4. Formats metadata into data/plugins.json
 * 5. Generates GitHub Wiki Markdown pages into wiki_dist/
 */

const path = require('path');
const fs = require('fs');

const { fetchAllRepos, filterExcluded, EXCLUDED_REPOS } = require('./lib/github');
const { fetchJson, probeUrl } = require('./lib/http');
const { verifyNpmPackage, sanitizeVersion } = require('./lib/npm-verify');
const { detectPluginType } = require('./lib/plugin-type');
const { loadPreviousData, injectBootstrap } = require('./lib/bootstrap');
const { generateWiki } = require('./lib/wiki');

async function main() {
  // --bootstrap-only：读取现有 data/plugins.json，仅更新 index.html 内嵌数据（不访问网络）
  if (process.argv.includes('--bootstrap-only')) {
    const prev = loadPreviousData(path.join(__dirname, '..', 'data', 'plugins.json'));
    if (!prev || !Array.isArray(prev.plugins) || !prev.plugins.length) {
      console.error('⛔ --bootstrap-only: data/plugins.json 不存在或为空');
      process.exit(1);
    }
    injectBootstrap(prev.plugins);
    return;
  }

  const token = process.env.GITHUB_TOKEN || '';
  const searchUrl = 'https://api.github.com/search/repositories?q=topic:dsh-plugin+is:public&sort=stars&order=desc&per_page=100';
  const headers = token ? { 'Authorization': `token ${token}` } : {};

  // 中文 README 常见命名约定（按流行度排序），同步时并发探测
  const ZH_README_CANDIDATES = [
    'README.zh-CN.md',
    'README.zh-cn.md',
    'README_ZH.md',
    'README_zh-CN.md',
    'README.zh-Hans.md',
    'README.zh.md',
    'README-zh.md',
    'README-zh_CN.md',
    'README_CN.md',
    '.github/README.zh-CN.md',
    'docs/README.zh-CN.md'
  ];

  // 并发探测所有候选名，按优先级取第一个命中者；无中文文档则返回 null
  async function detectChineseReadme(fullName, branch) {
    const results = await Promise.all(
      ZH_README_CANDIDATES.map(async p => {
        const ok = await probeUrl(`https://raw.githubusercontent.com/${fullName}/${branch}/${p}`, headers);
        return ok ? p : null;
      })
    );
    const hit = ZH_README_CANDIDATES.find(p => results.includes(p));
    return hit ? `https://raw.githubusercontent.com/${fullName}/${branch}/${hit}` : null;
  }

  console.log(`[1/5] 正在拉取 GitHub topic:dsh-plugin 仓库...`);
  const items = await fetchAllRepos(searchUrl, headers);
  // 关键守卫：API 失败/空结果时绝不写文件，防止每小时 cron 清空商城数据
  if (!items || items.length === 0) {
    console.error('⛔ GitHub Search API 拉取失败或返回空结果（限流/网络错误）— 中止同步，保留现有 data/plugins.json');
    process.exit(1);
  }
  console.log(`共检索到 ${items.length} 个项目`);

  console.log(`[2/5] 执行过滤与数据清洗（排除 ${EXCLUDED_REPOS.join(', ')}）...`);
  const filtered = filterExcluded(items);
  console.log(`过滤后有效 dsh 插件数量: ${filtered.length}`);

  console.log(`[3/5] 执行严格 NPM 真实性双向校验...`);
  const batchSize = 10;
  const pluginsData = [];

  for (let i = 0; i < filtered.length; i += batchSize) {
    const batch = filtered.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(async repo => {
      const type = detectPluginType(repo.topics);
      const npmVerification = await verifyNpmPackage(repo);
      const pkgJson = npmVerification.pkgJson;
      const branch = repo.default_branch || 'main';
      const readmeZhUrl = await detectChineseReadme(repo.full_name, branch);

      return {
        id: repo.name,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description || (pkgJson?.description) || '暂无描述',
        author: repo.owner ? repo.owner.login : 'unknown',
        authorAvatar: repo.owner ? repo.owner.avatar_url : '',
        authorUrl: repo.owner ? repo.owner.html_url : '',
        repoUrl: repo.html_url,
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        openIssues: repo.open_issues_count || 0,
        license: repo.license ? (repo.license.spdx_id || repo.license.name) : (pkgJson?.license || 'Unknown'),
        updatedAt: repo.updated_at,
        createdAt: repo.created_at,
        defaultBranch: repo.default_branch || 'main',
        readmeZhUrl,
        tags: (repo.topics || []).filter(t => t.toLowerCase() !== 'dsh-plugin'),
        type: type,
        hasNpm: npmVerification.hasNpm,
        npmName: npmVerification.npmName || null,
        npmUrl: npmVerification.npmUrl || null,
        version: sanitizeVersion(npmVerification.version || pkgJson?.version || null),
        installCmd: npmVerification.installCmd,
        readmeUrl: `https://raw.githubusercontent.com/${repo.full_name}/${repo.default_branch || 'main'}/README.md`
      };
    }));

    pluginsData.push(...batchResults);
    process.stdout.write(`已严格校验 NPM: ${pluginsData.length}/${filtered.length}\r`);
  }

  const npmPlugins = pluginsData.filter(p => p.hasNpm);
  const githubPlugins = pluginsData.filter(p => !p.hasNpm);
  console.log(`\nNPM 严格校验完成：真实发布在 NPM: ${npmPlugins.length} 个，GitHub 直装: ${githubPlugins.length} 个`);

  // 4. 写入 data/plugins.json
  console.log(`[4/5] 写入 data/plugins.json ...`);
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const outputPath = path.join(dataDir, 'plugins.json');
  // 数量骤降守卫：较上次减少超过 50% 视为抓取异常，中止写入
  const prev = loadPreviousData(outputPath);
  if (prev && Array.isArray(prev.plugins) && prev.plugins.length >= 20 &&
      pluginsData.length < Math.floor(prev.plugins.length * 0.5)) {
    console.error(`⛔ 插件数量骤降 (${prev.plugins.length} -> ${pluginsData.length})，疑似抓取/过滤异常 — 中止写入`);
    process.exit(1);
  }
  fs.writeFileSync(outputPath, JSON.stringify({
    updatedAt: new Date().toISOString(),
    total: pluginsData.length,
    npmCount: npmPlugins.length,
    plugins: pluginsData
  }, null, 2), 'utf-8');
  console.log(`已成功生成 ${outputPath}`);

  // 同步更新 index.html 中的内嵌 bootstrap 数据（保证离线与即时可用）
  injectBootstrap(pluginsData);

  // 5. 生成 GitHub Wiki 页面
  console.log(`[5/5] 生成 GitHub Wiki Markdown 文档...`);
  generateWiki(pluginsData, npmPlugins);
}

main().catch(err => {
  console.error('同步失败:', err);
  process.exit(1);
});
