'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type DraftContext = 'SITE' | 'ADMIN';

export interface DraftSummary {
  itemCount: number;
  estimatedTotal: number | null;
  clientLabel: string | null;
}

// O que vai para o servidor/localStorage: o estado do formulário e, se o
// rascunho veio de um "Salvar rascunho", o id dele (para salvar por cima).
interface DraftPayload<T> {
  v: 1;
  form: T;
  linkedDraftId: string | null;
}

export interface QuoteDraftRecord<T = unknown> {
  id: string;
  isAutosave: boolean;
  name: string | null;
  data: DraftPayload<T>;
  itemCount: number;
  estimatedTotal: number | null;
  clientLabel: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PendingDraft {
  updatedAt: string;
  itemCount: number;
  estimatedTotal: number | null;
  clientLabel: string | null;
}

// O servidor tem limite de requisições por IP: o rascunho em andamento vai
// para o navegador na hora e para o servidor no máximo a cada 15 s (e mais uma
// vez quando a página é fechada/escondida).
const LOCAL_DEBOUNCE_MS = 400;
const SERVER_THROTTLE_MS = 15_000;

interface LocalEntry<T> extends DraftSummary {
  savedAt: string;
  payload: DraftPayload<T>;
}

function readLocal<T>(key: string): LocalEntry<T> | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as LocalEntry<T>) : null;
  } catch {
    return null;
  }
}
function writeLocal<T>(key: string, entry: LocalEntry<T>) {
  try {
    window.localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Sem localStorage (modo privado, cota cheia): segue só com o servidor.
  }
}
function removeLocal(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Rascunho de orçamento salvo no login de quem está montando.
 *
 * - "Em andamento": salvo automaticamente; ao voltar (recarregar ou abrir de
 *   novo, inclusive em outro aparelho) pergunta se quer continuar.
 * - "Salvar rascunho": guarda um rascunho nomeado, listado em "Carregar rascunho".
 */
export function useQuoteDraft<T>({
  context,
  ownerKey,
  form,
  isEmpty,
  summary,
  onRestore,
  enabled = true,
}: {
  context: DraftContext;
  // Identifica o login no navegador (o servidor já separa por login sozinho).
  ownerKey: string | null;
  form: T;
  isEmpty: boolean;
  summary: DraftSummary;
  onRestore: (form: T) => void;
  // false depois que o orçamento foi criado (não salva mais).
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const localKey = ownerKey ? `quote-draft:${context}:${ownerKey}` : null;

  const [phase, setPhase] = useState<'checking' | 'prompt' | 'ready'>('checking');
  const [pending, setPending] = useState<PendingDraft | null>(null);
  const [linkedDraftId, setLinkedDraftId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const pendingPayloadRef = useRef<DraftPayload<T> | null>(null);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  const payload: DraftPayload<T> = { v: 1, form, linkedDraftId };
  const serialized = JSON.stringify(payload);
  const latestRef = useRef({ serialized, payload, summary, isEmpty });
  latestRef.current = { serialized, payload, summary, isEmpty };

  const lastServerRef = useRef<string | null>(null);
  const lastServerAtRef = useRef(0);
  const serverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedRef = useRef(false);

  // Ao abrir: procura um rascunho em andamento (navegador ou servidor, o mais
  // recente) e pergunta se quer continuar.
  useEffect(() => {
    if (!localKey) return;
    let active = true;
    const local = readLocal<T>(localKey);

    api
      .get('/quote-drafts/current', { params: { context } })
      .then((res) => res.data.draft as QuoteDraftRecord<T> | null)
      .catch(() => null)
      .then((server) => {
        if (!active) return;
        const localTime = local ? new Date(local.savedAt).getTime() : 0;
        const serverTime = server ? new Date(server.updatedAt).getTime() : 0;

        let chosen: { payload: DraftPayload<T>; info: PendingDraft } | null = null;
        if (local && localTime >= serverTime) {
          chosen = {
            payload: local.payload,
            info: {
              updatedAt: local.savedAt,
              itemCount: local.itemCount,
              estimatedTotal: local.estimatedTotal,
              clientLabel: local.clientLabel,
            },
          };
        } else if (server?.data?.form) {
          chosen = {
            payload: server.data,
            info: {
              updatedAt: server.updatedAt,
              itemCount: server.itemCount,
              estimatedTotal: server.estimatedTotal,
              clientLabel: server.clientLabel,
            },
          };
        }

        if (chosen) {
          pendingPayloadRef.current = chosen.payload;
          setPending(chosen.info);
          setPhase('prompt');
        } else {
          setPhase('ready');
        }
      });

    return () => {
      active = false;
    };
  }, [context, localKey]);

  const pushToServer = useCallback(
    async (keepalive = false) => {
      const { serialized: current, payload: body, summary: sum, isEmpty: empty } = latestRef.current;
      if (empty || finishedRef.current || current === lastServerRef.current) return;
      lastServerRef.current = current;
      lastServerAtRef.current = Date.now();
      const data = { context, data: body, ...sum };
      try {
        if (keepalive) {
          await fetch('/api/quote-drafts/current', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(data),
            keepalive: true,
          });
        } else {
          await api.put('/quote-drafts/current', data);
        }
        setLastSavedAt(new Date());
      } catch {
        lastServerRef.current = null; // tenta de novo na próxima mudança
      }
    },
    [context]
  );

  // Salvamento automático do rascunho em andamento.
  useEffect(() => {
    if (phase !== 'ready' || !enabled || !localKey || isEmpty || finishedRef.current) return;

    const localTimer = setTimeout(() => {
      writeLocal(localKey, { savedAt: new Date().toISOString(), payload, ...summary });
    }, LOCAL_DEBOUNCE_MS);

    if (serialized !== lastServerRef.current && !serverTimerRef.current) {
      const wait = Math.max(2_000, SERVER_THROTTLE_MS - (Date.now() - lastServerAtRef.current));
      serverTimerRef.current = setTimeout(() => {
        serverTimerRef.current = null;
        void pushToServer();
      }, wait);
    }

    return () => clearTimeout(localTimer);
    // serialized já representa payload/summary
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, phase, enabled, localKey, isEmpty, pushToServer]);

  // Fechou/escondeu a aba: envia o que faltar para o servidor.
  useEffect(() => {
    if (phase !== 'ready' || !enabled) return;
    const flush = () => {
      if (document.visibilityState === 'hidden') void pushToServer(true);
    };
    const onPageHide = () => void pushToServer(true);
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [phase, enabled, pushToServer]);

  useEffect(
    () => () => {
      if (serverTimerRef.current) clearTimeout(serverTimerRef.current);
    },
    []
  );

  const applyPayload = useCallback((data: DraftPayload<T>, linkedId: string | null) => {
    onRestoreRef.current(data.form);
    setLinkedDraftId(linkedId);
    // Força o próximo salvamento automático com o estado restaurado.
    lastServerRef.current = null;
  }, []);

  const resume = useCallback(() => {
    const data = pendingPayloadRef.current;
    if (data) applyPayload(data, data.linkedDraftId ?? null);
    setPending(null);
    setPhase('ready');
  }, [applyPayload]);

  const clearCurrent = useCallback(async () => {
    if (localKey) removeLocal(localKey);
    lastServerRef.current = null;
    try {
      await api.delete('/quote-drafts/current', { params: { context } });
    } catch {
      // ignore
    }
  }, [context, localKey]);

  const discardPending = useCallback(() => {
    pendingPayloadRef.current = null;
    setPending(null);
    setPhase('ready');
    void clearCurrent();
  }, [clearCurrent]);

  // Botão "Salvar rascunho".
  const saveNamed = useCallback(
    async (name: string) => {
      const { payload: body, summary: sum } = latestRef.current;
      const { data } = await api.post('/quote-drafts', {
        id: linkedDraftId ?? undefined,
        context,
        name: name.trim() || undefined,
        data: { ...body, linkedDraftId: null },
        ...sum,
      });
      const saved = data.draft as QuoteDraftRecord<T>;
      setLinkedDraftId(saved.id);
      lastServerRef.current = null;
      setLastSavedAt(new Date());
      queryClient.invalidateQueries({ queryKey: ['quote-drafts', context] });
      return saved;
    },
    [context, linkedDraftId, queryClient]
  );

  // Item da lista "Carregar rascunho".
  const loadDraft = useCallback(
    (draft: QuoteDraftRecord<T>) => {
      applyPayload(draft.data, draft.isAutosave ? draft.data.linkedDraftId ?? null : draft.id);
      setPending(null);
      setPhase('ready');
    },
    [applyPayload]
  );

  const deleteDraft = useCallback(
    async (draft: Pick<QuoteDraftRecord, 'id' | 'isAutosave'>) => {
      if (draft.isAutosave) {
        // Também apaga a cópia do navegador, senão ela voltaria no próximo acesso.
        await clearCurrent();
      } else {
        await api.delete(`/quote-drafts/${draft.id}`);
        if (draft.id === linkedDraftId) setLinkedDraftId(null);
      }
      queryClient.invalidateQueries({ queryKey: ['quote-drafts', context] });
    },
    [clearCurrent, context, linkedDraftId, queryClient]
  );

  // Orçamento criado: some o rascunho em andamento e o salvo que deu origem a ele.
  const finish = useCallback(async () => {
    finishedRef.current = true;
    if (serverTimerRef.current) clearTimeout(serverTimerRef.current);
    serverTimerRef.current = null;
    await clearCurrent();
    if (linkedDraftId) {
      try {
        await api.delete(`/quote-drafts/${linkedDraftId}`);
      } catch {
        // ignore
      }
    }
    queryClient.invalidateQueries({ queryKey: ['quote-drafts', context] });
  }, [clearCurrent, context, linkedDraftId, queryClient]);

  return {
    phase,
    pending,
    resume,
    discardPending,
    linkedDraftId,
    lastSavedAt,
    saveNamed,
    loadDraft,
    deleteDraft,
    finish,
  };
}

export type QuoteDraftController<T = unknown> = ReturnType<typeof useQuoteDraft<T>>;
