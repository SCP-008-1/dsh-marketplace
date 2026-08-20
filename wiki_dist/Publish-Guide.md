# 📖 dsh 插件发布与规范指南

## 1. 规范要求
- 必须是公开的 GitHub 仓库。
- 拥有 Topic 标签: `dsh-plugin`。

## 2. 安装分发标准
- **NPM 优先**：如果仓库已执行 `npm publish`，商城会自动识别其 npm 包名并展示 `npm i <pkg>`。
- **GitHub 自动降级**：如果尚未发布到 npm，商城会自动生成 `npm i github:<owner>/<repo>` 命令供用户直接安装。

## 3. 标签分类标准
| Topic 标签 | 对应商城类型 | 说明 |
| :--- | :--- | :--- |
| `dsh-plugin` | **必备基准标签** | 所有插件必须包含此标签才能被收录 |
| `dsh-skill` | ⚡ Agent 技能 | 提供给 dsh 智能体调用的 Tool / Skill |
| `dsh-mcp` | 🔌 MCP 插件 | 实现 Model Context Protocol 协议的服务 |
| `dsh-theme` | 🎨 主题外观 | 终端高亮配色与 UI 皮肤 |
| `dsh-prompt` | 💡 Prompt 预设 | 领域专家指令集合 |

## 4. 自动同步周期
- GitHub Actions 每 1 小时运行一次自动同步，抓取最新符合条件的仓库、检测 NPM 状态并更新商城与 Wiki。
