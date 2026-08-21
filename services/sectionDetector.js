async function detectSection(page, selector) {

    try {

        return await page.$eval(selector, (element) => {

            // 1. Look for nearest section
            let parent = element.closest("section");

            if (parent) {

                return (
                    parent.id ||
                    parent.className ||
                    "Unnamed Section"
                );

            }

            // 2. Look for form
            parent = element.closest("form");

            if (parent) {
                return "Contact Form";
            }

            // 3. Look for navigation
            parent = element.closest("nav");

            if (parent) {
                return "Navigation";
            }

            // 4. Look for header
            parent = element.closest("header");

            if (parent) {
                return "Header";
            }

            // 5. Look for footer
            parent = element.closest("footer");

            if (parent) {
                return "Footer";
            }

            // 6. Look for main
            parent = element.closest("main");

            if (parent) {
                return "Main Content";
            }

            return "Unknown";

        });

    } catch {

        return "Unknown";

    }

}

module.exports = detectSection;