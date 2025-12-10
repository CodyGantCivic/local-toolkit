// ==UserScript==
// @name         CivicPlus - Module Icons
// @namespace    http://civicplus.com/
// @version      1.0.0
// @description  Adds default FontAwesome icons to CivicPlus module list items in Admin UI based on modules.json mapping
// @author       CivicPlus
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  const TOOLKIT_NAME = '[CP Toolkit - Module Icons]';

  if (window.ModuleIcons && window.ModuleIcons.__loaded) return;

  window.ModuleIcons = {
    __loaded: false,

    init: async function () {
      if (window.ModuleIcons.__loaded) return;
      window.ModuleIcons.__loaded = true;

      console.log(`${TOOLKIT_NAME} Init`);

      if (window.CPToolkit && typeof window.CPToolkit.isCivicPlusSite === 'function') {
        try {
          const isCP = await window.CPToolkit.isCivicPlusSite();
          if (!isCP) {
            console.log(`${TOOLKIT_NAME} Skipped (non-CivicPlus site)`);
            return;
          }
        } catch {
          // Allow fallback
        }
      }

      function ensureFontAwesome() {
        return new Promise((resolve) => {
          if (document.querySelector('.fa, .fas, .far, .fal, .fab')) return resolve();
          if (document.getElementById('moduleicons-fa')) return setTimeout(resolve, 200);
          const link = document.createElement('link');
          link.id = 'moduleicons-fa';
          link.rel = 'stylesheet';
          link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css';
          link.onload = resolve;
          link.onerror = resolve;
          document.head.appendChild(link);
        });
      }

      function waitForElement(selector, timeout = 4000) {
        return new Promise((resolve) => {
          const el = document.querySelector(selector);
          if (el) return resolve(el);
          const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) {
              observer.disconnect();
              resolve(el);
            }
          });
          observer.observe(document.documentElement, { childList: true, subtree: true });
          setTimeout(() => {
            observer.disconnect();
            resolve(null);
          }, timeout);
        });
      }

      async function getModules() {
        if (window.CPToolkit?.modulesJson) return window.CPToolkit.modulesJson;
        try {
          const resp = await fetch('https://raw.githubusercontent.com/CodyGantCivic/toolkit-data/main/data/modules.json', { cache: 'no-store' });
          if (!resp.ok) throw new Error('modules.json fetch failed');
          const data = await resp.json();
          if (window.CPToolkit) window.CPToolkit.modulesJson = data;
          return data;
        } catch {
          console.warn(`${TOOLKIT_NAME} Failed to load modules.json`);
          return null;
        }
      }

      async function addIcons() {
        const modules = await getModules();
        if (!modules) return;
        await ensureFontAwesome();
        try {
          for (const group in modules) {
            for (const name in modules[group]) {
              const def = modules[group][name];
              if (!def['default-favorite'] || !def['default-icon']) continue;
              const url = def.url;
              const faClass = def['default-icon'];
              const links = document.querySelectorAll(`.cp-ModuleList-itemLink[href*="${url}"]`);
              links.forEach(link => {
                if (link.dataset.moduleIconsAdded) return;
                const icon = document.createElement('i');
                icon.className = faClass;
                const spacer = document.createTextNode('\u00A0\u00A0');
                link.insertBefore(icon, link.firstChild);
                link.insertBefore(spacer, link.firstChild.nextSibling);
                link.style.fontWeight = 'bold';
                link.dataset.moduleIconsAdded = 'true';
              });
            }
          }
        } catch (err) {
          console.warn(`${TOOLKIT_NAME} Icon injection error:`, err);
        }
      }

      const anchor = await waitForElement('.cp-ModuleList-itemLink', 4000);
      if (anchor) addIcons();
      setTimeout(addIcons, 2000); // retry to catch any later DOM changes
    }
  };

  // Init immediately
  window.ModuleIcons.init();
})();
