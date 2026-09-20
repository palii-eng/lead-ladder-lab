import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { niche, channel, leadType, decomposition, clientBrief, previousAudiences, audienceName, platform } = await req.json();
    const isTikTok = platform === 'tiktok';
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

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

    // Витягуємо саме розділ "Інтереси" з попередньої AI-відповіді окремо —
    // він іде ближче до кінця структурованого тексту (після цілі/гео/статі/
    // мови), тож простий slice(0, N) на невеликій довжині міг обрізати його
    // ще до того, як AI взагалі побачить, які інтереси вже використані.
    const extractInterests = (text: string): string => {
      const match = text.match(/❤️[^\n]*Інтерес[\s\S]*?(?=\n[📱⚡🎯🌍👥🗣️]|$)/i);
      return match ? match[0].trim().slice(0, 600) : "";
    };

    let previousContext = "";
    if (Array.isArray(previousAudiences) && previousAudiences.length > 0) {
      previousContext = `\n\nПопередньо створені аудиторії для цього клієнта (НЕ ПОВТОРЮЙ їх — запропонуй НОВУ, відмінну від цих, і ОСОБЛИВО не повторюй уже використані інтереси/поведінки — обери інші):\n` +
        previousAudiences.map((a: any, i: number) => {
          if (a.mode !== 'ai') return `${i + 1}. ${a.name || 'Без назви'} (ручна)\n${(a.description || '').slice(0, 400)}`;
          const tips = a.tips || '';
          const interests = extractInterests(tips);
          const summary = tips.slice(0, 500);
          return `${i + 1}. ${a.name || 'Без назви'} (AI)\n${summary}${interests ? `\nВикористані інтереси/поведінки (не повторювати): ${interests}` : ''}`;
        }).join("\n\n");
    }

    const nameContext = audienceName ? `\n\nПотрібно описати конкретну аудиторію з назвою: "${audienceName}". Орієнтуйся на цю назву при підборі параметрів.` : "";

    // TikTok Ads Manager, на відміну від Meta, не дає точного гео-таргетингу
    // по місту чи радіусу навколо адреси — в більшості країн (включно з
    // Україною) там доступний лише рівень країни (подекуди — області/регіону).
    // Тож для TikTok AI не має радити конкретні міста чи радіус, це ввело б
    // студента в оману щодо реальних можливостей платформи.
    const geoInstruction = isTikTok
      ? '2. 🌍 Гео — тільки на рівні країни (у TikTok Ads Manager немає точного таргетингу по місту чи радіусу навколо адреси, на відміну від Meta, — це стосується України і більшості інших країн). НЕ пропонуй конкретні міста чи радіус, лише країну.'
      : '2. 🌍 Гео — конкретні рекомендації (країна/місто/радіус)';

    const systemPrompt = `Ти — AI LeadOслав, особистий AI-помічник маркетолога в навчальному симуляторі ADS School. Відповідай від свого імені, як старший таргетолог ${isTikTok ? 'TikTok Ads' : 'Meta/Facebook'} з живим досвідом — по-людськи, дружньо, наче пишеш колезі, а не як безликий асистент. ВАЖЛИВО: не представляйся, не пиши хто ти, не задавай уточнюючих питань, не пиши вступів типу "Звісно" чи "Ось". Одразу починай з рекомендацій по ділу. Давай конкретні, практичні поради по підбору аудиторій українською мовою. Пиши звичайним текстом, короткими абзацами та реченнями зі списку — БЕЗ markdown-розмітки: не використовуй **, ##, зірочки, решітки, бектики чи іншу розмітку, тільки емодзі та звичайний текст і переноси рядків. Будь конкретним — назви інтересів, поведінкові сигнали, цифри, приклади розмірів аудиторій. ВАЖЛИВО: не згадуй структуру адсетів, не давай назв на кшталт "Адсет №1", "Адсет №2" — окрема робота по адсетам буде далі. Зараз ми описуємо ТІЛЬКИ налаштування ОДНІЄЇ аудиторії.${isTikTok ? ' ВАЖЛИВО: у TikTok Ads немає точного гео-таргетингу по місту чи радіусу (на відміну від Meta) — ніколи не радь конкретні міста чи радіус, тільки країну.' : ''}`;

    const userPrompt = `Ніша: ${niche || "не вказано"}
Ціль кампанії: ${goalLabel}
${ltLabel ? `Тип лідгену: ${ltLabel}` : ""}${clientContext}${decompContext}${previousContext}${nameContext}

Дай детальні поради по налаштуванню цієї аудиторії. НЕ розписуй адсети — тільки параметри:

1. 🎯 Ціль оптимізації та піксель — яку оптимізацію обрати, які події має ловити піксель
${geoInstruction}
3. 👥 Стать та вік — оптимальні діапазони з обґрунтуванням
4. 🗣️ Мова акаунту — які мови додавати/виключати
5. ❤️ Інтереси та поведінка — 8–12 конкретних інтересів/поведінок ${isTikTok ? 'TikTok' : 'Meta'}, з приблизним розміром аудиторії
6. 📱 Плейсменти — які увімкнути / вимкнути для цієї цілі
7. ⚡ 3 швидкі поради — найважливіше

Формат: звичайний текст без markdown-розмітки (без **, ##, зірочок, решіток, бектиків), кожен пункт з нового рядка з емодзі, без вступу, одразу до справи.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
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
      if (response.status === 401 || response.status === 403) {
        return new Response(JSON.stringify({ error: "Проблема з OpenAI API ключем (перевірте налаштування)." }), {
          status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("OpenAI API error:", response.status, t);
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
