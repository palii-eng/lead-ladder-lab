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

Правила:
- Орієнтуйся на фактичні бенчмарки українського ринку Meta Ads 2024-2026 для відповідної ніші.
- Не завищуй показники. Краще трохи погіршити (на 5-15%), ніж дати надто оптимістичні цифри.
- "Реалістичний" сценарій = типовий результат середнього кабінету, з невеликою консервативною поправкою вниз.
- "Гірший" = слабкий старт / непрогріта аудиторія / посередні креативи.
- "Кращий" = добре налаштована кампанія з прогрівом, але без фантастики.
- Враховуй специфіку інструмента: лідформи дають дешевший CPL але гіршу якість; лендінг — дорожчий CPL, але вища конверсія в покупку; квіз — щось посередині.
- Маржинальність та середній чек оцінюй з реальної ніші (не ставити 50%+ без підстав).

Поверни ВИКЛЮЧНО JSON без markdown, без коментарів, у форматі:
{
  "bad":       {"cpm": число, "ctr": число, "landingConversion": число, "conversionRate": число, "averageCheck": число, "marginality": число},
  "realistic": {"cpm": число, "ctr": число, "landingConversion": число, "conversionRate": число, "averageCheck": число, "marginality": число},
  "positive":  {"cpm": число, "ctr": число, "landingConversion": число, "conversionRate": число, "averageCheck": число, "marginality": число}
}

Одиниці: cpm — ₴, ctr — %, landingConversion — % (заявка з переглядів лендінгу/форми), conversionRate — % (покупка з заявки), averageCheck — ₴, marginality — %.`;

    const userPrompt = `Ніша: ${niche || "не вказано"}
Ціль кампанії: ${goalLabel}
${ltLabel ? `Інструмент лідгену: ${ltLabel}` : ""}
Тестовий бюджет: ${baseBudget} ₴

Дай 3 сценарії (bad / realistic / positive) з реалістичними цифрами для українського ринку. Realistic — трохи консервативніший за середній.`;

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
