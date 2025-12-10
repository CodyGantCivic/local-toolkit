
    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    async function initialize() {
        const isCPSite = await isCivicPlusSite();

        if (!isCPSite) {
            console.log(TOOLKIT_NAME + ' Not a CivicPlus site, tools disabled');
            return;
        }

        console.log(TOOLKIT_NAME + ' v' + TOOLKIT_VERSION + ' - Registering on-demand tools');

        // Register on-demand tools (they only run when clicked)
        GM_registerMenuCommand('🎨 Setup Defaults V2', setupDefaultsV2);
        GM_registerMenuCommand('📦 Copy Containers to Another Layout', copyContainersToLayout);
        GM_registerMenuCommand('📤 Export Current Theme', exportCurrentTheme);
        GM_registerMenuCommand('📥 Import Theme', importTheme);
        GM_registerMenuCommand('🎭 Copy Widget Skin Components', copyWidgetSkinComponents);
        GM_registerMenuCommand('⚙️ Setup Default Widget Option Sets', setupDefaultWidgetOptionSets);

        console.log(TOOLKIT_NAME + ' 6 on-demand tools registered');
    }

    initialize();

})();
