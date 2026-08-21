const { generateTechnicalReport } = require("./services/gemini");

async function run() {

    const audit = {

        website: "https://example.com",

        overallScore: 94,

        metrics: {

            performance: 100,

            accessibility: 96,

            seo: 88,

            bestPractices: 96

        },

        issues: [

            {

                id: "ACC-001",

                page: "/about",

                severity: "Critical",

                title: "Image missing alt text"

            }

        ]

    };

    const report = await generateTechnicalReport(audit);

    console.log(report);

}

run();