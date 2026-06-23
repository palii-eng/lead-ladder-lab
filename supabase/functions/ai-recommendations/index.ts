import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { niche, channel, leadTypes } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const goalLabels: Record<string, string> = {
      awareness: "Упізнаваність",
      traffic: "Трафік",
      engagement: "Взаємодія",
      leads: "Ліди",
      app_promotion: "Просування додатка",
      sales: "Продажі",
    };

    const leadTypeLabels: Record<string, string> = {
      leadform: "Лідформи",
      quiz: "Квізи",
      landing: "Лендінг",
    };

    const goalLabel = goalLabels[channel] || channel;
    const leadTypesText = (leadTypes || []).map((lt: string) => leadTypeLabels[lt] || lt).join(", ");

    const systemPrompt = `ВАЖЛИВО: не представляйся, не пиши хто ти, не задавай уточнюючих питань, не пиши вступів типу "Звісно" чи "Ось". Одразу починай з рекомендацій по ділу. Ти — експерт з Facebook/Meta реклами. Давай конкретні, практичні рекомендації українською мовою. Будь лаконічним — максимум 5-7 пунктів. Використовуй емодзі для структурування.`;

    const userPrompt = `Ніша: ${niche || "не вказано"}
Ціль кампанії: ${goalLabel}
${leadTypesText ? `Типи лідгену: ${leadTypesText}` : ""}

Дай рекомендації:
1. Скільки рекламних аудиторій створити і які типи (LAL, інтереси, ретаргетинг)
2. Скільки креативів підготувати (статика, відео, каруселі)
3. Рекомендації по структурі кампанії (кількість адсетів, бюджет на тест)

Формат: короткий список з емодзі, без вступу.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Занадто багато запитів, спробуйте пізніше." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Необхідно поповнити кредити." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI помилка" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ recommendation: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
