const { chromium } = require("playwright");

async function testResponsive(url) {

    let browser = null;

    const viewports = [

        {
            name: "Mobile",
            width: 375,
            height: 812
        },

        {
            name: "Tablet",
            width: 768,
            height: 1024
        },

        {
            name: "Desktop",
            width: 1280,
            height: 720
        }

    ];

    const issues = [];

    const results = [];

    const testErrors = [];

    try {

        browser = await chromium.launch({
            headless: true
        });

        for (const viewport of viewports) {

            const page =
                await browser.newPage({

                    viewport: {

                        width:
                            viewport.width,

                        height:
                            viewport.height

                    }

                });

            try {

                await page.goto(url, {

                    waitUntil:
                        "domcontentloaded",

                    timeout:
                        30000

                });

                await page.waitForTimeout(1000);


                const result =
                    await page.evaluate(() => {

                        const documentWidth =
                            document.documentElement
                                .scrollWidth;

                        const viewportWidth =
                            window.innerWidth;

                        const horizontalOverflow =
                            documentWidth >
                            viewportWidth + 5;


                        const overflowingElements = [];


                        document
                            .querySelectorAll("*")
                            .forEach(element => {

                                const rect =
                                    element
                                        .getBoundingClientRect();


                                if (
                                    rect.right >
                                    viewportWidth + 5
                                ) {

                                    const tag =
                                        element.tagName
                                            .toLowerCase();

                                    const id =
                                        element.id
                                            ? `#${element.id}`
                                            : "";


                                    const className =
                                        typeof element.className ===
                                        "string"
                                            ? element.className
                                            : "";


                                    overflowingElements.push({

                                        selector:
                                            `${tag}${id}`,

                                        className:
                                            className
                                                .substring(
                                                    0,
                                                    100
                                                ),

                                        right:
                                            Math.round(
                                                rect.right
                                            ),

                                        width:
                                            Math.round(
                                                rect.width
                                            ),

                                        overflow:
                                            Math.round(
                                                rect.right -
                                                viewportWidth
                                            )

                                    });

                                }

                            });


                        return {

                            viewportWidth,

                            documentWidth,

                            horizontalOverflow,

                            overflowingElements:
                                overflowingElements
                                    .slice(0, 10)

                        };

                    });


                results.push({

                    viewport:
                        viewport.name,

                    width:
                        viewport.width,

                    height:
                        viewport.height,

                    ...result

                });


                // --------------------------------
                // Overflow issue
                // --------------------------------

                if (
                    result.horizontalOverflow
                ) {

                    const affected =
                        result
                            .overflowingElements;


                    const affectedText =
                        affected.length > 0

                            ?

`Affected elements: ${affected
    .map(
        element =>
            `${element.selector} (${element.overflow}px overflow)`
    )
    .join(", ")}`

                            :

                            "No specific overflowing element could be identified.";


                    issues.push({

                        title:
                            `Horizontal overflow on ${viewport.name}`,

                        severity:
                            viewport.name === "Mobile"
                                ? "High"
                                : "Medium",


                        why:

`The document is ${result.documentWidth}px wide while the ${viewport.name.toLowerCase()} viewport is only ${result.viewportWidth}px wide. This can cause horizontal scrolling, clipped content, or elements extending outside the screen. ${affectedText}`,

                        fix:

`Inspect the affected elements and remove fixed widths that exceed the viewport. Use responsive widths, max-width: 100%, flexible layouts, responsive images, and appropriate CSS media queries.`,

                        viewport:
                            viewport.name,

                        width:
                            viewport.width,

                        documentWidth:
                            result.documentWidth,

                        overflowingElements:
                            affected

                    });

                }

            }

            catch (error) {

                testErrors.push(
                    `${viewport.name}: ${error.message}`
                );

                issues.push({

                    title:
                        `${viewport.name} page test failed`,

                    severity:
                        "High",

                    why:
                        `The page could not be tested at ${viewport.width}px: ${error.message}`,

                    fix:
                        `Make sure the page loads correctly at ${viewport.width}px width and does not depend on desktop-only resources.`,

                    viewport:
                        viewport.name,

                    width:
                        viewport.width

                });

            }

            finally {

                try {
                    await page.close();
                }
                catch (error) {
                    console.log(
                        "Responsive page cleanup warning:",
                        error.message
                    );
                }

            }

        }


        // --------------------------------
        // Calculate score
        // --------------------------------

        let score = 100;

        for (const issue of issues) {

            if (
                issue.severity === "High"
            ) {

                score -= 20;

            }

            else if (
                issue.severity === "Medium"
            ) {

                score -= 10;

            }

            else {

                score -= 5;

            }

        }

        score =
            Math.max(
                0,
                Math.min(100, score)
            );


        return {

            score,

            ...(testErrors.length > 0
                ? {
                    error:
                        testErrors.join("; ")
                }
                : {}),

            summary: {

                viewportsTested:
                    viewports.length,

                issuesFound:
                    issues.length

            },

            results,

            issues

        };

    }

    finally {

        if (browser) {
            try {
                await browser.close();
            }
            catch (error) {
                console.log(
                    "Responsive browser cleanup warning:",
                    error.message
                );
            }
        }

    }

}

module.exports = testResponsive;
