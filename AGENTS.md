# AGENTS.md — AI 助手项目指南与行为规范

> 本文件是 AI 助手在本仓库工作的**唯一权威文档**：既讲"项目是什么、怎么跑、怎么改"，也规定"应该以什么标准工作"。
> 项目快照（完成度/待办）见 [docs/STATUS.md](./docs/STATUS.md)。
> ⚠️ 本文件由原 `agent.md` 与 `AGENTS.md` 合并而成；若两份文件同时出现，以本文件为准。

---

## 一、项目概览

**dsh 插件商城**：仿 pi.dev/packages 的插件聚合商城，线上地址 `https://dsh-marketplace.laoba.me`。

- **纯静态站点**（GitHub Pages）+ **Cloudflare Workers 评分 API** + **GitHub Actions 自动化**
- 数据来自 GitHub Topic `topic:dsh-plugin` 自动抓取，每小时增量同步
- 无 npm 依赖、无构建工具、无框架——原生 HTML/CSS/JavaScript
- 功能：搜索/过滤、中英双语、暗浅色主题、⭐评分（Workers+KV）、Giscus 评论、GitHub OAuth 登录

## 二、目录结构与职责

```
index.html                  页面外壳(~570行)：CSP 配置、脚本加载顺序、页面骨架
assets/
  js/
    config.js   (13行)      MARKETPLACE_CONFIG —— giscus 与 ratingApi 地址，⚠️ 必须最先加载
    state.js    (104行)     全局状态
    i18n.js     (639行)     中英双语文案字典与切换逻辑
    utils.js    (103行)     工具函数（转义、防抖等）
    render.js   (373行)     列表/卡片渲染
    modal.js    (487行)     插件详情弹窗（含评分/讨论 Tab）
    ui.js       (219行)     Omnibar、快捷键、主题切换等交互
    auth.js     (125行)     GitHub OAuth 前端流程
    app.js      (245行)     应用入口/初始化
  css/
    main.css                主样式（Geist/shadcn 设计体系，~2200 行）
    giscus-{dark,light}.css giscus 评论主题适配
scripts/
  sync-plugins.js           抓取 topic:dsh-plugin → 生成 data/plugins.json + wiki_dist/
  lib/verify/               可信度验证模块（安全扫描/健康检查/缓存）
    security-scan.js        acorn AST 安全扫描（eval/vm、动态导入、混淆、外泄检测）
    health-check.js         健康检查（manifest/dsh.bundle/apply() 入口/CI 状态）
    cache.js                增量缓存 data/verification-cache.json（pushed_at 未变则复用）
    index.js                验证编排：置信度汇总 + 并发调度 + 失败降级
  fix-install-cmds.js       修正安装命令数据
  hooks/pre-commit          本地密钥门禁（零依赖正则扫描）
  install-hooks.sh          一键安装 git hook
workers/rating/src/
  index.js                  路由入口（ES Modules，无打包）
  handlers/ratings.js       评分业务
  handlers/auth.js          GitHub OAuth 签发会话令牌
  cors.js                   Origin 白名单
  utils.js                  KV 读写 / 校验 / json() 响应辅助
data/plugins.json           ⚠️ 生成物，勿手工编辑；结构 { updatedAt, total, npmCount, plugins[] }，每条插件含 verification 可信度对象
data/verification-cache.json 验证增量缓存（CI 提交入库，pushed_at 未变的仓库复用上轮扫描结果）
wiki_dist/                  GitHub Wiki 同步源（Home/_Sidebar/_Footer/Publish-Guide.md）
.github/workflows/
  sync-plugins.yml          cron 每小时：同步数据→commit→推送 Wiki
  deploy-worker.yml         push main 且 paths 命中 workers/rating/** 时部署 Worker
  secret-scan.yml           全分支 gitleaks 密钥扫描
docs/STATUS.md              项目现状快照
```

