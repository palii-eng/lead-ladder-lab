import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { useCrm, CrmCard as CrmCardType } from '@/context/CrmContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const CrmBoard: React.FC = () => {
  const navigate = useNavigate();
  const { board, loading, addFunnel, renameFunnel, deleteFunnel, addStage, renameStage, deleteStage, addCard, updateCard, deleteCard, moveCard } = useCrm();

  const [activeFunnelId, setActiveFunnelId] = useState<string | null>(null);
  const funnel = board.funnels.find(f => f.id === activeFunnelId) || board.funnels[0] || null;

  const [editingFunnel, setEditingFunnel] = useState(false);
  const [funnelNameDraft, setFunnelNameDraft] = useState('');
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageNameDraft, setStageNameDraft] = useState('');
  const [addingStage, setAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [addingCardStageId, setAddingCardStageId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardNote, setNewCardNote] = useState('');
  const [editingCard, setEditingCard] = useState<{ stageId: string; card: CrmCardType } | null>(null);
  const [draggedCard, setDraggedCard] = useState<{ stageId: string; cardId: string } | null>(null);
  const [funnelToDelete, setFunnelToDelete] = useState<string | null>(null);
  const [stageToDelete, setStageToDelete] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="px-6 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="font-bold text-foreground">CRM — воронки продажів</h1>
        </div>
        <div className="px-6 pb-3 flex items-center gap-2 flex-wrap">
          {board.funnels.map(f => (
            <div key={f.id} className="flex items-center">
              <button
                onClick={() => setActiveFunnelId(f.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  f.id === funnel.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
                }`}
              >
                {f.name}
              </button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => { addFunnel(`Воронка ${board.funnels.length + 1}`); }}
          >
            <Plus className="w-3.5 h-3.5" /> Воронка
          </Button>
        </div>
        <div className="px-6 pb-3 flex items-center gap-2">
          {editingFunnel ? (
            <>
              <Input
                value={funnelNameDraft}
                onChange={e => setFunnelNameDraft(e.target.value)}
                className="h-8 text-sm max-w-xs"
                autoFocus
              />
              <Button size="sm" className="h-8 px-2" onClick={() => { renameFunnel(funnel.id, funnelNameDraft.trim() || funnel.name); setEditingFunnel(false); }}>
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingFunnel(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">Поточна воронка: <span className="font-semibold text-foreground">{funnel.name}</span></span>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => { setEditingFunnel(true); setFunnelNameDraft(funnel.name); }}>
                <Pencil className="w-3 h-3" /> Перейменувати
              </Button>
              {board.funnels.length > 1 && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => setFunnelToDelete(funnel.id)}>
                  <Trash2 className="w-3 h-3" /> Видалити воронку
                </Button>
              )}
            </>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 items-start min-w-fit">
          {funnel.stages.map(stage => (
            <div
              key={stage.id}
              className="w-72 shrink-0 bg-secondary/40 rounded-xl border border-border flex flex-col max-h-[calc(100vh-220px)]"
              onDragOver={e => e.preventDefault()}
              onDrop={() => {
                if (draggedCard && draggedCard.stageId !== stage.id) {
                  moveCard(funnel.id, draggedCard.stageId, stage.id, draggedCard.cardId);
                }
                setDraggedCard(null);
              }}
            >
              <div className="p-3 flex items-center justify-between gap-2 border-b border-border">
                {editingStageId === stage.id ? (
                  <div className="flex items-center gap-1 flex-1">
                    <Input
                      value={stageNameDraft}
                      onChange={e => setStageNameDraft(e.target.value)}
                      className="h-7 text-xs"
                      autoFocus
                    />
                    <Button size="sm" className="h-7 px-1.5" onClick={() => { renameStage(funnel.id, stage.id, stageNameDraft.trim() || stage.name); setEditingStageId(null); }}>
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => setEditingStageId(null)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                      {stage.name}
                      <span className="text-muted-foreground font-normal normal-case">({stage.cards.length})</span>
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button
                        className="p-1 text-muted-foreground hover:text-foreground rounded"
                        onClick={() => { setEditingStageId(stage.id); setStageNameDraft(stage.name); }}
                        title="Перейменувати етап"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        className="p-1 text-muted-foreground hover:text-destructive rounded"
                        onClick={() => setStageToDelete(stage.id)}
                        title="Видалити етап"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {stage.cards.map(card => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => setDraggedCard({ stageId: stage.id, cardId: card.id })}
                    onClick={() => setEditingCard({ stageId: stage.id, card })}
                    className="bg-card border border-border rounded-lg p-2.5 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors shadow-sm"
                  >
                    <p className="text-sm font-semibold text-foreground truncate">{card.title}</p>
                    {card.note && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{card.note}</p>}
                  </div>
                ))}

                {addingCardStageId === stage.id ? (
                  <div className="bg-card border border-primary/40 rounded-lg p-2.5 space-y-1.5">
                    <Input
                      value={newCardTitle}
                      onChange={e => setNewCardTitle(e.target.value)}
                      placeholder="Ім'я / назва ліда"
                      className="h-7 text-xs"
                      autoFocus
                    />
                    <Textarea
                      value={newCardNote}
                      onChange={e => setNewCardNote(e.target.value)}
                      placeholder="Нотатка (необов'язково)"
                      className="text-xs min-h-[50px]"
                    />
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        className="h-7 text-xs flex-1"
                        disabled={!newCardTitle.trim()}
                        onClick={() => {
                          addCard(funnel.id, stage.id, newCardTitle.trim(), newCardNote.trim());
                          setNewCardTitle('');
                          setNewCardNote('');
                          setAddingCardStageId(null);
                        }}
                      >
                        Додати
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingCardStageId(null)}>
                        Скасувати
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="w-full text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-lg p-2 flex items-center gap-1.5 justify-center transition-colors"
                    onClick={() => { setAddingCardStageId(stage.id); setNewCardTitle(''); setNewCardNote(''); }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Картка
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="w-72 shrink-0">
            {addingStage ? (
              <div className="bg-secondary/40 rounded-xl border border-primary/40 p-3 space-y-2">
                <Input
                  value={newStageName}
                  onChange={e => setNewStageName(e.target.value)}
                  placeholder="Назва етапу"
                  className="h-8 text-sm"
                  autoFocus
                />
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    className="h-7 text-xs flex-1"
                    disabled={!newStageName.trim()}
                    onClick={() => { addStage(funnel.id, newStageName.trim()); setNewStageName(''); setAddingStage(false); }}
                  >
                    Додати етап
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingStage(false)}>
                    Скасувати
                  </Button>
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

      {/* Edit card dialog */}
      <AlertDialog open={!!editingCard} onOpenChange={(o) => { if (!o) setEditingCard(null); }}>
        <AlertDialogContent>
          {editingCard && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Картка ліда</AlertDialogTitle>
              </AlertDialogHeader>
              <div className="space-y-2">
                <Input
                  value={editingCard.card.title}
                  onChange={e => setEditingCard({ ...editingCard, card: { ...editingCard.card, title: e.target.value } })}
                  placeholder="Ім'я / назва ліда"
                />
                <Textarea
                  value={editingCard.card.note}
                  onChange={e => setEditingCard({ ...editingCard, card: { ...editingCard.card, note: e.target.value } })}
                  placeholder="Нотатка"
                  className="min-h-[100px]"
                />
              </div>
              <AlertDialogFooter className="flex-row justify-between sm:justify-between">
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive gap-1.5"
                  onClick={() => {
                    deleteCard(funnel.id, editingCard.stageId, editingCard.card.id);
                    setEditingCard(null);
                  }}
                >
                  <Trash2 className="w-4 h-4" /> Видалити
                </Button>
                <div className="flex gap-2">
                  <AlertDialogCancel>Скасувати</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      updateCard(funnel.id, editingCard.stageId, editingCard.card.id, {
                        title: editingCard.card.title.trim() || 'Без назви',
                        note: editingCard.card.note,
                      });
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

      {/* Delete stage confirm */}
      <AlertDialog open={!!stageToDelete} onOpenChange={(o) => { if (!o) setStageToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити етап?</AlertDialogTitle>
            <AlertDialogDescription>Усі картки в цьому етапі буде видалено. Це незворотно.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (stageToDelete) deleteStage(funnel.id, stageToDelete); setStageToDelete(null); }}
            >
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
              onClick={() => {
                if (funnelToDelete) {
                  deleteFunnel(funnelToDelete);
                  if (funnelToDelete === activeFunnelId) setActiveFunnelId(null);
                }
                setFunnelToDelete(null);
              }}
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
