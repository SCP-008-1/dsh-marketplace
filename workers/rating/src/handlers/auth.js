/**
 * GitHub OAuth 登录处理器
 * ---------------------------------------------------------------
 * 流程（前端无后端 Cookie，使用 URL Fragment 传回会话令牌）:
 *   1. GET /auth/github?redirect=<站点页面URL>
 *      -> 校验 redirect 的 Origin 在白名单内，生成一次性 state 存 KV（10 分钟 TTL）
 *      -> 302 跳转 GitHub 授权页
 *   2. GET /auth/github/callback?code&state
 *      -> 校验并销毁 state（防 CSRF / 重放）
 *      -> 用 code 换 access_token，再拉取用户资料
 *      -> 签发 HMAC-SHA256 会话令牌，302 回 <redirect>#gh_token=<token>
 *   3. GET /api/auth/me（Authorization: Bearer <token>）
 *      -> 验签 + 验过期，返回用户信息
 *
 * 所需 Secret / Var:
 *   npx wrangler secret put GITHUB_CLIENT_ID
 *   npx wrangler secret put GITHUB_CLIENT_SECRET
 *   SALT（已有，同时用作会话令牌签名密钥）
 */
import { json } from "../utils.js";

const STATE_TTL_SECONDS = 600;          // state 有效期：10 分钟
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 会话有效期：30 天
const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_API = "https://api.github.com/user";

// ---------- base64url 辅助 ----------

function b64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}

// ---------- HMAC-SHA256 签名 ----------

async function signPayload(env, payloadB64url) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.SALT),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64url));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function createSessionToken(env, user) {
  const payload = {
    sub: user.id,
    login: user.login,
    avatar: user.avatar_url,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  };
  const payloadB64url = b64urlEncode(JSON.stringify(payload));
  return `${payloadB64url}.${await signPayload(env, payloadB64url)}`;
}

/** 校验令牌签名与有效期；合法返回 payload，否则返回 null */
export async function verifySessionToken(env, token) {
  if (!env.SALT || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || token.includes(".", dot + 1)) return null;
  const [payloadB64url, sig] = [token.slice(0, dot), token.slice(dot + 1)];
  const expected = await signPayload(env, payloadB64url);
  // 常量时间比较，避免时序侧信道
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const payload = JSON.parse(b64urlDecode(payloadB64url));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------- redirect 白名单校验 ----------

/**
 * 只允许跳回 ALLOWED_ORIGINS 白名单内的地址；
 * 不合法时回退到白名单第一个 Origin 的根路径。
 */
function sanitizeRedirect(url, env) {
  const allow = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  try {
    const target = new URL(url);
    if (allow.includes(target.origin)) return target.origin + target.pathname;
  } catch { /* fallthrough */ }
  return allow[0] ? new URL(allow[0]).origin : "/";
}

// ---------- 处理器 ----------

/** GET /auth/github */
export async function handleAuthStart(request, url, env) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return json({ error: "oauth not configured" }, 500);
  }
  const redirect = sanitizeRedirect(url.searchParams.get("redirect") || "", env);
  const state = [...crypto.getRandomValues(new Uint8Array(24))]
    .map(b => b.toString(16).padStart(2, "0")).join("");

  await env.RATINGS.put(`oauth:state:${state}`, JSON.stringify({ redirect }), {
    expirationTtl: STATE_TTL_SECONDS
  });

  const authorizeUrl = new URL(GITHUB_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set("scope", "read:user");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("redirect_uri", new URL("/auth/github/callback", url).toString());
  return Response.redirect(authorizeUrl.toString(), 302);
}

/** GET /auth/github/callback */
export async function handleAuthCallback(request, url, env) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // state 必须存在且一次性消费（取出即删）
  let stored = null;
  if (code && state) {
    stored = await env.RATINGS.get(`oauth:state:${state}`);
    await env.RATINGS.delete(`oauth:state:${state}`);
  }

  let failRedirect = "/";
  try {
    if (stored) failRedirect = JSON.parse(stored).redirect || "/";
  } catch { /* ignore */ }
  const errRedirect = `${failRedirect}#gh_auth_error=1`;

  if (!stored || !code) {
    return Response.redirect(errRedirect, 302);
  }

  // 用 code 换 access_token
  const tokenRes = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: { "Accept": "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      state
    })
  });
  const tokenData = await tokenRes.json().catch(() => null);
  const accessToken = tokenData && tokenData.access_token;
  if (!accessToken) return Response.redirect(errRedirect, 302);

  // 拉取用户资料（scope 仅 read:user，够用且最小化）
  const userRes = await fetch(GITHUB_USER_API, {
    headers: { "Authorization": `Bearer ${accessToken}`, "User-Agent": "dsh-marketplace" }
  });
  if (!userRes.ok) return Response.redirect(errRedirect, 302);
  const ghUser = await userRes.json();

  const token = await createSessionToken(env, ghUser);
  return Response.redirect(`${failRedirect}#gh_token=${encodeURIComponent(token)}`, 302);
}

/** GET /api/auth/me */
export async function handleMe(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const payload = await verifySessionToken(env, token);
  if (!payload) return json({ authenticated: false }, 401);
  return json({
    authenticated: true,
    user: { id: payload.sub, login: payload.login, avatar_url: payload.avatar }
  });
}
