    // ============================================================================
    // ON-DEMAND TOOL #4: IMPORT THEME
    // ============================================================================

    function importTheme() {
        if (!pageMatches(['/designcenter/themes/'])) {
            alert('This tool only works in the Theme Manager');
            return;
        }

        console.log(TOOLKIT_NAME + ' Running Import Theme');

        // Inject the import code into page context to access DesignCenter
        const importCode = function() {
            if (typeof DesignCenter === 'undefined' || !DesignCenter.themeJSON) {
                alert('Theme data not loaded. Please wait for the page to fully load.');
                return;
            }

            var copyOfOriginalDesignCenterThemeJSON = JSON.parse(JSON.stringify(DesignCenter.themeJSON));

            function ToolkitParseUploadedTheme(themeJSON) {
                var themeJSONupload = JSON.parse(JSON.stringify(themeJSON));

                themeJSONupload.ThemeID = copyOfOriginalDesignCenterThemeJSON.ThemeID;
                themeJSONupload.StructureID = copyOfOriginalDesignCenterThemeJSON.StructureID;
                themeJSONupload.ModifiedBy = copyOfOriginalDesignCenterThemeJSON.ModifiedBy;
                themeJSONupload.WidgetSkins = copyOfOriginalDesignCenterThemeJSON.WidgetSkins;

                themeJSONupload.ModuleStyle.ModuleStyleID = copyOfOriginalDesignCenterThemeJSON.ModuleStyle.ModuleStyleID;
                themeJSONupload.ModuleStyle.ThemeID = copyOfOriginalDesignCenterThemeJSON.ModuleStyle.ThemeID;

                themeJSONupload.FileName = copyOfOriginalDesignCenterThemeJSON.FileName;
                themeJSONupload.ContentHash = copyOfOriginalDesignCenterThemeJSON.ContentHash;

                themeJSONupload.CreatedBy = copyOfOriginalDesignCenterThemeJSON.CreatedBy;
                themeJSONupload.CreatedOn = copyOfOriginalDesignCenterThemeJSON.CreatedOn;

                var newContainerStyles = [];

                $.each(DesignCenter.themeJSON.ContainerStyles, function() {
                    var nonUploadedContainerStyle = this;

                    var thisExternalId = null;
                    $.each(DesignCenter.structureJSON.ContentContainers, function() {
                        if (nonUploadedContainerStyle.ContentContainerID == this.ContentContainerID) {
                            thisExternalId = this.ExternalID;
                        }
                    });

                    $.each(themeJSONupload.ContainerStyles, function() {
                        if (this.ContentContainerID == thisExternalId) {
                            this.ContentContainerID = nonUploadedContainerStyle.ContentContainerID;
                            this.DefaultWidgetSkinID = 0;
                            this.ThemeID = copyOfOriginalDesignCenterThemeJSON.ModuleStyle.ThemeID;
                            console.log("[CP Toolkit] Resetting widget skin ID on '" + this.ContentContainerID + "'. It was " + this.DefaultWidgetSkinID);
                            newContainerStyles.push(this);
                        }
                    });
                });

                themeJSONupload.ContainerStyles = newContainerStyles;

                $.each(themeJSONupload.SiteStyles, function() {
                    var uploadedSiteStyle = this;
                    $.each(copyOfOriginalDesignCenterThemeJSON.SiteStyles, function() {
                        if (this.Selector == uploadedSiteStyle.Selector) {
                            uploadedSiteStyle.SiteStyleID = this.SiteStyleID;
                            uploadedSiteStyle.ThemeID = this.ThemeID;
                        }
                    });
                });

                $.each(themeJSONupload.MenuStyles, function() {
                    var uploadedSiteStyle = this;
                    $.each(copyOfOriginalDesignCenterThemeJSON.MenuStyles, function() {
                        if (this.Name == uploadedSiteStyle.Name) {
                            uploadedSiteStyle.MenuStyleID = this.MenuStyleID;
                            uploadedSiteStyle.ThemeID = this.ThemeID;
                        }
                    });
                });

                $.each(themeJSONupload.BannerOptions, function() {
                    var uploadedSiteStyle = this;
                    $.each(copyOfOriginalDesignCenterThemeJSON.BannerOptions, function() {
                        if (this.SlotName == uploadedSiteStyle.SlotName) {
                            uploadedSiteStyle.BannerOptionID = this.BannerOptionID;
                            uploadedSiteStyle.BannerThemeID = this.BannerThemeID;
                            uploadedSiteStyle.BannerImages = this.BannerImages;
                            uploadedSiteStyle.BannerVideos = this.BannerVideos;
                        }
                    });
                });

                $.each(themeJSONupload.BannerStyles, function() {
                    var uploadedSiteStyle = this;
                    $.each(copyOfOriginalDesignCenterThemeJSON.BannerStyles, function() {
                        if (this.SlotName == uploadedSiteStyle.SlotName) {
                            uploadedSiteStyle.BannerStyleID = this.BannerStyleID;
                            uploadedSiteStyle.ThemeID = this.ThemeID;
                        }
                    });
                });

                return themeJSONupload;
            }

            var shouldImportTheme = confirm(
                "Importing a theme will override all styles associated with the current theme. You must manually upload the correct XML/CSS for this theme before importing."
            );

            if (shouldImportTheme) {
                $("<input type='file' style='display: none;' id='toolkitThemeJSONUpload'>").appendTo("body");
                $("#toolkitThemeJSONUpload").change(function() {
                    var file = this.files[0];
                    var reader = new FileReader();
                    reader.readAsText(file);

                    reader.onloadend = function(e) {
                        console.log("[CP Toolkit] Loaded new theme JSON. Parsing...");
                        var data = JSON.parse(e.target.result);
                        var parsedThemeData = ToolkitParseUploadedTheme(data);
                        console.log(parsedThemeData);

                        DesignCenter.themeJSON = parsedThemeData;

                        if (confirm("Are you SURE that you want to override the current theme with the uploaded theme? Click OK to continue or Cancel to cancel.")) {
                            saveTheme(true);
                            setTimeout(function() {
                                saveThemeStyleSheet(true);
                            }, 2000);
                        }
                    };
                });
                $("#toolkitThemeJSONUpload").click();
            }

            console.log("[CP Toolkit] Import theme initialized");
        };

        const script = document.createElement('script');
        script.textContent = '(' + importCode.toString() + ')();';
        document.body.appendChild(script);
        script.remove();
    }

    // ============================================================================
    // ON-DEMAND TOOL #5: COPY WIDGET SKIN COMPONENT(S)
    // ============================================================================

    function copyWidgetSkinComponents() {
        if (!pageMatches(['/designcenter/themes/'])) {
            alert('This tool only works in the Theme Manager');
            return;
        }

        console.log(TOOLKIT_NAME + ' Running Copy Widget Skin Components');

        // Inject the code into page context to access DesignCenter
        const copyComponentsCode = function() {
            (async function() {
                // Copy widget skin component to another widget skin.js
                // ------------------------------------------------------
                // This tool supports three modes:
                // 1. Local Copy: Copy components between skins on the same site.
                // 2. Export: Copy selected components to clipboard as JSON for use on another site.
                // 3. Import: Paste JSON from clipboard and apply to a skin on this site.
                //
                // Enhanced with security validations for CMS environment.
                if (!DesignCenter || !DesignCenter.themeJSON || !DesignCenter.themeJSON.WidgetSkins) {
                    alert("Error: Design Center data not available. Please ensure you are in the theme editor.");
                    return;
                }

                var mode = prompt(
                    "Select mode:\n1 = Local Copy (same site)\n2 = Export (copy to clipboard)\n3 = Import (paste from clipboard)\n\nEnter 1, 2, or 3:"
                );

                if (!mode || !["1", "2", "3"].includes(mode.trim())) {
                    alert("Invalid mode selection. Operation cancelled.");
                    return;
                }

                var widgetSkinComponentTypes = [
                    "Wrapper",
                    "Header",
                    "Item List",
                    "Item",
                    "Item Title",
                    "Item Secondary Text",
                    "Item Bullets",
                    "Item Link",
                    "Read On",
                    "View All",
                    "RSS",
                    "Footer",
                    "Tab List",
                    "Tab",
                    "Tab Panel",
                    "Column Seperator",
                    "Calendar Header",
                    "Cal Grid",
                    "Cal Day Headers",
                    "Cal Day",
                    "Cal Event Link",
                    "Cal Today"
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

                var SKIN_MODAL_STYLE_ID = "widget-skin-selector-style";

                function ensureSkinSelectionStyles() {
                    if (document.getElementById(SKIN_MODAL_STYLE_ID)) return;
                    var style = document.createElement("style");
                    style.id = SKIN_MODAL_STYLE_ID;
                    style.textContent =
                        ".widget-skin-modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483647;" +
                        "background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:20px;}" +
                        ".widget-skin-modal{background:#fff;color:#222;max-width:620px;width:100%;max-height:90vh;display:flex;flex-direction:column;" +
                        "border-radius:6px;box-shadow:0 20px 60px rgba(0,0,0,0.4);padding:20px;font-family:Arial,Helvetica,sans-serif;}" +
                        ".widget-skin-modal h2{margin:0 0 8px;font-size:20px;}" +
                        ".widget-skin-modal p{margin:0 0 12px;font-size:14px;line-height:1.4;}" +
                        ".widget-skin-modal__select{width:100%;border:1px solid #c7c7c7;border-radius:4px;padding:6px;font-size:14px;" +
                        "min-height:220px;flex:1;box-sizing:border-box;}" +
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
                            if (overlay && overlay.parentNode) {
                                overlay.parentNode.removeChild(overlay);
                            }
                            resolve(value);
                        }

                        function handleKey(evt) {
                            if (evt.key === "Escape") {
                                evt.preventDefault();
                                cleanup(null);
                            }
                            if ((evt.key === "Enter" || evt.key === "NumpadEnter") && document.activeElement === select && select.value) {
                                evt.preventDefault();
                                cleanup(select.value);
                            }
                        }

                        document.addEventListener("keydown", handleKey, true);

                        select.addEventListener("change", function() {
                            selectBtn.disabled = !select.value;
                        });

                        select.addEventListener("dblclick", function() {
                            if (select.value) {
                                cleanup(select.value);
                            }
                        });

                        selectBtn.addEventListener("click", function() {
                            if (!selectBtn.disabled && select.value) {
                                cleanup(select.value);
                            }
                        });

                        cancelBtn.addEventListener("click", function() {
                            cleanup(null);
                        });

                        overlay.addEventListener("click", function(evt) {
                            if (evt.target === overlay) {
                                cleanup(null);
                            }
                        });

                        setTimeout(function() {
                            if (skins.length > 0) {
                                select.focus();
                            }
                        }, 0);
                    });
                }

                var widgetSkinComponentTypeList = "";
                for (var i = 0; i < widgetSkinComponentTypes.length; i++) {
                    if (i % 2 === 0 && i + 1 < widgetSkinComponentTypes.length) {
                        widgetSkinComponentTypeList += widgetSkinComponentTypes[i] + ": " + i + " | " +
                            widgetSkinComponentTypes[i + 1] + ": " + (i + 1) + "\n";
                    } else if (i % 2 === 1) {
                        continue;
                    } else {
                        widgetSkinComponentTypeList += widgetSkinComponentTypes[i] + ": " + i + "\n";
                    }
                }
                widgetSkinComponentTypeList += "\nSelect All: " + widgetSkinComponentTypes.length + "\n";

                function validateComponentIndexes(input) {
                    if (!input || typeof input !== "string") return null;

                    var trimmedInput = input.trim();

                    if (trimmedInput === widgetSkinComponentTypes.length.toString()) {
                        var allIndexes = [];
                        for (var idx = 0; idx < widgetSkinComponentTypes.length; idx++) {
                            allIndexes.push(idx);
                        }
                        return allIndexes;
                    }

                    var indexes = input.split(",").map(function(idx) {
                        return parseInt(idx.trim(), 10);
                    }).filter(function(idx) {
                        return !isNaN(idx) && idx >= 0 && idx < widgetSkinComponentTypes.length;
                    });

                    return indexes.length > 0 ? indexes : null;
                }

                function findSkinById(skinId) {
                    if (!skinId) return null;
                    var foundSkin = null;
                    $.each(DesignCenter.themeJSON.WidgetSkins, function() {
                        if (this.WidgetSkinID == skinId && this.Components) {
                            foundSkin = this;
                            return false;
                        }
                    });
                    return foundSkin;
                }

                function validateComponentData(component) {
                    if (!component || typeof component !== "object") return false;
                    return true;
                }

                if (mode.trim() === "1") {
                    var skinToCopy = await showSkinSelectionModal({
                        title: "Select source widget skin",
                        message: "Choose the skin you would like to copy components from.",
                        skins: validSkins,
                        confirmText: "Use skin"
                    });

                    if (!skinToCopy) {
                        alert("Operation cancelled.");
                        return;
                    }

                    var skinToEdit = await showSkinSelectionModal({
                        title: "Select destination widget skin",
                        message: "Choose the skin you would like to copy components to.",
                        skins: validSkins,
                        confirmText: "Use skin"
                    });

                    if (!skinToEdit) {
                        alert("Operation cancelled.");
                        return;
                    }

                    var fromSkin = findSkinById(skinToCopy);
                    var toSkin = findSkinById(skinToEdit);

                    if (!fromSkin || !toSkin) {
                        alert("Error: One or both selected skins not found.");
                        return;
                    }

                    var correctSkinNames = confirm(
                        "Copying from skin '" + fromSkin.Name + "' to '" + toSkin.Name + "'. If this is not correct, click cancel."
                    );

                    if (correctSkinNames && skinToCopy !== skinToEdit) {
                        var componentsToCopy = prompt(
                            "Which components would you like to copy?\n(comma separate, e.g. 0,1,2 or enter " + widgetSkinComponentTypes.length + " for all)\n\n" + widgetSkinComponentTypeList
                        );

                        var componentIndexes = validateComponentIndexes(componentsToCopy);
                        if (!componentIndexes) {
                            alert("Error: Invalid component selection.");
                            return;
                        }

                        $.each(componentIndexes, function(_, idx) {
                            if (fromSkin.Components[idx]) {
                                var shouldCopy = confirm(
                                    "Copying " + widgetSkinComponentTypes[idx] + ". Click OK to confirm or Cancel to skip"
                                );
                                if (shouldCopy) {
                                    toSkin.RecordStatus = DesignCenter.recordStatus.Modified;
                                    toSkin.Components[idx] = Object.assign({}, fromSkin.Components[idx]);
                                    toSkin.Components[idx].WidgetSkinID = parseInt(skinToEdit, 10);
                                    toSkin.Components[idx].RecordStatus = DesignCenter.recordStatus.Modified;
                                }
                            }
                        });

                        var shouldSave = confirm("Widget skin components copied. Click OK to save changes.");
                        if (shouldSave) {
                            saveTheme();
                        } else {
                            alert("Changes not saved. Refresh the page to cancel the changes.");
                        }
                    } else if (skinToCopy === skinToEdit) {
                        alert("You cannot copy to the same skin.");
                    }
                    return;
                }

                if (mode.trim() === "2") {
                    var skinToExport = await showSkinSelectionModal({
                        title: "Select skin to export from",
                        message: "Choose the skin whose components you would like to export.",
                        skins: validSkins,
                        confirmText: "Export from this skin"
                    });
                    if (!skinToExport) {
                        alert("Operation cancelled.");
                        return;
                    }

                    var fromSkinExport = findSkinById(skinToExport);

                    if (!fromSkinExport) {
                        alert("Error: Selected skin not found.");
                        return;
                    }

                    var componentsToExport = prompt(
                        "Which components would you like to export?\n(comma separate, e.g. 0,1,2 or enter " + widgetSkinComponentTypes.length + " for all)\n\n" + widgetSkinComponentTypeList
                    );

                    var componentIndexesExport = validateComponentIndexes(componentsToExport);
                    if (!componentIndexesExport) {
                        alert("Error: Invalid component selection.");
                        return;
                    }

                    var exportData = {
                        version: "1.0",
                        exportedAt: new Date().toISOString(),
                        skinName: fromSkinExport.Name,
                        skinID: fromSkinExport.WidgetSkinID,
                        componentIndexes: componentIndexesExport,
                        components: []
                    };

                    $.each(componentIndexesExport, function(_, idx) {
                        if (fromSkinExport.Components[idx] && validateComponentData(fromSkinExport.Components[idx])) {
                            exportData.components.push({
                                idx: idx,
                                type: widgetSkinComponentTypes[idx],
                                data: fromSkinExport.Components[idx]
                            });
                        }
                    });

                    if (exportData.components.length === 0) {
                        alert("Error: No valid components to export.");
                        return;
                    }

                    var exportJson = JSON.stringify(exportData, null, 2);

                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        try {
                            await navigator.clipboard.writeText(exportJson);
                            alert("Exported! Data copied to clipboard.\n\nPaste it on the destination site using Import mode.");
                        } catch (err) {
                            alert("Failed to copy to clipboard. You can manually copy the data from the next prompt.");
                            prompt("Copy this data:", exportJson);
                        }
                    } else {
                        prompt("Copy this data:", exportJson);
                    }
                    return;
                }

                if (mode.trim() === "3") {
                    async function processImport(importJson) {
                        if (!importJson || typeof importJson !== "string") {
                            alert("Error: No data provided.");
                            return;
                        }

                        var importData;
                        try {
                            importData = JSON.parse(importJson);
                        } catch (e) {
                            alert("Error: Invalid JSON data. Please ensure you copied the export data correctly.");
                            return;
                        }

                        if (!importData || typeof importData !== "object" ||
                            !importData.version || !importData.components || !Array.isArray(importData.components) ||
                            !importData.componentIndexes || !Array.isArray(importData.componentIndexes)) {
                            alert("Error: Invalid import data structure. Please ensure you're using data exported from this tool.");
                            return;
                        }

                        if (importData.version !== "1.0") {
                            if (!confirm("Warning: Import data is from a different version. Continue anyway?")) {
                                return;
                            }
                        }

                        var validIndexes = importData.componentIndexes.filter(function(idx) {
                            return typeof idx === "number" && idx >= 0 && idx < widgetSkinComponentTypes.length;
                        });

                        if (validIndexes.length === 0) {
                            alert("Error: No valid component indexes in import data.");
                            return;
                        }

                        var componentNames = validIndexes.map(function(idx) {
                            return widgetSkinComponentTypes[idx];
                        }).join(", ");

                        var info = "Import from skin: " + (importData.skinName || "Unknown") +
                            " (ID: " + (importData.skinID || "Unknown") + ")\n" +
                            "Components: " + componentNames + "\n\n" +
                            "Continue with import?";

                        if (!confirm(info)) return;

                        var skinToEditImport = await showSkinSelectionModal({
                            title: "Select destination widget skin",
                            message: "Choose the skin that should receive the imported components.",
                            skins: validSkins,
                            confirmText: "Import into this skin"
                        });
                        if (!skinToEditImport) {
                            alert("Operation cancelled.");
                            return;
                        }

                        var toSkinImport = findSkinById(skinToEditImport);

                        if (!toSkinImport) {
                            alert("Error: Destination skin not found.");
                            return;
                        }

                        var appliedCount = 0;
                        $.each(importData.components, function(_, componentData) {
                            var idx = componentData.idx;

                            if (typeof idx !== "number" || idx < 0 || idx >= widgetSkinComponentTypes.length ||
                                !componentData.data || !validateComponentData(componentData.data)) {
                                console.warn("Skipping invalid component at index " + idx);
                                return;
                            }

                            var shouldCopy = confirm(
                                "Import component '" + widgetSkinComponentTypes[idx] + "' into skin '" + toSkinImport.Name + "'?\n\n" +
                                "Click OK to confirm or Cancel to skip."
                            );

                            if (shouldCopy) {
                                toSkinImport.RecordStatus = DesignCenter.recordStatus.Modified;
                                toSkinImport.Components[idx] = Object.assign({}, componentData.data);
                                toSkinImport.Components[idx].WidgetSkinID = parseInt(skinToEditImport, 10);
                                toSkinImport.Components[idx].RecordStatus = DesignCenter.recordStatus.Modified;
                                appliedCount++;
                            }
                        });

                        if (appliedCount === 0) {
                            alert("No components were imported.");
                            return;
                        }

                        var shouldSaveImport = confirm(appliedCount + " component(s) imported successfully. Click OK to save changes.");
                        if (shouldSaveImport) {
                            saveTheme();
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
        };

        const script = document.createElement('script');
        script.textContent = '(' + copyComponentsCode.toString() + ')();';
        document.body.appendChild(script);
        script.remove();
    }
