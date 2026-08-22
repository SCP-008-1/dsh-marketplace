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

    async function loadReadme(pkg) {
      if (readmeCache[pkg.id]) {
        readmeContent.innerHTML = readmeCache[pkg.id];
        return;
      }

      readmeContent.innerHTML = '<div style="text-align:center; padding:32px; color:var(--text-tertiary);">' + t('readmeFetching') + '</div>';
      
      const rawUrl = pkg.readmeUrl || ('https://raw.githubusercontent.com/' + (pkg.fullName || (pkg.author + '/' + pkg.name)) + '/' + (pkg.defaultBranch || 'main') + '/README.md');
      
      try {
        const res = await fetch(rawUrl);
        if (!res.ok) throw new Error("README not found");
        const mdText = await res.text();
        let html = '<pre>' + escapeHtml(mdText) + '</pre>';
        if (window.marked && window.DOMPurify) {
          html = DOMPurify.sanitize(marked.parse(mdText), { ADD_ATTR: ["target"], FORBID_TAGS: ["style", "form"], FORBID_ATTR: ["onerror", "onload"] });
        }
        readmeCache[pkg.id] = html;
        readmeContent.innerHTML = html;
      } catch (err) {
        readmeContent.innerHTML = '<div style="text-align:center; padding:32px; color:var(--text-secondary);">' +
          '<p>' + t('readmeError') + '</p>' +
          '<a href="' + pkg.repoUrl + '" target="_blank" rel="noopener" style="color:var(--accent); text-decoration:underline; display:inline-block; margin-top:8px;">' +
            t('readmeViewGithub') +
          '</a>' +
        '</div>';
      }
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
          '<span class="meta-grid-val"><a href="' + pkg.repoUrl + '" target="_blank" rel="noopener" style="color:var(--accent);">' + (pkg.fullName || pkg.name) + ' ↗</a></span>' +
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
        (pkg.tags || []).map(t => '<span class="badge" style="background:var(--bg-surface-raised); border:1px solid var(--border-subtle); cursor:pointer;" onclick="applyQuickSearch(\'' + escapeHtml(t) + '\'); closeDetailModal();">#' + escapeHtml(t) + '</span>').join("");

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
        const dist = Array.isArray(agg.dist) ? agg.dist : [0, 0, 0, 0, 0];
        const rows = [5, 4, 3, 2, 1].map(n => {
          const pct = agg.count ? Math.round((dist[n - 1] / agg.count) * 100) : 0;
          return '<div class="rating-dist-row">' +
              '<span class="rd-label">' + n + ' ★</span>' +
              '<div class="rd-bar"><div class="rd-fill" style="width:' + pct + '%;"></div></div>' +
              '<span class="rd-pct">' + pct + '%</span>' +
            '</div>';
        }).join("");
        communityHtml = '<div class="rating-summary">' +
            '<span class="rs-avg">' + (Number(agg.average || 0).toFixed(1)) + '</span>' +
            '<span class="rs-count">(' + agg.count + ' ' + t('modalRatingCountSuffix') + ')</span>' +
          '</div>' +
          '<div class="rating-dist">' + rows + '</div>';
      } else {
        communityHtml = '<div style="color:var(--text-tertiary); font-size:12.5px; margin-bottom:12px;">' + t('modalRatingEmpty') + '</div>';
      }

      modalRatingBox.innerHTML = communityHtml +
        '<div style="border-top:1px solid var(--border-subtle); padding-top:12px; display:flex; align-items:center; justify-content:space-between;">' +
          '<span style="font-size:13px; color:var(--text-secondary);">' + t('modalRatingYour', my) + '</span>' +
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

    function renderGiscus(pkg) {
      const box = document.getElementById("giscusContainer");
      const cfg = MARKETPLACE_CONFIG.giscus;
      if (!cfg.repoId || !cfg.categoryId) {
        const issuesUrl = pkg.repoUrl ? (pkg.repoUrl + '/issues') : "#";
        box.innerHTML = '<div style="color:var(--text-tertiary); font-size:12.5px; padding:12px; background:var(--bg-surface-raised); border-radius:6px;">' + t('modalDiscussionsFallback', issuesUrl) + '</div>';
        return;
      }
      box.innerHTML = "";
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
        ["data-theme", document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark_dimmed"],
        ["data-lang", currentLang === 'zh' ? "zh-CN" : "en"]
      ].forEach(([k, v]) => s.setAttribute(k, v));
      box.appendChild(s);
    }

    function syncGiscusTheme(theme) {
      const frame = document.querySelector("iframe.giscus-frame");
      if (!frame || !frame.contentWindow) return;
      frame.contentWindow.postMessage(
        { giscus: { setConfig: { theme: theme === "light" ? "light" : "dark_dimmed", lang: currentLang === 'zh' ? "zh-CN" : "en" } } },
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
