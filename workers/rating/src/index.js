/**
 * dsh 插件商城 · 社区评分 API (Cloudflare Workers + KV)
 * ---------------------------------------------------------------
 * 免费额度内运行：KV 每天 100k 读 / 1k 写，足够小型商城使用。
 *
 * 模块结构:
 *   index.js            入口 + 路由表
 *   handlers/ratings.js 评分业务处理器
 *   cors.js             CORS 白名单
 *   utils.js            KV 读写 / 校验 / 响应辅助
 *
 * 路由:
 *   GET  /api/ratings?ids=a,b,c   批量获取评分聚合值（最多 100 个）
 *   GET  /api/ratings/:id         单个插件评分
 *   POST /api/rate                提交评分 { id, stars, voter }
 *   GET  /api/health              健康检查
 *   GET  /auth/github             发起 GitHub OAuth 登录
 *   GET  /auth/github/callback    OAuth 回调，签发会话令牌
 *   GET  /api/auth/me             校验会话令牌，返回用户信息
 *
 * 已知限制（有意取舍，见 README）:
 *   - KV 最终一致 + 非原子读改写：极端并发下可能丢个别票
 *   - 匿名 voter + IP 限流是轻量防刷，非强身份校验
 */
import { corsHeaders } from "./cors.js";
import { json } from "./utils.js";
import { handleBatchRatings, handleSingleRating, handleRate } from "./handlers/ratings.js";
import { handleAuthStart, handleAuthCallback, handleMe } from "./handlers/auth.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      return await route(request, url, env, cors);
    } catch (err) {
      // 不把内部异常细节返回给客户端（信息泄露）；仅记录到 Worker 日志
      console.error("unhandled error:", err);
      return json({ error: "internal error" }, 500, cors);
    }
  }
};

// ---------- 路由 ----------

async function route(request, url, env, cors) {
  if (url.pathname === "/api/health") {
    return json({ ok: true, service: "dsh-rating" }, 200, cors);
  }

  if (request.method === "GET" && url.pathname === "/api/ratings") {
    return handleBatchRatings(request, url, env, cors);
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/ratings/")) {
    return handleSingleRating(url, env, cors);
  }

  if (request.method === "POST" && url.pathname === "/api/rate") {
    return handleRate(request, env, cors);
  }

  // GitHub OAuth 登录（302 跳转流程，无需 CORS，但保留签名一致性）
  if (request.method === "GET" && url.pathname === "/auth/github") {
    return handleAuthStart(request, url, env);
  }

  if (request.method === "GET" && url.pathname === "/auth/github/callback") {
    return handleAuthCallback(request, url, env);
  }

  if (request.method === "GET" && url.pathname === "/api/auth/me") {
    return handleMe(request, env);
  }

  return json({ error: "not found" }, 404, cors);
}
