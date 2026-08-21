const fs = require("fs");
const createHtmlReport = require("./utils/htmlReport");

const markdown = fs.readFileSync("sample.md", "utf8");

const audit = {

    website: "https://example.com",

    pagesScanned: 1,

    overallScore: 94,

    metrics: {

        performance: 100,

        accessibility: 96,

        seo: 80,

        bestPractices: 96

    }

};

const html = createHtmlReport(markdown, audit);
console.log(html.substring(0, 500));
fs.writeFileSync("reports/report.html", html);

console.log("HTML Report Created");