import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ClientBrief } from '@/context/ScenariosContext';
import { Sparkles, Flame, X, Check, ArrowLeft, Loader2 } from 'lucide-react';
import f1 from '@/assets/clients/f1.jpg';
import f2 from '@/assets/clients/f2.jpg';
import f3 from '@/assets/clients/f3.jpg';
import f4 from '@/assets/clients/f4.jpg';
import f5 from '@/assets/clients/f5.jpg';
import m1 from '@/assets/clients/m1.jpg';
import m2 from '@/assets/clients/m2.jpg';
import m3 from '@/assets/clients/m3.jpg';
import m4 from '@/assets/clients/m4.jpg';
import m5 from '@/assets/clients/m5.jpg';

type Gender = 'male' | 'female';
type ClientTemplate = Omit<ClientBrief, 'photo' | 'task'> & { gender: Gender; role: string; tasks: string[] };

const LUCKY_CLIENTS: ClientTemplate[] = [
  { name: 'Катя Сергієнко', gender: 'female', role: 'Власниця інстамагазину', niche: 'Жіночий одяг',
    source: 'Контакт від знайомої',
    tasks: [
      'Привіт) Мені Оля ваш контакт скинула, сказала шо ви топ по таргету 🙌 Маю інстамагаз з жіночим одягом, хочу 25-30 замовлень/тиждень. Бюджет 20-25к/міс, можу більше. Подивитесь?',
      'Доброго дня! Я Катя, інстамагазин жіночого одягу. Продажі є, але хочеться стабільності. Готова на 25к/міс бюджету. Коли можна обговорити?',
      'Hi) бачила ваш профіль, дуже сподобались кейси. Маю свій бренд одягу в інсті, треба системний таргет. Бюджет від 20к. Розкажіть як працюєте 💬',
    ] },
  { name: 'Андрій Коваленко', gender: 'male', role: 'Власник стоматології', niche: 'Стоматологія, Львів',
    source: 'Прийшов з рекомендації',
    tasks: [
      'Доброго дня. Я Андрій, стоматологія у Львові, мене Сергій з бізнес-клубу до вас направив. Шукаю людину на довго. Імплантація + вініри, треба ліди з фб/інста. По грошах домовимось.',
      'Вітаю. Стоматологія, Львів. Цікавить стабільний потік пацієнтів на імпланти. Готовий обговорити бюджет та KPI. Коли вільні на дзвінок?',
      'Привіт. Маю клініку, шукаю маркетолога на довгий період. Основний напрямок — преміум послуги. Бюджет адекватний, головне результат.',
    ] },
  { name: 'Юлія Бондар', gender: 'female', role: 'Засновниця онлайн-школи', niche: 'Курс англійської',
    source: 'LinkedIn',
    tasks: [
      'Hi! Знайшла вас у LinkedIn, кейси 🔥 У мене авторський курс англійської, 3 потоки за плечима. Хочу масштабувати. Бюджет 60к/міс, креативи й лендос готові.',
      'Доброго дня. Онлайн-школа англійської, шукаю партнера по перформансу. Зараз самі ллємо — дорого. Готова дати доступи коли скажете.',
      'Привіт) Бачила пост ваш, вирішила написати. Запускаю 4-й потік курсу, треба 300+ реєстрацій. Бюджет є, методолог є, не вистачає вашої експертизи.',
    ] },
  { name: 'Дмитро', gender: 'male', role: 'CEO B2B SaaS', niche: 'SaaS для HR-команд',
    source: 'Партнерська мережа',
    tasks: [
      'Хай. Я Дмитро, у нас SaaS для HR (ATS + аналітика). LTV норм, можемо платити за ліда дорого — головне релевант. Стартуємо з $3k/міс. З чого почнемо?',
      'Привіт. B2B SaaS, HR-tech. Шукаємо людину під paid acquisition. Бюджет є, кейси по ICP теж. Можемо коротко поговорити в зумі?',
      'Hey. CEO саасу для HR. Цікавить мета + гугл, мб LinkedIn. Платимо за результат, але стартовий тест готові оплатити. Що скажете?',
    ] },
  { name: 'Анна Коваль', gender: 'female', role: 'Психолог', niche: 'Психологічні консультації',
    source: 'Інтро від колеги',
    tasks: [
      'Вітаю! Мені Маша вас порадила 🙏 Я психолог, працюю онлайн. Треба більше заявок на консультації, ЦА — жінки 25-40. Бюджет 12-15к/міс, готова разом робити креативи.',
      'Привіт) Психолог, веду блог в інсті. Хочу системний потік клієнтів, не залежати від рілсів. Бюджет до 15к. Розкажете як працюєте?',
      'Добрий день. Шукаю спеціаліста з таргету під психологічну практику. Тема делікатна, потрібен досвід. Готова обговорити.',
    ] },
  { name: 'Олег Прокопенко', gender: 'male', role: 'Власник автосервісу', niche: 'СТО преміум-авто',
    source: 'Reels у друзів',
    tasks: [
      'Привіт. Олег, у мене СТО під преміум авто (BMW, Audi, Porsche) в Києві. Хочу системні записи на діагностику й кузовний. Бюджет 40к/міс на старті.',
      'Доброго дня. СТО, преміум сегмент. Зараз сарафан, але хочеться передбачуваності. Сайт є, відгуків 200+, середній чек 25к.',
      'Хай. Бачив рілси одного з ваших клієнтів. У мене сервіс під німецькі авто, шукаю маркетолога на довго. Бюджет від 40к.',
    ] },
  { name: 'Марина Левченко', gender: 'female', role: 'Архітектор інтерʼєрів', niche: 'Дизайн інтерʼєру',
    source: 'Behance',
    tasks: [
      'Доброго дня! Я Марина, дизайнерка інтерʼєрів. Хочу 3-5 проєктів/міс від платоспроможних клієнтів (квартири від 100м²). Бюджет на рекламу 30к.',
      'Привіт) Знайшла вас через колегу. Працюю по Україні та Європі, портфоліо сильне. Готова знімати рілси під креативи. Коли вільні?',
    ] },
  { name: 'Тарас Гайдук', gender: 'male', role: 'CEO B2B агентства', niche: 'Outsource розробка',
    source: 'Конференція Web Summit',
    tasks: [
      'Hey! Outsource розробка для стартапів US/EU. Треба лідген на enterprise — LinkedIn ads + контент. Бюджет $5k/міс на тест.',
      'Привіт. Зустрічались на Web Summit. Готовий обговорити співпрацю по перформансу. Sales команда є, кейси є.',
    ] },
  { name: 'Софія Білецька', gender: 'female', role: 'Засновниця бʼюті-бренду', niche: 'Натуральна косметика',
    source: 'Подкаст',
    tasks: [
      'Привіт! Слухала вас у подкасті 🎧 Бренд натуральної косметики, 200 замовлень/міс, ціль — 800. Бюджет 50к, виробництво своє. Працюємо?',
      'Доброго дня. Засновниця бренду косметики. Продаємо через сайт + маркетплейси. Хочу масштаб. Готова обговорити деталі.',
    ] },
];

