import { NextRequest, NextResponse } from "next/server";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

async function callGroq(apiKey: string, system: string, user: string): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.2,
      max_tokens: 400,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Groq error");
  return data.choices?.[0]?.message?.content ?? "";
}

export async function POST(req: NextRequest) {
  const { notes, version, date, tone } = await req.json();
  if (!notes) return NextResponse.json({ error: "Missing notes." }, { status: 400 });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing GROQ_API_KEY." }, { status: 500 });

  const toneGuide =
    tone === "friendly"   ? "warm conversational SaaS tone, use contractions, speak to the user directly" :
    tone === "formal"     ? "formal professional documentation tone, no contractions" :
    tone === "enterprise" ? "corporate enterprise tone, polished and authoritative" :
    "technical developer-focused language";

  const versionStr = version ? `v${version.replace(/^v/, "")}` : "this release";
  const dateStr = date ? ` (${date})` : "";
  const input = notes.slice(0, 1000);

  const antiHallucination = `CRITICAL RULES:
- Only describe what is explicitly stated in the source notes. Do NOT invent benefits, metrics, outcomes, or explanations not present in the input.
- If the source says "fixed export timeout" — write exactly that. Do not say "improved reliability" unless stated.
- Do not add context, examples, or elaboration that isn't in the source.`;

  const sanitizeRules = `SANITIZATION RULES:
- Remove all internal ticket IDs (e.g. PROD-1234), customer names, employee names, project codenames, and internal jargon.
- Do not reference internal systems, architecture, or implementation details.`;

  const categories = `CATEGORIZATION RULES — use only sections that apply, in this order:
## New features, ## Improvements, ## Bug fixes, ## Security, ## API changes, ## Deprecations
Do not create sections for empty categories. Do not merge categories.`;

  const mstpRules = `MICROSOFT STYLE GUIDE (MSTP) RULES:
- Use active voice. Write "We added X" or "X lets you do Y", not "X was added" or "X has been introduced".
- Use second person. Write "you can now" not "users can now" or "customers can now".
- Use sentence case for all headings. Write "New features" not "New Features".
- Use present tense. Write "X lets you" not "X will let you" or "X has been updated to".
- No Latin abbreviations. Write "for example" not "e.g.", "that is" not "i.e.".
- Use the Oxford comma in lists.
- No exclamation marks.
- Lead with the user benefit, not the engineering action.`;

  const mstpTechnical = `MICROSOFT STYLE GUIDE (MSTP) RULES:
- Use active voice where possible.
- Use sentence case for all headings.
- Use present tense.
- No Latin abbreviations. Write "for example" not "e.g.", "that is" not "i.e.".
- Use the Oxford comma in lists.
- No exclamation marks.
- Second person and contractions are optional for technical/developer audiences.`;

  try {
    const [customer, internal, executive, changelog, highlightsRaw] = await Promise.all([

      callGroq(apiKey,
        `Write customer-facing release notes. Tone: ${toneGuide}.
${antiHallucination}
${sanitizeRules}
${mstpRules}
${categories}
Use markdown. Start with "# What's new in ${versionStr}${dateStr}".
No ticket IDs, no API parameters, no internal architecture details, no code snippets.
Only include what is directly relevant to end users. Max 150 words.`,
        input),

      callGroq(apiKey,
        `Write internal engineering release notes.
${antiHallucination}
${mstpTechnical}
${categories}
Use markdown. Start with "# Release ${versionStr}${dateStr}".
Preserve ticket IDs if present. Include technical detail, API changes, and implementation notes where stated. Max 150 words.`,
        input),

      callGroq(apiKey,
        `Write a 2-sentence executive summary.
${antiHallucination}
${mstpRules}
Plain text only, no markdown, no bullets. Focus on business value and strategic impact based only on what is stated. Under 60 words.`,
        input),

      callGroq(apiKey,
        `Write a compact changelog in markdown.
${antiHallucination}
${sanitizeRules}
${mstpTechnical}
Start with "## Changelog ${versionStr}".
Use **Added**, **Fixed**, **Improved**, **Security**, **Deprecated** as bold labels followed by bullet lists. Only include labels that have entries. Max 100 words.`,
        input),

      callGroq(apiKey,
        `List exactly 3 top highlights from this release as a JSON array of short strings (under 7 words each).
${antiHallucination}
${sanitizeRules}
Use active voice and present tense. Return ONLY the JSON array, nothing else.
Example: ["MFA support added","Dark mode launched","Export timeout fixed"]`,
        input),
    ]);

    let highlights = ["Feature released", "Performance improved", "Bugs fixed"];
    try {
      const match = highlightsRaw.match(/\[[\s\S]*\]/);
      if (match) highlights = JSON.parse(match[0]);
    } catch { /* use defaults */ }

    return NextResponse.json({ customer, internal, executive, changelog, highlights });

  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }
}
