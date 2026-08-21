const annotateImage = require("./services/imageAnnotator");

async function run() {

    await annotateImage(

        "./screenshots/desktop.png",

        {
            x: 200,
            y: 180,
            width: 250,
            height: 70
        },

        "UI-001",

        "./screenshots/desktop-annotated.png"

    );

    console.log("Annotated Image Created");

}

run();