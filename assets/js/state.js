// === Application state ===
    // --- State ---
    let currentLang = localStorage.getItem("dsh_lang") || "zh";
    let pluginsData = window.DSH_BOOTSTRAP_PLUGINS || [];
    let filteredList = [];
    let currentTier1Tab = "all";
    let currentScenario = "all";
    let currentViewMode = localStorage.getItem("dsh_view_mode") || "grid";
    let isVerifiedOnly = false;
    let showDead = false; // 「显示已失效」开关：dead 条目默认隐藏
    let currentPage = 1;
    const pageSize = 12;

    // Favorites
    const FAVORITES_KEY = "dsh_favorite_plugins";
    let favorites = new Set();
    try {
      favorites = new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"));
    } catch(e) {
      favorites = new Set();
    }

    // 收藏迁移：仓库改名后旧 id 记录在新条目的 formerIds 上，一次性重映射并回写
    try {
      const formerMap = new Map();
      (pluginsData || []).forEach(p => (p.formerIds || []).forEach(fid => formerMap.set(fid, p.id)));
      if (formerMap.size) {
        let migrated = false;
        const remapped = new Set([...favorites].map(fid => {
          const nid = formerMap.get(fid);
          if (nid && nid !== fid) { migrated = true; return nid; }
          return fid;
        }));
        if (migrated) {
          favorites = remapped;
          localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
        }
      }
    } catch(e) { /* 迁移失败不影响正常使用 */ }

    // Recent Searches
    const RECENT_SEARCHES_KEY = "dsh_recent_searches";
    let recentSearches = [];
    try {
      recentSearches = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
    } catch(e) {
      recentSearches = [];
    }

    // Ratings
    const RATING_STORAGE_KEY = "dsh_my_ratings";
    let myRatings = {};
    try {
      // 结构校验：只接受 { 合法插件id: 1-5 整数 } 的映射，防御 localStorage 被污染
      const parsed = JSON.parse(localStorage.getItem(RATING_STORAGE_KEY) || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        Object.keys(parsed).forEach(k => {
          const v = Number(parsed[k]);
          if (/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(k) && Number.isInteger(v) && v >= 1 && v <= 5) {
            myRatings[k] = v;
          }
        });
      }
    } catch(e) {
      myRatings = {};
    }

    const RATING_API = (MARKETPLACE_CONFIG.ratingApi || "").replace(/\/+$/, "");
    let remoteRatings = {};
    const readmeCache = {};



// === DOM references ===
    // --- DOM References ---
    const searchInput = document.getElementById("searchInput");
    const searchClearBtn = document.getElementById("searchClearBtn");
    const omnibarDropdown = document.getElementById("omnibarDropdown");
    const omnibarContainer = document.getElementById("omnibarContainer");
    const recentSearchesWrap = document.getElementById("recentSearchesWrap");
    const recentSearchesList = document.getElementById("recentSearchesList");
    const typeFilter = document.getElementById("typeFilter");
    const sortFilter = document.getElementById("sortFilter");
    const verifiedOnlyBtn = document.getElementById("verifiedOnlyBtn");
    const viewGridBtn = document.getElementById("viewGridBtn");
    const viewListBtn = document.getElementById("viewListBtn");
    const packagesContainer = document.getElementById("packagesContainer");
    const trendingGrid = document.getElementById("trendingGrid");
    const paginationEl = document.getElementById("pagination");
    const paginationInfo = document.getElementById("paginationInfo");
    const packageStatsCount = document.getElementById("packageStatsCount");
    const heroTotalCount = document.getElementById("heroTotalCount");
    const tier1CountAll = document.getElementById("tier1CountAll");
    const tier1CountFav = document.getElementById("tier1CountFav");
    const favoriteCountBadge = document.getElementById("favoriteCountBadge");
    const activeFiltersRow = document.getElementById("activeFiltersRow");
    const activeFilterTags = document.getElementById("activeFilterTags");
    const themeToggleBtn = document.getElementById("themeToggleBtn");
    const moonIcon = document.getElementById("moonIcon");
    const sunIcon = document.getElementById("sunIcon");
    const backToTopBtn = document.getElementById("backToTop");
    const toastContainer = document.getElementById("toastContainer");

    // Modal DOM
    const detailModal = document.getElementById("detailModal");
    const publishModal = document.getElementById("publishModal");
    const modalAvatarSlot = document.getElementById("modalAvatarSlot");
    const modalPkgName = document.getElementById("modalPkgName");
    const modalPkgBadge = document.getElementById("modalPkgBadge");
    const modalVerifiedBadge = document.getElementById("modalVerifiedBadge");
    const modalAuthorLine = document.getElementById("modalAuthorLine");
    const modalDescText = document.getElementById("modalDescText");
    const modalInstallOptions = document.getElementById("modalInstallOptions");
    const modalMetaGrid = document.getElementById("modalMetaGrid");
    const modalTagsContainer = document.getElementById("modalTagsContainer");
    const modalSpecsGrid = document.getElementById("modalSpecsGrid");
    const modalVerificationNote = document.getElementById("modalVerificationNote");
    const modalRatingBox = document.getElementById("modalRatingBox");
    const modalGithubLink = document.getElementById("modalGithubLink");
    const modalNpmLink = document.getElementById("modalNpmLink");
    const readmeContent = document.getElementById("readmeContent");

    let currentOpenPlugin = null;
