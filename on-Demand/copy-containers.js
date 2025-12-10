// ============================================================================
// ON-DEMAND TOOL #2: COPY CONTAINERS TO ANOTHER LAYOUT
// ============================================================================
function copyContainersToLayout() {
    if (!pageMatches(['Layout-Page'])) {
        alert('This tool only works on Layout Pages');
        return;
    }

    console.log(TOOLKIT_NAME + ' Running Copy Containers tool');

    // Inject the copy containers code into page context to access page functions
    const copyContainersCode = function() {
        // ----------------------------
        // Helper utilities (defensive)
        // ----------------------------
        function safeJq(el) {
            try {
                if (!el) return jQuery();
                return el instanceof jQuery ? el : jQuery(el);
            } catch (e) {
                return jQuery();
            }
        }

        function safeGetId(el) {
            try {
                var $el = safeJq(el);
                if (!$el || $el.length === 0) return null;
                return $el.attr('id') || ($el[0] && $el[0].id) || null;
            } catch (e) {
                return null;
            }
        }

        function safeGetContainerInstanceId($pageOrContainer) {
            try {
                var $el = safeJq($pageOrContainer);
                if (!$el || $el.length === 0) return null;
                var cid = $el.attr('data-containerid');
                if (!cid && $el.data) cid = $el.data('containerid');
                return cid ? String(cid) : null;
            } catch (e) {
                return null;
            }
        }

        function escapeSelector(sel) {
            // jQuery/CSS escape for IDs that may contain special characters
            if (typeof sel !== 'string') return sel;
            return sel.replace(/([ #;?%&,.+*~\':"!^$[\]()=>|\/@])/g, "\\$1");
        }

        // ----------------------------
        // Main variables & selection
        // ----------------------------
        var contentContainers = jQuery("[data-cprole='contentContainer']:not(.megaMenu):not(#featureColumn)");
        var copyableContentContainers = [];
        var currentCopyIterator = -1;

        // Find only the content containers that contain widgets (deep search)
        contentContainers.each(function() {
            try {
                if (jQuery(this).find(".widget").length > 0) {
                    copyableContentContainers.push(this);
                }
            } catch (e) {
                console.warn("[CP Toolkit] Error checking container for widgets:", e, this);
            }
        });

        if (!copyableContentContainers.length || window.location.pathname.indexOf("Layout-Page") <= 0) {
            alert("You must be on a layout page and containers must have widgets placed in them to use the copy tool.");
            return;
        }

        // Keep originals so we can restore
        var originalCloseContentContainerOptionsPopup = window.closeContentContainerOptionsPopup;
        var originalAlertFunction = window.alert;

        // Kick off the first container
        prepareContainerCopy(0);

        // ----------------------------
        // UI helpers (unchanged, defensive)
        // ----------------------------
        function defocusElement(element) {
            try {
                jQuery(element).css("border", "none");
            } catch (e) {}
        }

        function focusElement(element) {
            try {
                var $el = jQuery(element);
                if ($el && $el.length) {
                    jQuery("html, body").animate({ scrollTop: $el.offset().top - 400 }, 100);
                    $el.css("border", "5px solid red");
                    $el.fadeIn(200).fadeOut(200).fadeIn(200).fadeOut(200).fadeIn(200);
                }
            } catch (e) {}
        }

        // ----------------------------
        // Robust checkIfOpen (polling)
        // ----------------------------
        function checkIfOpen(popupElementOrSelector, callback) {
            try {
                var $popupTarget = safeJq(popupElementOrSelector);

                // Try to derive the GUID used by the popover anchor.
                // Prefer the actual #anchorOptions value (this is usually reliable).
                function getCurrentAnchorGuid() {
                    try {
                        var anchorVal = jQuery("#anchorOptions").val();
                        if (anchorVal) {
                            // anchorVal often is like "#guid" or "#innerId"
                            return String(anchorVal).replace("#", "");
                        }
                        // Fallback: if popupElementOrSelector is a container DOM/jQuery element, find the closest ancestor that carries an id used as anchor
                        if ($popupTarget && $popupTarget.length) {
                            var $closest = $popupTarget.closest("[data-cprole]");
                            var cid = safeGetId($closest);
                            if (cid) return cid;
                        }
                    } catch (e) {
                        // ignore
                    }
                    return null;
                }

                var expectedGuid = getCurrentAnchorGuid();

                // Poll until the popover is anchored to expectedGuid
                (function poll() {
                    try {
                        var current = jQuery("#anchorOptions").val();
                        if (current) current = String(current).replace("#", "");
                        // If anchorOptions isn't available yet, attempt other heuristics
                        if (!current && $popupTarget && $popupTarget.length) {
                            current = safeGetId($popupTarget.closest("[data-cprole]")) || null;
                        }

                        if (current && expectedGuid && current === expectedGuid) {
                            // Make dialog friendly for automation:
                            try {
                                jQuery("li.left:not(:contains('Copy To'))").css("display", "none");
                                jQuery("#advancedWidgetOptions").css("display", "none");
                            } catch (e) {}

                            try {
                                var originalMessageText = jQuery("li.left:contains('Copy To') .tip:not(.hidden)").html() || "";
                                var additionalMessageText = "<br><br><span style='color: red;'>[CP Toolkit]<br>The container options and inheritance settings will also be copied.</span>";
                                jQuery("li.left:contains('Copy To') .tip:not(.hidden)").html(originalMessageText + additionalMessageText);
                            } catch (e) {}

                            try {
                                jQuery(".cpPopOverFooter .button span:contains('Done')").parent(".button").remove();
                                jQuery(".cpPopOverFooter .button.cancel").text("Skip");
                            } catch (e) {}

                            // Call the callback
                            try { callback(); } catch (e) { console.error("[CP Toolkit] checkIfOpen callback error:", e); }
                        } else {
                            setTimeout(poll, 400);
                        }
                    } catch (err) {
                        console.error("[CP Toolkit] checkIfOpen error:", err);
                        setTimeout(poll, 400);
                    }
                })();
            } catch (err) {
                console.error("[CP Toolkit] checkIfOpen fatal error:", err);
                try { callback(); } catch (e) {}
            }
        }

        // ----------------------------
        // Orchestrator: open container options, install overrides and bind copy button
        // ----------------------------
        function prepareContainerCopy(i) {
            currentCopyIterator = i;

            var $container = jQuery(copyableContentContainers[i]);
            if (!$container || $container.length === 0) {
                // Nothing to do; advance
                if (i + 1 < copyableContentContainers.length) {
                    prepareContainerCopy(i + 1);
                }
                return;
            }

            // Focus and open the container options
            try {
                $container.find(".containerOptions").first().click();
            } catch (e) {
                console.warn("[CP Toolkit] Could not click containerOptions:", e);
            }

            focusElement($container);

            // compute a robust source identifier (external id or container wrapper id) for mapping to destination pages
            var sourceExternalId = null; // text representation of ExternalID (if present inside markup)
            try {
                // Many CP structures include a .contentContainerID element which contains the external id / label
                var $contentContainerIdElem = $container.find(".contentContainerID").first();
                if ($contentContainerIdElem && $contentContainerIdElem.length) {
                    sourceExternalId = String($contentContainerIdElem.text()).trim();
                }
            } catch (e) {}

            // Also compute wrapperId (closest [data-cprole] id) and keep it as fallback
            var wrapperId = safeGetId($container.closest("[data-cprole]")) || safeGetId($container);

            // Wait for the options popover to be open/anchored to this container
            checkIfOpen($container, function() {
                // Install defensive overrides for close popup and alert (so we can continue to next container automatically)
                try {
                    // override close handler, which is also run during a copy
                    window.closeContentContainerOptionsPopup = function($handler) {
                        try {
                            if (typeof originalCloseContentContainerOptionsPopup === "function") {
                                originalCloseContentContainerOptionsPopup($handler);
                            }
                        } catch (e) {
                            console.warn("[CP Toolkit] Original closeContentContainerOptionsPopup threw:", e);
                        }

                        if (currentCopyIterator < copyableContentContainers.length - 1) {
                            setTimeout(function() {
                                try {
                                    if (currentCopyIterator >= 0 && copyableContentContainers[currentCopyIterator]) {
                                        defocusElement(copyableContentContainers[currentCopyIterator]);
                                    }
                                } catch (e) {}
                                try { prepareContainerCopy(currentCopyIterator + 1); } catch (e) { console.warn("[CP Toolkit] prepareContainerCopy error:", e); }
                            }, 500);
                        } else {
                            try {
                                defocusElement(copyableContentContainers[currentCopyIterator]);
                            } catch (e) {}
                        }

                        // restore original to keep page sane
                        try { window.closeContentContainerOptionsPopup = originalCloseContentContainerOptionsPopup; } catch (e) {}
                    };
                } catch (err) {
                    console.error("[CP Toolkit] Error installing closeContentContainerOptionsPopup override:", err);
                }

                // Prevent annoying alert modal on successful copy, but allow other alerts
                try {
                    window.alert = function(message) {
                        try {
                            if (typeof message === "string" && message.indexOf("Container copy successful") !== -1) {
                                console.log("[CP Toolkit] suppressed alert:", message);
                                return;
                            }
                        } catch (e) {}
                        // fallback to original for other messages
                        try { return originalAlertFunction.apply(window, arguments); } catch (e) {}
                    };
                } catch (err) {
                    console.error("[CP Toolkit] Error overriding alert:", err);
                    try { window.alert = originalAlertFunction; } catch (e) {}
                }

                // Bind the copy button (namespace handler to avoid duplicates)
                try {
                    jQuery("#copyContainerToSelected").off("click._cpToolkit").on("click._cpToolkit", function() {
                        // Collect selected destination layout IDs
                        var copyTo = [];
                        jQuery("#contentContainerCheckboxDiv input").each(function() {
                            try {
                                var $inp = jQuery(this);
                                if ($inp.is(":checked")) {
                                    var pid = $inp.attr("data-copycontainerpageid") || $inp.data("copycontainerpageid");
                                    if (pid) copyTo.push(pid);
                                }
                            } catch (e) {}
                        });

                        // Determine source container identity robustly:
                        // 1) anchorOptions (if present) -> find closest [data-cprole]
                        // 2) fallback to wrapperId computed earlier
                        // 3) fallback to any id on the anchor element
                        var sourceContainerId = null;
                        var sourceContainerExternalId = sourceExternalId || null; // External id text, may be used for matching on dest page
                        try {
                            var anchorVal = jQuery("#anchorOptions").val();
                            var $anchorEl = null;
                            if (anchorVal) {
                                try { $anchorEl = jQuery(anchorVal); } catch (e) { $anchorEl = null; }
                            }
                            var $sourceWrapper = null;
                            if ($anchorEl && $anchorEl.length) {
                                $sourceWrapper = $anchorEl.closest("[data-cprole]");
                            }
                            if (!$sourceWrapper || $sourceWrapper.length === 0) {
                                // fallback to the currently focused container's wrapper
                                $sourceWrapper = jQuery(copyableContentContainers[currentCopyIterator]).closest("[data-cprole]");
                            }
                            sourceContainerId = safeGetId($sourceWrapper) || safeGetId($anchorEl) || wrapperId || null;

                            // If we didn't detect a contentExternalId earlier, try again with anchor
                            if (!sourceContainerExternalId && $sourceWrapper && $sourceWrapper.length) {
                                try {
                                    var $maybeExternal = $sourceWrapper.find(".contentContainerID").first();
                                    if ($maybeExternal && $maybeExternal.length) sourceContainerExternalId = String($maybeExternal.text()).trim();
                                } catch (e) {}
                            }
                        } catch (e) {
                            console.warn("[CP Toolkit] Could not compute source container id reliably:", e);
                        }

                        // Read other options
                        var alignment = (function() { try { return jQuery("select[name=columnAlignment]").val(); } catch (e) { return null; } })();
                        var breakpoint = (function() { try { return jQuery("input[name='contentContainerbreakpoint']").val(); } catch (e) { return null; } })();
                        var smoothScrolling = (function() { try { return jQuery("input[name='IsSmoothScrolling']").is(":checked"); } catch (e) { return false; } })();
                        var inheritanceLocked = false;
                        try {
                            if (anchorVal) {
                                var $anchorEl = null;
                                try { $anchorEl = jQuery(anchorVal); } catch (e) { $anchorEl = null; }
                                if ($anchorEl && $anchorEl.length) {
                                    inheritanceLocked = $anchorEl.find(".inheritance").hasClass("locked");
                                }
                            }
                        } catch (e) {
                            console.warn("[CP Toolkit] Could not determine inheritance lock:", e);
                        }

                        // Call the function that will set options on destination layouts
                        copyContainerOptions(sourceContainerId, sourceContainerExternalId, alignment, breakpoint, smoothScrolling, inheritanceLocked, copyTo);
                    });
                } catch (err) {
                    console.error("[CP Toolkit] Error binding copy button:", err);
                }
            });
        }

        // ----------------------------
        // copyContainerOptions: posts options and optional inheritance to each destination
        // ----------------------------
        function copyContainerOptions(sourceContainerId, sourceExternalId, alignment, breakpoint, smoothScrolling, inheritanceLocked, destinationLayouts) {
            try {
                if (!destinationLayouts || !destinationLayouts.length) {
                    console.warn("[CP Toolkit] No destination layouts selected - nothing to do.");
                    return;
                }

                destinationLayouts.forEach(function(pageId) {
                    try {
                        console.log("[CP Toolkit] Processing destination page:", pageId, "for source:", sourceContainerId, sourceExternalId);

                        // GET destination page HTML
                        jQuery.get("/" + pageId).done(function(responseText) {
                            try {
                                // Parse into a detached DOM for robust selection
                                var $resp = jQuery("<div>").append(responseText);

                                // Attempt to find the copied container instance id (data-containerid) using multiple heuristics:

                                var copiedContainerInstanceId = null;

                                // Heuristic 1: If we have the source container wrapper id (sourceContainerId),
                                // look for the same id in response and then find a descendant with data-containerid
                                if (sourceContainerId) {
                                    try {
                                        var sel = "#" + escapeSelector(sourceContainerId);
                                        var $foundWrapper = $resp.find(sel).first();
                                        if ($foundWrapper && $foundWrapper.length) {
                                            // Look for descendant .pageContent [data-containerid]
                                            var $cand = $foundWrapper.find(".pageContent [data-containerid]").first();
                                            if (!$cand || !$cand.length) {
                                                // maybe the data-containerid is on the wrapper or a child
                                                $cand = $foundWrapper.find("[data-containerid]").first();
                                            }
                                            if ($cand && $cand.length) {
                                                copiedContainerInstanceId = safeGetContainerInstanceId($cand);
                                            }
                                        }
                                    } catch (e) {
                                        // ignore and continue
                                    }
                                }

                                // Heuristic 2: If we have a sourceExternalId (text inside .contentContainerID), find matching text in response
                                if (!copiedContainerInstanceId && sourceExternalId) {
                                    try {
                                        // find .contentContainerID elements with matching text, then find the closest pageContent/data-containerid nearby
                                        var $matches = $resp.find(".contentContainerID").filter(function() {
                                            try { return jQuery(this).text().trim() === String(sourceExternalId).trim(); } catch (e) { return false; }
                                        });
                                        if ($matches && $matches.length) {
                                            var $firstMatch = $matches.first();
                                            // try to find pageContent under the same wrapper
                                            var $wrapper = $firstMatch.closest("[data-cprole]");
                                            if ($wrapper && $wrapper.length) {
                                                var $cand = $wrapper.find(".pageContent [data-containerid]").first();
                                                if (!$cand || !$cand.length) $cand = $wrapper.find("[data-containerid]").first();
                                                if ($cand && $cand.length) copiedContainerInstanceId = safeGetContainerInstanceId($cand);
                                            }
                                        }
                                    } catch (e) {}
                                }

                                // Heuristic 3: find any .pageContent [data-containerid] and try to pick one that seems right (fallback)
                                if (!copiedContainerInstanceId) {
                                    try {
                                        var $any = $resp.find(".pageContent [data-containerid]").first();
                                        if (!$any || !$any.length) $any = $resp.find("[data-containerid]").first();
                                        if ($any && $any.length) copiedContainerInstanceId = safeGetContainerInstanceId($any);
                                    } catch (e) {}
                                }

                                // If we still don't have a copiedContainerInstanceId, warn and skip this page (but do not throw)
                                if (!copiedContainerInstanceId) {
                                    console.warn("[CP Toolkit] Could not determine copied container instance id for destination page", pageId, " (source:", sourceContainerId, sourceExternalId, "). Skipping options & inheritance for this page.");
                                    return;
                                }

                                // Now get the contentCollectionId (for inheritance). Prefer hidden input, fallback to searching other hidden inputs, fallback to regex
                                var contentCollectionId = null;
                                try {
                                    var $hidden = $resp.find("input#hdnContentCollectionID, input[name='hdnContentCollectionID']").first();
                                    if ($hidden && $hidden.length) {
                                        contentCollectionId = $hidden.val() || $hidden.attr("value") || null;
                                    }
                                } catch (e) {}

                                if (!contentCollectionId) {
                                    try {
                                        // fallback: any hidden input with "contentcollection" in id/name
                                        var $alts = $resp.find("input[type='hidden']").filter(function() {
                                            try {
                                                var idn = (jQuery(this).attr("id") || "").toLowerCase();
                                                var name = (jQuery(this).attr("name") || "").toLowerCase();
                                                return idn.indexOf("contentcollection") >= 0 || name.indexOf("contentcollection") >= 0;
                                            } catch (e) { return false; }
                                        }).first();
                                        if ($alts && $alts.length) {
                                            contentCollectionId = $alts.val() || $alts.attr("value") || null;
                                        }
                                    } catch (e) {}
                                }

                                if (!contentCollectionId) {
                                    try {
                                        // last resort: regex on the raw response
                                        var m = String(responseText).match(/hdnContentCollectionID"\s*value="([^"]+)"/i);
                                        if (m && m[1]) contentCollectionId = m[1];
                                    } catch (e) {}
                                }

                                // POST container options (alignment, breakpoint, smoothScrolling)
                                try {
                                    var postData = {
                                        contentContainerID: copiedContainerInstanceId,
                                        ColumnAlignment: (typeof alignment !== "undefined" && alignment !== null) ? alignment : "",
                                        Breakpoint: (typeof breakpoint !== "undefined" && breakpoint !== null) ? breakpoint : "",
                                        IsSmoothScrolling: (smoothScrolling ? "true" : "false")
                                    };

                                    // Use jQuery.param to produce form-encoded string (mirrors original server expectation)
                                    jQuery.post("/Layout/ContentContainerOptions/Save", jQuery.param(postData))
                                        .done(function() {
                                            console.log("[CP Toolkit] Successfully set container options for source:", sourceContainerId, "on layout", pageId);
                                        })
                                        .fail(function() {
                                            console.warn("[CP Toolkit] Failed to set container options for layout", pageId);
                                        });
                                } catch (e) {
                                    console.error("[CP Toolkit] Error posting container options:", e);
                                }

                                // POST start inheritance (only if requested and contentCollectionId present)
                                if (inheritanceLocked && contentCollectionId) {
                                    try {
                                        var inhData = {
                                            pageID: pageId,
                                            contentCollectionID: contentCollectionId,
                                            contentContainerID: copiedContainerInstanceId
                                        };
                                        jQuery.post("/Layout/ContentInheritance/StartInheritanceToSubpages", jQuery.param(inhData))
                                            .done(function() {
                                                console.log("[CP Toolkit] Successfully set inheritance options for source:", sourceContainerId, "on layout", pageId);
                                            })
                                            .fail(function() {
                                                console.warn("[CP Toolkit] Failed to set inheritance for layout", pageId);
                                            });
                                    } catch (e) {
                                        console.error("[CP Toolkit] Error posting inheritance:", e);
                                    }
                                } else if (inheritanceLocked && !contentCollectionId) {
                                    console.warn("[CP Toolkit] Inheritance requested but contentCollectionId not found for page", pageId);
                                }
                            } catch (err) {
                                console.error("[CP Toolkit] Error parsing destination page", pageId, err);
                            }
                        }).fail(function() {
                            console.warn("[CP Toolkit] Failed to fetch destination page", pageId);
                        });
                    } catch (outerErr) {
                        console.error("[CP Toolkit] Error processing destination layout", pageId, outerErr);
                    }
                });
            } catch (err) {
                console.error("[CP Toolkit] copyContainerOptions fatal error:", err);
            }
        }
    };

    // Execute the copy containers function in page context
    const script = document.createElement('script');
    script.textContent = '(' + copyContainersCode.toString() + ')();';
    document.body.appendChild(script);
    script.remove();
}



    // ============================================================================
    // ON-DEMAND TOOL #3: EXPORT CURRENT THEME
    // ============================================================================

    function exportCurrentTheme() {
        if (!pageMatches(['/designcenter/themes/'])) {
            alert('This tool only works in the Theme Manager');
            return;
        }

        console.log(TOOLKIT_NAME + ' Running Export Current Theme');

        // Inject the export code into page context to access DesignCenter
        const exportCode = function() {
            if (typeof DesignCenter === 'undefined' || !DesignCenter.themeJSON) {
                alert('Theme data not loaded. Please wait for the page to fully load.');
                return;
            }

            function ToolkitExportTheme() {
                var themeJSON = JSON.parse(JSON.stringify(DesignCenter.themeJSON));

                /* Reset these variables and set them again on theme upload */
                themeJSON.ThemeID = null;
                themeJSON.StructureID = null;
                themeJSON.ModifiedBy = null;
                themeJSON.WidgetSkins = null;
                if (themeJSON.AnimationContentHash !== "") {
                    alert("It looks like this theme may have animations active. These will not be exported.");
                }
                themeJSON.AnimationContentHash = "";
                themeJSON.AnimationFileName = "Animations-.css";
                themeJSON.AnimationsStyleFileID = null;
                themeJSON.ContentHash = null;
                themeJSON.FileName = null;

                $.each(themeJSON.MenuStyles, function() {
                    this.MenuStyleID = null;
                    this.ThemeID = null;
                    this.RecordStatus = DesignCenter.recordStatus.Modified;
                });

                $.each(themeJSON.SiteStyles, function() {
                    this.SiteStyleID = null;
                    this.ThemeID = null;
                    this.RecordStatus = DesignCenter.recordStatus.Modified;
                });

                themeJSON.ModuleStyle.ModuleStyleID = null;
                themeJSON.ModuleStyle.ThemeID = null;
                themeJSON.ModuleStyle.RecordStatus = DesignCenter.recordStatus.Modified;

                themeJSON.CreatedBy = null;
                themeJSON.CreatedOn = null;
                themeJSON.Name = themeJSON.Name + " imported";

                $.each(themeJSON.BannerOptions, function() {
                    this.BannerImages = [{
                        BannerImageID: 1,
                        BannerOptionID: null,
                        FileName: "EmptyBannerBkg201301091010127149.png",
                        Height: 50,
                        Width: 50,
                        StartingOn: null,
                        StoppingOn: null,
                        IsLink: false,
                        LinkAddress: null,
                        Sequence: 1,
                        RecordStatus: 0,
                        ModifiedBy: 0,
                        ModifiedOn: "0001-01-01 12:00:00",
                        AltText: null
                    }];
                    this.BannerVideos = [{
                        BannerVideoID: 2,
                        BannerOptionID: null,
                        VideoFileName: "",
                        ImageFileName: "EmptyBannerBkg201806291215069694.png",
                        IsLink: false,
                        LinkAddress: null,
                        ModifiedBy: 0,
                        ModifiedOn: "0001-01-01 12:00:00",
                        VideoFileID: "00000000-0000-0000-0000-000000000000",
                        ImageFileID: "00000000-0000-0000-0000-000000000000",
                        VideoWidth: 0,
                        VideoHeight: 0,
                        ImageWidth: 0,
                        ImageHeight: 0,
                        LinkedVideoUrl: "",
                        RecordStatus: 0,
                        AltText: null
                    }];
                    this.BannerOptionID = null;
                    this.BannerThemeID = null;
                    this.RecordStatus = DesignCenter.recordStatus.Modified;
                });

                $.each(themeJSON.BannerStyles, function() {
                    this.BannerStyleID = null;
                    this.ThemeID = null;
                    this.RecordStatus = DesignCenter.recordStatus.Modified;
                });

                $.each(themeJSON.Fonts, function() {
                    this.RecordStatus = DesignCenter.recordStatus.Modified;
                });

                /* Set the ContainerStyles to names that match XML */
                $.each(themeJSON.ContainerStyles, function() {
                    this.AnimationId = "00000000-0000-0000-0000-000000000000";
                    if (this.BackgroundImageFileName !== "") {
                        /* TODO: Create list of all background file names to fix and where at */
                    }
                    this.RecordStatus = DesignCenter.recordStatus.Modified;
                    var currentThemeJSONcontainerStyle = this;
                    var didSwitchContainer = false;
                    $.each(DesignCenter.structureJSON.ContentContainers, function() {
                        if (this.ContentContainerID == currentThemeJSONcontainerStyle.ContentContainerID) {
                            currentThemeJSONcontainerStyle.ContentContainerID = this.ExternalID;
                            didSwitchContainer = true;
                        }
                    });
                    if (!didSwitchContainer) {
                        console.warn("[CP Toolkit] Could not match ID: " + this.ContentContainerID);
                    }
                });

                return themeJSON;
            }

            function downloadObjectAsJson(exportObj, exportName) {
                var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
                var downloadAnchorNode = document.createElement("a");
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", exportName + ".json");
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
            }

            downloadObjectAsJson(
                ToolkitExportTheme(),
                window.location.hostname.replace(".civicplus.com", "") + " " + DesignCenter.themeJSON.Name
            );

            console.log("[CP Toolkit] Theme exported successfully");
        };

        const script = document.createElement('script');
        script.textContent = '(' + exportCode.toString() + ')();';
        document.body.appendChild(script);
        script.remove();
    }
