import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSecureHeaders } from "../_shared/secureHeaders.ts";

serve(async (req) => {
  const headers = getSecureHeaders(req);

  if (req.method === "OPTIONS") return new Response(null, { headers });
  // Block TRACE method
  if (req.method === "TRACE") return new Response("Method Not Allowed", { status: 405, headers });

  try {
    const { texts, targetLanguage } = await req.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0 || !targetLanguage) {
      return new Response(JSON.stringify({ error: "texts (array) and targetLanguage are required" }), {
        status: 400, headers,
      });
    }

    if (targetLanguage === "English") {
      return new Response(JSON.stringify({ translations: texts }), { status: 200, headers });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const batch = texts.slice(0, 50);
    const numberedTexts = batch.map((t: string, i: number) => `[${i}] ${t}`).join("\n");

    const systemPrompt = `You are a translation engine. Translate the following numbered texts from English to ${targetLanguage}. 
Return ONLY a valid JSON array of translated strings in the same order. No explanations, no markdown, no code blocks.
Preserve any HTML tags, placeholders like {name}, and special characters exactly as they are.
If a text is a single word or short phrase, translate it naturally for UI context (buttons, labels, menus).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: numberedTexts },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), { status: 429, headers });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), { status: 402, headers });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Translation service unavailable" }), { status: 500, headers });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    let translations: string[];
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      translations = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse translation response:", content);
      translations = batch;
    }

    return new Response(JSON.stringify({ translations }), { status: 200, headers });
  } catch (e) {
    console.error("translate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers }
    );
  }
});
