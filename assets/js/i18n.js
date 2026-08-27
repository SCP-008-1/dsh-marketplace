// === I18N dictionary ===
    // --- I18N Dictionary (Bilingual Support: zh / en) ---
    const I18N = {
      zh: {
        siteTitle: "dsh 插件商城 · DeepSeek Harness 开发者插件生态",
        brandTitle: "dsh 插件商城",
        navPlugins: "全部插件",
        navTrending: "热门推荐",
        navMcp: "MCP 专区",
        navDocs: "文档 Wiki ↗",
        navGithub: "开源仓库 ↗",
        themeToggleTitleLight: "切换为浅色模式 (Alt+T)",
        themeToggleTitleDark: "切换为深色模式 (Alt+T)",
        favoriteTitle: "我的收藏",
        submitPluginBtn: "提交插件",
        langToggleLabel: "中 / EN",
        langToggleTitle: "切换语言 / Switch Language (Alt+L)",

        heroBadge: "⚡ DeepSeek Harness 插件生态",
        heroTitle: "dsh 插件商城",
        heroSubtitle: "发现、探索与安装扩展、MCP 协议服务与智能体技能，赋能你的 AI 终端工作流。",
        searchPlaceholder: "搜索插件、MCP 服务、Skill 技能、主题或作者… (快捷键 /)",
        searchClear: "清空",
        recentSearchesTitle: "最近搜索",
        recentSearchesClear: "清空",
        quickSuggestionsTitle: "快速筛选",
        chipMcp: "🔌 MCP 协议服务",
        chipSkill: "⚡ 编程与代码技能",
        chipAgent: "🤖 AI 智能体",
        chipTheme: "🎨 终端与 UI 主题",
        chipVerified: "✓ 仅看已验证",
        // 失效检测
        showDeadLabel: "☠️ 显示已失效",
        lifeArchived: "已归档",
        lifeDead: "已失效",
        lifeRepoMissing: "源码不可达",
        lifeArchivedTitle: "仓库已归档，不再维护，但仍可安装",
        lifeDeadTitle: "仓库与 npm 包均已失效，无法安装",
        lifeRepoMissingTitle: "GitHub 仓库不可访问，但 npm 包仍可正常安装",
        // 镜像检测（issue #18）
        mirrorBadge: "镜像",
        mirrorTitle: (up) => `此仓库为 ${up} 的镜像副本，点击访问上游原始仓库`,
        mirrorDead: "镜像·上游失效",
        mirrorDeadTitle: "此镜像的上游原始仓库已删除，当前为唯一可用来源；可联系商城管理员将本仓库提升为正式条目（接管）",
        syntaxFilterTitle: "高级搜索语法",
        heroTrendingLink: "🔥 热门趋势",
        heroTopRatedLink: "⭐ 高分好评",
        heroVerifiedSuffix: " 个收录插件",
        heroRecentlyUpdated: "⏱️ 最近更新",
        ghLoginBtn: "使用 GitHub 登录",
        ghLogoutBtn: "登出",
        ghLoginToast: "GitHub 登录成功，欢迎",
        ghLogoutToast: "已退出 GitHub 登录",
        ghAuthErrorToast: "GitHub 登录失败，请重试",
        ghIdentityLoggedIn: "已以 GitHub 用户 {user} 身份登录。下方评论区由 GitHub Discussions 驱动：首次发言需在评论框内完成一次 giscus 授权（同一账号，一键确认即可）。",
        ghIdentityLoggedOut: "评论区由 GitHub Discussions 驱动，登录后即可参与讨论：",
        ghIdentityLoginCta: "使用 GitHub 登录",

        trendingSectionTitle: "热门推荐",
        trendingSubtitle: "社区 Star 最多与增长迅速的精选插件",
        trendingNoData: "暂无热门数据",
        installBtn: "⚡ 安装",
        viewBtn: "详情",
        githubBtn: "GitHub 仓库 ↗",
        noNpmCmdNote: "该插件未发布到 npm，且仓库根目录无 package.json（无法通过 npm 安装）。请前往 GitHub 查看安装说明。",

        exploreSectionTitle: "探索全部插件",
        tabAll: "全部插件",
        tabPopular: "🔥 最受关注",
        tabNew: "✨ 最新发布",
        tabRecent: "⏱️ 最近更新",
        tabFavorites: "⭐ 我的收藏",

        scenarioAll: "全部场景",
        scenarioAi: "🤖 AI & 智能体",
        scenarioCoding: "💻 编程开发",
        scenarioMcp: "🔌 MCP 服务",
        scenarioWeb: "🌐 网络与 API",
        scenarioAutomation: "⚡ 流程自动化",
        scenarioDevops: "🛠️ 运维与 DevOps",
        scenarioThemes: "🎨 主题与外观",
        scenarioUtilities: "📦 通用工具",

        typeAll: "全部类型 (All Types)",
        typeExtension: "🧩 核心扩展 (Extension)",
        typeSkill: "⚡ Agent 技能 (Skill)",
        typeMcp: "🔌 MCP 协议服务 (MCP)",
        typeTheme: "🎨 终端主题 (Theme)",
        typePrompt: "📝 提示词 (Prompt)",

        verifiedOnly: "✓ 仅看已验证",
        sortStars: "⭐ 最多 Star",
        sortRecent: "⏱️ 最近更新",
        sortForks: "🍴 最多 Fork",
        sortName: "🔤 名称排序 (A-Z)",

        viewGridTitle: "网格视图 (Alt+V)",
        viewListTitle: "列表视图 (Alt+V)",
        resetBtn: "重置",

        activeFiltersPrefix: "当前筛选：",
        clearAllBtn: "清空全部",
        filterTagQuery: "搜索: ",
        filterTagScenario: "场景: ",
        filterTagType: "类型: ",
        filterTagVerified: "仅已验证",

        emptyTitle: "未找到匹配的插件",
        emptyDesc: "请尝试更换搜索关键词、清除分类筛选或重置过滤器。",
        emptyResetBtn: "重置所有筛选",

        statsZero: "0 个插件",
        statsShowing: (start, end, total) => `第 ${start}-${end} / 共 ${total} 个插件`,
        paginationZero: "共 0 条结果",
        paginationShowing: (start, end, total) => `显示第 ${start} 至 ${end} 项，共 ${total} 个插件`,

        badgeVerified: "✓ NPM 认证",
        badgeVerifiedTitle: "NPM 官方注册表认证",
        unverifiedGithubTitle: "GitHub 开源直装源",
        addFavoriteTitle: "加入收藏",
        removeFavoriteTitle: "取消收藏",
        noDesc: "暂无描述",
        viewDetailsBtn: "📖 查看详情",
        cardRatingTitle: "社区评分",
        cardStarsTitle: "GitHub Stars",
        cardUpdatedTitle: "更新时间: ",

        dateToday: "今天",
        dateYesterday: "昨天",
        dateDaysAgo: (d) => `${d} 天前`,
        dateMonthsAgo: (m) => `${m} 个月前`,

        trustBadge: "安全与可信机制",
        trustTitle: "可信赖的开发者插件生态",
        trustSubtitle: "每一个插件均来自公开开源代码仓库，具备透明的安装指令与双向归属校验。",
        trust1Title: "源码完全开源",
        trust1Desc: "所有收录插件均来自公开 GitHub 仓库，代码完全开源，安全透明。",
        trust2Title: "定时自动化同步",
        trust2Desc: "GitHub Actions 定时爬虫每 1 小时自动同步最新版本、标签、Stars 与 README 文档。",
        trust3Title: "NPM 严格双向校验",
        trust3Desc: "严格验证 NPM 包与 GitHub 仓库真实归属，有效杜绝包名抢注与仿冒风险。",
        trust4Title: "一行命令极简安装",
        trust4Desc: "每个插件均附带经过验证的一行 <code>npm i</code> 命令，开箱即用。",

        footerCopyright: "© 2026 dsh 插件生态 · 基于 Apache-2.0 协议开源",
        footerShortcuts: "快捷键：<code>/</code> 搜索 · <code>Alt+L</code> 切换语言 · <code>Alt+T</code> 切换主题 · <code>Alt+V</code> 切换视图 · <code>Esc</code> 关闭",
        footerGithub: "GitHub 开源仓库 ↗",
        footerPublishGuide: "提交与收录指南",
        footerWiki: "Wiki 文档库 ↗",
        footerMcp: "MCP 协议标准 ↗",

        modalInstallBtn: "安装插件",
        modalCloseTitle: "关闭 (Esc)",
        modalTabOverview: "📋 概览与安装",
        modalTabReadme: "📖 详细文档 (README)",
        modalTabCompatibility: "📦 规格与兼容性",
        modalTabReviews: "⭐ 评分与讨论",

        modalDescTitle: "插件简介",
        modalQuickInstallTitle: "⚡ 快速安装指令",
        modalCompatTitle: "💻 兼容性矩阵",
        modalCompatDshVer: "DSH 最低版本",
        modalCompatPlatform: "系统平台支持",
        modalCompatRuntime: "运行环境",
        modalCompatRuntimeVal: "Node >= 18 / 原生",
        modalMetaTitle: "📊 仓库元数据",
        modalMetaRepo: "开源仓库",
        modalMetaAuthor: "作者",
        modalMetaLicense: "开源协议",
        modalMetaUpdated: "最近更新",
        modalTagsTitle: "🏷️ 分类标签",
        modalSpecsTitle: "包规格参数",
        modalSpecsName: "插件名称",
        modalSpecsVersion: "当前版本",
        modalSpecsBranch: "默认分支",
        modalSpecsIssues: "待解决 Issue",
        modalVerifyTitle: "安全与真实性校验说明",
        modalVerifyNpmNote: "✓ <b>NPM 官方注册表认证：</b> 该插件已通过 NPM Registry 双向归属验证，包名与代码仓库元数据完全匹配。",
        modalVerifyGitNote: "ℹ <b>GitHub 开源直装源：</b> 该插件直接通过 GitHub 仓库引用安装，已验证为公开可访问的开源项目。",
        // —— 可信度面板（AST 安全扫描 + 健康检查）——
        trustPanelTitle: "🛡️ 可信度评估",
        trustConfidence: "可安装置信度",
        trustLastVerified: "最后验证",
        trustNever: "从未验证",
        trustFresh: (days) => `${days} 天前 ✅`,
        trustStale: (days) => `${days} 天前 ⚠️`,
        trustUnverifiedDesc: "该插件尚未完成安全扫描或扫描失败，不代表存在风险；建议安装前自行审查源码。",
        trustSecPass: "安全扫描通过",
        trustSecWarn: "发现可疑特征",
        trustSecDanger: "检出高危特征",
        trustHealthTitle: "健康检查",
        trustHcManifest: "manifest 合法",
        trustHcBundle: "dsh.bundle 已声明",
        trustHcApply: "apply() 入口可用",
        trustBuild: "CI 构建状态",
        trustBuildPassing: "✅ 通过",
        trustBuildFailing: "❌ 失败",
        trustBuildUnknown: "⚠️ 无记录",
        trustFindingsTitle: "扫描明细",
        trustNoFindings: "未检出可疑模式",
        trustMoreFindings: (n) => `另有 ${n} 项未展示`,
        trustSevHigh: "高危",
        trustSevMedium: "中危",
        trustSevLow: "提示",
        // 卡片角标
        trustCardPass: "已验证",
        trustCardWarn: "可疑",
        trustCardDanger: "危险",
        // 资源画像（token 消耗视角，静态推断）
        resPanelTitle: "⚡ 资源画像",
        resDisclaimer: "静态推断估算：基于入口代码扫描，非精确承诺；实际消耗取决于使用方式。",
        resWeightLabel: "资源重量",
        resWeightHeavy: "重 · 挂载于每请求热路径",
        resWeightMedium: "中 · 生命周期/模型调用",
        resWeightLight: "轻 · 一次性命令/仪表盘",
        resHotHooks: "每请求事件钩子",
        resLifeHooks: "生命周期事件钩子",
        resModelCalls: "需额外模型调用",
        resNoModelCalls: "无额外模型调用",
        resDashboards: "仪表盘页面",
        resBadgeHeavy: "⚡ 请求级钩子",
        resBadgeModel: "🤖 模型调用",
        chipLight: "✦ 仅看轻量插件",
        tabObservability: "📊 可观测精选",
        modalRatingTitle: "⭐ 社区评分",
        modalRatingEmpty: "还没有人打分，快来成为第一个打分者吧！",
        modalRatingYour: (r) => `我的评分：${r ? r + ' ★' : '点击五角星打分'}`,
        modalRatingCountSuffix: "人打分",
        modalDiscussionsTitle: "💬 GitHub Discussions 社区讨论",
        modalDiscussionsFallback: (url) => `前往 <a href="${url}" target="_blank" rel="noopener" style="color:var(--accent);">GitHub Issues ↗</a> 参与反馈讨论`, // url 由调用方 escapeHtml 后传入
        modalGithubBtn: "GitHub 仓库 ↗",
        modalNpmBtn: "📦 npm 注册表 ↗",
        modalDoneBtn: "关闭",

        readmeLoading: "正在加载 README.md 文档...",
        readmeFetching: "⏳ 正在从 GitHub 加载 README.md...",
        readmeError: "⚠️ 暂未能直接加载该插件的 README 预览。",
        readmeViewGithub: "前往 GitHub 直接查看文档 ↗",
        readmeToggleZh: "🇨🇳 切换到中文文档",
        readmeToggleEn: "🇬🇧 Switch to English",
        readmeZhUnavailable: "该插件暂未提供中文文档，已展示英文原文。",

        copyBtn: "复制",
        copyDone: "✓ 已复制",

        publishTitle: "提交与发布 dsh 插件",
        publishSec1Title: "📦 基于 GitHub Topic 的全自动收录机制",
        publishSec1Desc: "dsh 插件生态基于 GitHub Topic 自动发现，无需注册独立账号或提交表单。仅需 3 步即可完成收录发布：",
        publishStep1Title: "创建公开的 GitHub 代码仓库",
        publishStep1Desc: "包含清晰的 <code>README.md</code> 使用说明、开源许可证（License）和插件入口代码。",
        publishStep2Title: "添加核心 Topic 标签",
        publishStep2Desc: "在仓库首页右侧的「About → Topics」设置中添加必备标签：",
        publishStep2Tag: "🏷️ dsh-plugin（点击复制）",
        publishStep3Title: "添加分类与场景标签（可选）",
        publishStep3Desc: "为插件添加类型标签，方便开发者在商城中按分类筛选发现：",
        publishSec2Title: "⏱️ 每小时全自动定时同步",
        publishSec2Desc: "GitHub Actions 爬虫每 1 小时自动运行一次，严格校验 NPM 包与 GitHub 仓库双向归属，并同步更新 Web 插件商城与 GitHub Wiki 文档。",
        publishGotIt: "我知道了",

        toastCopiedCmd: (cmd) => `已复制安装命令: ${cmd}`,
        toastCopiedGeneric: (text) => `已复制: ${text}`,
        toastCopiedTag: (tag) => `已复制标签: ${tag}`,
        toastFavRemoved: "已从收藏夹移除",
        toastFavAdded: "已加入我的收藏",
        toastRatingThanks: (s) => `感谢您的评分: ${s} ★`,
        toastRatingFail: "评分提交失败，请稍后再试",
        toastCopyFail: "复制失败：当前环境不支持剪贴板，请手动复制",
        toastSwitchedZh: "已切换为中文界面",
        toastSwitchedEn: "Switched to English interface",
        backToTopTitle: "返回顶部"
      },
      en: {
        siteTitle: "dsh Marketplace · DeepSeek Harness Developer Ecosystem",
        brandTitle: "dsh marketplace",
        navPlugins: "Plugins",
        navTrending: "Trending",
        navMcp: "MCP",
        navDocs: "Docs ↗",
        navGithub: "GitHub ↗",
        themeToggleTitleLight: "Switch to Light Mode (Alt+T)",
        themeToggleTitleDark: "Switch to Dark Mode (Alt+T)",
        favoriteTitle: "Favorites",
        submitPluginBtn: "Submit Plugin",
        langToggleLabel: "EN / 中",
        langToggleTitle: "Switch Language / 切换语言 (Alt+L)",

        heroBadge: "⚡ DeepSeek Harness Ecosystem",
        heroTitle: "dsh Plugin Marketplace",
        heroSubtitle: "Find tools, MCP servers, and skills that extend your AI workflow.",
        searchPlaceholder: "Search plugins, MCP servers, skills, themes or authors… (/)",
        searchClear: "Clear",
        recentSearchesTitle: "Recent Searches",
        recentSearchesClear: "Clear",
        quickSuggestionsTitle: "Quick Filters",
        chipMcp: "🔌 MCP Servers",
        chipSkill: "⚡ Coding Skills",
        chipAgent: "🤖 AI Agents",
        chipTheme: "🎨 Themes",
        chipVerified: "✓ Verified Only",
        // Liveness
        showDeadLabel: "☠️ Show offline",
        lifeArchived: "Archived",
        lifeDead: "Offline",
        lifeRepoMissing: "Source gone",
        lifeArchivedTitle: "Repository archived, no longer maintained, but still installable",
        lifeDeadTitle: "Both repository and npm package are gone, cannot install",
        lifeRepoMissingTitle: "GitHub repository unavailable, but the npm package still installs fine",
        // Mirror detection (issue #18)
        mirrorBadge: "Mirror",
        mirrorTitle: (up) => `This repo is a mirror of ${up}; click to visit the upstream original`,
        mirrorDead: "Mirror·Upstream gone",
        mirrorDeadTitle: "The upstream original of this mirror has been deleted; this is now the only available source. Contact the marketplace maintainers to promote it to a full listing",
        syntaxFilterTitle: "Syntax Filter",
        heroTrendingLink: "🔥 Trending plugins",
        heroTopRatedLink: "⭐ Top rated",
        heroVerifiedSuffix: " verified packages",
        heroRecentlyUpdated: "⏱️ Recently updated",
        ghLoginBtn: "Sign in with GitHub",
        ghLogoutBtn: "Sign out",
        ghLoginToast: "Signed in as",
        ghLogoutToast: "Signed out of GitHub",
        ghAuthErrorToast: "GitHub sign-in failed, please retry",
        ghIdentityLoggedIn: "Signed in as GitHub user {user}. Comments below are powered by GitHub Discussions: first-time posting requires a one-click giscus authorization inside the comment box (same account).",
        ghIdentityLoggedOut: "Comments are powered by GitHub Discussions. Sign in to join:",
        ghIdentityLoginCta: "Sign in with GitHub",

        trendingSectionTitle: "Trending Plugins",
        trendingSubtitle: "Top community stars & fast-growing tools",
        trendingNoData: "No trending data",
        installBtn: "⚡ Install",
        viewBtn: "View",
        githubBtn: "GitHub Repo ↗",
        noNpmCmdNote: "This plugin is not published to npm and its repository has no root package.json (not installable via npm). Please check the GitHub repo for install instructions.",

        exploreSectionTitle: "Explore Plugins",
        tabAll: "All Plugins",
        tabPopular: "🔥 Popular",
        tabNew: "✨ New",
        tabRecent: "⏱️ Recently Updated",
        tabFavorites: "⭐ Favorites",

        scenarioAll: "All Scenarios",
        scenarioAi: "🤖 AI & Agents",
        scenarioCoding: "💻 Coding",
        scenarioMcp: "🔌 MCP Servers",
        scenarioWeb: "🌐 Web & APIs",
        scenarioAutomation: "⚡ Automation",
        scenarioDevops: "🛠️ DevOps",
        scenarioThemes: "🎨 Themes & UI",
        scenarioUtilities: "📦 Utilities",

        typeAll: "All Types",
        typeExtension: "🧩 Extension",
        typeSkill: "⚡ Skill",
        typeMcp: "🔌 MCP Server",
        typeTheme: "🎨 Theme",
        typePrompt: "📝 Prompt",

        verifiedOnly: "✓ Verified Only",
        sortStars: "⭐ Most Stars",
        sortRecent: "⏱️ Recently Updated",
        sortForks: "🍴 Most Forks",
        sortName: "🔤 Name (A-Z)",

        viewGridTitle: "Grid View (Alt+V)",
        viewListTitle: "List View (Alt+V)",
        resetBtn: "Reset",

        activeFiltersPrefix: "Active filters:",
        clearAllBtn: "Clear All",
        filterTagQuery: "Query: ",
        filterTagScenario: "Scenario: ",
        filterTagType: "Type: ",
        filterTagVerified: "Verified Only",

        emptyTitle: "No matching plugins found",
        emptyDesc: "Try adjusting your search terms, removing scenario filters, or resetting.",
        emptyResetBtn: "Reset All Filters",

        statsZero: "0 plugins",
        statsShowing: (start, end, total) => `${start}-${end} / ${total} plugins`,
        paginationZero: "Showing 0 results",
        paginationShowing: (start, end, total) => `Showing ${start} to ${end} of ${total} plugins`,

        badgeVerified: "✓ Verified",
        badgeVerifiedTitle: "NPM Package Verified",
        unverifiedGithubTitle: "GitHub Direct Source",
        addFavoriteTitle: "Add favorite",
        removeFavoriteTitle: "Remove favorite",
        noDesc: "No description provided.",
        viewDetailsBtn: "📖 View Details",
        cardRatingTitle: "Rating",
        cardStarsTitle: "GitHub Stars",
        cardUpdatedTitle: "Updated: ",

        dateToday: "today",
        dateYesterday: "yesterday",
        dateDaysAgo: (d) => `${d}d ago`,
        dateMonthsAgo: (m) => `${m}mo ago`,

        trustBadge: "Security & Integrity",
        trustTitle: "Trusted Developer Ecosystem",
        trustSubtitle: "Every plugin is backed by a public repository and verifiable installation command.",
        trust1Title: "Source Verified",
        trust1Desc: "All plugins are indexed directly from public GitHub repositories with open source code.",
        trust2Title: "Repository Indexed",
        trust2Desc: "Automated GitHub Actions crawler synchronizes releases, tags, stars, and README files hourly.",
        trust3Title: "Package Validated",
        trust3Desc: "Strict NPM validation ensures genuine author-repo matching and prevents typosquatting.",
        trust4Title: "One-Command Install",
        trust4Desc: "Every listing ships a verified one-line <code>npm i</code> command for zero-friction installation.",

        footerCopyright: "© 2026 dsh Ecosystem. Open source under Apache-2.0.",
        footerShortcuts: "Shortcuts: <code>/</code> Search · <code>Alt+L</code> Language · <code>Alt+T</code> Theme · <code>Alt+V</code> View · <code>Esc</code> Close",
        footerGithub: "GitHub Repository ↗",
        footerPublishGuide: "Submit Guide",
        footerWiki: "Wiki Index ↗",
        footerMcp: "MCP Standard ↗",

        modalInstallBtn: "Install Plugin",
        modalCloseTitle: "Close (Esc)",
        modalTabOverview: "📋 Overview & Setup",
        modalTabReadme: "📖 README Docs",
        modalTabCompatibility: "📦 Compatibility & Specs",
        modalTabReviews: "⭐ Reviews & Discussions",

        modalDescTitle: "Tagline & Description",
        modalQuickInstallTitle: "⚡ Quick Installation",
        modalCompatTitle: "💻 Compatibility Matrix",
        modalCompatDshVer: "DSH Version",
        modalCompatPlatform: "Platform Support",
        modalCompatRuntime: "Runtime Engine",
        modalCompatRuntimeVal: "Node >= 18 / Native",
        modalMetaTitle: "📊 Repository Metadata",
        modalMetaRepo: "Repository",
        modalMetaAuthor: "Author",
        modalMetaLicense: "License",
        modalMetaUpdated: "Last Updated",
        modalTagsTitle: "🏷️ Topic Tags",
        modalSpecsTitle: "Package Specifications",
        modalSpecsName: "Package Name",
        modalSpecsVersion: "Version",
        modalSpecsBranch: "Default Branch",
        modalSpecsIssues: "Open Issues",
        modalVerifyTitle: "Installation Verification",
        modalVerifyNpmNote: "✓ <b>NPM Registry Verified:</b> This package has been audited and matched against the official NPM registry with matching repository metadata.",
        modalVerifyGitNote: "ℹ <b>GitHub Direct Source:</b> This plugin is installed directly via GitHub git reference, verified for public open-source availability.",
        // —— Trust panel (AST security scan + health check) ——
        trustPanelTitle: "🛡️ Trust Assessment",
        trustConfidence: "Install Confidence",
        trustLastVerified: "Last verified",
        trustNever: "Never verified",
        trustFresh: (days) => `${days} day${days === 1 ? '' : 's'} ago ✅`,
        trustStale: (days) => `${days} day${days === 1 ? '' : 's'} ago ⚠️`,
        trustUnverifiedDesc: "Security scan has not completed or failed for this plugin — this does not imply risk; review the source code before installing.",
        trustSecPass: "Security scan passed",
        trustSecWarn: "Suspicious patterns found",
        trustSecDanger: "High-risk patterns detected",
        trustHealthTitle: "Health check",
        trustHcManifest: "Valid manifest",
        trustHcBundle: "dsh.bundle declared",
        trustHcApply: "apply() entry point",
        trustBuild: "CI build status",
        trustBuildPassing: "✅ Passing",
        trustBuildFailing: "❌ Failing",
        trustBuildUnknown: "⚠️ No record",
        trustFindingsTitle: "Scan findings",
        trustNoFindings: "No suspicious patterns detected",
        trustMoreFindings: (n) => `${n} more not shown`,
        trustSevHigh: "High",
        trustSevMedium: "Medium",
        trustSevLow: "Info",
        // Card badges
        trustCardPass: "Verified",
        trustCardWarn: "Suspicious",
        trustCardDanger: "Danger",
        // Resource profile (token-consumption view, statically inferred)
        resPanelTitle: "⚡ Resource Profile",
        resDisclaimer: "Static heuristic estimate from entry-code scan, not a precise guarantee; actual consumption depends on usage.",
        resWeightLabel: "Resource weight",
        resWeightHeavy: "Heavy · per-request hooks",
        resWeightMedium: "Medium · lifecycle/model calls",
        resWeightLight: "Light · commands/dashboard only",
        resHotHooks: "Per-request event hooks",
        resLifeHooks: "Lifecycle event hooks",
        resModelCalls: "Extra model calls required",
        resNoModelCalls: "No extra model calls",
        resDashboards: "Dashboard pages",
        resBadgeHeavy: "⚡ Per-request hooks",
        resBadgeModel: "🤖 Model calls",
        chipLight: "✦ Lightweight only",
        tabObservability: "📊 Observability Picks",
        modalRatingTitle: "⭐ Community Rating",
        modalRatingEmpty: "Be the first to rate this plugin!",
        modalRatingYour: (r) => `Your Rating: ${r ? r + ' ★' : 'Click to rate'}`,
        modalRatingCountSuffix: "ratings",
        modalDiscussionsTitle: "💬 GitHub Discussions",
        modalDiscussionsFallback: (url) => `Discussions via <a href="${url}" target="_blank" rel="noopener" style="color:var(--accent);">GitHub Issues ↗</a>`, // url escaped by caller
        modalGithubBtn: "GitHub Repo ↗",
        modalNpmBtn: "📦 npm Registry ↗",
        modalDoneBtn: "Done",

        readmeLoading: "Loading README.md...",
        readmeFetching: "⏳ Fetching README.md from GitHub Raw...",
        readmeError: "⚠️ Unable to load live preview for this README file.",
        readmeViewGithub: "View documentation directly on GitHub ↗",
        readmeToggleZh: "🇨🇳 切换到中文文档",
        readmeToggleEn: "🇬🇧 Switch to English",
        readmeZhUnavailable: "No Chinese documentation available for this plugin; showing the original English README.",

        copyBtn: "Copy",
        copyDone: "✓ Copied",

        publishTitle: "Submit & Publish a DSH Plugin",
        publishSec1Title: "📦 Open Topic-Based Registry",
        publishSec1Desc: "DSH uses GitHub Topics for automated discovery. No account registration or form submission required. Follow 3 steps to publish:",
        publishStep1Title: "Create a Public GitHub Repository",
        publishStep1Desc: "Include a clear <code>README.md</code>, license, and entry point.",
        publishStep2Title: "Add the Core Topic Tag",
        publishStep2Desc: "Under your repo's Topics setting, add:",
        publishStep2Tag: "🏷️ dsh-plugin (Click to copy)",
        publishStep3Title: "Add Scenario & Type Tags (Optional)",
        publishStep3Desc: "Categorize your plugin for better discovery:",
        publishSec2Title: "⏱️ Automated Hourly Sync",
        publishSec2Desc: "Our GitHub Actions crawler indexes the registry every hour, strictly validating NPM checksums and repository ownership before updating the marketplace and GitHub Wiki.",
        publishGotIt: "Got it",

        toastCopiedCmd: (cmd) => `Copied install command: ${cmd}`,
        toastCopiedGeneric: (text) => `Copied: ${text}`,
        toastCopiedTag: (tag) => `Copied topic tag: ${tag}`,
        toastFavRemoved: "Removed from favorites",
        toastFavAdded: "Added to favorites",
        toastRatingThanks: (s) => `Thank you for rating: ${s} ★`,
        toastRatingFail: "Failed to submit rating, please try again later",
        toastCopyFail: "Copy failed: clipboard not supported here, please copy manually",
        toastSwitchedZh: "已切换为中文界面",
        toastSwitchedEn: "Switched to English interface",
        backToTopTitle: "Back to top"
      }
    };



