import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generates a single ad-creative image via OpenAI's Images API (gpt-image-2)
// from a marketer-written image description, and returns it as a base64
// data URL ready to drop straight into an <img src>.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, vertical } = await req.json();
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return new Response(JSON.stringify({ error: "Опис зображення порожній" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    // 1024x1536 (portrait) for TikTok-style 9:16 sources, 1024x1024 square
    // otherwise — both are natively supported gpt-image-2 sizes.
    const size = vertical ? "1024x1536" : "1024x1024";

    const fullPrompt = `Рекламне крео-зображення для соцмереж (Meta/TikTok). ${prompt}. Без будь-якого тексту, логотипів чи водяних знаків на зображенні — тільки візуал. Фотореалістичний, привабливий, комерційна якість.`;

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-2",
        prompt: fullPrompt,
        size,
        n: 1,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("OpenAI Images API error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Занадто багато запитів, спробуйте пізніше." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 401 || response.status === 403) {
        return new Response(JSON.stringify({ error: "Проблема з OpenAI API ключем (перевірте налаштування)." }), {
          status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Помилка генерації зображення" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      console.error("OpenAI Images API returned no image data:", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "Зображення не отримано" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ image: `data:image/png;base64,${b64}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
