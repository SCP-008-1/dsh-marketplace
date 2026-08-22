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
        return '<div class="trending-card" onclick="openDetailModal(\'' + pkg.id + '\')">' +
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
              '<button class="btn btn-install" style="flex:1;" onclick="copyPkgInstall(\'' + jsAttr(installCmd) + '\', this, event)">' + t('installBtn') + '</button>' +
              '<button class="btn btn-ghost" style="padding:4px 8px; font-size:11.5px;" onclick="openDetailModal(\'' + pkg.id + '\')">' + t('viewBtn') + '</button>' +
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

        if (currentScenario !== "all") {
          const scenarios = getPluginScenarios(pkg);
          if (!scenarios.includes(currentScenario)) return false;
        }

        const effectiveType = type || parsedType;
        if (effectiveType && pkg.type !== effectiveType) {
          return false;
        }

        const checkVerified = isVerifiedOnly || parsedVerified;
        if (checkVerified && !pkg.hasNpm) {
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

      if (currentTier1Tab === "popular" || sort === "stars") {
        filteredList.sort((a, b) => (b.stars || 0) - (a.stars || 0));
      } else if (currentTier1Tab === "recent" || sort === "recent") {
        filteredList.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      } else if (currentTier1Tab === "new") {
        filteredList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      } else if (sort === "forks") {
        filteredList.sort((a, b) => (b.forks || 0) - (a.forks || 0));
      } else if (sort === "name") {
        filteredList.sort((a, b) => a.name.localeCompare(b.name));
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
    // 无社区评分时返回 null（不展示），禁止用 GitHub stars 伪造评分数字误导用户
    function displayRating(pkg) {
      const agg = remoteRatings[pkg.id];
      return (agg && agg.count) ? Number(agg.average || 0).toFixed(1) : null;
    }

    function bookmarkButtonHtml(pkg, isBookmarked, title) {
      return '<button class="bookmark-btn ' + (isBookmarked ? 'bookmarked' : '') + '"' +
        (title ? ' title="' + title + '"' : '') +
        ' onclick="toggleFavorite(\'' + pkg.id + '\', event)">' +
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="' + (isBookmarked ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>' +
          '</svg>' +
        '</button>';
    }

    function packageNameHtml(pkg, query) {
      return '<h3 class="package-name" onclick="openDetailModal(\'' + pkg.id + '\')" title="' + escapeHtml(pkg.name) + '">' +
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
          '<div>' +
            '<div class="package-card-header">' +
              '<div class="package-header-left">' +
                renderAvatar(pkg.author, pkg.authorAvatar, 30) +
                packageNameHtml(pkg, query) +
              '</div>' +
              '<div style="display:flex; align-items:center; gap:6px;">' +
                (pkg.hasNpm ? '<span class="badge badge-verified" title="' + t('badgeVerifiedTitle') + '">' + t('badgeVerified') + '</span>' : '') +
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
                visibleTags.map(t => '<span class="tag-chip" onclick="applyQuickSearch(\'' + escapeHtml(t) + '\')">#' + escapeHtml(t) + '</span>').join("") +
                (extraTags > 0 ? '<span class="tag-chip" style="color:var(--text-muted);">+' + extraTags + '</span>' : '') +
              '</div>'
            ) : '') +
          '</div>' +

          '<div>' +
            '<div class="package-metrics-row">' +
              (rating === null ? '' : '<span class="metric-item" title="' + t('cardRatingTitle') + '">★ ' + rating + '</span>') +
              '<span class="metric-item" title="' + t('cardStarsTitle') + '">⭐ ' + formatNumber(pkg.stars) + '</span>' +
              '<span class="metric-item" style="margin-left:auto;" title="' + t('cardUpdatedTitle') + (pkg.updatedAt || '') + '">⏱ ' + formatDate(pkg.updatedAt) + '</span>' +
            '</div>' +

            '<div class="package-actions-footer">' +
              '<button class="btn btn-ghost" style="flex:1;" onclick="openDetailModal(\'' + pkg.id + '\')">' + t('viewDetailsBtn') + '</button>' +
              '<button class="btn btn-install" style="flex:1;" onclick="copyPkgInstall(\'' + jsAttr(installCmd) + '\', this, event)">' + t('installBtn') + '</button>' +
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
            '<button class="btn btn-install" onclick="copyPkgInstall(\'' + jsAttr(installCmd) + '\', this, event)">' + t('installBtn') + '</button>' +
            '<button class="btn btn-ghost" style="padding:5px 10px; font-size:12px;" onclick="openDetailModal(\'' + pkg.id + '\')">' + t('viewBtn') + '</button>' +
          '</div>' +
        '</div>';
      }).join("");
    }

    function renderPagination(totalPages) {
      if (totalPages <= 1) {
        paginationEl.innerHTML = "";
        return;
      }

      let html = '<button class="page-btn" ' + (currentPage === 1 ? "disabled" : "") + ' onclick="changePage(' + (currentPage - 1) + ')">‹</button>';

      for (let i = 1; i <= totalPages; i++) {
        html += '<button class="page-btn ' + (i === currentPage ? "active" : "") + '" onclick="changePage(' + i + ')">' + i + '</button>';
      }

      html += '<button class="page-btn ' + (currentPage === totalPages ? "disabled" : "") + ' onclick="changePage(' + (currentPage + 1) + ')">›</button>';

      paginationEl.innerHTML = html;
    }

    function changePage(page) {
      const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
      if (page < 1 || page > totalPages) return;
      currentPage = page;
      renderPackages();
      document.getElementById("packagesSection").scrollIntoView({ behavior: "smooth", block: "start" });
    }
