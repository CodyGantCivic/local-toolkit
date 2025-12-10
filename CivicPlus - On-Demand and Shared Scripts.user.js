// ==UserScript==
// @name         CivicPlus - On-Demand and Shared Scripts
// @namespace    http://civicplus.com/
// @version      1.0.1
// @description  On-demand tools: Setup Defaults V2, Copy Containers. Provides shared utilities for other CP Toolkit scripts.
// @author       CivicPlus
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const TOOLKIT_NAME = '[CP Toolkit - On-Demand]';
    const TOOLKIT_VERSION = '1.0.1';

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    async function isCivicPlusSite() {
        console.log(TOOLKIT_NAME + ' Detecting if this site is a CivicPlus site. If not, a 404 error below is normal.');

        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('HEAD', '/Assets/Mystique/Shared/Components/ModuleTiles/Templates/cp-Module-Tile.html');
            xhr.onload = function() {
                resolve(xhr.status === 200);
            };
            xhr.onerror = () => resolve(false);
            xhr.send();
        });
    }

    function pageMatches(patterns) {
        const url = window.location.href.toLowerCase();
        const pathname = window.location.pathname.toLowerCase();

        return patterns.some(pattern => {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
            return regex.test(url) || regex.test(pathname);
        });
    }

    function ensureFontAwesome() {
        return new Promise((resolve) => {
            // Check if FontAwesome is already loaded
            if ($('.fa, .fas, .far, .fal, .fab').length > 0) {
                resolve();
                return;
            }

            // Check if we already injected it
            if ($('#cp-toolkit-fontawesome').length > 0) {
                // Already injecting, wait a bit
                setTimeout(() => resolve(), 100);
                return;
            }

            // Load FontAwesome from CDN
            const link = document.createElement('link');
            link.id = 'cp-toolkit-fontawesome';
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css';

            link.onload = () => {
                console.log(TOOLKIT_NAME + ' Loaded FontAwesome from CDN');
                resolve();
            };

            link.onerror = () => {
                console.warn(TOOLKIT_NAME + ' Failed to load FontAwesome');
                resolve(); // Resolve anyway to not block execution
            };

            document.head.appendChild(link);
        });
    }

    // Expose utility functions globally for other CP Toolkit scripts
    window.CPToolkit = window.CPToolkit || {};
    window.CPToolkit.isCivicPlusSite = isCivicPlusSite;
    window.CPToolkit.pageMatches = pageMatches;
    window.CPToolkit.ensureFontAwesome = ensureFontAwesome;

    // ============================================================================
    // ON-DEMAND TOOL #1: SETUP DEFAULTS V2
    // ============================================================================

    function setupDefaultsV2() {
        if (!pageMatches(['/designcenter/themes/'])) {
            alert('This tool only works in the Theme Manager');
            return;
        }

        if (typeof DesignCenter === 'undefined' || !DesignCenter.themeJSON) {
            alert('Theme data not loaded. Please wait for the page to fully load.');
            return;
        }

        console.log(TOOLKIT_NAME + ' Running Setup Defaults V2');

        // Inject the Setup Defaults V2 code as a function that runs in page context
        const setupDefaultsCode = function() {
/**
 * SiteStyle Map:
 *    body                         0
 *    p                            1
 *    h1                           2
 *    h2                           3
 *    h3                           4
 *    ol                           5
 *    ol > li                      6
 *    ul                           7
 *    ul > li                      8
 *    table                        9
 *    td                           10
 *    thead th                     11
 *    tbody th                     12
 *    .alt > td, .alt > th         13
 *    .alt > th                    14
 *    table > caption              15
 *    .imageBorder > img           16
 *    .imageBorder > figcaption    17
 *    a:link                       18
 *    BreadCrumbWrapper            19
 *    breadLeader                  20
 *    breadCrumb:link              21
 *    breadCrumbs li:before        22
 *    hr                           23
 *
 *
 * MenuStyles Map:
 *    MainWrapper                           0
 *    MainMainItem                          1
 *    MainMenuWrapper                       2
 *    MainMenuItem                          3
 *    MainSubMenuIndicator                  4
 *    MegaMenuWrapper                       5
 *    MegaMenuColumnSeparator               6
 *    SecondaryWrapper                      7
 *    SecondaryMainItem                     8
 *    SecondayMenuWrapper                   9
 *    SecondaryMenuItem                     10
 *    SecondarySubMenuIndicator             11
 *    SecondaryMainItemSubMenuIndicator     12
 *    SecondaryMenuWrapper1                 13
 *    SecondaryMenuItem1                    14
 *    SecondaryMenuWrapper2                 15
 *    SecondaryMenuItem2                    16
 *    SecondaryMenuWrapper3                 17
 *    SecondaryMenuItem3                    18
 *    SecondaryMenuWrapper4                 19
 *    SecondaryMenuItem4                    20
 *
 *
 * Skin map:
 *    Wrapper                               0
 *    Header                                1
 *    Item List                             2
 *    Item                                  3 ??
 *    Item Title                            4
 *    Item secondary text                   5 ??
 *    Item Bullets                          6 ??
 *    Item Link                             7 ??
 *    Read On                               8 ??
 *    View All                              9
 *    RSS Link                              10 ??
 *    Footer                                11 ??
 *    Tab List                              12
 *    Tab                                   13
 *    Tab Panel                             14
 *    Columns                               15
 *    Calendar Header                       16
 *    Calendar Grid                         17
 *    Calendar Day Headers                  18
 *    Calendar Day                          19
 *    Calendar Event Link                   20
 *    Calendar Today                        21
 *    Calendar Day Not In Current Month     22
 *    Calendar Wrapper                      23
 */

const shouldIgnore = [
  "SiteStyleID",
  "ThemeID",
  "SiteStyleID",
  "Selector",
  "RecordStatus",
  "NumberStyle",
  "ModifiedOn",
  "ModifiedBy",
  "LeaderText",
  "ContentContainerID",
  "ParentId",
  "AnimationId",
  "ContentContainerID"
];

let madeChanges = false;
const stat = DesignCenter.recordStatus;
const ws = DesignCenter.themeJSON.WidgetSkins;
const ss = DesignCenter.themeJSON.SiteStyles;
const cs = DesignCenter.themeJSON.ContainerStyles;
const ms = DesignCenter.themeJSON.MenuStyles;
const bs = DesignCenter.themeJSON.BannerStyles;

function copyStyles(to, from, debug = false) {
  if (to === null || from === null || typeof to !== "object" || typeof from !== "object") {
    console.warn("[CP Toolkit]: copyStyle - Invalid parameters");
    return to;
  }

  for (const [k, v] of Object.entries(from)) {
    if (debug) console.log(`${k}: ${v}`);
    if (shouldIgnore.indexOf(k) !== -1) continue;
    if (k === "LineHeight") {
      if (v > 0) {
        if (typeof from.HeaderMiscellaneousStyles1 === "string") {
          from.HeaderMiscellaneousStyles1 += `\nline-height: ${v}px;`;
        } else {
          from.HeaderMiscellaneousStyles1 = `line-height: ${v}px;`;
        }
      }
    } else if (k in to) {
      if (typeof v === "object" && v !== null) {
        to[k] = copyStyles(from[k], v);
      } else {
        if (debug) console.log(`SET: ${k}: ${v}`);

        to[k] = v;
      }
    } else {
      console.warn(`Key missing: ${k}`);
    }
  }

  if (to.RecordStatus !== undefined) to.RecordStatus = stat.Modified;

  return to;
}

function getSpacingValues(type, vals, unit = "em") {
  const out = {
    top: null,
    bottom: null,
    left: null,
    right: null
  };

  switch (vals.length) {
    case 1:
      out.top = vals[0];
      out.right = vals[0];
      out.bottom = vals[0];
      out.left = vals[0];
      break;
    case 2:
      out.top = vals[0];
      out.right = vals[1];
      out.bottom = vals[0];
      out.left = vals[1];
      break;
    case 4:
      out.top = vals[0];
      out.right = vals[1];
      out.bottom = vals[2];
      out.left = vals[3];
      break;
    default:
      console.warn("[CPToolkit]: getSpacingValues - Invalid parameters. 1, 2, or 4 values required.");
      return {};
  }

  function getUnitInt() {
    switch (unit) {
      case "em":
        return 0;
      case "px":
        return 1;
      case "%":
        return 2;
      default:
        return
    }
  }

  const unitInt = getUnitInt();
  return {
    [`${type}Top`]: {
      Value: out.top,
      Unit: unitInt
    },
    [`${type}Right`]: {
      Value: out.right,
      Unit: unitInt
    },
    [`${type}Bottom`]: {
      Value: out.bottom,
      Unit: unitInt
    },
    [`${type}Left`]: {
      Value: out.left,
      Unit: unitInt
    }
  };
}

function getColor(i) {
  return DesignCenter.themeJSON.ModuleStyle.AllColors[i - 1];
}

function setupSiteStyles() {
  if (!shouldSetupTheme) {
    return;
  }
  madeChanges = true;

  /* Body */
  ss[0] = copyStyles(ss[0], {
    FontSize: "0.95",
    LineHeight: "1.5"
  });

  /* Paragraph */
  ss[1] = copyStyles(ss[1], {
    ...getSpacingValues("Margin", [0, null, 1.4, null]),
    FontColor: null // This is an override for the color tool's error.
  });

  /* Headline */
  ss[2] = copyStyles(ss[2], {
    FontSize: 1.7,
    MiscellaneousStyles: "line-height: 1.2;\n" + ss[2].MiscellaneousStyles
  });

  /* h2 */
  ss[3] = copyStyles(ss[3], {
    FontSize: 1.3,
    ...getSpacingValues("Margin", [0.167, null, 0, null])
  });

  /* h3 */
  ss[4] = copyStyles(ss[4], {
    FontSize: 1.1,
    ...getSpacingValues("Margin", [0, null, 0, null])
  });

  /* ol */
  ss[5] = copyStyles(ss[5], {
    ...getSpacingValues("Padding", [null, null, null, 2])
  });

  /* a:link */
  ss[18] = copyStyles(ss[18], {
    LinkVisitedColor: ss[18].LinkNormalColor
  });
  /* Bread Crumbs Wrapper */
  ss[19] = copyStyles(ss[19], {
    DisplayBreadCrumbHome: true,
    DisplayBreadCrumbs: true
  });

  /* Bread Crumbs Wrapper */
  ss[23] = copyStyles(ss[23], {
    BorderStyle: "1",
    BorderWidth: "1"
  });
}

function setupBannerStyles() {
  if (!shouldSetupTheme) return;
  madeChanges = true;

  bs.forEach((banner, i) => {
    if (banner.SlotName === "bannerLogoTS") {
      bs[i] = copyStyles(banner, {
        ...getSpacingValues("Padding", [.5, null])
      })
    }
  })
}

function setupMenuStyles() {
  if (!shouldSetupTheme) {
    return;
  }
  madeChanges = true;

  /* MM Width */
  ms[0] = copyStyles(ms[0], {
    AdjustItemsToFillWidth: true,
    BackgroundColor: null,
    TextResizer: false,
    TextResizerRatio: 1
  });

  // Main Item
  ms[1] = copyStyles(ms[1], {
    ...getSpacingValues("Padding", [1.5, .2])
  });

  const dropdownStyles = {
    FontFamily: ss[0].FontFamily,
    FontVariant: ss[0].FontVariant,
    BackgroundColor: getColor(6),
    FontColor: getColor(8),
    HoverBackgroundColor: getColor(9),
    HoverFontColor: getColor(6),
    LinkNormalUnderlined: false,
    LinkHoverUnderlined: true,
    ...getSpacingValues("Padding", [0.5, 1])
  };

  /* Main Dropdown */
  ms[3] = copyStyles(ms[3], {
    ...dropdownStyles
  });

  // Main submenu indicators
  ms[4] = copyStyles(ms[4], {
    DisplaySubMenuIndicators: true,
    MiscellaneousStyles: `\
padding-right: 5px;
`});

  // Secondary submenu indicators
  ms[11] = copyStyles(ms[11], {
    DisplaySubMenuIndicators: true,
    MiscellaneousStyles: `\
padding-right: 5px;
`});
  // Secondary main item submenu indicators
  ms[12] = copyStyles(ms[12], {
    DisplaySubMenuIndicators: true,
    MiscellaneousStyles: `\
padding-right: 10px;
`});

  /* MMWrapper */
  ms[5].RecordStatus = stat.Modified;
  DesignCenter.themeJSON.MegaMenuWidthReference = 1;
  ms[5] = copyStyles(ms[5], {
    MiscellaneousStyles: "padding: 1.5em;"
  });

  /* Secondary Wrapper*/
  ms[7] = copyStyles(ms[7], {
    SubMenuType: 1
  });

  /* Main Style */
  const secondaryStyles = {
    FontFamily: ss[0].FontFamily,
    FontVariant: ss[0].FontVariant,
    FontSize: 1.1,
    FontColor: "#fff",
    HoverFontColor: "#fff",
    NormalUnderline: false,
    BackgroundColor: null,
    HoverBackgroundColor: null,
    HoverUnderline: true,
    HoverFontVariant: "",
    ...getSpacingValues("Padding", [0.85, 2])
  };

  /* Secondary Main Item*/
  ms[8] = copyStyles(ms[8], {
    ...secondaryStyles
  });

  /* Main Menu Item - DROPDOWN */
  ms[10] = copyStyles(ms[10], {
    ...dropdownStyles
  });

  [14, 16, 18, 20].forEach((msID, i) => {
    ms[msID] = copyStyles(ms[msID], {
      ...secondaryStyles,
      MiscellaneousStyles: setSecondaryColor ? `background-color: rgba(0, 0, 0, ${(0.2 * (i + 1)).toFixed(2)});` : ""
    });
  });
}

function setupContainerStyles() {
  function itemIsContainer(item, id) {
    return item.ContentContainerID === $(`${id} > .contentContainerID`).text();
  }

  if (!shouldSetupTheme) {
    return;
  }
  madeChanges = true;
  let contentOverlap = prompt("Negative margin on main content (px)?");
  if (!contentOverlap) contentOverlap = null;
  if (contentOverlap < 0) contentOverlap = -contentOverlap;

  cs.forEach((item, i) => {
    if (itemIsContainer(item, "#mainWrapTS")) {
      cs[i] = copyStyles(item, {
        BackgroundColor: "#fff",
        MiscellaneousStyles: contentOverlap === null ? cs[i].MiscellaneousStyles : `margin-top: -${contentOverlap}px;`
      });
    } else if (itemIsContainer(item, "#bannerContainerTS")) {
      cs[i] = copyStyles(item, {
        MiscellaneousStyles: "overflow: hidden;"
      });
    } else if (itemIsContainer(item, "#bannerSizingTS")) {
      cs[i] = copyStyles(item, {
        ...getSpacingValues("Padding", [null, null, contentOverlap, null], "px")
      });
    } else if (itemIsContainer(item, "#bannerContentTS")) {
      cs[i] = copyStyles(item, {
        MiscellaneousStyles: "min-height: 220px;",
        ...getSpacingValues("Padding", [1, null])
      });
    } else if (itemIsContainer(item, "#searchTS")) {
      cs[i] = copyStyles(item, {
        MiscellaneousStyles: "max-width: 415px;"
      });
    } else if (itemIsContainer(item, "#megaMenu")) {
      cs[i] = copyStyles(item, {
        DefaultWidgetSkinID: skinMap["Mega Menu"].skinIDs[0]
      });
    } else if (itemIsContainer(item, "#featureColumn")) {
      cs[i] = copyStyles(item, {
        BackgroundColor: null,
        DefaultWidgetSkinID: skinMap.Features.skinIDs[0] || 0,
        ...getSpacingValues("Padding", [0.75, 1.5]),
        ...getSpacingValues("Margin", [0.75, null])
      });
    } else if (itemIsContainer(item, ".contentWrap")) {
      cs[i] = copyStyles(item, {
        ...getSpacingValues("Padding", [1.5])
      });
    } else if (itemIsContainer(item, ".siteSidebar")) {
      cs[i] = copyStyles(item, {
        BackgroundColor: setSecondaryColor ? getColor(3) : null
      });
    } else if (itemIsContainer(item, "#moduleContent")) {
      cs[i] = copyStyles(item, {
        DefaultWidgetSkinID: skinMap.Default.skinIDs[0] || 0
      });
    } else if (itemIsContainer(item, "#gbsTS")) {
      cs[i] = copyStyles(item, {
        DefaultWidgetSkinID: skinMap["Graphic Buttons"].skinIDs[0] || 0
      });
    } else if (itemIsContainer(item, "#socialsTS")) {
      cs[i] = copyStyles(item, {
        MiscellaneousStyles: "max-width: 415px;",
        DefaultWidgetSkinID: skinMap["Social Media"].skinIDs[0] || skinMap["Graphic Buttons"].skinIDs[0] || 0
      });
    } else if (itemIsContainer(item, "#footerTS")) {
      cs[i] = copyStyles(item, {
        DefaultWidgetSkinID: skinMap.Footer.skinIDs[0] || 0
      });
    } else if (itemIsContainer(item, "#poweredByContainerTS")) {
      cs[i] = copyStyles(item, {
        DefaultWidgetSkinID: skinMap.Footer.skinIDs[0] || 0,
        MiscellaneousStyles: `\
}

@media (max-width: 40em) {
#poweredByContainerTS {
padding-bottom: 3.25em;
}`
      });
    }
  });
}

const viewAllStyles = {
  ...getSpacingValues("Padding", [0.75, 2]),
  LinkNormalMiscellaneousStyles: `\
background-color: ${getColor(3)};
transition: all .3s ease-in-out;
display: table;
margin: 1.25em auto;`,
  FontFamily: "Arial",
  FontVariant: "700",
  LinkNormalColor: "#fff",
  LinkVisitedColor: "#fff",
  LinkNormalUnderlined: false,
  LinkHoverUnderlined: true
};

function setupDefaultSkin(skin) {
  /* Wrapper */
  skin.Components[0] = copyStyles(skin.Components[0], {
    FontSize: null
  });

  /* Header/Item Title (matching) */
  skin.Components[1] = copyStyles(skin.Components[1], ss[3]);
  skin.Components[4] = copyStyles(skin.Components[4], ss[3]);

  /* View All */
  skin.Components[9] = copyStyles(skin.Components[9], viewAllStyles);

  /* Tab */
  skin.Components[13] = copyStyles(skin.Components[13], {
    FontFamily: ss[0].FontFamily,
    FontVariant: "700",
    FontSize: 1.2,
    HeaderMiscellaneousStyles1: `\
line-height: 1.2;
text-align: left;
text-transform: uppercase;
position: relative;
}

.widget.skin${skin.WidgetSkinID} .cpTabs > li:not(.active) > a:link:after {
border-top: 6px solid transparent;
border-bottom: 6px solid transparent;
border-left: 6px solid ${getColor(3)};
}

.widget.skin${skin.WidgetSkinID} .cpTabs > li.active > a:link:after {
border-left: 6px solid transparent;
border-right: 6px solid transparent;
border-top: 6px solid ${getColor(7)};
}

.widget.skin${skin.WidgetSkinID} .cpTabs > li > a:link::after {
content: "";
position: absolute;
left: 20px;
top: 50%;
transform: translate(0, -50%);
width: 0;
height: 0;`,
    LinkHoverUnderlined: true,
    SpaceBetweenTabs: 10,
    SpaceBetweenTabsUnits: "px",
    BackgroundColor: getColor(4),
    FontColor: getColor(3),
    SelectedBackgroundColor: getColor(3),
    SelectedFontColor: getColor(7),
    ...getSpacingValues("Padding", [0.65, 2.5])
  });

  /* Tab Panel */
  skin.Components[14] = copyStyles(skin.Components[14], {
    ...getSpacingValues("Padding", [1.5])
  });

  return skin;
}

function setupFeatureSkin(skin) {
  /* Wrapper */
  skin.Components[0] = copyStyles(skin.Components[0], {
    FontSize: null,
    ...getSpacingValues("Padding", [null, null, 2, null])
  });

  /* Header */
  skin.Components[1] = copyStyles(skin.Components[1], {
    ...getSpacingValues("Margin", [null, null, .5, null])
  });

  /* Item */
  skin.Components[3] = copyStyles(skin.Components[3], {
    ...getSpacingValues("Padding", [.25, null, .75, null])
  });

  /* View All */
  skin.Components[9] = copyStyles(skin.Components[9], viewAllStyles);

  /* Calendar Header */
  skin.Components[16] = copyStyles(skin.Components[16], {
    FontFamily: ss[2].FontFamily,
    FontVariant: ss[2].FontVariant,
    FontSize: 1.5,
    BackgroundColor: getColor(13),
    FontColor: getColor(7),
    TextAlignment: 3,
    Capitalization: 2,
    ...getSpacingValues("Padding", [0.75, 1])
  });

  /* Calendar Grid */
  skin.Components[17] = copyStyles(skin.Components[17], {
    BackgroundColor: getColor(1)
  });

  /* Calendar Day Headers*/
  skin.Components[18] = copyStyles(skin.Components[18], {
    FontFamily: ss[2].FontFamily,
    FontVariant: ss[2].FontVariant,
    BackgroundColor: getColor(6),
    FontColor: getColor(7),
    Capitalization: 2,
    HeaderMiscellaneousStyles1: `\
}
.widget.skin${skin.WidgetSkinID} .miniCalendar th abbr {
text-decoration: none;`,
    ...getSpacingValues("Padding", [0.75, null])
  });

  /* Calendar Day */
  skin.Components[19] = copyStyles(skin.Components[19], {
    FontFamily: ss[0].FontFamily,
    FontVariant: "700",
    FontColor: "#000",
    ...getSpacingValues("Padding", [0.75, null])
  });

  /* Calendar Event Link */
  skin.Components[20] = copyStyles(skin.Components[20], {
    FontFamily: ss[0].FontFamily,
    FontVariant: "700",
    FontColor: "#fff",
    LinkNormalMiscellaneousStyles: `\
background-size: contain;
position: relative;
z-index: 0;
}

.widget.skin${skin.WidgetSkinID} .miniCalendar td > a::after {
content: "";
position: absolute;
left: 50%;
top: 50%;
transform: translate(-50%, -50%);
width: 2em;
height: 2em;
border-radius: 50%;
z-index: -1;
background-color: ${getColor(6) || "#333"};
`,
    BackgroundImagePositionXUseKeyword: true,
    BackgroundImagePositionYUseKeyword: true,
    HoverBackgroundImagePositionXUseKeyword: true,
    HoverBackgroundImagePositionYUseKeyword: true,
    BackgroundImagePositionXKeyword: "1",
    BackgroundImagePositionYKeyword: "1",
    HoverBackgroundImagePositionXKeyword: "1",
    HoverBackgroundImagePositionYKeyword: "1",
    LinkHoverUnderlined: true
  });

  return skin;
}

function setupSocialsSkin(skin) {
  /* Wrapper */
  skin.Components[0] = copyStyles(skin.Components[0], {
    FontSize: null,
    MiscellaneousStyles: `\
}
.row.outer:not(.wide) .widget.skin${skin.WidgetSkinID} .autoWidths {
  text-align: center !important;`,
  });

  // Columns
  skin.Components[15] = copyStyles(skin.Components[15], {
    ...getSpacingValues("Padding", [0, .15])
  });

  return skin;
}

function setupMMSkin(skin) {
  /* Wrapper */
  skin.Components[0] = copyStyles(skin.Components[0], {
    FontSize: null
  });

  /* Item */
  skin.Components[3] = copyStyles(skin.Components[3], {
    MiscellaneousStyles: `\
}
.widget.skin${skin.WidgetSkinID} .megaMenuItem {
  padding: 6px 0;
  line-height: 1.3;`,
    ...getSpacingValues("Padding", [0.5, null])
  });

  /* Item Title */
  skin.Components[4] = copyStyles(skin.Components[4], {
    LinkNormalUnderlined: false,
    LinkHoverUnderlined: true,
    FontSize: 1.1
  });

  /* Item Link */
  skin.Components[7] = copyStyles(skin.Components[7], {
    LinkNormalUnderlined: false,
    LinkHoverUnderlined: true
  });

  return skin;
}

function setupGBSkin(skin) {
  /* Wrapper */
  skin.Components[0] = copyStyles(skin.Components[0], {
    FontSize: null
  });

  /* Header */
  skin.Components[1] = copyStyles(skin.Components[1], {
    ...getSpacingValues("Margin", [null])
  });

  /* Item */
  skin.Components[3] = copyStyles(skin.Components[3], {
    ...getSpacingValues("Padding", [0.35, null])
  });

  /* Columns */
  skin.Components[15] = copyStyles(skin.Components[15], {
    ...getSpacingValues("Padding", [null, 0])
  });

  return skin;
}

function setupFooterSkin(skin) {
  /* Wrapper */
  skin.Components[0] = copyStyles(skin.Components[0], {
    MiscellaneousStyles: `\
}
.row.outer:not(.wide) .widget.skin${skin.WidgetSkinID} {
  text-align: center !important;`,
    TextAlignment: 0,
    FontSize: null
  });

  /* Header */
  skin.Components[1] = copyStyles(skin.Components[1], {
    ...getSpacingValues("Margin", [1.5, null, 0.75, null])
  });

  /* Item */
  skin.Components[3] = copyStyles(skin.Components[3], {});

  /* Item Link */
  skin.Components[7] = copyStyles(skin.Components[7], {
    LinkNormalUnderlined: false,
    LinkHoverUnderlined: true
  });

  return skin;
}

const skinMap = {
  Default: {
    matching: ["default"],
    fn: setupDefaultSkin,
    skinIDs: []
  },
  Features: {
    matching: ["feat"],
    fn: setupFeatureSkin,
    skinIDs: []
  },
  "Social Media": {
    matching: ["social"],
    fn: setupSocialsSkin,
    skinIDs: []
  },
  "Mega Menu": {
    matching: ["mega", "menu", "mm"],
    fn: setupMMSkin,
    skinIDs: []
  },
  "Graphic Buttons": {
    matching: ["graphic", "gb"],
    fn: setupGBSkin,
    skinIDs: []
  },
  Footer: {
    matching: ["footer"],
    fn: setupFooterSkin,
    skinIDs: []
  }
};

let filter = prompt("String to filter skins by? ");
filter = !filter ? "" : filter.toLowerCase();

const shouldSetupTheme = confirm("Setup theme?");
const setSecondaryColor = confirm("Set secondary navigation colors? ");

setupSiteStyles();
setupMenuStyles();
setupBannerStyles();

for (const skinName of Object.keys(skinMap)) {
  const skinType = skinMap[skinName];
  for (let i = 0; i < ws.length; i++) {
    const skin = ws[i];
    for (const matchElem of skinType.matching) {
      if (skin.Name.toLowerCase().indexOf(filter) !== -1 && skin.Name.toLowerCase().indexOf(matchElem) !== -1) {
        if (confirm(`Detected '${skin.Name}' as ${skinName} widget skin. Click OK to override its settings.`)) {
          skinType.skinIDs.push(skin.WidgetSkinID);
          ws[i] = skinType.fn(skin);
          ws[i].RecordStatus = stat.Modified;
          madeChanges = true;
        }

        break;
      }
    }
  }
}

setupContainerStyles();

if (madeChanges && confirm("Save changes? ")) {
  saveTheme();
} else {
  alert("No changes were made.");
}
        };

        // Execute the setup function in page context
        const script = document.createElement('script');
        script.textContent = '(' + setupDefaultsCode.toString() + ')();';
        document.body.appendChild(script);
    }

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

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    async function initialize() {
        const isCPSite = await isCivicPlusSite();

        if (!isCPSite) {
            console.log(TOOLKIT_NAME + ' Not a CivicPlus site, tools disabled');
            return;
        }

        console.log(TOOLKIT_NAME + ' v' + TOOLKIT_VERSION + ' - Registering on-demand tools');

        // Register on-demand tools (they only run when clicked)
        GM_registerMenuCommand('🎨 Setup Defaults V2', setupDefaultsV2);
        GM_registerMenuCommand('📦 Copy Containers to Another Layout', copyContainersToLayout);
        GM_registerMenuCommand('📤 Export Current Theme', exportCurrentTheme);
        GM_registerMenuCommand('📥 Import Theme', importTheme);
        GM_registerMenuCommand('🎭 Copy Widget Skin Components', copyWidgetSkinComponents);
        GM_registerMenuCommand('⚙️ Setup Default Widget Option Sets', setupDefaultWidgetOptionSets);

        console.log(TOOLKIT_NAME + ' 6 on-demand tools registered');
    }

    initialize();

})();



