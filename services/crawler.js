const { chromium } = require("playwright");


// ------------------------------------------------
// NORMALIZE URL
// ------------------------------------------------

function normalizeUrl(urlString) {

    try {

        const url = new URL(urlString);

        // Remove hash
        url.hash = "";

        // Remove query parameters
        url.search = "";

        // Normalize index pages
        if (
            url.pathname === "/index.html" ||
            url.pathname === "/index.htm"
        ) {
            url.pathname = "/";
        }

        // Remove trailing slash except root
        if (
            url.pathname.length > 1 &&
            url.pathname.endsWith("/")
        ) {
            url.pathname =
                url.pathname.slice(0, -1);
        }

        return url.toString();

    }

    catch {

        return null;

    }

}


// ------------------------------------------------
// SKIP UNWANTED URLS
// ------------------------------------------------

function shouldSkip(url) {

    const path =
        url.pathname.toLowerCase();

    return (

        path.includes("/blog") ||
        path.includes("blogs") ||
        path.includes("/news") ||
        path.includes("/article") ||
        path.includes("/privacy") ||
        path.includes("/terms") ||
        path.includes("/policy") ||

        path.match(
            /\.(pdf|jpg|jpeg|png|gif|svg|zip|rar|mp4|mp3|webp|css|js)$/i
        )

    );

}


// ------------------------------------------------
// CRAWLER
// ------------------------------------------------

async function crawlWebsite(
    startUrl,
    maxPages = 50
) {

    const start =
        normalizeUrl(startUrl);


    if (!start) {
        return [];
    }


    let browser = null;


    try {

        browser =
            await chromium.launch({

            headless: true,

            args: [
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--no-sandbox"
            ]

        });

    }

    catch (error) {

        console.log(
            "Crawler browser launch failed:",
            error.message
        );

        return [start];

    }


    let context;

    try {
        context =
            await browser.newContext();
    }
    catch (error) {
        console.log(
            "Crawler context creation failed:",
            error.message
        );

        try {
            await browser.close();
        }
        catch {}

        return [start];
    }


    const visited =
        new Set();

    const queued =
        new Set();


    const queue = [start];

    queued.add(start);


    const baseDomain =
        new URL(start).hostname;


    while (

        queue.length > 0 &&
        visited.size < maxPages

    ) {

        const currentUrl =
            queue.shift();


        if (!currentUrl) {
            continue;
        }


        if (visited.has(currentUrl)) {
            continue;
        }


        console.log(
            `Crawling ${visited.size + 1}/${maxPages}:`,
            currentUrl
        );


        let page = null;


        try {

            page =
                await context.newPage();


            // ----------------------------------------
            // BLOCK HEAVY RESOURCES
            // ----------------------------------------

            await page.route(
                "**/*",
                async route => {

                    const request =
                        route.request();

                    const resourceType =
                        request.resourceType();

                    if (

                        resourceType === "image" ||
                        resourceType === "media" ||
                        resourceType === "font"

                    ) {

                        await route.abort();

                    }

                    else {

                        await route.continue();

                    }

                }
            );


            // ----------------------------------------
            // PAGE LOAD
            // ----------------------------------------

            try {

                await page.goto(
                    currentUrl,
                    {

                        waitUntil:
                            "domcontentloaded",

                        timeout:
                            15000

                    }
                );

            }

            catch (err) {

                console.log(
                    "Page load timeout:",
                    currentUrl
                );

                console.log(
                    "Trying to extract links from loaded DOM..."
                );

            }


            // ----------------------------------------
            // SMALL SETTLE TIME
            // ----------------------------------------

            try {

                await page.waitForTimeout(
                    500
                );

            }

            catch {}


            // ----------------------------------------
            // MARK AS VISITED
            // ----------------------------------------

            visited.add(
                currentUrl
            );


            // ----------------------------------------
            // EXTRACT LINKS EVEN IF PAGE TIMED OUT
            // ----------------------------------------

            let links = [];


            try {

                links =
                    await page.$$eval(
                        "a[href]",
                        anchors =>
                            anchors.map(
                                a => a.href
                            )
                    );

            }

            catch (err) {

                console.log(
                    "Link extraction failed:",
                    currentUrl
                );

            }


            // ----------------------------------------
            // CLOSE PAGE
            // ----------------------------------------

            try {

                await page.close();

            }

            catch {}


            // ----------------------------------------
            // PROCESS LINKS
            // ----------------------------------------

            for (const href of links) {

                if (!href) {
                    continue;
                }


                // Ignore non-web links
                if (

                    href.startsWith(
                        "mailto:"
                    ) ||

                    href.startsWith(
                        "tel:"
                    ) ||

                    href.startsWith(
                        "javascript:"
                    ) ||

                    href.startsWith(
                        "#"
                    )

                ) {

                    continue;

                }


                const normalized =
                    normalizeUrl(href);


                if (!normalized) {
                    continue;
                }


                let url;


                try {

                    url =
                        new URL(normalized);

                }

                catch {

                    continue;

                }


                // Only same website
                if (
                    url.hostname !== baseDomain
                ) {

                    continue;

                }


                // Skip unwanted pages/files
                if (
                    shouldSkip(url)
                ) {

                    continue;

                }


                if (

                    !visited.has(
                        normalized
                    ) &&

                    !queued.has(
                        normalized
                    )

                ) {

                    queue.push(
                        normalized
                    );

                    queued.add(
                        normalized
                    );

                }


                // Stop queue growth
                if (
                    visited.size +
                    queue.length >=
                    maxPages
                ) {

                    break;

                }

            }

        }

        catch (err) {

            console.log(
                "Crawler error:",
                currentUrl
            );

            console.log(
                err.message
            );


            // IMPORTANT:
            // Count the URL even if the page fails.
            // This prevents the crawler from repeatedly
            // attempting the same page.

            visited.add(
                currentUrl
            );

        }

        finally {

            if (page) {

                try {

                    await page.close();

                }

                catch {}

            }

        }

    }


    try {
        await browser.close();
    }
    catch (error) {
        console.log(
            "Crawler browser cleanup warning:",
            error.message
        );
    }


    console.log(
        `Crawler finished. Pages discovered: ${visited.size}`
    );


    return [
        ...visited
    ];

}


module.exports = crawlWebsite;
