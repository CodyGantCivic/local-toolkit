// ==UserScript==
// @name         CivicPlus — GraphicLinkAutofill (patched with documentID, passive)
// @namespace    http://your-org.example/
// @version      1.4.0-patched-5
// @description  Auto-fill graphic link URLs on /admin/graphiclinks.aspx. Handles documentID, imageDocumentId hidden input, and other fallbacks. Detects Fancy Button image selection but does NOT modify modal visuals (stores metadata only).
// @author       You
// @match        *://*/admin/graphiclinks.aspx*
// @match        *://*/Admin/graphicLinks.aspx*
// @match        *://*/*graphiclinks.aspx*
// @match        *://*/*GraphicLinks.aspx*
// @run-at       document-end
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function (global) {
  'use strict';
  const NAME = 'GraphicLinkAutofill';
  const SCRIPT_VERSION = '1.4.0-patched-5';
  const LOG = 'CP Toolkit: GraphicLinkAutofill -';

  function log(){ try{ console.log(LOG, ...arguments); }catch(e){} }
  function warn(){ try{ console.warn(LOG, ...arguments); }catch(e){} }
  function err(){ try{ console.error(LOG, ...arguments); }catch(e){} }

  // quick injection indicator for debugging — remove later if you want
  try{ console.log(LOG, 'userscript loaded (version', SCRIPT_VERSION, ').'); }catch(e){}

  // ensure global object exists immediately
  global[NAME] = global[NAME] || {};
  if (global[NAME].__installed && global[NAME].version === SCRIPT_VERSION) {
    // same version already installed
    return;
  }
  global[NAME].version = SCRIPT_VERSION;

  // Embedded mapping
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
            return;
          }
        } catch (e) { /* ignore */ }
      }
      replacementMap = EMBEDDED_MAPPING;
      mappingLoaded = true;
    } catch (e) {
      replacementMap = EMBEDDED_MAPPING;
      mappingLoaded = true;
    }
  }

  function saveMappingOverride(obj) {
    try {
      if (typeof GM_setValue === 'function') {
        GM_setValue('GraphicLinkMapping', obj);
        replacementMap = obj;
        mappingLoaded = true;
        return true;
      }
    } catch (e) {}
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
      if (document.getElementById('enableGraphicButtonAutochange')) return;

      const wrapper = document.createElement('div');
      wrapper.id = 'cp-toolkit-graphiclink-wrapper';
      wrapper.style.marginTop = '6px';
      wrapper.innerHTML =
        "<label style='display:flex;gap:.5rem;align-items:center;'>" +
        "<input id='enableGraphicButtonAutochange' type='checkbox'/>[CP Toolkit] Enable graphic link autochanger" +
        '</label>' +
        "<div id='graphicButtonChangeWarn' style='color:red;margin-top:6px;'></div>";

      const linkInput = document.getElementById('linkUrl');
      if (linkInput && linkInput.parentNode) {
        const label = linkInput.closest('label');
        if (label && label.parentNode) {
          label.parentNode.insertBefore(wrapper, label.nextSibling);
        } else {
          linkInput.parentNode.appendChild(wrapper);
        }
      } else {
        document.body.appendChild(wrapper);
      }

      const checkbox = document.getElementById('enableGraphicButtonAutochange');
      if (linkInput && checkbox && linkInput.value.trim() === '') {
        checkbox.checked = true;
      }
    } catch (e) { /* keep silent */ }
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
      }
    } catch (e) { /* keep silent */ }
  }

  function checkFancyButton() {
    try {
      const container = document.querySelector('.fancyButtonContainer .text') || document.querySelector('.fancyButton .text');
      if (!container) return;
      const raw = container.innerHTML || '';
      const words = raw.replace(/([\s\n]*<[^>]*>[\s\n]*)+/g, ' ').trim().split(/\s+/);
      words.forEach((w)=> { try { checkForLink(w); } catch(e){} });
    } catch (e) { /* keep silent */ }
  }

  // Improved checkRegularButton with documentID / hidden input / fallbacks
  function checkRegularButton() {
    try {
      const imgElem = document.querySelector('.imagePreview');
      if (!imgElem) return;

      let imageID = null;
      try {
        const src = imgElem.getAttribute('src') || '';
        const qidx = src.indexOf('?');
        if (qidx >= 0) {
          const qp = new URLSearchParams(src.slice(qidx + 1));
          if (qp.has('id')) imageID = qp.get('id');
          else if (qp.has('imageID')) imageID = qp.get('imageID');
          else if (qp.has('documentID')) imageID = qp.get('documentID'); // handle documentID
        }
      } catch (e) {}

      // Fallback to hidden input (.imageDocumentId or input[name=ImageDocumentId])
      if (!imageID) {
        const hiddenId = document.querySelector('input.imageDocumentId, input[name="ImageDocumentId"]');
        if (hiddenId && hiddenId.value) {
          imageID = hiddenId.value;
        }
      }

      // Fallback: visible path text
      if (!imageID) {
        const pathDisplay = document.querySelector('.imagePathDisplay') || document.querySelector('#imageLocation');
        if (pathDisplay && pathDisplay.textContent) {
          try {
            const qp = new URLSearchParams((pathDisplay.textContent || '').split('?')[1] || '');
            if (qp.has('documentID')) imageID = qp.get('documentID');
          } catch (e) {}
        }
      }

      // Last fallback: numeric segment in src path
      if (!imageID) {
        try {
          const src = imgElem.getAttribute('src') || '';
          const segs = src.split('/');
          for (let i = segs.length - 1; i >= 0; i--) {
            if (/^\d+$/.test(segs[i])) { imageID = segs[i]; break; }
          }
        } catch (e) {}
      }

      if (!imageID) return;

      const detailsUrl = '/Admin/DocumentCenter/DocumentForModal/Edit/' + encodeURIComponent(imageID) + '?folderID=1';
      fetch(detailsUrl, { cache: 'no-store' }).then(r => r.ok ? r.text() : Promise.reject('network')).then(html => {
        try {
          const wrapper = document.createElement('div'); wrapper.innerHTML = html;
          const alt = wrapper.querySelector('#txtAltText'); const name = wrapper.querySelector('#txtDocumentName');
          checkForLink((name && name.value) || '');
          checkForLink((alt && alt.value) || '');
        } catch (e) { /* keep silent */ }
      }).catch(() => { /* keep behavior consistent with original */ });

    } catch (e) { /* keep silent */ }
  }

  function attachHandlers() {
    try {
      const imgElem = document.querySelector('.imagePreview');
      if (imgElem && !imgElem.__cp_observer) {
        try {
          const obs = new MutationObserver(()=>checkRegularButton());
          obs.observe(imgElem, {attributes:true, attributeFilter:['src','class']});
          imgElem.__cp_observer = obs;
        } catch(e){}
      }
      const fancy = document.querySelector('.fancyButtonContainer');
      if (fancy && !fancy.__cp_observer) {
        try {
          const obs2 = new MutationObserver(()=>checkFancyButton());
          obs2.observe(fancy, {childList:true, subtree:true});
          fancy.__cp_observer = obs2;
        } catch(e){}
      }
      const chk = document.getElementById('enableGraphicButtonAutochange');
      if (chk && !chk.__cp) {
        chk.addEventListener('change', ()=>{ checkFancyButton(); checkRegularButton(); });
        chk.__cp = true;
      }
    } catch(e){}
  }

  // ============================================================
  // Fancy Button image wiring (integrated) - passive mode
  // ============================================================
  // This adds listeners & observer logic so when a user chooses an image inside the Fancy Button modal
  // we capture the selected documentID and persist it to the hidden input. IMPORTANT: do not change modal visuals here.

  function findFancyButtonElements(root) {
    try {
      root = root || document;
      const container =
        root.querySelector('.fancyButtonContainer') ||
        root.querySelector('.buttonCanvas') ||
        root.querySelector('.fancyButtonPreview') ||
        root.querySelector('.imageRepository');

      if (!container) return null;

      const previewAnchor = container.querySelector('.fancyButton.fancyButton1') || container.querySelector('.fancyButton');
      const textEl = container.querySelector('.fancyButton1 .text') || container.querySelector('.fancyButton .text') || container.querySelector('.text.autoUpdate.textContent');
      const imagePreview = container.querySelector('.imagePreview') || root.querySelector('.imagePreview');
      const hiddenId = container.querySelector('input.imageDocumentId, input[name="ImageDocumentId"]') || root.querySelector('input.imageDocumentId, input[name="ImageDocumentId"]');
      const modifyBtn = container.querySelector('button.modifyImage, button.modify');
      const removeBtn = container.querySelector('button.removeImage, button.remove');

      return { container, previewAnchor, textEl, imagePreview, hiddenId, modifyBtn, removeBtn };
    } catch (e) {
      return null;
    }
  }

  function extractDocumentId(root, els) {
    try {
      if (!els) return null;
      // 1) hidden input
      if (els.hiddenId && els.hiddenId.value && String(els.hiddenId.value).trim()) {
        return String(els.hiddenId.value).trim();
      }
      // 2) imagePreview src query param
      if (els.imagePreview && els.imagePreview.src) {
        try {
          const src = els.imagePreview.getAttribute('src') || '';
          const q = src.split('?')[1] || '';
          const qp = new URLSearchParams(q);
          if (qp.has('documentID')) return qp.get('documentID');
          if (qp.has('id')) return qp.get('id');
          if (qp.has('imageID')) return qp.get('imageID');
        } catch (e) {}
      }
      // 3) path display text
      const pathEl = root.querySelector('.imagePathDisplay, #imageLocation');
      if (pathEl && pathEl.textContent) {
        const m = (pathEl.textContent || '').match(/documentID=(\d+)/i);
        if (m) return m[1];
      }
      // 4) last fallback: numeric segment in imagePreview src
      if (els.imagePreview && els.imagePreview.src) {
        try {
          const segs = els.imagePreview.getAttribute('src').split('/');
          for (let i = segs.length - 1; i >= 0; i--) {
            if (/^\d+$/.test(segs[i])) return segs[i];
          }
        } catch (e) {}
      }
      return null;
    } catch (e) { return null; }
  }

  function applyFancyButtonImage(root) {
    try {
      const els = findFancyButtonElements(root);
      if (!els) return;
      const docId = extractDocumentId(root, els);
      if (!docId) return;

      const repoUrl = '/ImageRepository/Document?documentID=' + encodeURIComponent(docId);

      // IMPORTANT CHANGE: Do NOT set inline background-image or otherwise mutate the visual preview.
      // Instead store the selected documentID on the preview elements as metadata so the selection persists
      // and the hidden input can be set. This keeps the modal visuals under the editor's control.
      try {
        if (els.previewAnchor) {
          els.previewAnchor.setAttribute('data-image-docid', String(docId));
        } else if (els.textEl) {
          els.textEl.setAttribute('data-image-docid', String(docId));
        }
      } catch (e) { /* ignore */ }

      // Add marker class on preview anchor (non-visual marker; keep for compatibility)
      if (els.previewAnchor) {
        try { els.previewAnchor.classList.add('has-image'); } catch (e) {}
      }

      // Set hidden input so save persists it
      if (els.hiddenId) {
        try { els.hiddenId.value = docId; els.hiddenId.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
      }

      // Sync small image preview src (this is the small image thumbnail in the modal, safe to update)
      if (els.imagePreview) {
        try { els.imagePreview.src = repoUrl; els.imagePreview.style.display = ''; } catch (e) {}
      }

      // Show modify/remove if present
      if (els.modifyBtn) els.modifyBtn.style.display = '';
      if (els.removeBtn) els.removeBtn.style.display = '';
    } catch (e) {
      console.error(LOG, 'applyFancyButtonImage error', e);
    }
  }

  // Attach MutationObserver for dynamic modal insertion and attribute updates
  const fancyObserver = new MutationObserver(function(mutations) {
    try {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.target && m.target.classList && m.target.classList.contains('imagePreview')) {
          setTimeout(()=>applyFancyButtonImage(m.target.closest('.fancyButtonContainer') || document), 60);
        }
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches && node.matches('.fancyButtonContainer, .buttonCanvas, .imageRepository, .fancyButtonPreview')) {
            setTimeout(()=>applyFancyButtonImage(node), 120);
          } else if (node.querySelector && node.querySelector('.fancyButtonContainer, .imageRepository')) {
            setTimeout(()=>applyFancyButtonImage(node), 120);
          }
        }
      }
    } catch (e) { console.error(LOG, e); }
  });
  try { fancyObserver.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['src'] }); } catch (e) {}

  // Click delegation for Insert/Modify/Remove
  document.addEventListener('click', function(evt) {
    try {
      const el = evt.target;
      if (!el) return;
      // Insert/Choose image buttons
      if (el.matches && (el.matches('button.chooseImage') || el.closest && el.closest('button.chooseImage'))) {
        setTimeout(()=>applyFancyButtonImage(el.closest('.fancyButtonContainer') || document), 350);
      }
      // Remove image
      if (el.matches && (el.matches('button.removeImage') || el.closest && el.closest('button.removeImage') || el.matches('button.remove') || el.closest && el.closest('button.remove'))) {
        const root = el.closest('.fancyButtonContainer') || document;
        const els = findFancyButtonElements(root);
        // Do not mutate visual backgrounds. Remove metadata and hidden input instead.
        if (els && els.textEl) {
          try {
            els.textEl.removeAttribute('data-image-docid');
            els.textEl.classList.remove('has-image');
          } catch (e) {}
        }
        if (els && els.previewAnchor) {
          try {
            els.previewAnchor.removeAttribute('data-image-docid');
            els.previewAnchor.classList.remove('has-image');
          } catch (e) {}
        }
        if (els && els.hiddenId) { try { els.hiddenId.value = ''; els.hiddenId.dispatchEvent(new Event('change',{bubbles:true})); } catch(e){} }
        if (els && els.imagePreview) { els.imagePreview.src = ''; els.imagePreview.style.display = 'none'; }
      }
    } catch (e) { /* ignore */ }
  }, true);

  // Initial attempt in case modal already open
  setTimeout(()=>applyFancyButtonImage(document), 300);

  // ============================================================
  // Original script init / attach logic (unchanged)
  // ============================================================

  async function init() {
    if (global[NAME].__initing) { return; }
    global[NAME].__initing = true;
    try {
      await loadMapping();

      // Guard: only fully init if the expected link input exists on the page.
      // This prevents accidental init on unrelated graphiclinks-like pages.
      const linkInput = await waitForElement('#linkUrl', 6000);
      if (!linkInput) {
        log('GraphicLinkAutofill: #linkUrl not found; aborting init.');
        return;
      }

      setupUI();
      attachHandlers();
      checkFancyButton();
      checkRegularButton();
    } catch (e) {}
  }

  // Tampermonkey menu helpers
  try {
    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand('CP Toolkit: Force init GraphicLinkAutofill', ()=>{ init(); });
      GM_registerMenuCommand('CP Toolkit: Clear mapping override', ()=>{ try { GM_setValue && GM_setValue('GraphicLinkMapping', null); replacementMap = EMBEDDED_MAPPING; mappingLoaded = true; alert('cleared mapping override'); } catch(e){ alert('clear failed '+e); }});    }
  } catch(e){ /* ignore */ }

  // auto-init fallback
  setTimeout(()=>{ try{ init(); } catch(e){} }, 300);

  // Expose API
  global[NAME].init = init;
  global[NAME].loadMapping = loadMapping;
  global[NAME].saveMappingOverride = saveMappingOverride;
  global[NAME].getReplacementMap = ()=>replacementMap;

  global[NAME].__installed = true;

})(window);




