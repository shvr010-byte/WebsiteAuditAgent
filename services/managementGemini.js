require("dotenv").config();

const fs = require("fs");
const path = require("path");

const { GoogleGenAI } =
    require("@google/genai");


const ai = new GoogleGenAI({

    apiKey:
        process.env.GEMINI_API_KEY

});


const MODEL =
    "gemini-flash-latest";


const MAX_RETRIES = 3;


// ============================================================
// ISSUE LIMIT
// ============================================================

function getIssueLimit(pageCount) {

    if (pageCount <= 5) {
        return 5;
    }

    if (pageCount <= 20) {
        return 10;
    }

    if (pageCount <= 50) {
        return 15;
    }

    return 20;

}


// ============================================================
// SLEEP
// ============================================================

function sleep(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );

}


// ============================================================
// LOAD COMPACT MANAGEMENT DATA
// ============================================================


function prepareAuditForGemini(audit) {

    const pages =
        Array.isArray(audit?.pages)
            ? audit.pages
            : [];

    const groups = new Map();


    function clean(value, max = 500) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, max);
    }


    function normalize(value) {

        return clean(value)
            .toLowerCase()
            .replace(
                /https?:\/\/[^\s]+/g,
                ""
            )
            .replace(
                /\d+(\.\d+)?\s*(ms|s|kb|mb|px|%)/gi,
                ""
            )
            .replace(/\s+/g, " ")
            .trim();
    }


    function addFinding(
        category,
        item,
        pageUrl
    ) {

        if (
            !item ||
            typeof item !== "object"
        ) {
            return;
        }


        const title =
            clean(item.title, 200);

        const problem =
            clean(
                item.why ||
                item.description ||
                item.problem,
                500
            );

        const fix =
            clean(
                item.fix ||
                item.recommendation ||
                item.solution,
                500
            );


        if (!title && !problem) {
            return;
        }


        const key = [
            category,
            normalize(title),
            normalize(problem)
        ].join("|");


        if (!groups.has(key)) {

            groups.set(
                key,
                {
                    category,
                    title,
                    problem,
                    fix,
                    pages: [],
                    count: 0
                }
            );

        }


        const group =
            groups.get(key);

        group.count++;


        if (
            pageUrl &&
            !group.pages.includes(pageUrl)
        ) {

            group.pages.push(
                pageUrl
            );

        }


        if (!group.fix && fix) {
            group.fix = fix;
        }

    }


    for (const page of pages) {

        const pageUrl =
            page?.url || "";


        // -----------------------------
        // Lighthouse
        // -----------------------------

        const lighthouse =
            page?.lighthouse;


        if (
            lighthouse &&
            lighthouse.issues
        ) {

            const categories = [
                "performance",
                "accessibility",
                "seo",
                "bestPractices"
            ];


            for (
                const category
                of categories
            ) {

                const issues =
                    lighthouse.issues[category];


                if (!Array.isArray(issues)) {
                    continue;
                }


                for (const item of issues) {

                    addFinding(
                        category,
                        item,
                        pageUrl
                    );

                }

            }

        }


        // -----------------------------
        // Accessibility
        // -----------------------------

        const accessibility =
            page?.accessibility;


        if (accessibility) {

            const arrays = [
                accessibility.issues,
                accessibility.violations,
                accessibility.results
            ];


            for (const list of arrays) {

                if (!Array.isArray(list)) {
                    continue;
                }


                for (const item of list) {

                    addFinding(
                        "Accessibility",
                        item,
                        pageUrl
                    );

                }

            }

        }


        // -----------------------------
        // Links
        // -----------------------------

        const links =
            page?.links;


        if (links) {

            const arrays = [
                links.brokenLinks,
                links.broken,
                links.issues
            ];


            for (const list of arrays) {

                if (!Array.isArray(list)) {
                    continue;
                }


                for (const item of list) {

                    if (
                        typeof item === "string"
                    ) {

                        addFinding(
                            "Links",
                            {
                                title:
                                    "Broken link",

                                description:
                                    item,

                                fix:
                                    "Check the link and update it to a working page."
                            },
                            pageUrl
                        );

                    }
                    else {

                        addFinding(
                            "Links",
                            item,
                            pageUrl
                        );

                    }

                }

            }

        }


        // -----------------------------
        // Functionality
        // -----------------------------

        const functionality =
            page?.functionality;


        if (functionality) {

            const arrays = [
                functionality.issues,
                functionality.errors,
                functionality.failures
            ];


            for (const list of arrays) {

                if (!Array.isArray(list)) {
                    continue;
                }


                for (const item of list) {

                    addFinding(
                        "Functionality",
                        item,
                        pageUrl
                    );

                }

            }

        }


        // -----------------------------
        // Responsive
        // -----------------------------

        const responsive =
            page?.responsive;


        if (responsive) {

            const arrays = [
                responsive.issues,
                responsive.errors,
                responsive.failures
            ];


            for (const list of arrays) {

                if (!Array.isArray(list)) {
                    continue;
                }


                for (const item of list) {

                    addFinding(
                        "Responsive",
                        item,
                        pageUrl
                    );

                }

            }

        }


        // -----------------------------
        // UI/UX
        // -----------------------------

        const uiux =
            page?.uiux;


        if (
            uiux &&
            Array.isArray(uiux.issues)
        ) {

            for (const issue of uiux.issues) {

                if (
                    !issue ||
                    typeof issue !== "object"
                ) {
                    continue;
                }


                addFinding(
                    "UI/UX",
                    {
                        title:
                            issue.title ||
                            issue.issue ||
                            issue.problem,

                        description:
                            issue.description ||
                            issue.problem ||
                            issue.issue,

                        fix:
                            issue.recommendation ||
                            issue.fix ||
                            issue.solution
                    },
                    pageUrl
                );

            }

        }

    }


    let findings =
        Array.from(
            groups.values()
        );


    findings.sort(
        (a, b) =>
            b.pages.length -
            a.pages.length
    );


    findings =
        findings.slice(
            0,
            80
        );


    return {

        website:
            audit?.metadata?.website || "",

        totalPages:
            pages.length,

        findings

    };

}


