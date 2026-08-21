const { default: lighthouse } = require("lighthouse");
const chromeLauncher = require("chrome-launcher");


// ----------------------------------------------------
// REUSABLE LIGHTHOUSE CHROME
// ----------------------------------------------------

let chrome = null;
let launchingChrome = null;


// ----------------------------------------------------
// START / REUSE CHROME
// ----------------------------------------------------

async function getChrome() {

    // Existing Chrome is still available
    if (chrome) {

        try {

            if (
                chrome.process &&
                chrome.process.exitCode === null
            ) {
                return chrome;
            }

        } catch {}

    }


    // Prevent multiple simultaneous launches
    if (launchingChrome) {
        return launchingChrome;
    }


    launchingChrome =
        chromeLauncher.launch({

            chromeFlags: [
                "--headless=new",
                "--disable-gpu",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-background-networking",
                "--disable-extensions"
            ]

        })
        .then(instance => {

            chrome = instance;

            console.log(
                "Lighthouse Chrome started"
            );

            return chrome;

        })
        .finally(() => {

            launchingChrome = null;

        });


    return launchingChrome;

}


// ----------------------------------------------------
// Convert Lighthouse audit into a useful issue
// ----------------------------------------------------

function buildIssue(audit) {

    const id =
        audit.id || "";

    const displayValue =
        audit.displayValue || "";

    const description =
        audit.description || "";

    let why = "";
    let fix = "";


    // -----------------------------------------------
    // Performance
    // -----------------------------------------------

    if (id === "first-contentful-paint") {

        why =
            `The first visible content is taking ${displayValue || "too long"} to appear. This can make the page feel slow when users first open it.`;

        fix =
            "Reduce render-blocking CSS and JavaScript, optimize above-the-fold images, preload important resources, and remove unnecessary third-party scripts.";

    }

    else if (id === "largest-contentful-paint") {

        why =
            `The main visible content is taking ${displayValue || "too long"} to appear. A slow Largest Contentful Paint usually means the main image, heading, or other large element is loading too late.`;

        fix =
            "Optimize the main hero image, use WebP or AVIF, preload the LCP resource when appropriate, reduce render-blocking resources, and defer non-critical JavaScript.";

    }

    else if (id === "total-blocking-time") {

        why =
            `The browser is spending too much time executing long JavaScript tasks (${displayValue || "high blocking time"}). This delays user interaction.`;

        fix =
            "Reduce JavaScript execution, remove unused JavaScript, split large bundles, defer non-critical scripts, and reduce third-party JavaScript.";

    }

    else if (id === "speed-index") {

        why =
            `Visible page content is appearing slowly (${displayValue || "slow Speed Index"}), so users may see an incomplete page for longer.`;

        fix =
            "Optimize above-the-fold images, reduce render-blocking resources, inline critical CSS, and defer non-critical assets.";

    }

    else if (id === "cumulative-layout-shift") {

        why =
            `Page elements are moving unexpectedly during loading (${displayValue || "high CLS"}). This can make the page difficult to use and can cause accidental clicks.`;

        fix =
            "Reserve space for images and advertisements, define width and height for media, avoid inserting content above existing content, and stabilize fonts before rendering.";

    }

    else if (
        id === "unused-javascript" ||
        id === "unused-css-rules"
    ) {

        why =
            "The page is downloading resources that are not fully used during the initial page load. This increases network and processing work.";

        fix =
            "Remove unused code, split CSS and JavaScript by page or feature, defer non-critical resources, and load assets only when they are needed.";

    }

    else if (
        id === "render-blocking-resources"
    ) {

        why =
            "CSS or JavaScript resources are delaying the browser from rendering the page.";

        fix =
            "Inline critical CSS, defer non-critical JavaScript, and load non-critical stylesheets after the initial render.";

    }

    else if (
        id === "uses-responsive-images"
    ) {

        why =
            "Images may be larger than necessary for the displayed size, increasing download time.";

        fix =
            "Serve appropriately sized images and use responsive image techniques such as srcset and sizes.";

    }

    else if (
        id === "offscreen-images"
    ) {

        why =
            "Images below the initial viewport are being loaded before they are needed.";

        fix =
            'Lazy-load below-the-fold images using loading="lazy" and avoid loading unnecessary images during the initial page render.';

    }


    // -----------------------------------------------
    // Accessibility
    // -----------------------------------------------

    else if (id === "color-contrast") {

        why =
            "Some text does not have enough contrast against its background, making it difficult for users to read.";

        fix =
            "Increase the contrast between foreground and background colors and verify the result against WCAG contrast requirements.";

    }

    else if (id === "image-alt") {

        why =
            "One or more meaningful images do not have appropriate alternative text.";

        fix =
            "Add descriptive alt text to meaningful images. Use empty alt text for purely decorative images.";

    }

    else if (id === "button-name") {

        why =
            "One or more buttons do not have an accessible name, making their purpose unclear to screen-reader users.";

        fix =
            "Add visible button text or an appropriate accessible name using aria-label or aria-labelledby.";

    }

    else if (id === "link-name") {

        why =
            "One or more links do not have a clear accessible name.";

        fix =
            "Give every meaningful link descriptive visible text or an appropriate accessible name.";

    }

    else if (id === "label") {

        why =
            "A form control does not have a properly associated label.";

        fix =
            "Add a visible label and associate it with the form control using the for/id relationship or an appropriate accessible naming technique.";

    }


    // -----------------------------------------------
    // SEO
    // -----------------------------------------------

    else if (id === "document-title") {

        why =
            "The page title is missing, empty, or not descriptive enough. The title is important for search engines and browser users.";

        fix =
            "Add a unique, descriptive <title> element that clearly explains the page content.";

    }

    else if (id === "meta-description") {

        why =
            "The page does not have a useful meta description that summarizes its content for search engines.";

        fix =
            "Add a unique, concise meta description describing the page and its main value to users.";

    }

    else if (id === "crawlable-anchors") {

        why =
            "Some links may not be easily discoverable by search engines because they do not use crawlable link structures.";

        fix =
            'Use standard <a href="..."> links with valid destination URLs.';

    }

    else if (id === "robots-txt") {

        why =
            "The site's robots.txt configuration may prevent search engines from correctly understanding which pages they can crawl.";

        fix =
            "Create or update robots.txt and verify that important pages are not accidentally blocked.";

    }

    else if (id === "canonical") {

        why =
            "The page may not clearly identify its preferred canonical URL.";

        fix =
            'Add a correct <link rel="canonical"> element pointing to the preferred version of the page.';

    }


    // -----------------------------------------------
    // Best Practices
    // -----------------------------------------------

    else if (id === "errors-in-console") {

        why =
            "The browser console contains errors that may indicate JavaScript, network, or implementation problems.";

        fix =
            "Open Chrome DevTools Console, identify the failing script or request, and fix the underlying JavaScript or network error.";

    }

    else if (id === "third-party-cookies") {

        why =
            "The page is using third-party cookies that may be restricted or blocked by modern browsers.";

        fix =
            "Review third-party services and migrate to privacy-friendly storage or first-party alternatives where possible.";

    }

    else if (id === "no-document-write") {

        why =
            "document.write() can delay page rendering and negatively affect performance.";

        fix =
            "Replace document.write() with modern DOM APIs or asynchronous resource loading.";

    }

    else {

        why =
            displayValue
                ? `Lighthouse reported ${displayValue} for this audit, indicating that this check did not meet the recommended threshold.`
                : "Lighthouse identified an issue with this page.";

        fix =
            description ||
            "Review the Lighthouse audit and apply the recommended implementation changes.";

    }


    // -----------------------------------------------
    // Affected elements
    // -----------------------------------------------

    let affectedElements = [];


    if (
        audit.details &&
        Array.isArray(audit.details.items)
    ) {

        affectedElements =
            audit.details.items
                .slice(0, 5)
                .map(item => {

                    const node =
                        item.node || {};

                    return {

                        selector:
                            node.selector || "",

                        snippet:
                            node.snippet || "",

                        path:
                            node.path || "",

                        url:
                            item.url ||
                            node.url ||
                            "",

                        reason:
                            item.reason || ""

                    };

                })
                .filter(item =>
                    item.selector ||
                    item.snippet ||
                    item.path ||
                    item.url ||
                    item.reason
                );

    }


    return {

        id,

        title:
            audit.title ||
            "Lighthouse issue",

        score:
            typeof audit.score === "number"
                ? Math.round(
                    audit.score * 100
                )
                : null,

        displayValue,

        description,

        why,

        fix,

        affectedElements,

        details:
            audit.details || null

    };

}


