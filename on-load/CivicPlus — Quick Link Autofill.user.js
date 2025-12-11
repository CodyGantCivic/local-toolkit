// ==UserScript==
// @name         CivicPlus — Quick Link Autofill
// @namespace    http://your-org.example/
// @version      1.0.0
// @description  Auto-fill quick link URLs on /admin/quicklinks.aspx using an embedded mapping. Supports GM storage override.
// @match        *://*/admin/quicklinks.aspx*
// @match        *://*/Admin/QuickLinks.aspx*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function (window, document) {
  'use strict';

  const LOG = '[CP Toolkit][quick-link-autofill]';
  function log(...args) { try { console.log(LOG, ...args); } catch (e) {} }
  function warn(...args) { try { console.warn(LOG, ...args); } catch (e) {} }

  // --- Embedded mapping (use your JSON here) ---
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

  // runtime mapping (may be overridden)
  let replacementMap = {};

  // Load mapping: prefer GM override, otherwise use embedded mapping
  async function loadMapping() {
    try {
      if (typeof GM_getValue === 'function') {
        const stored = GM_getValue('GraphicLinkMapping', null);
        if (stored) {
          if (typeof stored === 'string') {
            try { replacementMap = JSON.parse(stored); log('loaded mapping from GM override (string)'); return; } catch (e) { warn('stored mapping parse failed, falling back'); }
          } else if (typeof stored === 'object') {
            replacementMap = stored;
            log('loaded mapping from GM override (object)');
            return;
          }
        }
      }
    } catch (e) { warn('GM_getValue failed', e); }
    replacementMap = EMBEDDED_MAPPING;
    log('using embedded mapping');
  }

  // Utility: find a matching link for exact-case-insensitive match
  function findValToReplace(quickLinkText) {
    if (!quickLinkText) return false;
    const text = String(quickLinkText).trim().toLowerCase();
    for (const key of Object.keys(replacementMap)) {
      const arr = replacementMap[key] || [];
      for (let i = 0; i < arr.length; i++) {
        try {
          if (String(arr[i]).trim().toLowerCase() === text) return key;
        } catch (e) {}
      }
    }
    return false;
  }

  // Insert UI safely near the existing "Open in new window / ysnNewWindow" control
  function insertUi() {
    // Only insert once
    if (document.getElementById('cp-quicklink-autofill-wrapper')) return null;

    // Prefer to place near #ysnNewWindow (the original script used that as anchor)
    const anchor = document.querySelector('#ysnNewWindow');
    let wrapper = document.createElement('div');
    wrapper.id = 'cp-quicklink-autofill-wrapper';
    wrapper.style.margin = '6px 0';

    wrapper.innerHTML = "<label class='check' style='display:flex;align-items:center;gap:.5rem;'><input type='checkbox' id='enableQuickLinkAutochange'/> [CP Toolkit] Enable quick link autochanger</label><div id='quickLinkChangeWarn' style='color:red;margin-top:6px;'>&nbsp;</div>";

    if (anchor && anchor.parentElement) {
      // Insert after the anchor's nearest sensible container
      let container = anchor.closest('label') || anchor.parentElement;
      container.parentElement.insertBefore(wrapper, container);
      // If insertion above doesn't look right, fallback to append
    } else {
      // fallback: try to place near #txtLink or #txtLinkText
      const txtLink = document.querySelector('#txtLink') || document.querySelector('#txtLinkText');
      if (txtLink && txtLink.parentElement) {
        txtLink.parentElement.insertBefore(wrapper, txtLink);
      } else {
        // last resort append to body (should not normally happen on admin pages)
        document.body.appendChild(wrapper);
      }
    }

    return wrapper;
  }

  // Update logic: if checkbox enabled and mapping contains a replacement, set #txtLink and warn
  function replaceQuickLinkIfNeeded() {
    try {
      const checkbox = document.getElementById('enableQuickLinkAutochange');
      if (!checkbox || !checkbox.checked) return;
      const txtVal = (document.getElementById('txtLinkText') && document.getElementById('txtLinkText').value) || '';
      const candidate = findValToReplace(txtVal);
      if (candidate) {
        const txtLinkEl = document.getElementById('txtLink');
        if (txtLinkEl && txtLinkEl.value !== candidate) {
          txtLinkEl.value = candidate;
          const warn = document.getElementById('quickLinkChangeWarn');
          if (warn) warn.textContent = 'Notice: The link was autochanged by the CivicPlus Toolkit. You must save to actually update the URL.';
          log('replaced quick link with', candidate, 'based on text:', txtVal);
        }
      }
    } catch (e) { warn('replaceQuickLinkIfNeeded error', e); }
  }

  // Attach events to inputs and checkbox
  function attachHandlers() {
    const textInput = document.getElementById('txtLinkText');
    const checkbox = document.getElementById('enableQuickLinkAutochange');

    if (checkbox && !checkbox.__cp_handlers) {
      checkbox.addEventListener('change', replaceQuickLinkIfNeeded);
      checkbox.__cp_handlers = true;
    }

    if (textInput && !textInput.__cp_handlers) {
      ['change', 'keyup', 'paste', 'input'].forEach(evt => {
        textInput.addEventListener(evt, () => { setTimeout(replaceQuickLinkIfNeeded, 0); });
      });
      textInput.__cp_handlers = true;
    }
  }

  // Initialize flow: load mapping, add UI, set default checkbox state, attach event handlers
  async function init() {
    try {
      log('initializing quick-link-autofill');
      // Optional: if CPToolkit offers detection, prefer it; but if not present, we still run due to @match.
      if (window.CPToolkit && typeof window.CPToolkit.isCivicPlusSite === 'function') {
        try {
          const detected = window.CPToolkit.isCivicPlusSite();
          const isCP = (detected && typeof detected.then === 'function') ? await detected : Boolean(detected);
          if (!isCP) { log('CPToolkit detection returned false — aborting'); return; }
        } catch (e) { warn('CPToolkit detection threw; proceeding anyway', e); }
      }

      await loadMapping();

      const wrapper = insertUi();
      // If wrapper created, ensure checkbox default enabled only when both fields empty
      const checkbox = document.getElementById('enableQuickLinkAutochange');
      if (checkbox) {
        try {
          const txtLinkText = (document.getElementById('txtLinkText') && document.getElementById('txtLinkText').value) || '';
          const txtLink = (document.getElementById('txtLink') && document.getElementById('txtLink').value) || '';
          if (!txtLinkText.trim() && !txtLink.trim()) checkbox.checked = true;
        } catch (e) {}
      }

      attachHandlers();
      // Run once to handle the current content
      replaceQuickLinkIfNeeded();

      log('quick-link-autofill ready');
    } catch (e) { warn('init error', e); }
  }

  // Tampermonkey menu: allow clearing override mapping
  try {
    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand('CP Toolkit: Clear QuickLink mapping override', () => {
        try {
          GM_setValue && GM_setValue('GraphicLinkMapping', null);
          alert('QuickLink mapping override cleared — using embedded mapping.');
        } catch (e) { alert('Failed to clear mapping override: ' + e); }
      });
    }
  } catch (e) {}

  // Auto-run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { setTimeout(init, 200); }, { once: true });
  } else {
    setTimeout(init, 200);
  }

  // Expose API for debugging
  window.QuickLinkAutofill = {
    init,
    loadMapping,
    getReplacementMap: () => replacementMap
  };

})(window, document);
