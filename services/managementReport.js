const escapeHtml = value => {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

};


// ============================================================
// CREATE MANAGEMENT HTML
// ============================================================

function createManagementReport(
    audit,
    managementIssues
) {

    const website =
        audit?.metadata?.website ||
        "Website";


    const totalPages =
        audit?.metadata?.totalPages ||
        audit?.pages?.length ||
        0;


    const issues =
        Array.isArray(managementIssues)
            ? managementIssues
            : [];


    let issueHtml = "";


    // ========================================================
    // NO ISSUES
    // ========================================================

    if (issues.length === 0) {

        issueHtml = `

        <div class="no-issues">

            <h2>No reportable issues found</h2>

            <p>
                Gemini did not find enough reliable
                issues in the audit data.
            </p>

        </div>

        `;

    }


    // ========================================================
    // ISSUES
    // ========================================================

    else {

        for (
            let index = 0;
            index < issues.length;
            index++
        ) {

            const item =
                issues[index];


            const issue =
                item?.issue ||
                "Website issue";


            const fix =
                item?.howToFix ||
                "Review the affected page and correct the problem.";


            const pages =
                Array.isArray(item?.pages)
                    ? item.pages.filter(Boolean)
                    : [];


            let pageHtml = "";


            // ------------------------------------------------
            // ONE PAGE
            // ------------------------------------------------

            if (pages.length === 1) {

                pageHtml = `

                    <div class="page-list">

                        <a
                            href="${escapeHtml(pages[0])}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            ${escapeHtml(pages[0])}
                        </a>

                    </div>

                `;

            }


            // ------------------------------------------------
            // MULTIPLE PAGES
            // ------------------------------------------------

            else if (pages.length > 1) {

                pageHtml = `

                    <div class="page-list">

                        <div class="page-count">

                            Found on

                            <strong>
                                ${pages.length}
                            </strong>

                            pages

                        </div>


                        <details>

                            <summary>
                                View affected pages
                            </summary>


                            <ul>

                                ${pages
                                    .map(page => `

                                        <li>

                                            <a
                                                href="${escapeHtml(page)}"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                ${escapeHtml(page)}
                                            </a>

                                        </li>

                                    `)
                                    .join("")
                                }

                            </ul>

                        </details>

                    </div>

                `;

            }


            // ------------------------------------------------
            // UNKNOWN PAGE
            // ------------------------------------------------

            else {

                pageHtml = `

                    <div class="page-list">

                        Page could not be identified.

                    </div>

                `;

            }


            // ------------------------------------------------
            // ISSUE CARD
            // ------------------------------------------------

            issueHtml += `

                <div class="issue">

                    <div class="issue-number">

                        ${index + 1}

                    </div>


                    <div class="issue-content">

                        <h2>

                            ${escapeHtml(issue)}

                        </h2>


                        <div class="section-label">

                            Page

                        </div>


                        ${pageHtml}


                        <div class="section-label fix-label">

                            How to Fix

                        </div>


                        <div class="fix">

                            ${escapeHtml(fix)}

                        </div>

                    </div>

                </div>

            `;

        }

    }


    // ============================================================
    // COMPLETE HTML
    // ============================================================

    return `

<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<title>
    Website Audit - Management Report
</title>


<style>

/* ============================================================
   BASIC
   ============================================================ */

* {

    box-sizing:
        border-box;

}


body {

    margin:
        0;

    padding:
        0;

    background:
        #f5f7fb;

    color:
        #1f2937;

    font-family:
        Arial,
        Helvetica,
        sans-serif;

}


.container {

    width:
        92%;

    max-width:
        1050px;

    margin:
        0 auto;

    padding:
        35px 0 50px;

}


/* ============================================================
   HEADER
   ============================================================ */

.header {

    background:
        #ffffff;

    border:
        1px solid #e5e7eb;

    border-radius:
        16px;

    padding:
        30px;

    margin-bottom:
        25px;

}


.report-label {

    color:
        #2563eb;

    font-size:
        13px;

    font-weight:
        700;

    letter-spacing:
        1px;

    margin-bottom:
        8px;

}


.header h1 {

    margin:
        0 0 18px;

    color:
        #111827;

    font-size:
        30px;

}


.info {

    display:
        grid;

    grid-template-columns:
        repeat(2, 1fr);

    gap:
        12px;

}


.info-box {

    background:
        #f8fafc;

    border-radius:
        9px;

    padding:
        13px 15px;

}


.info-label {

    display:
        block;

    color:
        #6b7280;

    font-size:
        12px;

    margin-bottom:
        4px;

}


.info-value {

    color:
        #111827;

    font-size:
        14px;

    font-weight:
        600;

    word-break:
        break-word;

}


/* ============================================================
   ISSUE CARD
   ============================================================ */

.issue {

    display:
        flex;

    gap:
        20px;

    background:
        #ffffff;

    border:
        1px solid #e5e7eb;

    border-radius:
        15px;

    padding:
        25px;

    margin-bottom:
        18px;

    page-break-inside:
        avoid;

}


.issue-number {

    flex:
        0 0 42px;

    width:
        42px;

    height:
        42px;

    border-radius:
        50%;

    background:
        #2563eb;

    color:
        #ffffff;

    display:
        flex;

    align-items:
        center;

    justify-content:
        center;

    font-size:
        17px;

    font-weight:
        700;

}


.issue-content {

    flex:
        1;

    min-width:
        0;

}


.issue-content h2 {

    margin:
        0 0 20px;

    color:
        #111827;

    font-size:
        20px;

    line-height:
        1.4;

}


/* ============================================================
   LABELS
   ============================================================ */

.section-label {

    color:
        #374151;

    font-size:
        13px;

    font-weight:
        700;

    margin-bottom:
        7px;

}


.fix-label {

    margin-top:
        18px;

}


/* ============================================================
   PAGE
   ============================================================ */

.page-list {

    background:
        #f8fafc;

    border:
        1px solid #e5e7eb;

    border-radius:
        8px;

    padding:
        11px 13px;

    word-break:
        break-word;

}


.page-list a {

    color:
        #2563eb;

    text-decoration:
        none;

    font-size:
        13px;

    line-height:
        1.6;

}


.page-list a:hover {

    text-decoration:
        underline;

}


.page-count {

    color:
        #374151;

    font-size:
        14px;

    margin-bottom:
        8px;

}


details {

    margin-top:
        5px;

}


summary {

    cursor:
        pointer;

    color:
        #2563eb;

    font-size:
        13px;

    font-weight:
        600;

}


details ul {

    margin:
        10px 0 0 20px;

    padding:
        0;

}


details li {

    margin-bottom:
        7px;

}


/* ============================================================
   HOW TO FIX
   ============================================================ */

.fix {

    background:
        #eff6ff;

    border-left:
        4px solid #2563eb;

    border-radius:
        6px;

    padding:
        14px 16px;

    color:
        #1e3a8a;

    font-size:
        14px;

    line-height:
        1.65;

}


/* ============================================================
   NO ISSUES
   ============================================================ */

.no-issues {

    background:
        #ffffff;

    border:
        1px solid #e5e7eb;

    border-radius:
        15px;

    padding:
        40px;

    text-align:
        center;

}


.no-issues h2 {

    margin:
        0 0 8px;

    color:
        #111827;

}


.no-issues p {

    margin:
        0;

    color:
        #6b7280;

}


/* ============================================================
   FOOTER
   ============================================================ */

.footer {

    text-align:
        center;

    color:
        #9ca3af;

    font-size:
        11px;

    margin-top:
        30px;

}


/* ============================================================
   PRINT
   ============================================================ */

@media print {

    body {

        background:
            #ffffff;

    }


    .container {

        width:
            100%;

        max-width:
            none;

        padding:
            15px;

    }


    .issue {

        break-inside:
            avoid;

    }

}


@media (max-width: 700px) {

    .info {

        grid-template-columns:
            1fr;

    }


    .issue {

        gap:
            12px;

        padding:
            18px;

    }


    .issue-number {

        flex-basis:
            36px;

        width:
            36px;

        height:
            36px;

    }


    .issue-content h2 {

        font-size:
            18px;

    }

}

</style>

</head>


<body>


<div class="container">


    <!-- =====================================================
         HEADER
         ===================================================== -->

    <div class="header">

        <div class="report-label">

            WEBSITE AUDIT

        </div>


        <h1>

            Simple Management Report

        </h1>


        <div class="info">


            <div class="info-box">

                <span class="info-label">

                    Website

                </span>

                <span class="info-value">

                    ${escapeHtml(website)}

                </span>

            </div>


            <div class="info-box">

                <span class="info-label">

                    Pages Audited

                </span>

                <span class="info-value">

                    ${totalPages}

                </span>

            </div>


            <div class="info-box">

                <span class="info-label">

                    Issues Shown

                </span>

                <span class="info-value">

                    ${issues.length}

                </span>

            </div>


            <div class="info-box">

                <span class="info-label">

                    Report Type

                </span>

                <span class="info-value">

                    Management Summary

                </span>

            </div>


        </div>

    </div>


    <!-- =====================================================
         ISSUES
         ===================================================== -->

    ${issueHtml}


    <!-- =====================================================
         FOOTER
         ===================================================== -->

    <div class="footer">

        Website Audit Agent

    </div>


</div>


</body>

</html>

`;

}


module.exports =
    createManagementReport;