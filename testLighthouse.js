const getLighthouseResults = require("./services/lighthouse");

async function run() {
    try {
        const result = await getLighthouseResults("https://example.com");
        console.log(result);
    } catch (err) {
        console.error(err);
    }
}

run();