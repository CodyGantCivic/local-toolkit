// ==UserScript==
// @name         CivicPlus — Widget Skin Default Override
// @namespace    http://your-org.example/
// @version      1.0.0
// @description  When creating a new widget skin in Design Center -> Themes, optionally apply preferred defaults for font, alignment and padding. Tampermonkey-ready and idempotent.
// @match        *://*/designcenter/themes*
// @match        *://*/DesignCenter/Themes*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function (global) {
  'use strict';

  const NAME = 'WidgetSkinDefaultOverride';
  const LOG = '[CP Toolkit][WidgetSkinDefaultOverride]';
  const INSTALL_TIMEOUT = 6000;
  const POLL_INTERVAL = 100;

  function log(...args) { try { console.log(LOG, ...args); } catch (e) {} }
  function warn(...args) { try { console.warn(LOG, ...args); } catch (e) {} }

  // Idempotent namespace
  global[NAME] = global[NAME] || {};
  if (global[NAME].__installed) {
    log('module already installed (skipping)');
    return;
  }

  /**
   * Wait for a condition to become true, resolving true/false.
   * @param {() => boolean} cond
   * @param {number} [timeout=6000]
   * @param {number} [interval=100]
   * @returns {Promise<boolean>}
   */
  function waitFor(cond, timeout = INSTALL_TIMEOUT, interval = POLL_INTERVAL) {
    const start = Date.now();
    return new Promise((resolve) => {
      (function check() {
        try {
          if (cond()) return resolve(true);
        } catch (e) {
          /* ignore */
        }
        if (Date.now() - start >= timeout) return resolve(false);
        setTimeout(check, interval);
      })();
    });
  }

  /**
   * Apply the "defaults override" logic to the design center theme JSON.
   * This function is called after refreshContentContainersAsync runs.
   * Behavior:
   *  - Detect new skins (WidgetSkinID < 0).
   *  - Prompt user once per call to confirm overriding defaults for new skins.
   *  - If confirmed, apply:
   *      * comp0.FontSize = null; comp0.TextAlignment = 0
   *      * comp13.*Padding = { Value: '0.5', Unit: '0' }   (if component exists)
   *  - Close modal, save theme (if saveTheme exists), remove unsaved preview skins, and reopen Manage Widget Skins link (best effort).
   */
  function handleNewSkins() {
    try {
      const themeJSON = (global.DesignCenter && global.DesignCenter.themeJSON) || {};
      const skins = Array.isArray(themeJSON.WidgetSkins) ? themeJSON.WidgetSkins : [];
      const newSkins = skins.filter(s => s && typeof s.WidgetSkinID === 'number' && s.WidgetSkinID < 0);
      if (!newSkins.length) return false;

      const msg =
        '[CP Toolkit] Detected newly-created widget skin(s).\n\n' +
        'Would you like to apply the CP Toolkit default adjustments to the new skin(s)?\n\n' +
        'Click OK to apply defaults (preferred for new skins). Click Cancel to leave as-is (useful when copying skins).';
      const apply = confirm(msg);
      if (!apply) {
        log('user cancelled applying defaults to new widget skin(s)');
        return true;
      }

      // Apply defaults to each new skin found (safe checks)
      newSkins.forEach(skin => {
        try {
          // Component 0: wrapper/main component adjustments
          const comp0 = (skin.Components && skin.Components[0]) || null;
          if (comp0 && typeof comp0 === 'object') {
            comp0.FontSize = null;
            comp0.TextAlignment = 0;
          }
          // Component 13: tabbed widget padding adjustments (if exists)
          const comp13 = (skin.Components && skin.Components[13]) || null;
          if (comp13 && typeof comp13 === 'object') {
            const paddingEms = { Value: '0.5', Unit: '0' };
            comp13.PaddingTop = paddingEms;
            comp13.PaddingLeft = paddingEms;
            comp13.PaddingBottom = paddingEms;
            comp13.PaddingRight = paddingEms;
          }
        } catch (e) {
          warn('apply defaults to skin failed', e);
        }
      });

      // Close any modal if visible (best-effort)
      try {
        const modalClose = document.querySelector('.modalClose, .ui-dialog .ui-dialog-titlebar-close');
        if (modalClose) {
          modalClose.click();
        }
      } catch (e) { /* ignore */ }

      // Save the theme if API exists
      try {
        if (typeof global.saveTheme === 'function') {
          try { global.saveTheme(); log('saveTheme() invoked'); } catch (e) { warn('saveTheme() failed', e); }
        }
      } catch (e) { /* ignore */ }

      // Remove unsaved preview skins (best-effort loop for a short duration)
      try {
        const stopAfterMs = 5000;
        const intervalMs = 100;
        const start = Date.now();
        const tid = setInterval(() => {
          try {
            // Buttons to remove preview skins often have classes like '.remove.widgetSkin'
            const toRemove = document.querySelectorAll(".widget[class*='skin-'] .remove.widgetSkin, .remove.widgetSkin");
            if (toRemove.length) {
              toRemove.forEach(btn => {
                try { btn.click(); } catch (_) { /* ignore */ }
              });
            }
            if (Date.now() - start > stopAfterMs) clearInterval(tid);
          } catch (_) {
            clearInterval(tid);
          }
        }, intervalMs);
      } catch (e) { warn('removal loop failed', e); }

      // After a delay, attempt to reopen Manage Widget Skins link (best-effort)
      setTimeout(() => {
        try {
          const links = Array.from(document.querySelectorAll('a'));
          const manageLink = links.find(a => /manage widget skins/i.test(a.textContent || ''));
          if (manageLink) manageLink.click();
        } catch (e) { /* ignore */ }
      }, 1200);

      return true;
    } catch (e) {
      warn('handleNewSkins error', e);
      return false;
    }
  }

  /**
   * Install an override wrapper around refreshContentContainersAsync.
   * The wrapper will call the original function and then execute handleNewSkins.
   * It's marked with a flag to avoid double-install.
   */
  function installOverride() {
    try {
      const fn = global.refreshContentContainersAsync;
      if (typeof fn !== 'function') {
        warn('refreshContentContainersAsync is not present or not a function');
        return false;
      }
      if (fn.__cpToolkit_widget_skin_override_installed) {
        log('override already installed on refreshContentContainersAsync');
        return true;
      }

      const original = fn;
      function wrappedRefreshContentContainersAsync(...args) {
        // Call original first (preserve behavior)
        try {
          original.apply(this, args);
        } catch (e) {
          warn('original refreshContentContainersAsync threw', e);
        }

        // Run toolkit post-processing (non-blocking)
        try {
          // Run after a tiny delay to give the original function a moment to populate themeJSON
          setTimeout(() => {
            try {
              const did = handleNewSkins();
              if (did) log('post-refresh processing completed (new skin handling executed)');
            } catch (e) { warn('post-refresh processing error', e); }
          }, 120);
        } catch (e) { warn('scheduling post-refresh processing failed', e); }
      }

      // Preserve marker and attempt to copy metadata if present
      try {
        wrappedRefreshContentContainersAsync.__cpToolkit_widget_skin_override_installed = true;
        // copy reference to original for debugging
        wrappedRefreshContentContainersAsync.__cpToolkit_original = original;
        global.refreshContentContainersAsync = wrappedRefreshContentContainersAsync;
        log('installed override on refreshContentContainersAsync');
        return true;
      } catch (e) {
        warn('failed to assign override', e);
        return false;
      }
    } catch (e) {
      warn('installOverride error', e);
      return false;
    }
  }

  /**
   * init: wait for the function to exist, then install override.
   */
  async function init() {
    if (global[NAME].__installed) return true;
    // quick path check to ensure we're on designcenter/themes pages
    try {
      const path = (global.location && (global.location.pathname || '')).toLowerCase();
      if (path.indexOf('/designcenter/themes') === -1) {
        log('not on designcenter/themes page — skipping');
        return false;
      }
    } catch (e) {
      warn('path check failed', e);
      // continue to attempt installation
    }

    const ok = await waitFor(() => typeof global.refreshContentContainersAsync === 'function', INSTALL_TIMEOUT, POLL_INTERVAL);
    if (!ok) {
      warn('refreshContentContainersAsync did not appear within timeout — aborting install');
      return false;
    }
    const installed = installOverride();
    if (installed) global[NAME].__installed = true;
    return installed;
  }

  // Expose API
  global[NAME] = global[NAME] || {};
  global[NAME].init = init;
  global[NAME].forceInstall = installOverride;
  global[NAME].waitFor = waitFor;

  // Auto-run shortly after load
  try {
    setTimeout(() => { init().catch(e => warn('init failed', e)); }, 250);
  } catch (e) { warn('auto-run scheduling failed', e); }

  log('module loaded (init scheduled)');

})(window);
