 // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    async function isCivicPlusSite() {
        console.log(TOOLKIT_NAME + ' Detecting if this site is a CivicPlus site. If not, a 404 error below is normal.');

        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('HEAD', '/Assets/Mystique/Shared/Components/ModuleTiles/Templates/cp-Module-Tile.html');
            xhr.onload = function() {
                resolve(xhr.status === 200);
            };
            xhr.onerror = () => resolve(false);
            xhr.send();
        });
    }

    function pageMatches(patterns) {
        const url = window.location.href.toLowerCase();
        const pathname = window.location.pathname.toLowerCase();

        return patterns.some(pattern => {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
            return regex.test(url) || regex.test(pathname);
        });
    }

    function ensureFontAwesome() {
        return new Promise((resolve) => {
            // Check if FontAwesome is already loaded
            if ($('.fa, .fas, .far, .fal, .fab').length > 0) {
                resolve();
                return;
            }

            // Check if we already injected it
            if ($('#cp-toolkit-fontawesome').length > 0) {
                // Already injecting, wait a bit
                setTimeout(() => resolve(), 100);
                return;
            }

            // Load FontAwesome from CDN
            const link = document.createElement('link');
            link.id = 'cp-toolkit-fontawesome';
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css';

            link.onload = () => {
                console.log(TOOLKIT_NAME + ' Loaded FontAwesome from CDN');
                resolve();
            };

            link.onerror = () => {
                console.warn(TOOLKIT_NAME + ' Failed to load FontAwesome');
                resolve(); // Resolve anyway to not block execution
            };

            document.head.appendChild(link);
        });
    }

    // Expose utility functions globally for other CP Toolkit scripts
    window.CPToolkit = window.CPToolkit || {};
    window.CPToolkit.isCivicPlusSite = isCivicPlusSite;
    window.CPToolkit.pageMatches = pageMatches;
    window.CPToolkit.ensureFontAwesome = ensureFontAwesome;