// ----------------------------------------------------
// MAIN LIGHTHOUSE FUNCTION
// ----------------------------------------------------

async function getLighthouseResults(url) {

    let activeChrome = null;


    try {

        activeChrome =
            await getChrome();


        console.log(
            "Lighthouse START:",
            url
        );


        const result =
            await lighthouse(

                url,

                {

                    port:
                        activeChrome.port,

                    output:
                        "json",

                    logLevel:
                        "error",

                    onlyCategories: [

                        "performance",
                        "accessibility",
                        "seo",
                        "best-practices"

                    ]

                }

            );


        const report =
            result.lhr;


        console.log(
            "Lighthouse DONE:",
            url
        );


        // --------------------------------------------
        // Category issues
        // --------------------------------------------

        function getCategoryIssues(
            categoryId
        ) {

            const category =
                report.categories[
                    categoryId
                ];


            if (
                !category ||
                !category.auditRefs
            ) {

                return [];

            }


            const issues = [];


            for (
                const ref
                of category.auditRefs
            ) {

                const audit =
                    report.audits[
                        ref.id
                    ];


                if (!audit) {
                    continue;
                }


                if (
                    audit.score === null ||
                    audit.score >= 0.9
                ) {

                    continue;

                }


                if (
                    audit.scoreDisplayMode ===
                        "informative" ||

                    audit.scoreDisplayMode ===
                        "notApplicable"
                ) {

                    continue;

                }


                issues.push(
                    buildIssue(audit)
                );

            }


            return issues;

        }


        const performanceIssues =
            getCategoryIssues(
                "performance"
            );


        const accessibilityIssues =
            getCategoryIssues(
                "accessibility"
            );


        const seoIssues =
            getCategoryIssues(
                "seo"
            );


        const bestPracticesIssues =
            getCategoryIssues(
                "best-practices"
            );


        // --------------------------------------------
        // Return result
        // --------------------------------------------

        return {

            performance:
                Math.round(
                    (
                        report.categories
                            .performance
                            .score || 0
                    ) * 100
                ),

            accessibility:
                Math.round(
                    (
                        report.categories
                            .accessibility
                            .score || 0
                    ) * 100
                ),

            seo:
                Math.round(
                    (
                        report.categories
                            .seo
                            .score || 0
                    ) * 100
                ),

            bestPractices:
                Math.round(
                    (
                        report.categories[
                            "best-practices"
                        ].score || 0
                    ) * 100
                ),


            issues: {

                performance:
                    performanceIssues,

                accessibility:
                    accessibilityIssues,

                seo:
                    seoIssues,

                bestPractices:
                    bestPracticesIssues

            },


            metrics: {

                firstContentfulPaint:
                    report.audits[
                        "first-contentful-paint"
                    ]?.displayValue || "-",

                largestContentfulPaint:
                    report.audits[
                        "largest-contentful-paint"
                    ]?.displayValue || "-",

                speedIndex:
                    report.audits[
                        "speed-index"
                    ]?.displayValue || "-",

                totalBlockingTime:
                    report.audits[
                        "total-blocking-time"
                    ]?.displayValue || "-",

                cumulativeLayoutShift:
                    report.audits[
                        "cumulative-layout-shift"
                    ]?.displayValue || "-"

            },


            opportunities:
                report.audits[
                    "diagnostics"
                ]?.details || null

        };

    }


    catch (err) {

        console.error(
            "Lighthouse Error:",
            err.message
        );


        // --------------------------------------------
        // If Chrome died, reset it.
        // Next page will launch a fresh instance.
        // --------------------------------------------

        if (
            activeChrome &&
            chrome === activeChrome
        ) {

            chrome = null;

        }


        return {

            performance: 0,

            accessibility: 0,

            seo: 0,

            bestPractices: 0,


            issues: {

                performance: [],
                accessibility: [],
                seo: [],
                bestPractices: []

            },


            metrics: {},

            opportunities: null,

            error:
                err.message

        };

    }

}


// ----------------------------------------------------
// CLOSE LIGHTHOUSE CHROME
// ----------------------------------------------------

async function closeLighthouseBrowser() {

    const currentChrome =
        chrome;

    chrome = null;


    if (!currentChrome) {
        return;
    }


    try {

        await currentChrome.kill();

    }

    catch (err) {

        console.log(
            "Lighthouse Chrome cleanup warning:",
            err.message
        );

    }

}


// ----------------------------------------------------
// EXPORT
// ----------------------------------------------------

module.exports = {

    getLighthouseResults,

    closeLighthouseBrowser

};