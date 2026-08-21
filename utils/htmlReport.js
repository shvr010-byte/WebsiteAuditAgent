const fs = require("fs");
const path = require("path");
const { marked } = require("marked");

function createHtmlReport(markdown, audit) {

    const htmlContent = marked(markdown);

    let template = fs.readFileSync(
        path.join(__dirname, "../templates/report.html"),
        "utf8"
    );

    template = template.replaceAll("{{WEBSITE}}", audit.metadata.website);
    template = template.replaceAll("{{DATE}}", new Date().toLocaleDateString());
    template = template.replaceAll(
    "{{TOTAL_PAGES}}",
    String(audit.pages.length)
);

    let totalPerformance = 0;
let totalAccessibility = 0;
let totalSEO = 0;
let totalBestPractices = 0;

for (const page of audit.pages) {

    totalPerformance += page.lighthouse.performance;
    totalAccessibility += page.lighthouse.accessibility;
    totalSEO += page.lighthouse.seo;
    totalBestPractices += page.lighthouse.bestPractices;

}

const avgPerformance = Math.round(totalPerformance / audit.pages.length);

const avgAccessibility = Math.round(totalAccessibility / audit.pages.length);

const avgSEO = Math.round(totalSEO / audit.pages.length);

const avgBestPractices = Math.round(totalBestPractices / audit.pages.length);

const overallScore = Math.round(

    (

        avgPerformance +

        avgAccessibility +

        avgSEO +

        avgBestPractices

    ) / 4

);
   template = template.replaceAll("{{OVERALL_SCORE}}", overallScore);

template = template.replaceAll("{{PERFORMANCE}}", avgPerformance);

template = template.replaceAll("{{ACCESSIBILITY}}", avgAccessibility);

template = template.replaceAll("{{SEO}}", avgSEO);

template = template.replaceAll("{{BEST_PRACTICES}}", avgBestPractices);

    // UI/UX HTML
   let uiuxHtml = "";

for (const page of audit.pages) {

    if (!page.uiux || !page.uiux.issues) continue;

    uiuxHtml += `<h2>${page.url}</h2>`;

    page.uiux.issues.forEach(issue => {

        uiuxHtml += `

        <div class="issue">

            <h3>${issue.id}</h3>

            <p><strong>Section:</strong> ${issue.section}</p>

            <p><strong>Severity:</strong> ${issue.severity}</p>

            <p><strong>Issue:</strong> ${issue.issue}</p>

            <p><strong>Recommendation:</strong> ${issue.recommendation}</p>

${
issue.annotatedScreenshot
?
`<img
    src="../${issue.annotatedScreenshot}"
    style="
        width:100%;
        margin-top:15px;
        border-radius:10px;
        border:1px solid #ddd;
    "
/>`
:
""
}

        </div>

        `;

    });

}
let pageTable = "";

for (const page of audit.pages) {

    const issueCount =
        (page.accessibility?.violations?.length || 0) +
        (page.links?.brokenLinks?.length || 0) +
        (page.uiux?.issues?.length || 0);

    pageTable += `

<tr>

    <td>${page.url}</td>

    <td>${page.lighthouse.performance}</td>

    <td>${page.lighthouse.accessibility}</td>

    <td>${page.lighthouse.seo}</td>

    <td>${issueCount}</td>

</tr>

`;

}

template = template.replace("{{PAGE_TABLE}}", pageTable);
    template = template.replace("{{UIUX}}", uiuxHtml);

    template = template.replace("{{CONTENT}}", htmlContent);
let critical = 0;
let high = 0;
let medium = 0;
let low = 0;

for (const page of audit.pages) {

    if (!page.uiux || !page.uiux.issues) continue;

    for (const issue of page.uiux.issues) {

        switch ((issue.severity || "").toLowerCase()) {

            case "critical":
                critical++;
                break;

            case "high":
                high++;
                break;

            case "medium":
                medium++;
                break;

            case "low":
                low++;
                break;
        }

    }

}

const totalIssues = critical + high + medium + low;

template = template.replaceAll("{{CRITICAL}}", critical);
template = template.replaceAll("{{HIGH}}", high);
template = template.replaceAll("{{MEDIUM}}", medium);
template = template.replaceAll("{{LOW}}", low);
template = template.replaceAll("{{TOTAL_ISSUES}}", totalIssues);
    return template;

}

module.exports = createHtmlReport;