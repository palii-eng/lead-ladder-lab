import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Pencil, Trash2, MoreHorizontal, Search,
  LayoutGrid, List as ListIcon, Phone, Mail, Snowflake, Clock, Flame,
} from 'lucide-react';
import { useCrm, CrmCard as CrmCardType, CrmStage } from '@/context/CrmContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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

// Lead "temperature" badge — cold/neutral/hot bucketed off the 0-100 score,
// same idea as a real CRM's lead-scoring pill.
const scoreBadge = (score: number) => {
  if (score >= 60) return { Icon: Flame, bg: 'hsl(4 85% 95%)', text: 'hsl(4 75% 42%)' };
  if (score >= 30) return { Icon: Clock, bg: 'hsl(38 90% 94%)', text: 'hsl(30 75% 38%)' };
  return { Icon: Snowflake, bg: 'hsl(210 60% 95%)', text: 'hsl(210 55% 45%)' };
};

const emptyCardDraft = { title: '', phone: '', email: '', source: '', score: 0, note: '' };

const CrmBoard: React.FC = () => {
  const navigate = useNavigate();
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
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Завантаження CRM…
      </div>
    );
  }

  if (!funnel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground text-sm">Воронок ще немає</p>
        <Button onClick={() => addFunnel('Воронка 1')} className="gap-2">
          <Plus className="w-4 h-4" /> Створити воронку
        </Button>
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

  const renderCardTile = (stage: CrmStage, card: CrmCardType) => {
    const badge = scoreBadge(card.score);
    const Icon = badge.Icon;
    return (
      <div
        key={card.id}
        draggable
        onDragStart={() => setDraggedCard({ stageId: stage.id, cardId: card.id })}
        onClick={() => setEditingCard({ stageId: stage.id, card })}
        className="bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors shadow-sm space-y-1.5"
      >
        <p className="text-sm font-semibold text-foreground truncate">{card.title || 'Без імені'}</p>
        {card.phone && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Phone className="w-3 h-3 shrink-0" /> {card.phone}
          </p>
        )}
        {card.email && !card.phone && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Mail className="w-3 h-3 shrink-0" /> {card.email}
          </p>
        )}
        {card.source && <p className="text-xs text-muted-foreground truncate">{card.source}</p>}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="text-[10px] text-muted-foreground">
            {new Date(card.createdAt).toLocaleDateString('uk-UA')}
          </span>
          <div className="flex items-center gap-1">
            {card.score > 0 && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: badge.bg, color: badge.text }}
              >
                <Icon className="w-3 h-3" /> {card.score}%
              </span>
            )}
            {card.source && <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">Лід</Badge>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="p-4 flex items-center gap-2 border-b border-border">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="font-bold text-foreground text-sm">CRM</span>
        </div>
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
            <Plus className="w-3.5 h-3.5" /> Add
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
                        className="w-full text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-lg p-2 flex items-center gap-1.5 justify-center transition-colors"
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
                    {['Ім\'я', 'Телефон', 'Email', 'Джерело', 'Етап', 'Оцінка', 'Дата'].map(h => (
                      <th key={h} className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wide px-3 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allCardsFlat.filter(({ card }) => matchesSearch(card)).map(({ stage, card }) => {
                    const badge = scoreBadge(card.score);
                    const Icon = badge.Icon;
                    return (
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
                        <td className="px-3 py-2">
                          {card.score > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: badge.bg, color: badge.text }}>
                              <Icon className="w-3 h-3" /> {card.score}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{new Date(card.createdAt).toLocaleDateString('uk-UA')}</td>
                      </tr>
                    );
                  })}
                  {allCardsFlat.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground text-sm">Ще немає лідів у цій воронці</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add card dialog */}
      <AlertDialog open={!!addCardStageId} onOpenChange={(o) => { if (!o) setAddCardStageId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Новий лід</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Input value={cardDraft.title} onChange={e => setCardDraft({ ...cardDraft, title: e.target.value })} placeholder="Ім'я" autoFocus />
            <Input value={cardDraft.phone} onChange={e => setCardDraft({ ...cardDraft, phone: e.target.value })} placeholder="Телефон" />
            <Input value={cardDraft.email} onChange={e => setCardDraft({ ...cardDraft, email: e.target.value })} placeholder="Email" />
            <Input value={cardDraft.source} onChange={e => setCardDraft({ ...cardDraft, source: e.target.value })} placeholder="Джерело (напр. квіз, лендінг)" />
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Етап</label>
              <Select value={addCardStageId || undefined} onValueChange={setAddCardStageId}>
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {funnel.stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Оцінка ліда: {cardDraft.score}%</label>
              <input
                type="range" min={0} max={100} step={5}
                value={cardDraft.score}
                onChange={e => setCardDraft({ ...cardDraft, score: Number(e.target.value) })}
                className="flex-1"
              />
            </div>
            <Textarea value={cardDraft.note} onChange={e => setCardDraft({ ...cardDraft, note: e.target.value })} placeholder="Нотатка" className="min-h-[60px]" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction disabled={!cardDraft.title.trim()} onClick={submitAddCard}>Додати</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit card dialog */}
      <AlertDialog open={!!editingCard} onOpenChange={(o) => { if (!o) setEditingCard(null); }}>
        <AlertDialogContent>
          {editingCard && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Картка ліда</AlertDialogTitle>
              </AlertDialogHeader>
              <div className="space-y-2">
                <Input value={editingCard.card.title} onChange={e => setEditingCard({ ...editingCard, card: { ...editingCard.card, title: e.target.value } })} placeholder="Ім'я" />
                <Input value={editingCard.card.phone} onChange={e => setEditingCard({ ...editingCard, card: { ...editingCard.card, phone: e.target.value } })} placeholder="Телефон" />
                <Input value={editingCard.card.email} onChange={e => setEditingCard({ ...editingCard, card: { ...editingCard.card, email: e.target.value } })} placeholder="Email" />
                <Input value={editingCard.card.source} onChange={e => setEditingCard({ ...editingCard, card: { ...editingCard.card, source: e.target.value } })} placeholder="Джерело" />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">Оцінка ліда: {editingCard.card.score}%</label>
                  <input
                    type="range" min={0} max={100} step={5}
                    value={editingCard.card.score}
                    onChange={e => setEditingCard({ ...editingCard, card: { ...editingCard.card, score: Number(e.target.value) } })}
                    className="flex-1"
                  />
                </div>
                <Textarea value={editingCard.card.note} onChange={e => setEditingCard({ ...editingCard, card: { ...editingCard.card, note: e.target.value } })} placeholder="Нотатка" className="min-h-[80px]" />
              </div>
              <AlertDialogFooter className="flex-row justify-between sm:justify-between">
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive gap-1.5"
                  onClick={() => { deleteCard(funnel.id, editingCard.stageId, editingCard.card.id); setEditingCard(null); }}
                >
                  <Trash2 className="w-4 h-4" /> Видалити
                </Button>
                <div className="flex gap-2">
                  <AlertDialogCancel>Скасувати</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      const { title, phone, email, source, score, note } = editingCard.card;
                      updateCard(funnel.id, editingCard.stageId, editingCard.card.id, { title: title.trim() || 'Без імені', phone, email, source, score, note });
                      setEditingCard(null);
                    }}
                  >
                    Зберегти
                  </AlertDialogAction>
                </div>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

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
