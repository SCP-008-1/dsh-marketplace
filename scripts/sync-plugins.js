/**
 * dsh Plugin Sync Script (Strict NPM Verification)
 * 1. Queries GitHub Search API for topic:dsh-plugin
 * 2. Filters out deepseek-ai/deepseek-harness
 * 3. Strictly verifies if the GitHub repo is legitimately published to NPM Registry:
 *    - Must have a public package.json (not private)
 *    - package.json.name must exist on registry.npmjs.org with active latest release
 *    - NPM package repository/homepage/bugs metadata must match this GitHub repository
 *    - If verified: `npm i <npm-name>`
 *    - If unverified/not on npm: `npm i github:<owner>/<repo>`
 * 4. Formats metadata into data/plugins.json
 * 5. Generates GitHub Wiki Markdown pages into wiki_dist/
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 黑名单列表（忽略大小写）
const EXCLUDED_REPOS = [
  'deepseek-ai/deepseek-harness',
  'deepseek-harness'
];

// 请求 JSON 辅助函数
function fetchJson(url, headers = {}) {
  return new Promise(resolve => {
    const reqHeaders = {
      'User-Agent': 'dsh-plugin-sync-bot',
      'Accept': 'application/json, text/plain, */*',
      ...headers
    };

    https.get(url, { headers: reqHeaders, timeout: 5000 }, res => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return resolve(null);
      }
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null))
      .on('timeout', function() { this.destroy(); resolve(null); });
  });
}

