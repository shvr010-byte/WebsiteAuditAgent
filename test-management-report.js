const fs = require("fs");
const path = require("path");

const createManagementReport =
    require("./services/managementReport");

const generatePDF =
    require("./services/pdfGenerator");


const reportDir = path.join(
    process.cwd(),
    "reports",
    "techclovity_searchonic_online_",
    "2026-08-10T11-01-38"
);


const jsonPath =
    path.join(
        reportDir,
        "audit.json"
    );


const htmlPath =
    path.join(
        reportDir,
        "management-summary.html"
    );


const pdfPath =
    path.join(
        reportDir,
        "management-summary.pdf"
    );


async function main() {

    console.log(
        "Reading existing audit.json..."
    );


    if (
        !fs.existsSync(jsonPath)
    ) {

        throw new Error(
            `audit.json not found:\n${jsonPath}`
        );

    }


    const audit =
        JSON.parse(
            fs.readFileSync(
                jsonPath,
                "utf8"
            )
        );


    console.log(
        `Pages in audit: ${audit.pages?.length || 0}`
    );


    console.log(
        "Creating management HTML..."
    );


    const html =
        createManagementReport(
            audit
        );


    fs.writeFileSync(
        htmlPath,
        html,
        "utf8"
    );


    console.log(
        "Management HTML created:"
    );

    console.log(
        htmlPath
    );


    console.log(
        "Creating management PDF..."
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
        "MANAGEMENT REPORT COMPLETE"
    );
    console.log(
        "========================================"
    );

    console.log(
        "HTML:",
        htmlPath
    );

    console.log(
        "PDF:",
        pdfPath
    );

}


main()
    .catch(error => {

        console.error("");
        console.error(
            "Management report failed:"
        );

        console.error(
            error
        );

        process.exit(1);

    });