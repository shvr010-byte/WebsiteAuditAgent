const locateElement = require("./services/locator");

async function run() {

    const box = await locateElement(

        "https://example.com",

        {
            tag: "a",
            text: "More information...",
            selectorHint: "a"
        }

    );

    console.log(box);

}

run();