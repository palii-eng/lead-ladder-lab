import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { niche, channel, leadType, budget } = await req.json();
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
      leadform: "Лідформи Meta",
      quiz: "Квіз",
      landing: "Лендінг",
    };

    const goalLabel = goalLabels[channel] || channel || "не вказано";
    const ltLabel = leadType ? (leadTypeLabels[leadType] || leadType) : "";
    // Тестовий бюджет проєктів у симуляторі — $500–$5000; тримаємось цього
    // діапазону навіть якщо на фронті прийшло щось за межами (старий кеш тощо).
    const baseBudget = Math.min(5000, Math.max(500, Number(budget) > 0 ? Number(budget) : 2000));

    const systemPrompt = `Ти — досвідчений performance-маркетолог з 8+ років практики в Meta Ads на ринку України.
Твоє завдання — спрогнозувати РЕАЛІСТИЧНІ медіапоказники для декомпозиції під конкретну нішу, ціль та інструмент лідгену.

ВАЖЛИВО: усі грошові показники у ДОЛАРАХ США ($), а не в гривнях. Орієнтуйся на реальні USD-бенчмарки українського Meta-ринку 2024-2026 — вони ДОРОЖЧІ, ніж здається на перший погляд, конкуренція за аукціон весь час зростає:
- CPM зазвичай $3–$9 (вища ціль = вищий CPM). НЕ бери мінімальні значення діапазону за замовчуванням — CPM $1.5-2 практично не зустрічається на реальному ринку 2026 року, навіть у найдешевших нішах.
- Виняток: ніша "стоматологія"/"стоматологічна клініка" — CPM ЗАВЖДИ від $8 і вище (по всіх країнах), бо це висококонкурентна дорога ніша.
- CPL (ціна за лід) у $0.8–$5 залежно від інструмента та ніші — ОБОВ'ЯЗКОВО рахуй і повертай явним числом (не залишай порожнім/нульовим), навіть якщо його треба вивести з cpm/ctr/landingConversion.
- Середній чек у $ конвертуй з типового UAH-чеку ніші за курсом ~40 UAH/USD

Правила (ОБОВ'ЯЗКОВІ ЦІЛЬОВІ ROI) — НАВМИСНО ПЕСИМІСТИЧНІ, без прикрашання. Це навчальна симуляція, і завищені прогнози привчають студентів до нереалістичних очікувань від реального ринку. Закладай ГІРШІ цифри, ніж тобі здається реалістичним — дешевий CPM і оптимістичний ROI є типовою помилкою, якої треба уникати: краще, щоб студент був приємно здивований результатом, ніж розчарований:
- "Реалістичний" сценарій ПОВИНЕН давати чистий ROI приблизно -12%..-3% — тобто Чистий дохід (Прибуток - Бюджет) ЗАВЖДИ помітно негативний, а не 0% чи біля нуля. Незначний, але мінус — типовий важкий старт нового кабінету, кабінет ще не оптимізований і сходу в плюс не виходить.
- "Гірший" сценарій повинен давати чистий ROI приблизно -50%..-65% (сильно збитковий старт, майже провал).
- "Кращий" сценарій — чистий ROI приблизно +15–25%. Навіть найкращий сценарій не повинен виглядати як легкі гроші чи гарантований успіх.
- Розрахунок: revenue = leads * conversionRate * averageCheck; прибуток = revenue * marginality; чистий дохід = прибуток - бюджет. Підбирай cpm/ctr/landingConversion/conversionRate/averageCheck/marginality так, щоб ці ROI справджувалися для заданого бюджету.
- Спочатку прикинь у голові цифри, перевір ROI, скоригуй параметри — якщо вийшло 0% чи плюс для "реалістичного" сценарію, це помилка, піднімай CPM і перерахуй — і лише тоді віддавай JSON.
- Враховуй специфіку інструмента: лідформи — дешевший CPL, гірша якість; лендінг — дорожчий CPL, краща якість; квіз — посередині.
- Тримай значення в межах реальних бенчмарків ($CPM 3–9, або від 8 для стоматології; CTR 0.8–2.5%, landing conv 3–12%, sale conv 2–10%), маржинальність 30–70% залежно від ніші.
- averageCheck і marginality — це властивості БІЗНЕСУ клієнта (ціна послуги/товару, собівартість), а не реклами. Вони ОДНАКОВІ в bad/realistic/positive — міняються тільки медіапоказники (cpm/ctr/cpl/landingConversion/conversionRate), бо саме вони залежать від того, як пройде рекламна кампанія.

Поверни ВИКЛЮЧНО JSON без markdown, без коментарів, у форматі:
{
  "bad":       {"cpm": число, "ctr": число, "cpl": число, "landingConversion": число, "conversionRate": число, "averageCheck": число, "marginality": число},
  "realistic": {"cpm": число, "ctr": число, "cpl": число, "landingConversion": число, "conversionRate": число, "averageCheck": число, "marginality": число},
  "positive":  {"cpm": число, "ctr": число, "cpl": число, "landingConversion": число, "conversionRate": число, "averageCheck": число, "marginality": число}
}

Одиниці: cpm — $ (USD), ctr — %, cpl — $ (USD, ціна за лід — обов'язково заповнений), landingConversion — % (заявка з переглядів лендінгу/форми), conversionRate — % (покупка з заявки), averageCheck — $ (USD), marginality — %.`;

    const userPrompt = `Ніша: ${niche || "не вказано"}
Ціль кампанії: ${goalLabel}
${ltLabel ? `Інструмент лідгену: ${ltLabel}` : ""}
Тестовий бюджет: $${baseBudget} (USD)

Дай 3 сценарії (bad / realistic / positive) з реалістичними цифрами в ДОЛАРАХ США для українського ринку. Realistic — трохи консервативніший за середній.`;

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

    // Безпечна сітка: averageCheck і marginality — властивості бізнесу, не
    // реклами, тож мають бути однаковими в усіх трьох сценаріях навіть якщо
    // модель це проігнорувала. Беремо значення з "realistic" як базове.
    if (parsed && parsed.bad && parsed.realistic && parsed.positive) {
      const sharedAvgCheck = parsed.realistic.averageCheck ?? parsed.bad.averageCheck ?? parsed.positive.averageCheck;
      const sharedMarginality = parsed.realistic.marginality ?? parsed.bad.marginality ?? parsed.positive.marginality;
      for (const key of ["bad", "realistic", "positive"]) {
        if (sharedAvgCheck != null) parsed[key].averageCheck = sharedAvgCheck;
        if (sharedMarginality != null) parsed[key].marginality = sharedMarginality;
      }
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