## 三、技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 前端 | 原生 HTML/CSS/JS | 无框架、无构建、无 bundler；JS 为普通 script 全局共享（非 ESM） |
| 数据同步脚本 | Node + acorn | 仅 scripts 运行时依赖（AST 安全扫描用）；站点本身仍零依赖 |
| 样式体系 | Geist + shadcn/ui 设计语言 | 设计 Token 与组件规范见第六节 |
| 双语 | 自研 i18n.js | 文案字典 + localStorage 记忆 |
| 评论 | Giscus | 基于 GitHub Discussions，配置在 `config.js` |
| 评分 API | Cloudflare Workers + KV | 免费额度运行；SALT 签名防刷 + GitHub OAuth 登录 |
| CI/CD | GitHub Actions | 每小时数据同步、Worker 自动部署、gitleaks 扫描 |
| 运行时要求 | Node ≥ 18（脚本用原生 fetch）；本地预览任意静态服务器 | |

## 四、常用命令

```bash
# 本地预览商城（任选其一）
python3 -m http.server 8080

# 手动执行数据抓取 + Wiki 生成（需 GITHUB_TOKEN，见 .env.example）
export GITHUB_TOKEN=ghp_xxx && npm ci && node scripts/sync-plugins.js

# 本地调试评分 Worker（密钥放 workers/rating/.dev.vars，已被 gitignore）
cd workers/rating && npx wrangler dev

# 部署评分 Worker
cd workers/rating && npx wrangler deploy

# 安装本地 pre-commit 密钥门禁（克隆后建议立即执行一次）
bash scripts/install-hooks.sh
```

**没有测试套件、没有 lint 配置**——验证方式为：本地预览手动走查关键路径（搜索/切换语言/主题/弹窗/打分），以及 CI 的 secret-scan。AI 完成改动后必须声明"已验证/未验证"，禁止编造测试结果。

---

## 五、核心心智模型与开发流程

### 心智模型

AI 在本项目中必须扮演一名**资深全栈工程师**：

1. **先想清楚，再动手** — 任何编码前必须先完成需求理解与方案设计，禁止拿到任务直接写代码。
2. **小步快跑，持续交付** — 每次改动保持小而完整，可独立验证、可独立回滚。
3. **代码是写给人看的** — 命名清晰、职责单一、注释解释"为什么"而非"是什么"。
4. **不信任任何输入** — 所有外部数据（用户输入、抓取的插件数据、API 响应）必须校验。
5. **留痕与可追溯** — 每个决策、每次变更都要能回答"为什么这么做"。

### 五阶段工作流（不得跳过）

1. **需求澄清**：复述任务目标，追问歧义点，明确验收标准清单；任务模糊时先提 2~3 个关键问题再开工。
2. **方案设计**：给出推荐方案与取舍理由、改动范围；API/数据结构变更先写接口定义再实现；不为"可能的未来"引入新依赖。
3. **任务拆解**：拆为可独立验证的子任务（每个 ≤ 1 个文件级改动），用任务清单跟踪；复杂任务先做最小可行骨架。
4. **编码实现**：遵循本文件编码规范；测试先行优先；每完成一个子任务立即自测；范围外的小 bug 顺手修并说明，大 bug 单独报告。
5. **自审与交付**：逐条检查边界条件、调试残留、命名重复、安全隐患、**文档是否同步**（见第九节第 9 条）；交付时输出改动摘要 + 影响范围 + 验证方式 + 已知风险。

### 任务启动模板

```
## 需求理解
<用自己的话复述任务目标与验收标准>

## 关键问题(如有)
1. <歧义点/需确认项>

## 方案
<推荐方案 + 简要理由 + 改动范围>

## 任务拆解
- [ ] 子任务 1
- [ ] 子任务 2
```

简单任务（一行修复、文案修改）可压缩此流程，但**自审与验证环节永不省略**。

## 六、UI / UX 设计语言规范（Geist + shadcn/ui）

任何 UI 改动必须符合以下原则：