// 获取仓库的 package.json 信息
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

  // 1. 无 package.json 或标记为私有项目 (private: true) 或无 name 字段
  if (!pkgJson || pkgJson.private === true || !pkgJson.name || typeof pkgJson.name !== 'string') {
    return {
      hasNpm: false,
      pkgJson: pkgJson || null,
      installCmd: `npm i github:${repo.full_name}`
    };
  }

  const cleanName = pkgJson.name.trim();

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

  // 3. 双向关联验证：NPM 元数据中的 repository / homepage / bugs / versions 必须与当前 GitHub 仓库相符
  const repoMetaStr = JSON.stringify(npmData.repository || '').toLowerCase();
  const homepage = (npmData.homepage || '').toLowerCase();
  const bugs = JSON.stringify(npmData.bugs || '').toLowerCase();
  const targetLower = repo.full_name.toLowerCase();

  const isRepoMatched = repoMetaStr.includes(targetLower) ||
                        homepage.includes(targetLower) ||
                        bugs.includes(targetLower);

  const isVersionMatched = pkgJson.version && npmData.versions && Boolean(npmData.versions[pkgJson.version]);

  if (!isRepoMatched && !isVersionMatched) {
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

// 判定插件类型
function detectPluginType(topics = []) {
  const lowerTopics = topics.map(t => t.toLowerCase());
  if (lowerTopics.includes('dsh-skill') || lowerTopics.includes('skill')) return 'skill';
  if (lowerTopics.includes('dsh-mcp') || lowerTopics.includes('mcp')) return 'mcp';
  if (lowerTopics.includes('dsh-theme') || lowerTopics.includes('theme')) return 'theme';
  if (lowerTopics.includes('dsh-prompt') || lowerTopics.includes('prompt')) return 'prompt';
  return 'extension';
}

async function main() {
  const token = process.env.GITHUB_TOKEN || '';
  const searchUrl = 'https://api.github.com/search/repositories?q=topic:dsh-plugin+is:public&sort=stars&order=desc&per_page=100';
  const headers = token ? { 'Authorization': `token ${token}` } : {};

  console.log(`[1/5] 正在拉取 GitHub topic:dsh-plugin 仓库...`);
  const result = await fetchJson(searchUrl, headers);
  const items = result?.items || [];
  console.log(`共检索到 ${items.length} 个项目`);

  console.log(`[2/5] 执行过滤与数据清洗（排除 ${EXCLUDED_REPOS.join(', ')}）...`);
  const filtered = items.filter(repo => {
    const fullName = (repo.full_name || '').toLowerCase();
    const repoName = (repo.name || '').toLowerCase();
    return !EXCLUDED_REPOS.some(ex => fullName === ex.toLowerCase() || repoName === ex.toLowerCase());
  });
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
        tags: (repo.topics || []).filter(t => t.toLowerCase() !== 'dsh-plugin'),
        type: type,
        hasNpm: npmVerification.hasNpm,
        npmName: npmVerification.npmName || null,
        npmUrl: npmVerification.npmUrl || null,
        version: npmVerification.version || pkgJson?.version || null,
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
  fs.writeFileSync(outputPath, JSON.stringify({
    updatedAt: new Date().toISOString(),
    total: pluginsData.length,
    npmCount: npmPlugins.length,
    plugins: pluginsData
  }, null, 2), 'utf-8');
  console.log(`已成功生成 ${outputPath}`);

  // 5. 生成 GitHub Wiki 页面
  console.log(`[5/5] 生成 GitHub Wiki Markdown 文档...`);
  const wikiDir = path.join(__dirname, '..', 'wiki_dist');
  if (!fs.existsSync(wikiDir)) {
    fs.mkdirSync(wikiDir, { recursive: true });
  }

  // 生成 Home.md
  let homeMarkdown = `# 🧩 dsh 插件商城 Wiki

> 本页面由 GitHub Actions 自动化同步生成，实时汇总所有带有 \`dsh-plugin\` 标签的开源插件，并经过 NPM 真实注册双向验证。
> 更新时间: \`${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} (CST)\` · 收录插件总数: **${pluginsData.length}** · NPM 官方包: **${npmPlugins.length}**

---

## 🚀 快速安装插件

使用 \`npm\` 直接安装生态中的任意插件：

\`\`\`bash
# 1. 若项目已真实发布在 NPM 注册表：
npm i <package-name>

# 2. 若项目未发布在 NPM，直接通过 GitHub 仓库引用安装：
npm i github:<owner>/<repo>
\`\`\`

---

## 📦 插件索引目录 (按热度排序)

| 插件名称 / 仓库 | 类型 | 描述 | 发布源 | 安装命令 | Stars |
| :--- | :--- | :--- | :--- | :--- | :--- |
`;

  pluginsData.forEach(p => {
    const typeLabel = {
      extension: '🧩 扩展',
      skill: '⚡ 技能',
      mcp: '🔌 MCP',
      theme: '🎨 主题',
      prompt: '💡 Prompt'
    }[p.type] || '🧩 扩展';

    const cleanDesc = (p.description || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
    const npmBadge = p.hasNpm ? `[npm 📦](${p.npmUrl})` : `GitHub 🐙`;
    homeMarkdown += `| [**${p.name}**](${p.repoUrl})<br><sub>@${p.author}</sub> | \`${typeLabel}\` | ${cleanDesc} | ${npmBadge} | \`${p.installCmd}\` | ⭐ ${p.stars} |\n`;
  });

  homeMarkdown += `
---

## 🛠️ 如何将您的插件提交到商城？

无需人工审核，自动收录并校验：

1. 创建您的公开 GitHub 仓库。
2. 在仓库右侧 **About** 区域添加 Topic 标签：\`dsh-plugin\`。
3. （可选）若希望以 npm 包名分发，请确保 \`package.json\` 未设置 \`"private": true\` 并已发布到 NPM。
4. GitHub Actions 每小时将自动同步并更新商城与 Wiki。
`;

  fs.writeFileSync(path.join(wikiDir, 'Home.md'), homeMarkdown, 'utf-8');

  // 生成 _Sidebar.md
  const sidebarMarkdown = `### 🧩 dsh 插件中心
* [[首页与概览|Home]]
* [[发布与收录指南|Publish-Guide]]

### 🏷️ 插件分类
* [[🧩 核心扩展|Home]]
* [[⚡ Agent 技能|Home]]
* [[🔌 MCP 服务端|Home]]
* [[🎨 个性化主题|Home]]
`;
  fs.writeFileSync(path.join(wikiDir, '_Sidebar.md'), sidebarMarkdown, 'utf-8');

  // 生成 Publish-Guide.md
  const publishGuideMarkdown = `# 📖 dsh 插件发布与规范指南

## 1. 规范要求
- 必须是公开的 GitHub 仓库。
- 拥有 Topic 标签: \`dsh-plugin\`。

## 2. 严格的 NPM 真实性校验
商城会对每个包含 \`dsh-plugin\` 标签的仓库进行真实性双向校验：
- **有效 NPM 包**：仓库根目录包含非私有（\`private != true\`）\`package.json\`，且对应 NPM 包存在于 \`registry.npmjs.org\` 并包含与仓库匹配的代码库关联。生成命令：\`npm i <npm-name>\`。
- **GitHub 直装包**：未发布至 NPM 或为内部项目（如 monorepo/desktop app），自动降级生成：\`npm i github:<owner>/<repo>\`。

## 3. 标签分类标准
| Topic 标签 | 对应商城类型 | 说明 |
| :--- | :--- | :--- |
| \`dsh-plugin\` | **必备基准标签** | 所有插件必须包含此标签才能被收录 |
| \`dsh-skill\` | ⚡ Agent 技能 | 提供给 dsh 智能体调用的 Tool / Skill |
| \`dsh-mcp\` | 🔌 MCP 插件 | 实现 Model Context Protocol 协议的服务 |
| \`dsh-theme\` | 🎨 主题外观 | 终端高亮配色与 UI 皮肤 |
| \`dsh-prompt\` | 💡 Prompt 预设 | 领域专家指令集合 |

## 4. 自动同步周期
- GitHub Actions 每 1 小时运行一次自动同步，抓取最新符合条件的仓库、严格校验 NPM 状态并更新商城与 Wiki。
`;
  fs.writeFileSync(path.join(wikiDir, 'Publish-Guide.md'), publishGuideMarkdown, 'utf-8');

  // 生成 _Footer.md
  const footerMarkdown = `---
*dsh 插件生态 · 由 GitHub Actions 自动化维护*
`;
  fs.writeFileSync(path.join(wikiDir, '_Footer.md'), footerMarkdown, 'utf-8');

  console.log(`Wiki 文件已生成至 ${wikiDir}`);
}

main().catch(err => {
  console.error('同步失败:', err);
  process.exit(1);
});
