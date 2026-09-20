import React, { useEffect, useRef, useState } from 'react';
import { GraduationCap, Newspaper, MessageCircle, Send, Reply, X } from 'lucide-react';
import { ModeSwitch } from '@/components/ModeSwitch';
import { UserMenu } from '@/components/UserMenu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useScenarios } from '@/context/ScenariosContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface NewsItem {
  date: string;
  tag: string;
  title: string;
  text: string;
}

// Реальні новини з ринку (апдейти Meta/Google/TikTok Ads, індустрія тощо)
// вписуються сюди вручну, найновіша — першою.
const MARKETING_NEWS: NewsItem[] = [
  {
    date: '21 вер 2026',
    tag: 'AI & Маркетинг',
    title: '🎨 Оновлення ChatGPT Images 2.5: що практичного з’явилося',
    text: 'OpenAI випустила чергове оновлення інструменту для роботи з візуалом — ChatGPT Images 2.5. Два режими роботи під різні потреби: Flare — швидкий базовий режим для оперативних завдань, Sunburst — більш детальний режим для якіснішої промальовки елементів. Генерація стала помітно швидшою, а деталізація тексту та об’єктів — точнішою. З’явилось локальне редагування — можна правити окремі ділянки зображення без потреби перестворювати всю картинку з нуля, а також простіше переносити потрібні стилі чи об’єкти в нові генерації через роботу з референсами. Додано підтримку високої роздільної здатності та експорт із прозорим фоном. Оновлення поступово стає доступним усім користувачам платформи.',
  },
  {
    date: '20 вер 2026',
    tag: 'TikTok / ByteDance',
    title: 'Засновник TikTok став найбагатшою людиною Азії: його статки перевищили $105 млрд',
    text: 'Засновник китайської технологічної компанії ByteDance, яка володіє TikTok, Чжан Імін уперше очолив рейтинг найбагатших людей Азії, — повідомляє Bloomberg. Його статки перевищили $105 млрд, а стрімке зростання капіталу пов’язують не лише з успіхом TikTok, а й із масштабними інвестиціями компанії у штучний інтелект.',
  },
];

// Розбиває текст повідомлення на шматки, перетворюючи URL (http/https, або
// голі домени на кшталт "keepincrm.com") у клікабельні посилання, що
// відкриваються в новій вкладці — решта тексту лишається звичайним.
const URL_SPLIT_PATTERN = /((?:https?:\/\/)[^\s]+|(?:www\.)[^\s]+\.[a-zA-Z]{2,}[^\s]*)/g;
const URL_TEST_PATTERN = /^(?:https?:\/\/)[^\s]+$|^(?:www\.)[^\s]+\.[a-zA-Z]{2,}[^\s]*$/;
const linkifyText = (text: string): React.ReactNode[] => {
  const parts = text.split(URL_SPLIT_PATTERN);
  return parts.map((part, i) => {
    if (!part || !URL_TEST_PATTERN.test(part)) return <React.Fragment key={i}>{part}</React.Fragment>;
    const href = part.startsWith('http') ? part : `https://${part}`;
    return (
      <a
        key={i}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:text-primary/80 break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {part}
      </a>
    );
  });
};

interface ChatMessageRow {
  id: string;
  user_id: string;
  user_name: string;
  user_level: string;
  completed_projects: number;
  message: string;
  created_at: string;
  reply_to_id: string | null;
  reply_to_user_name: string | null;
  reply_to_message: string | null;
}

interface AppHeaderProps {
  active: 'sim' | 'crm';
}

