// ==UserScript==
// @name         CivicPlus — TitleChanger
// @namespace    http://your-org.example/
// @version      1.1.0
// @description  Sets a helpful document.title for admin and designcenter pages. Uses CPToolkit.isCivicPlusSite() when available with a safe fallback detection.
// @match        *://*/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const NS = 'TitleChanger';
  if (window[NS] && window[NS].__loaded) return;

  /**
   * Lightweight CivicPlus site detection fallback.
   * Tries a HEAD request to a known asset. Resolves true if HTTP 200.
   */
  function detectCivicPlusFallback(timeout = 1500) {
    return new Promise((resolve) => {
      try {
        const xhr = new XMLHttpRequest();
        const url = '/Assets/Mystique/Shared/Components/ModuleTiles/Templates/cp-Module-Tile.html';
        let done = false;
        const onDone = (val) => {
          if (done) return;
          done = true;
          resolve(Boolean(val));
        };
        xhr.open('HEAD', url, true);
        xhr.onload = function () {
          onDone(this.status === 200);
        };
        xhr.onerror = function () {
          onDone(false);
        };
        xhr.ontimeout = function () {
          onDone(false);
        };
        xhr.timeout = timeout;
        try {
          xhr.send();
        } catch (e) {
          onDone(false);
        }
      } catch (e) {
        resolve(false);
      }
    });
  }

  /**
   * Decide whether we are on a CivicPlus site. Prefer CPToolkit.isCivicPlusSite if provided.
   * Returns a Promise<boolean>.
   */
  async function isCivicPlusSite() {
    try {
      if (window.CPToolkit && typeof window.CPToolkit.isCivicPlusSite === 'function') {
        try {
          const result = await window.CPToolkit.isCivicPlusSite();
          if (typeof result === 'boolean') return result;
        } catch (_) {
          // fall through to fallback
        }
      }
    } catch (_) { /* ignore */ }

    // fallback: HEAD request to known asset
    const ok = await detectCivicPlusFallback();
    return ok;
  }

  /**
   * Set the document title, preserving the original title if possible.
   */
  function setTitle(prefix) {
    try {
      let originalTitle = document.title || '';
      if (!originalTitle) {
        const toolbarLabel = document.querySelector('.cp-Toolbar-menu strong.ng-binding');
        if (toolbarLabel) {
          originalTitle = toolbarLabel.textContent.trim();
        }
      }
      if (!originalTitle) originalTitle = document.title || '';
      if (prefix && originalTitle) {
        document.title = `${prefix} | ${originalTitle}`;
      }
    } catch (_) { /* ignore */ }
  }

  function applyTitleForAdmin() {
    const path = (window.location.pathname || '').toLowerCase();
    if (path.startsWith('/admin/graphiclinks.aspx')) {
      const headerTitle = document.getElementById('ctl00_ctl00_adminHeader_headerTitle');
      if (headerTitle) headerTitle.textContent = 'Graphic Links';
    }
    let titleCandidate = '';
    const wayfinder = document.querySelector('.wayfinder');
    if (wayfinder) {
      const em = wayfinder.querySelector('em');
      if (em && em.textContent && em.textContent.trim()) {
        titleCandidate = em.textContent.trim();
      } else {
        const links = wayfinder.querySelectorAll('a');
        if (links && links.length) {
          const last = links[links.length - 1];
          if (last && last.textContent && last.textContent.trim()) {
            titleCandidate = last.textContent.trim();
          }
        }
      }
    }
    if (!titleCandidate) {
      const header = document.querySelector('.header h1');
      if (header && header.textContent && header.textContent.trim()) {
        titleCandidate = header.textContent.trim();
      }
    }
    if (titleCandidate) setTitle(titleCandidate);
  }

  function applyTitleForDesignCenter() {
    let titleCandidate = '';
    const currentView = document.getElementById('currentView');
    if (currentView && currentView.options && currentView.options.length) {
      const selectedIndex = currentView.selectedIndex;
      if (selectedIndex >= 0) {
        const selectedOption = currentView.options[selectedIndex];
        if (selectedOption && selectedOption.text && selectedOption.text.trim()) {
          titleCandidate = selectedOption.text.trim();
        }
      }
    }
    if (titleCandidate) setTitle(titleCandidate);
  }

  function updateTitle() {
    const path = (window.location.pathname || '').toLowerCase();
    if (path.startsWith('/admin/')) {
      applyTitleForAdmin();
    } else if (path.startsWith('/designcenter/')) {
      applyTitleForDesignCenter();
    }
  }

  async function init() {
    if (window[NS] && window[NS].__loaded) return;
    window[NS] = window[NS] || {};
    window[NS].__loaded = true;

    // Quick path-based shortcut: if path clearly looks admin/designcenter, proceed (helps when detection is unreliable)
    let proceed = false;
    try {
      const path = (window.location.pathname || '').toLowerCase();
      if (path.startsWith('/admin/') || path.startsWith('/designcenter/')) {
        proceed = true;
      }
    } catch (_) { proceed = false; }

    if (!proceed) {
      // run detection
      try {
        const isCP = await isCivicPlusSite();
        if (!isCP) return; // not a CivicPlus site
      } catch (_) {
        // detection failed; be conservative and skip
        return;
      }
    }

    // attach to DOM ready and also run a delayed second pass to catch async content
    const runUpdate = () => {
      try {
        updateTitle();
      } catch (_) {}
    };
    if (document.readyState !== 'loading') {
      runUpdate();
    } else {
      document.addEventListener('DOMContentLoaded', runUpdate);
    }
    setTimeout(runUpdate, 1800);
  }

  // expose and auto-init
  window[NS] = window[NS] || {};
  window[NS].init = init;

  // Auto-run init (safe)
  (async () => {
    try {
      await init();
    } catch (_) { /* ignore */ }
  })();

})();
