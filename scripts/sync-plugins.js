/**
 * dsh Plugin Sync Script
 * 1. Queries GitHub Search API for topic:dsh-plugin
 * 2. Filters out deepseek-ai/deepseek-harness
 * 3. Checks NPM Registry for existing npm package
 *    - If exists on NPM: install via `npm i <npm-name>`
 *    - If not on NPM: install via `npm i github:<owner>/<repo>`
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

// 请求 GitHub API 辅助函数
function fetchGitHubAPI(url, token) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'dsh-plugin-sync-bot',
      'Accept': 'application/vnd.github.v3+json'
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`JSON 解析错误: ${e.message}`));
          }
        } else {
          reject(new Error(`GitHub API 返回错误 ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

// 检查 NPM 注册表是否存在对应包
function checkNpmPackage(name) {
  if (!name) return Promise.resolve({ exists: false, name: '' });
  return new Promise(resolve => {
    const cleanName = name.trim();
    const req = https.request({
      hostname: 'registry.npmjs.org',
      path: '/' + encodeURIComponent(cleanName).replace('%40', '@'),
      method: 'GET',
      headers: { 'User-Agent': 'dsh-plugin-sync-bot', 'Accept': 'application/json' },
      timeout: 4000
    }, res => {
      if (res.statusCode === 200) {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const latestVersion = data['dist-tags']?.latest || Object.keys(data.versions || {}).pop() || '';
            resolve({ exists: true, name: cleanName, version: latestVersion, description: data.description });
          } catch (e) {
            resolve({ exists: true, name: cleanName });
          }
        });
      } else {
        res.resume();
        resolve({ exists: false, name: cleanName });
      }
    });

    req.on('error', () => resolve({ exists: false, name: cleanName }));
    req.on('timeout', () => { req.destroy(); resolve({ exists: false, name: cleanName }); });
    req.end();
  });
}

// 获取仓库的 package.json 信息（若存在）
function fetchRepoPackageJson(fullName, branch = 'main') {
  return new Promise(resolve => {
    const url = `https://raw.githubusercontent.com/${fullName}/${branch}/package.json`;
    https.get(url, { headers: { 'User-Agent': 'dsh-plugin-sync-bot' }, timeout: 4000 }, res => {
      if (res.statusCode === 200) {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(null);
          }
        });
      } else {
        res.resume();
        resolve(null);
      }
    }).on('error', () => resolve(null));
  });
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

  console.log(`[1/5] 正在拉取 GitHub topic:dsh-plugin 仓库...`);
  const result = await fetchGitHubAPI(searchUrl, token);
  const items = result.items || [];
  console.log(`共检索到 ${items.length} 个项目`);

  console.log(`[2/5] 执行过滤与数据清洗（排除 ${EXCLUDED_REPOS.join(', ')}）...`);
  const filtered = items.filter(repo => {
    const fullName = (repo.full_name || '').toLowerCase();
    const repoName = (repo.name || '').toLowerCase();
    return !EXCLUDED_REPOS.some(ex => fullName === ex.toLowerCase() || repoName === ex.toLowerCase());
  });
  console.log(`过滤后有效 dsh 插件数量: ${filtered.length}`);

  console.log(`[3/5] 并发检测 NPM 包存在性与安装方式...`);
  const batchSize = 10;
  const pluginsData = [];

  for (let i = 0; i < filtered.length; i += batchSize) {
    const batch = filtered.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(async repo => {
      const type = detectPluginType(repo.topics);
      
      // 1. 尝试从 package.json 获取指定的 npm name
      const pkgJson = await fetchRepoPackageJson(repo.full_name, repo.default_branch || 'main');
      const candidateNpmName = pkgJson?.name || repo.name;

      // 2. 校验 candidateNpmName 是否真实发布在 npm registry
      let npmInfo = await checkNpmPackage(candidateNpmName);
      if (!npmInfo.exists && candidateNpmName !== repo.name) {
        // 尝试用 repo.name 检查
        npmInfo = await checkNpmPackage(repo.name);
      }

      let installCmd = '';
      let npmUrl = null;
      let npmVersion = null;

      if (npmInfo.exists) {
        installCmd = `npm i ${npmInfo.name}`;
        npmUrl = `https://www.npmjs.com/package/${npmInfo.name}`;
        npmVersion = npmInfo.version || pkgJson?.version || null;
      } else {
        // 未发布到 NPM 则使用 npm 通过 GitHub 直接安装
        installCmd = `npm i github:${repo.full_name}`;
        npmUrl = null;
        npmVersion = pkgJson?.version || null;
      }

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
        hasNpm: npmInfo.exists,
        npmName: npmInfo.exists ? npmInfo.name : null,
        npmUrl: npmUrl,
        version: npmVersion,
        installCmd: installCmd,
        readmeUrl: `https://raw.githubusercontent.com/${repo.full_name}/${repo.default_branch || 'main'}/README.md`
      };
    }));

    pluginsData.push(...batchResults);
    process.stdout.write(`已检测 NPM: ${pluginsData.length}/${filtered.length}\r`);
  }
  console.log(`\nNPM 检测完成，发布在 NPM 上的插件: ${pluginsData.filter(p => p.hasNpm).length} 个，GitHub 直装插件: ${pluginsData.filter(p => !p.hasNpm).length} 个`);

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
    npmCount: pluginsData.filter(p => p.hasNpm).length,
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

> 本页面由 GitHub Actions 自动化同步生成，实时汇总所有带有 \`dsh-plugin\` 标签的开源插件，并自动检测 NPM 注册表包。
> 更新时间: \`${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} (CST)\` · 收录插件总数: **${pluginsData.length}**

---

## 🚀 快速安装插件

使用 \`npm\` 直接安装生态中的任意插件：

\`\`\`bash
# 若已发布至 npm 注册表：
npm i <package-name>

# 若直接从 GitHub 安装：
npm i github:<owner>/<repo>
\`\`\`

---

## 📦 插件索引目录 (按热度排序)

| 插件名称 / 仓库 | 类型 | 描述 | 发布状态 | 安装命令 | Stars |
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

只需两步，无需审核，自动收录：

1. 创建您的公开 GitHub 仓库。
2. 在仓库右侧 **About** 区域添加 Topic 标签：\`dsh-plugin\`。
3. （可选）如果发布到 npm，本系统将自动检测并在商城中提供 \`npm i <包名>\` 命令；未发布 npm 的项目将自动提供 \`npm i github:<owner>/<repo>\` 安装命令。
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

## 2. 安装分发标准
- **NPM 优先**：如果仓库已执行 \`npm publish\`，商城会自动识别其 npm 包名并展示 \`npm i <pkg>\`。
- **GitHub 自动降级**：如果尚未发布到 npm，商城会自动生成 \`npm i github:<owner>/<repo>\` 命令供用户直接安装。

## 3. 标签分类标准
| Topic 标签 | 对应商城类型 | 说明 |
| :--- | :--- | :--- |
| \`dsh-plugin\` | **必备基准标签** | 所有插件必须包含此标签才能被收录 |
| \`dsh-skill\` | ⚡ Agent 技能 | 提供给 dsh 智能体调用的 Tool / Skill |
| \`dsh-mcp\` | 🔌 MCP 插件 | 实现 Model Context Protocol 协议的服务 |
| \`dsh-theme\` | 🎨 主题外观 | 终端高亮配色与 UI 皮肤 |
| \`dsh-prompt\` | 💡 Prompt 预设 | 领域专家指令集合 |

## 4. 自动同步周期
- GitHub Actions 每 1 小时运行一次自动同步，抓取最新符合条件的仓库、检测 NPM 状态并更新商城与 Wiki。
`;
  fs.writeFileSync(path.join(wikiDir, 'Publish-Guide.md'), publishGuideMarkdown, 'utf-8');

  // 生成 _Footer.md
  const footerMarkdown = `---
*dsh 插件生态 · 由 GitHub Actions 自动化维护*
`;
  fs.writeFileSync(path.join(wikiDir, '_Footer.md'), footerMarkdown, 'utf-8');

  console.log(`Wiki 文件已生成至 ${wikiDir} (包含 Home.md, _Sidebar.md, Publish-Guide.md, _Footer.md)`);
}

main().catch(err => {
  console.error('同步失败:', err);
  process.exit(1);
});
