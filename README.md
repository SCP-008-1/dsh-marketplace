# 🧩 dsh 插件商城 (dsh-marketplace)

类似于 [pi.dev/packages](https://pi.dev/packages) 的现代化暗黑极简风格 dsh 插件商城。

## 🌟 核心特性
- **自动发现与收录**：基于 GitHub `topic:dsh-plugin` 标签自动抓取收录生态插件。
- **智能过滤**：自动排除 `deepseek-ai/deepseek-harness` 保证插件列表精准。
- **双语共存与即时切换**：完整支持中英文双语界面无缝切换（顶部 `中 / EN` 按钮与 `Alt+L` 快捷键，支持 `localStorage` 记忆）。
- **双端同步**：
  - **Web 商城**（`index.html`）：高颜值开发者 UI，自动检测 NPM 注册表，支持中英文双语、模糊搜索、语法过滤、分类过滤（扩展/技能/MCP/主题/提示词）、一键复制 `npm i <pkg>` / `npm i github:<owner>/<repo>`。
  - **GitHub Wiki**（`wiki_dist/`）：同步生成 Markdown 索引与发布指南，作为免维护文档库。
- **自动化流**：GitHub Actions 每 1 小时定时增量同步数据并推送到 Wiki 与主仓。
- **快捷键系统**：`/` 搜索 · `Alt+L` 切换语言 · `Alt+T` 切换主题 · `Alt+V` 切换视图 · `Esc` 关闭弹窗。

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

---

## 💬 社区评价与评分

### 第一阶段：Giscus 讨论区（零成本）

插件详情弹框的 **「评分与反馈」** 页签内嵌 Giscus，每个插件对应一条独立 GitHub Discussion（`data-mapping="specific"`，term 为 `plugin: <owner>/<repo>`）。

启用步骤：
1. 本仓库 Settings → 开启 **Discussions**，新建分类（建议名 `Plugin Reviews`）。
2. 安装 [giscus App](https://github.com/apps/giscus) 并授权本仓库。
3. 打开 [giscus.app](https://giscus.app) 填入 `SCP-008-1/dsh-marketplace`，复制生成的 `data-repo-id` 与 `data-category-id`。
4. 填进 `index.html` 顶部：

```js
const MARKETPLACE_CONFIG = {
  giscus: {
    repo: "SCP-008-1/dsh-marketplace",
    repoId: "R_kgDO……",
    category: "Plugin Reviews",
    categoryId: "DIC_kwDO……",
  },
  ratingApi: ""
};
```

未填写时不会报错，页签内显示配置指引 + 跳转插件仓库 Issues 的入口。深色/浅色主题会自动同步给 giscus。

### 第二阶段：⭐ 评分 API（Cloudflare Workers，免费）

卡片与列表直接显示 `⭐ 4.8 (128人打分)`，点击徽标就地展开五颗星，一键打分（同一浏览器再次打分视为改分）。

```bash
cd workers/rating && npx wrangler login
npx wrangler kv namespace create RATINGS   # 把 id 填进 wrangler.toml
npx wrangler deploy
```

把返回的 Worker 地址填入 `MARKETPLACE_CONFIG.ratingApi` 即可生效。详见 [`workers/rating/README.md`](workers/rating/README.md)。

未配置 `ratingApi` 时自动降级为 localStorage 本地评分，功能不中断。
## 致谢
感谢[LINUX DO](https://linux.do/) 社区对本项目的帮助和支持
感谢佬友们对本项目的支持
