import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      niche,
      companyDescription,
      clientBrief,
      decomposition,
      emailCount,
      channel,
      leadType,
      salesChannel,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const base = Number(emailCount) || 0;

    // ESP cost tiers (approx UAH/month based on typical global ESPs converted)
    let espCost = "0–500 ₴/міс (безкоштовні тарифи більшості ESP)";
    if (base > 500 && base <= 2500) espCost = "≈ 500–1 200 ₴/міс";
    else if (base > 2500 && base <= 10000) espCost = "≈ 1 200–3 500 ₴/міс";
    else if (base > 10000 && base <= 50000) espCost = "≈ 3 500–12 000 ₴/міс";
    else if (base > 50000) espCost = "≈ 12 000–40 000+ ₴/міс залежно від сервісу";

    const decompCtx = decomposition?.positive
      ? `Середній чек: ${decomposition.positive.averageCheck || 0} ₴, конверсія в покупку: ${decomposition.positive.conversionRate || 0}%, маржинальність: ${decomposition.positive.marginality || 0}%.`
      : "";

    const briefCtx = clientBrief
      ? `Клієнт: ${clientBrief.name || ""}. ${clientBrief.description || ""}`
      : "";

    const systemPrompt = `Ти — досвідчений email-маркетолог з 10+ роками практики в СНД та EU ринках. Даєш конкретні, практичні поради українською мовою під конкретний бізнес. Не представляйся, не пиши вступів. Одразу по суті. Використовуй markdown зі заголовками ## та списками. Додай емодзі для структурування. Всі поради мають бути прив'язані до ніші та брифу клієнта — жодних загальних фраз.`;

    const userPrompt = `Проаналізуй проект і як email-маркетолог склади персоналізовану email-стратегію.

**Контекст:**
- Ніша: ${niche || "не вказано"}
- ${briefCtx}
- Опис компанії: ${companyDescription || "не вказано"}
- Канал реклами: ${channel || "-"}${leadType ? ` / ${leadType}` : ""}
- Канал продажів: ${salesChannel || "не вказано"}
- ${decompCtx}
- **Email-база: ${base} контактів**
- Оцінка вартості ESP-сервісу (Mailchimp/GetResponse/eSputnik/Unisender): ${espCost}

**Склади стратегію у форматі markdown з такими розділами:**

## 🎯 Ключова мета email-маркетингу для цього проекту
1–2 речення чому саме email критичний для цієї ніші.

## 📬 Welcome-воронка
Скільки листів, теми кожного, орієнтовний Open Rate, як прогріває саме під цю нішу/оффер.

## 🔥 Воронка прогріву
Скільки листів, які кейси/болі/аргументи використати саме для цієї цільової.

## 💰 Воронка дожиму (для тих, хто не купив)
Скільки листів, які тригери, бонуси/FOMO під цей середній чек.

## 📅 Регулярні розсилки
Скільки на місяць, теми контенту саме під цю нішу.

## 🔁 Реактивація
Коли запускати, скільки листів.

## 💵 Економіка та ROI
Обчисли конкретні цифри під базу ${base} контактів:
- Скільки листів на місяць всього (welcome + прогрів + дожим + регулярні).
- Прогноз open rate 20–25%, CTR 2–3%, конверсія в покупку 1–3% від відкриттів.
- Скільки продажів на місяць з бази при середньому чеку з декомпозиції.
- Скільки виручки на місяць (діапазон: песимістичний / реалістичний / оптимістичний).
- Вартість ESP: ${espCost}.
- Орієнтовна вартість роботи email-маркетолога/копірайтера: 8 000–25 000 ₴/міс залежно від обсягу.
- **ROMI email-каналу** (виручка / витрати).

## ⚡ Топ-3 quick wins
Що зробити першими на цьому тижні.

Пиши стисло, по ділу, з конкретними цифрами.`;

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
