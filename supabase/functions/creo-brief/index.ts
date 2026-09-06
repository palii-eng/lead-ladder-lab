import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { format, videoFormat, niche, channel, clientBrief, decomposition } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

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
- h1 (string): сильний конкретний заголовок (до 60 символів) — без кліше, б'є в конкретну вигоду/біль аудиторії
- subtitle (string): підзаголовок (до 80 символів, опціонально)
- imageDesc (string): бриф для БАНЕРА з текстом на зображенні (не проста фотографія-ілюстрація): де і як розміщений текстовий блок із заголовком (кут, розмір шрифту відносно кадру, колір/контраст тексту до фону), фонова сцена/об'єкти, стиль, колірна гамма, настрій — 3-5 речень`;
    } else if (format === "carousel") {
      schemaDescription = `Поверни JSON з полями:
- h1 (string): сильний конкретний заголовок (до 60 символів) — без кліше, б'є в конкретну вигоду/біль аудиторії
- subtitle (string): підзаголовок (опціонально, до 80 символів)
- cards (string): рекомендована кількість карток (число від 3 до 7, як рядок)
- imageDesc (string): опис єдиного стилю БАНЕРА з текстом (розміщення тексту, шрифт, контраст) для всіх карток
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

    const systemPrompt = `Ти — топовий креативний директор performance-агентства (10+ років у Meta/TikTok Ads), який пише ТЗ для дизайнерів так, щоб крео реально конвертило.

СУВОРІ ПРАВИЛА:
- НЕ представляйся, не пиши вступів типу "Звісно" чи "Ось".
- НІКОЛИ не використовуй заїжджені шаблонні фрази-кліше на кшталт "Занурся у світ...", "Відкрий для себе...", "Це саме те, що тобі потрібно", "Ласкаво просимо" — вони убивають конверсію.
- Заголовок (h1) має бути КОНКРЕТНИМ і бити в реальний біль/вигоду цільової аудиторії цієї ніші — цифра, дедлайн, вигода або гострий інсайт, а не загальне запрошення. Приклад різниці: погано — "Занурся у світ танцю!"; добре — "Перший крок за 60 хвилин — навіть якщо у вас 2 ліві ноги".
- Уникай зборки речень навколо імені клієнта як хука (типу "... з [Ім'я]!") — ім'я експерта не продає саме по собі, продає результат/вигода для клієнта.
- imageDesc пиши як бриф для банера, що МІСТИТЬ текст заголовка на зображенні (не просто фотоілюстрація) — опиши композицію, де розміщується текстовий блок, контраст, шрифт, стиль, кольори, і сам об'єкт/сцену навколо.
- Будь максимально конкретним для цієї ніші і цільової аудиторії — жодних загальних фраз, які підійшли б будь-якому бізнесу.`;
    const userPrompt = `Ніша: ${niche || "не вказано"}
Ціль кампанії: ${goalLabel}
${clientCtx}
${decompCtx}

Створи ТЗ для крео. ${schemaDescription}

Поверни ТІЛЬКИ JSON-об'єкт без markdown-обгортки, без пояснень.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
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
      if (response.status === 401 || response.status === 403) {
        return new Response(JSON.stringify({ error: "Проблема з OpenAI API ключем (перевірте налаштування)." }), {
          status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("OpenAI API error:", response.status, t);
      return new Response(JSON.stringify({ error: `AI помилка (${response.status}): ${t.slice(0, 300)}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      // The model sometimes wraps JSON in a markdown code fence despite
      // response_format: json_object — strip ```json / ``` fences and retry
      // before giving up.
      const stripped = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      try { parsed = JSON.parse(stripped); } catch { parsed = null; }
    }

    if (!parsed || typeof parsed !== "object" || Object.keys(parsed).length === 0) {
      console.error("AI returned unparseable/empty content:", content);
      return new Response(JSON.stringify({ error: "AI повернув порожню відповідь, спробуйте ще раз" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
