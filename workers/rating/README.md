# ⭐ dsh 插件商城 · 社区评分服务（第二阶段）

Cloudflare Workers + KV 实现的零成本评分后端。免费额度：10 万次请求/天、KV 10 万次读/天、1000 次写/天。

## 部署（约 3 分钟）

```bash
cd workers/rating

# 1. 登录 Cloudflare
npx wrangler login

# 2. 创建 KV 命名空间，把输出的 id 填进 wrangler.toml
npx wrangler kv namespace create RATINGS

# 3. 在 wrangler.toml 里把 ALLOWED_ORIGINS 改成你的站点域名
#    （SALT 不要写进本文件，会随仓库公开！）

# 4. 把 SALT 设为加密的 Worker Secret（任意随机串）
openssl rand -hex 32 | npx wrangler secret put SALT

# 5. 部署
npx wrangler deploy
```

部署完会得到一个地址，例如 `https://dsh-rating.<你的子域>.workers.dev`。

把它填进 `index.html` 顶部的配置：

```js
const MARKETPLACE_CONFIG = {
  ratingApi: "https://dsh-rating.xxx.workers.dev",
  ...
};
```

留空则前端自动降级为本地评分（localStorage），不会报错。

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| GET | `/api/ratings?ids=a,b,c` | 批量取评分（最多 100 个），返回 `{ ratings: { id: { average, count, dist } } }` |
| GET | `/api/ratings/:id` | 单个插件评分 |
| POST | `/api/rate` | 提交评分，body `{ id, stars: 1-5, voter }` |

`voter` 是浏览器本地生成的匿名 ID（`dsh_voter_id`）。同一 voter 再次提交视为**改分**而不是新增一票；服务端另有基于 IP 哈希的 5 秒写入限流。

## 数据结构（KV）

```
agg:<pluginId>            { sum, count, dist: [1星数,2星数,3星数,4星数,5星数] }
vote:<voter>:<pluginId>   "4"        # 2 年 TTL
rl:<ipHash>               时间戳      # 60 秒 TTL
```

## CI 自动部署（可选）

`.github/workflows/deploy-worker.yml` 会在 `workers/rating/**` 变更推送到 main 时自动部署。
需在仓库 **Settings → Secrets and variables → Actions** 添加 3 个 Secret：

| Secret | 说明 |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | 在 dash.cloudflare.com/profile/api-tokens 创建，用「编辑 Cloudflare Workers」模板并追加 Workers KV Storage: Edit 权限 |
| `CLOUDFLARE_ACCOUNT_ID` | 账户 ID，见 Cloudflare 控制台首页右侧 |
| `WORKER_SALT` | 与本地 `wrangler secret put SALT` 相同的随机串 |

## 本地调试

```bash
npx wrangler dev
# → http://127.0.0.1:8787/api/health
```

## 注意

- 这是**轻量防刷**方案（匿名 voter + IP 限流），不是强身份校验。若需要更强的反作弊，可改为要求 GitHub OAuth 登录后用 user id 当 voter。
- KV 写入有每日 1000 次的免费上限，超出后 `POST /api/rate` 会返回错误，读取不受影响。
