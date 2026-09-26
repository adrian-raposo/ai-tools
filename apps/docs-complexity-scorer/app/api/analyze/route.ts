import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, audience } = body;
    if (!text || !audience) return NextResponse.json({ error: "Missing text or audience." }, { status: 400 });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing GROQ_API_KEY." }, { status: 500 });

    const audienceLabel = audience === "general" ? "non-technical readers" : audience === "technical" ? "developers" : "mixed audiences";

    const systemPrompt = `You are a technical writing expert. Score this documentation against the Microsoft Style Guide. Audience: ${audienceLabel}. Return ONLY a JSON object, no markdown, no code fences.

JSON structure:
{"mstpScore":75,"grade":"Good","cognitiveLoad":"Medium","cognitiveLoadReason":"some reason","metrics":{"avgSentenceLength":18,"passiveVoicePercent":15,"jargonDensity":10,"secondPersonPercent":60},"violations":[{"sentence":"example sentence","rule":"Use active voice","detail":"rewrite in active voice","severity":"medium"}],"jargonTerms":["term1","term2"],"suggestions":[{"original":"original phrase","rewrite":"better phrase","rule":"Use active voice","type":"passive"}],"summary":"This document is moderately complex. Consider simplifying sentence structure."}`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text.slice(0, 1000) },
        ],
        temperature: 0.1,
        max_tokens: 800,
      }),
    });

    if (!groqRes.ok) {
      const errData = await groqRes.json();
      return NextResponse.json({ error: errData.error?.message ?? "Groq request failed." }, { status: 500 });
    }

    const data = await groqRes.json();
    const raw = data.choices?.[0]?.message?.content ?? "";

    if (!raw) return NextResponse.json({ error: "Empty response from model" }, { status: 500 });

    // Strip think tags if present
    const stripped = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    const match = stripped.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: `No JSON found: ${stripped.slice(0, 200)}` }, { status: 500 });

    const parsed = JSON.parse(match[0].replace(/,\s*([\]}])/g, "$1"));
    return NextResponse.json(parsed);

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
