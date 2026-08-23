// === GitHub OAuth 登录会话管理 ===
    // --- GitHub Auth Session ---
    // 会话令牌由 rating Worker /auth/github/callback 签发，通过 #gh_token= 回传。
    // 前端只解码 payload 用于展示；签名校验由 Worker 在 /api/auth/me 完成。
    const GH_SESSION_KEY = "dsh_gh_session";

    function getGithubSession() {
      try {
        const raw = localStorage.getItem(GH_SESSION_KEY);
        if (!raw) return null;
        const [payloadB64url] = raw.split(".");
        const payload = JSON.parse(decodeURIComponent(escape(atob(payloadB64url.replace(/-/g, "+").replace(/_/g, "/")))));
        if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
          localStorage.removeItem(GH_SESSION_KEY);
          return null;
        }
        return { token: raw, user: { id: payload.sub, login: payload.login, avatar_url: payload.avatar } };
      } catch {
        return null;
      }
    }

    function renderGithubAuthUI() {
      const area = document.getElementById("heroAuthArea");
      if (!area) return;
      const session = getGithubSession();

      if (session) {
        // 已登录：显示头像 + 用户名 + 登出
        area.innerHTML =
          '<div class="auth-user-chip">' +
            '<img class="auth-avatar" src="' + session.user.avatar_url + '" alt="" referrerpolicy="no-referrer" width="26" height="26">' +
            '<a class="auth-username" href="https://github.com/' + encodeURIComponent(session.user.login) + '" target="_blank" rel="noopener">' +
              escapeHtml(session.user.login) +
            '</a>' +
            '<button class="auth-logout-btn" onclick="logoutGithub()" title="' + t('ghLogoutBtn') + '">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>' +
                '<polyline points="16 17 21 12 16 7"></polyline>' +
                '<line x1="21" y1="12" x2="9" y2="12"></line>' +
              '</svg>' +
            '</button>' +
          '</div>';
      } else {
        // 未登录：恢复登录按钮（i18n 文案由 updateStaticI18n 填充）
        area.innerHTML =
          '<button class="btn btn-github" id="githubLoginBtn" onclick="startGithubLogin()">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
              '<path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7 0-.7 0-.7 1.2 0 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2 0-.4-.5-1.6.2-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.6.2 2.8.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"></path>' +
            '</svg>' +
            '<span id="githubLoginText">' + t('ghLoginBtn') + '</span>' +
          '</button>';
      }
    }

    // 发起登录：跳转 Worker，Worker 再 302 到 GitHub 授权页
    function startGithubLogin() {
      const api = MARKETPLACE_CONFIG.ratingApi.replace(/\/$/, "");
      // 只回传 origin+pathname，避免把旧 hash 带进 OAuth 回环
      const back = location.origin + location.pathname;
      location.href = api + "/auth/github?redirect=" + encodeURIComponent(back);
    }

    function logoutGithub() {
      localStorage.removeItem(GH_SESSION_KEY);
      renderGithubAuthUI();
      if (typeof showToast === "function") showToast(t('ghLogoutToast'), "👋");
    }

    // 页面加载：处理 OAuth 回调 hash（#gh_token=... 或 #gh_auth_error=1）
    function initGithubAuth() {
      const hash = location.hash || "";

      const tokenMatch = hash.match(/[#&]gh_token=([^&]+)/);
      if (tokenMatch) {
        try {
          const token = decodeURIComponent(tokenMatch[1]);
          localStorage.setItem(GH_SESSION_KEY, token); // getGithubSession 会校验 exp
        } catch { /* 存储不可用时忽略 */ }
        history.replaceState(null, "", location.origin + location.pathname + location.search);
        renderGithubAuthUI();
        const session = getGithubSession();
        if (session && typeof showToast === "function") {
          showToast(t('ghLoginToast') + " " + session.user.login, "✅");
        }
        return;
      }

      if (hash.includes("gh_auth_error=1")) {
        history.replaceState(null, "", location.origin + location.pathname + location.search);
        if (typeof showToast === "function") showToast(t('ghAuthErrorToast'), "⚠️");
        return;
      }

      // 无回调：常规渲染（过期会话会被 getGithubSession 清理）
      renderGithubAuthUI();
    }

    // 后台向 Worker 验签并刷新用户资料（令牌被篡改/吊销时静默登出）
    async function verifyGithubSessionAsync() {
      const session = getGithubSession();
      if (!session) return;
      try {
        const api = MARKETPLACE_CONFIG.ratingApi.replace(/\/$/, "");
        const res = await fetch(api + "/api/auth/me", {
          headers: { "Authorization": "Bearer " + session.token }
        });
        if (!res.ok) {
          logoutGithub();
          return;
        }
        const data = await res.json();
        if (data.authenticated && data.user.login !== session.user.login) {
          renderGithubAuthUI(); // 资料有变（如改了用户名），刷新展示
        }
      } catch { /* 网络异常时保持本地会话 */ }
    }

    // utils.js 之后、app.js 之前执行；defer 保证 DOM 就绪
    document.addEventListener("DOMContentLoaded", () => {
      initGithubAuth();
      verifyGithubSessionAsync();
    });

    Object.assign(window, { startGithubLogin, logoutGithub });
