function buildTechnicalPrompt(audit) {

    let pagesSummary = "";

    for (const page of audit.pages) {

        pagesSummary += `

================================================

PAGE URL: ${page.url}

Performance: ${page.lighthouse.performance}

Accessibility: ${page.lighthouse.accessibility}

SEO: ${page.lighthouse.seo}

Best Practices: ${page.lighthouse.bestPractices}

Accessibility Findings:
${JSON.stringify(page.accessibility, null, 2)}

Broken Links:
${JSON.stringify(page.links, null, 2)}

Console Errors:
${JSON.stringify(page.playwright.consoleErrors, null, 2)}

Network Errors:
${JSON.stringify(page.playwright.networkErrors, null, 2)}

UI/UX Analysis:
${JSON.stringify(page.uiux, null, 2)}

`;

    }

    return `

You are a Senior Website Auditor.

Analyze the following website audit.

IMPORTANT RULES

1. Never invent issues.
2. Never invent scores.
3. Never invent pages.
4. Never invent screenshots.
5. Use only the provided data.
6. If a section has no issues, write "No issues found."
7. Group findings page by page.
8. Prioritize Critical → High → Medium → Low.
9. Give practical recommendations.

Generate a professional Markdown report.

The report MUST contain:

# Executive Summary

# Website Overview

# Overall Website Scores

# Page-by-Page Audit

For every page include:

- URL
- Performance
- Accessibility
- SEO
- Best Practices
- Accessibility Issues
- Broken Links
- Console Errors
- Network Errors
- UI/UX Findings

# Priority Action Plan

# Final Recommendations

Website:

${audit.metadata.website}

Total Pages:

${audit.metadata.totalPages}

================================================

${pagesSummary}

`;

}

module.exports = buildTechnicalPrompt;  