const createIssueScreenshot =
    require("./services/issueScreenshot");

async function main() {

    const result =
        await createIssueScreenshot(

            "https://www.searchonic.com/",

            {
                tag: "a",
                text: "Contact Us",
                selectorHint: ""
            },

            "UI-TEST",

            "./screenshots/UI-TEST.jpg"

        );

    console.log(
        "Result:",
        result
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