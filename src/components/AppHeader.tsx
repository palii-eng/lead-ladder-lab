import React, { useEffect, useRef, useState } from 'react';
import { GraduationCap, Newspaper, MessageCircle, Send } from 'lucide-react';
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

interface ChatMessageRow {
  id: string;
  user_id: string;
  user_name: string;
  user_level: string;
  completed_projects: number;
  message: string;
  created_at: string;
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
  const { user, profile, isTester, isStaff, accessTier } = useAuth();
  const { scenarios } = useScenarios();

  // Демо (tester) не бачить чат взагалі — тільки студенти/випускники
  // пишуть, staff читає для модерації.
  const canSeeChat = isStaff || accessTier === 'student' || accessTier === 'graduate';
  const canWriteChat = !isStaff && (accessTier === 'student' || accessTier === 'graduate');
  const levelLabel = accessTier === 'graduate' ? 'Випускник' : accessTier === 'student' ? 'Студент ADSchool' : '';
  const completedProjectsCount = scenarios.filter(s => s.monthSurvived).length;

  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatText, setChatText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!chatOpen || !canSeeChat) return;
    loadMessages();
    const channel = supabase
      .channel('community_chat_watch')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_chat_messages' },
        (payload) => {
          setMessages(prev => [...prev, payload.new as ChatMessageRow]);
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
    });
    setSending(false);
    if (error) {
      toast({ title: 'Не вдалося надіслати', description: error.message, variant: 'destructive' });
      return;
    }
    setChatText('');
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
              onClick={() => { if (canSeeChat) setChatOpen(true); }}
              disabled={!canSeeChat}
              className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                canSeeChat ? 'text-primary hover:text-primary/80 cursor-pointer' : 'text-muted-foreground/50 cursor-not-allowed'
              }`}
              title={canSeeChat ? 'Чат студентів' : 'Доступно тільки для студентів ADSchool'}
            >
              <MessageCircle className="w-4 h-4" /> Чат
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
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap break-words">{m.message}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            {canWriteChat ? (
              <SheetFooter className="p-3 border-t border-border flex-row gap-2">
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
