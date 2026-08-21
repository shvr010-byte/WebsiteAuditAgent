const generateReport = require("./services/gemini");

async function run() {

    const result = await generateReport(
        "Write a short website audit summary."
    );

    console.log(result);

}

run();