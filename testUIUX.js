const analyzeUIUX = require("./services/uiux");

async function run() {

    const result = await analyzeUIUX(
        "./screenshots/desktop.png"
    );

    console.log(result);

}

run();