// Shared top bar for both the simulator (Dashboard) and the CRM — identical
// on every page so switching between them doesn't feel like leaving into a
// different app.
export const AppHeader: React.FC<AppHeaderProps> = ({ active }) => {
  const [newsOpen, setNewsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const { user, profile, isTester, isStaff, isAdmin, isModerator, accessTier } = useAuth();
  const { scenarios } = useScenarios();

  // Демо (tester) не бачить чат взагалі — тільки студенти/випускники
  // пишуть, а адмін/модератор і читають для модерації, і можуть самі писати
  // (наприклад, відповісти студенту в чаті).
  const canSeeChat = isStaff || accessTier === 'student' || accessTier === 'graduate';
  const canWriteChat = isStaff || accessTier === 'student' || accessTier === 'graduate';
  const levelLabel = isAdmin ? 'Адмін' : isModerator ? 'Модератор' : accessTier === 'graduate' ? 'Випускник' : accessTier === 'student' ? 'Студент ADSchool' : '';
  const completedProjectsCount = scenarios.filter(s => s.monthSurvived).length;

  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatText, setChatText] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [replyTarget, setReplyTarget] = useState<ChatMessageRow | null>(null);
  const chatOpenRef = useRef(chatOpen);
  chatOpenRef.current = chatOpen;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const lastSeenKey = user?.id ? `chat_last_seen_${user.id}` : null;
  const readLastSeen = () => {
    if (!lastSeenKey) return null;
    try { return localStorage.getItem(lastSeenKey); } catch { return null; }
  };
  const markChatSeen = () => {
    if (!lastSeenKey) return;
    try { localStorage.setItem(lastSeenKey, new Date().toISOString()); } catch { /* ignore */ }
    setUnreadCount(0);
  };

  const loadMessages = async () => {
    setChatLoading(true);
    const { data, error } = await supabase
      .from('community_chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(200);
    if (!error) setMessages((data || []) as ChatMessageRow[]);
    setChatLoading(false);
  };

  // Скільки повідомлень прийшло, поки юзер не дивився в чат — рахуємо
  // одразу при заході в кабінет (не тільки коли панель відкрита), щоб
  // бейдж на кнопці "Чат" був видний і без відкривання панелі.
  useEffect(() => {
    if (!canSeeChat || !user?.id) return;
    (async () => {
      const since = readLastSeen();
      const query = supabase.from('community_chat_messages').select('id', { count: 'exact', head: true });
      const { count } = since ? await query.gt('created_at', since) : await query;
      setUnreadCount(count || 0);
      if (!since) markChatSeen();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeChat, user?.id]);

  useEffect(() => {
    if (!canSeeChat) return;
    if (chatOpen) loadMessages();
    const channel = supabase
      .channel('community_chat_watch')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_chat_messages' },
        (payload) => {
          setMessages(prev => [...prev, payload.new as ChatMessageRow]);
          if (chatOpenRef.current) markChatSeen();
          else setUnreadCount(c => c + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'community_chat_messages' },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== (payload.old as ChatMessageRow).id));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen, canSeeChat]);

  useEffect(() => {
    if (chatOpen) markChatSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen]);

  useEffect(() => {
    if (chatOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatOpen]);

  const sendMessage = async () => {
    const text = chatText.trim();
    if (!text || !user?.id || sending) return;
    setSending(true);
    const { error } = await supabase.from('community_chat_messages').insert({
      user_id: user.id,
      user_name: profile?.full_name || profile?.email || 'Студент',
      user_level: levelLabel,
      completed_projects: completedProjectsCount,
      message: text,
      reply_to_id: replyTarget?.id || null,
      reply_to_user_name: replyTarget?.user_name || null,
      reply_to_message: replyTarget?.message.slice(0, 200) || null,
    });
    setSending(false);
    if (error) {
      toast({ title: 'Не вдалося надіслати', description: error.message, variant: 'destructive' });
      return;
    }
    setChatText('');
    setReplyTarget(null);
  };

  const deleteMessage = async (id: string) => {
    const { error } = await supabase.from('community_chat_messages').delete().eq('id', id);
    if (error) toast({ title: 'Не вдалося видалити', description: error.message, variant: 'destructive' });
  };

  return (
    <>
      <header className="border-b border-border sticky top-0 z-50 bg-card h-16">
        <div className="w-full px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold text-foreground">Навчальний простір AdSchool</span>
            <ModeSwitch active={active} />
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              // Навмисно БЕЗ атрибута disabled: у Chrome disabled-кнопки не
              // отримують hover-подій, тож title-тултип на них не показується
              // взагалі. Блокуємо клік логікою в onClick, а стан "недоступно"
              // лишаємо тільки візуальним (колір/курсор), щоб tooltip працював.
              onClick={() => { if (canSeeChat) setChatOpen(true); }}
              aria-disabled={!canSeeChat}
              className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                canSeeChat ? 'text-primary hover:text-primary/80 cursor-pointer' : 'text-muted-foreground/50 cursor-not-allowed'
              }`}
              title={canSeeChat ? 'Чат студентів' : 'Доступно тільки для студентів ADSchool — стань студентом, щоб отримати доступ'}
            >
              <MessageCircle className="w-4 h-4" /> Чат
              {canSeeChat && unreadCount > 0 && (
                <span className="min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setNewsOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              title="Новини маркетингу"
            >
              <Newspaper className="w-4 h-4" /> Новини
            </button>
            <UserMenu />
          </div>
        </div>
      </header>

      <Sheet open={newsOpen} onOpenChange={setNewsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-primary" /> Новини маркетингу
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {MARKETING_NEWS.map((n, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="secondary" className="text-[10px]">{n.tag}</Badge>
                  <span className="text-[10px] text-muted-foreground">{n.date}</span>
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">{n.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{n.text}</p>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {canSeeChat && (
        <Sheet open={chatOpen} onOpenChange={setChatOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md p-0 gap-0 flex flex-col">
            <SheetHeader className="p-4 pb-3 border-b border-border">
              <SheetTitle className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" /> Чат студентів
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatLoading && <p className="text-xs text-muted-foreground text-center">Завантаження…</p>}
              {!chatLoading && messages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center">Поки що тут порожньо — напишіть перше повідомлення.</p>
              )}
              {messages.map(m => (
                <div key={m.id} className="rounded-lg border border-border bg-secondary/30 p-2.5 group">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-semibold text-foreground truncate">{m.user_name}</span>
                      {m.user_level && <Badge variant="outline" className="text-[9px] shrink-0">{m.user_level}</Badge>}
                      {m.completed_projects > 0 && (
                        <Badge variant="secondary" className="text-[9px] shrink-0">
                          ✅ {m.completed_projects} {m.completed_projects === 1 ? 'проєкт' : 'проєктів'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(m.created_at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {canWriteChat && (
                        <button
                          type="button"
                          onClick={() => setReplyTarget(m)}
                          className="opacity-0 group-hover:opacity-100 text-[10px] text-muted-foreground hover:text-primary transition-opacity flex items-center gap-0.5"
                        >
                          <Reply className="w-3 h-3" /> Відповісти
                        </button>
                      )}
                      {isStaff && (
                        <button
                          type="button"
                          onClick={() => deleteMessage(m.id)}
                          className="opacity-0 group-hover:opacity-100 text-[10px] text-muted-foreground hover:text-destructive transition-opacity"
                        >
                          Видалити
                        </button>
                      )}
                    </div>
                  </div>
                  {m.reply_to_id && (
                    <div className="mb-1.5 pl-2 border-l-2 border-primary/40 text-[10px] text-muted-foreground">
                      <span className="font-semibold text-foreground/70">↩ {m.reply_to_user_name || 'Видалено'}:</span>{' '}
                      <span className="line-clamp-1">{m.reply_to_message}</span>
                    </div>
                  )}
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap break-words">{linkifyText(m.message)}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            {canWriteChat ? (
              <div className="border-t border-border">
                {replyTarget && (
                  <div className="flex items-center justify-between gap-2 px-3 pt-2 text-[11px]">
                    <div className="min-w-0 pl-2 border-l-2 border-primary/40 text-muted-foreground">
                      <span className="font-semibold text-foreground/70">↩ Відповідь {replyTarget.user_name}:</span>{' '}
                      <span className="line-clamp-1">{replyTarget.message}</span>
                    </div>
                    <button type="button" onClick={() => setReplyTarget(null)} className="shrink-0 text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <SheetFooter className="p-3 flex-row gap-2">
                  <Input
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Напишіть повідомлення…"
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button size="icon" onClick={sendMessage} disabled={sending || !chatText.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </SheetFooter>
              </div>
            ) : (
              <div className="p-3 border-t border-border text-center text-[11px] text-muted-foreground">
                Писати в чат можуть лише студенти та випускники ADSchool.
              </div>
            )}
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};
