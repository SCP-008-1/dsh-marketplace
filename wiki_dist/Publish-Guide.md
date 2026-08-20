# 📖 dsh 插件发布与规范指南

## 1. 规范要求
- 必须是公开公开的 GitHub 仓库。
- 仓库根目录推荐包含 `README.md` 与配置描述。
- 拥有 Topic: `dsh-plugin`。

## 2. 标签分类标准
| Topic 标签 | 对应商城类型 | 说明 |
| :--- | :--- | :--- |
| `dsh-plugin` | **必备基准标签** | 所有插件必须包含此标签才能被收录 |
| `dsh-skill` | ⚡ Agent 技能 | 提供给 dsh 智能体调用的 Tool / Skill |
| `dsh-mcp` | 🔌 MCP 插件 | 实现 Model Context Protocol 协议的服务 |
| `dsh-theme` | 🎨 主题外观 | 终端高亮配色与 UI 皮肤 |
| `dsh-prompt` | 💡 Prompt 预设 | 领域专家指令集合 |

## 3. 自动同步周期
- GitHub Actions 每 1 小时运行一次自动同步，抓取最新符合条件的仓库并更新商城与 Wiki。
