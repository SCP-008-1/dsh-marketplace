// === Detail modal / ratings UI / giscus / publish modal ===
    // --- Modal Navigation & Details ---
    function switchModalTab(tab, btn) {
      document.querySelectorAll(".modal-tab-btn").forEach(b => b.classList.remove("active"));
      if (btn) btn.classList.add("active");

      document.getElementById("modalTabOverview").style.display = tab === "overview" ? "block" : "none";
      document.getElementById("modalTabReadme").style.display = tab === "readme" ? "block" : "none";
      document.getElementById("modalTabCompatibility").style.display = tab === "compatibility" ? "block" : "none";
      document.getElementById("modalTabReviews").style.display = tab === "reviews" ? "block" : "none";

      if (tab === "readme" && currentOpenPlugin) {
        loadReadme(currentOpenPlugin);
      }
    }

    // 中文 README 常见命名约定（与同步爬虫一致；用于旧数据无 readmeZhUrl 字段时的运行时回退）
    const ZH_README_FALLBACKS = [
      "README.zh-CN.md",
      "README.zh-cn.md",
      "README_ZH.md",
      "README_zh-CN.md",
      "README.zh-Hans.md",
      "README.zh.md",
      "README-zh.md",
      "README-zh_CN.md",
      "README_CN.md",
      ".github/README.zh-CN.md",
      "docs/README.zh-CN.md"
    ];
    // 每个插件的中文文档探测结果缓存（null = 确认无中文版）
    const zhProbeCache = {};
    // 记录当前实际加载的语种，供切换按钮使用
    let readmeLoadedLang = null;

    function buildRawUrl(pkg, filePath) {
      const fullName = pkg.fullName || ((pkg.author || "") + "/" + (pkg.name || ""));
      const branch = pkg.defaultBranch || "main";
      return "https://raw.githubusercontent.com/" + fullName + "/" + branch + "/" + filePath;
    }

    // 运行时探测中文 README：优先用同步数据中的 readmeZhUrl，否则按候选列表逐个 HEAD 探测
    async function resolveZhReadmeUrl(pkg) {
      if (Object.prototype.hasOwnProperty.call(zhProbeCache, pkg.id)) {
        return zhProbeCache[pkg.id];
      }
      let url = pkg.readmeZhUrl || null;
      if (!url) {
        for (const p of ZH_README_FALLBACKS) {
          try {
            const res = await fetch(buildRawUrl(pkg, p), { method: "HEAD" });
            if (res.ok) { url = buildRawUrl(pkg, p); break; }
          } catch (e) { /* 忽略单个候选失败 */ }
        }
      } else {
        // 校验同步数据中的 URL 仍有效（分支可能已变更）
        try {
          const res = await fetch(url, { method: "HEAD" });
          if (!res.ok) url = null;
        } catch (e) { url = null; }
      }
      zhProbeCache[pkg.id] = url;
      return url;
    }

    async function fetchReadmeHtml(url) {
      const res = await fetch(url);
      if (!res.ok) throw new Error("README not found");
      const mdText = await res.text();
      let html = '<pre>' + escapeHtml(mdText) + '</pre>';
      if (window.marked && window.DOMPurify) {
        html = DOMPurify.sanitize(marked.parse(mdText), { ADD_ATTR: ["target"], FORBID_TAGS: ["style", "form"], FORBID_ATTR: ["onerror", "onload"] });
      }
      return html;
    }

    function updateReadmeToggle() {
      const btn = document.getElementById("readmeLangToggle");
      const hint = document.getElementById("readmeZhHint");
      if (!btn) return;
      const hasZh = !!zhProbeCache[currentOpenPlugin && currentOpenPlugin.id];
      btn.style.display = hasZh ? "inline-flex" : "none";
      if (hint) hint.style.display = "none";
      if (hasZh) {
        btn.textContent = readmeLoadedLang === "zh" ? t('readmeToggleEn') : t('readmeToggleZh');
        btn.classList.toggle("active", readmeLoadedLang === "zh");
      } else if (hint) {
        hint.textContent = t('readmeZhUnavailable');
        hint.style.display = "block";
      }
    }

    async function loadReadme(pkg, forceLang) {
      const desiredLang = forceLang || currentLang; // zh 用户优先展示中文文档
      let lang = desiredLang === "zh" ? "zh" : "en";
      let url = null;

      if (lang === "zh") {
        url = await resolveZhReadmeUrl(pkg);
        if (!url) lang = "en"; // 无中文版则回退英文原文
      }
      if (!url) {
        url = pkg.readmeUrl || buildRawUrl(pkg, "README.md");
      }

      const cacheKey = pkg.id + ":" + lang;
      if (readmeCache[cacheKey]) {
        readmeLoadedLang = lang;
        readmeContent.innerHTML = '<div class="readme-toolbar"><button id="readmeLangToggle" class="toggle-pill" onclick="onReadmeLangToggle()"></button><span id="readmeZhHint" class="readme-zh-hint"></span></div>' + readmeCache[cacheKey];
        updateReadmeToggle();
        return;
      }

      readmeContent.innerHTML = '<div style="text-align:center; padding:32px; color:var(--text-tertiary);">' + t('readmeFetching') + '</div>';

      try {
        const html = await fetchReadmeHtml(url);
        readmeCache[cacheKey] = html;
        readmeLoadedLang = lang;
        readmeContent.innerHTML = '<div class="readme-toolbar"><button id="readmeLangToggle" class="toggle-pill" onclick="onReadmeLangToggle()"></button><span id="readmeZhHint" class="readme-zh-hint"></span></div>' + html;
        updateReadmeToggle();
      } catch (err) {
        // 英文主文档也失败时才显示错误态
        readmeContent.innerHTML = '<div style="text-align:center; padding:32px; color:var(--text-secondary);">' +
          '<p>' + t('readmeError') + '</p>' +
          '<a href="' + escapeHtml(pkg.repoUrl) + '" target="_blank" rel="noopener" style="color:var(--accent); text-decoration:underline; display:inline-block; margin-top:8px;">' +
            t('readmeViewGithub') +
          '</a>' +
        '</div>';
      }
    }

    function onReadmeLangToggle() {
      if (!currentOpenPlugin) return;
      loadReadme(currentOpenPlugin, readmeLoadedLang === "zh" ? "en" : "zh");
    }

    function openDetailModal(pkgId) {
      const pkg = pluginsData.find(p => p.id === pkgId);
      if (!pkg) return;
      currentOpenPlugin = pkg;

      const typeBadge = getTypeBadge(pkg.type);
      modalAvatarSlot.innerHTML = renderAvatar(pkg.author, pkg.authorAvatar, 42);
      modalPkgName.textContent = pkg.name;
      modalPkgBadge.className = 'badge ' + typeBadge.class;
      modalPkgBadge.textContent = typeBadge.label;

      if (pkg.hasNpm) {
        modalVerifiedBadge.style.display = "inline-flex";
        modalNpmLink.style.display = "inline-flex";
        modalNpmLink.href = pkg.npmUrl || ('https://www.npmjs.com/package/' + (pkg.npmName || pkg.name));
      } else {
        modalVerifiedBadge.style.display = "none";
        modalNpmLink.style.display = "none";
      }

      const byLabel = currentLang === 'zh' ? '作者' : 'By';
      const licenseLabel = currentLang === 'zh' ? '开源协议' : 'License';
      modalAuthorLine.innerHTML = byLabel + ' <a href="' + escapeHtml(pkg.authorUrl || ('https://github.com/' + pkg.author)) + '" target="_blank" rel="noopener" style="color:var(--accent);">@' + escapeHtml(pkg.author) + '</a> · ⭐ ' + ((pkg.stars || 0).toLocaleString()) + ' Stars · ' + licenseLabel + ': ' + escapeHtml(pkg.license || "Open Source");

      modalGithubLink.href = pkg.repoUrl;
      modalDescText.textContent = pkg.description || t('noDesc');

      // Quick Install command
      const installCmd = pkgInstallCmd(pkg);
      modalInstallOptions.innerHTML = installCmd
        ? ('<div class="install-box">' +
            '<code><span class="prefix">$</span> ' + escapeHtml(installCmd) + '</code>' +
            '<button class="btn btn-install" onclick="copyCommand(\'' + jsAttr(installCmd) + '\', this)">' + t('copyBtn') + '</button>' +
          '</div>')
        : ('<div class="install-box" style="display:block; color:var(--text-muted); font-size:12.5px; line-height:1.6;">' +
            escapeHtml(t('noNpmCmdNote')) +
          '</div>');

      // Meta Table
      modalMetaGrid.innerHTML = '<div class="meta-grid-cell">' +
          '<span class="meta-grid-label">' + t('modalMetaRepo') + '</span>' +
          '<span class="meta-grid-val"><a href="' + escapeHtml(pkg.repoUrl) + '" target="_blank" rel="noopener" style="color:var(--accent);">' + escapeHtml(pkg.fullName || pkg.name) + ' ↗</a></span>' +
        '</div>' +
        '<div class="meta-grid-cell">' +
          '<span class="meta-grid-label">' + t('modalMetaAuthor') + '</span>' +
          '<span class="meta-grid-val">@' + escapeHtml(pkg.author) + '</span>' +
        '</div>' +
        '<div class="meta-grid-cell">' +
          '<span class="meta-grid-label">' + t('modalMetaLicense') + '</span>' +
          '<span class="meta-grid-val">' + escapeHtml(pkg.license || "Unknown") + '</span>' +
        '</div>' +
        '<div class="meta-grid-cell">' +
          '<span class="meta-grid-label">' + t('modalMetaUpdated') + '</span>' +
          '<span class="meta-grid-val">' + formatDate(pkg.updatedAt) + '</span>' +
        '</div>';

      // Tags
      modalTagsContainer.innerHTML = '<span class="badge badge-verified" style="cursor:pointer;" onclick="applyQuickSearch(\'dsh-plugin\'); closeDetailModal();">#dsh-plugin</span>' +
        (pkg.tags || []).map(tag => '<span class="badge" style="background:var(--bg-surface-raised); border:1px solid var(--border-subtle); cursor:pointer;" onclick="applyQuickSearch(\'' + jsAttr(tag) + '\'); closeDetailModal();">#' + escapeHtml(tag) + '</span>').join("");

      // Specs & Verification Notes
      modalSpecsGrid.innerHTML = '<div class="meta-grid-cell">' +
          '<span class="meta-grid-label">' + t('modalSpecsName') + '</span>' +
          '<span class="meta-grid-val">' + escapeHtml(pkg.name) + '</span>' +
        '</div>' +
        '<div class="meta-grid-cell">' +
          '<span class="meta-grid-label">' + t('modalSpecsVersion') + '</span>' +
          '<span class="meta-grid-val">' + escapeHtml(pkg.version || "latest") + '</span>' +
        '</div>' +
        '<div class="meta-grid-cell">' +
          '<span class="meta-grid-label">' + t('modalSpecsBranch') + '</span>' +
          '<span class="meta-grid-val">' + escapeHtml(pkg.defaultBranch || "main") + '</span>' +
        '</div>' +
        '<div class="meta-grid-cell">' +
          '<span class="meta-grid-label">' + t('modalSpecsIssues') + '</span>' +
          '<span class="meta-grid-val">' + (pkg.openIssues || 0) + '</span>' +
        '</div>';

      modalVerificationNote.innerHTML = pkg.hasNpm ? t('modalVerifyNpmNote') : t('modalVerifyGitNote');

      // Reviews & Discussions
      renderModalRating(pkg);
      renderGiscus(pkg);

      // Reset to overview tab
      switchModalTab('overview', document.getElementById('modalTabBtnOverview'));
      detailModal.classList.add("open");
    }

    function closeDetailModal() {
      detailModal.classList.remove("open");
    }

    function renderModalRating(pkg) {
      const my = myRatings[pkg.id] || 0;
      const idAttr = jsAttr(pkg.id);
      const agg = remoteRatings[pkg.id];
      let communityHtml = "";
      if (agg && agg.count) {
        const avg = Number(agg.average || 0);
        const dist = Array.isArray(agg.dist) ? agg.dist : [0, 0, 0, 0, 0];
        const rows = [5, 4, 3, 2, 1].map(n => {
          const pct = agg.count ? Math.round((dist[n - 1] / agg.count) * 100) : 0;
          return '<div class="rating-dist-row">' +
              '<span class="rd-label">' + n + ' ★</span>' +
              '<div class="rd-bar"><div class="rd-fill" style="width:' + pct + '%;"></div></div>' +
              '<span class="rd-pct">' + pct + '%</span>' +
            '</div>';
        }).join("");
        // 平均分星级展示（四舍五入到整星）
        const rounded = Math.round(avg);
        const starDisplay = [1, 2, 3, 4, 5].map(s =>
          '<span class="' + (s <= rounded ? 'rsd-star filled' : 'rsd-star') + '">★</span>'
        ).join("");
        communityHtml = '<div class="rating-hero">' +
            '<div class="rh-score-block">' +
              '<span class="rh-avg">' + avg.toFixed(1) + '</span>' +
              '<div class="rh-stars-display">' + starDisplay + '</div>' +
              '<span class="rh-count">' + agg.count + ' ' + t('modalRatingCountSuffix') + '</span>' +
            '</div>' +
            '<div class="rating-dist">' + rows + '</div>' +
          '</div>';
      } else {
        communityHtml = '<div class="rating-empty">⭐ <span>' + t('modalRatingEmpty') + '</span></div>';
      }

      modalRatingBox.innerHTML = communityHtml +
        '<div class="rating-your-row">' +
          '<span class="ry-label">' + t('modalRatingYour', my) + '</span>' +
          '<div class="rating-stars" id="modalStarsWrap" onmouseleave="resetStarHover(\'' + idAttr + '\')">' +
            [1, 2, 3, 4, 5].map(s => 
              '<span class="star ' + (my >= s ? 'filled' : '') + '" onmouseenter="hoverStar(' + s + ')" onclick="ratePlugin(\'' + idAttr + '\', ' + s + ')">★</span>'
            ).join("") +
          '</div>' +
        '</div>';
    }

    function hoverStar(count) {
      document.querySelectorAll("#modalStarsWrap .star").forEach((s, idx) => {
        if (idx < count) s.classList.add("hovered");
        else s.classList.remove("hovered");
      });
    }

    function resetStarHover(pkgId) {
      const my = myRatings[pkgId] || 0;
      document.querySelectorAll("#modalStarsWrap .star").forEach((s, idx) => {
        s.classList.remove("hovered");
        if (idx < my) s.classList.add("filled");
        else s.classList.remove("filled");
      });
    }

    function persistMyRatings() {
      try {
        localStorage.setItem(RATING_STORAGE_KEY, JSON.stringify(myRatings));
      } catch (err) {}
    }

    function ratePlugin(pkgId, stars) {
      // 不做乐观更新：等服务端确认成功后再更新本地状态，
      // 避免 429/网络错误时 UI 显示已评分但服务端未记录。
      postRating(pkgId, stars);
    }

    function getVoterId() {
      try {
        let v = localStorage.getItem("dsh_voter_id");
        if (!v) {
          const buf = new Uint8Array(16);
          crypto.getRandomValues(buf);
          v = [...buf].map(b => b.toString(16).padStart(2, "0")).join("");
          localStorage.setItem("dsh_voter_id", v);
        }
        return v;
      } catch (err) {
        return null;
      }
    }

    async function postRating(pkgId, stars) {
      if (!RATING_API) {
        // 未配置后端时降级为纯本地记录
        myRatings[pkgId] = stars;
        persistMyRatings();
        showToast(t('toastRatingThanks', stars), "⭐");
        const localPkg = pluginsData.find(p => p.id === pkgId);
        if (localPkg) renderModalRating(localPkg);
        return;
      }
      try {
        const res = await fetch(RATING_API + '/api/rate', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: pkgId, stars, voter: getVoterId() })
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();

        // 服务端确认成功后才更新本地状态并提示
        myRatings[pkgId] = stars;
        persistMyRatings();
        showToast(t('toastRatingThanks', stars), "⭐");
        if (data.rating) {
          remoteRatings[pkgId] = data.rating;
          applyFilters();
        }
        const pkg = pluginsData.find(p => p.id === pkgId);
        if (pkg) renderModalRating(pkg);
      } catch (err) {
        showToast(t('toastRatingFail'), "⚠️");
      }
    }

    async function syncRatings(ids) {
      if (!RATING_API || !ids || !ids.length) return;
      const unique = [...new Set(ids)].filter(Boolean);
      // 批次控制在 50：id 最长 120 字符，100 个拼进 query 可能超过 URL 长度限制
      for (let i = 0; i < unique.length; i += 50) {
        const batch = unique.slice(i, i + 50);
        try {
          const res = await fetch(RATING_API + '/api/ratings?ids=' + encodeURIComponent(batch.join(",")));
          if (!res.ok) continue;
          const data = await res.json();
          remoteRatings = { ...remoteRatings, ...(data.ratings || {}) };
        } catch (err) {}
      }
      applyFilters();
    }

    /** 站点 GitHub 登录态 ↔ giscus 评论区的身份提示条（轻量打通） */
    function renderGiscusIdentityHtml() {
      const session = (typeof getGithubSession === "function") ? getGithubSession() : null;
      if (session) {
        return '<div class="giscus-identity-banner logged-in">' +
          '<span class="gib-icon">✅</span>' +
          '<span>' + t('ghIdentityLoggedIn').replace('{user}', '<a class="gib-user" href="https://github.com/' + encodeURIComponent(session.user.login) + '" target="_blank" rel="noopener">@' + escapeHtml(session.user.login) + '</a>') + '</span>' +
          '</div>';
      }
      return '<div class="giscus-identity-banner">' +
        '<span class="gib-icon">💬</span>' +
        '<span>' + t('ghIdentityLoggedOut') + '</span>' +
        '<button class="btn btn-github gib-login-btn" onclick="startGithubLogin()">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
            '<path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7 0-.7 0-.7 1.2 0 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2 0-.4-.5-1.6.2-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.6.2 2.8.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"></path>' +
          '</svg>' +
          '<span>' + t('ghIdentityLoginCta') + '</span>' +
        '</button>' +
        '</div>';
    }

    /** 当前站点主题对应的 giscus 自定义主题绝对 URL（assets/css/giscus-*.css） */
    function getGiscusThemeUrl() {
      const name = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
      return new URL("assets/css/giscus-" + name + ".css", location.href).toString();
    }

    function renderGiscus(pkg) {
      const box = document.getElementById("giscusContainer");
      const cfg = MARKETPLACE_CONFIG.giscus;
      const identityHtml = renderGiscusIdentityHtml();
      if (!cfg.repoId || !cfg.categoryId) {
        const issuesUrl = pkg.repoUrl ? (pkg.repoUrl + '/issues') : "#";
        box.innerHTML = identityHtml + '<div style="color:var(--text-tertiary); font-size:12.5px; padding:12px; background:var(--bg-surface-raised); border-radius:6px;">' + t('modalDiscussionsFallback', escapeHtml(issuesUrl)) + '</div>';
        return;
      }
      // 骨架屏：giscus iframe 加载完成（首次 postMessage）前占位，避免布局跳动
      box.innerHTML = identityHtml +
        '<div class="giscus-skeleton">' +
          [92, 100, 76, 88].map(w => '<div class="gs-line" style="width:' + w + '%;"></div>').join("") +
        '</div>';
      const hideSkeleton = () => {
        const sk = box.querySelector(".giscus-skeleton");
        if (sk) sk.remove();
        window.removeEventListener("message", onGiscusMsg);
      };
      const onGiscusMsg = (e) => { if (e.origin === "https://giscus.app") hideSkeleton(); };
      window.addEventListener("message", onGiscusMsg);
      // 兜底：6s 后无论是否加载完都移除骨架
      setTimeout(hideSkeleton, 6000);

      const s = document.createElement("script");
      s.src = "https://giscus.app/client.js";
      s.async = true;
      s.crossOrigin = "anonymous";
      [
        ["data-repo", cfg.repo],
        ["data-repo-id", cfg.repoId],
        ["data-category", cfg.category],
        ["data-category-id", cfg.categoryId],
        ["data-mapping", "specific"],
        ["data-term", "plugin: " + (pkg.fullName || pkg.name)],
        ["data-strict", "0"],
        ["data-reactions-enabled", "1"],
        ["data-emit-metadata", "0"],
        ["data-input-position", "top"],
        ["data-theme", getGiscusThemeUrl()],
        ["data-lang", currentLang === 'zh' ? "zh-CN" : "en"]
      ].forEach(([k, v]) => s.setAttribute(k, v));
      box.appendChild(s);
    }

    function syncGiscusTheme(theme) {
      const frame = document.querySelector("iframe.giscus-frame");
      if (!frame || !frame.contentWindow) return;
      frame.contentWindow.postMessage(
        { giscus: { setConfig: { theme: getGiscusThemeUrl(), lang: currentLang === 'zh' ? "zh-CN" : "en" } } },
        "https://giscus.app"
      );
    }

    function openPublishModal() {
      publishModal.classList.add("open");
    }
    function closePublishModal() {
      publishModal.classList.remove("open");
    }

    // Modal click backdrop to close
    [detailModal, publishModal].forEach(modal => {
      modal.addEventListener("click", e => {
        if (e.target === modal) modal.classList.remove("open");
      });
    });