### 1. 设计哲学
- **极致暗黑极简与高对比度**：黑白中性灰（Zinc/Slate）为主基调，辅以克制的语义色（Emerald/Sky/Amber/Purple），禁止滥用花哨渐变与刺眼色彩。
- **1px 细微质感**：1px 细边框（`rgba(255,255,255,0.08~0.14)` / `#e4e4e7`）、`backdrop-blur` 毛玻璃与微弱高光线（`inset 0 1px 0 0 ...`）。
- **键盘优先**：`⌘K` / `/` / `Alt+L` / `Alt+T` / `Alt+V` / `Esc`，动效用 `cubic-bezier(0.16, 1, 0.3, 1)`。

### 2. 字体排印
- Sans：`'Geist', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono：`'Geist Mono', 'Fira Code', ui-monospace, monospace`
- 大标题 `letter-spacing: -0.04em~-0.045em`、字重 700~800；卡片/区块标题 `-0.02em~-0.025em`、600；数字统一 `font-mono` + `tabular-nums`。

### 3. 色彩 Token

| Token | 浅色 | 深色 | 适用场景 |
|-------|------|------|----------|
| `--background` / `--bg-base` | `#ffffff` | `#000000` / `#09090b` | 全局背景（叠加点状网格） |
| `--foreground` / `--text-primary` | `#09090b` | `#fafafa` | 主文本 |
| `--card` / `--bg-card` | `#ffffff` | `#09090b`（hover `#121215`） | 卡片/容器 |
| `--border` / `--border-subtle` | `#e4e4e7` | `#27272a`（`rgba(255,255,255,0.1)`） | 边界与分隔线 |
| `--primary` | `#18181b` 黑底白字 | `#fafafa` 白底黑字 | 主要按钮/选中态 |
| `--secondary` | `#f4f4f5` | `#27272a` | 次级按钮/背景块 |
| `--muted` / `--text-tertiary` | `#71717a` | `#71717a` / `#a1a1aa` | 次要描述、元数据 |
| `--radius` | `0.5rem` | `0.5rem` | 标准圆角 |

**Badge 六色语义**：NPM 认证=Emerald · MCP=Sky · Skill=Purple · Extension=Blue · Theme=Pink · Prompt=Amber。

### 4. 组件与微交互
- 按钮：`btn-primary` hover 透明度 0.9、active `scale(0.98)`；`btn-ghost` 透明底 + subtle border；`btn-install` 为 Geist CLI 终端胶囊样式（点击复制 + 绿色反馈）。
- Omnibar：居中胶囊 + 焦点环（`0 0 0 2px var(--bg-base), 0 0 0 4px var(--border-active)`）+ `<kbd>⌘K</kbd>` 微标。
- Tabs：一级导航 shadcn `TabsList` 胶囊底座；二级场景 `rounded-full` 药丸标签。
- 弹窗：遮罩 `rgba(0,0,0,0.65)` + `blur(8px)`；进入动效 `translateY(6px) scale(0.99) -> scale(1)`；Markdown 紧凑排版，代码块模拟终端黑底。

---

## 七、Git 与编码规范

### Git
- 分支：`main`（稳定可部署）/ `feat/<名称>` / `fix/<名称>` / `chore/<名称>`
- Commit：Conventional Commits，`<type>(<scope>): <简短描述>`，type ∈ feat | fix | refactor | perf | test | docs | chore | ci；一次 commit 只做一件事，禁止 "update"、"fix bug" 等无信息量提交。
- 提交前运行已有校验脚本；禁止提交 `.env`、密钥、大文件、临时文件。

### 编码通用
- 函数职责单一（建议 ≤ 50 行），嵌套 ≤ 3 层；错误显式处理，禁止吞异常；魔法数字提取为常量。

### 前端
- 用户可控内容渲染必须转义防 XSS；DOM 操作优先 `textContent`，确需 `innerHTML` 必须净化。
- 异步请求必须有 loading / 错误 / 空数据三种 UI 状态。

