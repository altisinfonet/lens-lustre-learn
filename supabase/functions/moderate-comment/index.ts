import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { comment_id, content } = await req.json();

    if (!comment_id || !content) {
      return new Response(
        JSON.stringify({ flagged: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Lovable AI gateway for content moderation
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      console.log("No AI key configured, skipping AI moderation");
      return new Response(
        JSON.stringify({ flagged: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch("https://ai-gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a content moderation AI. Analyze the following comment and determine if it should be flagged. 
Flag for: nudity/sexual content references, hate speech, severe harassment, spam/advertising, phishing attempts, or threats.
Do NOT flag for: mild disagreements, opinions, constructive criticism, or casual language.
Respond with JSON only: {"flagged": true/false, "reason": "brief reason if flagged", "category": "nudity|hate|harassment|spam|threat|clean"}`
          },
          { role: "user", content: `Comment to moderate: "${content}"` }
        ],
        temperature: 0.1,
        max_tokens: 100,
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI moderation failed:", await aiResponse.text());
      return new Response(
        JSON.stringify({ flagged: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const aiText = aiData.choices?.[0]?.message?.content || "";

    // Parse AI response
    let result = { flagged: false, reason: "", category: "clean" };
    try {
      const cleaned = aiText.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      console.log("Could not parse AI response:", aiText);
    }

    // If AI flagged it, update the comment in DB
    if (result.flagged) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      await supabase
        .from("image_comments")
        .update({
          is_flagged: true,
          flag_reason: `AI: ${result.category} - ${result.reason}`,
        })
        .eq("id", comment_id);

      console.log(`Comment ${comment_id} flagged: ${result.category}`);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Moderation error:", err);
    return new Response(
      JSON.stringify({ flagged: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
