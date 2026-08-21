async function inspectElement(page, selector) {

    try {

        return await page.$eval(selector, element => {

            const rect = element.getBoundingClientRect();

            return {

                tag: element.tagName.toLowerCase(),

                html: element.outerHTML,

                text: element.innerText || "",

                x: Math.round(rect.x),

                y: Math.round(rect.y),

                width: Math.round(rect.width),

                height: Math.round(rect.height),

                visible:
                    rect.width > 0 && rect.height > 0

            };

        });

    } catch {

        return null;

    }

}

module.exports = inspectElement;