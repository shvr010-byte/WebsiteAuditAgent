const fs = require("fs");
const path = require("path");
const { marked } = require("marked");


// ============================================================
// LIMITS
// ============================================================

const MAX_TEXT_LENGTH = 5000;
const MAX_AFFECTED_ELEMENTS = 10;
const MAX_ISSUES_PER_CATEGORY = 30;
const MAX_UIUX_ISSUES_PER_PAGE = 30;


// ============================================================
// HELPERS
// ============================================================

function safeText(value, maxLength = MAX_TEXT_LENGTH) {

    if (value === null || value === undefined) {
        return "";
    }

    let text = String(value);

    if (text.length > maxLength) {
        text =
            text.slice(0, maxLength) +
            " ... [content truncated]";
    }

    return text;

}


function escapeHtml(value, maxLength = MAX_TEXT_LENGTH) {

    const text =
        safeText(value, maxLength);

    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function safeArray(value) {

    return Array.isArray(value)
        ? value
        : [];

}


function safeIssues(value) {

    return safeArray(value)
        .slice(
            0,
            MAX_ISSUES_PER_CATEGORY
        );

}


function safeFileUrl(filePath) {

    if (!filePath) {
        return null;
    }

    let resolvedPath =
        filePath;

    if (!path.isAbsolute(resolvedPath)) {

        resolvedPath =
            path.resolve(
                process.cwd(),
                resolvedPath
            );

    }

    if (
        !fs.existsSync(
            resolvedPath
        )
    ) {
        return null;
    }

    return (
        "file:///" +
        resolvedPath
            .replace(/\\/g, "/")
            .replace(/^\/+/, "")
    );

}


function renderAffectedElements(
    affectedElements
) {

    if (
        !Array.isArray(
            affectedElements
        ) ||
        affectedElements.length === 0
    ) {
        return "";
    }


    const elements =
        affectedElements
            .slice(
                0,
                MAX_AFFECTED_ELEMENTS
            );


    const html =
        elements
            .map(element => {

                const value =
                    element?.selector ||
                    element?.path ||
                    element?.snippet ||
                    element?.url ||
                    "Element identified by audit";

                return `
<li>
    <code>
        ${escapeHtml(value, 2000)}
    </code>
</li>
`;

            })
            .join("");


    const remaining =
        affectedElements.length -
        elements.length;


    const remainingText =
        remaining > 0
            ? `
<p>
    <small>
        ${remaining} additional affected elements were omitted
        from the report to keep the report size manageable.
    </small>
</p>
`
            : "";


    return `
<p>
    <strong>Affected Elements:</strong>
</p>

<ul>
    ${html}
</ul>

${remainingText}
`;

}


// ============================================================
// MAIN REPORT FUNCTION
// ============================================================

function createHtmlReport(
    markdown,
    audit
) {

    audit =
        audit || {};

    const pages =
        Array.isArray(audit.pages)
            ? audit.pages
            : [];


    // ========================================================
    // MARKDOWN
    // ========================================================

    let htmlContent = "";

    try {

        htmlContent =
            marked.parse(
                safeText(
                    markdown,
                    1000000
                )
            );

    }

    catch (err) {

        console.error(
            "Markdown conversion warning:",
            err.message
        );

        htmlContent = "";

    }


    // ========================================================
    // TEMPLATE
    // ========================================================

    let template =
        fs.readFileSync(

            path.join(
                __dirname,
                "../templates/report.html"
            ),

            "utf8"

        );


    // ========================================================
    // CSS
    // ========================================================

    const css =
        fs.readFileSync(

            path.join(
                __dirname,
                "../templates/style.css"
            ),

            "utf8"

        );


    template =
        template.replace(

            "</head>",

            `<style>${css}</style></head>`

        );


    // ========================================================
    // METRICS
    // ========================================================

    let totalPerformance = 0;
    let totalAccessibility = 0;
    let totalSEO = 0;
    let totalBestPractices = 0;
    let totalFunctionality = 0;
    let totalResponsive = 0;


    let lighthousePages = 0;
    let functionalityPages = 0;
    let responsivePages = 0;


    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;


    for (
        const page
        of pages
    ) {

        if (page.lighthouse) {

            totalPerformance +=
                Number(
                    page.lighthouse.performance
                ) || 0;

            totalAccessibility +=
                Number(
                    page.lighthouse.accessibility
                ) || 0;

            totalSEO +=
                Number(
                    page.lighthouse.seo
                ) || 0;

            totalBestPractices +=
                Number(
                    page.lighthouse.bestPractices
                ) || 0;

            lighthousePages++;

        }


        if (page.functionality) {

            totalFunctionality +=
                Number(
                    page.functionality.score
                ) || 0;

            functionalityPages++;

        }


        if (page.responsive) {

            totalResponsive +=
                Number(
                    page.responsive.score
                ) || 0;

            responsivePages++;

        }


        if (
            page.uiux &&
            Array.isArray(
                page.uiux.issues
            )
        ) {

            for (
                const issue
                of page.uiux.issues
            ) {

                const severity =
                    String(
                        issue?.severity || "low"
                    ).toLowerCase();


                if (
                    severity === "critical"
                ) {

                    critical++;

                }

                else if (
                    severity === "high"
                ) {

                    high++;

                }

                else if (
                    severity === "medium"
                ) {

                    medium++;

                }

                else {

                    low++;

                }

            }

        }

    }


    // ========================================================
    // SCORES
    // ========================================================

    const pageCount =
        pages.length;


    const lighthouseCount =
        lighthousePages || 1;


    const performance =
        Math.round(
            totalPerformance /
            lighthouseCount
        );


    const accessibility =
        Math.round(
            totalAccessibility /
            lighthouseCount
        );


    const seo =
        Math.round(
            totalSEO /
            lighthouseCount
        );


    const bestPractices =
        Math.round(
            totalBestPractices /
            lighthouseCount
        );


    const functionality =
        Math.round(
            totalFunctionality /
            (
                functionalityPages || 1
            )
        );


    const responsive =
        Math.round(
            totalResponsive /
            (
                responsivePages || 1
            )
        );


    const overall =
        Math.round(

            (
                performance +
                accessibility +
                seo +
                bestPractices +
                functionality +
                responsive

            ) / 6

        );


    // ========================================================
    // PAGE TABLE
    // ========================================================

    let pageTable = `

<table class="info-table">

<thead>

<tr>

<th>Page</th>

<th>Performance</th>

<th>Accessibility</th>

<th>SEO</th>

<th>Best Practices</th>

<th>Functionality</th>

<th>Responsive</th>

</tr>

</thead>

<tbody>

`;


    for (
        const page
        of pages
    ) {

        const lighthouse =
            page.lighthouse || {};


        pageTable += `

<tr>

<td style="word-break:break-word;">
    ${escapeHtml(page.url || "-")}
</td>

<td>
    ${lighthouse.performance ?? "-"}
</td>

<td>
    ${lighthouse.accessibility ?? "-"}
</td>

<td>
    ${lighthouse.seo ?? "-"}
</td>

<td>
    ${lighthouse.bestPractices ?? "-"}
</td>

<td>
    ${page.functionality?.score ?? "-"}
</td>

<td>
    ${page.responsive?.score ?? "-"}
</td>

</tr>

`;

    }


    pageTable += `

</tbody>

</table>

`;


    // ========================================================
    // PAGE DETAILS
    // ========================================================

    let pageDetails = "";


    for (
        const page
        of pages
    ) {

        const lighthouse =
            page.lighthouse || {};


        const functionalityData =
            page.functionality || {};


        const responsiveData =
            page.responsive || {};


        pageDetails += `

<div class="page-report">

<h2>
    ${escapeHtml(page.url || "Unknown Page")}
</h2>


<div class="score-grid">

<div class="score-card">
    <h3>${lighthouse.performance ?? "-"}</h3>
    <p>Performance</p>
</div>

<div class="score-card">
    <h3>${lighthouse.accessibility ?? "-"}</h3>
    <p>Accessibility</p>
</div>

<div class="score-card">
    <h3>${lighthouse.seo ?? "-"}</h3>
    <p>SEO</p>
</div>

<div class="score-card">
    <h3>${lighthouse.bestPractices ?? "-"}</h3>
    <p>Best Practices</p>
</div>

<div class="score-card">
    <h3>${functionalityData.score ?? "-"}</h3>
    <p>Functionality</p>
</div>

<div class="score-card">
    <h3>${responsiveData.score ?? "-"}</h3>
    <p>Responsive</p>
</div>

</div>

`;


        // ====================================================
        // PAGE PROBLEMS
        // ====================================================

        const pageIssues = [];


        const lighthouseCategories = [

            {
                name: "Performance",
                score:
                    lighthouse.performance,
                issues:
                    safeIssues(
                        lighthouse.issues?.performance
                    )
            },

            {
                name: "Accessibility",
                score:
                    lighthouse.accessibility,
                issues:
                    safeIssues(
                        lighthouse.issues?.accessibility
                    )
            },

            {
                name: "SEO",
                score:
                    lighthouse.seo,
                issues:
                    safeIssues(
                        lighthouse.issues?.seo
                    )
            },

            {
                name: "Best Practices",
                score:
                    lighthouse.bestPractices,
                issues:
                    safeIssues(
                        lighthouse.issues?.bestPractices
                    )
            }

        ];


        for (
            const category
            of lighthouseCategories
        ) {

            if (
                typeof category.score === "number" &&
                category.score < 80
            ) {

                pageIssues.push(
                    category
                );

            }

        }


        // ====================================================
        // FUNCTIONALITY
        // ====================================================

        if (

            typeof functionalityData.score === "number" &&

            functionalityData.score < 80

        ) {

            pageIssues.push({

                category:
                    "Functionality",

                score:
                    functionalityData.score,

                issues:
                    safeIssues(
                        functionalityData.issues
                    )

            });

        }


        // ====================================================
        // RESPONSIVE
        // ====================================================

        if (

            typeof responsiveData.score === "number" &&

            responsiveData.score < 80

        ) {

            pageIssues.push({

                category:
                    "Responsive",

                score:
                    responsiveData.score,

                issues:
                    safeIssues(
                        responsiveData.issues
                    )

            });

        }


        // ====================================================
        // DISPLAY PAGE PROBLEMS
        // ====================================================

        if (
            pageIssues.length === 0
        ) {

            pageDetails += `

<div class="card">

<h3>✅ No low scores detected</h3>

<p>
All six audit categories scored 80 or above
for this page.
</p>

</div>

`;

        }

        else {

            pageDetails += `

<h3>
Problems &amp; How to Fix
</h3>

`;


            for (
                const category
                of pageIssues
            ) {

                pageDetails += `

<div class="card">

<h3>
${escapeHtml(category.category)}
— ${category.score}/100
</h3>

`;


                if (
                    category.issues.length === 0
                ) {

                    pageDetails += `

<p>
<strong>Why:</strong>
The ${escapeHtml(
    String(category.category || "unknown category").toLowerCase()
)}
score is below 80.
score is below 80.
</p>

<p>
<strong>How to fix:</strong>
Review the failed checks for this category.
</p>

`;

                }

                else {

                    for (
                        const issue
                        of category.issues
                    ) {

                        pageDetails += `

<div class="issue">

<h4>
${escapeHtml(
    issue?.title ||
    "Issue detected"
)}
</h4>

`;


                        if (
                            issue?.displayValue
                        ) {

                            pageDetails += `

<p>
<strong>Result:</strong>
${escapeHtml(
    issue.displayValue,
    3000
)}
</p>

`;

                        }


                        pageDetails += `

<p>
<strong>Why:</strong>
${escapeHtml(
    issue?.why ||
    issue?.description ||
    "This check did not pass.",
    5000
)}
</p>

<p>
<strong>How to fix:</strong>
${escapeHtml(
    issue?.fix ||
    "Follow the recommended fix for this issue.",
    5000
)}
</p>

`;


                        pageDetails +=
                            renderAffectedElements(
                                issue?.affectedElements
                            );


                        pageDetails += `

</div>

`;

                    }

                }


                pageDetails += `

</div>

`;

            }

        }


        pageDetails += `

</div>

`;

    }
        // ========================================================
    // PROBLEMS & FIXES
    // ========================================================

    let problemsHtml = "";


    for (
        const page
        of pages
    ) {

        const lighthouse =
            page.lighthouse || {};


        const categories = [

            {
                name: "Performance",

                score:
                    lighthouse.performance,

                issues:
                    safeIssues(
                        lighthouse.issues?.performance
                    )

            },

            {
                name: "Accessibility",

                score:
                    lighthouse.accessibility,

                issues:
                    safeIssues(
                        lighthouse.issues?.accessibility
                    )

            },

            {
                name: "SEO",

                score:
                    lighthouse.seo,

                issues:
                    safeIssues(
                        lighthouse.issues?.seo
                    )

            },

            {
                name: "Best Practices",

                score:
                    lighthouse.bestPractices,

                issues:
                    safeIssues(
                        lighthouse.issues?.bestPractices
                    )

            }

        ];


        for (
            const category
            of categories
        ) {

            if (
                typeof category.score !== "number" ||
                category.score >= 80
            ) {

                continue;

            }


            problemsHtml += `

<div class="card">

<h3>
${escapeHtml(category.name)}
— ${category.score}/100
</h3>

<p>
<strong>Page:</strong>
${escapeHtml(page.url || "-")}
</p>

`;


            if (
                category.issues.length === 0
            ) {

                problemsHtml += `

<p>
<strong>Why:</strong>
The ${escapeHtml(
    category.name.toLowerCase()
)}
score is below 80.
</p>

<p>
<strong>How to fix:</strong>
Review and fix the failed audits for this page.
</p>

`;

            }

            else {

                for (
                    const issue
                    of category.issues
                ) {

                    problemsHtml += `

<div class="issue">

<h4>
${escapeHtml(
    issue?.title ||
    "Lighthouse issue"
)}
</h4>

`;


                    if (
                        issue?.displayValue
                    ) {

                        problemsHtml += `

<p>
<strong>Result:</strong>
${escapeHtml(
    issue.displayValue,
    3000
)}
</p>

`;

                    }


                    problemsHtml += `

<p>
<strong>Why:</strong>
${escapeHtml(
    issue?.why ||
    issue?.description ||
    "This audit did not pass.",
    5000
)}
</p>

<p>
<strong>How to fix:</strong>
${escapeHtml(
    issue?.fix ||
    "Follow the Lighthouse recommendation for this audit.",
    5000
)}
</p>

`;


                    problemsHtml +=
                        renderAffectedElements(
                            issue?.affectedElements
                        );


                    problemsHtml += `

</div>

`;

                }

            }


            problemsHtml += `

</div>

`;

        }


        // ====================================================
        // FUNCTIONALITY
        // ====================================================

        if (

            page.functionality &&

            typeof page.functionality.score === "number" &&

            page.functionality.score < 80

        ) {

            problemsHtml += `

<div class="card">

<h3>
Functionality —
${page.functionality.score}/100
</h3>

<p>
<strong>Page:</strong>
${escapeHtml(page.url || "-")}
</p>

`;


            const functionalityIssues =
                safeIssues(
                    page.functionality.issues
                );


            if (
                functionalityIssues.length === 0
            ) {

                problemsHtml += `

<p>
<strong>Why:</strong>
The functionality score is below 80.
</p>

<p>
<strong>How to fix:</strong>
Check the functionality tests for this page.
</p>

`;

            }


            for (
                const issue
                of functionalityIssues
            ) {

                problemsHtml += `

<div class="issue">

<p>
<strong>
${escapeHtml(
    issue?.title ||
    "Functionality issue"
)}
</strong>
</p>

<p>
<strong>Why:</strong>
${escapeHtml(
    issue?.why ||
    issue?.description ||
    "A functionality problem was detected.",
    5000
)}
</p>

<p>
<strong>How to fix:</strong>
${escapeHtml(
    issue?.fix ||
    "Check and fix the affected functionality.",
    5000
)}
</p>

</div>

`;

            }


            problemsHtml += `

</div>

`;

        }


        // ====================================================
        // RESPONSIVE
        // ====================================================

        if (

            page.responsive &&

            typeof page.responsive.score === "number" &&

            page.responsive.score < 80

        ) {

            problemsHtml += `

<div class="card">

<h3>
Responsive —
${page.responsive.score}/100
</h3>

<p>
<strong>Page:</strong>
${escapeHtml(page.url || "-")}
</p>

`;


            const responsiveIssues =
                safeIssues(
                    page.responsive.issues
                );


            if (
                responsiveIssues.length === 0
            ) {

                problemsHtml += `

<p>
<strong>Why:</strong>
The responsive score is below 80.
</p>

<p>
<strong>How to fix:</strong>
Check the responsive tests for this page.
</p>

`;

            }


            for (
                const issue
                of responsiveIssues
            ) {

                problemsHtml += `

<div class="issue">

<p>
<strong>
${escapeHtml(
    issue?.title ||
    "Responsive issue"
)}
</strong>
</p>

<p>
<strong>Why:</strong>
${escapeHtml(
    issue?.why ||
    issue?.description ||
    "A responsive problem was detected.",
    5000
)}
</p>

<p>
<strong>How to fix:</strong>
${escapeHtml(
    issue?.fix ||
    "Make the page layout responsive.",
    5000
)}
</p>

</div>

`;

            }


            problemsHtml += `

</div>

`;

        }

    }


    // ========================================================
    // UI/UX SECTION
    // ========================================================

    let uiuxHtml = "";


    for (
        const page
        of pages
    ) {

        if (

            !page.uiux ||

            !Array.isArray(
                page.uiux.issues
            ) ||

            page.uiux.issues.length === 0

        ) {

            continue;

        }


        uiuxHtml += `

<div class="uiux-page">

<h3>
${escapeHtml(
    page.url || "Page"
)}
</h3>

`;


        const uiuxIssues =
            page.uiux.issues.slice(
                0,
                MAX_UIUX_ISSUES_PER_PAGE
            );


        for (
            const issue
            of uiuxIssues
        ) {

            const severity =
                issue?.severity ||
                "Low";


            const title =
                issue?.title ||
                issue?.name ||
                issue?.issue ||
                "UI/UX Issue";


            const description =
                issue?.description ||
                issue?.why ||
                "";


            const recommendation =
                issue?.recommendation ||
                issue?.solution ||
                issue?.fix ||
                "";


            uiuxHtml += `

<div class="uiux-issue">

<h4>
${escapeHtml(
    issue?.id ||
    "UI Issue"
)}
</h4>

<p>
<strong>Severity:</strong>
${escapeHtml(severity)}
</p>

<p>
<strong>Issue:</strong>
${escapeHtml(title)}
</p>

<p>
<strong>Why:</strong>
${escapeHtml(
    description,
    5000
)}
</p>

`;


            if (
                recommendation
            ) {

                uiuxHtml += `

<p>
<strong>Recommendation:</strong>
${escapeHtml(
    recommendation,
    5000
)}
</p>

`;

            }


            // ==================================================
            // UI/UX SCREENSHOT
            // ==================================================

            if (
                issue?.annotatedScreenshot
            ) {

                const imageUrl =
                    safeFileUrl(
                        issue.annotatedScreenshot
                    );


                if (
                    imageUrl
                ) {

                    uiuxHtml += `

<div class="screenshot-container">

<img
    src="${imageUrl}"
    alt="Annotated UI/UX issue screenshot"
    style="
        display:block;
        width:100%;
        max-width:900px;
        height:auto;
        border:1px solid #ddd;
        border-radius:10px;
        margin:15px 0;
    "
>

</div>

`;

                }

            }


            uiuxHtml += `

</div>

`;

        }


        if (
            page.uiux.issues.length >
            MAX_UIUX_ISSUES_PER_PAGE
        ) {

            uiuxHtml += `

<p>
<small>
${page.uiux.issues.length -
    MAX_UIUX_ISSUES_PER_PAGE}
additional UI/UX issues were omitted
from the report.
</small>
</p>

`;

        }


        uiuxHtml += `

</div>

`;

    }


    // ========================================================
    // NO UI/UX ISSUES
    // ========================================================

    if (
        !uiuxHtml
    ) {

        uiuxHtml = `

<div class="card">

<h3>
No UI/UX issues detected
</h3>

<p>
No UI/UX issues were returned by the
AI analysis for the audited pages.
</p>

</div>

`;

    }


    // ========================================================
    // REPORT SIZE LOG
    // ========================================================

    console.log(
        "REPORT SIZE:",
        {

            template:
                template.length,

            pageTable:
                pageTable.length,

            pageDetails:
                pageDetails.length,

            problemsHtml:
                problemsHtml.length,

            uiuxHtml:
                uiuxHtml.length,

            htmlContent:
                htmlContent.length

        }
    );


    // ========================================================
    // REPLACEMENT VALUES
    // ========================================================

    const values = {

        WEBSITE:
            audit.metadata?.website ||
            "-",

        DATE:
            audit.metadata?.completedAt

                ? new Date(
                    audit.metadata.completedAt
                ).toLocaleString()

                : new Date().toLocaleString(),

        TOTAL_PAGES:
            pageCount,

        OVERALL_SCORE:
            overall,

        PERFORMANCE:
            performance,

        ACCESSIBILITY:
            accessibility,

        SEO:
            seo,

        BEST_PRACTICES:
            bestPractices,

        FUNCTIONALITY:
            functionality,

        RESPONSIVE:
            responsive,

        CRITICAL:
            critical,

        HIGH:
            high,

        MEDIUM:
            medium,

        LOW:
            low,

        TOTAL_ISSUES:
            critical +
            high +
            medium +
            low

    };


    // ========================================================
    // REPLACE TEMPLATE VARIABLES
    // ========================================================

    for (
        const [key, value]
        of Object.entries(values)
    ) {

        template =
            template.replaceAll(

                `{{${key}}}`,

                String(value)

            );

    }


    // ========================================================
    // REPLACE PAGE TABLE
    // ========================================================

    template =
        template.replace(

            "{{PAGE_TABLE}}",

            pageTable || ""

        );


    // ========================================================
    // REPLACE PAGE DETAILS
    // ========================================================

    template =
        template.replace(

            "{{PAGE_DETAILS}}",

            pageDetails || ""

        );


    // ========================================================
    // REPLACE PROBLEMS
    // ========================================================

    template =
        template.replace(

            "{{PROBLEMS}}",

            problemsHtml || ""

        );


    // ========================================================
    // REPLACE UI/UX
    // ========================================================

    template =
        template.replace(

            "{{UIUX}}",

            uiuxHtml || ""

        );


    // ========================================================
    // REPLACE MARKDOWN CONTENT
    // ========================================================

    template =
        template.replace(

            "{{CONTENT}}",

            htmlContent || ""

        );


    // ========================================================
    // REMOVE UNUSED PLACEHOLDERS
    // ========================================================

    template =
        template.replace(

            /{{[A-Z0-9_]+}}/g,

            ""

        );


    // ========================================================
    // FINAL REPORT
    // ========================================================

    console.log(
        "HTML report created successfully."
    );


    return template;

}


// ============================================================
// EXPORT
// ============================================================

module.exports =
    createHtmlReport;