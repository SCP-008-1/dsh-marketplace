# 项目现状文档（STATUS）

> 生成时间：2026-08-24 · 基于 feat/trust-verification 分支（PR #16）
> 本文档描述 dsh 插件商城当前的完成度、架构现状与待办事项，供后续开发与协作参考。

---

## 一、项目概览

**dsh 插件商城（dsh-marketplace）**：仿 [pi.dev/packages](https://pi.dev/packages) 的暗黑极简风格插件商城，仓库 `SCP-008-1/dsh-marketplace`。

- **形态**：纯静态单页站点（GitHub Pages，CNAME 已配置）+ Cloudflare Workers 评分 API + GitHub Actions 自动化。
- **数据来源**：GitHub Topic `topic:dsh-plugin` 自动抓取收录，每小时增量同步。
- **设计语言**：Geist 规范 + shadcn/ui（Tailwind），最近一次大版本视觉升级已完成（`5b4de07`）。

## 二、当前数据规模

| 指标 | 数值 |
|------|------|
| 收录插件总数 | **499** |
| 已上架 npm | **152**（约 30%） |
| 扩展（extension） | 435 |
| MCP 服务（mcp） | 43 |
| 终端主题（theme） | 12 |
| Agent 技能（skill） | 9 |
| 数据最后更新 | 2026-08-23T14:30 UTC（每小时自动同步中） |

数据结构：`data/plugins.json` 为 `{ updatedAt, total, npmCount, plugins[] }`；每条插件含 `verification` 可信度对象。

## 三、代码结构与体量

```
index.html            569 行（外壳/入口，含 CSP 配置）
assets/css/main.css   2170 行   —— 主样式（Geist/shadcn 设计体系）
assets/css/giscus-{dark,light}.css 各 100 行 —— giscus 主题适配
assets/js/
  config.js    13 行   MARKETPLACE_CONFIG（giscus + ratingApi 均已配置 ✅）
  app.js      245 行   应用入口
  i18n.js     639 行   中英双语
  modal.js    487 行   插件详情弹窗（含评分/讨论 Tab）
  render.js   373 行   列表/卡片渲染
  ui.js       219 行
  auth.js     125 行
  state.js    104 行
  utils.js    103 行
scripts/sync-plugins.js     171 行 —— 数据抓取 + Wiki 生成
scripts/fix-install-cmds.js  53 行
workers/rating/src/          约 150 行（index.js / cors.js / utils.js）
wiki_dist/                   Home / _Sidebar / _Footer / Publish-Guide.md
.github/workflows/           sync-plugins.yml · deploy-worker.yml · secret-scan.yml
```

> 注：早期 `index.html` 为 500KB 超大单文件，现已拆分为「HTML 外壳 + assets/ 模块化 JS/CSS」结构；HTML 本体改动应保持谨慎，避免整文件重写导致历史变更难以追溯。

## 四、功能完成度

### ✅ 已完成并上线

1. **核心商城功能**
   - 自动发现与收录（topic:dsh-plugin，排除 deepseek-harness）
   - 模糊搜索、语法过滤、分类过滤（扩展/技能/MCP/主题）
   - 三种安装方式智能降级：npm 包 → `npm i github:<owner>/<repo>` → GitHub 跳转按钮
2. **中英双语**：完整 i18n，`中/EN` 按钮 + `Alt+L` 快捷键 + localStorage 记忆
3. **快捷键体系**：`/` 搜索、`⌘K` Omnibar、`Alt+L/T/V`、`Esc`
4. **评分系统（已上线）**
   - Cloudflare Worker 部署于 `dsh-rating.test1-c44.workers.dev`，KV 存储 + SALT 签名防刷
   - 卡片显示 `⭐ 平均分 (人数)`，就地五角星打分，同浏览器可改分
   - CI 自动部署（push 到 main 且 paths 命中 `workers/rating/**`）
5. **评论系统（已上线）**
   - Giscus 接入完成（repoId/categoryId 已填入 `config.js`），统一归档到 Discussions 「Discussions In web」分类
   - 自定义深浅色主题（`giscus-dark/light.css`），修复过懒加载尺寸错乱问题
6. **自动化流水线**
   - 每小时同步数据 + 更新 Wiki + 自动 commit（`[skip ci]` 标记）
   - gitleaks 密钥扫描（全分支 push/PR）
7. **可信度验证（代码已合入 PR #16，待合并后由 CI 首跑生效；首轮 499 仓全量扫描尚未执行，验证数据上线前卡片角标与「仅看已验证」过滤暂无数据可显示）**
   - 同步时对插件源码做 acorn AST 安全扫描：eval/new Function/vm/child_process、动态 import、混淆特征（超长 base64、hex 转义风暴、fromCharCode 链）、外联端点检测；工具链脚本中的高危模块降级为 medium 避免误报
   - 健康检查：manifest 合法性、dsh.bundle 声明、apply() 入口、CI 构建状态；汇总为 0-100 可安装置信度
   - 增量缓存（`data/verification-cache.json`）：pushed_at 未变的仓库复用上轮结果；扫描失败标 unverified 不阻塞同步
   - 前端：弹窗「🛡️ 可信度评估」面板（置信度/健康清单/扫描明细/最后验证时间如“3 天前 ✅”）；卡片角标（已验证/可疑/危险三色，悬停显示置信度，无验证数据不显示）；列表过滤器升级为「仅看已验证」（完成扫描且无高危）
8. **视觉升级**：按 Geist/shadcn 规范完成整体 UI 重做（最新提交），含语义化 Badge 六色体系、Omnibar 焦点环、弹窗微动效等

### ⚠️ 待确认 / 潜在事项

1. ~~agent.md 与实际结构的偏差~~：已修复，速查卡已更新为模块化结构。
2. ~~工作区有未提交改动~~：文档变更（AGENTS.md 合并、STATUS.md 新增）待提交。
3. **npm 上架率偏低**：仅 152/499（30%），大量插件走 GitHub 安装路径，安装体验一致性可优化。
4. **评分 API 域名绑定 CSP**：更换 `ratingApi` 域名时需同步更新 `index.html` 的 CSP `connect-src`（已有注释提示）。

### 📋 未规划 / 可选后续方向（无明确排期）

- 分类标签覆盖不全：`prompt` 类型目前为 0 条（README 支持该分类但生态暂无内容）
- 评分反滥用策略仅有 SALT 签名一层，可视情况增加频率限制
- Wiki 内容较薄（4 个文件），可考虑扩充开发者文档

## 五、近期开发动态（近 3 天约 95 次提交）

主题集中在三条线：
1. **UI 视觉升级**（Geist/shadcn 体系重做，最新提交）
2. **评分 + 讨论体验打磨**：Tab 视觉重做、giscus 主题统一、评论归档分类调整、缓存版本号刷新
3. **常规数据同步**：每小时的 `[skip ci]` 自动提交占据提交历史主体

## 六、本地操作速查

```bash
python3 -m http.server 8080          # 本地预览商城
node scripts/sync-plugins.js         # 手动执行数据抓取 + Wiki 生成
cd workers/rating && npx wrangler deploy  # 手动部署评分 Worker
```

---
*维护约定：本文档为快照性质，重大功能上线或架构变更后应更新对应章节。*
