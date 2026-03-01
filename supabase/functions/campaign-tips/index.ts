import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { niche, channel, leadType, decomposition } = await req.json();
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

    const goalLabel = goalLabels[channel] || channel || "не вказано";
    const ltLabel = leadType ? (leadTypeLabels[leadType] || leadType) : "";

    // Build decomposition context
    let decompContext = "";
    if (decomposition) {
      const r = decomposition.realistic;
      if (r) {
        decompContext = `
Дані декомпозиції (реалістичний сценарій):
- Бюджет: ${r.budget || 0} ₴
- CPM: ${r.cpm || 0} ₴
- CTR: ${r.ctr || 0}%
- Конверсія лендінгу: ${r.landingConversion || 0}%
- Конверсія в покупку: ${r.conversionRate || 0}%
- Середній чек: ${r.averageCheck || 0} ₴
- Маржинальність: ${r.marginality || 0}%`;
      }
    }

    const systemPrompt = `Ти — експерт з Facebook/Meta реклами та маркетингових воронок. Давай конкретні, практичні рекомендації українською мовою. Структуруй відповідь з емодзі. Будь конкретним — давай цифри та приклади.`;

    const userPrompt = `Ніша: ${niche || "не вказано"}
Ціль кампанії: ${goalLabel}
${ltLabel ? `Тип лідгену: ${ltLabel}` : ""}
${decompContext}

На основі цих даних дай детальні рекомендації:

1. 🎯 **Які кампанії запускати** — скільки кампаній, з якими цілями, як розподілити бюджет між ними
2. 👥 **Які аудиторії таргетувати** — конкретні інтереси, LAL, ретаргетинг, демографія. Дай 5-7 конкретних прикладів інтересів для цієї ніші
3. 🎨 **Які креативи готувати** — формати (статика, відео, каруселі), кількість варіантів для A/B тестів
4. 📊 **Структура адсетів** — скільки адсетів на кампанію, як розподілити бюджет
5. ⚡ **Швидкі поради** — 3 конкретні поради для підвищення ефективності саме в цій ніші

Формат: структурований список з підпунктами. Без вступу, одразу до справи.`;

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
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
