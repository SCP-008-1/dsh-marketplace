// === Theme / stats / data loading / events / init ===
    // --- Theme Switcher ---
    function initTheme() {
      const saved = localStorage.getItem("dsh_theme") || "dark";
      setTheme(saved);
    }

    function setTheme(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("dsh_theme", theme);
      if (theme === "dark") {
        moonIcon.style.display = "none";
        sunIcon.style.display = "block";
        themeToggleBtn.title = t('themeToggleTitleLight');
      } else {
        moonIcon.style.display = "block";
        sunIcon.style.display = "none";
        themeToggleBtn.title = t('themeToggleTitleDark');
      }
      syncGiscusTheme(theme);
    }

    themeToggleBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "dark";
      setTheme(current === "dark" ? "light" : "dark");
    });

    function resetAllFilters() {
      searchInput.value = "";
      typeFilter.value = "";
      sortFilter.value = "stars";
      isVerifiedOnly = false;
      verifiedOnlyBtn.classList.remove("active");
      currentTier1Tab = "all";
      currentScenario = "all";
      document.querySelectorAll(".tier1-tab").forEach(t => t.classList.remove("active"));
      document.querySelector('.tier1-tab[data-tab="all"]').classList.add("active");
      document.querySelectorAll(".scenario-chip").forEach(c => c.classList.remove("active"));
      document.querySelector('.scenario-chip[data-scenario="all"]').classList.add("active");
      applyFilters();
    }

    // --- Stats Update ---
    function updateStats() {
      const total = pluginsData.length;
      heroTotalCount.textContent = total;
      tier1CountAll.textContent = '(' + total + ')';
      updateFavoritesUI();
    }

    // --- Data Loading & Live Sync ---
    async function loadPlugins() {
      // Instant initial paint from bootstrap data
      if (pluginsData && pluginsData.length > 0) {
        updateStats();
        renderTrending();
        applyFilters();
        renderRecentSearches();
        syncRatings(pluginsData.map(p => p.id));
      }

      // Revalidate in background from ./data/plugins.json
      try {
        const res = await fetch('./data/plugins.json');
        if (res.ok) {
          const json = await res.json();
          if (json.plugins && json.plugins.length > 0) {
            pluginsData = json.plugins;
            updateStats();
            renderTrending();
            applyFilters();
            syncRatings(pluginsData.map(p => p.id));
            return;
          }
        }
      } catch (err) {}

      // Fallback GitHub API if data/plugins.json fetch fails
      try {
        const res = await fetch('https://api.github.com/search/repositories?q=topic:dsh-plugin+is:public&sort=stars&order=desc&per_page=100');
        if (res.ok) {
          const data = await res.json();
          const items = (data.items || []).filter(repo => {
            const fullName = (repo.full_name || '').toLowerCase();
            return !fullName.includes('deepseek-ai/deepseek-harness');
          });

          if (items.length > 0) {
            pluginsData = items.map(repo => {
              const topics = repo.topics || [];
              let type = 'extension';
              const lowerTopics = topics.map(t => t.toLowerCase());
              if (lowerTopics.includes('dsh-skill') || lowerTopics.includes('skill')) type = 'skill';
              else if (lowerTopics.includes('dsh-mcp') || lowerTopics.includes('mcp')) type = 'mcp';
              else if (lowerTopics.includes('dsh-theme') || lowerTopics.includes('theme')) type = 'theme';
              else if (lowerTopics.includes('dsh-prompt') || lowerTopics.includes('prompt')) type = 'prompt';

              return {
                id: repo.name,
                name: repo.name,
                fullName: repo.full_name,
                description: repo.description || t('noDesc'),
                author: repo.owner ? repo.owner.login : 'unknown',
                authorAvatar: repo.owner ? repo.owner.avatar_url : '',
                authorUrl: repo.owner ? repo.owner.html_url : '',
                repoUrl: repo.html_url,
                stars: repo.stargazers_count || 0,
                forks: repo.forks_count || 0,
                license: repo.license ? (repo.license.spdx_id || repo.license.name) : 'Unknown',
                updatedAt: repo.updated_at,
                tags: topics.filter(t => t.toLowerCase() !== 'dsh-plugin'),
                type: type,
                hasNpm: false,
                installCmd: 'npm i github:' + repo.full_name,
                readmeUrl: 'https://raw.githubusercontent.com/' + repo.full_name + '/' + (repo.default_branch || 'main') + '/README.md'
              };
            });

            updateStats();
            renderTrending();
            applyFilters();
            syncRatings(pluginsData.map(p => p.id));
          }
        }
      } catch (err) {}
    }

    // --- Event Listeners & Shortcuts ---
    let searchDebounce;
    searchInput.addEventListener("input", () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        applyFilters();
        if (searchInput.value.trim().length >= 2) {
          saveRecentSearch(searchInput.value.trim());
        }
      }, 100);
    });

    searchInput.addEventListener("focus", () => {
      renderRecentSearches();
      omnibarDropdown.classList.add("open");
    });

    // Close omnibar dropdown on click outside
    document.addEventListener("click", e => {
      if (!omnibarContainer.contains(e.target)) {
        omnibarDropdown.classList.remove("open");
      }
    });

    searchClearBtn.addEventListener("click", () => {
      searchInput.value = "";
      applyFilters();
      searchInput.focus();
    });

    // Scroll listener for Back to Top
    window.addEventListener("scroll", () => {
      if (window.scrollY > 350) {
        backToTopBtn.classList.add("show");
      } else {
        backToTopBtn.classList.remove("show");
      }
    });

    // Keyboard Shortcuts
    window.addEventListener("keydown", e => {
      // ESC
      if (e.key === "Escape") {
        if (detailModal.classList.contains("open")) {
          closeDetailModal();
        } else if (publishModal.classList.contains("open")) {
          closePublishModal();
        } else if (omnibarDropdown.classList.contains("open")) {
          omnibarDropdown.classList.remove("open");
        } else if (searchInput === document.activeElement && searchInput.value) {
          searchInput.value = "";
          applyFilters();
        }
      }
      // Slash (/) or Cmd+K / Ctrl+K
      if ((e.key === "/" || ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K"))) && document.activeElement !== searchInput && !detailModal.classList.contains("open") && !publishModal.classList.contains("open")) {
        e.preventDefault();
        searchInput.focus();
        omnibarDropdown.classList.add("open");
        document.getElementById("omnibarContainer").scrollIntoView({ behavior: "smooth", block: "center" });
      }
      // Alt+L to toggle language (中 / EN)
      if (e.altKey && (e.key === "l" || e.key === "L")) {
        e.preventDefault();
        toggleLanguage();
      }
      // Alt+T to toggle theme
      if (e.altKey && (e.key === "t" || e.key === "T")) {
        e.preventDefault();
        themeToggleBtn.click();
      }
      // Alt+V to toggle view mode
      if (e.altKey && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        setViewMode(currentViewMode === "grid" ? "list" : "grid");
      }
    });

    // Initialize
    initTheme();
    setLanguage(currentLang);
    setViewMode(currentViewMode);
    loadPlugins();
