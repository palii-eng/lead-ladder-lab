import React, { useMemo, useState } from 'react';
import {
  Plus, Pencil, Trash2, MoreHorizontal, Search,
  LayoutGrid, List as ListIcon, Phone, Mail, CalendarDays, Tag, User, UserPlus, Layers,
  Globe, Instagram, Send, FileText, Calculator,
} from 'lucide-react';
import { useCrm, CrmCard as CrmCardType, CrmStage } from '@/context/CrmContext';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';

const emptyCardDraft = { title: '', phone: '', email: '', source: '', note: '', websiteUrl: '', instagramUrl: '', telegramUrl: '', briefUrl: '', decompositionUrl: '' };

// Small grey pill with an icon — the same footer-badge look Trello uses for
// due dates / attachments on a card.
const Chip: React.FC<{ icon: React.ElementType; children: React.ReactNode }> = ({ icon: Icon, children }) => (
  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-secondary rounded px-1.5 py-0.5">
    <Icon className="w-3 h-3" /> {children}
  </span>
);

// Input with a leading icon — used throughout the lead-card form dialogs.
const IconInput: React.FC<React.ComponentProps<typeof Input> & { icon: React.ElementType }> = ({ icon: Icon, className, ...props }) => (
  <div className="relative">
    <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
    <Input className={`pl-9 h-10 ${className || ''}`} {...props} />
  </div>
);

