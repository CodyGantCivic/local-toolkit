// ==UserScript==
// @name         CivicPlus — Keyboard Shortcuts
// @namespace    http://your-org.example/
// @version      1.0.0
// @description  Add keyboard shortcuts (Ctrl/Cmd+S to Save, Ctrl/Cmd+Shift+S Save & Publish, Ctrl/Cmd+I Add Item) on CivicPlus admin pages. Respects text inputs and contenteditable areas.
// @match        *://*/admin/*
// @match        *://*/Admin/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function (window, document) {
  'use strict';

  const NS = 'KeyboardShortcuts';
  const LOG = '[CP Toolkit][KeyboardShortcuts]';

  function log(...args) { try { console.log(LOG, ...args); } catch (e) {} }
  function warn(...args) { try { console.warn(LOG, ...args); } catch (e) {} }

  // Idempotent guard
  if (window[NS] && window[NS].__loaded) {
    log('already loaded — skipping');
    return;
  }

  // Decide whether we should run here. Prefer toolkit detection if available.
  async function shouldRun() {
    try {
      if (window.CPToolkit && typeof window.CPToolkit.isCivicPlusSite === 'function') {
        try {
          const res = window.CPToolkit.isCivicPlusSite();
          return (res && typeof res.then === 'function') ? await res : Boolean(res);
        } catch (e) {
          warn('CPToolkit.isCivicPlusSite threw; falling back to path check', e);
        }
      }
    } catch (e) { /* ignore */ }

    try {
      const path = (window.location.pathname || '').toLowerCase();
      return path.startsWith('/admin/');
    } catch (e) {
      return false;
    }
  }

  // Helper: check whether event target is editable (input/textarea/select or contenteditable)
  function isEditingTarget(target) {
    if (!target) return false;
    const tag = (target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if (target.isContentEditable) return true;
    // sometimes event target is inside an editable element (e.g. inside a rich editor)
    try {
      let node = target;
      while (node && node !== document) {
        if (node.isContentEditable) return true;
        node = node.parentNode;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  // Find a button using several heuristics. Returns element or null.
  function findButtonByTextMatch(texts = []) {
    try {
      const candidates = Array.from(document.querySelectorAll("input[type='button'], input[type='submit'], button, a"));
      const lowerTexts = texts.map(t => (t || '').toLowerCase().trim());
      for (const el of candidates) {
        try {
          const v = ((el.value || el.textContent || '') + '').toLowerCase().trim();
          for (const t of lowerTexts) {
            if (!t) continue;
            if (v === t || v.indexOf(t) !== -1) return el;
          }
        } catch (e) { /* ignore element read errors */ }
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  // Click element safely
  function safeClick(el) {
    if (!el) return false;
    try {
      el.click();
      return true;
    } catch (e) {
      // as a fallback try dispatching MouseEvent
      try {
        const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
        el.dispatchEvent(evt);
        return true;
      } catch (err) {
        warn('safeClick failed', err);
        return false;
      }
    }
  }

  // The main handler function factory
  function createHandler() {
    let saveTimeoutFlag = false;

    return function onKeyDown(event) {
      try {
        // Only respond to Ctrl/Cmd combos
        if (!(event.ctrlKey || event.metaKey)) return;

        // Do not trigger while editing text fields or contenteditable
        if (isEditingTarget(event.target)) return;

        const rawKey = event.key || String.fromCharCode(event.which || 0);
        const key = (rawKey + '').toLowerCase();

        // Ctrl/Cmd + S  (save)  /  Ctrl/Cmd + Shift + S (save & publish)
        if (key === 's') {
          event.preventDefault();

          if (saveTimeoutFlag) return;
          saveTimeoutFlag = true;
          setTimeout(() => { saveTimeoutFlag = false; }, 1000);

          if (event.shiftKey) {
            // Save and Publish — try common variations
            const publishSelectors = [
              "input[value='Save and Publish']",
              "input[value='Save & Publish']",
              "input[value='Publish']",
              "button[value='Save and Publish']",
              "button[value='Publish']",
            ];
            let target = null;
            // Try exact selector first
            for (const sel of publishSelectors) {
              try {
                target = document.querySelector(sel);
                if (target) break;
              } catch (e) {}
            }
            // Try heuristic text match if not found
            if (!target) {
              target = findButtonByTextMatch(['save and publish', 'save & publish', 'publish', 'save & push', 'save & publish']);
            }
            if (target) {
              safeClick(target);
              log('Save & Publish triggered by shortcut');
            } else {
              log('Save & Publish target not found');
            }
          } else {
            // Save
            const saveSelectors = [
              "input[value='Save']",
              "button[value='Save']",
              "input[value='Save Draft']",
            ];
            let target = null;
            for (const sel of saveSelectors) {
              try {
                target = document.querySelector(sel);
                if (target) break;
              } catch (e) {}
            }
            if (!target) {
              target = findButtonByTextMatch(['save', 'save draft', 'save changes']);
            }
            if (target) {
              safeClick(target);
              log('Save triggered by shortcut');
            } else {
              log('Save target not found');
            }
          }
        }

        // Ctrl/Cmd + I -> Add Item (only when shift NOT pressed)
        else if (key === 'i' && !event.shiftKey) {
          // Prevent default for the shortcut
          event.preventDefault();

          // Find an "Add" button by text
          let addBtn = findButtonByTextMatch(['add', 'add item', 'add new', 'create', 'add group']);
          if (!addBtn) {
            // fallback: try buttons that have 'add' in value/text
            addBtn = Array.from(document.querySelectorAll("input[type='button'], input[type='submit'], button")).find(el => {
              try {
                const v = ((el.value || el.textContent) + '').toLowerCase();
                return v.indexOf('add') !== -1;
              } catch (e) { return false; }
            }) || null;
          }
          if (addBtn) {
            safeClick(addBtn);
            log('Add Item triggered by shortcut');
          } else {
            log('Add button not found for Ctrl+I');
          }
        }
      } catch (e) {
        warn('onKeyDown error', e);
      }
    };
  }

  // Attach the handler safely once DOM ready
  async function init() {
    try {
      if (window[NS] && window[NS].__loaded) {
        log('already initialised');
        return;
      }

      const run = await shouldRun();
      if (!run) {
        log('not an admin/CivicPlus context — not attaching keyboard shortcuts');
        return;
      }

      const handler = createHandler();
      // Attach with capture to get shortcuts even when elements stopPropagation
      window.addEventListener('keydown', handler, true);

      window[NS] = window[NS] || {};
      window[NS].__loaded = true;
      window[NS].__handler = handler;

      log('keyboard shortcuts attached');
    } catch (e) {
      warn('init error', e);
    }
  }

  // Expose API
  window[NS] = window[NS] || {};
  window[NS].init = init;
  window[NS].remove = function () {
    try {
      if (window[NS] && window[NS].__handler) {
        window.removeEventListener('keydown', window[NS].__handler, true);
        delete window[NS].__handler;
      }
      window[NS].__loaded = false;
      log('keyboard shortcuts removed');
    } catch (e) {
      warn('remove error', e);
    }
  };

  // Auto-init with short delay to let page scripts load
  setTimeout(() => { try { init(); } catch (e) { warn('auto-init failed', e); } }, 250);

})(window, document);
