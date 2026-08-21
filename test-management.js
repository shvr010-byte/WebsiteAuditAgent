require("dotenv").config();

const fs = require("fs");

const generateManagementIssues =
    require("./services/managementGemini");


async function main() {

    const auditPath =
        process.argv[2];


    if (!auditPath) {

        throw new Error(
            "Please provide the audit.json path."
        );

    }


    console.log(
        "Reading audit:",
        auditPath
    );


    const audit =
        JSON.parse(
            fs.readFileSync(
                auditPath,
                "utf8"
            )
        );


    console.log(
        `Pages in audit: ${audit.pages.length}`
    );


    const issues =
        await generateManagementIssues(
            audit
        );


    console.log("");
    console.log(
        "======================================"
    );
    console.log(
        "GEMINI MANAGEMENT RESULTS"
    );
    console.log(
        "======================================"
    );


    console.log(
        JSON.stringify(
            issues,
            null,
            2
        )
    );


    fs.writeFileSync(
        "management-test-result.json",
        JSON.stringify(
            issues,
            null,
            2
        ),
        "utf8"
    );


    console.log("");
    console.log(
        "Saved: management-test-result.json"
    );

}


main()
    .catch(error => {

        console.error(
            "TEST ERROR:",
            error
        );

        process.exit(1);

    });
    