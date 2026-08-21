const fs = require("fs");
const path = require("path");

const testFunctionality =
    require("../services/functionality");

const testResponsive =
    require("../services/responsive");

const generateAuditReport =
    require("../services/reportService");

const optimizeImage =
    require("../services/imageOptimizer");

const {
    shouldAnalyzeUIUX
} = require("../utils/pageFilter");

const locateElement =
    require("../services/locator");

const annotateImage =
    require("../services/imageAnnotator");

const crawlWebsite =
    require("../services/crawler");

const analyzeUIUXBatch =
    require("../services/uiuxBatch");

const createBatches =
    require("../utils/createBatches");

const {
    captureWebsite,
    closeBrowser
} = require("../services/playwright");

const {
    getLighthouseResults
} = require("../services/lighthouse");

const runAccessibilityAudit =
    require("../services/axe");

const checkBrokenLinks =
    require("../services/links");

process.on(
    "uncaughtException",
    (error) => {

        if (
            error &&
            error.code === "ERR_INVALID_URL"
        ) {

            console.log(
                "Ignored malformed URL from broken-link-checker:",
                error.input || error.message
            );

            return;
        }

        console.error(
            "Unhandled error:",
            error
        );

    }
);
// ====================================================
// SAVE AUDIT BACKUP
// ====================================================

