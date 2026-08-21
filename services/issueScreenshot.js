const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const annotateImage =
    require("./imageAnnotator");


async function createIssueScreenshot(
    pageUrl,
    target,
    issueId,
    outputPath
) {

    const browser =
        await chromium.launch({
            headless: true
        });

    const page =
        await browser.newPage({
            viewport: {
                width: 1280,
                height: 720
            }
        });

    try {

await page.goto(
    pageUrl,
    {
        waitUntil: "commit",
        timeout: 30000
    }
);

try {
    await page.waitForLoadState(
        "domcontentloaded",
        {
            timeout: 15000
        }
    );
}
catch {
    console.log(
        `DOM load timeout, continuing: ${pageUrl}`
    );
}

await page.waitForTimeout(2000);        await page.waitForTimeout(1000);

        let locator = null;


        // CSS selector
        if (target?.selectorHint) {

            try {

                const candidate =
                    page.locator(
                        target.selectorHint
                    ).first();

                if (
                    await candidate.count() > 0
                ) {

                    locator = candidate;

                }

            } catch {}

        }


        // Visible text
        if (
            !locator &&
            target?.text
        ) {

            try {

                const candidate =
                    page.getByText(
                        target.text,
                        {
                            exact: false
                        }
                    ).first();

                if (
                    await candidate.count() > 0
                ) {

                    locator = candidate;

                }

            } catch {}

        }


        // Tag
        if (
            !locator &&
            target?.tag
        ) {

            try {

                const candidate =
                    page.locator(
                        target.tag
                    ).first();

                if (
                    await candidate.count() > 0
                ) {

                    locator = candidate;

                }

            } catch {}

        }


        if (!locator) {

            console.log(
                `Could not locate issue element: ${issueId}`
            );

            return null;

        }


        // Scroll element into view
        await locator.scrollIntoViewIfNeeded();

        await page.waitForTimeout(500);


        // Make sure it is visible
        if (
            !(await locator.isVisible())
        ) {

            console.log(
                `Issue element is not visible: ${issueId}`
            );

            return null;

        }


        console.log(
            `Capturing issue element: ${issueId}`
        );


        // -----------------------------------------
        // CAPTURE THE ACTUAL ELEMENT
        // -----------------------------------------

        const elementPath =
            path.join(
                path.dirname(outputPath),
                `.${issueId}-element.png`
            );


        await locator.screenshot({

            path:
                elementPath,

            animations:
                "disabled"

        });


        // -----------------------------------------
        // GET IMAGE SIZE
        // -----------------------------------------

        const metadata =
            await require("sharp")(
                elementPath
            ).metadata();


        const width =
            metadata.width || 1;

        const height =
            metadata.height || 1;


        // -----------------------------------------
        // RED BOX AROUND ENTIRE CAPTURE
        // -----------------------------------------

        const box = {

            x: 0,

            y: 0,

            width,

            height

        };


        const annotatedPath =
            await annotateImage(

                elementPath,

                box,

                issueId,

                outputPath

            );


        try {

            fs.unlinkSync(
                elementPath
            );

        } catch {}


        return annotatedPath;

    }

    catch (error) {

        console.log(
            `Issue screenshot error: ${issueId}`
        );

        console.log(
            error.message
        );

        return null;

    }

    finally {

        await browser.close();

    }

}


module.exports =
    createIssueScreenshot;