// ============================================================
// MANAGEMENT PROMPT
// ============================================================

function buildPrompt(audit) {

    const pageCount =
        audit?.totalPages ||
        audit?.pages?.length ||
        0;


    const issueLimit =
        getIssueLimit(
            pageCount
        );


    const website =
        audit?.website ||
        "";


    const managementData =
        prepareAuditForGemini(audit);


    return `

You are a senior website quality reviewer preparing a simple
report for a NON-TECHNICAL business manager.

You are given grouped findings from an automated website audit.

Website:
${website}

Number of audited pages:
${pageCount}

You MUST select exactly ${issueLimit} useful issues,
unless the audit contains fewer than ${issueLimit} real issues.

============================================================
IMPORTANT
============================================================

Only report problems supported by the provided audit data.

DO NOT invent problems.

Do not treat a testing timeout or testing limitation as a
website problem unless the data provides actual evidence.

Do not report:

- API errors
- stack traces
- HTTP headers
- request/response details
- browser errors
- internal tool names
- Lighthouse IDs
- raw JSON
- code
- technical logs

Convert technical findings into simple English.

============================================================
WHAT TO PRIORITIZE
============================================================

Prefer important problems in this order:

1. Visible UI/UX problems
2. Incorrect or confusing content
3. Website speed problems
4. Search visibility problems
5. Accessibility problems
6. Broken links
7. Mobile/responsive problems
8. Functionality problems
9. Other important website problems

============================================================
REPEATED ISSUES
============================================================

If the same problem affects many pages,
combine it into ONE issue.

Use the pages array to list ALL affected pages.

Do not create multiple issues for the same underlying problem.

============================================================
PAGE INFORMATION
============================================================

Every issue MUST contain exact affected page URLs.

Never write:

"Many pages"

or:

"Several pages"

The actual URLs must be included.

============================================================
SIMPLE LANGUAGE
============================================================

Write for a manager who may know nothing about web development.

Bad:

"Large Contentful Paint exceeds the recommended threshold."

Good:

"Some pages take too long to show their main content."

Bad:

"Missing meta description."

Good:

"Some pages do not have a useful description for Google."

Bad:

"Contrast ratio fails WCAG."

Good:

"Some text is difficult to read because the colors do not
have enough contrast."

============================================================
HOW TO FIX
============================================================

Give a short, clear and practical fix.

Bad:

"Optimize the DOM."

Good:

"Remove unnecessary page elements and improve how the page loads."

============================================================
OUTPUT
============================================================

Return ONLY valid JSON.

Do not use markdown.

Do not use code fences.

Return exactly:

{
    "issues": [
        {
            "issue": "Simple description of the problem",
            "pages": [
                "https://example.com/page"
            ],
            "howToFix": "Simple explanation of what should be done"
        }
    ]
}

============================================================
FINAL RULES
============================================================

- Maximum ${issueLimit} issues.
- Prefer exactly ${issueLimit} if enough real issues exist.
- One repeated problem = one issue.
- Do not invent problems.
- Use exact page URLs.
- Use simple English.
- No business impact.
- No priority.
- No strengths.
- No conclusion.
- Only Issue, Pages and How to Fix.

============================================================
AUDIT FINDINGS
============================================================

${JSON.stringify(
    managementData
)}

`;

}


