import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { niche, channel, leadType, budget } = await req.json();
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
      leadform: "Лідформи Meta",
      quiz: "Квіз",
      landing: "Лендінг",
    };

    const goalLabel = goalLabels[channel] || channel || "не вказано";
    const ltLabel = leadType ? (leadTypeLabels[leadType] || leadType) : "";
    const baseBudget = Number(budget) > 0 ? Number(budget) : 10000;

    const systemPrompt = `Ти — досвідчений performance-маркетолог з 8+ років практики в Meta Ads на ринку України.
Твоє завдання — спрогнозувати РЕАЛІСТИЧНІ медіапоказники для декомпозиції під конкретну нішу, ціль та інструмент лідгену.

ВАЖЛИВО: усі грошові показники у ДОЛАРАХ США ($), а не в гривнях. Орієнтуйся на реальні USD-бенчмарки українського Meta-ринку 2024-2026:
- CPM зазвичай $1.5–$6 (вища ціль = вищий CPM)
- CPL у $0.5–$4 залежно від інструмента та ніші
- Середній чек у $ конвертуй з типового UAH-чеку ніші за курсом ~40 UAH/USD

Правила (ОБОВ'ЯЗКОВІ ЦІЛЬОВІ ROI):
- "Реалістичний" сценарій ПОВИНЕН давати чистий ROI приблизно +25–35% (тобто Чистий дохід = Прибуток - Бюджет ≈ +30% від бюджету). Це робочий, прибутковий кабінет.
- "Гірший" сценарій повинен давати чистий ROI приблизно -15..-25% (збитковий старт).
- "Кращий" сценарій — чистий ROI приблизно +60–90%.
- Розрахунок: revenue = leads * conversionRate * averageCheck; прибуток = revenue * marginality; чистий дохід = прибуток - бюджет. Підбирай cpm/ctr/landingConversion/conversionRate/averageCheck/marginality так, щоб ці ROI справджувалися для заданого бюджету.
- Спочатку прикинь у голові цифри, перевір ROI, скоригуй параметри, і лише тоді віддавай JSON.
- Враховуй специфіку інструмента: лідформи — дешевший CPL, гірша якість; лендінг — дорожчий CPL, краща якість; квіз — посередині.
- Тримай значення в межах реальних бенчмарків ($CPM 1.5–6, CTR 0.8–2.5%, landing conv 3–12%, sale conv 2–10%), маржинальність 30–70% залежно від ніші.

Поверни ВИКЛЮЧНО JSON без markdown, без коментарів, у форматі:
{
  "bad":       {"cpm": число, "ctr": число, "landingConversion": число, "conversionRate": число, "averageCheck": число, "marginality": число},
  "realistic": {"cpm": число, "ctr": число, "landingConversion": число, "conversionRate": число, "averageCheck": число, "marginality": число},
  "positive":  {"cpm": число, "ctr": число, "landingConversion": число, "conversionRate": число, "averageCheck": число, "marginality": число}
}

Одиниці: cpm — $ (USD), ctr — %, landingConversion — % (заявка з переглядів лендінгу/форми), conversionRate — % (покупка з заявки), averageCheck — $ (USD), marginality — %.`;

    const userPrompt = `Ніша: ${niche || "не вказано"}
Ціль кампанії: ${goalLabel}
${ltLabel ? `Інструмент лідгену: ${ltLabel}` : ""}
Тестовий бюджет: $${baseBudget} (USD)

Дай 3 сценарії (bad / realistic / positive) з реалістичними цифрами в ДОЛАРАХ США для українського ринку. Realistic — трохи консервативніший за середній.`;

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
    const text: string = data.choices?.[0]?.message?.content || "";

    // Extract JSON
    let parsed: any = null;
    try {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(m ? m[0] : text);
    } catch (e) {
      console.error("Parse error:", e, text);
      return new Response(JSON.stringify({ error: "Не вдалося розпарсити відповідь AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ scenarios: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
