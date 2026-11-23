'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Check, Clock, FileText, FolderOpen, Loader2, Save, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { DraftContext, PendingDraft, QuoteDraftController, QuoteDraftRecord } from '@/lib/useQuoteDraft';

type Theme = 'dark' | 'light';

// Site público = escuro; painel admin = claro.
const T = {
  dark: {
    panel: 'bg-marble-dark border border-white/15 text-white',
    muted: 'text-white/60',
    faint: 'text-white/40',
    input:
      'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-marble-gold',
    primary:
      'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-marble-gold text-marble-dark font-semibold text-sm cursor-pointer disabled:opacity-50',
    secondary:
      'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-white/20 text-white/80 text-sm cursor-pointer hover:border-marble-gold/60 disabled:opacity-50',
    toolbarBtn:
      'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-white/15 text-white/80 text-sm cursor-pointer hover:border-marble-gold/60 hover:text-marble-gold transition-colors disabled:opacity-50',
    row: 'border border-white/10 hover:border-marble-gold/50 bg-white/[0.03]',
    badge: 'bg-marble-gold/15 text-marble-gold',
    close: 'text-white/50 hover:text-white',
    danger: 'text-white/40 hover:text-red-400',
  },
  light: {
    panel: 'bg-white border border-marble-gold/20 text-ink',
    muted: 'text-marble-gray',
    faint: 'text-gray-400',
    input:
      'flex h-10 w-full rounded-xl border border-[var(--line)] bg-white/90 px-3 py-2 text-sm text-ink focus:outline-none focus:border-marble-gold focus:ring-4 focus:ring-marble-gold/15',
    primary:
      'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-b from-ink-2 to-ink text-white text-sm font-medium ring-1 ring-marble-gold/25 cursor-pointer disabled:opacity-50',
    secondary:
      'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-[var(--line)] bg-white/80 text-ink text-sm font-medium cursor-pointer hover:border-marble-gold/50 disabled:opacity-50',
    toolbarBtn:
      'inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[var(--line)] bg-white/80 text-ink text-sm font-medium cursor-pointer hover:border-marble-gold/50 transition-colors disabled:opacity-50',
    row: 'border border-[var(--line)] hover:border-marble-gold/50 bg-white',
    badge: 'bg-marble-gold/12 text-gold-deep',
    close: 'text-gray-400 hover:text-ink',
    danger: 'text-gray-400 hover:text-red-600',
  },
} as const;

function formatWhen(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return sameDay ? `hoje às ${time}` : `${date.toLocaleDateString('pt-BR')} às ${time}`;
}

function describe(info: { itemCount: number; estimatedTotal: number | null; clientLabel: string | null }) {
  const parts = [`${info.itemCount} ${info.itemCount === 1 ? 'peça' : 'peças'}`];
  if (info.clientLabel) parts.unshift(info.clientLabel);
  if (info.estimatedTotal) parts.push(formatCurrency(info.estimatedTotal));
  return parts.join(' · ');
}

