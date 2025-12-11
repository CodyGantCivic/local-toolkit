// ==UserScript==
// @name         CivicPlus — Auto Dismiss Help/Welcome (site-wide)
// @namespace    http://your-org.example/
// @version      1.0.0
// @description  Detect CivicPlus sites and auto-hide the help/welcome overlays & remove ?ShowWelcomeMessage=1 on any page of a CivicPlus site. Exposes AutoDismissHelpWelcome.init().
// @match        *://*/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // Guard against double installs
  if (window.AutoDismissHelpWelcome && window.AutoDismissHelpWelcome.__loaded) return;

  const STYLE_ID = 'cp-toolkit_dismiss-help';
  const CACHE_KEY = '__cp_toolkit_is_civicplus';
  const CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes

  function log(...args) { try { console.log('[CP Toolkit][AutoDismissHelpWelcome]', ...args); } catch(e) {} }
  function warn(...args) { try { console.warn('[CP Toolkit][AutoDismissHelpWelcome]', ...args); } catch(e) {} }

  // HEAD-check fallback (same as your snippet)
  function headCheckIsCivicPlus(timeout = 5000) {
    return new Promise((resolve) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('HEAD', '/Assets/Mystique/Shared/Components/ModuleTiles/Templates/cp-Module-Tile.html', true);
        xhr.timeout = timeout;
        xhr.onload = function () { resolve(xhr.status === 200); };
        xhr.onerror = function () { resolve(false); };
        xhr.ontimeout = function () { resolve(false); };
        try { xhr.send(); } catch (e) { resolve(false); }
      } catch (e) {
        resolve(false);
      }
    });
  }

  // Prefer toolkit detection if available; otherwise use cached HEAD-check, else run HEAD-check.
  async function detectCivicPlus() {
    try {
      // If toolkit offers detection and it is a function, prefer it
      if (window.CPToolkit && typeof window.CPToolkit.isCivicPlusSite === 'function') {
        try {
          const res = window.CPToolkit.isCivicPlusSite();
          return (res && typeof res.then === 'function') ? await res : Boolean(res);
        } catch (e) {
          warn('CPToolkit.isCivicPlusSite threw, falling back to HEAD-check', e);
        }
      }

      // Check sessionStorage cache first (per-origin)
      try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.checkedAt && (Date.now() - parsed.checkedAt) < CACHE_TTL_MS) {
            return Boolean(parsed.isCivicPlus);
          }
        }
      } catch (e) { /* ignore cache parse errors */ }

      // Run HEAD-check
      const headResult = await headCheckIsCivicPlus();
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ isCivicPlus: !!headResult, checkedAt: Date.now() }));
      } catch (e) { /* ignore storage errors */ }
      return headResult;
    } catch (e) {
      warn('detectCivicPlus error', e);
      return false;
    }
  }

  // Inject idempotent CSS to hide tooltips
  function injectHideCss() {
    try {
      if (document.getElementById(STYLE_ID)) return;
      const css = '#widgetsTabTooltip, #workingCopyTooltip { display: none !important; }';
      const s = document.createElement('style');
      s.id = STYLE_ID;
      s.textContent = css;
      (document.head || document.documentElement || document.body).appendChild(s);
      log('injected hide CSS');
    } catch (e) { warn('injectHideCss failed', e); }
  }

  // Remove the ShowWelcomeMessage param from the URL without reloading
  function removeWelcomeQueryParam() {
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has('ShowWelcomeMessage')) return false;
      url.searchParams.delete('ShowWelcomeMessage');
      const newUrl = url.pathname + (url.search ? url.search : '') + (url.hash ? url.hash : '');
      history.replaceState(null, document.title, newUrl);
      log('removed ShowWelcomeMessage query param via history.replaceState');
      return true;
    } catch (e) {
      warn('removeWelcomeQueryParam failed', e);
      return false;
    }
  }

  // Attempt to hide or remove common overlay elements that might already be on-screen
  function hideExistingOverlays() {
    try {
      const ids = ['widgetsTabTooltip', 'workingCopyTooltip'];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          try { el.style.display = 'none'; el.setAttribute('data-cp-toolkit-hidden','1'); } catch(e){}
        }
      });

      // Also try common overlay/dialog selectors (conservative)
      const selectors = [
        '.cp-welcome-overlay', '.cp-welcome', '.welcome-overlay', '.help-overlay', '.civicplus-welcome'
      ];
      selectors.forEach(sel => {
        try {
          document.querySelectorAll(sel).forEach(node => {
            try { node.style.display = 'none'; node.setAttribute('data-cp-toolkit-hidden','1'); } catch(e){}
          });
        } catch (e) {}
      });
    } catch (e) { warn('hideExistingOverlays error', e); }
  }

  // Core runner: detect site and then apply hide/remove actions
  async function run() {
    try {
      const isCP = await detectCivicPlus();
      if (!isCP) {
        log('not a CivicPlus site (detection negative) — aborting');
        return false;
      }
      // We're on a CivicPlus site: take action
      injectHideCss();
      hideExistingOverlays();
      removeWelcomeQueryParam();
      log('AutoDismissHelpWelcome applied on this CivicPlus site');
      return true;
    } catch (e) {
      warn('run error', e);
      return false;
    }
  }

  // Expose API & init guard
  window.AutoDismissHelpWelcome = {
    __loaded: false,
    init: async function () {
      if (window.AutoDismissHelpWelcome.__loaded) return;
      window.AutoDismissHelpWelcome.__loaded = true;
      // Short delay to let page-level scripts run (and overlays potentially appear)
      setTimeout(() => { run().catch(e => warn('init run error', e)); }, 200);
    },
    run, // allow manual invocation
    detectCivicPlus
  };

  // Auto-run: detect and apply if CivicPlus
  // We run on any page but only apply when detection passes
  try {
    // If document still loading, wait DOMContentLoaded to avoid appending to missing head/body
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', () => window.AutoDismissHelpWelcome.init(), { once: true });
    } else {
      // small delay to let page scripts finish
      setTimeout(() => window.AutoDismissHelpWelcome.init(), 120);
    }
  } catch (e) { warn('auto-run scheduling error', e); }
})();
