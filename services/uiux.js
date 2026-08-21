require("dotenv").config();

const fs = require("fs");
const { GoogleGenAI } = require("@google/genai");

const buildUIUXPrompt = require("../prompts/uiuxPrompt");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const MODEL = "gemini-flash-latest";
const MAX_RETRIES = 3;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function analyzeUIUX(imagePath) {

    const imageBytes = fs.readFileSync(imagePath);

    const prompt = buildUIUXPrompt();

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

        try {

            console.log(`Gemini Attempt ${attempt}/${MAX_RETRIES}`);

            const response = await ai.models.generateContent({

                model: MODEL,

                contents: [

                    {
                        text: prompt
                    },

                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: imageBytes.toString("base64")
                        }
                    }

                ]

            });

            let text = response.text;

            if (!text) {

                throw new Error("Empty Gemini response");

            }

            // Remove markdown if Gemini returns it
            text = text
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();

            return JSON.parse(text);

        }

        catch (err) {

            console.error(`Gemini Error (Attempt ${attempt})`);

            console.error(err.message);

            const message = err.message || "";

            // Retry only for temporary errors
            if (

                attempt < MAX_RETRIES &&

                (
                    message.includes("429") ||
                    message.includes("RESOURCE_EXHAUSTED") ||
                    message.includes("503") ||
                    message.includes("timeout")
                )

            ) {

                const delay = attempt * 10000;

                console.log(
                    `Retrying in ${delay / 1000} seconds...`
                );

                await sleep(delay);

                continue;

            }

            return {

                strengths: [],

                issues: [],

                error: message

            };

        }

    }

    return {

        strengths: [],

        issues: [],

        error: "Maximum retry attempts exceeded."

    };

}

module.exports = analyzeUIUX;