function Modal({
  theme,
  onClose,
  children,
  wide,
}: {
  theme: Theme;
  onClose?: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={`relative w-full ${wide ? 'max-w-lg' : 'max-w-md'} max-h-[88vh] overflow-y-auto rounded-2xl p-5 sm:p-6 shadow-2xl ${T[theme].panel}`}
      >
        {onClose && (
          <button
            onClick={onClose}
            className={`absolute right-3 top-3 p-1 rounded-lg cursor-pointer ${T[theme].close}`}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}

// "Você estava montando um orçamento. Continuar?"
export function DraftResumePrompt({
  draft,
  theme,
}: {
  draft: Pick<QuoteDraftController, 'phase' | 'pending' | 'resume' | 'discardPending'>;
  theme: Theme;
}) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  if (draft.phase !== 'prompt' || !draft.pending) return null;
  const t = T[theme];
  const pending: PendingDraft = draft.pending;

  return (
    <Modal theme={theme}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${t.badge}`}>
          <FileText size={20} />
        </div>
        <h3 className="text-lg font-bold">Você estava montando um orçamento</h3>
      </div>
      <p className={`text-sm ${t.muted}`}>Quer continuar de onde parou?</p>
      <div className={`mt-4 rounded-xl p-3 text-sm ${t.row}`}>
        <p>{describe(pending)}</p>
        <p className={`text-xs mt-1 flex items-center gap-1 ${t.faint}`}>
          <Clock size={12} /> Última alteração {formatWhen(pending.updatedAt)}
        </p>
      </div>

      {confirmDiscard ? (
        <div className="mt-5 space-y-3">
          <p className={`text-sm ${t.muted}`}>
            O orçamento em andamento será descartado. Rascunhos que você salvou pelo botão continuam guardados.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button className={`${t.secondary} flex-1`} onClick={() => setConfirmDiscard(false)}>
              Voltar
            </button>
            <button className={`${t.primary} flex-1`} onClick={draft.discardPending}>
              Descartar e começar novo
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-col sm:flex-row gap-2">
          <button className={`${t.secondary} flex-1`} onClick={() => setConfirmDiscard(true)}>
            Começar um novo
          </button>
          <button className={`${t.primary} flex-1`} onClick={draft.resume} autoFocus>
            Continuar orçamento
          </button>
        </div>
      )}
    </Modal>
  );
}

// Botões "Salvar rascunho" e "Carregar rascunho" + status do salvamento automático.
export function DraftToolbar<F>({
  draft,
  context,
  theme,
  defaultName,
  isEmpty,
  className = '',
}: {
  draft: QuoteDraftController<F>;
  context: DraftContext;
  theme: Theme;
  defaultName: string;
  isEmpty: boolean;
  className?: string;
}) {
  const t = T[theme];
  const [saveOpen, setSaveOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['quote-drafts', context],
    queryFn: async () =>
      (await api.get('/quote-drafts', { params: { context } })).data.drafts as QuoteDraftRecord<F>[],
    enabled: listOpen,
  });
  const drafts = data ?? [];
  const currentLinked = draft.linkedDraftId;

  function openSave() {
    const current = currentLinked ? data?.find((d) => d.id === currentLinked)?.name : null;
    setName(current || defaultName);
    setSaveError(null);
    setSaveOpen(true);
  }

  async function submitSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await draft.saveNamed(name);
      setSaveOpen(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } catch (err) {
      setSaveError(
        (isAxiosError(err) && (err.response?.data as { error?: string })?.error) ||
          'Não foi possível salvar o rascunho.'
      );
    } finally {
      setSaving(false);
    }
  }

  function load(record: QuoteDraftRecord<F>) {
    if (
      !isEmpty &&
      record.id !== currentLinked &&
      !window.confirm('Carregar este rascunho? O que está na tela agora será substituído (salve antes se quiser guardar).')
    ) {
      return;
    }
    draft.loadDraft(record);
    setListOpen(false);
  }

  async function remove(record: QuoteDraftRecord<F>) {
    if (!window.confirm(`Excluir o rascunho "${record.name || 'sem nome'}"?`)) return;
    setDeletingId(record.id);
    try {
      await draft.deleteDraft(record);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button type="button" className={t.toolbarBtn} onClick={openSave} disabled={isEmpty || draft.phase !== 'ready'}>
        {justSaved ? <Check size={15} /> : <Save size={15} />} {justSaved ? 'Rascunho salvo' : 'Salvar rascunho'}
      </button>
      <button type="button" className={t.toolbarBtn} onClick={() => setListOpen(true)}>
        <FolderOpen size={15} /> Carregar rascunho
      </button>
      {draft.lastSavedAt && (
        <span className={`text-xs ${t.faint}`}>
          Salvo automaticamente às{' '}
          {draft.lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}

      {saveOpen && (
        <Modal theme={theme} onClose={() => setSaveOpen(false)}>
          <h3 className="text-lg font-bold mb-1">{currentLinked ? 'Atualizar rascunho' : 'Salvar rascunho'}</h3>
          <p className={`text-sm mb-4 ${t.muted}`}>
            Fica guardado no seu login. Depois é só usar &quot;Carregar rascunho&quot; para continuar.
          </p>
          <form onSubmit={submitSave} className="space-y-4">
            <div>
              <label htmlFor="draft-name" className={`text-sm mb-1.5 block ${t.muted}`}>
                Nome do rascunho
              </label>
              <input
                id="draft-name"
                className={t.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                autoFocus
              />
            </div>
            {saveError && <p className="text-sm text-red-500">{saveError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className={t.secondary} onClick={() => setSaveOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className={t.primary} disabled={saving}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {listOpen && (
        <Modal theme={theme} onClose={() => setListOpen(false)} wide>
          <h3 className="text-lg font-bold mb-1">Rascunhos de orçamento</h3>
          <p className={`text-sm mb-4 ${t.muted}`}>Orçamentos em andamento e salvos que ainda não foram criados.</p>

          {isLoading ? (
            <p className={`text-sm flex items-center gap-2 ${t.muted}`}>
              <Loader2 size={15} className="animate-spin" /> Carregando...
            </p>
          ) : drafts.length === 0 ? (
            <p className={`text-sm ${t.muted}`}>Nenhum rascunho salvo ainda.</p>
          ) : (
            <ul className="space-y-2">
              {drafts.map((record) => (
                <li key={record.id} className={`rounded-xl p-3 flex items-center gap-3 transition-colors ${t.row}`}>
                  <button type="button" onClick={() => load(record)} className="flex-1 min-w-0 text-left cursor-pointer">
                    <p className="font-medium truncate flex items-center gap-2">
                      {record.isAutosave ? 'Em andamento (salvo automaticamente)' : record.name || 'Rascunho sem nome'}
                      {record.id === currentLinked && (
                        <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${t.badge}`}>
                          aberto
                        </span>
                      )}
                    </p>
                    <p className={`text-xs truncate ${t.muted}`}>{describe(record)}</p>
                    <p className={`text-xs ${t.faint}`}>Atualizado {formatWhen(record.updatedAt)}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(record)}
                    disabled={deletingId === record.id}
                    className={`p-2 rounded-lg cursor-pointer shrink-0 ${t.danger}`}
                    aria-label="Excluir rascunho"
                    title="Excluir rascunho"
                  >
                    {deletingId === record.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}
