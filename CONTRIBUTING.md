# 贡献指南（Contributing）

感谢关注 dsh 插件商城！本指南帮你找到合适的贡献方式并顺利合入。

> 项目架构、技术栈与质量红线详见 [AGENTS.md](./AGENTS.md)，本指南只讲「怎么贡献」。

## 一、你想做哪种贡献？

| 我想…… | 该走哪条路 | 是否需要 PR |
|--------|-----------|:----------:|
| 发布一个 dsh 插件 | 给插件仓库打 GitHub Topic `dsh-plugin`，每小时自动收录 | ❌ |
| 反馈 Bug / 建议功能 / 数据纠错 | 提 [Issue](https://github.com/SCP-008-1/dsh-marketplace/issues/new/choose) | ❌ |
| 修改站点代码 / 同步脚本 / Worker | Fork → 分支 → Pull Request | ✅ |

### 插件发布（无需 PR）

1. 确保插件仓库包含有效的 `manifest` 与 `dsh.bundle`；
2. 在仓库 Topics 中添加 `dsh-plugin`；
3. 等待每小时同步任务自动抓取，收录后可在站内搜索到。
4. 详细规范见 Wiki 的《发布指南》。

> 收录结果由自动验证流水线决定（安全扫描 + 健康检查），未通过会标记为 unverified 展示。如认为判定有误，请提 `plugin` 类 Issue。

## 二、代码贡献流程

### 1. 环境准备

```bash
git clone https://github.com/<你的用户名>/dsh-plugin-marketplace.git
cd dsh-plugin-marketplace
npm ci                      # 仅 scripts 运行时依赖（acorn）
bash scripts/install-hooks.sh   # 安装 pre-commit 密钥门禁
python3 -m http.server 8080     # 本地预览
```

调试评分 Worker：

```bash
cd workers/rating && npx wrangler dev   # 密钥放 .dev.vars（已 gitignore）
```

### 2. 分支与提交规范

- 从 `main` 拉分支，命名：`feat/<名称>` / `fix/<名称>` / `chore/<名称>`
- Commit 遵循 **Conventional Commits**：`<type>(<scope>): <简短描述>`，
  type ∈ `feat | fix | refactor | perf | test | docs | chore | ci`
- 一次 commit 只做一件事；禁止 `update`、`fix bug` 这类无信息量描述

### 3. 开发红线（PR 不满足将被打回）

- [ ] 改动前端 JS/CSS 后，**必须刷新** `index.html` 中对应资源的 `?v=` 版本号
- [ ] 用户可控内容渲染必须转义防 XSS（优先 `textContent`）
- [ ] 未破坏降级链路：无 `ratingApi` 时降级 localStorage 评分；无 giscus 时显示配置指引
- [ ] 涉及外部域名变更时同步更新 `index.html` CSP 的 `connect-src`
- [ ] `data/plugins.json` 为 CI 生成物，**勿手工编辑**——改数据逻辑请改 `scripts/sync-plugins.js`
- [ ] 密钥一律走环境变量 / Secrets，禁止落库
- [ ] Worker 改动需保持输入校验、CORS 白名单、写操作限流

### 4. 提交 PR

1. 使用仓库内置的 PR 模板填写：改动说明、影响范围、验证方式；
2. 确认自检清单全部勾选；
3. 等待 CI 通过：
   - **CI Check** —— JS 语法检查 + `plugins.json` schema 校验 + Worker dry‑run 构建
   - **Secret Scan** —— gitleaks 全量扫描
4. 由维护者 review 后 squash 合入 `main`。

- 大改动（新模块、API 变更）建议先开 Issue 对齐方案再动手

## 五、AI 审查（CodeRabbit）

- 项目已集成 **CodeRabbit**（GitHub App），每个 Pull Request 自动触发 AI 代码审查。
- CodeRabbit 会依据 `.coderabbit.yaml` 中的 **路径指令**（包括 XSS、防刷、CSP、版本号刷新等）给出 **P0‑P4** 风险等级标签，评论中会标记 `P0`、`P1`…，方便维护者快速定位高危问题。
- 关键交互指令（在 PR 评论中使用）：
  - `@coderabbitai review` 手动重新审查
  - `@coderabbitai resolve` 标记已修复的评论为已解决
  - `@coderabbitai emit path instructions` 让 CodeRabbit 汇总最近的审查建议并自动打开 PR 更新 `.coderabbit.yaml`
- PR 合入前请确认：
  - 所有 **P0**/`P1` 警告已在代码中消除或在 PR 中说明原因。
  - CI、gitleaks、以及 CodeRabbit 的审查均通过。
- 维护者在合并时仍需检查 **验证声明**（第七节），CodeRabbit 只能给出风险提示，真实可运行必须由人确认。

## 六、验证声明（重要）

本项目没有测试套件，**请如实声明验证状态**：

- ✅ 已验证：说明验证方式（本地预览走查了哪些路径）
- ⚠️ 未验证：明确写出没跑过的部分

禁止编造测试结果——诚实标注「未验证」不会导致 PR 被拒，编造会。

## 三、Issue 规范

- **Bug 反馈**：附复现步骤、预期/实际行为、浏览器与控制台报错截图
- **功能建议**：说明使用场景与期望效果，避免「加个 XX 功能」一句话体
- **插件数据纠错**：填插件仓库地址（`owner/repo`），说明问题点

## 四、其他约定

- 提交前请运行本地校验：`node --check <改动的js文件>`
- 不要在 PR 中夹带无关格式化重排或无关文件
- 大改动（新模块、API 变更）建议先开 Issue 对齐方案再动手
