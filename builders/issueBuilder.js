let counters = {
    ACC: 1,
    PERF: 1,
    SEO: 1,
    UI: 1,
    LINK: 1,
    JS: 1,
    NET: 1
};

function createIssue({
    category,
    page,
    section,
    severity,
    title,
    description,
    element,
    selector,
    recommendation,
    example,
    screenshot = null
}) {

    const prefix = category.toUpperCase();

    const id = `${prefix}-${String(counters[prefix]++).padStart(3, "0")}`;

    return {
        id,
        category,
        page,
        section,
        severity,
        title,
        description,
        element,
        selector,
        recommendation,
        example,
        screenshot
    };
}

module.exports = {
    createIssue
};