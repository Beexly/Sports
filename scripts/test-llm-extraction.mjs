import * as fs from 'fs';

async function testAimlApi() {
  const apiKey = process.env.AIMLAPI_API_KEY;
  if (!apiKey) {
    console.log("No AIMLAPI_API_KEY");
    return;
  }
  
  const sampleAbstract = `Historically, statistical analysis of offensive lineman has been hindered by the lack of easily measurable quantities. More recently, with the introduction of player tracking data new methodological advances are now possible. Using high-dimensional spatio-temporal data, we adapt defensive-matchup Hidden Markov Models to estimate pass-blocking assignments in real time. We find that offensive lines with high assignment entropy suffer an increase of 28% in pressure rate against simulated defensive blitzes.`;

  const prompt = `You are a sports science & football analytics extraction engine.
Extract the core empirical quantitative finding from the abstract below.
Output ONLY a JSON object with this schema:
{
  "principle_name": string (grounded strictly in what the abstract investigated, e.g. "HMM Defensive Stunt Attribution & Pass Protection Pressure"),
  "numeric_claim": {
    "value": number (the exact number mentioned in the quote, e.g. 28),
    "unit": string (e.g. "%", "yards", "seconds", "bps"),
    "metric": string (e.g. "pressure rate increase")
  },
  "evidence_quote": string (EXACT verbatim substring from the abstract <= 240 chars containing the number and finding),
  "applicable_context_fields": array of strings (e.g. ["ol_continuity", "trench", "pass_rush"]),
  "influence_description": string (e.g. "Adjusts expected QB sack rate and pressure when facing simulated blitz fronts.")
}
CRITICAL RULES:
1. "evidence_quote" MUST BE A STRICT LITERAL VERBATIM SUBSTRING of the abstract text.
2. The number in numeric_claim.value MUST literally appear in the evidence_quote.

Abstract:
${sampleAbstract}
`;

  try {
    const res = await fetch("https://api.aimlapi.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.0
      })
    });
    
    const data = await res.json();
    console.log("AIMLAPI Status:", res.status);
    if (data.choices && data.choices[0]) {
      const text = data.choices[0].message.content;
      console.log("Extracted:\n", text);
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      const quote = parsed.evidence_quote;
      console.log("Exact Substring Check:", sampleAbstract.includes(quote) ? "PASS (Verbatim)" : "FAIL");
      console.log("Number in Quote Check:", quote.includes(String(parsed.numeric_claim.value)) ? "PASS (Number in quote)" : "FAIL");
    } else {
      console.log("Error:", JSON.stringify(data));
    }
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
}

testAimlApi();
