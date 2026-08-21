const { chromium } = require("playwright");

async function testFunctionality(url) {

    let browser = null;
    let page = null;

    const issues = [];

    let consoleErrors = 0;

    try {

        browser = await chromium.launch({
            headless: true
        });

        page = await browser.newPage();

    page.on("console", message => {

        if (message.type() === "error") {
            consoleErrors++;
        }

    });

    page.on("pageerror", error => {

        issues.push({

            title: "JavaScript error",

            severity: "High",

            why:
                `A JavaScript error occurred: ${error.message}`,

            fix:
                "Open the browser console, identify the failing script, and fix the JavaScript error."

        });

    });

        // --------------------------------
        // Load page
        // --------------------------------

        await page.goto(url, {

            waitUntil: "domcontentloaded",

            timeout: 30000

        });

        await page.waitForTimeout(1000);


        // --------------------------------
        // Collect links
        // --------------------------------

        const links =
            await page.locator("a").evaluateAll(
                anchors => anchors.map(a => ({

                    text:
                        (a.innerText || "").trim(),

                    href:
                        a.href || ""

                }))
            );


        // --------------------------------
        // Check links
        // --------------------------------

        let brokenLinks = 0;

        const linksToCheck = [];

        for (const link of links) {

            if (!link.href) {
                continue;
            }

            // Ignore anchors
            if (
                link.href.startsWith("#") ||
                link.href.includes("#")
            ) {

                continue;

            }

            // Ignore JavaScript links
            if (
                link.href.startsWith("javascript:")
            ) {

                continue;

            }

            // Email links are not HTTP links
            if (
                link.href.startsWith("mailto:")
            ) {

                continue;

            }

            // Telephone links are not HTTP links
            if (
                link.href.startsWith("tel:")
            ) {

                continue;

            }

            linksToCheck.push(link);

        }


        // --------------------------------
        // Check links in parallel
        // --------------------------------

        const results = [];

        const concurrency = 5;

        for (
            let i = 0;
            i < linksToCheck.length;
            i += concurrency
        ) {

            const batch =
                linksToCheck.slice(
                    i,
                    i + concurrency
                );

            const batchResults =
                await Promise.all(

                    batch.map(
                        async link => {

                            try {

                                const response =
                                    await page.request.get(
                                        link.href,
                                        {
                                            timeout: 5000,
                                            failOnStatusCode: false
                                        }
                                    );

                                return {

                                    link,

                                    status:
                                        response.status(),

                                    error:
                                        null

                                };

                            }

                            catch (error) {

                                return {

                                    link,

                                    status:
                                        null,

                                    error:
                                        error.message

                                };

                            }

                        }
                    )

                );

            results.push(...batchResults);

        }


        // --------------------------------
        // Analyse results
        // --------------------------------

        for (const result of results) {

            const link =
                result.link;

            const status =
                result.status;


            // --------------------------------
            // Definitely broken
            // --------------------------------

            if (
                typeof status === "number" &&
                status >= 400 &&
                status !== 401 &&
                status !== 403 &&
                status !== 429 &&
                status !== 999
            ) {

                brokenLinks++;

                issues.push({

                    title:
                        `Broken link: ${link.text || link.href}`,

                    severity:
                        status >= 500
                            ? "High"
                            : "Medium",

                    why:
                        `The URL returned HTTP ${status}, indicating that the destination could not be successfully accessed.`,

                    fix:
                        `Check the URL "${link.href}", correct the destination if necessary, and remove or replace the broken link.`,

                    url:
                        link.href,

                    status

                });

            }


            // --------------------------------
            // Server rejected automated test
            // --------------------------------

            else if (
                status === 401 ||
                status === 403 ||
                status === 429 ||
                status === 999
            ) {

                issues.push({

                    title:
                        `Link could not be fully verified: ${link.text || link.href}`,

                    severity:
                        "Low",

                    why:
                        `The destination returned HTTP ${status}. This can mean that the server requires authentication, blocks automated requests, applies rate limiting, or uses bot protection.`,

                    fix:
                        `Manually open "${link.href}" in a normal browser and confirm that the destination works before marking this link as broken.`,

                    url:
                        link.href,

                    status,

                    verification:
                        "manual"

                });

            }


            // --------------------------------
            // Request failed
            // --------------------------------

            else if (result.error) {

                issues.push({

                    title:
                        `Link could not be verified: ${link.text || link.href}`,

                    severity:
                        "Low",

                    why:
                        `The automated request could not reach the destination: ${result.error}`,

                    fix:
                        `Open "${link.href}" manually and verify that it is accessible. If it is unavailable, replace or remove the link.`,

                    url:
                        link.href,

                    verification:
                        "manual"

                });

            }

        }


        // --------------------------------
        // Buttons
        // --------------------------------

        const buttons =
            await page.locator(
                "button, input[type='button'], input[type='submit']"
            ).count();


        // --------------------------------
        // Forms
        // --------------------------------

        const forms =
            await page.locator("form").count();


        // --------------------------------
        // Score
        // --------------------------------

        let score = 100;

        score -=
            brokenLinks * 10;

        score -=
            consoleErrors * 5;

        score -=
            issues.filter(
                issue =>
                    issue.severity === "High"
            ).length * 5;

        score =
            Math.max(
                0,
                Math.min(100, score)
            );


        // --------------------------------
        // Return result
        // --------------------------------

        return {

            score,

            summary: {

                linksChecked:
                    linksToCheck.length,

                brokenLinks,

                buttons,

                forms,

                consoleErrors

            },

            issues

        };

    }

    catch (error) {

        return {

            score: 0,

            error:
                error.message,

            summary: {

                linksChecked: 0,

                brokenLinks: 0,

                buttons: 0,

                forms: 0,

                consoleErrors

            },

            issues: [

                {

                    title:
                        "Page could not be tested",

                    severity:
                        "Critical",

                    why:
                        `The page could not be loaded or tested: ${error.message}`,

                    fix:
                        "Make sure the page loads correctly and is accessible, then run the audit again."

                }

            ]

        };

    }

    finally {

        if (browser) {
            try {
                await browser.close();
            }
            catch (error) {
                console.log(
                    "Functionality browser cleanup warning:",
                    error.message
                );
            }
        }

    }

}

module.exports = testFunctionality;
