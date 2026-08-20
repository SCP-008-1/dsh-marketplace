# 📖 dsh 插件发布与规范指南

## 1. 规范要求
- 必须是公开的 GitHub 仓库。
- 拥有 Topic 标签: `dsh-plugin`。

## 2. 严格的 NPM 真实性校验
商城会对每个包含 `dsh-plugin` 标签的仓库进行真实性双向校验：
- **有效 NPM 包**：仓库根目录包含非私有（`private != true`）`package.json`，且对应 NPM 包存在于 `registry.npmjs.org` 并包含与仓库匹配的代码库关联。生成命令：`npm i <npm-name>`。
- **GitHub 直装包**：未发布至 NPM 或为内部项目（如 monorepo/desktop app），自动降级生成：`npm i github:<owner>/<repo>`。

## 3. 标签分类标准
| Topic 标签 | 对应商城类型 | 说明 |
| :--- | :--- | :--- |
| `dsh-plugin` | **必备基准标签** | 所有插件必须包含此标签才能被收录 |
| `dsh-skill` | ⚡ Agent 技能 | 提供给 dsh 智能体调用的 Tool / Skill |
| `dsh-mcp` | 🔌 MCP 插件 | 实现 Model Context Protocol 协议的服务 |
| `dsh-theme` | 🎨 主题外观 | 终端高亮配色与 UI 皮肤 |
| `dsh-prompt` | 💡 Prompt 预设 | 领域专家指令集合 |

## 4. 自动同步周期
- GitHub Actions 每 1 小时运行一次自动同步，抓取最新符合条件的仓库、严格校验 NPM 状态并更新商城与 Wiki。
