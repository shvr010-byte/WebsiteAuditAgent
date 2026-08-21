const { chromium, devices } = require("playwright");
const fs = require("fs");
const path = require("path");

let browser = null;


// ------------------------------------------------
// BROWSER
// ------------------------------------------------

async function getBrowser() {

    if (
        browser &&
        !browser.isConnected()
    ) {
        browser = null;
    }

    if (!browser) {

        browser = await chromium.launch({

            headless: true,

            args: [
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--no-sandbox"
            ]

        });

        browser.on(
            "disconnected",
            () => {
                browser = null;
            }
        );

    }

    return browser;
}


// ------------------------------------------------
// SAFE FILE NAME
// ------------------------------------------------

function safeFileName(url) {

    return url
        .replace(/^https?:\/\//, "")
        .replace(/[/\\?%*:|"<>]/g, "_")
        .replace(/_+/g, "_");

}


// ------------------------------------------------
// CAPTURE WEBSITE
// ------------------------------------------------

async function captureWebsite(url) {

    const browserInstance = await getBrowser();

    const screenshotsDir =
        path.join(
            process.cwd(),
            "screenshots"
        );

    if (!fs.existsSync(screenshotsDir)) {

        fs.mkdirSync(
            screenshotsDir,
            {
                recursive: true
            }
        );

    }


    const fileName =
        safeFileName(url);


    const desktopPath =
        path.join(
            screenshotsDir,
            `${fileName}-desktop.png`
        );


    const mobilePath =
        path.join(
            screenshotsDir,
            `${fileName}-mobile.png`
        );


    const consoleErrors = [];
    const networkErrors = [];


    // ------------------------------------------------
    // DESKTOP
    // ------------------------------------------------

    let page = null;

    let title = "";
    let finalUrl = url;
    let loadTime = 0;

    let desktopError = null;


    try {

        page =
            await browserInstance.newPage({

                viewport: {
                    width: 1280,
                    height: 720
                }

            });


        // Console errors
        page.on(
            "console",
            msg => {

                if (
                    msg.type() === "error"
                ) {

                    consoleErrors.push(
                        msg.text()
                    );

                }

            }
        );


        // Network errors
        page.on(
            "response",
            response => {

                if (
                    response.status() >= 400
                ) {

                    networkErrors.push({

                        url:
                            response.url(),

                        status:
                            response.status()

                    });

                }

            }
        );


        const start =
            Date.now();


        // --------------------------------------------
        // IMPORTANT:
        // Do NOT use networkidle here.
        // --------------------------------------------

        try {

            await page.goto(
                url,
                {
                    waitUntil:
                        "domcontentloaded",

                    timeout:
                        15000
                }
            );

        }

        catch (error) {

            desktopError =
                error.message;

            console.log(
                `Desktop load timeout/error: ${url}`
            );

            console.log(
                error.message
            );

            // Do not immediately kill the page.
            // The page may still contain usable content.
        }


        loadTime =
            Date.now() - start;


        // Give JavaScript/layout a short time
        // to settle without waiting for networkidle.

        try {

            await page.waitForTimeout(
                1000
            );

        }

        catch {}


        // --------------------------------------------
        // PAGE INFORMATION
        // --------------------------------------------

        try {

            title =
                await page.title();

        }

        catch {}


        try {

            finalUrl =
                page.url();

        }

        catch {}


        // --------------------------------------------
        // DESKTOP SCREENSHOT
        // --------------------------------------------

        try {

            await page.screenshot({

                path:
                    desktopPath,

                fullPage:
                    false,

                animations:
                    "disabled"

            });

        }

        catch (error) {

            desktopError =
                desktopError ||
                `Screenshot failed: ${error.message}`;

            console.log(
                `Desktop screenshot failed: ${url}`
            );

            console.log(
                error.message
            );

        }


    }

    catch (error) {

        desktopError =
            error.message;

        console.log(
            `Desktop page error: ${url}`
        );

        console.log(
            error.message
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


    // ------------------------------------------------
    // MOBILE
    // ------------------------------------------------

    let mobileError = null;

    let mobileContext = null;
    let mobilePage = null;


    try {

        mobileContext =
            await browserInstance.newContext({

                ...devices["iPhone 13"]

            });


        mobilePage =
            await mobileContext.newPage();


        // --------------------------------------------
        // Mobile console errors
        // --------------------------------------------

        mobilePage.on(
            "console",
            msg => {

                if (
                    msg.type() === "error"
                ) {

                    consoleErrors.push(
                        `[Mobile] ${msg.text()}`
                    );

                }

            }
        );


        // --------------------------------------------
        // Mobile network errors
        // --------------------------------------------

        mobilePage.on(
            "response",
            response => {

                if (
                    response.status() >= 400
                ) {

                    networkErrors.push({

                        url:
                            response.url(),

                        status:
                            response.status(),

                        device:
                            "mobile"

                    });

                }

            }
        );


        // --------------------------------------------
        // IMPORTANT:
        // Do NOT use networkidle on mobile.
        // --------------------------------------------

        try {

            await mobilePage.goto(
                url,
                {

                    waitUntil:
                        "domcontentloaded",

                    timeout:
                        15000

                }
            );

        }

        catch (error) {

            mobileError =
                error.message;

            console.log(
                `Mobile load timeout/error: ${url}`
            );

            console.log(
                error.message
            );

        }


        // Short settling period

        try {

            await mobilePage.waitForTimeout(
                1000
            );

        }

        catch {}


        // --------------------------------------------
        // MOBILE SCREENSHOT
        // --------------------------------------------

        try {

            await mobilePage.screenshot({

                path:
                    mobilePath,

                fullPage:
                    false,

                animations:
                    "disabled"

            });

        }

        catch (error) {

            mobileError =
                mobileError ||
                `Screenshot failed: ${error.message}`;

            console.log(
                `Mobile screenshot failed: ${url}`
            );

            console.log(
                error.message
            );

        }

    }

    catch (error) {

        mobileError =
            error.message;

        console.log(
            `Mobile page error: ${url}`
        );

        console.log(
            error.message
        );

    }

    finally {

        if (mobileContext) {

            try {

                await mobileContext.close();

            }

            catch {}

        }

    }


    // ------------------------------------------------
    // RESULT
    // ------------------------------------------------

    return {

        title,

        finalUrl,

        loadTime,

        desktopScreenshot:
            fs.existsSync(desktopPath)
                ? desktopPath
                : null,

        mobileScreenshot:
            fs.existsSync(mobilePath)
                ? mobilePath
                : null,

        consoleErrors,

        networkErrors,

        desktopError,

        mobileError

    };

}


// ------------------------------------------------
// CLOSE BROWSER
// ------------------------------------------------

async function closeBrowser() {

    if (browser) {

        try {

            await browser.close();

        }

        catch {}

        browser = null;

    }

}


// ------------------------------------------------
// EXPORT
// ------------------------------------------------

module.exports = {

    captureWebsite,

    closeBrowser

};
