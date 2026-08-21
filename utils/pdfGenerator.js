const puppeteer = require("puppeteer");

async function generatePDF(html, outputPath) {

    const browser = await puppeteer.launch({
        headless: true
    });

    const page = await browser.newPage();

    await page.setContent(html, {
        waitUntil: "networkidle0"
    });

    await page.pdf({

        path: outputPath,

        format: "A4",

        printBackground: true,

        margin: {
            top: "20px",
            bottom: "20px",
            left: "20px",
            right: "20px"
        }

    });

    await browser.close();

}

module.exports = generatePDF;