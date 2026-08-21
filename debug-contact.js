const { chromium } = require("playwright");

async function main() {

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
            "https://www.searchonic.com/",
            {
                waitUntil: "domcontentloaded",
                timeout: 30000
            }
        );

        await page.waitForTimeout(1500);

        const elements =
            await page.getByText(
                "Contact Us",
                {
                    exact: false
                }
            ).all();

        console.log(
            "Found:",
            elements.length
        );

        for (
            let i = 0;
            i < elements.length;
            i++
        ) {

            const element =
                elements[i];

            console.log(
                `\nElement ${i + 1}`
            );

            console.log(
                "visible:",
                await element.isVisible()
            );

            console.log(
                "text:",
                await element.innerText().catch(() => "")
            );

            console.log(
                "box:",
                await element.boundingBox()
            );

            console.log(
                "tag:",
                await element.evaluate(
                    el => el.tagName
                )
            );

            console.log(
                "html:",
                (
                    await element.evaluate(
                        el => el.outerHTML
                    )
                ).slice(0, 500)
            );

        }

    }

    finally {

        await browser.close();

    }

}

main().catch(console.error);