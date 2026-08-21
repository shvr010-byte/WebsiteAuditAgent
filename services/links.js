const blc = require("broken-link-checker");

async function checkBrokenLinks(url) {

    return new Promise((resolve) => {

        const brokenLinks = [];
        const redirects = [];
        const visited = new Set();

        let finished = false;
        let checkerFinished = false;


        // --------------------------------------------
        // SAFE RESULT
        // --------------------------------------------

        function finish(extra = {}) {

            if (finished) {
                return;
            }

            finished = true;

            clearTimeout(timeout);

            resolve({

                scanned:
                    visited.size,

                broken:
                    brokenLinks.length,

                redirects:
                    redirects.length,

                brokenLinks,

                redirectsList:
                    redirects,

                ...extra

            });

        }


        // --------------------------------------------
        // VALIDATE MAIN URL
        // --------------------------------------------

        try {

            new URL(url);

        }

        catch (error) {

            finish({

                error:
                    "Invalid page URL"

            });

            return;

        }


        // --------------------------------------------
        // SAFETY TIMEOUT
        // --------------------------------------------

        const timeout =
            setTimeout(() => {

                console.log(
                    "Broken link check timeout:",
                    url
                );

                finish({

                    timeout:
                        true

                });

            }, 20000);


        // --------------------------------------------
        // CHECKER
        // --------------------------------------------

        let siteChecker;


        try {

            siteChecker =
                new blc.SiteChecker(

                    {

                        excludeExternalLinks:
                            true,

                        filterLevel:
                            1,

                        requestMethod:
                            "head",

                        honorRobotExclusions:
                            false,

                        maxSocketsPerHost:
                            5,

                        maxRedirects:
                            3

                    },

                    {

                        link(result) {

                            try {

                                if (
                                    !result ||
                                    !result.url ||
                                    !result.url.resolved
                                ) {

                                    return;

                                }


                                const link =
                                    result.url.resolved;


                                // --------------------------------
                                // EXTRA URL VALIDATION
                                // --------------------------------

                                try {

                                    new URL(link);

                                }

                                catch {

                                    console.log(
                                        "Skipping malformed link:",
                                        link
                                    );

                                    return;

                                }


                                if (
                                    visited.has(link)
                                ) {

                                    return;

                                }


                                visited.add(link);


                                // --------------------------------
                                // BROKEN
                                // --------------------------------

                                if (
                                    result.broken
                                ) {

                                    brokenLinks.push({

                                        url:
                                            link,

                                        reason:
                                            result.brokenReason ||
                                            "Unknown",

                                        status:
                                            result.http?.response
                                                ?.statusCode ||
                                            null

                                    });

                                }


                                // --------------------------------
                                // REDIRECT
                                // --------------------------------

                                const status =
                                    result.http?.response
                                        ?.statusCode;


                                if (
                                    status >= 300 &&
                                    status < 400
                                ) {

                                    redirects.push({

                                        url:
                                            link,

                                        status

                                    });

                                }

                            }

                            catch (error) {

                                console.log(
                                    "Broken-link result skipped:",
                                    error.message
                                );

                            }

                        },


                        end() {

                            checkerFinished =
                                true;

                            finish();

                        },


                        error(error) {

                            checkerFinished =
                                true;

                            console.log(
                                "Broken Link Checker:",
                                error.message
                            );

                            finish({

                                error:
                                    error.message

                            });

                        }

                    }

                );


            // --------------------------------------------
            // START
            // --------------------------------------------

            siteChecker.enqueue(url);

        }

        catch (error) {

            finish({

                error:
                    error.message

            });

        }

    });

}


module.exports =
    checkBrokenLinks;