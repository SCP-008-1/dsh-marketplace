# 🧩 dsh 插件商城 (dsh-marketplace)

类似于 [pi.dev/packages](https://pi.dev/packages) 的现代化暗黑极简风格 dsh 插件商城。

## 🌟 核心特性
- **自动发现与收录**：基于 GitHub `topic:dsh-plugin` 标签自动抓取收录生态插件。
- **智能过滤**：自动排除 `deepseek-ai/deepseek-harness` 保证插件列表精准。
- **双端同步**：
  - **Web 商城**（`index.html`）：高颜值开发者 UI，自动检测 NPM 注册表，支持模糊搜索、分类过滤（扩展/技能/MCP/主题/提示词）、一键复制 `npm i <pkg>` / `npm i github:<owner>/<repo>`。
  - **GitHub Wiki**（`wiki_dist/`）：同步生成 Markdown 索引与发布指南，作为免维护文档库。
- **自动化流**：GitHub Actions 每 1 小时定时增量同步数据并推送到 Wiki 与主仓。

---

## 🚀 快速使用

### 1. 插件安装方式
- **已发布在 npm**：`npm i <package-name>`
- **未发布在 npm**：`npm i github:<owner>/<repo>`

### 2. 本地预览 Web 商城
```bash
# 使用任意轻量服务器预览 index.html
python3 -m http.server 8080
```

### 3. 本地执行数据抓取与 Wiki 生成
```bash
node scripts/sync-plugins.js
```

---

## 📦 插件开发者发布指南

开发者只需为开源仓库添加 GitHub Topic 即可被收录：
1. 必备标签：`dsh-plugin`
2. 分类标签（可选）：
   - `dsh-skill` (Agent 技能)
   - `dsh-mcp` (MCP 协议服务)
   - `dsh-theme` (终端/UI 主题)
   - `dsh-prompt` (Prompt 预设)
