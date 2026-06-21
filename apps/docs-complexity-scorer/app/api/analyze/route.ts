import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { text, audience } = await req.json();
  if (!text || !audience) return NextResponse.json({ error: "Missing text or audience." }, { status: 400 });
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing GROQ_API_KEY." }, { status: 500 });

  const audienceLabel = audience === "general" ? "non-technical readers" : audience === "technical" ? "developers" : "mixed audiences";

  const systemPrompt = `You are a technical writing expert scoring documentation against the Microsoft Style Guide (MSTP). Audience: ${audienceLabel}. Return ONLY valid JSON, no markdown, no code fences.

Return exactly this structure:
{"mstpScore":0,"grade":"Good","cognitiveLoad":"Medium","cognitiveLoadReason":"short reason","metrics":{"avgSentenceLength":0,"passiveVoicePercent":0,"jargonDensity":0,"secondPersonPercent":0},"violations":[{"sentence":"short sentence","rule":"Use active voice","detail":"short fix","severity":"high"}],"jargonTerms":["word"],"suggestions":[{"original":"short phrase","rewrite":"better version","rule":"Use active voice","type":"passive"}],"summary":"Two sentences max."}

Rules:
- mstpScore: 0-100, 100 = perfect MSTP compliance
- grade: "Excellent" if 85+, "Good" if 65-84, "Needs Work" if 40-64, "Poor" if under 40
- cognitiveLoad: "Low", "Medium", "High", or "Very High"
- cognitiveLoadReason: max 5 words
- avgSentenceLength: integer, MSTP target under 25
- passiveVoicePercent: 0-100
- jargonDensity: 0-100
- secondPersonPercent: 0-100, MSTP prefers "you" over "the user"
- violations: max 3 items, severity is "low" "medium" or "high", sentences under 80 chars, no URLs
- jargonTerms: max 5 items
- suggestions: max 3 items, type is one of "passive" "jargon" "length" "person" "clarity"
- summary: max 2 sentences`;

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text.slice(0, 1500) },
        ],
        temperature: 0.1,
        max_tokens: 1500,
      }),
    });

    const data = await groqRes.json();
    console.log("Groq status:", groqRes.status);

    if (!groqRes.ok) {
      console.error("Groq error:", data.error?.message);
      return NextResponse.json({ error: data.error?.message ?? "Groq request failed." }, { status: 500 });
    }

    const raw = data.choices?.[0]?.message?.content ?? "";
    console.log("Raw:", raw);

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in response");

    let parsed;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      const fixed = match[0].replace(/,\s*([\]}])/g, "$1");
      parsed = JSON.parse(fixed);
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json({ error: "Analysis failed. Please try again." }, { status: 500 });
  }
}
