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


// ====================================================
// SAVE AUDIT BACKUP
// ====================================================

function saveAuditBackup(websiteUrl, auditData) {

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


        fs.writeFileSync(

            backupPath,

            JSON.stringify(
                auditData,
                null,
                2
            ),

            "utf8"

        );


        console.log(
            "Audit backup saved:",
            backupPath
        );


        return backupPath;

    }

    catch (err) {

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
    allAudits
) {

    return {

        metadata: {

            website:
                websiteUrl,

            totalPages:
                allAudits.length,

            completedAt:
                new Date().toISOString()

        },

        pages:
            allAudits

    };

}


// ====================================================
// MAIN AUDIT
// ====================================================

async function auditWebsite(req, res) {

    try {

        const {
            url
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
        // Clear old screenshots
        // ------------------------------------------------

        const screenshotsDir =
            path.join(
                process.cwd(),
                "screenshots"
            );


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


        fs.mkdirSync(

            screenshotsDir,

            {
                recursive: true
            }

        );


        // ------------------------------------------------
        // Crawl Website
        // ------------------------------------------------

        const pages =
            await crawlWebsite(url);


        console.log(
            `Pages Found: ${pages.length}`
        );


        const allAudits = [];

        const uiuxCandidates = [];


        // ------------------------------------------------
        // Process Every Page
        // ------------------------------------------------

        for (
            let index = 0;
            index < pages.length;
            index++
        ) {

            const pageUrl =
                pages[index];


            console.log(
                `[${index + 1}/${pages.length}] ${pageUrl}`
            );


            try {

                // ==================================================
                // CAPTURE WEBSITE
                // ==================================================

                const playwright =
                    await captureWebsite(
                        pageUrl
                    );


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

                    getLighthouseResults(
                        pageUrl
                    ),

                    // ------------------------------------------
                    // 2. Accessibility
                    // ------------------------------------------

                    runAccessibilityAudit(
                        pageUrl
                    ),

                    // ------------------------------------------
                    // 3. Broken Links
                    // ------------------------------------------

                    checkBrokenLinks(
                        pageUrl
                    ),

                    // ------------------------------------------
                    // 4. Functionality
                    // ------------------------------------------

                    testFunctionality(
                        pageUrl
                    ),

                    // ------------------------------------------
                    // 5. Responsive
                    // ------------------------------------------

                    testResponsive(
                        pageUrl
                    )

                ]);


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

                allAudits.push({

                    url:
                        pageUrl,

                    playwright,

                    lighthouse,

                    accessibility,

                    links,

                    functionality,

                    responsive,

                    uiux

                });


                // ==================================================
                // SAVE PROGRESS AFTER EVERY PAGE
                // ==================================================

                const progressAudit =
                    buildAuditData(
                        url,
                        allAudits
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

                allAudits.push({

                    url:
                        pageUrl,

                    error:
                        err.message

                });


                // --------------------------------------------
                // Save progress even after page failure
                // --------------------------------------------

                const errorProgressAudit =
                    buildAuditData(
                        url,
                        allAudits
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
                        allAudits
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

        await closeBrowser();


        // ====================================================
        // FINAL AUDIT OBJECT
        // ====================================================

        const audit =
            buildAuditData(
                url,
                allAudits
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