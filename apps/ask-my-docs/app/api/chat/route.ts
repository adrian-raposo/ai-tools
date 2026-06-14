import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { question, chunks } = await req.json();

    if (!question || !chunks?.length) {
      return NextResponse.json({ error: "Missing question or context" }, { status: 400 });
    }

    const context = chunks
      .map((c: { text: string; source: string }) => `[Source: ${c.source}]\n${c.text}`)
      .join("\n\n");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that answers questions based strictly on the provided documentation. 
If the answer is not in the documentation, say so clearly. 
Do not include inline source citations in your answer. Sources are shown separately in the UI.`,
          },
          {
            role: "user",
            content: `Documentation context:\n\n${context}\n\nQuestion: ${question}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message || "Groq API error" }, { status: 500 });
    }

    return NextResponse.json({
      answer: data.choices[0].message.content,
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