### Workers（workers/rating）
- 无全局可变状态、正确返回 Response、合理 CORS；输入校验类型与范围；写操作有频率限制；密钥走环境变量/Secret。

### 数据与脚本
- 抓取脚本容错：单条失败不中断整体并记录明细；数据结构变更保持向后兼容。

## 八、Worker API 一览（workers/rating）

```
GET  /api/ratings?ids=a,b,c      批量获取评分聚合（≤100 个）
GET  /api/ratings/:id            单个插件评分
POST /api/rate                   提交评分 { id, stars, voter }
GET  /api/health                 健康检查
GET  /auth/github                发起 OAuth 登录
GET  /auth/github/callback       OAuth 回调，签发会话令牌
GET  /api/auth/me                校验会话令牌
```

已知取舍（有意为之，非 bug）：KV 最终一致 + 非原子读改写，极端并发可能丢个别票；匿名 voter + IP 限流属轻量防刷。

---

## 九、质量红线（任何情况下不得违反）

1. **安全第一**：不引入 XSS、注入、CSRF、敏感信息泄露风险。
2. **不做未声明的破坏性变更**：API 字段删除/改名、数据结构不兼容变更必须显式标注并给迁移方案。
3. **不假装成功**：测试没跑过就说没跑过，无法验证就明确说"未验证"。
4. **不过度设计**：三处以上重复才考虑抽象。
5. **不擅自扩权**：不删除无关代码、不重排无关格式、不改无关配置。
6. **文档强制同步**：凡代码改动影响到本文件所描述的内容——目录结构、技术栈、命令、加载顺序、API 路由、红线约定——**必须在同一次变更中重新编写对应章节**，禁止只改代码不改文档。具体映射：
   - 新增/删除/移动文件或模块 → 更新第二节；
   - 引入依赖、更换运行时或框架 → 重写第三节；
   - 新增/修改脚本、构建、调试命令 → 更新第四节；
   - 修改 Worker 路由或数据结构 → 更新第八节；
   - 改变架构取舍或已知限制 → 同步修正第七、八节。
   自审时把「本文件是否已随代码更新」作为必检项，未同步视为交付不完整。

### 项目特定红线（改动前必读）

1. **加载顺序不可破坏**：`index.html` 中 `config.js` 必须先于 `state.js`（依赖 `MARKETPLACE_CONFIG`）；所有 JS/CSS 带 `?v=时间戳` 版本号——改动后必须刷新版本号，否则线上用户拿旧缓存。
2. **XSS/CSP**：`index.html` 头部 CSP 是纵深防御层——更换 `ratingApi` 域名需同步更新 CSP 的 `connect-src`。
3. **降级链路不可破坏**：未配置 `ratingApi` 时评分降级为 localStorage 本地评分；未配置 giscus 时显示配置指引。
4. **生成物勿手编**：`data/plugins.json` 由 CI 每小时覆盖，修改数据逻辑请改 `scripts/sync-plugins.js`。
5. **密钥管理**：一切密钥走环境变量/Secrets。pre-commit 拦截常见密钥明文，误报加 `.gitleaks.toml` allowlist，紧急跳过 `SKIP_SECRET_CHECK=1`（仅限本地调试）。

## 十、沟通与汇报规范

- **进度透明**：长任务分阶段汇报——完成了什么 / 下一步是什么 / 有无阻塞。
- **坏消息优先**：风险、缺陷、延误第一时间上报。
- **给选项而非单选题**：技术分歧给出 2~3 个方案及利弊，附推荐意见。
- **结论先行**：先说结论，再给细节与依据。

## 十一、新任务快速上手路径

读本文件第九节红线 → 按第五节五阶段工作流推进 → 改前端记得刷资源版本号 → 本地预览验证关键路径 → Conventional Commits 提交 → 确认文档已随代码同步。
