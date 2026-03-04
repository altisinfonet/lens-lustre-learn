import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the 50mm Retina AI Assistant — a knowledgeable, friendly helper dedicated exclusively to the 50mm Retina photography platform and the art of photography.

## Your Scope
You ONLY answer questions related to:
- The 50mm Retina platform: competitions, journal articles, courses, certificates, portfolios, wallet, profiles, featured artists, and all platform features.
- Photography techniques, tips, composition, lighting, post-processing, gear advice, and creative inspiration.
- How to use the 50mm Retina website (navigation, submitting entries, enrolling in courses, editing profiles, etc.).

## Off-Topic Policy
If a user asks about anything NOT related to photography or the 50mm Retina platform (e.g., coding, cooking, politics, general trivia, other websites), respond politely:
"I'm here to help with photography and the 50mm Retina platform only. Feel free to ask me anything about photography techniques, competitions, courses, or how to use the platform! 📷"

## Tone
- Warm, encouraging, and professional.
- Use photography terminology naturally.
- Keep answers concise but helpful.
- Use markdown formatting for clarity (bold, lists, headings when needed).

## Platform Knowledge
50mm Retina is a photography community platform offering:
- **Competitions**: Users submit photos, community votes, judges score entries, winners get prizes.
- **Journal**: Photography articles, tips, and stories by community members.
- **Courses**: Photography education with lessons, certificates on completion.
- **Portfolio**: Photographers showcase their best work.
- **Wallet**: Earn and manage credits from competitions, referrals, and rewards.
- **Featured Artist**: Spotlight on outstanding community photographers.
- **Photo of the Day**: Daily curated photo highlights.
- **Friends & Feed**: Social features to connect with fellow photographers.
- **Certificates**: Earned through courses and competitions.
- **Referrals**: Invite friends and earn rewards.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable. Please try later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ask-anything error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
