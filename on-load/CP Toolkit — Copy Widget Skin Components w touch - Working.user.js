// ==UserScript==
// @name         CP Toolkit — Copy Widget Skin Components w touch - Working
// @namespace    http://civicplus.com/
// @version      1.2.2
// @description  Combines Copy Widget Skin Components (on-demand) and Touch Skin Advanced Styles API into a single userscript to avoid load-order races. Queues skins with MiscellaneousStyles changes, waits for server-confirmed save, then runs touch logic automatically (batch-save). Exposes programmatic API and menu commands.
// @author
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

(function() {
  'use strict';

  // ==== Utility: expose menu commands in Tampermonkey ====
  if (typeof GM_registerMenuCommand === 'function') {
    function callPageFn(fnName) {
      try {
        // unsafeWindow attempt first
        if (typeof unsafeWindow !== 'undefined' &&
            unsafeWindow &&
            typeof unsafeWindow[fnName] === 'function') {
          unsafeWindow[fnName]();
          return true;
        }

        // direct window fallback
        if (typeof window[fnName] === 'function') {
          window[fnName]();
          return true;
        }

        // inject a script as final fallback
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.textContent =
          'try{ if(window["' + fnName + '"]) window["' + fnName + '"](); }catch(e){ console.error("Invoke error:", e); }';
        document.documentElement.appendChild(script);
        setTimeout(() => script.remove(), 1500);
        return true;
      } catch (e) {
        console.error('callPageFn error:', e);
        return false;
      }
    }

    GM_registerMenuCommand('Copy Widget Skin Components (On-Demand)', () => {
      try {
        if (!callPageFn('__CPToolkit_invokeCopyWidgetSkinComponents'))
          throw new Error("Call failed");
      } catch (e) {
        console.error(e);
        alert("Error invoking copy script; see console.");
      }
    });

    GM_registerMenuCommand('Touch Skin Advanced Styles (manual)', () => {
      try {
        if (!callPageFn('CPToolkitTouchSkinAdvanced'))
          throw new Error("Call failed");
      } catch (e) {
        console.error(e);
        alert("Error invoking touch script; see console.");
      }
    });
  }


  // ==== Embed merged system into page context ====
  const merged = (function pageScope() {

    function log()  { console.log("[CPToolkit]", ...arguments); }
    function tlog() { console.log("[TouchSkin]", ...arguments); }
    function warn() { console.warn("[CPToolkit]", ...arguments); }

    // -------------------------------
    //          TOUCH SCRIPT
    // -------------------------------
    (function initTouchScript(){

      if (window.CPToolkitTouchSkinAdvancedFor && window.CPToolkit_touchApiReady) {
        tlog("Touch API already loaded.");
        return;
      }

      // CSS.escape fallback
      if (!CSS || typeof CSS.escape !== 'function') {
        window.CSS = window.CSS || {};
        CSS.escape = s => String(s).replace(/([^\w-])/g, "\\$1");
      }

      function waitFor(selectorOrFn, timeout=8000, interval=120) {
        const start = Date.now();
        return new Promise(resolve => {
          (function check(){
            try {
              let out = typeof selectorOrFn === "function"
                ? selectorOrFn()
                : document.querySelectorAll(selectorOrFn);

              if (out && (out.length === undefined || out.length>0))
                return resolve(out);

            } catch(e){}
            if (Date.now() - start > timeout) return resolve(null);
            setTimeout(check, interval);
          })();
        });
      }

      function dispatchMouseSequence(el) {
        if (!el) return false;
        try {
          ["mousedown","mouseup","click"].forEach(ev =>
            el.dispatchEvent(new MouseEvent(ev, {bubbles:true, cancelable:true}))
          );
          return true;
        } catch(e) {
          try { el.click(); return true; }
          catch(err){ return false; }
        }
      }

      //--------------------------------------------------------------------
      // Open skin popover ONCE (major performance improvement)
      //--------------------------------------------------------------------
      async function openSkinPopoverFor(skinId) {

        // Open preview container if needed
        const previewBtn =
          document.querySelector("a.handle.cpOpenPopOver.preview.contentContainer") ||
          document.querySelector("a.cpOpenPopOver.preview");

        if (previewBtn) {
          dispatchMouseSequence(previewBtn);
          await new Promise(r => setTimeout(r, 350));
        }

        // Click preview checkbox for this skin
        const checkbox = document.querySelector(
          '#skinsToPreview input.previewSkinID[value="' + CSS.escape(skinId) + '"]'
        );

        if (checkbox && !checkbox.checked) {
          dispatchMouseSequence(checkbox);
          await new Promise(r => setTimeout(r, 300));
        }

        // Find the skin section & click the edit handle
        const section = await waitFor(() => {
          let s = document.querySelector(".widgetSkin" + CSS.escape(skinId));
          if (s) return s;

          for (let el of document.querySelectorAll("section,div")) {
            const idNode = el.querySelector(".widgetSkinID,.hidden.widgetSkinID");
            if (idNode && idNode.textContent && idNode.textContent.indexOf(String(skinId)) !== -1)
              return el;
          }
          return null;
        }, 5000);

        if (section) {
          const editHandle =
            section.querySelector("span.handle.widgetSkin") ||
            section.querySelector(".handle.remove.widgetSkin") ||
            section.querySelector(".handle") ||
            section.querySelector(".widgetHeader a") ||
            section.querySelector("header a") ||
            section.querySelector("h3 a");

          if (editHandle) {
            dispatchMouseSequence(editHandle);
            await new Promise(r => setTimeout(r, 450));
          }
        }

        // Last fallback: pick skin by clicking label in list
        if (!section) {
          const label = document.querySelector(
            '#skinsToPreview label[for="containerSkinsToPreview' + skinId + '"]'
          );
          if (label) {
            dispatchMouseSequence(label);
            await new Promise(r => setTimeout(r, 450));
          }
        }

        // Now wait for the popover
        const popover = await waitFor(() => {
          const pops = Array.from(document.querySelectorAll(".cpPopOver, .cpPopOver.common.options.adminWrap"));
          for (let p of pops) {
            const hid = p.querySelector("#hdnSkinID");
            if (hid && String(hid.value) === String(skinId)) return p;
          }
          // fallback: visible popover
          for (let p of pops) {
            if (p.offsetParent !== null) return p;
          }
          return null;
        }, 7000);

        if (!popover)
          throw new Error("Skin popover failed to open for skin " + skinId);

        return popover;
      }


      //--------------------------------------------------------------------
      // NEW: ensure correct skin tab (Items/Columns/Calendar/Tabbed)
      //--------------------------------------------------------------------
      async function ensureCorrectSkinSection(popoverRoot, componentIndex) {

        // Determine section
        let section =
          (componentIndex >= 16 && componentIndex <= 21) ? "superWidgetMiniCalendar" :
          ([12,13,14].includes(componentIndex))          ? "superWidgetTabbed" :
          (componentIndex === 15)                        ? "superWidgetColumns" :
                                                          "superWidgetItems";

        // Primary selector
        let sel = popoverRoot.querySelector(
          '.displayToggle.widgetSkinToggle a[data-view="'+section+'"]'
        );

        // Fallback by class
        if (!sel) {
          if (section === "superWidgetMiniCalendar")
            sel = popoverRoot.querySelector(".displayToggle.widgetSkinToggle a.miniCalendarIcon");
          if (!sel && section === "superWidgetTabbed")
            sel = popoverRoot.querySelector(".displayToggle.widgetSkinToggle a.tabbed");
          if (!sel && section === "superWidgetColumns")
            sel = popoverRoot.querySelector(".displayToggle.widgetSkinToggle a.columns");
          if (!sel && section === "superWidgetItems")
            sel = popoverRoot.querySelector(".displayToggle.widgetSkinToggle a.items");
        }

        if (sel) dispatchMouseSequence(sel);
        await new Promise(r => setTimeout(r, 250));
      }


      //--------------------------------------------------------------------
      // Edit a SINGLE component inside the already-open popover
      //--------------------------------------------------------------------
      async function editComponentInOpenPopover(popoverRoot, skinId, componentIndex) {

        try {
          // Switch component in dropdown
          const sel = popoverRoot.querySelector("#widgetSkinComponentTypeID");
          if (sel) {
            sel.value = String(componentIndex);
            sel.dispatchEvent(new Event("change", {bubbles:true}));
            await new Promise(r => setTimeout(r, 220));
          }

          // *** NEW: switch visible section (Items/Columns/Calendar/Tabbed) ***
          await ensureCorrectSkinSection(popoverRoot, componentIndex);

          // Go to Advanced tab
          let advTab = popoverRoot.querySelector('a[href="#widgetSkinMiscTab"]');
          if (!advTab) {
            for (let a of popoverRoot.querySelectorAll(".cpTabs a,.cpTabsFancy a")) {
              const t = (a.textContent||"").trim().toLowerCase();
              if (t.includes("advanced") || t.includes("misc") || t.includes("custom"))
                { advTab = a; break; }
            }
          }
          if (advTab) dispatchMouseSequence(advTab);
          await new Promise(r => setTimeout(r, 200));

          // Get textarea
          let ta =
            popoverRoot.querySelector("#MiscellaneousStyles") ||
            popoverRoot.querySelector('textarea[id*="MiscellaneousStyles"]') ||
            popoverRoot.querySelector("textarea.auto.update.widgetSkin");

          if (!ta) {
            for (let t of popoverRoot.querySelectorAll("textarea")) {
              const id = (t.id||"").toLowerCase();
              const cl = (t.className||"").toLowerCase();
              if (id.includes("misc") || cl.includes("widgetskin"))
                { ta = t; break; }
            }
          }

          if (!ta) throw new Error("Textarea not found for component " + componentIndex);

          // Append EXACTLY ONE SPACE (remove previous markers)
          let v = ta.value || "";
          v = v.replace(/\s*\/\*t:\d+\*\/\s*$/m, "");   // remove timestamp if exists
          v = v.replace(/\s+$/m, "") + " ";
          ta.value = v;

          ta.dispatchEvent(new Event("input",{bubbles:true}));
          ta.dispatchEvent(new Event("change",{bubbles:true}));

          return {skinID: skinId, componentIndex, success:true};

        } catch(err) {
          return {skinID: skinId, componentIndex, success:false, error:String(err)};
        }
      }


      //--------------------------------------------------------------------
      // BATCH-SAVE FINAL TOUCH FUNCTION
      //--------------------------------------------------------------------
      async function CPToolkitTouchSkinAdvancedFor_impl_batch(skinId, componentIndexes) {

        componentIndexes = Array.isArray(componentIndexes) ? componentIndexes.map(x=>parseInt(x,10)).filter(n=>!isNaN(n)) : [componentIndexes];
        componentIndexes = Array.from(new Set(componentIndexes));

        if (componentIndexes.length === 0) return [];

        const results = [];

        // Open popover once
        const pop = await openSkinPopoverFor(skinId);

        // Apply edits to each component
        for (let idx of componentIndexes) {
          const r = await editComponentInOpenPopover(pop, skinId, idx);
          results.push(r);
          await new Promise(r => setTimeout(r, 200));
        }

        // Attempt to close popover
        const closeBtn =
          pop.querySelector(".cpPopOverClose") ||
          pop.querySelector(".popOverClose") ||
          pop.querySelector("a.close");
        if (closeBtn) dispatchMouseSequence(closeBtn);
        await new Promise(r => setTimeout(r, 200));

        // SAVE ONCE
        let saveBtn =
          document.querySelector('#inner-wrap #divToolbars .cpToolbar a.button.save') ||
          document.querySelector('.cpToolbar a.button.save') ||
          document.querySelector('#divToolbars a.button.save') ||
          document.querySelector('.nav.secondary a.button.save');

        if (saveBtn) {
          const inactive = saveBtn.classList.contains("inactive");
          if (inactive) saveBtn.classList.remove("inactive");
          dispatchMouseSequence(saveBtn);
          setTimeout(() => inactive && saveBtn.classList.add("inactive"), 750);
        } else if (typeof window.saveTheme === "function") {
          try { window.saveTheme(); } catch(e){ console.error('[CPToolkit] saveTheme() threw', e); }
        }

        return results;
      }

      window.CPToolkitTouchSkinAdvancedFor = async function(skinId, idxs){
        return await CPToolkitTouchSkinAdvancedFor_impl_batch(skinId, idxs);
      };

      // Interactive manual entry (keeps older behavior)
      window.CPToolkitTouchSkinAdvanced = async function runTouchInteractive() {
        try {
          let skinInput = prompt("Widget Skin ID to touch (leave blank to use the first visible skin in 'Skins to Preview'):");
          let compInput = prompt("Optional: component index to select (0=Wrapper,1=Header,2=Item List,3=Item,4=Item Title,...)\nYou may provide comma-separated indexes or a single index.\nLeave blank to keep the modal's current component.");
          let compIndexes = null;
          if (compInput && compInput.trim()) compIndexes = compInput.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
          let skinId = skinInput && skinInput.trim() ? skinInput.trim() : null;
          if (!skinId) {
            const checked = document.querySelector('#skinsToPreview input.previewSkinID:checked');
            if (checked) skinId = checked.value;
            else {
              const first = document.querySelector('#skinsToPreview input.previewSkinID');
              if (first) skinId = first.value;
            }
          }
          if (!skinId) { alert('No skin id could be determined.'); return; }
          if (!compIndexes || compIndexes.length === 0) {
            const single = prompt("Component index to touch (0 = Wrapper, 4 = Item Title, etc.)");
            if (!single) { alert('No component index provided.'); return; }
            const parsed = parseInt(single.trim(), 10);
            if (isNaN(parsed)) { alert('Invalid index'); return; }
            compIndexes = [parsed];
          }
          const res = await window.CPToolkitTouchSkinAdvancedFor(skinId, compIndexes);
          alert('Done. Result logged to console.');
          console.log('Touch result:', res);
        } catch (e) {
          console.error('Touch Skin Advanced Styles error:', e);
          alert('Error: see console for details.');
        }
      };

      window.CPToolkit_touchApiReady = true;
      tlog("Touch API ready (batch-save mode)");

    })();

    // -----------------------------------------------------------
    // COPY SCRIPT (complete, preserved, with small changes to queue only copied indexes)
    // -----------------------------------------------------------

    (function initCopyScript() {
      // expose function so menu command can call it
      window.__CPToolkit_invokeCopyWidgetSkinComponents = function() {
        // the original copyWidgetSkinComponents logic is run in page context by appending a script.
        // We'll build the function body as a string (IIFE) and append it. This allows access to DesignCenter.
        const copyComponentsCode = function() {
          (async function() {
            // Safety guard: ensure theme JSON present
            if (!window.DesignCenter || !DesignCenter.themeJSON || !DesignCenter.themeJSON.WidgetSkins) {
              alert("Error: Design Center data not available. Please ensure you're in the Theme Manager.");
              return;
            }

            // Ensure global queues exist
            window.__CPToolkit_pendingTouchedSkins = window.__CPToolkit_pendingTouchedSkins || [];
            window.__CPToolkit_lastTouchedSkins = window.__CPToolkit_lastTouchedSkins || [];

            // Debug
            try { console.groupCollapsed("[CPToolkit] Detected DesignCenter.themeJSON.WidgetSkins"); console.log(DesignCenter.themeJSON.WidgetSkins); console.groupEnd(); } catch(e) {}

            var widgetSkinComponentTypes = [
              "Wrapper","Header","Item List","Item","Item Title","Item Secondary Text","Item Bullets","Item Link",
              "Read On","View All","RSS","Footer","Tab List","Tab","Tab Panel","Column Seperator","Calendar Header",
              "Cal Grid","Cal Day Headers","Cal Day","Cal Event Link","Cal Today"
            ];

            var validSkins = [];
            $.each(DesignCenter.themeJSON.WidgetSkins, function() {
              if (this.Name && this.WidgetSkinID && this.Components) {
                validSkins.push(this);
              }
            });
            if (validSkins.length === 0) {
              alert("Error: No valid widget skins found.");
              return;
            }

            // Modal UI for selecting skins (kept small)
            var SKIN_MODAL_STYLE_ID = "widget-skin-selector-style";
            function ensureSkinSelectionStyles() {
              if (document.getElementById(SKIN_MODAL_STYLE_ID)) return;
              var style = document.createElement("style");
              style.id = SKIN_MODAL_STYLE_ID;
              style.textContent =
                ".widget-skin-modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483647;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:20px;}" +
                ".widget-skin-modal{background:#fff;color:#222;max-width:620px;width:100%;max-height:90vh;display:flex;flex-direction:column;border-radius:6px;box-shadow:0 20px 60px rgba(0,0,0,0.4);padding:20px;font-family:Arial,Helvetica,sans-serif;}" +
                ".widget-skin-modal h2{margin:0 0 8px;font-size:20px;}" +
                ".widget-skin-modal p{margin:0 0 12px;font-size:14px;line-height:1.4;}" +
                ".widget-skin-modal__select{width:100%;border:1px solid #c7c7c7;border-radius:4px;padding:6px;font-size:14px;min-height:220px;flex:1;box-sizing:border-box;}" +
                ".widget-skin-modal__meta{margin-top:8px;font-size:12px;color:#555;}" +
                ".widget-skin-modal__actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px;}" +
                ".widget-skin-modal__actions button{padding:8px 16px;font-size:14px;border-radius:4px;border:none;cursor:pointer;}" +
                ".widget-skin-modal__actions button.primary{background:#0b6efb;color:#fff;}" +
                ".widget-skin-modal__actions button.secondary{background:#f2f2f2;color:#333;}" +
                ".widget-skin-modal__actions button:disabled{opacity:0.5;cursor:not-allowed;}";
              document.head.appendChild(style);
            }

            function showSkinSelectionModal(options) {
              ensureSkinSelectionStyles();
              options = options || {};
              var skins = Array.isArray(options.skins) ? options.skins : [];

              return new Promise(function(resolve) {
                var overlay = document.createElement("div");
                overlay.className = "widget-skin-modal-overlay";

                var modal = document.createElement("div");
                modal.className = "widget-skin-modal";

                var title = document.createElement("h2");
                title.textContent = options.title || "Select Widget Skin";
                modal.appendChild(title);

                if (options.message) {
                  var message = document.createElement("p");
                  message.textContent = options.message;
                  modal.appendChild(message);
                }

                var select = document.createElement("select");
                select.className = "widget-skin-modal__select";
                var visibleCount = Math.min(skins.length, 18);
                select.size = skins.length >= 8 ? visibleCount : (skins.length || 1);

                skins.forEach(function(skin) {
                  var option = document.createElement("option");
                  option.value = skin.WidgetSkinID;
                  option.textContent = (skin.Name || "Unnamed Skin") + " (" + skin.WidgetSkinID + ")";
                  select.appendChild(option);
                });

                modal.appendChild(select);

                var meta = document.createElement("div");
                meta.className = "widget-skin-modal__meta";
                meta.textContent = skins.length + " skin" + (skins.length === 1 ? "" : "s") + " available";
                modal.appendChild(meta);

                var actions = document.createElement("div");
                actions.className = "widget-skin-modal__actions";

                var cancelBtn = document.createElement("button");
                cancelBtn.type = "button";
                cancelBtn.className = "secondary";
                cancelBtn.textContent = options.cancelText || "Cancel";

                var selectBtn = document.createElement("button");
                selectBtn.type = "button";
                selectBtn.className = "primary";
                selectBtn.textContent = options.confirmText || "Select";
                selectBtn.disabled = skins.length === 0;

                actions.appendChild(cancelBtn);
                actions.appendChild(selectBtn);
                modal.appendChild(actions);

                overlay.appendChild(modal);
                document.body.appendChild(overlay);

                var resolved = false;
                function cleanup(value) {
                  if (resolved) return;
                  resolved = true;
                  document.removeEventListener("keydown", handleKey, true);
                  if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
                  resolve(value);
                }

                function handleKey(evt) {
                  if (evt.key === "Escape") { evt.preventDefault(); cleanup(null); }
                  if ((evt.key === "Enter" || evt.key === "NumpadEnter") && document.activeElement === select && select.value) {
                    evt.preventDefault();
                    cleanup(select.value);
                  }
                }

                document.addEventListener("keydown", handleKey, true);

                select.addEventListener("change", function() { selectBtn.disabled = !select.value; });
                select.addEventListener("dblclick", function() { if (select.value) cleanup(select.value); });

                selectBtn.addEventListener("click", function() { if (!selectBtn.disabled && select.value) cleanup(select.value); });
                cancelBtn.addEventListener("click", function() { cleanup(null); });
                overlay.addEventListener("click", function(evt) { if (evt.target === overlay) cleanup(null); });

                setTimeout(function() { if (skins.length > 0) select.focus(); }, 0);
              });
            }

            function validateComponentIndexes(input, typesCount) {
              if (!input || typeof input !== "string") return null;
              const widgetSkinComponentTypesLen = typesCount;
              var trimmedInput = input.trim();
              if (trimmedInput === widgetSkinComponentTypesLen.toString()) {
                var allIndexes = [];
                for (var idx = 0; idx < widgetSkinComponentTypesLen; idx++) allIndexes.push(idx);
                return allIndexes;
              }
              var indexes = input.split(",").map(function(idx) {
                return parseInt(idx.trim(), 10);
              }).filter(function(idx) {
                return !isNaN(idx) && idx >= 0 && idx < widgetSkinComponentTypesLen;
              });
              return indexes.length > 0 ? indexes : null;
            }

            function findSkinById(skinId) {
              if (!skinId) return null;
              var foundSkin = null;
              $.each(DesignCenter.themeJSON.WidgetSkins, function() {
                if (this.WidgetSkinID == skinId && this.Components) {
                  foundSkin = this; return false;
                }
              });
              return foundSkin;
            }

            // --- helper: build payload from explicit indexes (only these will be touched) ---
            function makeTouchedPayloadForIndexes(toSkin, indexes) {
              try {
                if (!toSkin || !toSkin.WidgetSkinID) return null;
                // normalize indexes: unique, integers, valid range
                const normalized = Array.isArray(indexes)
                  ? Array.from(new Set(indexes.map(n => parseInt(n, 10)).filter(n => !Number.isNaN(n) && n >= 0)))
                  : [];

                if (normalized.length === 0) return null;

                const changedComponents = normalized.map(idx => {
                  // include snippet if present (helpful for debugging); do not require it
                  const comp = (toSkin.Components && toSkin.Components[idx]) || null;
                  const snippet = comp && typeof comp.MiscellaneousStyles === 'string'
                    ? comp.MiscellaneousStyles.slice(0, 300).replace(/\n/g, '\\n')
                    : '';
                  return { idx: idx, snippet: snippet };
                });

                return {
                  skinID: toSkin.WidgetSkinID,
                  skinName: toSkin.Name || '',
                  changedComponents: changedComponents,
                  queuedAt: new Date().toISOString()
                };
              } catch (e) {
                console.error('[CPToolkit] makeTouchedPayloadForIndexes error', e);
                return null;
              }
            }

            // --- guarded enqueue that accepts a payload (same shape as before) ---
            function enqueueTouchedPayload(payload) {
              try {
                if (!payload || !payload.skinID) return;
                window.__CPToolkit_pendingTouchedSkins = window.__CPToolkit_pendingTouchedSkins || [];

                const existing = window.__CPToolkit_pendingTouchedSkins.find(p => String(p.skinID) === String(payload.skinID));
                if (existing) {
                  // merge indexes without duplicates
                  const idxSet = {};
                  (existing.changedComponents || []).forEach(c => { idxSet[c.idx] = true; });
                  (payload.changedComponents || []).forEach(c => {
                    if (!idxSet[c.idx]) {
                      existing.changedComponents.push(c);
                      idxSet[c.idx] = true;
                    }
                  });
                  existing.queuedAt = existing.queuedAt || payload.queuedAt;
                  console.log('[CPToolkit] merged touched payload into existing queue for skin', payload.skinID);
                } else {
                  window.__CPToolkit_pendingTouchedSkins.push(payload);
                  console.groupCollapsed('[CPToolkit] queued touched skin: ' + payload.skinName + ' (' + payload.skinID + ')');
                  console.table(payload.changedComponents || []);
                  console.groupEnd();
                }
              } catch (e) {
                console.error('[CPToolkit] enqueueTouchedPayload error', e);
                window.__CPToolkit_pendingTouchedSkins = window.__CPToolkit_pendingTouchedSkins || [];
                window.__CPToolkit_pendingTouchedSkins.push(payload);
              }
            }

            function createOrGetProgressModal() {
              var id = 'cp-toolkit-touch-progress-modal';
              var existing = document.getElementById(id);
              if (existing) return existing;
              var overlay = document.createElement('div');
              overlay.id = id;
              overlay.style.position = 'fixed';
              overlay.style.left = '0';
              overlay.style.top = '0';
              overlay.style.right = '0';
              overlay.style.bottom = '0';
              overlay.style.background = 'rgba(0,0,0,0.45)';
              overlay.style.zIndex = 2147483647;
              overlay.style.display = 'flex';
              overlay.style.alignItems = 'center';
              overlay.style.justifyContent = 'center';

              var panel = document.createElement('div');
              panel.style.width = '620px';
              panel.style.maxHeight = '80vh';
              panel.style.overflow = 'auto';
              panel.style.background = '#fff';
              panel.style.borderRadius = '8px';
              panel.style.padding = '16px';
              panel.style.boxSizing = 'border-box';
              panel.style.boxShadow = '0 20px 60px rgba(0,0,0,0.4)';
              panel.innerHTML = '<h3 style="margin-top:0">CP Toolkit — Touch Skin Progress</h3><div id="cp-toolkit-touch-progress-body" style="font-family:Arial,Helvetica,sans-serif;font-size:13px"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button id="cp-toolkit-touch-close">Close</button></div>';
              overlay.appendChild(panel);
              document.body.appendChild(overlay);
              document.getElementById('cp-toolkit-touch-close').addEventListener('click', function() { overlay.style.display = 'none'; });
              return overlay;
            }

            // Process queued items sequentially
            var __CPToolkit_processingPending = false;
            async function processPendingQueueAndTouch() {
              // reentrancy guard
              if (window.__CPToolkit_processingPending) {
                console.warn('[CPToolkit] processPendingQueueAndTouch already running; skipping re-entrant call.');
                return { success: false, processed: 0, reason: 'reentrant' };
              }
              window.__CPToolkit_processingPending = true;

              try {
                var pending = window.__CPToolkit_pendingTouchedSkins || [];
                if (!pending || !pending.length) {
                  log('[CPToolkit] No pending touched skins to process.');
                  window.__CPToolkit_processingPending = false;
                  return { success: true, processed: 0 };
                }

                // Defensive dedupe by skinID, merging changedComponents
                var dedupedMap = {};
                pending.forEach(function(item){
                  try {
                    if (!item || !item.skinID) return;
                    var key = String(item.skinID);
                    if (!dedupedMap[key]) {
                      dedupedMap[key] = {
                        skinID: item.skinID,
                        skinName: item.skinName || '',
                        changedComponents: Array.isArray(item.changedComponents) ? item.changedComponents.slice() : [],
                        queuedAt: item.queuedAt || new Date().toISOString()
                      };
                    } else {
                      var existing = dedupedMap[key];
                      var idxSet = {};
                      existing.changedComponents.forEach(function(c){ idxSet[c.idx] = true; });
                      (item.changedComponents || []).forEach(function(c){
                        if (!idxSet[c.idx]) { existing.changedComponents.push(c); idxSet[c.idx] = true; }
                      });
                    }
                  } catch (e) {}
                });
                pending = Object.keys(dedupedMap).map(function(k){ return dedupedMap[k]; });

                // Snapshot + clear global queue so new pushes create a fresh batch
                var snapshot = pending.slice(0);
                window.__CPToolkit_pendingTouchedSkins = [];

                // Wait for touch API readiness (longer)
                var attempts = 0, maxAttempts = 25;
                while (typeof window.CPToolkitTouchSkinAdvancedFor !== 'function' && attempts < maxAttempts) {
                  attempts++;
                  log('Touch API not available yet; retrying...', attempts);
                  await new Promise(r => setTimeout(r, 800));
                }
                if (typeof window.CPToolkitTouchSkinAdvancedFor !== 'function') {
                  console.warn('[CPToolkit] Touch API not available. You can run window.__CPToolkit_pendingTouchedSkins manually later.');
                  window.__CPToolkit_processingPending = false;
                  return { success: false, processed: 0, reason: 'Touch API not available' };
                }

                var modal = createOrGetProgressModal();
                var body = modal.querySelector('#cp-toolkit-touch-progress-body');
                modal.style.display = 'flex';

                var results = [];
                for (var i = 0; i < snapshot.length; i++) {
                  var item = snapshot[i];
                  var skinLabel = (item.skinName || 'id:' + item.skinID);
                  body.innerHTML += '<div><strong>Processing skin: ' + skinLabel + ' (' + item.skinID + ')</strong></div>';
                  try {
                    const compIndexes = item.changedComponents.map(c => c.idx);
                    body.innerHTML += '<div style="margin-left:12px">Components to touch: ' + compIndexes.join(', ') + '</div>';
                    // This now calls the batch-save variant that edits all components then saves once
                    const res = await window.CPToolkitTouchSkinAdvancedFor(item.skinID, compIndexes);
                    results.push({ item: item, result: res });
                    body.innerHTML += '<div style="margin-left:12px;color:green">Completed: ' + JSON.stringify(res) + '</div>';
                  } catch (err) {
                    console.error('[CPToolkit] Error touching skin', item.skinID, err);
                    body.innerHTML += '<div style="margin-left:12px;color:red">Error: ' + (err && err.message ? err.message : JSON.stringify(err)) + '</div>';
                    results.push({ item: item, error: err });
                  }
                  await new Promise(r => setTimeout(r, 300));
                }

                window.__CPToolkit_lastTouchedSkins = results;
                body.innerHTML += '<div style="margin-top:12px"><strong>All queued skins processed.</strong></div>';
                return { success: true, processed: results.length, results: results };
              } finally {
                // ensure flag cleared even on error
                window.__CPToolkit_processingPending = false;
              }
            }

            // Wrap saveTheme to monitor network requests started right after it runs
            (function wrapSaveThemeForCPToolkit() {
              if (!window.saveTheme || window.__CPToolkit_saveThemeWrapped) return;
              var origSave = window.saveTheme;
              window.__CPToolkit_saveThemeWrapped = true;

              window.saveTheme = function() {
                console.log('[CPToolkit] saveTheme() wrapper invoked — monitoring network activity for server-confirmed completion.');

                var trackedPromises = [];
                var originalXHRSend = XMLHttpRequest.prototype.send;
                var originalFetch = window.fetch;

                // patch XHR.send
                XMLHttpRequest.prototype.send = function() {
                  try {
                    var xhr = this;
                    var p = new Promise(function(resolve) {
                      var onState = function() {
                        if (xhr.readyState === 4) {
                          resolve({ type: 'xhr', status: xhr.status, url: xhr.responseURL || null });
                        }
                      };
                      xhr.addEventListener('readystatechange', onState);
                      xhr.addEventListener('error', function(){ resolve({ type:'xhr', status: 'error' }); });
                      xhr.addEventListener('abort', function(){ resolve({ type:'xhr', status: 'abort' }); });
                    });
                    trackedPromises.push(p);
                  } catch (e) {}
                  return originalXHRSend.apply(this, arguments);
                };

                // patch fetch
                if (originalFetch) {
                  window.fetch = function() {
                    try {
                      var fetchPromise = originalFetch.apply(this, arguments);
                      var tracker = fetchPromise.then(function(resp){ return { type: 'fetch', status: resp && resp.status }; }).catch(function(err){ return { type: 'fetch', status: 'error', error: err }; });
                      trackedPromises.push(tracker);
                      return fetchPromise;
                    } catch (e) {
                      return originalFetch.apply(this, arguments);
                    }
                  };
                }

                var ret;
                try {
                  ret = origSave.apply(this, arguments);
                } catch (e) {
                  XMLHttpRequest.prototype.send = originalXHRSend;
                  if (originalFetch) window.fetch = originalFetch;
                  console.error('[CPToolkit] saveTheme() original threw an error:', e);
                  throw e;
                }

                setTimeout(function() {
                  var timeoutMs = 20000;
                  var timeoutPromise = new Promise(function(resolve) { setTimeout(function(){ resolve({ type:'timeout' }); }, timeoutMs); });
                  Promise.race([ Promise.all(trackedPromises), timeoutPromise ])
                    .then(function(results){
                      XMLHttpRequest.prototype.send = originalXHRSend;
                      if (originalFetch) window.fetch = originalFetch;
                      console.log('[CPToolkit] saveTheme network-waiter done (or timeout). Proceeding to process pending queue if any.');
                      processPendingQueueAndTouch().then(function(res){ console.log('[CPToolkit] processPendingQueueAndTouch result:', res); }).catch(function(err){ console.error('[CPToolkit] Error while processing pending queue:', err); });
                    }).catch(function(err){
                      XMLHttpRequest.prototype.send = originalXHRSend;
                      if (originalFetch) window.fetch = originalFetch;
                      console.error('[CPToolkit] Unexpected error while waiting for save network requests:', err);
                      processPendingQueueAndTouch();
                    });
                }, 300);

                return ret;
              };
            })();

            // Now interactive original Copy flow (local copy / export / import)
            var mode = prompt(
              "Select mode:\n1 = Local Copy (same site)\n2 = Export (copy to clipboard)\n3 = Import (paste from clipboard)\n\nEnter 1, 2, or 3:"
            );

            if (!mode || !["1", "2", "3"].includes(mode.trim())) {
              alert("Invalid mode selection. Operation cancelled.");
              return;
            }

            if (mode.trim() === "1") {
              var skinToCopy = await showSkinSelectionModal({ title: "Select source widget skin", message: "Choose the skin you would like to copy components from.", skins: validSkins, confirmText: "Use skin" });
              if (!skinToCopy) { alert("Operation cancelled."); return; }
              var skinToEdit = await showSkinSelectionModal({ title: "Select destination widget skin", message: "Choose the skin you would like to copy components to.", skins: validSkins, confirmText: "Use skin" });
              if (!skinToEdit) { alert("Operation cancelled."); return; }
              var fromSkin = findSkinById(skinToCopy);
              var toSkin = findSkinById(skinToEdit);
              if (!fromSkin || !toSkin) { alert("Error: One or both selected skins not found."); return; }
              var correctSkinNames = confirm("Copying from skin '" + fromSkin.Name + "' to '" + toSkin.Name + "'. If this is not correct, click cancel.");
              if (correctSkinNames && skinToCopy !== skinToEdit) {
                var componentsToCopy = prompt("Which components would you like to copy?\n(comma separate, e.g. 0,1,2 or enter " + widgetSkinComponentTypes.length + " for all)\n\n" + widgetSkinComponentTypes.map(function(name, i){return name + ": " + i;}).join(" | "));
                var componentIndexes = validateComponentIndexes(componentsToCopy, widgetSkinComponentTypes.length);
                if (!componentIndexes) { alert("Error: Invalid component selection."); return; }
                var anyCopied = false;

                // Track only copied indexes
                var copiedIndexes = [];

                $.each(componentIndexes, function(_, idx) {
                  if (fromSkin.Components[idx]) {
                    var shouldCopy = confirm("Copying " + widgetSkinComponentTypes[idx] + ". Click OK to confirm or Cancel to skip");
                    if (shouldCopy) {
                      toSkin.RecordStatus = DesignCenter.recordStatus.Modified;
                      toSkin.Components[idx] = Object.assign({}, fromSkin.Components[idx]);
                      toSkin.Components[idx].WidgetSkinID = parseInt(skinToEdit, 10);
                      toSkin.Components[idx].RecordStatus = DesignCenter.recordStatus.Modified;
                      anyCopied = true;
                      copiedIndexes.push(idx);
                    }
                  }
                });
                if (!anyCopied) { alert("No components were copied."); return; }

                // Enqueue only copied indexes
                var payload = makeTouchedPayloadForIndexes(toSkin, copiedIndexes);
                if (payload) {
                  enqueueTouchedPayload(payload);
                } else {
                  console.log('[CPToolkit] No MiscellaneousStyles found on destination skin after copy - nothing to touch.');
                }

                var shouldSave = confirm("Widget skin components copied. Click OK to save changes (script will wait for server save and then run the Touch steps).");
                if (shouldSave) {
                  saveTheme();
                  alert('Save initiated. The touch steps will run automatically after the save completes. Check console for progress and the "Touch Progress" modal.');
                } else {
                  alert("Changes not saved. Refresh the page to cancel the changes.");
                }
              } else if (skinToCopy === skinToEdit) {
                alert("You cannot copy to the same skin.");
              }
              return;
            }

            if (mode.trim() === "2") {
              var skinToExport = await showSkinSelectionModal({ title: "Select skin to export from", message: "Choose the skin whose components you would like to export.", skins: validSkins, confirmText: "Export from this skin" });
              if (!skinToExport) { alert("Operation cancelled."); return; }
              var fromSkinExport = findSkinById(skinToExport);
              if (!fromSkinExport) { alert("Error: Selected skin not found."); return; }
              var componentsToExport = prompt("Which components would you like to export?\n(comma separate, e.g. 0,1,2 or enter " + widgetSkinComponentTypes.length + " for all)\n\n" + widgetSkinComponentTypes.map(function(name, i){return name + ": " + i;}).join(" | "));
              var componentIndexesExport = validateComponentIndexes(componentsToExport, widgetSkinComponentTypes.length);
              if (!componentIndexesExport) { alert("Error: Invalid component selection."); return; }
              var exportData = { version: "1.0", exportedAt: new Date().toISOString(), skinName: fromSkinExport.Name, skinID: fromSkinExport.WidgetSkinID, componentIndexes: componentIndexesExport, components: [] };
              $.each(componentIndexesExport, function(_, idx) {
                if (fromSkinExport.Components[idx] && fromSkinExport.Components[idx]) {
                  exportData.components.push({ idx: idx, type: widgetSkinComponentTypes[idx], data: fromSkinExport.Components[idx] });
                }
              });
              if (exportData.components.length === 0) { alert("Error: No valid components to export."); return; }
              var exportJson = JSON.stringify(exportData, null, 2);
              if (navigator.clipboard && navigator.clipboard.writeText) {
                try { await navigator.clipboard.writeText(exportJson); alert("Exported! Data copied to clipboard.\n\nPaste it on the destination site using Import mode."); } catch (err) { alert("Failed to copy to clipboard. You can manually copy the data from the next prompt."); prompt("Copy this data:", exportJson); }
              } else { prompt("Copy this data:", exportJson); }
              return;
            }

            if (mode.trim() === "3") {
              async function processImport(importJson) {
                if (!importJson || typeof importJson !== "string") { alert("Error: No data provided."); return; }
                var importData;
                try { importData = JSON.parse(importJson); } catch (e) { alert("Error: Invalid JSON data. Please ensure you copied the export data correctly."); return; }
                if (!importData || typeof importData !== "object" || !importData.version || !importData.components || !Array.isArray(importData.components) || !importData.componentIndexes || !Array.isArray(importData.componentIndexes)) { alert("Error: Invalid import data structure. Please ensure you're using data exported from this tool."); return; }
                if (importData.version !== "1.0") { if (!confirm("Warning: Import data is from a different version. Continue anyway?")) return; }
                var validIndexes = importData.componentIndexes.filter(function(idx) { return typeof idx === "number" && idx >= 0 && idx < widgetSkinComponentTypes.length; });
                if (validIndexes.length === 0) { alert("Error: No valid component indexes in import data."); return; }
                var componentNames = validIndexes.map(function(idx) { return widgetSkinComponentTypes[idx]; }).join(", ");
                var info = "Import from skin: " + (importData.skinName || "Unknown") + " (ID: " + (importData.skinID || "Unknown") + ")\n" + "Components: " + componentNames + "\n\n" + "Continue with import?";
                if (!confirm(info)) return;
                var skinToEditImport = await showSkinSelectionModal({ title: "Select destination widget skin", message: "Choose the skin that should receive the imported components.", skins: validSkins, confirmText: "Import into this skin" });
                if (!skinToEditImport) { alert("Operation cancelled."); return; }
                var toSkinImport = findSkinById(skinToEditImport);
                if (!toSkinImport) { alert("Error: Destination skin not found."); return; }
                var appliedCount = 0;

                // Track only imported/coped indexes
                var copiedIndexes = [];

                $.each(importData.components, function(_, componentData) {
                  var idx = componentData.idx;
                  if (typeof idx !== "number" || idx < 0 || idx >= widgetSkinComponentTypes.length || !componentData.data) { console.warn("Skipping invalid component at index " + idx); return; }
                  var shouldCopy = confirm("Import component '" + widgetSkinComponentTypes[idx] + "' into skin '" + toSkinImport.Name + "'?\n\nClick OK to confirm or Cancel to skip.");
                  if (shouldCopy) {
                    toSkinImport.RecordStatus = DesignCenter.recordStatus.Modified;
                    toSkinImport.Components[idx] = Object.assign({}, componentData.data);
                    toSkinImport.Components[idx].WidgetSkinID = parseInt(skinToEditImport, 10);
                    toSkinImport.Components[idx].RecordStatus = DesignCenter.recordStatus.Modified;
                    appliedCount++;
                    copiedIndexes.push(idx);
                  }
                });
                if (appliedCount === 0) { alert("No components were imported."); return; }

                // Enqueue only copied indexes for touch
                var importPayload = makeTouchedPayloadForIndexes(toSkinImport, copiedIndexes);
                if (importPayload) {
                  enqueueTouchedPayload(importPayload);
                }

                var shouldSaveImport = confirm(appliedCount + " component(s) imported successfully. Click OK to save changes (script will run touch steps after server-confirmation).");
                if (shouldSaveImport) {
                  saveTheme();
                  alert('Save initiated. The touch steps will run automatically after the save completes. Check console for progress and the "Touch Progress" modal.');
                } else {
                  alert("Changes not saved. Refresh the page to cancel the changes.");
                }
              }

              if (navigator.clipboard && navigator.clipboard.readText) {
                try {
                  var clipboardData = await navigator.clipboard.readText();
                  await processImport(clipboardData);
                } catch (err) {
                  var fallbackImport = prompt("Paste the exported data here:");
                  await processImport(fallbackImport);
                }
              } else {
                var importJson = prompt("Paste the exported data here:");
                await processImport(importJson);
              }
              return;
            }

          })();
        }; // end copyComponentsCode

        // Inject the function code into the page and execute it
        const s = document.createElement('script');
        s.type = 'text/javascript';
        s.textContent = '(' + copyComponentsCode.toString() + ')();';
        document.documentElement.appendChild(s);
        setTimeout(() => { try { s.parentNode && s.parentNode.removeChild(s); } catch(e) {} }, 1500);
      }; // end invoke function
    })();

    // small ready flag
    window.__CPToolkit_mergedLoaded = true;
    log('Merged CP Toolkit script loaded (copy + touch).');
  }).toString();

  // Inject into page
  const s = document.createElement("script");
  s.textContent = "(" + merged + ")();";
  document.documentElement.appendChild(s);
  setTimeout(()=>s.remove(), 2500);

})();