const HARD_CLIENTS: ClientTemplate[] = [
  { name: 'Сергій', gender: 'male', role: 'Дроп-магазин', niche: 'Чохли для телефонів',
    source: 'Холодний контакт',
    tasks: [
      'Хай. Мені сказали ти рекламу робиш. Короче, є чохли по 200 грн, треба продавати. Бюджет — 50 баксів в тиждень для начала. Тільки шоб ромі було хоча б 500%, інакше нє смисла. Скільки ти береш?',
      'Прив. Чохли продаю, треба таргет. Можеш зробити шоб 1 продажа = 50 грн витрат? У других так роблять.',
      'Здарова. Дроп-шопа маю, треба рекламу. Гроші невеликі поки, но якщо буде толк — добавим. Можеш скинути прайс?',
    ] },
  { name: 'Олена Романюк', gender: 'female', role: 'Таро-практик', niche: 'Езотерика',
    source: 'Direct в Instagram',
    tasks: [
      'Здраствуйте сонечко ✨ мені карти вас показали, відразу зрозуміла шо ви моя людина 🙏 хочу рекламу, але в мета платити не буду, вони ж енергію забирають. Можна якось без бюджету? Я вам розклад зроблю взамін.',
      'Доброго вечора 🌙 я таролог, веду свій канал. Хочу більше клієнтів, але платна реклама — це не моє по енергії. Є якісь безкоштовні способи? Подивіться по моїй карті 💫',
      'Вітаю 🌸 космос підказав написати саме вам. Потрібна реклама моїх послуг, але грошима поки не готова. Можемо по бартеру?',
    ] },
  { name: 'Богдан', gender: 'male', role: 'Власник ресторану', niche: 'Сімейний ресторан',
    source: 'Через дружину',
    tasks: [
      'Доброго дня. Маю сімейний ресторан 6 років, тримаюсь на постійних. Дружина каже треба рекламу. Цікавлять бронювання банкетів. З чого почати?',
      'Вітаю. Ресторан в центрі, працюємо давно. Молодь нас не знає — це проблема. Бюджет на рекламу обмежений, треба порадитись.',
    ] },
  { name: 'Ірина', gender: 'female', role: 'Інфо-коуч', niche: 'Жіночий марафон',
    source: 'Чат у Telegram',
    tasks: [
      'Доброго дня!! 🔥 Через 3 дні стартує марафон "Жіноча сила", треба мінімум 500 реєстрацій. Бюджету зараз нема, дам % з продажів. Креативи теж на вас. Беретесь?',
      'Привіт)) терміново! Запускаю продукт, треба ліди вже завтра. Оплата по факту після продажів. Усі деталі скину в особисті.',
      'Хелоу 🙌 я коуч, у мене великий запуск через тиждень. Шукаю маркетолога на партнерських умовах. Зацікавило?',
    ] },
  { name: 'Макс', gender: 'male', role: 'Анонімний фаундер', niche: 'Крипто-проект',
    source: 'Анонімний контакт',
    tasks: [
      'Йо. Треба залити траф на лендос, ніша — крипта. Деталі не питай поки не підпишем нда. Платимо в USDT за CPA. KPI скину окремо.',
      'Hi. Є проект, потрібен traffic. Тільки результат, тільки CPA. Бюджет умовно нескінченний якщо цифри сходяться. Підпис NDA обовʼязково.',
    ] },
  { name: 'Валера', gender: 'male', role: 'Власник СТО', niche: 'Шиномонтаж',
    source: 'Реклама в FB',
    tasks: [
      'Доброго ранку. Мені племінник сказав, що ви рекламою в інтернеті займаєтесь. Треба клієнтів на шиномонтаж, сезон. Бюджет 2 тисячі, а ви мені 100 клієнтів. По руках? Тільки без передоплати.',
      'Вітаю. Шиномонтаж в спальному районі. Хочу шоб з фейсбука йшли люди. Заплачу як побачу результат, не раніше.',
      'Здраствуйте. У мене бізнес 15 років, ніколи реклами не давав. Племінник підказав спробувати. Скільки коштує і шо я з цього маю?',
    ] },
  { name: 'Леся', gender: 'female', role: 'Хендмейд майстриня', niche: 'Мило ручної роботи',
    source: 'Коментар під постом',
    tasks: [
      'Добрий вечір 🌸 я роблю мило з нуля, з трав з мого городу. Хочу шоб про мене вся Україна знала! Грошей на рекламу нема, я в декреті. Можу мило відправити взамін + репост в сторіс 💕',
      'Привіт 🌿 побачила ваш пост, дуже надихнуло. У мене екомило, продажів мало. Бюджету нема, але я людина творча, щось придумаємо? 🙏',
    ] },
  { name: 'Артем', gender: 'male', role: 'MLM-лідер', niche: 'Мережевий маркетинг',
    source: 'Запит у друзі',
    tasks: [
      'Привіт, друже! 🚀 Бачу ти в темі реклами. Давай так: ти мені приводиш людей в команду, я тобі — % з обороту структури. Це не пирамида, це смарт-бізнес 21 століття. Цікаво?',
      'Хай 💼 шукаю партнера для масштабування мережі. Гроші великі, головне розуміти систему. Скинь номер, поговоримо голосом.',
    ] },
  { name: 'Наталія Петрівна', gender: 'female', role: 'Власниця салону', niche: 'Салон краси',
    source: 'Дочка знайшла',
    tasks: [
      'Здравствуйте. Мені дочка ваш номер дала. Салон краси 20 років, клієнтів стало менше. Мабуть кризис. Зробіть шось дешево і шоб я нічого не робила.',
      'Доброго дня. Маю салон. Раніше клієнти йшли самі, зараз ні. Інтернет цей я не розумію, але дочка наполягає. Як це все працює?',
    ] },
];

