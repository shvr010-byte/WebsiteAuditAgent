const fs = require("fs");
const path = require("path");

const generatePDF =
    require("./services/pdfGenerator");


// Existing 43-page HTML report
const htmlPath =
    path.join(
        process.cwd(),
        "reports",
        "techclovity_searchonic_online_",
        "2026-08-10T11-01-38",
        "audit.html"
    );


// New PDF location
const pdfPath =
    path.join(
        process.cwd(),
        "reports",
        "techclovity_searchonic_online_",
        "2026-08-10T11-01-38",
        "audit.pdf"
    );


async function main() {

    console.log(
        "Checking existing HTML..."
    );


    if (
        !fs.existsSync(
            htmlPath
        )
    ) {

        throw new Error(
            `HTML file not found:\n${htmlPath}`
        );

    }


    console.log(
        "Reading existing HTML..."
    );


    const html =
        fs.readFileSync(
            htmlPath,
            "utf8"
        );


    console.log(
        `HTML size: ${(html.length / 1024 / 1024).toFixed(2)} MB`
    );


    console.log(
        "Generating PDF from existing HTML..."
    );


    await generatePDF(
        html,
        pdfPath
    );


    console.log("");
    console.log(
        "========================================"
    );
    console.log(
        "PDF GENERATION COMPLETE"
    );
    console.log(
        "========================================"
    );
    console.log(
        pdfPath
    );

}


main()
    .catch(error => {

        console.error("");
        console.error(
            "PDF generation failed:"
        );

        console.error(
            error
        );

        process.exit(1);

    });