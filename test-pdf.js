const fs = require("fs");
const generatePDF = require("./services/pdfGenerator");

async function main() {

    const htmlPath =
        ".\\reports\\techclovity_searchonic_online_\\2026-08-10T11-01-38\\audit.html";

    const pdfPath =
        ".\\reports\\techclovity_searchonic_online_\\2026-08-10T11-01-38\\test-audit.pdf";


    console.log("Reading existing HTML...");


    if (!fs.existsSync(htmlPath)) {

        throw new Error(
            `HTML file not found: ${htmlPath}`
        );

    }


    const html =
        fs.readFileSync(
            htmlPath,
            "utf8"
        );


    console.log(
        `HTML size: ${(html.length / 1024 / 1024).toFixed(2)} MB`
    );


    await generatePDF(
        html,
        pdfPath
    );


    console.log(
        "TEST PDF CREATED:"
    );

    console.log(
        pdfPath
    );

}


main().catch(
    error => {

        console.error(
            "TEST ERROR:",
            error.message
        );

        process.exit(1);

    }
);