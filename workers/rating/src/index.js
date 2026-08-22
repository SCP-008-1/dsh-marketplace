/**
 * dsh 插件商城 · 社区评分 API (Cloudflare Workers + KV)
 * ---------------------------------------------------------------
 * 免费额度内运行：KV 每天 100k 读 / 1k 写，足够小型商城使用。
 *
 * 路由:
 *   GET  /api/ratings?ids=a,b,c   批量获取评分聚合值（最多 100 个）
 *   GET  /api/ratings/:id         单个插件评分
 *   POST /api/rate                提交评分 { id, stars, voter }
 *   GET  /api/health              健康检查
 *
 * KV 键设计:
 *   agg:<pluginId>              -> { sum, count, dist: [n1,n2,n3,n4,n5] }
 *   vote:<voter>:<pluginId>     -> stars (1-5)   用于「改分」而不是「重复加分」
 *   rl:<ipHash>                 -> 时间戳，简易限流
 *
 * 已知限制（有意取舍，见 README）:
 *   - KV 最终一致 + 非原子读改写：极端并发下可能丢个别票
 *   - 匿名 voter + IP 限流是轻量防刷，非强身份校验
 */

const MAX_BATCH = 100;
const RATE_LIMIT_SECONDS = 5; // 同一 IP 两次写入的最小间隔
const VOTE_TTL_DAYS = 730;

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
      return json({ error: "internal error", detail: String(err && err.message || err) }, 500, cors);
    }
  }
};

// ---------- 路由 ----------

async function route(request, url, env, cors) {
  if (url.pathname === "/api/health") {
    return json({ ok: true, service: "dsh-rating" }, 200, cors);
  }

  if (request.method === "GET" && url.pathname === "/api/ratings") {
    return handleBatchRatings(url, env, cors);
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/ratings/")) {
    return handleSingleRating(url, env, cors);
  }

  if (request.method === "POST" && url.pathname === "/api/rate") {
    return handleRate(request, env, cors);
  }

  return json({ error: "not found" }, 404, cors);
}

async function handleBatchRatings(url, env, cors) {
  const ids = (url.searchParams.get("ids") || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, MAX_BATCH);
  if (!ids.length) return json({ ratings: {} }, 200, cors);

  const entries = await Promise.all(ids.map(id => readAgg(env, id)));
  const ratings = {};
  ids.forEach((id, i) => { ratings[id] = summarize(entries[i]); });
  return json({ ratings }, 200, cors);
}

async function handleSingleRating(url, env, cors) {
  const id = decodeURIComponent(url.pathname.slice("/api/ratings/".length));
  if (!isValidId(id)) return json({ error: "invalid id" }, 400, cors);
  return json({ id, rating: summarize(await readAgg(env, id)) }, 200, cors);
}

async function handleRate(request, env, cors) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: "invalid json body" }, 400, cors);

  const id = String(body.id || "").trim();
  const stars = Number(body.stars);
  const voter = String(body.voter || "").trim();

  if (!isValidId(id)) return json({ error: "invalid id" }, 400, cors);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return json({ error: "stars must be an integer 1-5" }, 400, cors);
  }
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(voter)) {
    return json({ error: "invalid voter id" }, 400, cors);
  }

  // 简易 IP 限流
  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  const rlKey = "rl:" + (await sha256(ip + "|" + (env.SALT || "dsh")));
  const last = await env.RATINGS.get(rlKey);
  if (last && Date.now() - Number(last) < RATE_LIMIT_SECONDS * 1000) {
    return json({ error: "too many requests" }, 429, cors);
  }
  await env.RATINGS.put(rlKey, String(Date.now()), { expirationTtl: 60 });

  const voteKey = `vote:${voter}:${id}`;
  const prevRaw = await env.RATINGS.get(voteKey);
  const prev = prevRaw ? Number(prevRaw) : 0;

  const agg = (await readAgg(env, id)) || { sum: 0, count: 0, dist: [0, 0, 0, 0, 0] };
  if (!Array.isArray(agg.dist) || agg.dist.length !== 5) agg.dist = [0, 0, 0, 0, 0];

  if (prev >= 1 && prev <= 5) {
    // 改分：替换旧分值
    agg.sum += stars - prev;
    agg.dist[prev - 1] = Math.max(0, agg.dist[prev - 1] - 1);
  } else {
    agg.sum += stars;
    agg.count += 1;
  }
  agg.dist[stars - 1] += 1;
  agg.sum = Math.max(0, agg.sum);
  agg.count = Math.max(0, agg.count);

  await env.RATINGS.put(`agg:${id}`, JSON.stringify(agg));
  await env.RATINGS.put(voteKey, String(stars), {
    expirationTtl: VOTE_TTL_DAYS * 86400
  });

  return json({ id, mine: stars, updated: prev > 0, rating: summarize(agg) }, 200, cors);
}

// ---------- helpers ----------

async function readAgg(env, id) {
  return (await env.RATINGS.get(`agg:${id}`, { type: "json" })) || null;
}

function summarize(agg) {
  if (!agg || !agg.count) return { average: 0, count: 0, dist: [0, 0, 0, 0, 0] };
  return {
    average: Math.round((agg.sum / agg.count) * 10) / 10,
    count: agg.count,
    dist: agg.dist || [0, 0, 0, 0, 0]
  };
}

// 仅允许 GitHub 仓库名风格字符（字母/数字/._- 开头不能是符号），阻断 KV 键注入与任意键污染
function isValidId(id) {
  return typeof id === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(id);
}

function corsHeaders(origin, env) {
  const allow = (env.ALLOWED_ORIGINS || "*").split(",").map(s => s.trim()).filter(Boolean);
  const ok = allow.includes("*") || allow.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? (origin || "*") : allow[0] || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
