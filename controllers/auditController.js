const generateAuditReport = require("../services/reportService");
const optimizeImage = require("../services/imageOptimizer");
const { shouldAnalyzeUIUX } = require("../utils/pageFilter");

const locateElement = require("../services/locator");
const annotateImage = require("../services/imageAnnotator");

const crawlWebsite = require("../services/crawler");
const analyzeUIUXBatch = require("../services/uiuxBatch");
const createBatches = require("../utils/createBatches");
const {
    captureWebsite,
    closeBrowser
} = require("../services/playwright");

const getLighthouseResults = require("../services/lighthouse");
const runAccessibilityAudit = require("../services/axe");
const checkBrokenLinks = require("../services/links");

async function auditWebsite(req, res) {

    try {

        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: "Website URL is required"
            });
        }

        // Crawl website
        const pages = await crawlWebsite(url);

        console.log(`Total Pages Found: ${pages.length}`);

        const allAudits = [];
        const uiuxCandidates = [];
        for (let index = 0; index < pages.length; index++) {

            const pageUrl = pages[index];

            console.log(
                `[${index + 1}/${pages.length}] Auditing: ${pageUrl}`
            );

            try {

                // Capture Screenshot
                const playwright = await captureWebsite(pageUrl);

                // Compress Screenshot
                const aiImage = await optimizeImage(
                    playwright.desktopScreenshot
                );

                let uiux = null;

                // UI/UX Analysis
                if (shouldAnalyzeUIUX(pageUrl)) {

                    console.log("Running UI/UX...");

                    uiux = await analyzeUIUX(aiImage);

                    if (uiux && uiux.issues) {

                        const safePage = pageUrl
                            .replace(/^https?:\/\//, "")
                            .replace(/[^\w]/g, "_");

                        for (const issue of uiux.issues) {

                            const box = await locateElement(
                                pageUrl,
                                issue.target
                            );

                            if (box) {

                                issue.annotatedScreenshot =
                                    await annotateImage(

                                        playwright.desktopScreenshot,

                                        box,

                                        issue.id,

                                        `screenshots/${safePage}-${issue.id}.png`

                                    );

                            }

                        }

                    }

                } else {

                    console.log("Skipping UI/UX");

                    uiux = {

                        skipped: true,

                        reason: "Blog / Privacy / Terms Page"

                    };

                }

                // Run Technical Audits in Parallel
                const [
                    lighthouse,
                    accessibility,
                    links
                ] = await Promise.all([

                    getLighthouseResults(pageUrl),

                    runAccessibilityAudit(pageUrl),

                    checkBrokenLinks(pageUrl)

                ]);

                allAudits.push({

                    url: pageUrl,

                    playwright,

                    lighthouse,

                    accessibility,

                    links,

                    uiux

                });

            }

            catch (pageError) {

                console.error(
                    `Failed: ${pageUrl}`
                );

                console.error(pageError);

                allAudits.push({

                    url: pageUrl,

                    error: pageError.message

                });

                continue;

            }

        }

        // Close Playwright Browser
        await closeBrowser();

        const audit = {

            metadata: {

                website: url,

                totalPages: allAudits.length,

                completedAt: new Date().toISOString()

            },

            pages: allAudits

        };
        const report = await generateAuditReport(audit);
       res.json({

    success: true,

    audit,

    report

});
    }

    catch (error) {

        console.error(error);

        await closeBrowser();

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

}

module.exports = {
    auditWebsite
};