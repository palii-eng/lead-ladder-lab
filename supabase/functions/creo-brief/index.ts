import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { format, videoFormat, niche, channel, clientBrief, decomposition } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const goalLabels: Record<string, string> = {
      awareness: "Упізнаваність", traffic: "Трафік", engagement: "Взаємодія",
      leads: "Ліди", app_promotion: "Просування додатка", sales: "Продажі",
    };
    const goalLabel = goalLabels[channel] || channel || "не вказано";
    const clientCtx = clientBrief?.name ? `Клієнт: ${clientBrief.name}${clientBrief.task ? ` — ${clientBrief.task}` : ""}` : "";
    const r = decomposition?.realistic;
    const decompCtx = r ? `Бюджет: ${r.budget || 0} ₴, середній чек: ${r.averageCheck || 0} ₴, CPL: ${r.cpl || 0} ₴` : "";

    let schemaDescription = "";
    if (format === "static") {
      schemaDescription = `Поверни JSON з полями:
- h1 (string): сильний заголовок (до 60 символів)
- subtitle (string): підзаголовок (до 80 символів, опціонально)
- imageDesc (string): детальний опис основного зображення (2-4 речення: композиція, об'єкти, стиль, колірна гамма, настрій)`;
    } else if (format === "carousel") {
      schemaDescription = `Поверни JSON з полями:
- h1 (string): сильний заголовок (до 60 символів)
- subtitle (string): підзаголовок (опціонально, до 80 символів)
- cards (string): рекомендована кількість карток (число від 3 до 7, як рядок)
- imageDesc (string): опис єдиного візуального стилю всіх карток
- logic (string): єдина логіка карток — за яким принципом вони побудовані (наприклад: переваги, кроки, до/після, проблема→рішення)`;
    } else if (format === "video") {
      const vfLabels: Record<string, string> = {
        ugc: "UGC", unboxing: "Распаковка", product: "Демонстрація продукту",
        review: "Відгук", ba: "До-Після", story: "Сторітелінг",
      };
      schemaDescription = `Формат відео: ${vfLabels[videoFormat] || videoFormat || "не вказано"}.
Поверни JSON з полями:
- script (string): детальний сценарій сцена за сценою (4-6 сцен з таймкодами в дужках, наприклад "(0-3 сек) ..."). Зачіпка в перші 3 секунди обов'язкова.
- timing (string): рекомендована тривалість у секундах (число до 30, як рядок)`;
    } else {
      throw new Error("Unknown format");
    }

    const systemPrompt = `ВАЖЛИВО: не представляйся, не пиши хто ти, не задавай уточнюючих питань, не пиши вступів типу "Звісно" чи "Ось". Одразу починай з рекомендацій по ділу. Ти — креативний директор перформанс-агентства. Створюєш сильні брифи для Meta/TikTok крео українською мовою. Конкретно, без води, з продаючим тоном.`;
    const userPrompt = `Ніша: ${niche || "не вказано"}
Ціль кампанії: ${goalLabel}
${clientCtx}
${decompCtx}

Створи ТЗ для крео. ${schemaDescription}

Поверни ТІЛЬКИ JSON-об'єкт без markdown-обгортки, без пояснень.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
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
    const content = data.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    return new Response(JSON.stringify({ fields: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
