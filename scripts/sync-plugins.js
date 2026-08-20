/**
 * dsh Plugin Sync Script
 * 1. Queries GitHub Search API for topic:dsh-plugin
 * 2. Filters out deepseek-ai/deepseek-harness
 * 3. Formats metadata into data/plugins.json
 * 4. Generates GitHub Wiki Markdown pages into wiki_dist/
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

  console.log(`[1/4] 正在拉取 GitHub topic:dsh-plugin 仓库...`);
  const result = await fetchGitHubAPI(searchUrl, token);
  const items = result.items || [];
  console.log(`共检索到 ${items.length} 个项目`);

  console.log(`[2/4] 执行过滤与数据清洗（排除 ${EXCLUDED_REPOS.join(', ')}）...`);
  const filtered = items.filter(repo => {
    const fullName = (repo.full_name || '').toLowerCase();
    const repoName = (repo.name || '').toLowerCase();
    return !EXCLUDED_REPOS.some(ex => fullName === ex.toLowerCase() || repoName === ex.toLowerCase());
  });
  console.log(`过滤后有效 dsh 插件数量: ${filtered.length}`);

  const pluginsData = filtered.map(repo => {
    const type = detectPluginType(repo.topics);
    return {
      id: repo.name,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description || '暂无描述',
      author: repo.owner ? repo.owner.login : 'unknown',
      authorAvatar: repo.owner ? repo.owner.avatar_url : '',
      authorUrl: repo.owner ? repo.owner.html_url : '',
      repoUrl: repo.html_url,
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      openIssues: repo.open_issues_count || 0,
      license: repo.license ? repo.license.spdx_id || repo.license.name : 'Unknown',
      updatedAt: repo.updated_at,
      createdAt: repo.created_at,
      defaultBranch: repo.default_branch || 'main',
      tags: (repo.topics || []).filter(t => t.toLowerCase() !== 'dsh-plugin'),
      type: type,
      installCmd: `dsh install ${repo.full_name}`,
      readmeUrl: `https://raw.githubusercontent.com/${repo.full_name}/${repo.default_branch || 'main'}/README.md`
    };
  });

  // 1. 写入 data/plugins.json
  console.log(`[3/4] 写入 data/plugins.json ...`);
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const outputPath = path.join(dataDir, 'plugins.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    updatedAt: new Date().toISOString(),
    total: pluginsData.length,
    plugins: pluginsData
  }, null, 2), 'utf-8');
  console.log(`已成功生成 ${outputPath}`);

  // 2. 生成 GitHub Wiki 页面
  console.log(`[4/4] 生成 GitHub Wiki Markdown 文档...`);
  const wikiDir = path.join(__dirname, '..', 'wiki_dist');
  if (!fs.existsSync(wikiDir)) {
    fs.mkdirSync(wikiDir, { recursive: true });
  }

  // 生成 Home.md
  let homeMarkdown = `# 🧩 dsh 插件商城 Wiki

> 本页面由 GitHub Actions 自动化同步生成，实时汇总所有带有 \`dsh-plugin\` 标签的开源插件。
> 更新时间: \`${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} (CST)\` · 收录插件总数: **${pluginsData.length}**

---

## 🚀 快速安装插件

使用 \`dsh\` CLI 终端工具直接安装任意插件：

\`\`\`bash
dsh install <owner>/<repo>
\`\`\`

例如：
\`\`\`bash
${pluginsData.length > 0 ? `dsh install ${pluginsData[0].fullName}` : 'dsh install dsh-community/example-plugin'}
\`\`\`

---

## 📦 插件索引目录 (按热度排序)

| 插件名称 / 仓库 | 类型 | 描述 | Stars | 安装命令 |
| :--- | :--- | :--- | :--- | :--- |
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
    homeMarkdown += `| [**${p.name}**](${p.repoUrl})<br><sub>@${p.author}</sub> | \`${typeLabel}\` | ${cleanDesc} | ⭐ ${p.stars} | \`${p.installCmd}\` |\n`;
  });

  homeMarkdown += `
---

## 🛠️ 如何将您的插件提交到商城？

只需三步，无需审核，自动收录：

1. 创建您的公开 GitHub 仓库。
2. 在仓库设置或右侧 **About** 区域添加 Topic 标签：\`dsh-plugin\`。
3. （可选）添加次级标签以细化分类：
   - \`dsh-skill\` (Agent 技能)
   - \`dsh-mcp\` (Model Context Protocol 插件)
   - \`dsh-theme\` (终端/界面主题)
   - \`dsh-prompt\` (预设提示词工程)
4. GitHub Actions 将在下次同步时自动发现并列入本商城与 Wiki。
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
- 必须是公开公开的 GitHub 仓库。
- 仓库根目录推荐包含 \`README.md\` 与配置描述。
- 拥有 Topic: \`dsh-plugin\`。

## 2. 标签分类标准
| Topic 标签 | 对应商城类型 | 说明 |
| :--- | :--- | :--- |
| \`dsh-plugin\` | **必备基准标签** | 所有插件必须包含此标签才能被收录 |
| \`dsh-skill\` | ⚡ Agent 技能 | 提供给 dsh 智能体调用的 Tool / Skill |
| \`dsh-mcp\` | 🔌 MCP 插件 | 实现 Model Context Protocol 协议的服务 |
| \`dsh-theme\` | 🎨 主题外观 | 终端高亮配色与 UI 皮肤 |
| \`dsh-prompt\` | 💡 Prompt 预设 | 领域专家指令集合 |

## 3. 自动同步周期
- GitHub Actions 每 1 小时运行一次自动同步，抓取最新符合条件的仓库并更新商城与 Wiki。
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
