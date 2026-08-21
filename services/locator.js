const { chromium } = require("playwright");

async function locateElement(pageUrl, target) {

    const browser = await chromium.launch({
        headless: true
    });

    const page = await browser.newPage();

    try {

        await page.goto(pageUrl, {
            waitUntil: "domcontentloaded",
            timeout: 15000
        });

        // Small wait for the page layout to settle
        await page.waitForTimeout(500);

        let locator = null;

        // 1. Try CSS selector
        if (target?.selectorHint) {

            try {

                const candidate =
                    page.locator(target.selectorHint).first();

                if (await candidate.count() > 0) {
                    locator = candidate;
                }

            } catch (err) {
                console.log(
                    "CSS locator failed:",
                    err.message
                );
            }
        }

        // 2. Try visible text
        if (!locator && target?.text) {

            try {

                const candidate =
                    page.getByText(target.text, {
                        exact: false
                    }).first();

                if (await candidate.count() > 0) {
                    locator = candidate;
                }

            } catch (err) {
                console.log(
                    "Text locator failed:",
                    err.message
                );
            }
        }

        // 3. Try tag
        if (!locator && target?.tag) {

            try {

                const candidate =
                    page.locator(target.tag).first();

                if (await candidate.count() > 0) {
                    locator = candidate;
                }

            } catch (err) {
                console.log(
                    "Tag locator failed:",
                    err.message
                );
            }
        }

        if (!locator) {
            return null;
        }

        // Make sure the element is visible
        try {
            await locator.scrollIntoViewIfNeeded();
        } catch {}

        const box = await locator.boundingBox();

        return box;

    } catch (err) {

        console.log(
            "Locator Error:",
            err.message
        );

        return null;

    } finally {

        await browser.close();

    }
}

module.exports = locateElement;