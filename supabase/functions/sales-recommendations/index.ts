import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, niche, channel, leadType, companyDescription, decomposition, leadDestinations, integrationMethod, retention } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const goalLabels: Record<string, string> = {
      awareness: "Упізнаваність", traffic: "Трафік", engagement: "Взаємодія",
      leads: "Ліди", app_promotion: "Просування додатка", sales: "Продажі",
    };
    const leadTypeLabels: Record<string, string> = {
      leadform: "Лідформи", quiz: "Квізи", landing: "Лендінг",
    };

    const goalLabel = goalLabels[channel] || channel || "не вказано";
    const ltLabel = leadType ? (leadTypeLabels[leadType] || leadType) : "";

    // Build context from all previous steps
    let decompContext = "";
    if (decomposition?.positive) {
      const p = decomposition.positive;
      decompContext = `
Дані декомпозиції (Оптимістичний сценарій):
- Бюджет: ${p.budget || 0} ₴
- CPM: ${p.cpm || 0} ₴, CTR: ${p.ctr || 0}%
- Конверсія лендінгу: ${p.landingConversion || 0}%
- Конверсія в покупку: ${p.conversionRate || 0}%
- Середній чек: ${p.averageCheck || 0} ₴
- Маржинальність: ${p.marginality || 0}%`;
    }

    const fullContext = `Ніша: ${niche || "не вказано"}
Ціль кампанії: ${goalLabel}
${ltLabel ? `Тип лідгену: ${ltLabel}` : ""}
${decompContext}
Куди йдуть ліди: ${(leadDestinations || []).join(", ") || "не вказано"}
Інтеграція: ${integrationMethod || "не вказано"}
Опис компанії: ${companyDescription || "не вказано"}
${retention?.emailCount ? `Email-база: ${retention.emailCount} контактів` : ""}`;

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "call-script") {
      systemPrompt = `Ти — досвідчений маркетолог-стратег та експерт з продажів по телефону. Генеруй глибоко опрацьовані скрипти дзвінків українською мовою. Використовуй конкретні формулювання для цієї ніші.`;
      userPrompt = `${fullContext}

Створи детальний скрипт дзвінка для продажу в цій ніші. Включи:

1. 📞 **Привітання та хук** — 3 варіанти вступного речення, що чіпляє увагу
2. 🎯 **Кваліфікація ліда** — 5 ключових питань для визначення потреб клієнта
3. 💎 **Презентація цінності** — як представити продукт/послугу з акцентом на вигоди клієнта
4. 🛡️ **Робота із запереченнями** — 7-10 типових заперечень та конкретні відповіді на кожне:
   - "Дорого"
   - "Потрібно подумати"
   - "Я порівнюю з конкурентами"
   - "Не зараз"
   - "Надішліть інформацію на пошту"
   та інші типові для цієї ніші
5. 🤝 **Закриття угоди** — 3 техніки закриття з конкретними фразами
6. 📋 **Чек-лист після дзвінка** — що зробити після розмови

Формат: детальний структурований скрипт з конкретними фразами-прикладами. Додай емодзі для візуального структурування.`;
    } else if (type === "chat-script") {
      systemPrompt = `Ти — досвідчений маркетолог-стратег та експерт з продажів у месенджерах. Генеруй глибоко опрацьовані скрипти переписки українською мовою.`;
      userPrompt = `${fullContext}

Створи детальний скрипт переписки (Telegram/Instagram/Viber) для продажу в цій ніші. Включи:

1. 👋 **Перше повідомлення** — 3 варіанти першого контакту після отримання ліда
2. 🔍 **Серія кваліфікаційних повідомлень** — як дізнатися потреби клієнта через переписку
3. 💬 **Шаблони відповідей на типові питання** — 10 готових відповідей
4. 🛡️ **Робота із запереченнями в переписці** — як відповідати на:
   - "Скільки коштує?" (коли рано говорити ціну)
   - "Чому так дорого?"
   - "Я подумаю"
   - "Чим ви відрізняєтесь?"
   - Ігнорування повідомлень — як повернути діалог
5. 🎯 **Перехід до продажу** — як перевести переписку в дзвінок або зустріч
6. 📸 **Контент для відправки** — які матеріали відправляти (кейси, відгуки, фото)
7. ⏰ **Тайминг повідомлень** — коли і як часто писати

Формат: готові шаблони повідомлень, які можна скопіювати та використовувати. Додай емодзі.`;
    } else if (type === "follow-up") {
      systemPrompt = `Ти — досвідчений маркетолог-стратег та експерт з follow-up стратегій. Генеруй розгорнуті рекомендації щодо покращення конверсії та закриття угод українською мовою.`;
      userPrompt = `${fullContext}

Створи детальну follow-up стратегію для цієї ніші. Включи:

1. ⏱️ **Таймлайн follow-up** — конкретний розклад контактів:
   - Через 5 хвилин після ліда
   - Через 1 годину
   - Через 24 години
   - Через 3 дні
   - Через 7 днів
   - Через 14 днів
   - Через 30 днів
2. 📝 **Шаблони повідомлень для кожного етапу** — готові тексти
3. 📧 **Email follow-up серія** — 5 листів з темами та текстами
4. 🔄 **Стратегія реактивації "мертвих" лідів** — як повернути тих, хто замовк
5. 📊 **KPI та метрики** — які показники відстежувати
6. 🤖 **Автоматизація** — що можна автоматизувати через ${integrationMethod || "CRM"}
7. 💡 **Поради щодо підвищення конверсії** — 10 конкретних порад для цієї ніші
8. ⚠️ **Типові помилки** — 5 помилок, яких треба уникати

Формат: розгорнута стратегія з конкретними прикладами та шаблонами. Додай емодзі.`;
    } else if (type === "conclusion") {
      systemPrompt = `Ти — досвідчений маркетолог-стратег. Зроби загальний висновок та стратегічне резюме по всій маркетинговій воронці українською мовою. Будь конкретним, давай цифри та чіткі рекомендації.`;
      userPrompt = `${fullContext}

На основі ВСІХ даних воронки зроби загальний стратегічний висновок. Включи:

1. 📋 **Загальна оцінка воронки** — наскільки реалістичний та ефективний план, сильні та слабкі сторони
2. 💰 **Фінансовий прогноз** — очікувана окупність, терміни виходу на прибуток, ризики
3. 🎯 **Ключові точки зростання** — де найбільший потенціал для покращення результатів
4. ⚠️ **Можливі ризики та як їх мінімізувати** — 5 конкретних ризиків з рішеннями
5. 📅 **План дій на перший місяць** — тижневий план запуску та оптимізації
6. 🚀 **Масштабування** — коли і як збільшувати бюджет, критерії для масштабування
7. 💡 **Топ-5 порад** — найважливіші рекомендації саме для цієї ніші та воронки

Формат: структурований висновок з конкретними цифрами та рекомендаціями. Додай емодзі.`;
    } else {
      return new Response(JSON.stringify({ error: "Unknown recommendation type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
