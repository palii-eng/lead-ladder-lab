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
type ClientTemplate = Omit<ClientBrief, 'photo'> & { gender: Gender; role: string };

const LUCKY_CLIENTS: ClientTemplate[] = [
  { name: 'Катя Сергієнко', gender: 'female', role: 'Власниця інстамагазину', niche: 'Жіночий одяг',
    source: 'Контакт від знайомої',
    task: 'Привіт) Мене Катя звати, мені Оля ваш контакт скинула, сказала шо ви крутий спец по таргету. Коротко: маю інстамагаз з жіночим одягом, продажі є, но хочеться стабільніше — десь 25-30 замовлень в тиждень. Бюджет можу витягнути 20-25к на місяць, може трохи більше якщо піде. Візьметесь подивитись?' },
  { name: 'Андрій Коваленко', gender: 'male', role: 'Власник стоматології', niche: 'Стоматологія, Львів',
    source: 'Прийшов з рекомендації',
    task: 'Доброго дня. Я Андрій, у мене стоматологія у Львові, мені вас порадив Сергій (ми разом по бізнес-клубу). Шукаю людину на довго, не на один місяць. Основне — імплантація і вініри, ліди з фб/інста дуже потрібні. По грошах домовимось, якщо буде результат — бонус накину.' },
  { name: 'Юлія Бондар', gender: 'female', role: 'Засновниця онлайн-школи', niche: 'Курс англійської',
    source: 'LinkedIn',
    task: 'Hi! Знайшла вас у LinkedIn, дуже сподобались кейси. У мене авторський курс англійської, вже 3 потоки відкатали, відгуки топ. Хочу масштабувати — зараз самі ллємо, дорого і нестабільно. Бюджет 60к/міс, креативи й лендос є, можу скинути доступи коли скажете.' },
  { name: 'Дмитро', gender: 'male', role: 'CEO B2B SaaS', niche: 'SaaS для HR-команд',
    source: 'Партнерська мережа',
    task: 'Хай. Я Дмитро, у нас SaaS для HR-ів (типу ATS + аналітика). LTV норм, можемо платити за ліда дорого — головне щоб був релевант, не "хочу подивитись". Стартуємо з $3k/міс, далі по перфу. Цікавить мета і гугл, як думаєте за що братись першим?' },
  { name: 'Анна Коваль', gender: 'female', role: 'Психолог', niche: 'Психологічні консультації',
    source: 'Інтро від колеги',
    task: 'Вітаю! Мені вас Маша порадила, ми разом в терапії були)) Я психолог, працюю онлайн, веду в інсті блог. Треба більше заявок на консультації, ЦА — жінки 25-40. Бюджет десь 12-15к в місяць, готова робити креативи з вами разом, не проблема.' },
  { name: 'Олег Прокопенко', gender: 'male', role: 'Власник автосервісу', niche: 'СТО преміум-авто',
    source: 'Reels у друзів',
    task: 'Привіт. Олег, у мене СТО під преміум авто (BMW, Audi, Porsche) в Києві. Зараз сарафан, але хочу системно — записи на діагностику й кузовний ремонт. Бюджет 40к/міс на старті, далі готовий додавати. Сайт є, відгуків 200+, чек середній 25к.' },
  { name: 'Марина Левченко', gender: 'female', role: 'Архітектор інтер’єрів', niche: 'Дизайн інтер’єру',
    source: 'Behance',
    task: 'Доброго дня! Я Марина, дизайнерка інтер’єрів, працюю по Україні та Європі. Хочу 3-5 проєктів на місяць від платоспроможних клієнтів (квартири від 100м²). Бюджет на рекламу 30к, портфоліо сильне, готова знімати рілси якщо треба для креативів.' },
  { name: 'Тарас Гайдук', gender: 'male', role: 'CEO B2B агентства', niche: 'Outsource розробка',
    source: 'Конференція Web Summit',
    task: 'Hey! Ми робимо outsource розробку для стартапів у US/EU. Треба лідген на enterprise клієнтів — LinkedIn ads + контент. Бюджет $5k/міс на тест, далі масштаб. Кейси є, sales команда готова. Цікавить ваш підхід до ABM.' },
  { name: 'Софія Білецька', gender: 'female', role: 'Засновниця b’юті-бренду', niche: 'Натуральна косметика',
    source: 'Подкаст',
    task: 'Привіт! Слухала вас у подкасті, дуже зайшло. У мене бренд натуральної косметики, продаємо через сайт і Розетку. Хочу масштабувати — зараз 200 замовлень/міс, ціль 800. Бюджет 50к, є фотограф, виробництво своє. Працюємо?' },
];

