const auditSchema = {

    metadata: {

        website: "",

        page: "",

        pageTitle: "",

        pageType: "",

        crawledAt: "",

        auditDuration: 0

    },

    screenshots: {

        desktop: "",

        mobile: "",

        uiux: []

    },

    metrics: {

        performance: 0,

        accessibility: 0,

        seo: 0,

        bestPractices: 0,

        lcp: "",

        cls: "",

        fcp: "",

        speedIndex: ""

    },

    issues: [],

    consoleErrors: [],

    networkErrors: [],

    brokenLinks: [],

    recommendations: []

};

module.exports = auditSchema;