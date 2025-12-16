// ==UserScript==
// @name         CP Toolkit — Insert CivicPlus Byline (On-Demand)
// @namespace    http://civicplus.com/
// @version      1.0.1
// @description  On-demand tool: insert CivicPlus "Government Websites by CivicPlus" byline into the first visible Custom HTML widget. Preserves original injected HTML. Adds defensive checks and logging. (Converted from old extension.)
// @author       CP Toolkit
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  const TOOLKIT_NAME = '[CP Toolkit - InsertByline]';

  function log(...args) {
    try { console.log(TOOLKIT_NAME, ...args); } catch (e) {}
  }

  function findVisibleCustomHtmlTextareas() {
    // return array of textarea elements that are inside .widgetCustomHtml and are visible
    const matches = Array.from(document.querySelectorAll('.widgetCustomHtml textarea'));
    return matches.filter(t => {
      try {
        // defensive: ensure offsetParent is not null (visible) and element is in document
        return t && t.offsetParent !== null && document.contains(t);
      } catch (e) {
        return false;
      }
    });
  }

  function insertBylineIntoTextarea(textarea) {
    if (!textarea) return false;

    // preserve the original content exactly as in the uploaded file
    textarea.textContent = `\
<style>
  /* CP icon */
  .cpBylineIconTS {
    color: #fff;
  }
  /* CP Text */
  .cpBylineTextTS,
  .cpBylineTextTS a:link {
    color: #fff;
  }

  .cpBylineTS {
    text-align: center;
  }

  .cpBylineIconTS {
    fill: currentColor;
    width: 39px;
    height: 26px;
    display: inline;
    vertical-align: middle;
  }
</style>

<div class="widgetItem cpBylineTS">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="cpBylineIconTS">
    <path class="c" d="M73.4,23.2h-19v16.7h19c2.8,0,5,2.2,5,5c0,2.8-2.2,5-5,5h-19v28.4h5.5l11.3-11.7h2.2c11.9,0,21.6-9.7,21.6-21.6C95,33,85.3,23.2,73.4,23.2"/>
    <path class="p" d="M45.8,66.5H26.6C14.7,66.5,5,56.8,5,44.9C5,33,14.7,23.2,26.6,23.2h19.1v16.7H26.6c-2.8,0-5,2.2-5,5c0,2.8,2.2,5,5,5h19.1V66.5z"/>
  </svg>
  <span class="cpBylineTextTS">Government Websites by <a href="https://connect.civicplus.com/referral">CivicPlus&reg;</a></span>
</div>
`;

    return true;
  }

  function clickSaveButtonAndConfirm() {
    // find the typical save button and click it. Non-destructive: verify existence first.
    const saveBtn = document.querySelector('.saveCustomHtmlContent');
    if (!saveBtn) {
      log('Save button (.saveCustomHtmlContent) not found — user must save manually.');
      alert('Byline inserted into the widget but the Save button was not found. Please save the widget manually.');
      return;
    }

    try {
      log('Clicking Save button to persist changes.');
      saveBtn.click();
    } catch (e) {
      log('Error clicking Save button:', e);
      alert('Byline inserted but failed to click Save programmatically. Please click Save manually.');
      return;
    }

    // poll to detect that save started/completed — non-blocking
    let checks = 0;
    const poll = setInterval(() => {
      checks++;
      // some UIs disable the button or change text when saving — attempt a few checks
      if (checks > 20) {
        clearInterval(poll);
        log('Finished polling for save state (timed out).');
        alert('Tried to save programmatically; please confirm the widget saved correctly.');
      }
      // prefer to detect disappearance of save button (dialog closed) as a sign of completion
      const stillThere = document.querySelector('.saveCustomHtmlContent');
      if (!stillThere) {
        clearInterval(poll);
        log('Save button disappeared — likely saved and dialog closed.');
        alert('Byline inserted and saved (detected dialog close).');
      }
    }, 300);
  }

  function insertPoweredByByline() {
    log('Starting InsertByline flow — searching for visible Custom HTML widgets.');
    const visibleTextareas = findVisibleCustomHtmlTextareas();
    log('Visible custom HTML textareas found:', visibleTextareas.length);

    if (visibleTextareas.length === 0) {
      alert('No visible Custom HTML widget found. Place a Custom HTML widget where you want the byline, open its edit, then run this tool again.');
      return;
    }

    if (visibleTextareas.length > 1) {
      const proceed = confirm(`Found ${visibleTextareas.length} visible Custom HTML widgets. This tool will insert into the first visible one. Proceed? (Cancel to abort)`);
      if (!proceed) {
        log('User aborted due to multiple widgets.');
        return;
      }
    }

    const textarea = visibleTextareas[0];
    const success = insertBylineIntoTextarea(textarea);
    if (!success) {
      alert('Failed to insert content into the widget textarea. Aborting.');
      log('Failed to insert content.');
      return;
    }

    log('Content inserted into textarea. Attempting to click Save.');
    clickSaveButtonAndConfirm();
  }

  // register menu command so this is on-demand only
  try {
    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand('Insert CivicPlus Byline (Custom HTML)', insertPoweredByByline);
      log('Menu command registered: "Insert CivicPlus Byline (Custom HTML)"');
    } else {
      // fallback: expose on window so it can be triggered from console if GM unavailable
      unsafeWindow.CPToolkit = unsafeWindow.CPToolkit || {};
      unsafeWindow.CPToolkit.insertPoweredByByline = insertPoweredByByline;
      log('GM_registerMenuCommand not available. Exposed CPToolkit.insertPoweredByByline on window for manual run.');
      alert('Tampermonkey GM menu not available; the function is exposed on window.CPToolkit.insertPoweredByByline — run it from the console.');
    }
  } catch (e) {
    log('Error registering menu command:', e);
  }

})();