const HARD_CLIENTS: ClientTemplate[] = [
  { name: 'Сергій', gender: 'male', role: 'Дроп-магазин', niche: 'Чохли для телефонів',
    source: 'Холодний контакт',
    task: 'Алло, це Серьога. Мені сказали ти рекламу робиш. Короче, є чохли по 200 грн, треба продавати. Бюджет — ну давай 50 баксів в тиждень для начала, як піде — добавим. Тільки шоб ромі було хоча б 500%, інакше нє смисла. Скільки ти береш?' },
  { name: 'Олена Романюк', gender: 'female', role: 'Таро-практик', niche: 'Езотерика',
    source: 'Direct в Instagram',
    task: 'Здраствуйте сонечко ✨ мені карти вас показали, відразу зрозуміла шо ви моя людина 🙏 хочу рекламу, але в мета платить не буду, вони ж енергію забирають. Можна якось без бюджету? Я вам за це розклад зроблю, дуже сильний, обіцяю.' },
  { name: 'Богдан', gender: 'male', role: 'Власник ресторану', niche: 'Сімейний ресторан',
    source: 'Через дружину',
    task: 'Здоров. Жінка заставила тобі написати. Реклама в інеті це фігня по-моєму, у нас і так люди ходять, но вона каже надо. Зроби шось там, тільки шоб не дорого і без оцих ваших розумних слів типу "вороночка", "креатиф". Скільки візьмеш?' },
  { name: 'Ірина', gender: 'female', role: 'Інфо-коуч', niche: 'Жіночий марафон',
    source: 'Чат у Telegram',
    task: 'Доброго дня!! У мене горить — через 3 дні стартує марафон "Жіноча сила", треба мінімум 500 реєстрацій. Бюджету прям зараз нема, але я дам % з продажів, у нас чек хороший. Креативи і тексти теж на вас, я зараз дуже завантажена. Беретесь?' },
  { name: 'Макс', gender: 'male', role: 'Анонімний фаундер', niche: 'Крипто-проект',
    source: 'Анонімний контакт',
    task: 'Йо. Треба залити траф на лендос, ніша — крипта, деталі не питай поки не підпишем нда. Платимо в USDT кожний тиждень, но тільки за результат (CPA). KPI скину в телезі, tut не хочу. Працюємо?' },
  { name: 'Валера', gender: 'male', role: 'Власник СТО', niche: 'Шиномонтаж',
    source: 'Подзвонив зранку',
    task: 'Алло, братан. Мені племінник сказав шо ти в інтернеті крутиш рекламу. Треба шоб клієнти йшли на шиномонтаж, сезон же. Бюджет — я тобі 2 тисячі дам, ти мені 100 клієнтів за тиждень. По рукам? Тільки без передоплати, я людей перший раз не знаю не плачу.' },
  { name: 'Леся', gender: 'female', role: 'Хендмейд майстриня', niche: 'Мило ручної роботи',
    source: 'Коментар під постом',
    task: 'Добрий вечір 🌸 я роблю мило з нуля, дуже екологічне, з трав з мого городу. Хочу шоб про мене вся Україна знала! Грошей на рекламу нема, бо я ж в декреті, але я можу вам мило відправити. Ну і репост в сторіс зроблю обовʼязково.' },
  { name: 'Артем', gender: 'male', role: 'MLM-лідер', niche: 'Мережевий маркетинг',
    source: 'Запит у друзі',
    task: 'Привіт, друже! 🚀 Бачу ти в темі реклами, а я в темі бізнесу можливостей. Давай так: ти мені приводиш людей в команду, я тобі — % з обороту структури. Це не пирамида, це смарт-бізнес 21 століття. Чекаю в особисті, розкажу деталі, тут не місце.' },
  { name: 'Наталія Петрівна', gender: 'female', role: 'Власниця салону', niche: 'Салон краси',
    source: 'Дочка знайшла',
    task: 'Здравствуйте. Мені дочка ваш номер дала, у мене салон краси 20 років вже. Раніше і без вашого інтернету повно клієнтів було, а зараз чомусь падає. Мабуть кризис. Зробіть мені шось але шоб дешево і шоб я нічого не робила, у мене і так часу нема.' },
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
  const [index, setIndex] = useState(0);
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
        task: x.c.task,
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
    setTimeout(() => setIndex(i => i + 1), 350);
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

        <p className="text-center text-xs text-muted-foreground mt-4">
          Клієнт #{(index % pool.length) + 1} з {pool.length}
        </p>
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
