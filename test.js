const getLighthouseResults = require("./services/lighthouse");

async function run() {

const lighthouse = await getLighthouseResults(url);
    console.log(result);

}

run();  