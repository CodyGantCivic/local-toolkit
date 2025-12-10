// ==UserScript==
// @name         CivicPlus - Enforce Advanced Styles Text Limits
// @namespace    http://civicplus.com/
// @version      1.0.0
// @description  Adds character limits to advanced style textareas to prevent save errors
// @author       CivicPlus
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    
    const TOOLKIT_NAME = '[CP Toolkit - Text Limits]';
    
    // Check if we're on the correct page
    function pageMatches(patterns) {
        const url = window.location.href.toLowerCase();
        const pathname = window.location.pathname.toLowerCase();
        
        return patterns.some(pattern => {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
            return regex.test(url) || regex.test(pathname);
        });
    }
    
    const isThemeManager = pageMatches(['/designcenter/themes/']);
    const isWidgetManager = pageMatches(['/designcenter/widgets/']);
    
    // Only run on Theme or Widget Manager
    if (!isThemeManager && !isWidgetManager) {
        return;
    }
    
    // Wait for CP site detection
    async function init() {
        if (typeof window.CPToolkit !== 'undefined' && typeof window.CPToolkit.isCivicPlusSite === 'function') {
            const isCPSite = await window.CPToolkit.isCivicPlusSite();
            if (!isCPSite) {
                console.log(TOOLKIT_NAME + ' Not a CivicPlus site, exiting');
                return;
            }
        }
        
        console.log(TOOLKIT_NAME + ' Initializing...');
        
        try {
            if (isThemeManager) {
                // Theme Manager - Override initializePopovers to add maxlength to textareas
                const themeCode = function() {
                    if (typeof window.initializePopovers === 'undefined') return;
                    
                    var originalInitializePopovers = window.initializePopovers;
                    window.initializePopovers = function() {
                        originalInitializePopovers();
                        var textAreas = $(".cpPopOver textarea");
                        textAreas.each(function() {
                            $(this).attr("maxlength", 1000);
                        });
                    };
                    
                    console.log("[CP Toolkit] Advanced styles text limit enforced (Theme Manager: 1000 chars)");
                };
                
                const script = document.createElement('script');
                script.textContent = '(' + themeCode.toString() + ')();';
                document.body.appendChild(script);
                script.remove();
                
            } else if (isWidgetManager) {
                // Widget Manager - Override InitializeWidgetOptionsModal
                const widgetCode = function() {
                    if (typeof window.InitializeWidgetOptionsModal === 'undefined') return;
                    
                    var oldInitOptionsModal = window.InitializeWidgetOptionsModal;
                    window.InitializeWidgetOptionsModal = function() {
                        oldInitOptionsModal();
                        $("#MiscAdvStyles").attr("maxlength", 255);
                    };
                    
                    console.log("[CP Toolkit] Advanced styles text limit enforced (Widget Manager: 255 chars)");
                };
                
                const script = document.createElement('script');
                script.textContent = '(' + widgetCode.toString() + ')();';
                document.body.appendChild(script);
                script.remove();
            }
            
            console.log(TOOLKIT_NAME + ' Successfully loaded');
            
        } catch (err) {
            console.warn(TOOLKIT_NAME + ' Error:', err);
        }
    }
    
    init();
})();
