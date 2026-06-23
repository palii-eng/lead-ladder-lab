import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { niche, channel, leadType, decomposition, clientBrief, previousAudiences, audienceName } = await req.json();
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

    let decompContext = "";
    if (decomposition?.realistic) {
      const r = decomposition.realistic;
      decompContext = `
Дані декомпозиції (реалістичний сценарій):
- Бюджет: ${r.budget || 0} ₴
- Середній чек: ${r.averageCheck || 0} ₴
- CPL: ${r.cpl || 0} ₴`;
    }

    const clientContext = clientBrief
      ? `\nКлієнт: ${clientBrief.name || ""}${clientBrief.task ? ` — ${clientBrief.task}` : ""}`
      : "";

    let previousContext = "";
    if (Array.isArray(previousAudiences) && previousAudiences.length > 0) {
      previousContext = `\n\nПопередньо створені аудиторії для цього клієнта (НЕ ПОВТОРЮЙ їх — запропонуй НОВУ, відмінну від цих):\n` +
        previousAudiences.map((a: any, i: number) => {
          const body = a.mode === 'ai' ? (a.tips || '').slice(0, 400) : (a.description || '').slice(0, 400);
          return `${i + 1}. ${a.name || 'Без назви'} (${a.mode === 'ai' ? 'AI' : 'ручна'})\n${body}`;
        }).join("\n\n");
    }

    const nameContext = audienceName ? `\n\nПотрібно описати конкретну аудиторію з назвою: "${audienceName}". Орієнтуйся на цю назву при підборі параметрів.` : "";

    const systemPrompt = `Ти — старший таргетолог Meta/Facebook. Давай конкретні, практичні поради по підбору аудиторій українською мовою. Структуруй відповідь з емодзі, заголовками та списками. Будь конкретним — назви інтересів, поведінкові сигнали, цифри, приклади розмірів аудиторій. ВАЖЛИВО: не згадуй структуру адсетів, не давай назв на кшталт "Адсет №1", "Адсет №2" — окрема робота по адсетам буде далі. Зараз ми описуємо ТІЛЬКИ налаштування ОДНІЄЇ аудиторії.`;

    const userPrompt = `Ніша: ${niche || "не вказано"}
Ціль кампанії: ${goalLabel}
${ltLabel ? `Тип лідгену: ${ltLabel}` : ""}${clientContext}${decompContext}${previousContext}${nameContext}

Дай детальні поради по налаштуванню цієї аудиторії. НЕ розписуй адсети — тільки параметри:

1. 🎯 **Ціль оптимізації та піксель** — яку оптимізацію обрати, які події має ловити піксель
2. 🌍 **Гео** — конкретні рекомендації (країна/місто/радіус)
3. 👥 **Стать та вік** — оптимальні діапазони з обґрунтуванням
4. 🗣️ **Мова акаунту** — які мови додавати/виключати
5. ❤️ **Інтереси та поведінка** — 8–12 конкретних інтересів/поведінок Meta, з приблизним розміром аудиторії
6. 📱 **Плейсменти** — які увімкнути / вимкнути для цієї цілі
7. ⚡ **3 швидкі поради** — найважливіше

Формат: структурований список без вступу, одразу до справи.`;

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
