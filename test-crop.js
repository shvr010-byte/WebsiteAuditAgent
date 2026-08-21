const path = require("path");

const locateElement =
    require("./services/locator");

const annotateImage =
    require("./services/imageAnnotator");


async function main() {

    const pageUrl =
        "https://techclovity.com/";

    const imagePath =
        path.join(
            process.cwd(),
            "screenshots",
            "techclovity.com_-desktop.png"
        );

    const outputPath =
        path.join(
            process.cwd(),
            "screenshots",
            "test-issue-crop.jpg"
        );


    console.log("Finding test element...");


    const box =
        await locateElement(
            pageUrl,
            {
                text: "Get Started",
                tag: "a",
                selectorHint: ""
            }
        );


    if (!box) {

        console.log(
            "Test element could not be found."
        );

        return;

    }


    console.log(
        "Element found:",
        box
    );


    const result =
        await annotateImage(
            imagePath,
            box,
            "TEST",
            outputPath
        );


    console.log(
        "Cropped screenshot created:"
    );

    console.log(result);

}


main().catch(
    error => {

        console.error(
            "TEST ERROR:",
            error.message
        );

    }
);