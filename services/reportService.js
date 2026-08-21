const fs = require("fs");
const path = require("path");

const createHtmlReport =
    require("./htmlReport");

const generatePDF =
    require("./pdfGenerator");

const generateManagementIssues =
    require("./managementGemini");

const createManagementReport =
    require("./managementReport");


function safeFolderName(url) {

    return url
        .replace(/^https?:\/\//, "")
        .replace(/[<>:"/\\|?*]/g, "_")
        .replace(/\.+/g, "_");

}


async function generateAuditReport(audit) {

    // ========================================================
    // DETAILED REPORT MARKDOWN
    // ========================================================

    const markdown = `

# AI Website Audit Report

Website: ${audit.metadata.website}

Pages Audited: ${audit.metadata.totalPages}

Generated: ${audit.metadata.completedAt}

`;


    // ========================================================
    // CREATE DETAILED HTML
    // ========================================================

    const html =
        createHtmlReport(
            markdown,
            audit
        );


    // ========================================================
    // REPORT DIRECTORY
    // ========================================================

    const websiteFolder =
        safeFolderName(
            audit.metadata.website
        );


    const timestamp =
        new Date()
            .toISOString()
            .replace(/:/g, "-")
            .replace(/\..+/, "");


    const reportDir =
        path.join(
            process.cwd(),
            "reports",
            websiteFolder,
            timestamp
        );


    fs.mkdirSync(
        reportDir,
        {
            recursive: true
        }
    );


    // ========================================================
    // FILE PATHS
    // ========================================================

    const htmlPath =
        path.join(
            reportDir,
            "audit.html"
        );


    const pdfPath =
        path.join(
            reportDir,
            "audit.pdf"
        );


    const jsonPath =
        path.join(
            reportDir,
            "audit.json"
        );


  const managementHtmlPath =
    path.join(
        reportDir,
        "management-report.html"
    );

const managementPdfPath =
    path.join(
        reportDir,
        "management-report.pdf"
    );


    // ========================================================
    // SAVE DETAILED HTML
    // ========================================================

    fs.writeFileSync(
        htmlPath,
        html,
        "utf8"
    );


    console.log(
        `Detailed HTML created: ${htmlPath}`
    );


    // ========================================================
    // SAVE AUDIT JSON
    // ========================================================

    fs.writeFileSync(
        jsonPath,
        JSON.stringify(
            audit,
            null,
            2
        ),
        "utf8"
    );


    console.log(
        `Audit JSON created: ${jsonPath}`
    );


    // ========================================================
    // COPY SCREENSHOTS
    // ========================================================

    const screenshotsSource =
        path.join(
            process.cwd(),
            "screenshots"
        );


    const screenshotsDestination =
        path.join(
            reportDir,
            "screenshots"
        );


    if (
        fs.existsSync(
            screenshotsSource
        )
    ) {

        fs.cpSync(
            screenshotsSource,
            screenshotsDestination,
            {
                recursive: true
            }
        );


        console.log(
            "Screenshots copied."
        );

    }


    // ========================================================
    // DETAILED PDF
    // ========================================================

    console.log(
        "Starting detailed PDF generation..."
    );


    await generatePDF(
        html,
        pdfPath
    );


    console.log(
        `Detailed PDF created: ${pdfPath}`
    );


    // ========================================================
    // GEMINI MANAGEMENT ANALYSIS
    // ========================================================

    console.log(
        "Starting Gemini management analysis..."
    );


    const managementIssues =
        await generateManagementIssues(
            audit
        );


    console.log(
        `Gemini selected ${managementIssues.length} management issues.`
    );


    // ========================================================
    // MANAGEMENT HTML
    // ========================================================

    const managementHtml =
        createManagementReport(
            audit,
            managementIssues
        );


    fs.writeFileSync(
        managementHtmlPath,
        managementHtml,
        "utf8"
    );


    console.log(
        `Management HTML created: ${managementHtmlPath}`
    );


    // ========================================================
    // MANAGEMENT PDF
    // ========================================================

    console.log(
        "Starting management PDF generation..."
    );


    await generatePDF(
        managementHtml,
        managementPdfPath
    );


    console.log(
        `Management PDF created: ${managementPdfPath}`
    );


    // ========================================================
    // RETURN
    // ========================================================

    return {

        htmlPath,

        pdfPath,

        jsonPath,

        managementHtmlPath,

        managementPdfPath

    };

}


module.exports =
    generateAuditReport;