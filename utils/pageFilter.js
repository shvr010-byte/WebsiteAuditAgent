function shouldAnalyzeUIUX(url) {

    const pathname = new URL(url).pathname.toLowerCase();

    const skipPatterns = [

        "/blog",
        "/blogs",
        "/article",
        "/articles",
        "/news",
        "/insights",
        "/resources",

        "/privacy",
        "/privacy-policy",

        "/terms",
        "/terms-and-conditions",

        "/cookie",
        "/cookies",

        "/sitemap",

        "/feed",

        "/author",

        "/category",

        "/tag",

        "/search/",

        "/login",

        "/register",

        "/account",

        "/cart",

        "/checkout"

    ];

    for (const pattern of skipPatterns) {

        if (pathname.includes(pattern)) {
            return false;
        }

    }

    return true;

}

module.exports = {
    shouldAnalyzeUIUX
};