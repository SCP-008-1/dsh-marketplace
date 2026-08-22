// === Toast / copy / omnibar / favorites / navigation ===
    function showToast(message, icon) {
      icon = icon || "✓";
      const toast = document.createElement("div");
      toast.className = "toast";
      toast.innerHTML = '<span class="toast-icon">' + icon + '</span><span>' + message + '</span>';
      toastContainer.appendChild(toast);
      
      requestAnimationFrame(() => {
        toast.classList.add("show");
      });

      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 260);
      }, 2200);
    }

    function copyCommand(text, btnElement, toastCustomMsg) {
      navigator.clipboard.writeText(text).then(() => {
        if (btnElement) {
          const origText = btnElement.innerHTML;
          btnElement.classList.add("copied");
          btnElement.innerHTML = t('copyDone');
          setTimeout(() => {
            btnElement.classList.remove("copied");
            btnElement.innerHTML = origText;
          }, 1600);
        }
        showToast(toastCustomMsg || t('toastCopiedGeneric', text));
      }).catch(err => {
        console.error("Copy failed", err);
      });
    }

    // 仅返回数据中已验证的安装命令；无 package.json 的仓库返回 null（不可 npm 安装）
    function pkgInstallCmd(pkg) {
      return (pkg && typeof pkg.installCmd === 'string' && pkg.installCmd) || null;
    }

    // 卡片/列表统一的安装按钮：无有效 npm 命令时降级为 GitHub 仓库跳转
    function installActionHtml(pkg, installCmd, styleAttr) {
      if (installCmd) {
        return '<button class="btn btn-install" ' + (styleAttr ? 'style="' + styleAttr + '" ' : '') + 'onclick="copyPkgInstall(\'' + jsAttr(installCmd) + '\', this, event)">' + t('installBtn') + '</button>';
      }
      return '<a class="btn btn-ghost" href="' + escapeHtml(pkg.repoUrl || ('https://github.com/' + (pkg.fullName || pkg.name))) + '" target="_blank" rel="noopener" ' + (styleAttr ? 'style="' + styleAttr + '; text-decoration:none;" ' : '') + '>' + t('githubBtn') + '</a>';
    }

    function copyPkgInstall(cmd, btnElement, e) {
      if (e) e.stopPropagation();
      copyCommand(cmd, btnElement, t('toastCopiedCmd', cmd));
    }

    function copyModalInstall(btn) {
      if (!currentOpenPlugin) return;
      const cmd = pkgInstallCmd(currentOpenPlugin);
      copyCommand(cmd, btn, t('toastCopiedCmd', cmd));
    }

    function copyTopicTag(tag) {
      copyCommand(tag, null, t('toastCopiedTag', tag));
    }

    // --- Search & Omnibar Management ---
    function renderRecentSearches() {
      if (!recentSearches || recentSearches.length === 0) {
        recentSearchesWrap.style.display = "none";
        return;
      }
      recentSearchesWrap.style.display = "block";
      recentSearchesList.innerHTML = recentSearches.slice(0, 6).map(s => 
        '<span class="dropdown-chip" onclick="applyQuickSearch(\'' + escapeHtml(s) + '\')">⏱️ ' + escapeHtml(s) + '</span>'
      ).join("");
    }

    function saveRecentSearch(query) {
      const q = query.trim();
      if (!q || q.length < 2) return;
      recentSearches = [q, ...recentSearches.filter(s => s !== q)].slice(0, 8);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
      } catch(e) {}
      renderRecentSearches();
    }

    function clearRecentSearches() {
      recentSearches = [];
      try {
        localStorage.removeItem(RECENT_SEARCHES_KEY);
      } catch(e) {}
      renderRecentSearches();
    }

    function applyQuickSearch(text) {
      searchInput.value = text;
      omnibarDropdown.classList.remove("open");
      applyFilters();
      saveRecentSearch(text);
      document.getElementById("packagesSection").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // --- Favorites Management ---
    function toggleFavorite(pkgId, e) {
      if (e) e.stopPropagation();
      if (favorites.has(pkgId)) {
        favorites.delete(pkgId);
        showToast(t('toastFavRemoved'), "ℹ");
      } else {
        favorites.add(pkgId);
        showToast(t('toastFavAdded'), "⭐");
      }
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
      } catch (e) {}

      updateFavoritesUI();
      if (currentTier1Tab === "favorites") {
        applyFilters();
      } else {
        renderPackages();
      }
    }

    function updateFavoritesUI() {
      const count = favorites.size;
      tier1CountFav.textContent = '(' + count + ')';
      if (count > 0) {
        favoriteCountBadge.style.display = "block";
        favoriteCountBadge.textContent = count;
      } else {
        favoriteCountBadge.style.display = "none";
      }
    }

    function toggleFavoriteTab() {
      if (currentTier1Tab === "favorites") {
        selectTier1Tab("all");
      } else {
        selectTier1Tab("favorites");
      }
      document.getElementById("packagesSection").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // --- Two-Tier Navigation ---
    function selectTier1Tab(tab) {
      currentTier1Tab = tab;
      document.querySelectorAll(".tier1-tab").forEach(t => {
        if (t.getAttribute("data-tab") === tab) {
          t.classList.add("active");
        } else {
          t.classList.remove("active");
        }
      });
      applyFilters();
    }

    function selectScenario(scenario) {
      currentScenario = scenario;
      document.querySelectorAll(".scenario-chip").forEach(c => {
        if (c.getAttribute("data-scenario") === scenario) {
          c.classList.add("active");
        } else {
          c.classList.remove("active");
        }
      });
      applyFilters();
    }

    function focusScenario(scenario) {
      selectScenario(scenario);
      document.getElementById("packagesSection").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function focusTier1(tab) {
      selectTier1Tab(tab);
      document.getElementById("packagesSection").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function scrollToTrending() {
      document.getElementById("trendingSection").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function toggleVerifiedOnly() {
      isVerifiedOnly = !isVerifiedOnly;
      if (isVerifiedOnly) {
        verifiedOnlyBtn.classList.add("active");
      } else {
        verifiedOnlyBtn.classList.remove("active");
      }
      applyFilters();
    }

    function setViewMode(mode) {
      currentViewMode = mode;
      localStorage.setItem("dsh_view_mode", mode);
      if (mode === "grid") {
        viewGridBtn.classList.add("active");
        viewListBtn.classList.remove("active");
        packagesContainer.className = "packages-grid";
      } else {
        viewListBtn.classList.add("active");
        viewGridBtn.classList.remove("active");
        packagesContainer.className = "packages-list";
      }
      renderPackages();
    }
