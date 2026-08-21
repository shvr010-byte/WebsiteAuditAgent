async function buildContext(page, selector) {

    try {

        return await page.$eval(selector, (element) => {

            const heading =
                element.closest("section")?.querySelector("h1,h2,h3,h4,h5,h6");

            return {

                pageTitle: document.title,

                section:
                    element.closest("section")?.id ||
                    element.closest("section")?.className ||
                    "Unknown",

                heading:
                    heading?.innerText || "",

                html:
                    element.outerHTML,

                text:
                    element.innerText || ""

            };

        });

    } catch {

        return {

            pageTitle: "",

            section: "Unknown",

            heading: "",

            html: "",

            text: ""

        };

    }

}

module.exports = buildContext;