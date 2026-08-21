const fs = require("fs");
const path = require("path");

const createHtmlReport =
    require("./services/htmlReport");

const inputPath =
    path.join(
        process.cwd(),
        "audit-backups",
        "www.searchonic.com_",
        "audit-results.json"
    );

const outputDir =
    path.join(
        process.cwd(),
        "reports",
        "www.searchonic.com_",
        "regenerated-50-page"
    );

async function main() {

    console.log("Reading existing audit backup...");

    if (!fs.existsSync(inputPath)) {
        throw new Error(
            `Audit backup not found:\n${inputPath}`
        );
    }

    const audit =
        JSON.parse(
            fs.readFileSync(
                inputPath,
                "utf8"
            )
        );

    console.log(
        `Pages in backup: ${audit.pages?.length || 0}`
    );

    fs.mkdirSync(
        outputDir,
        {
            recursive: true
        }
    );

    console.log(
        "Creating HTML report..."
    );

    const html =
        createHtmlReport(
            "",
            audit
        );

    const outputPath =
        path.join(
            outputDir,
            "audit.html"
        );

    fs.writeFileSync(
        outputPath,
        html,
        "utf8"
    );

    console.log("");
    console.log(
        "========================================"
    );
    console.log(
        "HTML REPORT CREATED"
    );
    console.log(
        "========================================"
    );
    console.log(outputPath);
}

main()
    .catch(error => {

        console.error(
            "REPORT GENERATION ERROR:"
        );

        console.error(
            error
        );

        process.exit(1);
    });