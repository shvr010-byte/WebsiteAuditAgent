const fs = require("fs");
const path = require("path");

const analyzeUIUXBatch =
    require("./services/uiuxBatch");

const locateElement =
    require("./services/locator");

const annotateImage =
    require("./services/imageAnnotator");

const auditPath =
    path.join(
        process.cwd(),
        "audit-backups",
        "www.searchonic.com_",
        "audit-results.json"
    );

const screenshotDir =
    path.join(
        process.cwd(),
        "screenshots"
    );

const outputAuditPath =
    path.join(
        process.cwd(),
        "audit-backups",
        "www.searchonic.com_",
        "audit-results-uiux.json"
    );


function safeScreenshotName(url) {

    return url
        .replace(/^https?:\/\//, "")
        .replace(/[<>:"/\\|?*]/g, "_")
        .replace(/\.+/g, "_");
}


function findScreenshot(url) {

    const base =
        safeScreenshotName(url);

    const candidates = [

        `${base}-desktop-ai.jpg`,

        `${base}-desktop.png`

    ];

    for (
        const filename of candidates
    ) {

        const fullPath =
            path.join(
                screenshotDir,
                filename
            );

        if (
            fs.existsSync(fullPath)
        ) {

            return fullPath;

        }

    }

    return null;
}


async function main() {

    console.log(
        "Reading existing 50-page audit..."
    );

    const audit =
        JSON.parse(
            fs.readFileSync(
                auditPath,
                "utf8"
            )
        );


    const images = [];

    for (
        const page of audit.pages
    ) {

        const imagePath =
            findScreenshot(
                page.url
            );

        if (!imagePath) {

            console.log(
                "No screenshot:",
                page.url
            );

            continue;

        }

        images.push({

            page:
                page.url,

            path:
                imagePath

        });

    }


    console.log(
        `Screenshots available: ${images.length}/${audit.pages.length}`
    );


    if (images.length === 0) {

        throw new Error(
            "No usable screenshots found."
        );

    }


    // ---------------------------------------------
    // PROCESS IN SMALL BATCHES
    // ---------------------------------------------

    const batchSize = 5;

    for (
        let start = 0;
        start < images.length;
        start += batchSize
    ) {

        const batch =
            images.slice(
                start,
                start + batchSize
            );


        console.log(
            `\nUI/UX batch ${start + 1}-${start + batch.length} of ${images.length}`
        );


        let results = [];

        try {

            results =
                await analyzeUIUXBatch(
                    batch
                );

        }

        catch (error) {

            console.error(
                "UI/UX batch failed:",
                error.message
            );

            continue;

        }


        // -----------------------------------------
        // SAVE RESULTS INTO AUDIT
        // -----------------------------------------

        for (
            const result of results
        ) {

            const page =
                audit.pages.find(
                    p =>
                        p.url === result.page
                );


            if (!page) {
                continue;
            }


            page.uiux = {

                strengths:
                    result.strengths || [],

                issues:
                    result.issues || []

            };


            const image =
                batch.find(
                    img =>
                        img.page === result.page
                );


            if (!image) {
                continue;
            }


            // -------------------------------------
            // CREATE ISSUE SCREENSHOTS
            // -------------------------------------

            if (
                !page.uiux.issues ||
                page.uiux.issues.length === 0
            ) {

                continue;

            }


            const outputDir =
                path.join(
                    screenshotDir,
                    "uiux-issues"
                );


            fs.mkdirSync(
                outputDir,
                {
                    recursive: true
                }
            );


            for (
                const issue
                of page.uiux.issues
            ) {

                if (
                    !issue.target
                ) {
                    continue;
                }


                try {

                    const box =
                        await locateElement(
                            result.page,
                            issue.target
                        );


                    if (!box) {

                        console.log(
                            `Could not locate ${issue.id}`
                        );

                        continue;

                    }


                    const outputPath =
                        path.join(
                            outputDir,
                            `${issue.id}.jpg`
                        );


                    const annotatedPath =
                        await annotateImage(

                            image.path,

                            box,

                            issue.id,

                            outputPath

                        );


                    if (
                        annotatedPath
                    ) {

                        issue.annotatedScreenshot =
                            annotatedPath;

                    }

                }

                catch (error) {

                    console.log(
                        `Screenshot failed for ${issue.id}:`,
                        error.message
                    );

                }

            }

        }


        // Save progress after every batch

        fs.writeFileSync(
            outputAuditPath,
            JSON.stringify(
                audit,
                null,
                2
            ),
            "utf8"
        );


        console.log(
            "UI/UX progress saved."
        );

    }


    console.log("");
    console.log(
        "========================================"
    );
    console.log(
        "UI/UX RECOVERY COMPLETE"
    );
    console.log(
        "========================================"
    );

    console.log(
        outputAuditPath
    );

}


main()
    .catch(error => {

        console.error(
            "RECOVERY ERROR:"
        );

        console.error(
            error
        );

        process.exit(1);

    });