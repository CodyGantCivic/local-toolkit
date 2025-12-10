// ==UserScript==
// @name         CP Toolkit — Graphic Link Autofill (fixed)
// @namespace    http://your-org.example/
// @version      1.4.0
// @description  Auto-fill graphic link URLs only on /admin/graphiclinks.aspx (Tampermonkey-ready, embedded mapping + GM override)
// @author       You
// @match        *://*/admin/graphiclinks.aspx*
// @match        *://*/Admin/GraphicLinks.aspx*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function (global) {
  'use strict';
  const NAME = 'GraphicLinkAutofill';
  const LOG = 'CP Toolkit: GraphicLinkAutofill -';
  if (!global.console) global.console = {};
  function log(...a){ console.log(LOG, ...a); }
  function warn(...a){ console.warn(LOG, ...a); }
  function err(...a){ console.error(LOG, ...a); }

  // prevent double-install when editing/quick-reloading
  global[NAME] = global[NAME] || {};
  if (global[NAME].__installed) {
    log('already installed (skipping).');
    return;
  }

  // --- Embedded mapping (user-provided) ---
  const EMBEDDED_MAPPING = {
    "/archive": ["Transparency", "Archive Center", "Archives", "Archive"],
    "/agendacenter": ["Agenda", "Agendas", "Minutes", "Agendas & Minutes"],
    "/alertcenter": ["Weather Alerts","Closings","Emergency Alerts","Alerts","Alert Center","Weather Alerts/Closings","Alert"],
    "/bids.aspx": ["Bid Opportunities","Bids","Bids & RFPs","Bids and RFPs","Bid"],
    "/blog.aspx": ["Blog","Mayor's Blog"],
    "/calendar.aspx": ["Events","Calendar","What's Happening"],
    "/communityvoice": ["Community Voice","Share your Ideas","Submit your ideas","Ideas","Voice"],
    "/communityconnection": ["Community Connection"],
    "/documentcenter": ["Document Center","Transparency","Documents"],
    "/ePayment": ["Pay your Bills","Online Bill Pay","Utility Payments","Bill Payment","Bill Pay","Bills","Bill","Online Payment","Payment","Payments"],
    "/facilities": ["Facilities","Rent a Facility","Parks & Facilities","Rental Facilities","Facilities & Reservation"],
    "/faq": ["FAQ","FAQs","Frequently Asked Questions"],
    "/formcenter": ["Form Center","City Forms","Forms & Permits","Online Forms","Forms &amp; Permits","Forms","Permits"],
    "/jobs": ["Jobs","Employment","Join our Team","Careers"],
    "/mediacenter.aspx": ["Media Center","Live Stream","Meeting Videos"],
    "/myaccount": ["My Account","Account Login","Sign In","Site Login","Login"],
    "/civicalerts.aspx": ["News Flash","News","What's Happening"],
    "/list.aspx": ["Notify Me","Notify Me®","Notifications","Sign up for Notifications","Sign up for Alerts","Receive Notifications","Stay Informed","Informed","Connected","Me®"],
    "/citypolls.aspx": ["Opinion Poll","Polls","Poll"],
    "/gallery.aspx": ["Photos","Photo Gallery"],
    "/requesttracker.aspx": ["Report a Concern","Submit a Request","Submit a Concern","Submit a Request/Concern","Let us Know","Concern","Service Request"],
    "/search": ["Search","Site Search"],
    "/directory": ["Directory","Staff","Staff Directory","Contact Us","Contact"],
    "/accessibility": ["Accessibility"],
    "https://www.civicplus.com/": ["CivicPlus","Government Websites by CivicPlus","Civic","Plus"],
    "/site/copyright": ["Copyright","Copyright Notices"],
    "/disclaimer": ["Disclaimer"],
    "/privacy": ["Privacy Policy","Privacy"],
    "/sitemap": ["Sitemap","Site Map"],
    "/": ["Home","Homepage","Example","Example Item"],
    "/facebook": ["Facebook","Facebook1","Facebook 1"],
    "/twitter": ["Twitter","Twitter1","Twitter 1"],
    "/instagram": ["Instagram","Instagram1","Instagram 1"],
    "/youtube": ["YouTube","YouTube1","YouTube 1"],
    "/linkedin": ["LinkedIn","LinkedIn1","LinkedIn 1"],
    "/pinterest": ["Pinterest","Pinterest1","Pinterest 1"],
    "/vimeo": ["Vimeo","Vimeo1","Vimeo 1"],
    "/nextdoor": ["Nextdoor","Nextdoor1","Nextdoor 1"],
    "/X": ["X","X1","X 1"],
    "/nixle": ["Nixle","Nixle1","Nixle 1"]
  };

  let replacementMap = {};
  let mappingLoaded = false;

  // ---------- helpers ----------
  function safeJSONParse(s, fallback) {
    try { return JSON.parse(s); } catch (e) { return fallback; }
  }

  async function loadMapping() {
    try {
      if (mappingLoaded) return;
      if (typeof GM_getValue === 'function') {
        try {
          const stored = GM_getValue('GraphicLinkMapping', null);
          if (stored) {
            replacementMap = (typeof stored === 'string') ? safeJSONParse(stored, EMBEDDED_MAPPING) : stored;
            mappingLoaded = true;
            log('mapping loaded from GM storage override.');
            return;
          }
        } catch (e) { warn('GM_getValue error', e); }
      }
      replacementMap = EMBEDDED_MAPPING;
      mappingLoaded = true;
      log('using embedded mapping.');
    } catch (e) {
      replacementMap = EMBEDDED_MAPPING;
      mappingLoaded = true;
      err('loadMapping error', e);
    }
  }

  function saveMappingOverride(obj) {
    try {
      if (typeof GM_setValue === 'function') {
        GM_setValue('GraphicLinkMapping', obj);
        replacementMap = obj;
        mappingLoaded = true;
        log('saved mapping override to GM storage.');
        return true;
      }
    } catch (e) { warn('saveMappingOverride failed', e); }
    return false;
  }

  function waitForElement(selector, timeout = 6000) {
    return new Promise((resolve) => {
      try {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        const obs = new MutationObserver(() => {
          const el2 = document.querySelector(selector);
          if (el2) { obs.disconnect(); resolve(el2); }
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
        setTimeout(() => { try { obs.disconnect(); } catch (e) {} ; resolve(null); }, timeout);
      } catch (e) { resolve(null); }
    });
  }

  function setupUI() {
    try {
      if (document.getElementById('enableGraphicButtonAutochange')) { log('UI already present'); return; }
      const wrapper = document.createElement('div');
      wrapper.id = 'cp-toolkit-graphiclink-wrapper';
      wrapper.style.marginTop = '6px';
      wrapper.innerHTML =
        "<label style='display:flex;gap:.5rem;align-items:center;'><input id='enableGraphicButtonAutochange' type='checkbox'/>[CP Toolkit] Enable graphic link autochanger</label>" +
        "<div id='graphicButtonChangeWarn' style='color:red;margin-top:6px;'></div>";
      const linkInput = document.getElementById('linkUrl');
      if (linkInput && linkInput.parentNode) {
        const label = linkInput.closest('label');
        if (label && label.parentNode) label.parentNode.insertBefore(wrapper, label.nextSibling);
        else linkInput.parentNode.appendChild(wrapper);
      } else {
        document.body.appendChild(wrapper);
      }
      const chk = document.getElementById('enableGraphicButtonAutochange');
      if (linkInput && chk && linkInput.value === '') chk.checked = true;
      log('UI inserted');
    } catch (e) { warn('setupUI failed', e); }
  }

  function checkForLink(theText) {
    try {
      const checkbox = document.getElementById('enableGraphicButtonAutochange');
      if (!checkbox || !checkbox.checked) return;
      if (!theText) return;
      const text = String(theText).trim().toLowerCase();
      let urlFromText = null;
      Object.keys(replacementMap || {}).some((linkUrl) => {
        const arr = replacementMap[linkUrl] || [];
        return arr.some((m) => {
          if (!m) return false;
          try { if (text === String(m).toLowerCase()) { urlFromText = linkUrl; return true; } } catch (e) {}
          return false;
        });
      });
      const linkInput = document.getElementById('linkUrl');
      if (urlFromText && linkInput && linkInput.value !== urlFromText) {
        linkInput.value = urlFromText;
        const warnEl = document.getElementById('graphicButtonChangeWarn');
        if (warnEl) warnEl.textContent = 'Notice: The link was autochanged by the CivicPlus Toolkit. Save the button to persist.';
        log('auto-changed link to', urlFromText, 'based on text', theText);
      }
    } catch (e) { warn('checkForLink error', e); }
  }

  function checkFancyButton() {
    try {
      const container = document.querySelector('.fancyButtonContainer .text');
      if (!container) return;
      const raw = container.innerHTML || '';
      const words = raw.replace(/([\s\n]*<[^>]*>[\s\n]*)+/g, ' ').trim().split(/\s+/);
      words.forEach((w)=> { try { checkForLink(w); } catch(e){} });
      log('checked fancy button');
    } catch (e) { warn('checkFancyButton failed', e); }
  }

  function checkRegularButton() {
    try {
      const imgElem = document.querySelector('.imagePreview');
      if (!imgElem) return;
      const src = imgElem.getAttribute('src') || '';
      let imageID = null;
      try {
        const qidx = src.indexOf('?');
        if (qidx >= 0) {
          const qp = new URLSearchParams(src.slice(qidx+1));
          if (qp.has('id')) imageID = qp.get('id');
          else if (qp.has('imageID')) imageID = qp.get('imageID');
        }
      } catch (e){}
      if (!imageID) {
        const segs = src.split('/');
        for (let i = segs.length-1; i>=0; i--) {
          if (/^\d+$/.test(segs[i])) { imageID = segs[i]; break; }
        }
      }
      if (!imageID) return;
      const detailsUrl = '/Admin/DocumentCenter/DocumentForModal/Edit/' + encodeURIComponent(imageID) + '?folderID=1';
      fetch(detailsUrl, {cache:'no-store'}).then(r => r.ok ? r.text() : Promise.reject('network')).then(html=>{
        try {
          const wrapper = document.createElement('div'); wrapper.innerHTML = html;
          const alt = wrapper.querySelector('#txtAltText'); const name = wrapper.querySelector('#txtDocumentName');
          checkForLink((name&&name.value)||''); checkForLink((alt&&alt.value)||'');
          log('checked regular button details for imageID', imageID);
        } catch (e) { warn('parse details failed', e); }
      }).catch(()=>{ warn('fetch details failed for imageID ' + imageID); });
    } catch (e) { warn('checkRegularButton error', e); }
  }

  function attachHandlers() {
    try {
      const imgElem = document.querySelector('.imagePreview');
      if (imgElem && !imgElem.__cp_observer) {
        try {
          const obs = new MutationObserver(()=>checkRegularButton());
          obs.observe(imgElem, {attributes:true, attributeFilter:['src','class']});
          imgElem.__cp_observer = obs;
        } catch(e){ warn('attach img observer failed', e); }
      }
      const fancy = document.querySelector('.fancyButtonContainer');
      if (fancy && !fancy.__cp_observer) {
        try {
          const obs2 = new MutationObserver(()=>checkFancyButton());
          obs2.observe(fancy, {childList:true, subtree:true});
          fancy.__cp_observer = obs2;
        } catch(e){ warn('attach fancy observer failed', e); }
      }
      const chk = document.getElementById('enableGraphicButtonAutochange');
      if (chk && !chk.__cp) {
        chk.addEventListener('change', ()=>{ checkFancyButton(); checkRegularButton(); });
        chk.__cp = true;
      }
      log('handlers attached (if elements present)');
    } catch(e){ warn('attachHandlers failed', e); }
  }

  // Main init (only runs on matched pages because of @match)
  async function init() {
    if (global[NAME].__initing) { log('already initializing'); return; }
    global[NAME].__initing = true;
    log('init starting');
    try {
      await loadMapping();
      const linkInput = await waitForElement('#linkUrl', 6000);
      if (!linkInput) log('warning: #linkUrl not found in 6s (continuing anyway)');
      setupUI();
      attachHandlers();
      checkFancyButton();
      checkRegularButton();
      log('init finished');
    } catch (e) { err('init threw', e); }
  }

  // Tampermonkey menu helpers
  try {
    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand('CP Toolkit: Force init GraphicLinkAutofill', ()=>{ init(); alert('init invoked (check console)'); });
      GM_registerMenuCommand('CP Toolkit: Clear mapping override', ()=>{ try { GM_setValue && GM_setValue('GraphicLinkMapping', null); replacementMap = EMBEDDED_MAPPING; mappingLoaded = true; alert('cleared mapping override'); } catch(e){ alert('clear failed '+e); }});
    }
  } catch(e){ warn('menu registration failed', e); }

  // auto-init short delay
  setTimeout(()=>{ try{ init(); } catch(e){ warn('auto-init failed', e); } }, 300);

  // Expose API for debugging
  global[NAME].init = init;
  global[NAME].loadMapping = loadMapping;
  global[NAME].saveMappingOverride = saveMappingOverride;
  global[NAME].getReplacementMap = ()=>replacementMap;
  global[NAME].__installed = true;

  log('script installed and ready');
})(window);

