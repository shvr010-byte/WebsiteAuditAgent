const fs = require("fs");


// ============================================================
// INPUT
// ============================================================

const auditPath = process.argv[2];

if (!auditPath) {

    console.error(
        "Please provide the audit.json path."
    );

    process.exit(1);

}


// ============================================================
// READ AUDIT
// ============================================================

const audit =
    JSON.parse(
        fs.readFileSync(
            auditPath,
            "utf8"
        )
    );


const pages =
    Array.isArray(audit.pages)
        ? audit.pages
        : [];


// ============================================================
// CLEAN TEXT
// ============================================================

function cleanText(
    value,
    maxLength = 500
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replace(/\s+/g, " ")
        .trim()
        .slice(
            0,
            maxLength
        );

}


// ============================================================
// NORMALIZE TEXT FOR DUPLICATE DETECTION
// ============================================================

function normalizeText(value) {

    return cleanText(
        value,
        500
    )
        .toLowerCase()
        .replace(
            /https?:\/\/[^\s]+/g,
            ""
        )
        .replace(
            /\d+(\.\d+)?\s*(ms|s|kb|mb|px|%)/gi,
            ""
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();

}


// ============================================================
// GROUP FINDINGS
// ============================================================

const groups =
    new Map();


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
        cleanText(
            item.title,
            200
        );


    const problem =
        cleanText(
            item.why ||
            item.description ||
            item.problem,
            500
        );


    const fix =
        cleanText(
            item.fix ||
            item.recommendation ||
            item.solution,
            500
        );


    if (
        !title &&
        !problem
    ) {

        return;

    }


    // --------------------------------------------------------
    // Duplicate key
    // --------------------------------------------------------

    const key = [

        category,

        normalizeText(
            title
        ),

        normalizeText(
            problem
        )

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


    // Keep the first useful fix
    if (
        !group.fix &&
        fix
    ) {

        group.fix = fix;

    }

}


// ============================================================
// PROCESS PAGES
// ============================================================

for (
    const page
    of pages
) {

    const pageUrl =
        page?.url || "";


    const lighthouse =
        page?.lighthouse;


    // ========================================================
    // LIGHTHOUSE
    // ========================================================

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
                lighthouse
                    .issues[category];


            if (
                !Array.isArray(
                    issues
                )
            ) {

                continue;

            }


            for (
                const item
                of issues
            ) {

                addFinding(
                    category,
                    item,
                    pageUrl
                );

            }

        }

    }


    // ========================================================
    // ACCESSIBILITY
    // ========================================================

    const accessibility =
        page?.accessibility;


    if (accessibility) {

        const arrays = [

            accessibility.issues,

            accessibility.violations,

            accessibility.results

        ];


        for (
            const list
            of arrays
        ) {

            if (
                !Array.isArray(
                    list
                )
            ) {

                continue;

            }


            for (
                const item
                of list
            ) {

                addFinding(
                    "Accessibility",
                    item,
                    pageUrl
                );

            }

        }

    }


    // ========================================================
    // LINKS
    // ========================================================

    const links =
        page?.links;


    if (links) {

        const arrays = [

            links.brokenLinks,

            links.broken,

            links.issues

        ];


        for (
            const list
            of arrays
        ) {

            if (
                !Array.isArray(
                    list
                )
            ) {

                continue;

            }


            for (
                const item
                of list
            ) {

                if (
                    typeof item ===
                    "string"
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


    // ========================================================
    // FUNCTIONALITY
    // ========================================================

    const functionality =
        page?.functionality;


    if (functionality) {

        const arrays = [

            functionality.issues,

            functionality.errors,

            functionality.failures

        ];


        for (
            const list
            of arrays
        ) {

            if (
                !Array.isArray(
                    list
                )
            ) {

                continue;

            }


            for (
                const item
                of list
            ) {

                addFinding(
                    "Functionality",
                    item,
                    pageUrl
                );

            }

        }

    }


    // ========================================================
    // RESPONSIVE
    // ========================================================

    const responsive =
        page?.responsive;


    if (responsive) {

        const arrays = [

            responsive.issues,

            responsive.errors,

            responsive.failures

        ];


        for (
            const list
            of arrays
        ) {

            if (
                !Array.isArray(
                    list
                )
            ) {

                continue;

            }


            for (
                const item
                of list
            ) {

                addFinding(
                    "Responsive",
                    item,
                    pageUrl
                );

            }

        }

    }


    // ========================================================
    // UI/UX
    // ========================================================

    const uiux =
        page?.uiux;


    if (
        uiux &&
        Array.isArray(
            uiux.issues
        )
    ) {

        for (
            const issue
            of uiux.issues
        ) {

            if (
                !issue ||
                typeof issue !==
                "object"
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


// ============================================================
// CONVERT GROUPS
// ============================================================

let findings =
    Array.from(
        groups.values()
    );


// ============================================================
// REMOVE VERY WEAK FINDINGS
// ============================================================

findings =
    findings.filter(
        item => {

            return (

                item.title ||

                item.problem

            );

        }
    );


// ============================================================
// SORT BY NUMBER OF AFFECTED PAGES
// ============================================================

findings.sort(
    (a, b) =>
        b.pages.length -
        a.pages.length
);


// ============================================================
// LIMIT GROUPS
// ============================================================

// Gemini does not need thousands of findings.
// Keep the strongest repeated findings.

findings =
    findings.slice(
        0,
        80
    );

console.log(
    `Sent to Gemini: ${findings.length}`
);
// ============================================================
// FINAL DATA
// ============================================================

const compactAudit = {

    website:
        audit?.metadata?.website ||
        "",

    totalPages:
        pages.length,

    findings

};


// ============================================================
// SAVE
// ============================================================

const outputPath =
    "management-data-test.json";


const output =
    JSON.stringify(
        compactAudit,
        null,
        2
    );


fs.writeFileSync(
    outputPath,
    output,
    "utf8"
);


const size =
    fs.statSync(
        outputPath
    ).size;


console.log("");

console.log(
    "======================================"
);

console.log(
    "MANAGEMENT FINDINGS DATA"
);

console.log(
    "======================================"
);

console.log(
    `Website pages: ${pages.length}`
);

console.log(
    `Original findings: 2034+`
);

console.log(
    `Unique grouped findings: ${groups.size}`
);

console.log(
    `Sent to Gemini: ${findings.length}`
);

console.log(
    `Size: ${(size / 1024 / 1024).toFixed(2)} MB`
);

console.log(
    `Characters: ${output.length}`
);

console.log(
    `File: ${outputPath}`
);

console.log(
    "======================================"
);