// ============================================================
// MAIN FUNCTION
// ============================================================

async function generateManagementIssues(audit) {

    if (!audit) {

        throw new Error(
            "Audit data is required."
        );

    }


    const pageCount =
        audit?.pages?.length ||
        0;


    if (
        pageCount === 0
    ) {

        return [];

    }


    console.log(
        `Preparing Gemini management analysis for ${pageCount} pages...`
    );


    const prompt =
        buildPrompt(
            audit
        );


    for (
        let attempt = 1;
        attempt <= MAX_RETRIES;
        attempt++
    ) {

        try {

            console.log(
                `Management Gemini Attempt ${attempt}/${MAX_RETRIES}`
            );


            console.log(
                "Sending management audit to Gemini..."
            );


            const response =
                await Promise.race([

                    ai.models.generateContent({

                        model:
                            MODEL,

                        contents: [

                            {
                                text:
                                    prompt
                            }

                        ]

                    }),


                    new Promise(
                        (_, reject) => {

                            setTimeout(

                                () => {

                                    reject(
                                        new Error(
                                            "Gemini timeout after 120 seconds"
                                        )
                                    );

                                },

                                120000

                            );

                        }
                    )

                ]);


            console.log(
                "Management Gemini responded."
            );


            let text;


            if (
                typeof response.text ===
                "function"
            ) {

                text =
                    await response.text();

            }

            else {

                text =
                    response.text;

            }


            if (!text) {

                throw new Error(
                    "Empty Gemini response."
                );

            }


            text =
                text
                    .replace(
                        /```json/gi,
                        ""
                    )
                    .replace(
                        /```/g,
                        ""
                    )
                    .trim();


            const json =
                JSON.parse(
                    text
                );


            if (
                !json ||
                !Array.isArray(
                    json.issues
                )
            ) {

                throw new Error(
                    "Gemini returned invalid management report JSON."
                );

            }


            const limit =
                getIssueLimit(
                    pageCount
                );


            const issues =
                json.issues
                    .filter(

                        item =>

                            item &&
                            typeof item.issue ===
                                "string" &&
                            Array.isArray(
                                item.pages
                            ) &&
                            typeof item.howToFix ===
                                "string"

                    )
                    .map(
                        item => ({

                            issue:
                                item.issue.trim(),

                            pages:
                                item.pages
                                    .filter(
                                        page =>
                                            typeof page ===
                                            "string"
                                    ),

                            howToFix:
                                item.howToFix.trim()

                        })
                    )
                    .filter(
                        item =>
                            item.issue &&
                            item.pages.length > 0 &&
                            item.howToFix
                    )
                    .slice(
                        0,
                        limit
                    );


            console.log(
                `Management issues returned: ${issues.length}`
            );


            return issues;

        }


        catch (err) {

            console.error(
                "Management Gemini error:",
                err.message
            );


            if (
                attempt < MAX_RETRIES &&
                (
                    err.message.includes(
                        "503"
                    ) ||
                    err.message.includes(
                        "429"
                    ) ||
                    err.message.includes(
                        "timeout"
                    ) ||
                    err.message.includes(
                        "Timeout"
                    )
                )
            ) {

                const wait =
                    attempt * 5000;


                console.log(
                    `Retrying in ${wait / 1000}s...`
                );


                await sleep(
                    wait
                );


                continue;

            }


            break;

        }

    }


    console.log(
        "Management Gemini unavailable."
    );


    return [];
}



// ============================================================
// EXPORT
// ============================================================

module.exports = generateManagementIssues;