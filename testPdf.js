const fs = require("fs");

const generatePDF = require("./utils/pdfGenerator");

async function run() {

    const html = fs.readFileSync(
        "reports/report.html",
        "utf8"
    );

    await generatePDF(
        html,
        "reports/report.pdf"
    );

    console.log("PDF Created");

}

run();