const puppeteer = require("puppeteer");

async function generatePDF(html, pdfPath) {

    let browser = null;

    try {

        console.log("Starting PDF generation...");

        browser = await puppeteer.launch({

            headless: true,

            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-extensions",
                "--disable-background-networking",
                "--allow-file-access-from-files"
            ]

        });


        const page =
            await browser.newPage();


        page.setDefaultTimeout(
            120000
        );

        page.setDefaultNavigationTimeout(
            120000
        );


        await page.setViewport({

            width: 1280,
            height: 720

        });


        // ------------------------------------------------
        // Allow local screenshot files
        // ------------------------------------------------

        await page.setBypassCSP(
            true
        );


        console.log(
            "Loading report into PDF browser..."
        );


        await page.setContent(

            html,

            {
                waitUntil:
                    "domcontentloaded",

                timeout:
                    120000
            }

        );


        // ------------------------------------------------
        // Wait for screenshots
        // ------------------------------------------------

        await page.evaluate(

            async () => {

                const images =
                    Array.from(
                        document.images
                    );


                await Promise.all(

                    images.map(
                        image => {

                            if (
                                image.complete
                            ) {

                                return Promise.resolve();

                            }


                            return new Promise(
                                resolve => {

                                    image.onload =
                                        resolve;

                                    image.onerror =
                                        resolve;

                                }
                            );

                        }
                    )

                );

            }

        );


        // ------------------------------------------------
        // Check images
        // ------------------------------------------------

        const imageInfo =
            await page.evaluate(
                () => {

                    const images =
                        Array.from(
                            document.images
                        );


                    return {

                        total:
                            images.length,

                        loaded:
                            images.filter(
                                image =>
                                    image.complete &&
                                    image.naturalWidth > 0
                            ).length

                    };

                }
            );


        console.log(
            `Images in report: ${imageInfo.total}`
        );

        console.log(
            `Images loaded: ${imageInfo.loaded}`
        );


        // ------------------------------------------------
        // Allow layout to finish
        // ------------------------------------------------

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    2000
                )
        );


        console.log(
            "Report loaded. Creating PDF..."
        );


        // ------------------------------------------------
        // Generate PDF
        // ------------------------------------------------

        await page.pdf({

            path:
                pdfPath,

            format:
                "A4",

            printBackground:
                true,

            preferCSSPageSize:
                true,

            timeout:
                120000,

            margin: {

                top:
                    "15mm",

                right:
                    "12mm",

                bottom:
                    "15mm",

                left:
                    "12mm"

            }

        });


        console.log(
            `PDF created: ${pdfPath}`
        );

    }

    catch (error) {

        console.error(
            "PDF generation error:",
            error.message
        );

        throw error;

    }

    finally {

        if (browser) {

            try {

                await browser.close();

            }

            catch (closeError) {

                console.log(
                    "Browser close warning:",
                    closeError.message
                );

            }

        }

    }

}


module.exports =
    generatePDF;