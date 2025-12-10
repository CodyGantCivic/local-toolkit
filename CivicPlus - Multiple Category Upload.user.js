// ==UserScript==
// @name         CivicPlus - Multiple Category Upload
// @namespace    http://civicplus.com/
// @version      1.0.0
// @description  Adds a simple UI to create multiple categories on CivicPlus admin pages (Info Center, Graphic Links and Quick Links).  This refactored version removes the dependency on the CP Toolkit loader, eliminates jQuery, and automatically runs when the page is ready.  It is idempotent and safe to include alongside other Toolkit helpers.
// @author       CivicPlus
// @match        *://*/admin/*
// @match        *://*/Admin/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // Define a namespace on window to allow idempotence across reloads.  If this
  // helper has already been initialised, do nothing.  Keeping this guard
  // prevents multiple event listeners from being attached if the userscript is
  // executed more than once.
  if (window.MultipleCategoryUpload && window.MultipleCategoryUpload.__loaded) {
    return;
  }

  // Expose an object to store state and the init function.  We explicitly set
  // __loaded here but initialise it to false; it will be set to true once
  // initialisation completes.
  window.MultipleCategoryUpload = window.MultipleCategoryUpload || {};
  window.MultipleCategoryUpload.__loaded = false;

  /**
   * Helper to wait for a condition to become true before proceeding.  This
   * implementation uses a simple polling mechanism instead of MutationObserver
   * because the expected elements are few and the timeout is short.  It
   * resolves to true if the condition is met within the allotted time and
   * false otherwise.
   *
   * @param {() => boolean} testFn - function to test the readiness condition
   * @param {number} [timeout=8000] - maximum time to wait in ms
   * @param {number} [interval=100] - polling interval in ms
   * @returns {Promise<boolean>} true if ready, false if timeout
   */
  function waitFor(testFn, timeout = 8000, interval = 100) {
    const start = Date.now();
    return new Promise((resolve) => {
      (function check() {
        try {
          if (testFn()) return resolve(true);
        } catch (_) {
          // ignore errors in testFn
        }
        if (Date.now() - start >= timeout) return resolve(false);
        setTimeout(check, interval);
      })();
    });
  }

  /**
   * Initialise the Multiple Category Upload helper.  This function injects a
   * modal dialog and a trigger button into the page, allowing the user to
   * create multiple categories at once.  It posts each new category via
   * fetch and then reloads the page on completion.  The helper will only
   * initialise once per page load thanks to the __loaded flag.
   */
  async function init() {
    // guard against multiple initialisations
    if (window.MultipleCategoryUpload.__loaded) return;
    window.MultipleCategoryUpload.__loaded = true;

    // Define the page paths this helper supports.  While the @match metadata
    // already restricts execution, we keep this check as a secondary
    // safeguard so the logic silently skips other pages if invoked
    const path = (window.location.pathname || '').toLowerCase();
    const validPaths = [
      '/admin/infoii.aspx',
      '/admin/graphiclinks.aspx',
      '/admin/quicklinks.aspx'
    ];
    if (!validPaths.includes(path)) {
      return;
    }

    // Wait for the "Add Category" button or link to exist.  We search for
    // both input elements containing the text and anchors with matching text.
    const ready = await waitFor(() => {
      if (document.querySelector("input[value*='Add Category']")) return true;
      const anchors = Array.from(document.querySelectorAll('a'));
      return anchors.some((a) => /Add Category/i.test(a.textContent || ''));
    }, 10000);
    if (!ready) {
      return;
    }

    // Inject a style block for the modal's appearance.  We avoid using
    // GM_addStyle so the script remains grant-free and portable.  The
    // z-index is set very high to ensure the modal overlays other UI.
    const styleContent = `
      /* Multiple Category Upload Modal Styles */
      #cp-mcu-modal { display: none; position: fixed; z-index: 2147483600; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background: rgba(0, 0, 0, 0.4); }
      #cp-mcu-modal .cp-mcu-content { background: #fff; margin: 5% auto; padding: 20px; border: 1px solid #888; width: 400px; max-width: 90%; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
      #cp-mcu-modal h3 { margin-top: 0; }
      .cp-mcu-section { margin-bottom: 10px; }
      .cp-mcu-section input, .cp-mcu-section select { width: 100%; margin-bottom: 4px; padding: 6px; }
      .cp-mcu-actions { display: flex; justify-content: space-between; gap: 6px; margin-top: 10px; }
      .cp-mcu-actions button { flex: 1; padding: 6px; border: 1px solid #ccc; border-radius: 4px; background: #f3f4f6; cursor: pointer; }
      .cp-mcu-actions button:hover { background: #e5e7eb; }
      #cp-mcu-close { margin-top: 10px; padding: 6px 12px; border: none; background: #e5e7eb; border-radius: 4px; cursor: pointer; }
      #cp-mcu-close:hover { background: #d1d5db; }
    `;
    const styleEl = document.createElement('style');
    styleEl.textContent = styleContent;
    document.head.appendChild(styleEl);

    // Build the modal structure.  We use template literals to keep the
    // markup readable.  The modal remains hidden until the user clicks
    // the trigger button.
    const modal = document.createElement('div');
    modal.id = 'cp-mcu-modal';
    modal.innerHTML = `
      <div class="cp-mcu-content">
        <h3>Upload Multiple Categories</h3>
        <div id="cp-mcu-sections">
          <div class="cp-mcu-section">
            <input type="text" class="cp-mcu-name" placeholder="Category Name">
            <select class="cp-mcu-status">
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
            </select>
          </div>
        </div>
        <div class="cp-mcu-actions">
          <button type="button" id="cp-mcu-add">Add</button>
          <button type="button" id="cp-mcu-remove">Remove</button>
          <button type="button" id="cp-mcu-submit">Submit</button>
        </div>
        <button type="button" id="cp-mcu-close">Close</button>
      </div>
    `;
    document.body.appendChild(modal);

    // When the user clicks the Add button, append a new section with blank
    // inputs for name and status.  Each section becomes a new category.
    document.getElementById('cp-mcu-add').addEventListener('click', function () {
      const sections = document.getElementById('cp-mcu-sections');
      const div = document.createElement('div');
      div.className = 'cp-mcu-section';
      div.innerHTML = `
        <input type="text" class="cp-mcu-name" placeholder="Category Name">
        <select class="cp-mcu-status">
          <option value="Draft">Draft</option>
          <option value="Published">Published</option>
        </select>
      `;
      sections.appendChild(div);
    });
    // Remove the last added section if there are more than one
    document.getElementById('cp-mcu-remove').addEventListener('click', function () {
      const sections = document.querySelectorAll('#cp-mcu-sections .cp-mcu-section');
      if (sections.length > 1) sections[sections.length - 1].remove();
    });
    // Hide the modal when Close is clicked
    document.getElementById('cp-mcu-close').addEventListener('click', function () {
      modal.style.display = 'none';
    });

    // Submit handler: posts each category via fetch.  After all requests
    // settle, the page reloads to show the new categories.  If no valid
    // categories were entered, simply hide the modal.
    document.getElementById('cp-mcu-submit').addEventListener('click', function () {
      const nameInputs = Array.from(document.querySelectorAll('.cp-mcu-name'));
      const statusSelects = Array.from(document.querySelectorAll('.cp-mcu-status'));
      const tasks = [];
      nameInputs.forEach(function (input, idx) {
        const name = input.value.trim();
        if (!name) return;
        const status = statusSelects[idx] ? statusSelects[idx].value : 'Draft';
        const data = new URLSearchParams();
        data.append('lngResourceID', '43');
        data.append('strResourceType', 'M');
        data.append('ysnSave', '1');
        data.append('intQLCategoryID', '0');
        data.append('strAction', 'qlCategorySave');
        data.append('txtName', name);
        data.append('txtGroupViewList', '1');
        if (status === 'Published') {
          data.append('ysnPublishDetail', '1');
        }
        const postUrl = window.location.origin + path;
        tasks.push(
          fetch(postUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body: data.toString(),
            credentials: 'same-origin'
          })
        );
      });
      if (tasks.length) {
        Promise.allSettled(tasks).finally(function () {
          window.location.reload();
        });
      } else {
        modal.style.display = 'none';
      }
    });

    // Create a trigger button near the existing "Add Category" control.  On
    // some pages this control is an input, on others it is an anchor within
    // a list.  We insert our button accordingly and wire it up to show
    // the modal when clicked.
    let triggerButton;
    const addInput = document.querySelector("input[value*='Add Category']");
    if (addInput) {
      triggerButton = document.createElement('input');
      triggerButton.type = 'button';
      triggerButton.className = 'cp-button';
      triggerButton.value = 'Add Multiple Categories';
      triggerButton.style.marginLeft = '5px';
      addInput.insertAdjacentElement('afterend', triggerButton);
    } else {
      // Anchor-based button insertion
      const addAnchor = Array.from(document.querySelectorAll('a')).find((a) => /Add Category/i.test(a.textContent || ''));
      if (addAnchor) {
        triggerButton = document.createElement('li');
        const link = document.createElement('a');
        link.href = '#';
        link.className = 'button bigButton nextAction cp-button';
        link.innerHTML = '<span>Add Multiple Categories</span>';
        triggerButton.appendChild(link);
        // Insert into the containing list (ascend until UL or container)
        let parent = addAnchor.parentElement;
        for (let i = 0; i < 3 && parent && parent.tagName.toLowerCase() !== 'ul'; i++) {
          parent = parent.parentElement;
        }
        if (parent) {
          parent.insertBefore(triggerButton, parent.firstChild);
        }
        triggerButton = link;
      }
    }
    if (triggerButton) {
      triggerButton.addEventListener('click', function (event) {
        event.preventDefault();
        modal.style.display = 'block';
        // reset all fields to default values
        document.querySelectorAll('#cp-mcu-sections .cp-mcu-name').forEach(function (inp) {
          inp.value = '';
        });
        document.querySelectorAll('#cp-mcu-sections .cp-mcu-status').forEach(function (sel) {
          sel.value = 'Draft';
        });
      });
    }
  }

  // Attach init to the namespace and invoke it immediately so it runs
  // without needing the CP Toolkit loader.  Should the script be loaded
  // multiple times, the __loaded flag will prevent duplicates.
  window.MultipleCategoryUpload.init = init;
  init();
})();