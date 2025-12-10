 // ============================================================================
    // ON-DEMAND TOOL #6: SETUP DEFAULT WIDGET OPTION SETS
    // ============================================================================

    function setupDefaultWidgetOptionSets() {
        if (!pageMatches(['/designcenter/widgets/'])) {
            alert('This tool only works in the Widget Manager');
            return;
        }

        console.log(TOOLKIT_NAME + ' Running Setup Default Widget Option Sets');

        // This is a very long script with lots of JSON configuration data
        // Injecting it into page context
        const setupOptionsCode = `(function() {
            if (typeof ajaxPostBackStart === 'undefined' || typeof ajaxPostBackEnd === 'undefined') {
                alert('Widget Manager functions not loaded. Please wait for the page to fully load.');
                return;
            }

            ajaxPostBackStart("Please wait... This will only take a moment.");
            $("#divAjaxProgress")
                .clone()
                .attr("id", "toolkit-block")
                .css("z-index", "90000001")
                .appendTo("body");
            ajaxPostBackEnd();

            function addOptionSet_ts(widgetType, name, widgetName, jsonParameters) {
                var optionSetToChange = $(".sidebar:contains('" + widgetName + "')").find(".sideBarOptionSet:contains('" + name + "')");
                if (optionSetToChange.length) {
                    var confirmationDialog = confirm(
                        "The option set:\\n" + name + "\\n\\nfor the widget type:\\n" + widgetName +
                        '\\n\\nalready exists. Click "OK" to override its settings, or click "Cancel" to skip this option set.'
                    );
                    if (confirmationDialog !== null) {
                        if (confirmationDialog) {
                            console.log("[CP Toolkit] Overriding " + name + " settings in " + widgetName);
                            var optionSetID = $(".sidebar:contains('" + widgetName + "')").find(".sideBarOptionSet:contains('" + name + "')")[0].id;
                            var data = {
                                defaultOptionSetID: 3,
                                moduleWidgetID: widgetType,
                                optionSetName: name,
                                saveJson: jsonParameters,
                                optionSetID: parseInt(optionSetID, 10)
                            };
                            $.ajax({
                                type: "POST",
                                url: "https://" + document.location.hostname + "/DesignCenter/Widgets/Save",
                                data: data
                            });
                        } else {
                            console.log("[CP Toolkit] Skipped " + name + " in " + widgetName);
                        }
                    }
                } else {
                    var data = {
                        setName: name,
                        moduleWidgetID: widgetType
                    };
                    $.ajax({
                        type: "POST",
                        url: "https://" + document.location.hostname + "/DesignCenter/OptionSet/Add",
                        data: data,
                        success: function(data) {
                            var saveData = {
                                defaultOptionSetID: 3,
                                moduleWidgetID: widgetType,
                                optionSetName: name,
                                saveJson: jsonParameters,
                                optionSetID: JSON.stringify(data.ID)
                            };
                            $.ajax({
                                type: "POST",
                                url: "https://" + document.location.hostname + "/DesignCenter/Widgets/Save",
                                data: saveData
                            });
                            console.log("[CP Toolkit] Creating " + name + " for the " + widgetName + " widget.");
                        }
                    });
                }
            }

            function finalOptionSetsToExecute(widgetType, name, widgetName, jsonParameters) {
                var categoryCount = 0;
                var optionSetID = $(".sidebar:contains('" + widgetName + "')").find(".sideBarOptionSet:contains('" + name + "')")[0].id;
                var data = {
                    defaultOptionSetID: 3,
                    moduleWidgetID: widgetType,
                    optionSetName: name,
                    saveJson: jsonParameters,
                    optionSetID: parseInt(optionSetID, 10)
                };
                $.ajax({
                    type: "POST",
                    url: "https://" + document.location.hostname + "/DesignCenter/Widgets/Save",
                    data: data
                }).done(function() {
                    categoryCount++;
                    if (categoryCount == 3) {
                        setTimeout(function() {
                            location.reload();
                        }, 5000);
                    }
                });
                console.log("[CP Toolkit] Updating the " + name + " for the " + widgetName + " widget.");
            }

            // Calendar option sets
            addOptionSet_ts(3, "Left Mini Calendar", "Calendar", '{"saveJson":"HeaderText-CPSplitter-CPStringSplitter' + "HeaderImage-CPSplitter-CPStringSplitter" + "HeaderLinkOption-CPSplitter-RelatedCategoriesScreenCPStringSplitter" + "HeaderDisplayOnSide-CPSplitter-falseCPStringSplitter" + "HeaderDisplayOnSideAlignment-CPSplitter-1CPStringSplitter" + "ItemDefaultCategories-CPSplitter-CPStringSplitter" + "ItemNumToDisplay-CPSplitter-2CPStringSplitter" + "ColumnNum-CPSplitter-1CPStringSplitter" + "ItemsMulticolumnAlignment-CPSplitter-0CPStringSplitter" + "BulletedList-CPSplitter-falseCPStringSplitter" + "TruncateDescription-CPSplitter-trueCPStringSplitter" + "TruncateDescriptionLimit-CPSplitter-50CPStringSplitter" + "GroupItemsBy-CPSplitter-0CPStringSplitter" + "EventDescriptionDisplay-CPSplitter-trueCPStringSplitter" + "DisplayEventDateOnSameLine-CPSplitter-falseCPStringSplitter" + "EventDescriptionSeperator-CPSplitter-0CPStringSplitter" + "ReadOnTextDisplay-CPSplitter-trueCPStringSplitter" + "DisplayEventReadOnlyOnSameLine-CPSplitter-trueCPStringSplitter" + "ReadOnText-CPSplitter-Read OnCPStringSplitter" + "DisplayLocation-CPSplitter-falseCPStringSplitter" + "ViewAllLinkDisplay-CPSplitter-trueCPStringSplitter" + "ViewAllLinkText-CPSplitter-View AllCPStringSplitter" + "ViewAllLinkImage-CPSplitter-CPStringSplitter" + "ViewAllLinkLinkPosition-CPSplitter-5CPStringSplitter" + "ViewAllLinkLinkAlignment-CPSplitter-1CPStringSplitter" + "RssLinkDisplay-CPSplitter-falseCPStringSplitter" + "RssLinkLinkPosition-CPSplitter-1CPStringSplitter" + "RssImage-CPSplitter-CPStringSplitter" + "FooterText-CPSplitter-CPStringSplitter" + "FooterImage-CPSplitter-CPStringSplitter" + "EventListDisplay-CPSplitter-trueCPStringSplitter" + "DateFormat-CPSplitter-0CPStringSplitter" + "DateDisplayPosition-CPSplitter-0CPStringSplitter" + "AllowPublicSubmit-CPSplitter-trueCPStringSplitter" + "PublicSubmitText-CPSplitter-CPStringSplitter" + "PublicSubmitImage-CPSplitter-CPStringSplitter" + "PublicSubmitLinkLinkPosition-CPSplitter-1CPStringSplitter" + "MiniCalendarDisplay-CPSplitter-trueCPStringSplitter" + "MiniCalendarDisplayPosition-CPSplitter-2CPStringSplitter" + "MiniCalendarWeekdayHeadingFormat-CPSplitter-1CPStringSplitter" + "DisplayDatesOutsideCurrentMonth-CPSplitter-trueCPStringSplitter" + "DisplayLeadingZeros-CPSplitter-falseCPStringSplitter" + "MiniCalendarWidth-CPSplitter-50CPStringSplitter" + "CalendarStripDisplay-CPSplitter-falseCPStringSplitter" + "CalendarStripDateBlockBackground-CPSplitter-CPStringSplitter" + "CalendarStripDateBlockTextColor-CPSplitter-CPStringSplitter" + 'MiscAdvStyles-CPSplitter-CPStringSplitter"}');

            addOptionSet_ts(3, "Horizontal Strip", "Calendar", '{"saveJson":"HeaderText-CPSplitter-CalendarCPStringSplitter' + "HeaderImage-CPSplitter-CPStringSplitter" + "HeaderLinkOption-CPSplitter-RelatedCategoriesScreenCPStringSplitter" + "HeaderDisplayOnSide-CPSplitter-falseCPStringSplitter" + "HeaderDisplayOnSideAlignment-CPSplitter-1CPStringSplitter" + "ItemDefaultCategories-CPSplitter-CPStringSplitter" + "ItemNumToDisplay-CPSplitter-3CPStringSplitter" + "ColumnNum-CPSplitter-1CPStringSplitter" + "ItemsMulticolumnAlignment-CPSplitter-0CPStringSplitter" + "BulletedList-CPSplitter-falseCPStringSplitter" + "TruncateDescription-CPSplitter-trueCPStringSplitter" + "TruncateDescriptionLimit-CPSplitter-500CPStringSplitter" + "GroupItemsBy-CPSplitter-0CPStringSplitter" + "EventDescriptionDisplay-CPSplitter-falseCPStringSplitter" + "DisplayEventDateOnSameLine-CPSplitter-trueCPStringSplitter" + "EventDescriptionSeperator-CPSplitter-0CPStringSplitter" + "ReadOnTextDisplay-CPSplitter-trueCPStringSplitter" + "DisplayEventReadOnlyOnSameLine-CPSplitter-trueCPStringSplitter" + "ReadOnText-CPSplitter-Read OnCPStringSplitter" + "DisplayLocation-CPSplitter-falseCPStringSplitter" + "ViewAllLinkDisplay-CPSplitter-falseCPStringSplitter" + "ViewAllLinkText-CPSplitter-View AllCPStringSplitter" + "ViewAllLinkImage-CPSplitter-CPStringSplitter" + "ViewAllLinkLinkPosition-CPSplitter-3CPStringSplitter" + "ViewAllLinkLinkAlignment-CPSplitter-1CPStringSplitter" + "RssLinkDisplay-CPSplitter-falseCPStringSplitter" + "RssLinkLinkPosition-CPSplitter-1CPStringSplitter" + "RssImage-CPSplitter-CPStringSplitter" + "FooterText-CPSplitter-CPStringSplitter" + "FooterImage-CPSplitter-CPStringSplitter" + "EventListDisplay-CPSplitter-falseCPStringSplitter" + "DateFormat-CPSplitter-0CPStringSplitter" + "DateDisplayPosition-CPSplitter-0CPStringSplitter" + "AllowPublicSubmit-CPSplitter-falseCPStringSplitter" + "PublicSubmitText-CPSplitter-CPStringSplitter" + "PublicSubmitImage-CPSplitter-CPStringSplitter" + "PublicSubmitLinkLinkPosition-CPSplitter-1CPStringSplitter" + "MiniCalendarDisplay-CPSplitter-falseCPStringSplitter" + "MiniCalendarDisplayPosition-CPSplitter-2CPStringSplitter" + "MiniCalendarWeekdayHeadingFormat-CPSplitter-1CPStringSplitter" + "DisplayDatesOutsideCurrentMonth-CPSplitter-trueCPStringSplitter" + "DisplayLeadingZeros-CPSplitter-falseCPStringSplitter" + "MiniCalendarWidth-CPSplitter-25%CPStringSplitter" + "CalendarStripDisplay-CPSplitter-trueCPStringSplitter" + "CalendarStripDateBlockBackground-CPSplitter-CPStringSplitter" + "CalendarStripDateBlockTextColor-CPSplitter-CPStringSplitter" + 'MiscAdvStyles-CPSplitter-CPStringSplitter"}');

            // News Flash option sets
            addOptionSet_ts(8, "3 Columns (with View All)", "News Flash", '{"saveJson":"HeaderText-CPSplitter-CPStringSplitter' + "HeaderImage-CPSplitter-CPStringSplitter" + "HeaderLinkOption-CPSplitter-RelatedCategoriesScreenCPStringSplitter" + "ItemDefaultCategories-CPSplitter-CPStringSplitter" + "ItemNumToDisplay-CPSplitter-3CPStringSplitter" + "DisplayItems-CPSplitter-0CPStringSplitter" + "ColumnNum-CPSplitter-3CPStringSplitter" + "ItemsMulticolumnAlignment-CPSplitter-0CPStringSplitter" + "ShowDates-CPSplitter-falseCPStringSplitter" + "ShowCategories-CPSplitter-falseCPStringSplitter" + "BulletedList-CPSplitter-falseCPStringSplitter" + "DisplayNewsDescription-CPSplitter-trueCPStringSplitter" + "DisplayTitleOnSameLine-CPSplitter-falseCPStringSplitter" + "TitleAndDescriptionSeperator-CPSplitter-0CPStringSplitter" + "DisplayReadOnLinkOnSameLine-CPSplitter-falseCPStringSplitter" + "ImageLink-CPSplitter-trueCPStringSplitter" + "ViewAllLinkDisplay-CPSplitter-trueCPStringSplitter" + "ViewAllLinkText-CPSplitter-View AllCPStringSplitter" + "ViewAllLinkImage-CPSplitter-CPStringSplitter" + "ViewAllLinkLinkPosition-CPSplitter-5CPStringSplitter" + "ViewAllLinkLinkAlignment-CPSplitter-1CPStringSplitter" + "RssLinkDisplay-CPSplitter-falseCPStringSplitter" + "RssImage-CPSplitter-CPStringSplitter" + "RssLinkLinkPosition-CPSplitter-1CPStringSplitter" + "FooterText-CPSplitter-CPStringSplitter" + "FooterImage-CPSplitter-CPStringSplitter" + "MiscThumbnailsDisplay-CPSplitter-falseCPStringSplitter" + "MiscThumbnailAlignment-CPSplitter-1CPStringSplitter" + "MiscThumbnailWidth-CPSplitter-25%CPStringSplitter" + "MiscSlideShowDisplay-CPSplitter-falseCPStringSplitter" + "MiscSlideShowPosition-CPSplitter-3CPStringSplitter" + "MiscSlideShowWidth-CPSplitter-25%CPStringSplitter" + "MiscImageOnHoverDisplay-CPSplitter-falseCPStringSplitter" + "MiscImageOnHoverPosition-CPSplitter-3CPStringSplitter" + "MiscImageOnHoverWidth-CPSplitter-25%CPStringSplitter" + "MiscAdvStyles-CPSplitter-CPStringSplitter" + "NewsFlashCarouselDisplay-CPSplitter-falseCPStringSplitter" + "NewsFlashCarouselMinAllowableItemWith-CPSplitter-200CPStringSplitter" + "NewsFlashCarouselMaxAllowableItemWith-CPSplitter-350CPStringSplitter" + "NewsFlashCarouselSpaceBetween-CPSplitter-40CPStringSplitter" + "NewsFlashCarouselCircularDisplay-CPSplitter-trueCPStringSplitter" + "NewsFlashCarouselTeaserDisplay-CPSplitter-falseCPStringSplitter" + 'NewsFlashCarouselTransitionTiming-CPSplitter-500CPStringSplitter"}');

            // Quick Links option sets
            addOptionSet_ts(2, "No Bullets", "Quick Links", '{"saveJson":"HeaderText-CPSplitter-CPStringSplitter' + "HeaderImage-CPSplitter-CPStringSplitter" + "HeaderLinkOption-CPSplitter-RelatedCategoriesScreenCPStringSplitter" + "ItemDefaultCategories-CPSplitter-CPStringSplitter" + "ItemNumToDisplay-CPSplitter-8CPStringSplitter" + "GroupItems-CPSplitter-falseCPStringSplitter" + "BulletedList-CPSplitter-falseCPStringSplitter" + "ColumnNum-CPSplitter-1CPStringSplitter" + "ItemsMulticolumnAlignment-CPSplitter-0CPStringSplitter" + "ViewAllLinkDisplay-CPSplitter-falseCPStringSplitter" + "ViewAllLinkText-CPSplitter-View AllCPStringSplitter" + "ViewAllLinkImage-CPSplitter-CPStringSplitter" + "ViewAllLinkLinkPosition-CPSplitter-3CPStringSplitter" + "ViewAllLinkLinkAlignment-CPSplitter-1CPStringSplitter" + "FooterText-CPSplitter-CPStringSplitter" + "FooterImage-CPSplitter-CPStringSplitter" + 'MiscAdvStyles-CPSplitter-CPStringSplitter"}');

            addOptionSet_ts(2, "6 Columns, Centered, No Bullets, No View All", "Quick Links", '{"saveJson":"HeaderText-CPSplitter-CPStringSplitter' + "HeaderImage-CPSplitter-CPStringSplitter" + "HeaderLinkOption-CPSplitter-RelatedCategoriesScreenCPStringSplitter" + "ItemDefaultCategories-CPSplitter-CPStringSplitter" + "ItemNumToDisplay-CPSplitter-6CPStringSplitter" + "GroupItems-CPSplitter-falseCPStringSplitter" + "BulletedList-CPSplitter-falseCPStringSplitter" + "ColumnNum-CPSplitter-6CPStringSplitter" + "ItemsMulticolumnAlignment-CPSplitter-3CPStringSplitter" + "ViewAllLinkDisplay-CPSplitter-falseCPStringSplitter" + "ViewAllLinkText-CPSplitter-View AllCPStringSplitter" + "ViewAllLinkImage-CPSplitter-CPStringSplitter" + "ViewAllLinkLinkPosition-CPSplitter-3CPStringSplitter" + "ViewAllLinkLinkAlignment-CPSplitter-1CPStringSplitter" + "FooterText-CPSplitter-CPStringSplitter" + "FooterImage-CPSplitter-CPStringSplitter" + 'MiscAdvStyles-CPSplitter-CPStringSplitter"}');

            // Share, Site Tools, Search
            finalOptionSetsToExecute(6, "Default Option Set", "Share", '{"saveJson":"HeaderText-CPSplitter-ShareCPStringSplitter' + "HeaderImage-CPSplitter-CPStringSplitter" + "HeaderHoverImage-CPSplitter-CPStringSplitter" + "FlyOutActivate-CPSplitter-trueCPStringSplitter" + "FlyOutButtonBehavior-CPSplitter-ClickingCPStringSplitter" + "FlyOutPosition-CPSplitter-1CPStringSplitter" + "ListDefaultServices-CPSplitter-1,2,4,5,7,8,10,CPStringSplitter" + "ListColumns-CPSplitter-1CPStringSplitter" + "ListMulticolumnAlignment-CPSplitter-0CPStringSplitter" + 'MiscAdvStyles-CPSplitter-CPStringSplitter"}');

            finalOptionSetsToExecute(7, "Default Option Set", "Site Tools", '{"saveJson":' + "HeaderText-CPSplitter-Site ToolsCPStringSplitter" + "HeaderImage-CPSplitter-CPStringSplitter" + "HeaderHoverImage-CPSplitter-CPStringSplitter" + "FlyOutActivate-CPSplitter-trueCPStringSplitter" + "FlyOutButtonBehavior-CPSplitter-HoveringCPStringSplitter" + "FlyOutPosition-CPSplitter-4CPStringSplitter" + "ListDefaultServices-CPSplitter-1,2,3,4,5,6,7,8,9,10,11,12,CPStringSplitter" + "ListHearThisPage-CPSplitter-/CPStringSplitter" + "ListHelp-CPSplitter-/CPStringSplitter" + "ListTranslatePage-CPSplitter-window.open(\\'http://translate.google.com/translate?js=n&sl=auto&tl=es&u=\\' + document.location.href, \\'TranslateWindow\\');CPStringSplitter" + "ListContactUs-CPSplitter-/directory.aspxCPStringSplitter" + "ListIconColor-CPSplitter-WhiteCPStringSplitter" + "ListColumns-CPSplitter-1CPStringSplitter" + "ListMulticolumnAlignment-CPSplitter-0CPStringSplitter" + 'MiscAdvStyles-CPSplitter-CPStringSplitter"}');

            finalOptionSetsToExecute(11, "Default Option Set", "Search", '{"saveJson":"DisplayHeader-CPSplitter-falseCPStringSplitter' + "HeaderText-CPSplitter-SearchCPStringSplitter" + "HeaderImage-CPSplitter-CPStringSplitter" + "HelperText-CPSplitter-Search...CPStringSplitter" + "HelperTextColor-CPSplitter-#373330CPStringSplitter" + "SearchBoxTextColor-CPSplitter-#373330CPStringSplitter" + "SearchBoxStyles-CPSplitter-font-family: Arial;\\nheight: 65px;\\nborder: 5px solid rgba(255,255,255,.5);\\nbackground-clip: padding-box;\\npadding: 0 80px 0 20px;CPStringSplitter" + "ButtonText-CPSplitter-CPStringSplitterButtonImage-CPSplitter-CPStringSplitter" + "ButtonHoverImage-CPSplitter-CPStringSplitter" + "ButtonPosition-CPSplitter-1CPStringSplitter" + "SearchButtonStyles-CPSplitter-margin: 5px;CPStringSplitter" + 'MiscAdvStyles-CPSplitter-CPStringSplitter"}');

            console.log("[CP Toolkit] Setup default widget option sets complete. Page will reload in 5 seconds.");
        })();`;

        const script = document.createElement('script');
        script.textContent = setupOptionsCode;
        document.body.appendChild(script);
        script.remove();
    }
