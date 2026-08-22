/**
 * CORS 辅助：基于 ALLOWED_ORIGINS 环境变量的白名单校验
 */

function corsHeaders(origin, env) {
  const allow = (env.ALLOWED_ORIGINS || "*").split(",").map(s => s.trim()).filter(Boolean);
  const openByDefault = allow.includes("*"); // 未配置白名单时才全开；已配置则严格校验
  const ok = openByDefault || allow.includes(origin);

  const headers = {
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
  // Origin 不在白名单时不输出 ACAO 头（浏览器会拦截），而不是回退到某个无关的合法域名
  if (ok) headers["Access-Control-Allow-Origin"] = origin || "*";
  return headers;
}

export { corsHeaders };
