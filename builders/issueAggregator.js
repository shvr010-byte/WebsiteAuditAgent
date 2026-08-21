function aggregateIssues(data) {

    const issues = [];

    // Accessibility
    if (data.accessibility && data.accessibility.issues) {
        data.accessibility.issues.forEach(issue => {

            issue.nodes.forEach(node => {

                issues.push({

                    id: "",

                    category: "Accessibility",

                    page: "",

                    section: "",

                    severity: issue.impact || "unknown",

                    title: issue.help,

                    description: issue.description,

                    selector: node.target[0] || "",

                    element: node.html || "",

                    recommendation: "",

                    example: ""

                });

            });

        });
    }

    // Broken Links
    if (data.links && data.links.brokenLinks) {

        data.links.brokenLinks.forEach(link => {

            issues.push({

                id: "",

                category: "Broken Link",

                page: "",

                section: "",

                severity: "High",

                title: "Broken Link",

                description: link.reason,

                selector: "",

                element: link.url,

                recommendation:
                    "Update or remove the broken link.",

                example: ""

            });

        });

    }
// Performance
if (data.lighthouse) {

    if (data.lighthouse.performance < 90) {

        issues.push({

            id: "PERF-001",
            category: "Performance",
            page: data.metadata?.page || "/",
            section: "",
            severity: "Medium",
            title: "Low Performance Score",
            description: `Performance score is ${data.lighthouse.performance}`,
            recommendation: "Optimize images, CSS and JavaScript.",
            example: ""

        });

    }

}
// SEO
if (data.lighthouse) {

    if (data.lighthouse.seo < 100) {

        issues.push({

            id: "SEO-001",
            category: "SEO",
            page: data.metadata?.page || "/",
            section: "",
            severity: "Medium",
            title: "SEO Improvements Needed",
            description: `SEO score is ${data.lighthouse.seo}`,
            recommendation: "Review Lighthouse SEO recommendations.",
            example: ""

        });

    }

}
// Console Errors
if (data.playwright && data.playwright.consoleErrors) {

    data.playwright.consoleErrors.forEach(error => {

        issues.push({

            id: "JS-001",
            category: "JavaScript",
            page: data.metadata?.page || "/",
            section: "",
            severity: "High",
            title: "Console Error",
            description: error,
            recommendation: "Fix the JavaScript error.",
            example: ""

        });

    });

}
// Network Errors
if (data.playwright && data.playwright.networkErrors) {

    data.playwright.networkErrors.forEach(error => {

        issues.push({

            id: "NET-001",
            category: "Network",
            page: data.metadata?.page || "/",
            section: "",
            severity: "High",
            title: "Network Request Failed",
            description: error,
            recommendation: "Check the failed request.",
            example: ""

        });

    });

}
    return issues;
}

module.exports = aggregateIssues;