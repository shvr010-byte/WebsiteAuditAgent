function buildUIUXPrompt() {

return `

You are a Senior UI/UX Designer.

Analyze this website screenshot.

Return ONLY valid JSON.

{
  "strengths":[
    "..."
  ],
  "issues":[
    {
      "id":"UI-001",
      "section":"Hero Banner",
      "severity":"High",
      "issue":"Describe the UI problem.",
      "recommendation":"How to fix it.",
      "target":{
        "tag":"button",
        "text":"Get Started",
        "selectorHint":".hero button"
      }
    }
  ]
}

Rules:

- Return JSON only.
- No markdown.
- No explanations.
- Never invent screenshots.
- selectorHint should be your best CSS selector guess.
- If text is visible, include it.

`;

}

module.exports = buildUIUXPrompt;