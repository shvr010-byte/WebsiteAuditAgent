require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const buildTechnicalPrompt = require("../prompts/technicalPrompt");

async function generateTechnicalReport(audit) {

    const prompt = buildTechnicalPrompt(audit);

    const response = await ai.models.generateContent({

        model: "gemini-flash-latest",

        contents: prompt

    });

    return response.text;

}

module.exports = {
    generateTechnicalReport
};