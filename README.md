# 🤖 AI Website Audit Agent

An AI-powered automated website auditing system that analyzes websites for **performance, accessibility, SEO, best practices, functionality, responsiveness, UI/UX quality, and broken links**.

The system automatically crawls a website, captures desktop/mobile screenshots, performs multiple technical audits, uses Google Gemini for visual UI/UX analysis, detects issues, generates issue screenshots, and produces detailed **HTML, PDF, JSON, and management reports**.

It is designed to reduce manual website testing effort and provide a structured, actionable website quality report.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [How It Works](#-how-it-works)
- [Architecture](#-architecture)
- [Audit Modules](#-audit-modules)
- [AI UI/UX Analysis](#-ai-uiux-analysis)
- [Link Verification](#-link-verification)
- [Lighthouse Scoring](#-lighthouse-scoring)
- [Stability & Resume System](#-stability--resume-system)
- [Screenshot & Issue Annotation](#-screenshot--issue-annotation)
- [Report Generation](#-report-generation)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Running the Project](#-running-the-project)
- [API](#-api)
- [Example Request](#-example-request)
- [Audit Workflow](#-audit-workflow)
- [Generated Output](#-generated-output)
- [Testing](#-testing)
- [Error Handling](#-error-handling)
- [Resume / Recovery](#-resume--recovery)
- [Limitations](#-limitations)
- [Future Improvements](#-future-improvements)
- [Development](#-development)
- [Git Workflow](#-git-workflow)
- [License](#-license)

---

# 🚀 Overview

Website Audit Agent is an automated website quality-analysis system.

Instead of manually checking every page of a website, the agent performs multiple types of testing automatically.

### The system can:

1. Crawl a website.
2. Discover website pages.
3. Capture desktop screenshots.
4. Capture mobile screenshots.
5. Optimize screenshots for analysis.
6. Run Lighthouse audits.
7. Perform accessibility analysis.
8. Check website links.
9. Test basic website functionality.
10. Test responsive behavior.
11. Analyze UI/UX using Google Gemini.
12. Locate UI/UX issues on the original webpage.
13. Generate issue-specific screenshots.
14. Generate detailed reports.
15. Generate management-level reports.
16. Save audit checkpoints.
17. Resume interrupted audits.
18. Handle individual module failures without stopping the complete audit.

---

# ✨ Key Features

## 🌐 Website Crawling

The crawler discovers internal website pages automatically.

Features:

- Internal link discovery
- Duplicate URL handling
- Configurable page limit through crawler configuration
- Page-by-page processing
- Crawl failure handling
- Fallback behavior when crawling cannot start

---

## 📸 Screenshot Capture

The system uses Playwright to capture:

- Desktop screenshots
- Mobile screenshots

Screenshots are used for:

- UI/UX analysis
- Visual inspection
- Issue annotation
- Report generation

---

## ⚡ Performance Analysis

The project integrates Lighthouse to analyze:

- Performance
- Accessibility
- SEO
- Best Practices

Lighthouse metrics and issues are included in the audit results.

---

## ♿ Accessibility Analysis

The accessibility module identifies visually and technically detectable accessibility problems.

Examples include:

- Missing accessibility attributes
- Contrast-related problems
- Missing labels
- Accessibility structure issues

---

## 🔗 Link Verification

The system checks website links and classifies them conservatively.

### Link states

#### ✅ Working

Examples:

- Successful `2xx` responses
- Valid redirects reaching a working destination

#### ❌ Broken

Examples:

- `404`
- `410`
- DNS failure
- Connection refusal
- Invalid/unreachable host

#### ⚠️ Unverified

Examples:

- `401`
- `403`
- `429`
- `999`
- Bot protection
- Rate limiting
- Authentication restrictions
- Relevant timeouts

This prevents false positives.

For example, social-media websites may reject automated HTTP requests even though the URL works normally in a browser.

---

# 🧠 AI UI/UX Analysis

Google Gemini is used to analyze website screenshots.

The AI evaluates visible UI/UX characteristics such as:

- Visual hierarchy
- Layout
- Typography
- Color contrast
- White space
- Alignment
- Design consistency
- CTA visibility
- Navigation
- Readability
- Trust signals
- Visually apparent accessibility problems
- Visible responsive behavior

### Example issue



🎯 UI/UX Issue Screenshots
When an AI UI/UX issue contains a target element, the system attempts to:
1. Locate the element on the original page.
2. Determine its position.
3. Crop the relevant screenshot area.
4. Annotate/highlight the issue.
5. Attach the resulting image to the report.
This makes AI findings easier for a human reviewer to verify.
📊 Lighthouse Scoring
Lighthouse category scores are converted to a 0–100 scale.
Example:
Lighthouse score = 0.63

Audit score = 63

Failed Lighthouse audits
A failed Lighthouse audit is not treated as a real score of zero.
Instead:
performance: null
accessibility: null
seo: null
bestPractices: null

The report excludes unavailable values from averages.
Example
Incorrect:
63 + 0 + 0 + 72
----------------
4

= 34

Correct:
63 + 72
-------
2

= 68

This prevents technical failures from artificially lowering the website score.
🔍 Link Verification
The link checker uses a two-level verification strategy.
HTTP Request
     |
     ├── Clearly working
     |       ↓
     |    WORKING
     |
     ├── Clearly broken
     |       ↓
     |    BROKEN
     |
     └── Uncertain
             ↓
      Playwright verification
             |
             ├── Opens successfully
             |       ↓
             |   BROWSER VERIFIED
             |
             └── Cannot verify
                     ↓
                 UNVERIFIED

Normal successful links are not unnecessarily opened in Playwright.
This helps reduce audit time.
🛡️ Stability & Error Handling
A major part of the project is audit reliability.
The system is designed so that one failed operation does not unnecessarily stop the entire audit.
Protected components include:
- Crawler
- Playwright
- Screenshots
- Lighthouse
- Accessibility
- Links
- Functionality
- Responsive testing
- UI/UX analysis
- Gemini requests
- Report generation
Example
If one page has:
Lighthouse → failed
Accessibility → successful
Links → successful
Functionality → successful
Responsive → successful

the successful results are preserved.
The entire page audit does not need to fail.
💾 Checkpoint & Resume System
Long website audits can take significant time.
The system therefore saves audit progress during execution.
Example:
{
  "status": "running",
  "totalPages": 50,
  "completedPages": 35,
  "currentPage": "https://example.com/page-36",
  "remainingPages": [
    "https://example.com/page-36",
    "https://example.com/page-37"
  ]
}

If the server stops unexpectedly, the audit can be resumed.
🔄 Resume Behavior
Resume is URL-based rather than relying only on page position.
Example:
Previously completed:

/login
/account

Remaining:

/checkout

After restart:
Skipping completed page: /login
Skipping completed page: /account

Processing:
/checkout

This prevents duplicate page results.
🔐 Atomic Checkpoints
Audit checkpoints are written using an atomic save approach.
Instead of directly overwriting the main JSON file:
audit-results.json

the system writes a temporary file and then replaces the original.
This reduces the risk of corrupted JSON if the process stops during a save operation.
🖥️ Responsive Testing
The Responsive module checks website behavior across multiple viewport sizes.
The system records:
- Viewport
- Test result
- Failures
- Responsive score
This helps identify layout problems that may occur on different screen sizes.
🧪 Functionality Testing
The Functionality module performs automated checks for common interactive and navigational behavior.
The system records functionality issues and generates a functionality score.
Unverified links are not treated as strongly broken functionality issues.
📑 Report Generation
The project generates multiple report formats.
Detailed HTML
Contains:
- Website information
- Overall score
- Category scores
- Page information
- Technical issues
- UI/UX issues
- Screenshots
- Recommendations
Detailed PDF
PDF version of the detailed audit report.
Audit JSON
Machine-readable audit results.
Useful for:
- Future dashboards
- Data processing
- Audit comparison
- Automation
- API integrations
Management Report
A simplified report intended for:
- Managers
- Clients
- Project leads
- Non-technical users
It focuses on:
- Important problems
- Business impact
- Priorities
- Recommended actions
🏗️ Architecture
High-level architecture:
                    ┌───────────────────┐
                    │   User / Client   │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │   Express API     │
                    │  /api/audit       │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │  Audit Controller │
                    └─────────┬─────────┘
                              │
              ┌───────────────┼────────────────┐
              │               │                │
              ▼               ▼                ▼
         ┌─────────┐    ┌───────────┐    ┌───────────┐
         │ Crawler │    │ Playwright│    │ Checkpoint│
         └────┬────┘    └─────┬─────┘    └───────────┘
              │               │
              │               ▼
              │        ┌──────────────┐
              │        │ Screenshots  │
              │        └──────┬───────┘
              │               │
              ▼               ▼
        ┌──────────────────────────────┐
        │       Technical Audits       │
        │                              │
        │ Lighthouse                   │
        │ Accessibility                │
        │ Links                        │
        │ Functionality                │
        │ Responsive                   │
        └───────────────┬──────────────┘
                        │
                        ▼
                ┌──────────────┐
                │ Gemini UI/UX  │
                │    Analysis  │
                └───────┬──────┘
                        │
                        ▼
                ┌──────────────┐
                │ Issue Images │
                │ & Annotation │
                └───────┬──────┘
                        │
                        ▼
                ┌──────────────┐
                │   Reports    │
                ├──────────────┤
                │ HTML         │
                │ PDF          │
                │ JSON         │
                │ Management   │
                └──────────────┘

🛠️ Technology Stack
Backend
- Node.js
- Express.js
Browser Automation
- Playwright
Website Analysis
- Google Lighthouse
- Custom Node.js audit modules
AI
- Google Gemini
- @google/genai
Reports
- HTML
- PDF
- JSON
Development
- JavaScript
- npm
- Git
- GitHub
📁 Project Structure
WebsiteAuditAgent/
│
├── controllers/
│   └── auditControllerV2.js
│
├── routes/
│   └── audit.js
│
├── services/
│   ├── crawler.js
│   ├── playwright.js
│   ├── lighthouse.js
│   ├── accessibility.js
│   ├── links.js
│   ├── functionality.js
│   ├── responsive.js
│   ├── uiuxBatch.js
│   └── htmlReport.js
│
├── prompts/
│   ├── uiuxPrompt.js
│   └── uiuxBatchPrompt.js
│
├── screenshots/
│
├── reports/
│
├── audit-backups/
│
├── test-tools/
│   ├── resume-test-site.js
│   └── link-verification.test.js
│
├── server.js
├── package.json
├── package-lock.json
├── .env
└── README.md