function saveAuditBackup(websiteUrl, auditData) {

    let temporaryPath = null;

    try {

        const safeWebsite =
            websiteUrl
                .replace(/^https?:\/\//, "")
                .replace(/[^\w.-]/g, "_");

        const backupDir =
            path.join(
                process.cwd(),
                "audit-backups",
                safeWebsite
            );

        fs.mkdirSync(
            backupDir,
            {
                recursive: true
            }
        );


        const backupPath =
            path.join(
                backupDir,
                "audit-results.json"
            );

        temporaryPath =
            `${backupPath}.${process.pid}.${Date.now()}.tmp`;


        fs.writeFileSync(

            temporaryPath,

            JSON.stringify(
                auditData,
                null,
                2
            ),

            "utf8"

        );

        fs.renameSync(
            temporaryPath,
            backupPath
        );


        console.log(
            "Audit backup saved:",
            backupPath
        );


        return backupPath;

    }

    catch (err) {

        try {
            if (
                temporaryPath &&
                fs.existsSync(temporaryPath)
            ) {
                fs.rmSync(
                    temporaryPath,
                    { force: true }
                );
            }
        }
        catch {}

        console.error(
            "Audit backup failed:",
            err.message
        );

        return null;

    }

}


// ====================================================
// BUILD AUDIT DATA
// ====================================================

function buildAuditData(
    websiteUrl,
    allAudits,
    progress = null
) {

    const now =
        new Date().toISOString();

    return {

        metadata: {

            website:
                websiteUrl,

            totalPages:
                progress?.totalPages ??
                allAudits.length,

            completedAt:
                now,

            ...(progress
                ? {
                    progress: {
                        ...progress,
                        lastSavedTime: now
                    }
                }
                : {})

        },

        pages:
            allAudits

    };

}


function errorMessage(error) {

    return error?.message ||
        String(error || "Unknown error");

}


function addPageError(pageAudit, module, error) {

    if (!Array.isArray(pageAudit.errors)) {
        pageAudit.errors = [];
    }

    const message = errorMessage(error);

    if (
        !pageAudit.errors.some(
            item =>
                item.module === module &&
                item.message === message
        )
    ) {
        pageAudit.errors.push({ module, message });
    }

}


async function runPageModule(
    pageAudit,
    module,
    operation,
    fallback = null,
    timeoutMs = 120000
) {

    let timeout;

    try {
        return await Promise.race([
            operation(),
            new Promise((_, reject) => {
                timeout = setTimeout(
                    () => reject(
                        new Error(
                            `${module} timed out after ${timeoutMs}ms`
                        )
                    ),
                    timeoutMs
                );
            })
        ]);
    }
    catch (error) {
        console.error(
            `${module} failed for ${pageAudit.url}:`,
            errorMessage(error)
        );
        addPageError(pageAudit, module, error);
        return fallback;
    }
    finally {
        clearTimeout(timeout);
    }

}


function buildProgressState({
    pages,
    allAudits,
    currentPage = null,
    auditStartTime,
    status = "running"
}) {

    const completedUrls =
        new Set(
            allAudits
                .map(page => page?.url)
                .filter(Boolean)
        );

    const failedPages =
        allAudits
            .filter(page =>
                page?.status === "failed" ||
                page?.error ||
                (
                    Array.isArray(page?.errors) &&
                    page.errors.length > 0
                )
            )
            .map(page => page.url)
            .filter(Boolean);

    return {
        status,
        pages,
        totalPages: pages.length,
        completedPages: completedUrls.size,
        completedPageUrls: [...completedUrls],
        currentPage,
        failedPages,
        remainingPages:
            pages.filter(page => !completedUrls.has(page)),
        auditStartTime
    };

}


// ====================================================
// MAIN AUDIT
// ====================================================

async function auditWebsite(req, res) {

    try {

        const {
    url,
    startPage = 1,
    resume = false
} = req.body;


        // ------------------------------------------------
        // Validate URL
        // ------------------------------------------------

        if (!url) {

            return res.status(400).json({

                success: false,

                message:
                    "Website URL is required"

            });

        }


      // ------------------------------------------------
// Prepare screenshots
// ------------------------------------------------

const screenshotsDir =
    path.join(
        process.cwd(),
        "screenshots"
    );


// Only clear screenshots for a NEW audit.
// When resuming, keep existing screenshots.

if (!resume && startPage <= 1) {

    if (
        fs.existsSync(
            screenshotsDir
        )
    ) {

        fs.rmSync(
            screenshotsDir,
            {
                recursive: true,
                force: true
            }
        );

    }

}


fs.mkdirSync(
    screenshotsDir,
    {
        recursive: true
    }
);


        // ------------------------------------------------
        // Crawl Website
        // ------------------------------------------------

        let pages =
            await crawlWebsite(url);


        console.log(
            `Pages Found: ${pages.length}`
        );


      let allAudits = [];

let auditStartTime =
    new Date().toISOString();

const uiuxCandidates = [];


// ------------------------------------------------
// RESUME EXISTING AUDIT
// ------------------------------------------------

if (resume || startPage > 1) {

    const safeWebsite =
        url
            .replace(/^https?:\/\//, "")
            .replace(/[^\w.-]/g, "_");

    const backupPath =
        path.join(
            process.cwd(),
            "audit-backups",
            safeWebsite,
            "audit-results.json"
        );


    if (
        !fs.existsSync(
            backupPath
        )
    ) {

        throw new Error(
            `Existing audit backup not found:\n${backupPath}`
        );

    }


    console.log(
        "Loading existing audit backup..."
    );


    const previousAudit =
        JSON.parse(
            fs.readFileSync(
                backupPath,
                "utf8"
            )
        );


    allAudits =
        previousAudit.pages || [];

    auditStartTime =
        previousAudit.metadata?.progress
            ?.auditStartTime ||
        auditStartTime;

    const savedPages =
        previousAudit.metadata?.progress
            ?.pages;

    if (Array.isArray(savedPages)) {

        pages = [
            ...savedPages,
            ...pages.filter(
                page => !savedPages.includes(page)
            )
        ];

    }


    console.log(
        `Existing pages loaded: ${allAudits.length}`
    );


    if (
        !resume &&
        allAudits.length <
        startPage - 1
    ) {

        throw new Error(
            `Backup contains only ${allAudits.length} pages. Cannot resume from page ${startPage}.`
        );

    }

}


        // ------------------------------------------------
        // Process Every Page
        // ------------------------------------------------

       const completedPageUrls =
        new Set(
            allAudits
                .map(page => page?.url)
                .filter(Boolean)
        );

       for (
    let index = resume ? 0 : startPage - 1;
    index < pages.length;
    index++
) {

            const pageUrl =
                pages[index];

            if (completedPageUrls.has(pageUrl)) {
                console.log(
                    `Skipping completed page: ${pageUrl}`
                );
                continue;
            }


            console.log(
                `[${index + 1}/${pages.length}] ${pageUrl}`
            );

            saveAuditBackup(
                url,
                buildAuditData(
                    url,
                    allAudits,
                    buildProgressState({
                        pages,
                        allAudits,
                        currentPage: pageUrl,
                        auditStartTime
                    })
                )
            );


            try {

                const pageAudit = {
                    url: pageUrl,
                    errors: []
                };

                // ==================================================
                // CAPTURE WEBSITE
                // ==================================================

                const playwright =
                    await runPageModule(
                        pageAudit,
                        "playwright",
                        () => captureWebsite(pageUrl),
                        {
                            desktopScreenshot: null,
                            mobileScreenshot: null,
                            consoleErrors: [],
                            networkErrors: []
                        }
                    );

                if (playwright?.desktopError) {
                    addPageError(
                        pageAudit,
                        "desktop",
                        playwright.desktopError
                    );
                }

                if (playwright?.mobileError) {
                    addPageError(
                        pageAudit,
                        "mobile",
                        playwright.mobileError
                    );
                }


                // ==================================================
                // IMAGE OPTIMIZATION
                // ==================================================

                console.log(
                    "Starting image optimization:",
                    pageUrl
                );


                let aiImage = null;


                try {

                    if (
                        playwright &&
                        playwright.desktopScreenshot
                    ) {

                        aiImage =
                            await optimizeImage(
                                playwright.desktopScreenshot
                            );

                    }

                }

                catch (err) {

                    console.log(
                        "Image optimization failed:",
                        err.message
                    );

                    addPageError(
                        pageAudit,
                        "imageOptimization",
                        err
                    );

                }


                console.log(
                    "Image optimization DONE:",
                    pageUrl
                );


                // ==================================================
                // TECHNICAL AUDITS
                // ==================================================

                console.log(
                    "Starting technical audits:",
                    pageUrl
                );


                const [

                    lighthouse,

                    accessibility,

                    links,

                    functionality,

                    responsive

                ] = await Promise.all([

                    // ------------------------------------------
                    // 1. Lighthouse
                    // ------------------------------------------

                    runPageModule(
                        pageAudit,
                        "lighthouse",
                        () => getLighthouseResults(pageUrl)
                    ),

                    // ------------------------------------------
                    // 2. Accessibility
                    // ------------------------------------------

                    runPageModule(
                        pageAudit,
                        "accessibility",
                        () => runAccessibilityAudit(pageUrl)
                    ),

                    // ------------------------------------------
                    // 3. Broken Links
                    // ------------------------------------------

                    runPageModule(
                        pageAudit,
                        "links",
                        () => checkBrokenLinks(pageUrl)
                    ),

                    // ------------------------------------------
                    // 4. Functionality
                    // ------------------------------------------

                    runPageModule(
                        pageAudit,
                        "functionality",
                        () => testFunctionality(pageUrl)
                    ),

                    // ------------------------------------------
                    // 5. Responsive
                    // ------------------------------------------

                    runPageModule(
                        pageAudit,
                        "responsive",
                        () => testResponsive(pageUrl)
                    )

                ]);

                for (const [module, result] of [
                    ["lighthouse", lighthouse],
                    ["accessibility", accessibility],
                    ["links", links],
                    ["functionality", functionality],
                    ["responsive", responsive]
                ]) {
                    if (result?.error) {
                        addPageError(
                            pageAudit,
                            module,
                            result.error
                        );
                    }
                }


                // ==================================================
                // UI/UX
                // ==================================================

                let uiux = null;


                if (
                    shouldAnalyzeUIUX(
                        pageUrl
                    )
                ) {
const uiuxImage =
    aiImage ||
    playwright.desktopScreenshot;

if (uiuxImage) {

    uiuxCandidates.push({

        page:
            pageUrl,

        image:
            uiuxImage,

        screenshot:
            playwright.desktopScreenshot,

        auditIndex:
            allAudits.length

    });

}
else {

    console.log(
        "Skipping UI/UX: no screenshot available:",
        pageUrl
    );

}

                }

                else {

                    uiux = {

                        skipped:
                            true,

                        reason:
                            "Blog / Privacy / Terms Page"

                    };

                }


                // ==================================================
                // STORE PAGE AUDIT
                // ==================================================

                Object.assign(pageAudit, {

                    playwright,

                    lighthouse,

                    accessibility,

                    links,

                    functionality,

                    responsive,

                    uiux,

                    status:
                        pageAudit.errors.length > 0
                            ? "completedWithErrors"
                            : "completed"

                });

                allAudits.push(pageAudit);

                completedPageUrls.add(pageUrl);


                // ==================================================
                // SAVE PROGRESS AFTER EVERY PAGE
                // ==================================================

                const progressAudit =
                    buildAuditData(
                        url,
                        allAudits,
                        buildProgressState({
                            pages,
                            allAudits,
                            auditStartTime
                        })
                    );


                saveAuditBackup(
                    url,
                    progressAudit
                );


                console.log(
                    `Audit progress saved: ${allAudits.length}/${pages.length}`
                );


            }

            catch (err) {

                console.error(
                    `Audit error on ${pageUrl}:`,
                    err
                );


                // --------------------------------------------
                // Save failed page instead of losing progress
                // --------------------------------------------

                const failedPage = {

                    url:
                        pageUrl,

                    error:
                        err.message,

                    errors: [
                        {
                            module: "page",
                            message: err.message
                        }
                    ],

                    status: "failed"

                };

                allAudits.push(failedPage);

                completedPageUrls.add(pageUrl);


                // --------------------------------------------
                // Save progress even after page failure
                // --------------------------------------------

                const errorProgressAudit =
                    buildAuditData(
                        url,
                        allAudits,
                        buildProgressState({
                            pages,
                            allAudits,
                            auditStartTime
                        })
                    );


                saveAuditBackup(
                    url,
                    errorProgressAudit
                );


                console.log(
                    `Saved progress after failed page: ${allAudits.length}/${pages.length}`
                );

            }

        }


        // ====================================================
        // BATCH GEMINI UI/UX
        // ====================================================

        const queuedUIUXPages =
            new Set(
                uiuxCandidates.map(item => item.page)
            );

        for (
            let auditIndex = 0;
            auditIndex < allAudits.length;
            auditIndex++
        ) {

            const savedAudit = allAudits[auditIndex];

            if (
                savedAudit?.url &&
                savedAudit.uiux == null &&
                savedAudit.playwright?.desktopScreenshot &&
                shouldAnalyzeUIUX(savedAudit.url) &&
                !queuedUIUXPages.has(savedAudit.url)
            ) {
                uiuxCandidates.push({
                    page: savedAudit.url,
                    image: savedAudit.playwright.desktopScreenshot,
                    screenshot: savedAudit.playwright.desktopScreenshot,
                    auditIndex
                });
            }

        }

        console.log(
            `Running Batch UI/UX on ${uiuxCandidates.length} pages...`
        );


        const batches =
            createBatches(
                uiuxCandidates,
                4
            );


        for (
            const batch
            of batches
        ) {

            const batchInput =
                batch.map(
                    item => ({

                        page:
                            item.page,

                        path:
                            item.image

                    })
                );


            let batchResults = [];


            try {

                batchResults =
                    await analyzeUIUXBatch(
                        batchInput
                    );

            }

            catch (err) {

                console.error(
                    "Batch Gemini error:",
                    err.message
                );


                batchResults =
                    [];

                for (const candidate of batch) {
                    const failedAudit =
                        allAudits[candidate.auditIndex];

                    if (failedAudit) {
                        addPageError(
                            failedAudit,
                            "uiux",
                            err
                        );
                    }
                }

            }


            for (
                let i = 0;
                i < batch.length;
                i++
            ) {

                const candidate =
                    batch[i];


                const result =
                    batchResults[i] || {

                        strengths: [],

                        issues: []

                    };


                const audit =
                    allAudits[
                        candidate.auditIndex
                    ];


                if (!audit) {
                    continue;
                }


                audit.uiux =
                    result;

                if (result.error) {
                    addPageError(
                        audit,
                        "uiux",
                        result.error
                    );
                }


                // ==================================================
                // UI/UX ANNOTATIONS
                // ==================================================

                if (
                    result.issues &&
                    Array.isArray(
                        result.issues
                    )
                ) {

                    const safePage =
                        candidate.page

                            .replace(
                                /^https?:\/\//,
                                ""
                            )

                            .replace(
                                /[^\w]/g,
                                "_"
                            );


                    for (
                        const issue
                        of result.issues
                    ) {

                        try {

                            if (
                                !issue ||
                                !issue.target
                            ) {

                                continue;

                            }


                            const box =
                                await locateElement(

                                    candidate.page,

                                    issue.target

                                );


                            if (
                                box &&
                                candidate.screenshot
                            ) {

                                issue.annotatedScreenshot =

                                    await annotateImage(

                                        candidate.screenshot,

                                        box,

                                        issue.id,

                                        `screenshots/${safePage}-${issue.id}.png`

                                    );

                            }

                        }

                        catch (err) {

                            console.log(
                                "Annotation skipped:",
                                err.message
                            );

                        }

                    }

                }


                // ==================================================
                // SAVE UI/UX PROGRESS
                // ==================================================

                const uiuxProgressAudit =
                    buildAuditData(
                        url,
                        allAudits,
                        buildProgressState({
                            pages,
                            allAudits,
                            auditStartTime
                        })
                    );


                saveAuditBackup(
                    url,
                    uiuxProgressAudit
                );

            }

        }


        // ====================================================
        // CLOSE PLAYWRIGHT BROWSER
        // ====================================================

        try {
            await closeBrowser();
        }
        catch (error) {
            console.log(
                "Playwright cleanup warning:",
                errorMessage(error)
            );
        }


        // ====================================================
        // FINAL AUDIT OBJECT
        // ====================================================

        const audit =
            buildAuditData(
                url,
                allAudits,
                buildProgressState({
                    pages,
                    allAudits,
                    auditStartTime,
                    status: "completed"
                })
            );


        // ====================================================
        // FINAL BACKUP BEFORE REPORT
        // ====================================================

        const backupPath =
            saveAuditBackup(
                url,
                audit
            );


        console.log(
            "Final audit backup:",
            backupPath
        );


        // ====================================================
        // GENERATE REPORT
        // ====================================================

        console.log(
            "Starting report generation..."
        );


        let report = null;


        try {

            report =
                await generateAuditReport(
                    audit
                );

        }

        catch (reportError) {

            // --------------------------------------------
            // IMPORTANT:
            // Audit data is already safely saved.
            // --------------------------------------------

            console.error(
                "REPORT GENERATION ERROR:",
                reportError
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Audit completed, but report generation failed.",

                error:
                    reportError.message,

                backup:
                    backupPath,

                audit

            });

        }


        // ====================================================
        // SUCCESS
        // ====================================================

        return res.json({

            success:
                true,

            audit,

            report,

            backup:
                backupPath

        });


    }

    catch (error) {

        console.error(
            "AUDIT ERROR:",
            error
        );


        // --------------------------------------------
        // Always close browser
        // --------------------------------------------

        try {

            await closeBrowser();

        }

        catch {}


        return res.status(500).json({

            success:
                false,

            message:
                error.message

        });

    }

}


// ====================================================
// EXPORT
// ====================================================

module.exports = {

    auditWebsite

};
