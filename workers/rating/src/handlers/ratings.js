/**
 * 评分路由处理器
 *   GET  /api/ratings?ids=a,b,c   批量获取评分聚合值（最多 MAX_BATCH 个）
 *   GET  /api/ratings/:id         单个插件评分
 *   POST /api/rate                提交评分 { id, stars, voter }
 */
import { readAgg, summarize, isValidId, json, sha256 } from "../utils.js";

const MAX_BATCH = 100;
const RATE_LIMIT_SECONDS = 5; // 同一 IP 两次写入的最小间隔
const CACHE_TTL_SECONDS = 60; // 批量读的边缘缓存，防止 KV 读额度被打穿

async function handleBatchRatings(request, url, env, cors) {
  const ids = (url.searchParams.get("ids") || "")
    .split(",")
    .map(s => s.trim())
    .filter(isValidId) // 与单查接口保持一致：拦截非法 id，避免 KV 键探测与额度滥用
    .slice(0, MAX_BATCH);
  if (!ids.length) return json({ ratings: {} }, 200, cors);

  // 边缘缓存：同一 ids 组合 60 秒内命中缓存，不消耗 KV 读额度。
  // Cache API 在部分环境（如 workers.dev）不可用，失败时静默降级为直读 KV。
  const cacheUrl = new URL(url);
  cacheUrl.search = "ids=" + [...ids].sort().join(","); // 排序归一化，提高命中率
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
  try {
    const cached = await caches.default.match(cacheKey);
    if (cached) return cached;
  } catch (err) {}

  const entries = await Promise.all(ids.map(id => readAgg(env, id)));
  const ratings = {};
  ids.forEach((id, i) => { ratings[id] = summarize(entries[i]); });
  const res = json({ ratings }, 200, { ...cors, "Cache-Control": "public, max-age=60" });
  try { await caches.default.put(cacheKey, res.clone()); } catch (err) {}
  return res;
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

  // 先查旧票：重复提交相同星级直接返回，不消耗 KV 写额度
  const voteKey = `vote:${voter}:${id}`;
  const prevRaw = await env.RATINGS.get(voteKey);
  const prev = prevRaw ? Number(prevRaw) : 0;
  if (prev === stars) {
    return json({ id, mine: stars, updated: false, rating: summarize(await readAgg(env, id)) }, 200, cors);
  }

  // 简易 IP 限流（放在去重之后：改分仍受限流，无意义的重复点击不受影响）
  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  const rlKey = "rl:" + (await sha256(ip + "|" + (env.SALT || "dsh")));
  const last = await env.RATINGS.get(rlKey);
  if (last && Date.now() - Number(last) < RATE_LIMIT_SECONDS * 1000) {
    return json({ error: "too many requests" }, 429, cors);
  }
  await env.RATINGS.put(rlKey, String(Date.now()), { expirationTtl: 60 });

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
  // 投票记录不设 TTL：若过期后被再次投票，会走「新增一票」分支，
  // 而旧票贡献已固化在聚合值里无法扣除，导致评分永久虚增。持久化才能保证「改分」语义成立。
  await env.RATINGS.put(voteKey, String(stars));

  return json({ id, mine: stars, updated: prev > 0, rating: summarize(agg) }, 200, cors);
}

export { handleBatchRatings, handleSingleRating, handleRate };