const CrmBoard: React.FC = () => {
  const {
    board, loading, addFunnel, renameFunnel, deleteFunnel,
    addStage, renameStage, deleteStage, addCard, updateCard, deleteCard, moveCard,
  } = useCrm();

  const [activeFunnelId, setActiveFunnelId] = useState<string | null>(null);
  const funnel = board.funnels.find(f => f.id === activeFunnelId) || board.funnels[0] || null;

  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');

  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageNameDraft, setStageNameDraft] = useState('');
  const [addingStage, setAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [addCardStageId, setAddCardStageId] = useState<string | null>(null);
  const [cardDraft, setCardDraft] = useState(emptyCardDraft);
  const [editingCard, setEditingCard] = useState<{ stageId: string; card: CrmCardType } | null>(null);
  const [draggedCard, setDraggedCard] = useState<{ stageId: string; cardId: string } | null>(null);
  const [funnelToDelete, setFunnelToDelete] = useState<string | null>(null);
  const [stageToDelete, setStageToDelete] = useState<string | null>(null);
  const [newFunnelOpen, setNewFunnelOpen] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState('');

  const matchesSearch = (card: CrmCardType) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return card.title.toLowerCase().includes(q) || card.phone.includes(q) || card.email.toLowerCase().includes(q);
  };

  const allCardsFlat = useMemo(() => {
    if (!funnel) return [];
    return funnel.stages.flatMap(s => s.cards.map(c => ({ stage: s, card: c })));
  }, [funnel]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader active="crm" />
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Завантаження CRM…
        </div>
      </div>
    );
  }

  if (!funnel) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader active="crm" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground text-sm">Воронок ще немає</p>
          <Button onClick={() => addFunnel('Воронка 1')} className="gap-2">
            <Plus className="w-4 h-4" /> Створити воронку
          </Button>
        </div>
      </div>
    );
  }

  const openAddCard = (stageId: string) => {
    setAddCardStageId(stageId);
    setCardDraft(emptyCardDraft);
  };

  const submitAddCard = () => {
    if (!addCardStageId || !cardDraft.title.trim()) return;
    addCard(funnel.id, addCardStageId, cardDraft);
    setAddCardStageId(null);
    setCardDraft(emptyCardDraft);
  };

  // Trello-style tile: a thin colored label strip up top (the stage's
  // color), title, and a footer row of small icon chips — same fields as
  // before (phone/email/source/date), just laid out the Trello way.
  const renderCardTile = (stage: CrmStage, card: CrmCardType) => (
    <div
      key={card.id}
      draggable
      onDragStart={() => setDraggedCard({ stageId: stage.id, cardId: card.id })}
      onClick={() => setEditingCard({ stageId: stage.id, card })}
      className="bg-card rounded-lg shadow-sm hover:shadow-md border border-border/60 overflow-hidden cursor-grab active:cursor-grabbing transition-shadow"
    >
      <div className="h-1.5" style={{ background: stage.color }} />
      <div className="p-2.5 space-y-1.5">
        <p className="text-sm font-medium text-foreground leading-snug">{card.title || 'Без імені'}</p>
        {card.note && <p className="text-xs text-muted-foreground line-clamp-2">{card.note}</p>}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {card.source && <Chip icon={Tag}>{card.source}</Chip>}
          {card.phone && <Chip icon={Phone}>{card.phone}</Chip>}
          {card.email && <Chip icon={Mail}>{card.email}</Chip>}
          {card.websiteUrl && <Chip icon={Globe}>Сайт</Chip>}
          {card.instagramUrl && <Chip icon={Instagram}>Instagram</Chip>}
          {card.telegramUrl && <Chip icon={Send}>Telegram</Chip>}
          {card.briefUrl && <Chip icon={FileText}>Бриф</Chip>}
          {card.decompositionUrl && <Chip icon={Calculator}>Декомпозиція</Chip>}
          <Chip icon={CalendarDays}>{new Date(card.createdAt).toLocaleDateString('uk-UA')}</Chip>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <AppHeader active="crm" />
      <div className="flex-1 flex min-h-0">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="p-3 flex-1 overflow-y-auto">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide px-2 mb-1.5">Воронки</p>
          <div className="space-y-0.5">
            {board.funnels.map(f => (
              <div key={f.id} className="group relative flex items-center">
                <button
                  onClick={() => setActiveFunnelId(f.id)}
                  className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                    f.id === funnel.id ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: f.color }} />
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-[10px] text-muted-foreground">{f.stages.reduce((n, s) => n + s.cards.length, 0)}</span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="absolute right-1 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-secondary text-muted-foreground" onClick={e => e.stopPropagation()}>
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { const name = prompt('Нова назва воронки', f.name); if (name) renameFunnel(f.id, name); }}>
                      <Pencil className="w-3.5 h-3.5 mr-2" /> Перейменувати
                    </DropdownMenuItem>
                    {board.funnels.length > 1 && (
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setFunnelToDelete(f.id)}>
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Видалити
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
          <button
            className="w-full flex items-center gap-1.5 px-2 py-1.5 mt-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            onClick={() => { setNewFunnelOpen(true); setNewFunnelName(`Воронка ${board.funnels.length + 1}`); }}
          >
            <Plus className="w-3.5 h-3.5" /> Додати воронку
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-border bg-card px-4 py-2.5 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Пошук за ім'ям, телефоном, email"
              className="h-8 pl-8 text-xs"
            />
          </div>
          <div className="flex-1" />
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            <button
              className={`h-8 px-2.5 flex items-center gap-1.5 text-xs font-medium transition-colors ${view === 'list' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50'}`}
              onClick={() => setView('list')}
            >
              <ListIcon className="w-3.5 h-3.5" /> List
            </button>
            <button
              className={`h-8 px-2.5 flex items-center gap-1.5 text-xs font-medium transition-colors border-l border-border ${view === 'kanban' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50'}`}
              onClick={() => setView('kanban')}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Kanban
            </button>
          </div>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => openAddCard(funnel.stages[0]?.id)}>
            <Plus className="w-3.5 h-3.5" /> Додати новий лід
          </Button>
        </div>

        {view === 'kanban' ? (
          <div className="flex-1 overflow-x-auto p-4">
            <div className="flex gap-3 items-start min-w-fit">
              {funnel.stages.map(stage => {
                const visibleCards = stage.cards.filter(matchesSearch);
                return (
                  <div
                    key={stage.id}
                    className="w-72 shrink-0 bg-secondary/40 rounded-xl border border-border flex flex-col max-h-[calc(100vh-150px)]"
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => {
                      if (draggedCard && draggedCard.stageId !== stage.id) {
                        moveCard(funnel.id, draggedCard.stageId, stage.id, draggedCard.cardId);
                      }
                      setDraggedCard(null);
                    }}
                  >
                    <div className="p-2.5 flex items-center justify-between gap-2 border-b border-border">
                      {editingStageId === stage.id ? (
                        <div className="flex items-center gap-1 flex-1">
                          <Input value={stageNameDraft} onChange={e => setStageNameDraft(e.target.value)} className="h-7 text-xs" autoFocus />
                          <Button size="sm" className="h-7 px-1.5 text-xs" onClick={() => { renameStage(funnel.id, stage.id, stageNameDraft.trim() || stage.name); setEditingStageId(null); }}>OK</Button>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: stage.color }} />
                            <span className="truncate">{stage.name}</span>
                            <span className="text-muted-foreground font-normal shrink-0">{stage.cards.length}</span>
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 text-muted-foreground hover:text-foreground rounded shrink-0">
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingStageId(stage.id); setStageNameDraft(stage.name); }}>
                                <Pencil className="w-3.5 h-3.5 mr-2" /> Перейменувати
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setStageToDelete(stage.id)}>
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Видалити
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {visibleCards.map(card => renderCardTile(stage, card))}

                      <button
                        className="w-full text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-lg py-1 px-2 flex items-center gap-1.5 justify-center transition-colors"
                        onClick={() => openAddCard(stage.id)}
                      >
                        <Plus className="w-3.5 h-3.5" /> Картка
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="w-72 shrink-0">
                {addingStage ? (
                  <div className="bg-secondary/40 rounded-xl border border-primary/40 p-3 space-y-2">
                    <Input value={newStageName} onChange={e => setNewStageName(e.target.value)} placeholder="Назва етапу" className="h-8 text-sm" autoFocus />
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" className="h-7 text-xs flex-1" disabled={!newStageName.trim()} onClick={() => { addStage(funnel.id, newStageName.trim()); setNewStageName(''); setAddingStage(false); }}>
                        Додати етап
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingStage(false)}>Скасувати</Button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="w-full text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-xl border border-dashed border-border p-3 flex items-center gap-2 justify-center transition-colors"
                    onClick={() => setAddingStage(true)}
                  >
                    <Plus className="w-4 h-4" /> Додати етап
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-4">
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60">
                  <tr>
                    {['Ім\'я', 'Телефон', 'Email', 'Джерело', 'Етап', 'Дата'].map(h => (
                      <th key={h} className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wide px-3 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allCardsFlat.filter(({ card }) => matchesSearch(card)).map(({ stage, card }) => (
                    <tr
                      key={card.id}
                      className="border-t border-border hover:bg-secondary/30 cursor-pointer transition-colors"
                      onClick={() => setEditingCard({ stageId: stage.id, card })}
                    >
                      <td className="px-3 py-2 font-semibold text-foreground">{card.title || 'Без імені'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{card.phone || '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{card.email || '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{card.source || '—'}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: stage.color }} />
                          {stage.name}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{new Date(card.createdAt).toLocaleDateString('uk-UA')}</td>
                    </tr>
                  ))}
                  {allCardsFlat.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground text-sm">Ще немає лідів у цій воронці</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Add card panel */}
      <Sheet open={!!addCardStageId} onOpenChange={(o) => { if (!o) setAddCardStageId(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 gap-0 flex flex-col">
          <SheetHeader className="flex-row items-center gap-3 space-y-0 text-left p-6 pb-2 border-b border-border shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <SheetTitle className="text-base font-bold">Новий лід</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            <IconInput icon={User} value={cardDraft.title} onChange={e => setCardDraft({ ...cardDraft, title: e.target.value })} placeholder="Ім'я" autoFocus />
            <IconInput icon={Phone} value={cardDraft.phone} onChange={e => setCardDraft({ ...cardDraft, phone: e.target.value })} placeholder="Телефон" />
            <IconInput icon={Mail} value={cardDraft.email} onChange={e => setCardDraft({ ...cardDraft, email: e.target.value })} placeholder="Email" />
            <IconInput icon={Tag} value={cardDraft.source} onChange={e => setCardDraft({ ...cardDraft, source: e.target.value })} placeholder="Джерело (напр. квіз, лендінг)" />
            <IconInput icon={Globe} value={cardDraft.websiteUrl} onChange={e => setCardDraft({ ...cardDraft, websiteUrl: e.target.value })} placeholder="Посилання на сайт" />
            <IconInput icon={Instagram} value={cardDraft.instagramUrl} onChange={e => setCardDraft({ ...cardDraft, instagramUrl: e.target.value })} placeholder="Посилання на Instagram" />
            <IconInput icon={Send} value={cardDraft.telegramUrl} onChange={e => setCardDraft({ ...cardDraft, telegramUrl: e.target.value })} placeholder="Посилання на Telegram клієнта" />
            <IconInput icon={FileText} value={cardDraft.briefUrl} onChange={e => setCardDraft({ ...cardDraft, briefUrl: e.target.value })} placeholder="Посилання на бриф клієнта" />
            <IconInput icon={Calculator} value={cardDraft.decompositionUrl} onChange={e => setCardDraft({ ...cardDraft, decompositionUrl: e.target.value })} placeholder="Посилання на декомпозицію" />
            <div className="relative">
              <Layers className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
              <Select value={addCardStageId || undefined} onValueChange={setAddCardStageId}>
                <SelectTrigger className="h-10 pl-9"><SelectValue placeholder="Етап" /></SelectTrigger>
                <SelectContent>
                  {funnel.stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Textarea value={cardDraft.note} onChange={e => setCardDraft({ ...cardDraft, note: e.target.value })} placeholder="Нотатка" className="min-h-[70px] resize-none" />
          </div>
          <SheetFooter className="p-4 bg-secondary/40 border-t border-border flex-row justify-end gap-2 shrink-0">
            <Button variant="outline" onClick={() => setAddCardStageId(null)}>Скасувати</Button>
            <Button disabled={!cardDraft.title.trim()} onClick={submitAddCard}>Додати лід</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit card panel */}
      <Sheet open={!!editingCard} onOpenChange={(o) => { if (!o) setEditingCard(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 gap-0 flex flex-col">
          {editingCard && (
            <>
              <SheetHeader className="flex-row items-center gap-3 space-y-0 text-left p-6 pb-2 border-b border-border shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <SheetTitle className="text-base font-bold">Картка ліда</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                <IconInput icon={User} value={editingCard.card.title} onChange={e => setEditingCard({ ...editingCard, card: { ...editingCard.card, title: e.target.value } })} placeholder="Ім'я" />
                <IconInput icon={Phone} value={editingCard.card.phone} onChange={e => setEditingCard({ ...editingCard, card: { ...editingCard.card, phone: e.target.value } })} placeholder="Телефон" />
                <IconInput icon={Mail} value={editingCard.card.email} onChange={e => setEditingCard({ ...editingCard, card: { ...editingCard.card, email: e.target.value } })} placeholder="Email" />
                <IconInput icon={Tag} value={editingCard.card.source} onChange={e => setEditingCard({ ...editingCard, card: { ...editingCard.card, source: e.target.value } })} placeholder="Джерело" />
                <IconInput icon={Globe} value={editingCard.card.websiteUrl} onChange={e => setEditingCard({ ...editingCard, card: { ...editingCard.card, websiteUrl: e.target.value } })} placeholder="Посилання на сайт" />
                <IconInput icon={Instagram} value={editingCard.card.instagramUrl} onChange={e => setEditingCard({ ...editingCard, card: { ...editingCard.card, instagramUrl: e.target.value } })} placeholder="Посилання на Instagram" />
                <IconInput icon={Send} value={editingCard.card.telegramUrl} onChange={e => setEditingCard({ ...editingCard, card: { ...editingCard.card, telegramUrl: e.target.value } })} placeholder="Посилання на Telegram клієнта" />
                <IconInput icon={FileText} value={editingCard.card.briefUrl} onChange={e => setEditingCard({ ...editingCard, card: { ...editingCard.card, briefUrl: e.target.value } })} placeholder="Посилання на бриф клієнта" />
                <IconInput icon={Calculator} value={editingCard.card.decompositionUrl} onChange={e => setEditingCard({ ...editingCard, card: { ...editingCard.card, decompositionUrl: e.target.value } })} placeholder="Посилання на декомпозицію" />
                <Textarea value={editingCard.card.note} onChange={e => setEditingCard({ ...editingCard, card: { ...editingCard.card, note: e.target.value } })} placeholder="Нотатка" className="min-h-[80px] resize-none" />
              </div>
              <SheetFooter className="flex-row items-center justify-between p-4 bg-secondary/40 border-t border-border shrink-0">
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive gap-1.5"
                  onClick={() => { deleteCard(funnel.id, editingCard.stageId, editingCard.card.id); setEditingCard(null); }}
                >
                  <Trash2 className="w-4 h-4" /> Видалити
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditingCard(null)}>Скасувати</Button>
                  <Button
                    onClick={() => {
                      const { title, phone, email, source, note, websiteUrl, instagramUrl, telegramUrl, briefUrl, decompositionUrl } = editingCard.card;
                      updateCard(funnel.id, editingCard.stageId, editingCard.card.id, { title: title.trim() || 'Без імені', phone, email, source, note, websiteUrl, instagramUrl, telegramUrl, briefUrl, decompositionUrl });
                      setEditingCard(null);
                    }}
                  >
                    Зберегти
                  </Button>
                </div>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New funnel dialog */}
      <AlertDialog open={newFunnelOpen} onOpenChange={setNewFunnelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Нова воронка</AlertDialogTitle>
          </AlertDialogHeader>
          <Input value={newFunnelName} onChange={e => setNewFunnelName(e.target.value)} placeholder="Назва воронки" autoFocus />
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction disabled={!newFunnelName.trim()} onClick={() => { addFunnel(newFunnelName.trim()); setNewFunnelOpen(false); }}>
              Створити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete stage confirm */}
      <AlertDialog open={!!stageToDelete} onOpenChange={(o) => { if (!o) setStageToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити етап?</AlertDialogTitle>
            <AlertDialogDescription>Усі картки в цьому етапі буде видалено. Це незворотно.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (stageToDelete) deleteStage(funnel.id, stageToDelete); setStageToDelete(null); }}>
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete funnel confirm */}
      <AlertDialog open={!!funnelToDelete} onOpenChange={(o) => { if (!o) setFunnelToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити воронку?</AlertDialogTitle>
            <AlertDialogDescription>Усі етапи й картки цієї воронки буде видалено. Це незворотно.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (funnelToDelete) { deleteFunnel(funnelToDelete); if (funnelToDelete === activeFunnelId) setActiveFunnelId(null); } setFunnelToDelete(null); }}
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CrmBoard;
