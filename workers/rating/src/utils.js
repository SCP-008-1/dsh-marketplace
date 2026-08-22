/**
 * KV 与通用工具辅助
 *
 * KV 键设计:
 *   agg:<pluginId>              -> { sum, count, dist: [n1,n2,n3,n4,n5] }
 *   vote:<voter>:<pluginId>     -> stars (1-5)   用于「改分」而不是「重复加分」
 *   rl:<ipHash>                 -> 时间戳，简易限流
 */

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

function json(data, status, headers) {
  // 默认头在前，调用方头在后：允许批量读接口用 public,max-age 覆盖 no-store，
  // 否则边缘缓存永远无法生效
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export { readAgg, summarize, isValidId, json, sha256 };
