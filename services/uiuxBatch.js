require("dotenv").config();

const fs = require("fs");
const { GoogleGenAI } = require("@google/genai");

const buildUIUXBatchPrompt = require("../prompts/uiuxBatchPrompt");
const path = require("path");
const createIssueScreenshot =
require("./issueScreenshot");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const MODEL = "gemini-flash-latest";
const MAX_RETRIES = 3;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function createIssueScreenshots(
    results,
    images
) {

    for (const result of results) {

        const image =
            images.find(
                img =>
                    img.page === result.page
            );

        if (!image) {
            continue;
        }


        if (
            !result.issues ||
            result.issues.length === 0
        ) {
            continue;
        }


        const outputDir =
            path.join(
                path.dirname(image.path),
                "uiux-issues"
            );


        if (!fs.existsSync(outputDir)) {

            fs.mkdirSync(
                outputDir,
                {
                    recursive: true
                }
            );

        }


        for (
            let i = 0;
            i < result.issues.length;
            i++
        ) {

            const issue =
                result.issues[i];


            if (!issue.target) {
                continue;
            }


            try {

              const outputPath =
    path.join(
        outputDir,
        `${issue.id}.jpg`
    );


const annotatedPath =
    await createIssueScreenshot(

        result.page,

        issue.target,

        issue.id,

        outputPath

    );


                if (annotatedPath) {

                    issue.annotatedScreenshot =
                        annotatedPath;

                    console.log(
                        `Issue screenshot created: ${issue.id}`
                    );

                }

            }

            catch (error) {

                console.log(
                    `Issue screenshot failed: ${issue.id}`,
                    error.message
                );

            }

        }

    }


    return results;
}
async function analyzeUIUXBatch(images) {

    if (!images || images.length === 0) {
        return [];
    }

    const pageNames = images.map(img => img.page);

    const prompt = buildUIUXBatchPrompt(pageNames);

    const contents = [
        {
            text: prompt
        }
    ];

    for (const image of images) {

      if (
    !image.path ||
    !fs.existsSync(image.path)
) {
    console.log(
        `Skipping UI/UX image: ${image.page} - screenshot unavailable`
    );

    continue;
}

        const bytes = fs.readFileSync(image.path);

        contents.push({
            inlineData: {
                mimeType: "image/jpeg",
                data: bytes.toString("base64")
            }
        });

    }

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

        try {

            console.log(`Batch Gemini Attempt ${attempt}/${MAX_RETRIES}`);
            console.log("Sending request...");

            const response = await Promise.race([
                ai.models.generateContent({
                    model: MODEL,
                    contents
                }),
                new Promise((_, reject) =>
                    setTimeout(
                        () => reject(new Error("Gemini timeout after 60 seconds")),
                        60000
                    )
                )
            ]);

            console.log("Gemini responded.");

            let text;

            if (typeof response.text === "function") {
                text = await response.text();
            } else {
                text = response.text;
            }

            if (!text) {
                throw new Error("Empty Gemini response");
            }

            text = text
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();

            const json = JSON.parse(text);

            if (!Array.isArray(json)) {
                throw new Error("Gemini returned invalid JSON.");
            }

            return await createIssueScreenshots(
    json,
    images
);

        }

        catch (err) {

            console.error(err.message);

            if (
                attempt < MAX_RETRIES &&
                (
                    err.message.includes("503") ||
                    err.message.includes("429") ||
                    err.message.includes("timeout")
                )
            ) {

                const wait = attempt * 5000;

                console.log(`Retrying in ${wait / 1000}s...`);

                await sleep(wait);

                continue;

            }

            break;

        }

    }

    console.log("Gemini unavailable. Returning empty results.");

    return images.map(img => ({
        page: img.page,
        strengths: [],
        issues: [],
        error: "Gemini unavailable"
    }));

}

module.exports = analyzeUIUXBatch;