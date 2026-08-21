const crawlWebsite = require("./services/crawler");

async function run() {

    const pages = await crawlWebsite(
        "https://searchonic.online/evoque/index.html",
        20
    );

    console.log(pages);

    console.log("Total Pages:", pages.length);

}

run();