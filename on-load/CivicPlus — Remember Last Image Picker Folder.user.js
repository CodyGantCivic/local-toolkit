// ==UserScript==
// @name         CivicPlus — Remember Last Image Picker Folder
// @namespace    http://your-org.example/
// @version      1.0.1
// @description  Remember last-clicked folder in image picker and reopen to it (iframe-aware). Uses GM storage when available.
// @match        *://*/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = '__cp_toolkit_last_image_folder_path_v1';
  const POLL_MS = 120;
  const LEVEL_TIMEOUT = 2500;
  const CLICK_WAIT = 140;
  const RETRY_SCHEDULE = [200, 800, 1600]; // ms after modal detection

  // --- Storage helpers (GM or localStorage) ---
  function savePath(pathArray) {
    try {
      const s = JSON.stringify(pathArray || []);
      if (typeof GM_setValue === 'function') {
        try { GM_setValue(STORAGE_KEY, s); return; } catch (_) {}
      }
      localStorage.setItem(STORAGE_KEY, s);
    } catch (_) {}
  }
  function loadPath() {
    try {
      if (typeof GM_getValue === 'function') {
        const s = GM_getValue(STORAGE_KEY, null);
        if (s) try { return JSON.parse(s); } catch (_) {}
        return null;
      }
    } catch (_) {}
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) { return null; }
  }

  // --- Utilities ---
  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  function robustClick(el) {
    if (!el) return false;
    try { el.click(); return true; } catch (e) {}
    try {
      const evtOpts = { bubbles: true, cancelable: true, composed: true, detail: 1 };
      ['pointerover','pointerenter','pointerdown','mousedown','pointerup','mouseup','click'].forEach((type) => {
        try {
          if (type.startsWith('pointer') && typeof PointerEvent === 'function') {
            el.dispatchEvent(new PointerEvent(type, Object.assign({ pointerId: 1 }, evtOpts)));
          } else {
            el.dispatchEvent(new Event(type, evtOpts));
          }
        } catch (_) {}
      });
      return true;
    } catch (_) { return false; }
  }

  function titleOf(node) {
    try {
      const t = node.querySelector && (node.querySelector('.ant-tree-title') || node.querySelector('.ant-tree-node-content-wrapper .ant-tree-title'));
      if (t) return (t.textContent || '').trim();
      if (node.getAttribute && node.getAttribute('title')) return (node.getAttribute('title') || '').trim();
      return (node.textContent || '').trim();
    } catch (_) { return ''; }
  }

  function getDepth(node) {
    try {
      let depth = 0;
      let el = node.parentElement ? node.parentElement.closest('.ant-tree-treenode') : null;
      while (el) { depth++; el = el.parentElement ? el.parentElement.closest('.ant-tree-treenode') : null; }
      return depth;
    } catch (_) { return 9999; }
  }

  // --- Tree helpers ---
  function findChildNodeByTitle(parentNode, title) {
    try {
      const holder = parentNode.querySelector('.ant-tree-list-holder-inner') || parentNode.querySelector('.ant-tree-list-holder') || parentNode;
      const candidates = Array.from(holder.querySelectorAll(':scope > .ant-tree-treenode, :scope > div > .ant-tree-treenode')) || [];
      for (const cand of candidates) if (titleOf(cand) === title) return cand;
      const any = Array.from(parentNode.querySelectorAll('.ant-tree-treenode')).find(n => titleOf(n) === title);
      return any || null;
    } catch (_) { return null; }
  }

  function clickSwitcherFor(node) {
    try {
      const switcher = node.querySelector('.ant-tree-switcher') || node.querySelector('.ant-tree-node-content-wrapper .ant-tree-switcher');
      if (switcher) { robustClick(switcher); return true; }
      robustClick(node);
      return true;
    } catch (_) { return false; }
  }

  function waitForChildren(parentNode, timeout = LEVEL_TIMEOUT) {
    return new Promise((resolve) => {
      const start = Date.now();
      (function check() {
        try {
          const holder = parentNode.querySelector('.ant-tree-list-holder-inner') || parentNode.querySelector('.ant-tree-list-holder') || parentNode;
          const found = holder && Array.from(holder.querySelectorAll('.ant-tree-treenode')).some(n => n !== parentNode);
          if (found) return resolve(true);
        } catch (_) {}
        if (Date.now() - start >= timeout) return resolve(false);
        setTimeout(check, POLL_MS);
      })();
    });
  }

  async function expandPathSequentially(rootDoc, pathArray) {
    try {
      if (!Array.isArray(pathArray) || !pathArray.length) return null;

      // Single-level: choose shallowest match and expand its ancestors
      if (pathArray.length === 1) {
        const title = pathArray[0];
        let matches = Array.from(rootDoc.querySelectorAll('.ant-tree-treenode')).filter(n => titleOf(n) === title);
        if (!matches.length) {
          const alt = Array.from(rootDoc.querySelectorAll('.ant-tree-title, [title]')).find(e => (e.textContent || '').trim() === title || (e.getAttribute && e.getAttribute('title') === title));
          if (alt) {
            const cand = alt.closest('.ant-tree-treenode');
            if (cand) matches.push(cand);
          }
        }
        if (!matches.length) return null;
        let best = matches[0], bd = getDepth(best);
        for (const m of matches) {
          const d = getDepth(m);
          if (d < bd) { best = m; bd = d; }
        }
        // expand ancestors
        let ancestor = best.parentElement ? best.parentElement.closest('.ant-tree-treenode') : null;
        const ancestors = [];
        while (ancestor) { ancestors.unshift(ancestor); ancestor = ancestor.parentElement ? ancestor.parentElement.closest('.ant-tree-treenode') : null; }
        for (const anc of ancestors) {
          if (anc.classList && anc.classList.contains('ant-tree-treenode-switcher-close')) {
            clickSwitcherFor(anc);
            await waitForChildren(anc);
            await sleep(120);
          }
        }
        return best;
      }

      // Multi-level: find best first-level match then descend
      const firstTitle = pathArray[0];
      let allFirst = Array.from(rootDoc.querySelectorAll('.ant-tree-treenode')).filter(n => titleOf(n) === firstTitle);
      if (!allFirst.length) return null;
      // pick shallowest
      let current = allFirst.reduce((best, cur) => getDepth(cur) < getDepth(best) ? cur : best, allFirst[0]);

      for (let i = 1; i < pathArray.length; i++) {
        const nextTitle = pathArray[i];
        if (current.classList && current.classList.contains('ant-tree-treenode-switcher-close')) {
          clickSwitcherFor(current);
          await waitForChildren(current);
          await sleep(120);
        }
        let child = findChildNodeByTitle(current, nextTitle);
        if (!child) {
          clickSwitcherFor(current);
          await waitForChildren(current);
          await sleep(160);
          child = findChildNodeByTitle(current, nextTitle);
        }
        if (!child) return null;
        current = child;
      }
      return current;
    } catch (_) { return null; }
  }

  async function selectNode(rootDoc, node) {
    try {
      if (!node) return false;
      const wrapper = node.querySelector('.ant-tree-node-content-wrapper') || node.querySelector('.ant-tree-title') || node;
      if (!wrapper) return false;
      robustClick(wrapper);
      try { node.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (_) {}
      await sleep(CLICK_WAIT);
      return true;
    } catch (_) { return false; }
  }

  function aggressiveFindNodeByTitle(rootDoc, title) {
    try {
      if (!title) return null;
      const direct = Array.from(rootDoc.querySelectorAll('.ant-tree-title')).find(el => (el.textContent || '').trim() === title);
      if (direct) return direct.closest('.ant-tree-treenode') || null;
      const byAttr = Array.from(rootDoc.querySelectorAll('[title]')).find(el => el.getAttribute('title') === title);
      if (byAttr) return byAttr.closest('.ant-tree-treenode') || null;
      const candidates = Array.from(rootDoc.querySelectorAll('.ant-tree-treenode'));
      for (const cand of candidates) {
        if (titleOf(cand) === title) return cand;
      }
      return null;
    } catch (_) { return null; }
  }

  async function tryRestoreIn(rootDoc) {
    try {
      const storedPath = loadPath();
      if (!storedPath || !Array.isArray(storedPath) || storedPath.length === 0) return false;
      // wait for tree
      const treePresent = await waitForSelector(rootDoc, '.ant-tree-list-holder-inner, .ant-tree-list', 5000);
      if (!treePresent) return false;

      // path-driven attempt
      const finalNode = await expandPathSequentially(rootDoc, storedPath);
      if (finalNode) {
        const ok = await selectNode(rootDoc, finalNode);
        if (ok) { showToast(rootDoc, `Restored folder: ${storedPath[storedPath.length - 1]}`); return true; }
      }

      // fallback aggressive by last title
      const lastTitle = storedPath[storedPath.length - 1];
      const aggressive = aggressiveFindNodeByTitle(rootDoc, lastTitle);
      if (aggressive) {
        // expand ancestors
        let anc = aggressive.parentElement ? aggressive.parentElement.closest('.ant-tree-treenode') : null;
        const ancestors = [];
        while (anc) { ancestors.unshift(anc); anc = anc.parentElement ? anc.parentElement.closest('.ant-tree-treenode') : null; }
        for (const a of ancestors) {
          if (a.classList && a.classList.contains('ant-tree-treenode-switcher-close')) {
            clickSwitcherFor(a);
            await waitForChildren(a);
            await sleep(80);
          }
        }
        const ok2 = await selectNode(rootDoc, aggressive);
        if (ok2) { showToast(rootDoc, `Restored folder: ${lastTitle}`); return true; }
      }
      return false;
    } catch (_) { return false; }
  }

  // helper: wait for selector in rootDoc
  function waitForSelector(rootDoc, selector, timeout = 4000) {
    return new Promise((resolve) => {
      const start = Date.now();
      (function check() {
        try {
          if (rootDoc.querySelector(selector)) return resolve(true);
        } catch (_) {}
        if (Date.now() - start > timeout) return resolve(false);
        setTimeout(check, POLL_MS);
      })();
    });
  }

  // --- Click capture (store path on click) ---
  function buildPathFromNode(rootDoc, treenodeEl) {
    try {
      const path = [];
      let el = treenodeEl;
      while (el) {
        if (el.classList && el.classList.contains('ant-tree-treenode')) {
          const t = titleOf(el);
          if (t) path.push(t);
        }
        el = el.parentElement ? el.parentElement.closest('.ant-tree-treenode') : null;
      }
      return path.reverse();
    } catch (_) { return []; }
  }

  function wireClickCapture(rootDoc) {
    try {
      if (rootDoc.__cp_last_folder_listener_attached) return;
      const treeRoot = rootDoc.querySelector('[role="tree"], .ant-tree-list-holder-inner, .ant-tree');
      if (!treeRoot) return;
      treeRoot.addEventListener('click', (ev) => {
        try {
          const target = ev.target;
          const clickable = target.closest ? target.closest('.ant-tree-node-content-wrapper, .ant-tree-title, .ant-tree-switcher') : null;
          if (!clickable) return;
          const treenode = clickable.closest('.ant-tree-treenode');
          if (!treenode) return;
          const path = buildPathFromNode(rootDoc, treenode);
          if (path && path.length) savePath(path);
        } catch (_) {}
      }, { capture: false });
      rootDoc.__cp_last_folder_listener_attached = true;
    } catch (_) {}
  }

  // --- Toast for visual feedback ---
  function showToast(doc, message) {
    try {
      const id = '__cp_toolkit_restore_toast';
      const modal = document.querySelector('#mvcModal2');
      const container = (modal && modal.querySelector && modal.querySelector('.modalContent')) || (doc && doc.body) || document.body;
      if (!container) return;
      let toast = container.querySelector('#' + id);
      if (!toast) {
        toast = (doc || document).createElement('div');
        toast.id = id;
        toast.style.position = 'fixed';
        toast.style.right = '12px';
        toast.style.top = '12px';
        toast.style.zIndex = '999999';
        toast.style.padding = '8px 12px';
        toast.style.background = 'rgba(0,0,0,0.75)';
        toast.style.color = 'white';
        toast.style.borderRadius = '6px';
        toast.style.fontSize = '13px';
        toast.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
        (container instanceof Element ? container : document.body).appendChild(toast);
      }
      toast.textContent = message;
      toast.style.opacity = '1';
      setTimeout(() => {
        try { toast.style.transition = 'opacity 600ms'; toast.style.opacity = '0'; } catch (_) {}
      }, 2500);
      setTimeout(() => {
        try { toast.remove(); } catch (_) {}
      }, 3200);
    } catch (_) {}
  }

  // --- Modal detection + handling ---
  async function handleModalWithIframeParent() {
    try {
      const modal = document.querySelector('#mvcModal2');
      if (!modal) return false;
      if (modal.__cp_remember_handled) return false;
      modal.__cp_remember_handled = true;

      const clearMarkerAndSave = () => {
        try {
          if (modal.__cp_marker_cleanup_done) return;
          modal.__cp_marker_cleanup_done = true;
          const iframe = modal.querySelector('iframe');
          if (iframe && iframe.contentDocument) {
            try {
              const selected = Array.from(iframe.contentDocument.querySelectorAll('.ant-tree-treenode.ant-tree-treenode-selected'));
              if (selected.length) {
                const path = buildPathFromNode(iframe.contentDocument, selected[0]);
                if (path && path.length) savePath(path);
              }
            } catch (_) {}
          }
          try { delete modal.__cp_remember_handled; } catch (_) { modal.__cp_remember_handled = false; }
        } catch (_) {}
      };

      try {
        const closeBtn = modal.querySelector && modal.querySelector('.modalClose');
        if (closeBtn && !closeBtn.__cp_close_handler) {
          closeBtn.addEventListener('click', (ev) => { setTimeout(clearMarkerAndSave, 6); }, { once: false });
          closeBtn.__cp_close_handler = true;
        }
      } catch (_) {}

      try {
        const observer = new MutationObserver((mutations) => {
          for (const m of mutations) {
            if (m.removedNodes && m.removedNodes.length) {
              for (const node of m.removedNodes) {
                try {
                  if (!(node instanceof Element)) continue;
                  if (node === modal || (node.querySelector && node.querySelector('#mvcModal2'))) {
                    clearMarkerAndSave();
                    try { observer.disconnect(); } catch (_) {}
                    return;
                  }
                } catch (_) {}
              }
            }
          }
        });
        observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
      } catch (_) {}

      const iframe = modal.querySelector('iframe');
      if (!iframe) {
        wireClickCapture(document);
        for (const ms of RETRY_SCHEDULE) {
          await sleep(ms);
          const ok = await tryRestoreIn(document);
          if (ok) return true;
        }
        return false;
      }

      if (!iframe.contentDocument || iframe.contentDocument.readyState !== 'complete') {
        await new Promise(r => {
          iframe.addEventListener('load', r, { once: true });
          setTimeout(r, 1200);
        });
      }
      const rootDoc = iframe.contentDocument;
      if (!rootDoc) return false;

      wireClickCapture(rootDoc);

      for (const ms of RETRY_SCHEDULE) {
        await sleep(ms);
        const ok = await tryRestoreIn(rootDoc);
        if (ok) return true;
      }
      return false;
    } catch (_) { return false; }
  }

  function observeParentForModal() {
    try {
      if (document.querySelector('#mvcModal2')) setTimeout(() => { handleModalWithIframeParent(); }, 120);
      const body = document.body || document.documentElement;
      if (!body) return;
      const obs = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.addedNodes && m.addedNodes.length) {
            for (const node of m.addedNodes) {
              try {
                if (!(node instanceof Element)) continue;
                if (node.matches && node.matches('#mvcModal2') || (node.querySelector && node.querySelector('#mvcModal2'))) {
                  const modal = node.matches && node.matches('#mvcModal2') ? node : node.querySelector('#mvcModal2');
                  setTimeout(() => { try { handleModalWithIframeParent(); } catch (_) {} }, 80);
                  return;
                }
              } catch (_) {}
            }
          }
        }
      });
      obs.observe(body, { childList: true, subtree: true });
    } catch (_) {}
  }

  function wireHostIfPresent() {
    try { setTimeout(() => { wireClickCapture(document); }, 200); } catch (_) {}
  }

  // init
  (function init() {
    try {
      observeParentForModal();
      wireHostIfPresent();
    } catch (_) {}
  })();

  // public API
  window.CPToolkit = window.CPToolkit || {};
  window.CPToolkit.rememberLastImageFolder = {
    restoreNow: async function () {
      try {
        if (document.querySelector('#mvcModal2')) { await handleModalWithIframeParent(); return; }
        await tryRestoreIn(document);
      } catch (_) {}
    },
    clearStored: function () { savePath([]); },
    readStored: loadPath
  };

})();