// Hand-painted illustrated portraits (AI-generated, project assets)
const FEMALE_PHOTOS = [f1, f2, f3, f4, f5];
const MALE_PHOTOS = [m1, m2, m3, m4, m5];

const photoFor = (gender: Gender, seed: number) => {
  const list = gender === 'female' ? FEMALE_PHOTOS : MALE_PHOTOS;
  return list[Math.abs(seed) % list.length];
};

interface Props {
  scenarioName: string;
  onAccept: (difficulty: 'lucky' | 'suffer', brief: ClientBrief) => void;
}

const REVEAL_MS = 1600;

const SimulationIntro: React.FC<Props> = ({ scenarioName, onAccept }) => {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * (LUCKY_CLIENTS.length + HARD_CLIENTS.length)));
  const [revealing, setRevealing] = useState(true);

  const pool = useMemo<(ClientBrief & { role?: string; _difficulty: 'lucky' | 'suffer' })[]>(() => {
    const seedBase = Math.floor(Math.random() * 1000);
    const tagged = [
      ...LUCKY_CLIENTS.map(c => ({ c, d: 'lucky' as const })),
      ...HARD_CLIENTS.map(c => ({ c, d: 'suffer' as const })),
    ];
    return tagged
      .map((x, i) => ({ ...x, k: Math.random() + i }))
      .sort((a, z) => a.k - z.k)
      .map((x, i) => ({
        name: x.c.name,
        niche: x.c.niche,
        source: x.c.source,
        task: x.c.tasks[Math.floor(Math.random() * x.c.tasks.length)],
        photo: photoFor(x.c.gender, seedBase + i * 7),
        role: x.c.role,
        _difficulty: x.d,
      }));
  }, []);

  // Trigger reveal animation on each new card
  useEffect(() => {
    setRevealing(true);
    const t = setTimeout(() => setRevealing(false), REVEAL_MS);
    return () => clearTimeout(t);
  }, [index]);

  const current = pool[index % (pool.length || 1)];

  const handleNext = () => {
    setRevealing(true);
    setTimeout(() => {
      setIndex(i => {
        if (pool.length <= 1) return i + 1;
        let next = i;
        while (next === i) {
          next = Math.floor(Math.random() * pool.length);
        }
        return next;
      });
    }, 350);
  };

  if (!current) return null;


  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-10 animate-fade-in"
      style={{
        background:
          'radial-gradient(1200px 600px at 20% 10%, hsl(var(--accent) / 0.6), transparent 60%), radial-gradient(900px 500px at 80% 90%, hsl(var(--primary) / 0.12), transparent 60%), hsl(var(--background))',
      }}
    >
      <div className="max-w-sm w-full">


        {/* CARD STAGE */}
        <div className="relative" style={{ perspective: '1200px' }}>
          {/* Reveal overlay */}
          {revealing && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <div
                className="absolute inset-0 rounded-3xl"
                style={{
                  background:
                    'linear-gradient(135deg, hsl(var(--accent) / 0.9), hsl(var(--card)))',
                  boxShadow: '0 20px 60px -20px hsl(var(--primary) / 0.4)',
                  animation: 'card-shuffle 1.6s ease-out forwards',
                }}
              />
              <div className="relative flex flex-col items-center gap-3 text-foreground/90">
                <div className="relative w-14 h-14">
                  <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                  <div className="absolute inset-0 rounded-full flex items-center justify-center bg-primary/10">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                </div>
                <p className="text-sm font-semibold tracking-wide">Шукаємо клієнта…</p>
              </div>
            </div>
          )}

          {/* The actual card */}
          <div
            key={`card-${index}`}
            className={`relative rounded-3xl overflow-hidden bg-card ${revealing ? 'opacity-0' : 'animate-card-in'}`}
            style={{
              boxShadow: '0 30px 60px -30px hsl(var(--foreground) / 0.25), 0 0 0 1px hsl(var(--border))',
            }}
          >
            {/* Header: round avatar + name + source */}
            <div className="p-4 flex items-center gap-3">
              <div className="relative w-16 h-16 shrink-0 rounded-full overflow-hidden ring-2 ring-accent shadow-md bg-secondary">
                <img
                  src={current.photo}
                  alt={current.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${current.name}`;
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-extrabold text-foreground tracking-tight leading-tight truncate">
                  {current.name}
                </h3>
                <p className="text-muted-foreground text-xs truncate">{current.role || current.niche}</p>
              </div>
              {current.source && (
                <span className="shrink-0 px-2 py-1 rounded-full bg-secondary text-foreground text-[9px] font-semibold uppercase tracking-wide">
                  {current.source}
                </span>
              )}
            </div>

            {/* Task block */}
            <div className="px-4 pb-3">
              <div
                className="rounded-2xl p-4"
                style={{
                  background: 'linear-gradient(135deg, hsl(48 80% 96%), hsl(0 0% 100%))',
                }}
              >
                <p className="text-[10px] font-bold text-foreground/60 uppercase tracking-wider mb-1.5">
                  Задача для маркетолога
                </p>
                <p className="text-[13px] text-foreground leading-relaxed">{current.task}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-3 pb-3 grid grid-cols-2 gap-2">
              <Button
                onClick={() => onAccept(current._difficulty, current)}
                className="h-11 rounded-xl font-semibold text-white text-sm"
                style={{ background: 'hsl(108 25% 50%)' }}
              >
                <Check className="w-4 h-4 mr-1.5" /> Взяти в роботу
              </Button>
              <Button
                variant="outline"
                onClick={handleNext}
                className="h-11 rounded-xl font-semibold border-border text-sm"
                style={{ color: 'hsl(0 75% 55%)' }}
              >
                <X className="w-4 h-4 mr-1.5" /> Відмовити
              </Button>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes card-shuffle {
          0%   { opacity: 1; transform: scale(1) rotate(-2deg); }
          60%  { opacity: 1; transform: scale(1.02) rotate(2deg); }
          100% { opacity: 0; transform: scale(0.96) rotate(0deg); }
        }
        @keyframes card-in {
          0%   { opacity: 0; transform: translateY(20px) scale(0.92) rotateX(8deg); filter: blur(8px); }
          60%  { opacity: 1; filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1) rotateX(0); filter: blur(0); }
        }
        .animate-card-in { animation: card-in 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
      `}</style>
    </div>
  );
};

export default SimulationIntro;
