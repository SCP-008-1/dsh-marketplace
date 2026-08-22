/**
 * GitHub Wiki Markdown 文档生成（Home / _Sidebar / Publish-Guide / _Footer）
 */
const fs = require('fs');
const path = require('path');

// 生成全部 Wiki 页面
function generateWiki(pluginsData, npmPlugins) {
  const wikiDir = path.join(__dirname, '..', '..', 'wiki_dist');
  if (!fs.existsSync(wikiDir)) {
    fs.mkdirSync(wikiDir, { recursive: true });
  }

  writeHome(wikiDir, pluginsData, npmPlugins);
  writeSidebar(wikiDir);
  writePublishGuide(wikiDir);

  const footerMarkdown = `---
*dsh 插件生态 · 由 GitHub Actions 自动化维护*
`;
  fs.writeFileSync(path.join(wikiDir, '_Footer.md'), footerMarkdown, 'utf-8');

  console.log(`Wiki 文件已生成至 ${wikiDir}`);
}

function writeHome(wikiDir, pluginsData, npmPlugins) {
  let homeMarkdown = `# 🧩 dsh 插件商城 Wiki

> 本页面由 GitHub Actions 自动化同步生成，实时汇总所有带有 \`dsh-plugin\` 标签的开源插件，并经过 NPM 真实注册双向验证。
> 更新时间: \`${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} (CST)\` · 收录插件总数: **${pluginsData.length}** · NPM 官方包: **${npmPlugins.length}**

---

## 🚀 快速安装插件

使用 \`npm\` 直接安装生态中的插件：

\`\`\`bash
# 1. 若项目已真实发布在 NPM 注册表：
npm i <package-name>

# 2. 若项目未发布在 NPM，但仓库根目录存在 package.json，可通过 GitHub 仓库引用安装：
npm i github:<owner>/<repo>

# 3. 若仓库无 package.json（纯 Skill/Prompt 等资源型插件），无法通过 npm 安装，
#    请点击表中「前往 GitHub」按仓库说明手动安装
git clone <repo-url>
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

    // 转义 Markdown 元字符，防止任意仓库描述在 Wiki 表格里注入链接/代码块
    const cleanDesc = (p.description || '')
      .replace(/\r?\n/g, ' ')
      .replace(/([\\`*_{}\[\]()#+!|])/g, '\\$1');
    const npmBadge = p.hasNpm ? `[npm 📦](${p.npmUrl})` : `GitHub 🐙`;
    // 无根 package.json 的仓库不可 npm 安装，展示仓库链接而非必败命令
    const installCell = p.installCmd ? `\`${p.installCmd}\`` : `[前往 GitHub ↗](${p.repoUrl})`;
    homeMarkdown += `| [**${p.name}**](${p.repoUrl})<br><sub>@${p.author}</sub> | \`${typeLabel}\` | ${cleanDesc} | ${npmBadge} | ${installCell} | ⭐ ${p.stars} |\n`;
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
}

function writeSidebar(wikiDir) {
  const sidebarMarkdown = `### 🧩 dsh 插件中心
* [[首页与概览|Home]]
* [[发布与收录指南|Publish-Guide]]
`;
  fs.writeFileSync(path.join(wikiDir, '_Sidebar.md'), sidebarMarkdown, 'utf-8');
}

function writePublishGuide(wikiDir) {
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
}

module.exports = { generateWiki };
