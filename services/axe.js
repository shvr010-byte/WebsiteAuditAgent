const { chromium } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default;

async function runAccessibilityAudit(url) {

    let browser = null;

    try {

        browser = await chromium.launch({
            headless: true,
            args: [
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--no-sandbox"
            ]
        });

        const context = await browser.newContext();

        const page = await context.newPage();

        await page.goto(url, {
            waitUntil: "networkidle",
            timeout: 60000
        });

        const title = await page.title();

        const results = await new AxeBuilder({
            page
        }).analyze();

        await page.close();
        await context.close();

        return {

            url,

            title,

            violations: results.violations.length,

            passes: results.passes.length,

            incomplete: results.incomplete.length,

            issues: results.violations.map(v => ({

                impact: v.impact,

                rule: v.id,

                description: v.description,

                help: v.help,

                helpUrl: v.helpUrl,

                affectedElements: v.nodes.length,

                nodes: v.nodes.slice(0, 5).map(node => ({

                    html: node.html,

                    target: node.target

                }))

            }))

        };

    }

    catch (err) {

        console.error("Accessibility Error:", err.message);

        return {

            url,

            violations: 0,

            passes: 0,

            incomplete: 0,

            issues: [],

            error: err.message

        };

    }

    finally {

        if (browser) {

            try {

                await browser.close();

            } catch {}

        }

    }

}

module.exports = runAccessibilityAudit;