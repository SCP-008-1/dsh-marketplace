// === Trending / filtering / package rendering ===
    // --- Trending Render ---
    function renderTrending() {
      const trending = [...pluginsData]
        .sort((a, b) => (b.stars || 0) - (a.stars || 0))
        .slice(0, 4);

      if (trending.length === 0) {
        trendingGrid.innerHTML = '<div style="grid-column:1/-1; color:var(--text-tertiary); text-align:center; padding:16px;">' + t('trendingNoData') + '</div>';
        return;
      }

      trendingGrid.innerHTML = trending.map((pkg, idx) => {
        const typeBadge = getTypeBadge(pkg.type);
        const rating = displayRating(pkg);
        const installCmd = pkgInstallCmd(pkg);
        return '<div class="trending-card" onclick="openDetailModal(\'' + jsAttr(pkg.id) + '\')">' +
          '<div>' +
            '<div class="trending-top">' +
              '<div class="trending-avatar-wrap">' +
                renderAvatar(pkg.author, pkg.authorAvatar, 26) +
                '<h3 class="trending-title" title="' + escapeHtml(pkg.name) + '">' + escapeHtml(pkg.name) + '</h3>' +
              '</div>' +
              '<span class="trending-rank">#0' + (idx + 1) + '</span>' +
            '</div>' +
            '<p class="trending-desc" title="' + escapeHtml(pkg.description || '') + '">' + escapeHtml(pkg.description || t('noDesc')) + '</p>' +
          '</div>' +
          '<div>' +
            '<div class="trending-meta-row">' +
              '<span>' + (rating === null ? '' : '★ ' + rating + ' · ') + '⭐ ' + formatNumber(pkg.stars) + '</span>' +
              '<span class="badge ' + typeBadge.class + '">' + typeBadge.label + '</span>' +
            '</div>' +
            '<div class="trending-actions">' +
              installActionHtml(pkg, installCmd, 'flex:1;') +
              '<button class="btn btn-ghost" style="padding:4px 8px; font-size:11.5px;" onclick="openDetailModal(\'' + jsAttr(pkg.id) + '\')">' + t('viewBtn') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join("");
    }

    // --- Filtering, Query Syntax Parsing & Sorting ---
    function applyFilters() {
      const rawQ = searchInput.value.trim();
      const type = typeFilter.value;
      const sort = sortFilter.value;

      searchClearBtn.style.display = rawQ ? "block" : "none";

      let parsedAuthor = "";
      let parsedType = "";
      let parsedVerified = false;
      let parsedTag = "";
      let textQ = rawQ;

      const authorMatch = textQ.match(/author:([\w-]+)/i);
      if (authorMatch) {
        parsedAuthor = authorMatch[1].toLowerCase();
        textQ = textQ.replace(authorMatch[0], "").trim();
      }

      const typeMatch = textQ.match(/type:([\w-]+)/i);
      if (typeMatch) {
        parsedType = typeMatch[1].toLowerCase();
        textQ = textQ.replace(typeMatch[0], "").trim();
      }

      const verifiedMatch = textQ.match(/verified:(true|1|yes)/i);
      if (verifiedMatch) {
        parsedVerified = true;
        textQ = textQ.replace(verifiedMatch[0], "").trim();
      }

      let parsedLightOnly = false;
      const lightMatch = textQ.match(/weight:(light|轻量)/i);
      if (lightMatch) {
        parsedLightOnly = true;
        textQ = textQ.replace(lightMatch[0], "").trim();
      }

      const tagMatch = textQ.match(/tag:([\w-]+)/i);
      if (tagMatch) {
        parsedTag = tagMatch[1].toLowerCase();
        textQ = textQ.replace(tagMatch[0], "").trim();
      }

      const cleanQ = textQ.toLowerCase();

      let activeTagsHtml = [];
      if (rawQ) {
        activeTagsHtml.push('<span class="active-tag-badge">' + t('filterTagQuery') + '"' + escapeHtml(rawQ) + '" <span class="active-tag-remove" onclick="clearSearch()">✕</span></span>');
      }
      if (currentScenario !== "all") {
        activeTagsHtml.push('<span class="active-tag-badge">' + t('filterTagScenario') + currentScenario + ' <span class="active-tag-remove" onclick="selectScenario(\'all\')">✕</span></span>');
      }
      if (type || parsedType) {
        activeTagsHtml.push('<span class="active-tag-badge">' + t('filterTagType') + (type || parsedType) + ' <span class="active-tag-remove" onclick="typeFilter.value=\'\'; applyFilters();">✕</span></span>');
      }
      if (isVerifiedOnly || parsedVerified) {
        activeTagsHtml.push('<span class="active-tag-badge">' + t('filterTagVerified') + ' <span class="active-tag-remove" onclick="toggleVerifiedOnly()">✕</span></span>');
      }
      if (parsedLightOnly) {
        activeTagsHtml.push('<span class="active-tag-badge">' + t('chipLight') + ' <span class="active-tag-remove" onclick="clearSearch()">✕</span></span>');
      }
      if (showDead) {
        activeTagsHtml.push('<span class="active-tag-badge">' + t('showDeadLabel') + ' <span class="active-tag-remove" onclick="toggleShowDead()">✕</span></span>');
      }

      if (activeTagsHtml.length > 0) {
        activeFiltersRow.classList.add("show");
        activeFilterTags.innerHTML = activeTagsHtml.join("");
      } else {
        activeFiltersRow.classList.remove("show");
        activeFilterTags.innerHTML = "";
      }

      filteredList = pluginsData.filter(pkg => {
        if (currentTier1Tab === "favorites") {
          if (!favorites.has(pkg.id)) return false;
        }

        // 可观测精选 Tab：能力检测 + 种子名单圈定，排序置顶见下方 sort 逻辑
        if (currentTier1Tab === "observability" && !isObservabilityPlugin(pkg)) {
          return false;
        }
        if (currentScenario !== "all") {
          const scenarios = getPluginScenarios(pkg);
          if (!scenarios.includes(currentScenario)) return false;
        }

        const effectiveType = type || parsedType;
        if (effectiveType && pkg.type !== effectiveType) {
          return false;
        }

        const checkVerified = isVerifiedOnly || parsedVerified;
        // 「已验证」语义：完成 AST 安全扫描且未检出高危特征（不再是仅 NPM 认证）
        if (checkVerified && !isTrustedPlugin(pkg)) {
          return false;
        }

        // 轻量过滤：仅保留静态推断为 light 的插件（无画像数据时不匹配，宁缺勿滥）
        if (parsedLightOnly && !(pkg.resource && pkg.resource.weight === "light")) {
          return false;
        }

        // 失效过滤：dead 默认隐藏，「显示已失效」开启后才可见（且排序沉底）
        const lc = pkg.lifecycle;
        if (lc && lc.status === "dead" && !showDead) {
          return false;
        }

        if (parsedAuthor && (!pkg.author || !pkg.author.toLowerCase().includes(parsedAuthor))) {
          return false;
        }

        if (parsedTag && (!pkg.tags || !pkg.tags.some(t => t.toLowerCase().includes(parsedTag)))) {
          return false;
        }

        if (cleanQ) {
          const inName = pkg.name && pkg.name.toLowerCase().includes(cleanQ);
          const inFull = pkg.fullName && pkg.fullName.toLowerCase().includes(cleanQ);
          const inDesc = pkg.description && pkg.description.toLowerCase().includes(cleanQ);
          const inAuthor = pkg.author && pkg.author.toLowerCase().includes(cleanQ);
          const inTags = pkg.tags && pkg.tags.some(t => t.toLowerCase().includes(cleanQ));
          if (!inName && !inFull && !inDesc && !inAuthor && !inTags) return false;
        }

        return true;
      });

      // 标签页排序优先于下拉排序选择器；默认（stars）仅在没有更具体规则时生效
      if (currentTier1Tab === "popular") {
        filteredList.sort((a, b) => (b.stars || 0) - (a.stars || 0));
      } else if (currentTier1Tab === "recent") {
        filteredList.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      } else if (currentTier1Tab === "new") {
        filteredList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      } else if (sort === "recent") {
        filteredList.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      } else if (sort === "forks") {
        filteredList.sort((a, b) => (b.forks || 0) - (a.forks || 0));
      } else if (sort === "name") {
        filteredList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      } else {
        // 默认 stars 排序：可观测精选插件置顶（token 消耗痛点的运营位），其余按 stars
        filteredList.sort((a, b) => {
          const oa = isObservabilityPlugin(a) ? 1 : 0, ob = isObservabilityPlugin(b) ? 1 : 0;
          if (oa !== ob) return ob - oa;
          return (b.stars || 0) - (a.stars || 0);
        });
      }

      // 失效条目沉底（稳定分区）：active(0) < archived(1) < dead(2)，不改变同档内相对顺序
      const lifeRank = p => {
        const s = p.lifecycle && p.lifecycle.status;
        return s === "dead" ? 2 : s === "archived" ? 1 : 0;
      };
      let rankChanged = false;
      for (let i = 1; i < filteredList.length; i++) {
        if (lifeRank(filteredList[i]) < lifeRank(filteredList[i - 1])) { rankChanged = true; break; }
      }
      if (rankChanged) {
        filteredList.sort((a, b) => lifeRank(a) - lifeRank(b));
      }

      currentPage = 1;
      renderPackages();
    }

    function clearSearch() {
      searchInput.value = "";
      applyFilters();
      searchInput.focus();
    }

    // --- Render Packages ---
    function renderPackages() {
      const q = searchInput.value.trim();
      const total = filteredList.length;
      const totalPages = Math.ceil(total / pageSize) || 1;

      // 防御性鍳制：筛选结果减少后，当前页可能超出范围
      if (currentPage > totalPages) currentPage = totalPages;

      const startIdx = (currentPage - 1) * pageSize;
      const endIdx = Math.min(startIdx + pageSize, total);
      const currentItems = filteredList.slice(startIdx, endIdx);

      if (total === 0) {
        packageStatsCount.textContent = t('statsZero');
        paginationInfo.textContent = t('paginationZero');
      } else {
        packageStatsCount.textContent = t('statsShowing', startIdx + 1, endIdx, total);
        paginationInfo.textContent = t('paginationShowing', startIdx + 1, endIdx, total);
      }

      if (total === 0) {
        packagesContainer.innerHTML = '<div class="empty-state">' +
          '<div class="empty-icon">🔍</div>' +
          '<h3 style="font-size:1.15rem; font-weight:700; color:var(--text-primary);">' + t('emptyTitle') + '</h3>' +
          '<p style="margin-top: 6px; font-size:13px;">' + t('emptyDesc') + '</p>' +
          '<button class="btn btn-ghost" style="margin-top:16px;" onclick="resetAllFilters()">' + t('emptyResetBtn') + '</button>' +
        '</div>';
        paginationEl.innerHTML = "";
        return;
      }

      if (currentViewMode === "grid") {
        renderGridView(currentItems, q);
      } else {
        renderListView(currentItems, q);
      }

      renderPagination(totalPages);
    }

    // --- Shared card fragments (grid & list views) ---
    // 可信判定：verification.status === 'verified' 且 security.level !== 'danger'
    function isTrustedPlugin(pkg) {
      const v = pkg.verification;
      return !!(v && v.status === "verified" && v.security && v.security.level !== "danger");
    }

    // 无社区评分时返回 null（不展示），禁止用 GitHub stars 伪造评分数字误导用户
    function displayRating(pkg) {
      const agg = remoteRatings[pkg.id];
      return (agg && agg.count) ? Number(agg.average || 0).toFixed(1) : null;
    }

    // --- 资源画像（token 消耗视角，静态推断） ---
    // 可观测性精选：能力检测为主（token/用量/成本语义），种子名单兑底
    const OBSERVABILITY_SEEDS = ["dsh-cost-meter", "dsh-context", "dsh-usage-stats"];
    const OBSERVABILITY_RE = /(cost|meter|token|usage|billing|budget|observab)/i;
    function isObservabilityPlugin(pkg) {
      if (OBSERVABILITY_SEEDS.some(s => (pkg.fullName || "").toLowerCase().includes(s))) return true;
      return OBSERVABILITY_RE.test(pkg.name || "") || OBSERVABILITY_RE.test(pkg.fullName || "") ||
             OBSERVABILITY_RE.test(pkg.description || "");
    }

    // 卡片资源角标：只标「重」与「额外模型调用」两个成本信号；轻/中不打标保持列表干净
    function resourceBadgeHtml(pkg) {
      const r = pkg.resource;
      if (!r) return "";
      let html = "";
      if (r.weight === "heavy") {
        const ev = r.hotPathHooks && r.hotPathHooks.length ? r.hotPathHooks.join(", ") : "";
        html += '<span class="badge badge-res-heavy" title="' + jsAttr(t('resBadgeHeavy') + (ev ? ': ' + ev : '')) + '">' + t('resBadgeHeavy') + '</span>';
      }
      if (r.modelCalls) {
        html += '<span class="badge badge-res-model" title="' + jsAttr(t('resModelCalls')) + '">' + t('resBadgeModel') + '</span>';
      }
      return html;
    }

    // 失效状态角标：归档/死链/源码不可达（active 无字段不展示）
    function lifecycleBadgeHtml(pkg) {
      const lc = pkg.lifecycle;
      if (!lc) return "";
      if (lc.status === "dead") {
        return '<span class="badge badge-life-dead" title="' + jsAttr(t('lifeDeadTitle')) + '">' + t('lifeDead') + '</span>';
      }
      if (lc.status === "archived") {
        return '<span class="badge badge-life-archived" title="' + jsAttr(t('lifeArchivedTitle')) + '">' + t('lifeArchived') + '</span>';
      }
      if (lc.repoMissing) {
        return '<span class="badge badge-trust-warn" title="' + jsAttr(t('lifeRepoMissingTitle')) + '">' + t('lifeRepoMissing') + '</span>';
      }
      return "";
    }

    // 镜像角标（issue #18）：确认为镜像的条目标注「镜像 → 指向上游」而非隐藏（保留发现价值）；
    // 上游已删除时给出接管提示路径：镜像成为唯一来源，可联系管理员提升为正式条目
    function mirrorBadgeHtml(pkg) {
      if (!pkg.isMirror) return "";
      const up = pkg.upstream;
      if (!up || up.alive === false || !up.fullName) {
        return '<span class="badge badge-mirror-dead" title="' + jsAttr(t('mirrorDeadTitle')) + '">' + t('mirrorDead') + '</span>';
      }
      const url = up.url || ('https://github.com/' + up.fullName);
      return '<a class="badge badge-mirror" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer"' +
        ' title="' + jsAttr(t('mirrorTitle', up.fullName)) + '" onclick="event.stopPropagation()">' +
        t('mirrorBadge') + ' →</a>';
    }

    // 卡片可信度角标：仅有验证数据时显示，避免上线初期满屏"未验证"噪音
    function trustBadgeHtml(pkg) {
      const v = pkg.verification;
      // 数据不完整（缺 security）视为无有效验证结果，不展示角标
      if (!v || v.status !== "verified" || !v.security) return "";
      const level = v.security.level;
      if (!level || level === "pass") {
        return '<span class="badge badge-trust-pass" title="' + jsAttr(t('trustConfidence') + ': ' + (v.confidence ?? '-')) + '">' + t('trustCardPass') + '</span>';
      }
      if (level === "warn") {
        return '<span class="badge badge-trust-warn" title="' + jsAttr(t('trustConfidence') + ': ' + (v.confidence ?? '-')) + '">' + t('trustCardWarn') + '</span>';
      }
      return '<span class="badge badge-trust-danger" title="' + jsAttr(t('trustSecDanger')) + '">' + t('trustCardDanger') + '</span>';
    }

    function bookmarkButtonHtml(pkg, isBookmarked, title) {
      return '<button class="bookmark-btn ' + (isBookmarked ? 'bookmarked' : '') + '"' +
        (title ? ' title="' + title + '"' : '') +
        ' onclick="toggleFavorite(\'' + jsAttr(pkg.id) + '\', event)">' +
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="' + (isBookmarked ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>' +
          '</svg>' +
        '</button>';
    }

    function packageNameHtml(pkg, query) {
      return '<h3 class="package-name" onclick="openDetailModal(\'' + jsAttr(pkg.id) + '\')" title="' + escapeHtml(pkg.name) + '">' +
          highlightSearch(pkg.name, query) +
        '</h3>';
    }

    function renderGridView(items, query) {
      packagesContainer.innerHTML = items.map(pkg => {
        const typeBadge = getTypeBadge(pkg.type);
        const visibleTags = (pkg.tags || []).slice(0, 3);
        const extraTags = (pkg.tags || []).length - visibleTags.length;
        const isBookmarked = favorites.has(pkg.id);
        const rating = displayRating(pkg);
        const installCmd = pkgInstallCmd(pkg);

        return '<article class="package-card" data-id="' + pkg.id + '">' +
          '<div class="package-card-body">' +
            '<div class="package-card-header">' +
              '<div class="package-header-left">' +
                renderAvatar(pkg.author, pkg.authorAvatar, 30) +
                packageNameHtml(pkg, query) +
              '</div>' +
              '<div class="package-header-badges">' +
                (pkg.hasNpm ? '<span class="badge badge-verified" title="' + t('badgeVerifiedTitle') + '">' + t('badgeVerified') + '</span>' : '') +
                trustBadgeHtml(pkg) +
                resourceBadgeHtml(pkg) +
                lifecycleBadgeHtml(pkg) +
                mirrorBadgeHtml(pkg) +
                bookmarkButtonHtml(pkg, isBookmarked, isBookmarked ? t('removeFavoriteTitle') : t('addFavoriteTitle')) +
              '</div>' +
            '</div>' +

            '<div class="package-author-line">' +
              '<span>@' + escapeHtml(pkg.author) + '</span>' +
              (pkg.version ? '<span>· v' + escapeHtml(pkg.version) + '</span>' : '') +
              '<span class="badge ' + typeBadge.class + '" style="margin-left:auto;">' + typeBadge.label + '</span>' +
            '</div>' +

            '<p class="package-desc" title="' + escapeHtml(pkg.description || t('noDesc')) + '">' +
              highlightSearch(pkg.description || t('noDesc'), query) +
            '</p>' +

            (visibleTags.length > 0 ? (
              '<div class="package-tags-row">' +
                visibleTags.map(tag => '<span class="tag-chip" onclick="applyQuickSearch(\'' + jsAttr(tag) + '\')" title="#' + escapeHtml(tag) + '">#' + escapeHtml(tag) + '</span>').join("") +
                (extraTags > 0 ? '<span class="tag-chip tag-chip-count" style="color:var(--text-muted);">+' + extraTags + '</span>' : '') +
              '</div>'
            ) : '<div class="package-tags-row"></div>') +
          '</div>' +

          '<div class="package-card-footer">' +
            '<div class="package-metrics-row">' +
              (rating === null ? '' : '<span class="metric-item" title="' + t('cardRatingTitle') + '">★ ' + rating + '</span>') +
              '<span class="metric-item" title="' + t('cardStarsTitle') + '">⭐ ' + formatNumber(pkg.stars) + '</span>' +
              '<span class="metric-item" style="margin-left:auto;" title="' + t('cardUpdatedTitle') + (pkg.updatedAt || '') + '">⏱ ' + formatDate(pkg.updatedAt) + '</span>' +
            '</div>' +

            '<div class="package-actions-footer">' +
              '<button class="btn btn-ghost" style="flex:1;" onclick="openDetailModal(\'' + jsAttr(pkg.id) + '\')">' + t('viewDetailsBtn') + '</button>' +
              installActionHtml(pkg, installCmd, 'flex:1;') +
            '</div>' +
          '</div>' +
        '</article>';
      }).join("");
    }

    function renderListView(items, query) {
      packagesContainer.innerHTML = items.map(pkg => {
        const typeBadge = getTypeBadge(pkg.type);
        const isBookmarked = favorites.has(pkg.id);
        const rating = displayRating(pkg);
        const installCmd = pkgInstallCmd(pkg);

        return '<div class="package-row" data-id="' + pkg.id + '">' +
          '<div class="package-row-title">' +
            bookmarkButtonHtml(pkg, isBookmarked, null) +
            renderAvatar(pkg.author, pkg.authorAvatar, 26) +
            '<div style="min-width:0;">' +
              packageNameHtml(pkg, query) +
              '<div style="display:flex; gap:4px; margin-top:2px;">' +
                '<span class="badge ' + typeBadge.class + '">' + typeBadge.label + '</span>' +
                (pkg.hasNpm ? '<span class="badge badge-verified">✓</span>' : '') +
                trustBadgeHtml(pkg) +
                resourceBadgeHtml(pkg) +
                lifecycleBadgeHtml(pkg) +
                mirrorBadgeHtml(pkg) +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="package-row-desc" title="' + escapeHtml(pkg.description || '') + '">' +
            highlightSearch(pkg.description || t('noDesc'), query) +
          '</div>' +

          '<div class="package-row-meta">' +
            (rating === null ? '' : '<span>★ ' + rating + '</span>') +
            '<span>⭐ ' + formatNumber(pkg.stars) + '</span>' +
            '<span>' + formatDate(pkg.updatedAt) + '</span>' +
          '</div>' +

          '<div class="package-row-actions">' +
            installActionHtml(pkg, installCmd) +
            '<button class="btn btn-ghost" style="padding:5px 10px; font-size:12px;" onclick="openDetailModal(\'' + jsAttr(pkg.id) + '\')">' + t('viewBtn') + '</button>' +
          '</div>' +
        '</div>';
      }).join("");
    }

    // 生成带省略号的页码序列：1 … (c-1) c (c+1) … N
    function getPageSequence(current, total) {
      const delta = 1;
      const wanted = new Set([1, total]);
      for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
        wanted.add(i);
      }
      const pages = [];
      let prev = 0;
      [...wanted].sort((a, b) => a - b).forEach(p => {
        if (p - prev > 1) pages.push("...");
        pages.push(p);
        prev = p;
      });
      return pages;
    }

    function renderPagination(totalPages) {
      if (totalPages <= 1) {
        paginationEl.innerHTML = "";
        return;
      }

      let html = '<button class="page-btn page-nav" ' + (currentPage === 1 ? "disabled" : "") + ' aria-label="Previous page" onclick="changePage(' + (currentPage - 1) + ')">‹</button>';

      getPageSequence(currentPage, totalPages).forEach(p => {
        if (p === "...") {
          html += '<span class="page-ellipsis">…</span>';
        } else {
          html += '<button class="page-btn ' + (p === currentPage ? "active" : "") + '" ' + (p === currentPage ? 'aria-current="page" ' : '') + 'onclick="changePage(' + p + ')">' + p + '</button>';
        }
      });

      html += '<button class="page-btn page-nav" ' + (currentPage === totalPages ? "disabled" : "") + ' aria-label="Next page" onclick="changePage(' + (currentPage + 1) + ')">›</button>';

      paginationEl.innerHTML = html;
    }

    function changePage(page) {
      const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
      if (page < 1 || page > totalPages) return;
      currentPage = page;
      renderPackages();
      document.getElementById("packagesSection").scrollIntoView({ behavior: "smooth", block: "start" });
    }
