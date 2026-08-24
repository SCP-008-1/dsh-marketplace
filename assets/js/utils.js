// === Scenario classifier & formatting helpers ===
    // --- Scenario Classifier ---
    function getPluginScenarios(pkg) {
      const scenarios = new Set();
      const text = (pkg.name + " " + (pkg.description || "") + " " + (pkg.tags || []).join(" ") + " " + (pkg.type || "")).toLowerCase();
      
      if (pkg.type === 'mcp' || text.includes('mcp') || text.includes('modelcontextprotocol')) {
        scenarios.add('mcp');
      }
      if (text.includes('ai') || text.includes('agent') || text.includes('deepseek') || text.includes('claude') || text.includes('llm') || text.includes('gpt') || text.includes('prompt') || text.includes('rag') || text.includes('vision') || text.includes('intelligence')) {
        scenarios.add('ai');
      }
      if (text.includes('code') || text.includes('coding') || text.includes('developer') || text.includes('git') || text.includes('editor') || text.includes('ide') || text.includes('cursor') || text.includes('typescript') || text.includes('javascript') || text.includes('python') || text.includes('rust') || text.includes('syntax') || text.includes('debug')) {
        scenarios.add('coding');
      }
      if (text.includes('web') || text.includes('http') || text.includes('api') || text.includes('browser') || text.includes('scrape') || text.includes('crawl') || text.includes('frontend') || text.includes('html') || text.includes('css') || text.includes('rest')) {
        scenarios.add('web');
      }
      if (text.includes('auto') || text.includes('automation') || text.includes('workflow') || text.includes('swarm') || text.includes('orchestrat') || text.includes('flow') || text.includes('task') || text.includes('pipeline') || text.includes('cron')) {
        scenarios.add('automation');
      }
      if (text.includes('devops') || text.includes('docker') || text.includes('k8s') || text.includes('deploy') || text.includes('ci') || text.includes('cd') || text.includes('server') || text.includes('cloud') || text.includes('infra') || text.includes('kubernetes')) {
        scenarios.add('devops');
      }
      if (pkg.type === 'theme' || text.includes('theme') || text.includes('ui') || text.includes('style') || text.includes('color') || text.includes('design') || text.includes('icon') || text.includes('font')) {
        scenarios.add('themes');
      }
      
      if (scenarios.size === 0) {
        scenarios.add('utilities');
      }
      return [...scenarios];
    }

    // --- Helpers ---
    function formatNumber(num) {
      if (!num) return "0";
      if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
      if (num >= 1000) return (num / 1000).toFixed(1) + "k";
      return num.toLocaleString();
    }

    function formatDate(dateStr) {
      if (!dateStr) return currentLang === 'zh' ? "近期" : "recent";
      try {
        const d = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return t('dateToday');
        if (diffDays === 1) return t('dateYesterday');
        if (diffDays < 30) return t('dateDaysAgo', diffDays);
        if (diffDays < 365) return t('dateMonthsAgo', Math.floor(diffDays / 30));
        return d.toLocaleDateString(currentLang === 'zh' ? "zh-CN" : "en-US", { month: "short", day: "numeric" });
      } catch (e) {
        return dateStr;
      }
    }

    // 可信度面板用：相对时间（"3 天前"）；超过 90 天返回 null，由调用方决定降级展示
    function formatRelativeDays(dateStr) {
      if (!dateStr) return null;
      try {
        const ms = Date.now() - new Date(dateStr);
        // 无效日期字符串不抛异常而是产生 Invalid Date，差值为 NaN，需显式拦截
        if (!isFinite(ms)) return null;
        const diffDays = Math.floor(ms / (1000 * 60 * 60 * 24));
        if (diffDays < 0 || diffDays > 90) return null;
        return diffDays;
      } catch (e) {
        return null;
      }
    }

    function escapeHtml(str) {
      if (str === undefined || str === null || str === "") return "";
      return String(str).replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
      });
    }

    function jsAttr(str) {
      return escapeHtml(String(str === undefined || str === null ? "" : str)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'"));
    }

    function highlightSearch(text, query) {
      if (!text) return "";
      const escaped = escapeHtml(text);
      if (!query || !query.trim()) return escaped;
      const cleanQ = query.replace(/\b(author|type|tag|verified):\S+/gi, "").trim();
      if (!cleanQ) return escaped;
      const safeQ = cleanQ.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp("(" + safeQ + ")", "gi");
      return escaped.replace(regex, '<mark class="highlight-match">$1</mark>');
    }

    function renderAvatar(author, avatarUrl, size) {
      size = size || 32;
      const initial = (author || "D").charAt(0).toUpperCase();
      const styleSize = 'width:' + size + 'px; height:' + size + 'px; font-size:' + Math.round(size * 0.42) + 'px;';
      if (!avatarUrl) {
        return '<div class="avatar-wrapper" style="' + styleSize + '"><span>' + initial + '</span></div>';
      }
      return '<div class="avatar-wrapper" style="' + styleSize + '"><img src="' + escapeHtml(avatarUrl) + '" class="avatar-img" alt="' + escapeHtml(author) + '" onerror="this.outerHTML=\'<span>' + jsAttr(initial) + '</span>\'"></div>';
    }

    function getTypeBadge(type) {
      const isZh = (currentLang === 'zh');
      const map = {
        extension: { label: isZh ? "🧩 核心扩展" : "🧩 Extension", class: "badge-extension" },
        skill: { label: isZh ? "⚡ Agent 技能" : "⚡ Skill", class: "badge-skill" },
        mcp: { label: isZh ? "🔌 MCP 协议服务" : "🔌 MCP Server", class: "badge-mcp" },
        theme: { label: isZh ? "🎨 终端主题" : "🎨 Theme", class: "badge-theme" },
        prompt: { label: isZh ? "📝 提示词" : "📝 Prompt", class: "badge-prompt" }
      };
      return map[type] || { label: "📦 " + (type || "extension"), class: "badge-extension" };
    }