// === Translation helper ===
    // --- Translation Helper ---
    function t(key, ...args) {
      const dict = I18N[currentLang] || I18N.zh;
      const val = dict[key];
      if (typeof val === 'function') {
        return val(...args);
      }
      return val !== undefined ? val : key;
    }



// === Static i18n & language management ===
    // --- Update Static I18N in DOM ---
    function updateStaticI18n() {
      document.title = t('siteTitle');
      document.documentElement.setAttribute('lang', currentLang === 'zh' ? 'zh-CN' : 'en');
      
      const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      };
      const setHtml = (id, html) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
      };

      setText("brandTitle", t('brandTitle'));
      setText("navLinkPlugins", t('navPlugins'));
      setText("navLinkTrending", t('navTrending'));
      setText("navLinkMcp", t('navMcp'));
      setText("navLinkDocs", t('navDocs'));
      setText("navLinkGithub", t('navGithub'));
      setText("langToggleLabel", t('langToggleLabel'));
      
      const langToggleBtn = document.getElementById("langToggleBtn");
      if (langToggleBtn) langToggleBtn.title = t('langToggleTitle');

      const favNavBtn = document.getElementById("favoriteNavBtn");
      if (favNavBtn) favNavBtn.title = t('favoriteTitle');

      setText("submitPluginNavText", t('submitPluginBtn'));
      setText("heroBadgeText", t('heroBadge'));
      setText("heroTitleText", t('heroTitle'));
      setText("heroSubtitleText", t('heroSubtitle'));

      if (searchInput) searchInput.placeholder = t('searchPlaceholder');
      if (searchClearBtn) searchClearBtn.title = t('searchClear');

      setText("recentSearchesTitle", t('recentSearchesTitle'));
      setText("recentSearchesClearBtn", t('recentSearchesClear'));
      setText("quickSuggestionsTitle", t('quickSuggestionsTitle'));
      setText("chipMcp", t('chipMcp'));
      setText("chipSkill", t('chipSkill'));
      setText("chipAgent", t('chipAgent'));
      setText("chipTheme", t('chipTheme'));
      setText("chipVerified", t('chipVerified'));
      setText("syntaxFilterTitle", t('syntaxFilterTitle'));

      setText("heroTrendingLink", t('heroTrendingLink'));
      setText("heroTopRatedLink", t('heroTopRatedLink'));
      setText("heroVerifiedSuffix", t('heroVerifiedSuffix'));
      setText("heroRecentlyUpdated", t('heroRecentlyUpdated'));

      setText("trendingSectionTitle", t('trendingSectionTitle'));
      setText("trendingSubtitle", t('trendingSubtitle'));
      setText("exploreSectionTitle", t('exploreSectionTitle'));

      setText("tabAllText", t('tabAll'));
      setText("tabPopularText", t('tabPopular'));
      setText("tabNewText", t('tabNew'));
      setText("tabRecentText", t('tabRecent'));
      setText("tabObsText", t('tabObservability'));
      const chipLightEl = document.getElementById("chipLight");
      if (chipLightEl) chipLightEl.textContent = t('chipLight');
      setText("tabFavoritesText", t('tabFavorites'));

      // Scenario Chips
      const scenarioMap = {
        all: t('scenarioAll'),
        ai: t('scenarioAi'),
        coding: t('scenarioCoding'),
        mcp: t('scenarioMcp'),
        web: t('scenarioWeb'),
        automation: t('scenarioAutomation'),
        devops: t('scenarioDevops'),
        themes: t('scenarioThemes'),
        utilities: t('scenarioUtilities')
      };
      document.querySelectorAll(".scenario-chip").forEach(chip => {
        const sc = chip.getAttribute("data-scenario");
        if (scenarioMap[sc]) chip.textContent = scenarioMap[sc];
      });

      // Type Filter options
      if (typeFilter) {
        const typeOptions = typeFilter.options;
        if (typeOptions.length >= 6) {
          typeOptions[0].textContent = t('typeAll');
          typeOptions[1].textContent = t('typeExtension');
          typeOptions[2].textContent = t('typeSkill');
          typeOptions[3].textContent = t('typeMcp');
          typeOptions[4].textContent = t('typeTheme');
          typeOptions[5].textContent = t('typePrompt');
        }
      }

      setText("verifiedOnlyBtnSpan", t('verifiedOnly'));
      setText("showDeadBtnSpan", t('showDeadLabel'));

      // Sort Filter options
      if (sortFilter) {
        const sortOptions = sortFilter.options;
        if (sortOptions.length >= 4) {
          sortOptions[0].textContent = t('sortStars');
          sortOptions[1].textContent = t('sortRecent');
          sortOptions[2].textContent = t('sortForks');
          sortOptions[3].textContent = t('sortName');
        }
      }

      if (viewGridBtn) viewGridBtn.title = t('viewGridTitle');
      if (viewListBtn) viewListBtn.title = t('viewListTitle');
      setText("resetFiltersBtn", t('resetBtn'));
      setText("activeFiltersPrefix", t('activeFiltersPrefix'));
      setText("clearAllFiltersBtn", t('clearAllBtn'));

      // Trust Section
      setText("trustBadge", t('trustBadge'));
      setText("trustTitle", t('trustTitle'));
      setText("trustSubtitle", t('trustSubtitle'));
      setText("trust1Title", t('trust1Title'));
      setText("trust1Desc", t('trust1Desc'));
      setText("trust2Title", t('trust2Title'));
      setText("trust2Desc", t('trust2Desc'));
      setText("trust3Title", t('trust3Title'));
      setText("trust3Desc", t('trust3Desc'));
      setText("trust4Title", t('trust4Title'));
      setHtml("trust4Desc", t('trust4Desc'));

      // Footer
      setHtml("footerCopyright", t('footerCopyright'));
      setHtml("footerShortcuts", t('footerShortcuts'));
      setText("footerGithub", t('footerGithub'));
      setText("footerPublishGuide", t('footerPublishGuide'));
      setText("footerWiki", t('footerWiki'));
      setText("footerMcp", t('footerMcp'));

      // Modal Static Elements
      setText("modalVerifiedBadge", t('badgeVerified'));
      setText("modalHeaderInstallBtnText", t('modalInstallBtn'));
      const detailCloseBtn = document.getElementById("detailCloseBtn");
      if (detailCloseBtn) detailCloseBtn.title = t('modalCloseTitle');

      setText("modalTabBtnOverview", t('modalTabOverview'));
      setText("modalTabBtnReadme", t('modalTabReadme'));
      setText("modalTabBtnCompatibility", t('modalTabCompatibility'));
      setText("modalTabBtnReviews", t('modalTabReviews'));

      setText("modalDescTitle", t('modalDescTitle'));
      setText("modalQuickInstallTitle", t('modalQuickInstallTitle'));
      setText("modalCompatTitle", t('modalCompatTitle'));
      setText("modalCompatDshVer", t('modalCompatDshVer'));
      setText("modalCompatPlatform", t('modalCompatPlatform'));
      setText("modalCompatRuntime", t('modalCompatRuntime'));
      setText("modalCompatRuntimeVal", t('modalCompatRuntimeVal'));
      setText("modalMetaTitle", t('modalMetaTitle'));
      setText("modalTagsTitle", t('modalTagsTitle'));
      setText("modalSpecsTitle", t('modalSpecsTitle'));
      setText("modalVerifyTitle", t('modalVerifyTitle'));
      setText("modalTrustTitle", t('trustPanelTitle'));
      setText("modalResTitle", t('resPanelTitle'));
      setText("modalRatingTitle", t('modalRatingTitle'));
      setText("modalDiscussionsTitle", t('modalDiscussionsTitle'));
      setText("modalGithubBtnText", t('modalGithubBtn'));
      setText("modalNpmBtnText", t('modalNpmBtn'));
      setText("modalDoneBtn", t('modalDoneBtn'));

      // Publish Modal
      setText("publishModalTitle", t('publishTitle'));
      const publishCloseBtn = document.getElementById("publishCloseBtn");
      if (publishCloseBtn) publishCloseBtn.title = t('modalCloseTitle');

      setText("publishSec1Title", t('publishSec1Title'));
      setText("publishSec1Desc", t('publishSec1Desc'));
      setText("publishStep1Title", t('publishStep1Title'));
      setHtml("publishStep1Desc", t('publishStep1Desc'));
      setText("publishStep2Title", t('publishStep2Title'));
      setText("publishStep2Desc", t('publishStep2Desc'));
      setText("publishStep2Tag", t('publishStep2Tag'));
      setText("publishStep3Title", t('publishStep3Title'));
      setText("publishStep3Desc", t('publishStep3Desc'));
      setText("publishSec2Title", t('publishSec2Title'));
      setText("publishSec2Desc", t('publishSec2Desc'));
      setText("publishGotItBtn", t('publishGotIt'));

      if (backToTopBtn) backToTopBtn.title = t('backToTopTitle');
    }

    // --- Language Management ---
    function setLanguage(lang) {
      currentLang = (lang === 'en') ? 'en' : 'zh';
      localStorage.setItem('dsh_lang', currentLang);
      updateStaticI18n();
      updateStats();
      renderTrending();
      applyFilters();
      if (detailModal && detailModal.classList.contains("open") && currentOpenPlugin) {
        openDetailModal(currentOpenPlugin.id);
      }
    }

    function toggleLanguage() {
      const nextLang = (currentLang === 'zh') ? 'en' : 'zh';
      setLanguage(nextLang);
      showToast(nextLang === 'zh' ? t('toastSwitchedZh') : t('toastSwitchedEn'), '🌐');
    }
