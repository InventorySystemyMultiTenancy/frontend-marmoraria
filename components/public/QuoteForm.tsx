'use client';

import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useQuery, useQueries, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Camera, Sparkles, X, Plus, Trash2, Pencil, Search } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { Company, Marble } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { calcPieceBreakdown } from '@/lib/pricing';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

const STEPS = ['Foto (opcional)', 'Peças', 'Seus dados', 'Resultado'];
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

interface AiRecommendation {
  marble: Marble;
  reason: string;
}

interface AiRecommendationResult {
  projectType: string;
  recommendations: AiRecommendation[];
  estimatedWidthCm: number | null;
  estimatedHeightCm: number | null;
  notes: string;
}

interface ExtraInput {
  name: string;
  price: string;
}

interface PieceDraft {
  marbleId: string;
  widthCm: string;
  heightCm: string;
  thicknessMm: string;
  quantity: string;
  description: string;
  extras: ExtraInput[];
  includeAcabamento: boolean;
  includeInstalacao: boolean;
}

interface Piece extends PieceDraft {
  key: string;
}

const emptyDraft: PieceDraft = {
  marbleId: '',
  widthCm: '100',
  heightCm: '60',
  thicknessMm: '20',
  quantity: '1',
  description: '',
  extras: [],
  includeAcabamento: false,
  includeInstalacao: false,
};

interface PreviewResult {
  result: number;
}

// preview vem da fórmula ativa de verdade (POST /formula/preview/public) — a
// mesma que o backend usa ao salvar o orçamento e gerar o PDF. O endpoint
// público só devolve o total: o valor de acabamento/frontão e instalação não é
// mostrado ao cliente (só o admin vê). Enquanto a prévia ainda não voltou, cai
// numa estimativa local só pra não piscar R$ 0,00.
function pieceBreakdown(piece: PieceDraft, marbles: Marble[], preview?: PreviewResult) {
  const marble = marbles.find((m) => m.id === piece.marbleId);
  const width = Number(piece.widthCm) || 0;
  const height = Number(piece.heightCm) || 0;
  const qty = Number(piece.quantity) || 0;
  const price = marble?.pricePerM2 ?? 0;
  const localBreakdown = calcPieceBreakdown(width, height, price, piece.includeAcabamento, piece.includeInstalacao);
  const extrasTotal = piece.extras.reduce((sum, ex) => sum + (Number(ex.price) || 0), 0);
  const unitPrice = preview?.result ?? localBreakdown.unitPrice;
  const total = unitPrice * qty + extrasTotal;
  return { marble, areaM2: localBreakdown.areaM2, extrasTotal, total };
}

function servicesLabel(piece: PieceDraft, onRequest = false) {
  const services: string[] = [];
  if (piece.includeAcabamento) services.push('acabamento/frontão');
  if (piece.includeInstalacao) services.push('instalação');
  if (!services.length) return null;
  return onRequest ? `Inclui ${services.join(' e ')}` : `Inclui ${services.join(' e ')} — já somado ao subtotal`;
}

// Mármore "sob consulta" (sem preço por m²): nenhum valor da peça é mostrado —
// nem com acabamento, instalação ou extras —, pois seria um valor parcial.
function isOnRequest(marble: Marble | undefined) {
  return Boolean(marble && marble.pricePerM2 == null);
}

// Busca sem acento e sem diferenciar maiúsculas ("calacata" acha "Calacatta").
function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function QuoteForm() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get('marbleId');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<PieceDraft>({ ...emptyDraft, marbleId: preselected ?? '' });
  const [distanceKm, setDistanceKm] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  // Condições comerciais (as mesmas do admin) — saem no PDF se preenchidas.
  const [paymentConditions, setPaymentConditions] = useState('');
  const [paymentTerm, setPaymentTerm] = useState('');
  const [deliveryTerm, setDeliveryTerm] = useState('');
  const [notes, setNotes] = useState('');
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [userDescription, setUserDescription] = useState('');
  const [aiResult, setAiResult] = useState<AiRecommendationResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Catálogo inteiro carregado uma única vez (em páginas de 100): a busca por
  // nome filtra na hora, no próprio navegador, sem esperar o servidor.
  const { data, isLoading: marblesLoading } = useQuery({
    queryKey: ['public-marbles-form-all'],
    queryFn: async () => {
      const all: Marble[] = [];
      for (let page = 1; page <= 20; page++) {
        const res = (await publicApi.get('/api/marbles/public', { params: { limit: 100, page } })).data as {
          marbles: Marble[];
          totalPages: number;
        };
        all.push(...res.marbles);
        if (page >= (res.totalPages || 1)) break;
      }
      return { marbles: all };
    },
    staleTime: 5 * 60 * 1000,
  });
  const marbles = useMemo(() => data?.marbles ?? [], [data]);

  const [marbleSearch, setMarbleSearch] = useState('');
  const searchIndex = useMemo(
    () => marbles.map((m) => ({ marble: m, key: normalize(`${m.name} ${m.color ?? ''} ${m.origin ?? ''}`) })),
    [marbles]
  );
  const filteredMarbles = useMemo(() => {
    const terms = normalize(marbleSearch).split(/\s+/).filter(Boolean);
    if (!terms.length) return marbles;
    return searchIndex.filter((e) => terms.every((t) => e.key.includes(t))).map((e) => e.marble);
  }, [marbleSearch, searchIndex, marbles]);

  const { data: companyData } = useQuery({
    queryKey: ['public-company-form'],
    queryFn: async () => (await publicApi.get('/api/company/public')).data as { company: Company | null },
  });
  const freightRate = companyData?.company?.freightRatePerKm ?? null;

  // Prévia com a fórmula ativa de verdade, pra bater com o valor salvo/PDF (ver
  // QuoteBuilder.tsx no admin, que usa a mesma estratégia).
  const debouncedPieces = useDebouncedValue(pieces, 400);
  const previewQueries = useQueries({
    queries: debouncedPieces.map((piece) => {
      const marble = marbles.find((m) => m.id === piece.marbleId);
      const width = Number(piece.widthCm) || 0;
      const height = Number(piece.heightCm) || 0;
      const thickness = Number(piece.thicknessMm) || 20;
      const pricePerM2 = marble?.pricePerM2 ?? 0;
      return {
        queryKey: [
          'formula-preview-public',
          width,
          height,
          thickness,
          pricePerM2,
          piece.includeAcabamento,
          piece.includeInstalacao,
        ],
        queryFn: async () =>
          (
            await publicApi.post('/api/formula/preview/public', {
              width,
              height,
              thickness,
              pricePerM2,
              quantity: 1,
              includeAcabamento: piece.includeAcabamento,
              includeInstalacao: piece.includeInstalacao,
            })
          ).data as PreviewResult,
        enabled: Boolean(piece.marbleId && width > 0 && height > 0 && !isOnRequest(marble)),
        staleTime: 60 * 1000,
      };
    }),
  });

  const hasOnRequest = pieces.some((p) => isOnRequest(marbles.find((m) => m.id === p.marbleId)));
  const piecesTotal = pieces.reduce(
    (sum, p, idx) => sum + pieceBreakdown(p, marbles, previewQueries[idx]?.data).total,
    0
  );
  const freight = freightRate && distanceKm ? Number(distanceKm) * freightRate : 0;
  const grandTotal = piecesTotal + freight;

  // Mármores com preço sob consulta entram no cálculo com R$ 0/m², então o
  // orçamento sai com valor bem abaixo do real — pede confirmação antes de criar.
  const priceOnRequestNames = Array.from(
    new Set(
      pieces
        .map((p) => marbles.find((m) => m.id === p.marbleId))
        .filter((m): m is Marble => Boolean(m && m.pricePerM2 == null))
        .map((m) => m.name)
    )
  );
  const [confirmPriceOnRequestOpen, setConfirmPriceOnRequestOpen] = useState(false);

  const aiMutation = useMutation({
    mutationFn: async () => {
      if (!photoFile) throw new Error('no-file');
      const formData = new FormData();
      formData.append('photo', photoFile);
      if (userDescription.trim()) formData.append('userDescription', userDescription.trim());
      const { data } = await publicApi.post('/api/ai/recommend-marble', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data as AiRecommendationResult;
    },
    onSuccess: (result) => {
      setAiResult(result);
      setAiError(null);
    },
    onError: (err: unknown) => {
      setAiResult(null);
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Não foi possível analisar a foto agora. Tente novamente.';
      setAiError(message);
    },
  });

  function handlePhotoSelected(file: File) {
    setPhotoFile(file);
    setAiResult(null);
    setAiError(null);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function chooseRecommendation(rec: AiRecommendation) {
    setDraft({
      ...emptyDraft,
      marbleId: rec.marble.id,
      widthCm: aiResult?.estimatedWidthCm ? String(aiResult.estimatedWidthCm) : emptyDraft.widthCm,
      heightCm: aiResult?.estimatedHeightCm ? String(aiResult.estimatedHeightCm) : emptyDraft.heightCm,
    });
    setStep(1);
  }

  function addExtra() {
    setDraft((d) => ({ ...d, extras: [...d.extras, { name: '', price: '' }] }));
  }
  function updateExtra(idx: number, patch: Partial<ExtraInput>) {
    setDraft((d) => ({ ...d, extras: d.extras.map((ex, i) => (i === idx ? { ...ex, ...patch } : ex)) }));
  }
  function removeExtra(idx: number) {
    setDraft((d) => ({ ...d, extras: d.extras.filter((_, i) => i !== idx) }));
  }

  function savePiece() {
    if (!draft.marbleId || !draft.widthCm || !draft.heightCm) {
      setError('Selecione o mármore e informe as medidas da peça.');
      return;
    }
    setError(null);
    const cleanExtras = draft.extras.filter((ex) => ex.name && ex.price);
    if (editingKey) {
      setPieces((prev) => prev.map((p) => (p.key === editingKey ? { ...draft, extras: cleanExtras, key: editingKey } : p)));
      setEditingKey(null);
    } else {
      setPieces((prev) => [...prev, { ...draft, extras: cleanExtras, key: crypto.randomUUID() }]);
    }
    setDraft({ ...emptyDraft });
  }

  function editPiece(piece: Piece) {
    setEditingKey(piece.key);
    setDraft({ ...piece });
    setError(null);
  }

  function removePiece(key: string) {
    setPieces((prev) => prev.filter((p) => p.key !== key));
    if (editingKey === key) {
      setEditingKey(null);
      setDraft({ ...emptyDraft });
    }
  }

  function cancelEdit() {
    setEditingKey(null);
    setDraft({ ...emptyDraft });
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data } = await publicApi.post('/api/quotes/public', {
        clientName: name,
        clientPhone: phone,
        clientEmail: email || undefined,
        clientCpfCnpj: cpfCnpj,
        source: 'SELF_SERVICE',
        items: pieces.map((p) => ({
          marbleId: p.marbleId,
          description: p.description || undefined,
          widthCm: Number(p.widthCm),
          heightCm: Number(p.heightCm),
          thicknessMm: Number(p.thicknessMm),
          quantity: Number(p.quantity),
          extras: p.extras.map((ex) => ({ name: ex.name, price: Number(ex.price) })),
          includeAcabamento: p.includeAcabamento,
          includeInstalacao: p.includeInstalacao,
        })),
        freight,
        freightDistanceKm: distanceKm ? Number(distanceKm) : undefined,
        paymentConditions: paymentConditions.trim() || undefined,
        paymentTerm: paymentTerm.trim() || undefined,
        deliveryTerm: deliveryTerm.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      return data.quote;
    },
    onSuccess: (quote) => {
      setQuoteId(quote.id);
      setStep(3);
    },
    onError: () => setError('Não foi possível gerar o orçamento. Tente novamente.'),
  });

  function next() {
    setError(null);
    if (step === 1) {
      if (pieces.length === 0) return setError('Adicione ao menos uma peça ao orçamento.');
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!name || !phone) return setError('Informe seu nome e telefone.');
      if (priceOnRequestNames.length > 0) {
        setConfirmPriceOnRequestOpen(true);
        return;
      }
      submitMutation.mutate();
      return;
    }
    setStep((s) => s + 1);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1 flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                i <= step ? 'bg-marble-gold text-marble-dark' : 'bg-white/10 text-white/50'
              }`}
            >
              {i < step ? <Check size={16} /> : i + 1}
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-2 ${i < step ? 'bg-marble-gold' : 'bg-white/10'}`} />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
        >
          {step === 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <Sparkles className="text-marble-gold" size={22} /> Recomendação por IA
              </h2>
              <p className="text-white/50 text-sm mb-6">
                Envie uma foto do ambiente ou da peça que você quer revestir e a IA sugere os mármores do nosso
                catálogo que mais combinam, além de um tamanho aproximado.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePhotoSelected(e.target.files[0])}
              />

              {!photoPreview ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full glass-panel p-10 flex flex-col items-center gap-3 border-2 border-dashed border-white/20 hover:border-marble-gold/50 transition-colors cursor-pointer"
                >
                  <Camera className="text-white/40" size={32} />
                  <span className="text-sm text-white/60">Clique para enviar uma foto</span>
                </button>
              ) : (
                <div className="glass-panel p-4 space-y-4">
                  <div className="relative rounded-lg overflow-hidden h-56 w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element -- data URL preview, next/image não suporta src="data:" */}
                    <img src={photoPreview} alt="Foto enviada" className="w-full h-full object-cover" />
                    <button
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview(null);
                        setAiResult(null);
                        setAiError(null);
                      }}
                      className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5 cursor-pointer hover:bg-black/80"
                      aria-label="Remover foto"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {!aiResult && (
                    <>
                      <div>
                        <label className="text-sm text-white/60 mb-1 block">
                          O que você deseja fazer? (opcional)
                        </label>
                        <textarea
                          value={userDescription}
                          onChange={(e) => setUserDescription(e.target.value)}
                          placeholder="Ex: quero trocar a bancada da cozinha por um mármore mais claro"
                          rows={2}
                          maxLength={500}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-marble-gold resize-none"
                        />
                      </div>

                      <button
                        onClick={() => aiMutation.mutate()}
                        disabled={aiMutation.isPending}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-marble-gold text-marble-dark font-semibold cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles size={16} />
                        {aiMutation.isPending ? 'Analisando foto...' : 'Analisar com IA'}
                      </button>
                    </>
                  )}

                  {aiError && <p className="text-red-400 text-sm">{aiError}</p>}
                </div>
              )}

              {aiResult && (
                <div className="mt-6 space-y-4">
                  <p className="text-sm text-white/60">
                    Identificamos: <span className="text-white font-medium">{aiResult.projectType}</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {aiResult.recommendations.map((rec) => (
                      <button
                        key={rec.marble.id}
                        onClick={() => chooseRecommendation(rec)}
                        className="text-left glass-panel p-3 hover:border-marble-gold/60 border border-transparent transition-colors cursor-pointer"
                      >
                        <div className="relative h-24 w-full rounded-lg overflow-hidden mb-2">
                          {rec.marble.imageUrls[0] ? (
                            <Image src={rec.marble.imageUrls[0]} alt={rec.marble.name} fill className="object-cover" sizes="200px" />
                          ) : (
                            <div className="w-full h-full bg-marble-gray" />
                          )}
                        </div>
                        <p className="text-sm font-semibold">{rec.marble.name}</p>
                        <p className="text-xs text-white/50 mt-0.5">{rec.reason}</p>
                      </button>
                    ))}
                  </div>

                  {(aiResult.estimatedWidthCm || aiResult.estimatedHeightCm) && (
                    <p className="text-sm text-white/60">
                      Tamanho estimado:{' '}
                      <span className="text-white">
                        {aiResult.estimatedWidthCm ?? '?'} x {aiResult.estimatedHeightCm ?? '?'} cm
                      </span>
                    </p>
                  )}
                  <p className="text-xs text-marble-gold/80 glass-panel p-3">{aiResult.notes}</p>
                </div>
              )}

              <button
                onClick={() => setStep(1)}
                className="w-full mt-8 px-6 py-4 rounded-full border-2 border-white/25 text-white text-base font-semibold hover:border-marble-gold hover:text-marble-gold transition-colors cursor-pointer"
              >
                Pular esta etapa, vou escolher o mármore manualmente
              </button>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Monte seu orçamento</h2>
              <p className="text-white/50 text-sm mb-6">
                Adicione quantas peças precisar — bancadas, degraus de escada, soleiras — iguais ou de mármores
                diferentes, tudo no mesmo orçamento.
              </p>

              {pieces.length > 0 && (
                <div className="space-y-3 mb-6">
                  {pieces.map((piece, idx) => {
                    const { marble, areaM2, extrasTotal, total } = pieceBreakdown(piece, marbles, previewQueries[idx]?.data);
                    const onRequest = isOnRequest(marble);
                    const services = servicesLabel(piece, onRequest);
                    return (
                      <div key={piece.key} className="glass-panel p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              Peça {idx + 1} — {marble?.name ?? 'Mármore'} {piece.description ? `· ${piece.description}` : ''}
                            </p>
                            <p className="text-xs text-white/50 mt-0.5">
                              {piece.widthCm}cm x {piece.heightCm}cm ({piece.thicknessMm}mm) · Qtd. {piece.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => editPiece(piece)} className="text-white/50 hover:text-marble-gold cursor-pointer" aria-label="Editar peça">
                              <Pencil size={15} />
                            </button>
                            <button onClick={() => removePiece(piece.key)} className="text-white/50 hover:text-red-400 cursor-pointer" aria-label="Remover peça">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 text-xs text-white/60 space-y-0.5">
                          <div className="flex justify-between">
                            <span>Material ({areaM2.toFixed(2)} m²)</span>
                            {onRequest && <span>sob consulta</span>}
                          </div>
                          {services && <p className="text-marble-gold/80">{services}</p>}
                          {piece.extras.length > 0 &&
                            (onRequest ? (
                              <p>Extras: {piece.extras.map((ex) => ex.name).join(', ')}</p>
                            ) : (
                              extrasTotal > 0 && (
                                <div className="flex justify-between"><span>Extras</span><span>{formatCurrency(extrasTotal)}</span></div>
                              )
                            ))}
                          <div className="flex justify-between text-white font-semibold pt-1 border-t border-white/10 mt-1">
                            <span>Subtotal da peça</span>
                            <span className={onRequest ? 'text-marble-gold' : ''}>{onRequest ? 'Sob consulta' : formatCurrency(total)}</span>
                          </div>
                        </div>
                        {onRequest && (
                          <p className="text-xs text-marble-gold/80 mt-1">
                            Mármore sob consulta — nossa equipe informa o valor desta peça no retorno do orçamento.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="glass-panel p-4 space-y-4">
                <p className="text-sm font-semibold text-white">{editingKey ? 'Editar peça' : 'Adicionar peça'}</p>

                <div>
                  <label htmlFor="marble-search" className="text-sm text-white/60 mb-1 block">Mármore</label>
                  <div className="relative mb-2">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                    <input
                      id="marble-search"
                      type="search"
                      value={marbleSearch}
                      onChange={(e) => setMarbleSearch(e.target.value)}
                      placeholder="Buscar mármore pelo nome..."
                      autoComplete="off"
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-marble-gold"
                    />
                    {marbleSearch && (
                      <button
                        type="button"
                        onClick={() => setMarbleSearch('')}
                        aria-label="Limpar busca"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/50 hover:text-white cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {draft.marbleId && (
                    <p className="text-xs text-white/50 mb-2">
                      Selecionado:{' '}
                      <span className="text-white">{marbles.find((m) => m.id === draft.marbleId)?.name ?? '—'}</span>
                      {isOnRequest(marbles.find((m) => m.id === draft.marbleId)) && (
                        <span className="text-marble-gold"> · mármore sob consulta (o valor será informado pela nossa equipe)</span>
                      )}
                    </p>
                  )}
                  {marblesLoading && <p className="text-xs text-white/40 py-3">Carregando mármores...</p>}
                  {!marblesLoading && filteredMarbles.length === 0 && (
                    <p className="text-xs text-white/50 py-3">Nenhum mármore encontrado com “{marbleSearch}”.</p>
                  )}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {filteredMarbles.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setDraft((d) => ({ ...d, marbleId: m.id }))}
                        className={`relative rounded-lg overflow-hidden h-16 border-2 transition-colors cursor-pointer ${
                          draft.marbleId === m.id ? 'border-marble-gold' : 'border-transparent'
                        }`}
                        type="button"
                      >
                        {m.imageUrls[0] ? (
                          <Image src={m.imageUrls[0]} alt={m.name} fill className="object-cover" sizes="120px" />
                        ) : (
                          <div className="w-full h-full bg-marble-gray" />
                        )}
                        <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-1">
                          {m.pricePerM2 == null && (
                            <span className="text-[9px] leading-tight text-marble-gold">Sob consulta</span>
                          )}
                          <p className="text-[10px] leading-tight font-medium">{m.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Largura (cm)" value={draft.widthCm} onChange={(v) => setDraft((d) => ({ ...d, widthCm: v }))} />
                  <Field label="Altura (cm)" value={draft.heightCm} onChange={(v) => setDraft((d) => ({ ...d, heightCm: v }))} />
                  <Field label="Espessura (mm)" value={draft.thicknessMm} onChange={(v) => setDraft((d) => ({ ...d, thicknessMm: v }))} />
                  <Field label="Quantidade" value={draft.quantity} onChange={(v) => setDraft((d) => ({ ...d, quantity: v }))} />
                </div>

                <Field
                  label="Descrição (opcional)"
                  value={draft.description}
                  onChange={(v) => setDraft((d) => ({ ...d, description: v }))}
                  placeholder="Ex: Degrau 1, Pia da cozinha..."
                />

                <div className="space-y-2">
                  <p className="text-sm text-white/60">Serviços adicionais (opcional)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, includeAcabamento: !d.includeAcabamento }))}
                      className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                        draft.includeAcabamento
                          ? 'border-marble-gold bg-marble-gold/10 text-white'
                          : 'border-white/15 text-white/60 hover:border-white/30'
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          draft.includeAcabamento ? 'border-marble-gold bg-marble-gold' : 'border-white/30'
                        }`}
                      >
                        {draft.includeAcabamento && <Check size={12} className="text-marble-dark" />}
                      </span>
                      Selecione se o seu orçamento precisa de acabamento/frontão
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, includeInstalacao: !d.includeInstalacao }))}
                      className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                        draft.includeInstalacao
                          ? 'border-marble-gold bg-marble-gold/10 text-white'
                          : 'border-white/15 text-white/60 hover:border-white/30'
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          draft.includeInstalacao ? 'border-marble-gold bg-marble-gold' : 'border-white/30'
                        }`}
                      >
                        {draft.includeInstalacao && <Check size={12} className="text-marble-dark" />}
                      </span>
                      Selecione se o seu orçamento precisa de instalação
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-white/60">Extras (ex: cuba de inox)</label>
                    <button onClick={addExtra} type="button" className="text-xs text-marble-gold hover:underline cursor-pointer">
                      + Adicionar extra
                    </button>
                  </div>
                  {draft.extras.map((extra, exIdx) => (
                    <div key={exIdx} className="flex gap-2 items-center">
                      <input
                        placeholder="Nome (ex: Cuba de inox)"
                        value={extra.name}
                        onChange={(e) => updateExtra(exIdx, { name: e.target.value })}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-marble-gold"
                      />
                      <input
                        type="number"
                        placeholder="Valor (R$)"
                        value={extra.price}
                        onChange={(e) => updateExtra(exIdx, { price: e.target.value })}
                        className="w-28 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-marble-gold"
                      />
                      <button onClick={() => removeExtra(exIdx)} type="button" className="text-white/40 hover:text-red-400 cursor-pointer shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={savePiece}
                    type="button"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-marble-gold text-marble-dark font-semibold text-sm cursor-pointer"
                  >
                    <Plus size={15} /> {editingKey ? 'Salvar alterações' : 'Adicionar peça à lista'}
                  </button>
                  {editingKey && (
                    <button
                      onClick={cancelEdit}
                      type="button"
                      className="px-4 py-2.5 rounded-full border border-white/20 text-white/70 text-sm cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>

              {freightRate != null && (
                <div className="glass-panel p-4 mt-4">
                  <Field
                    label="Distância até o local de entrega (km) — opcional"
                    value={distanceKm}
                    onChange={setDistanceKm}
                    placeholder="Ex: 10"
                  />
                  {freight > 0 && (
                    <p className="text-xs text-white/50 mt-2">
                      Frete estimado: {distanceKm}km x {formatCurrency(freightRate)} = {formatCurrency(freight)}
                    </p>
                  )}
                </div>
              )}

              {pieces.length > 0 && (
                <div className="glass-panel p-4 mt-4 flex items-center justify-between">
                  <span className="text-sm text-white/60">Total estimado ({pieces.length} peça{pieces.length > 1 ? 's' : ''})</span>
                  <span className="text-xl font-bold text-marble-gold">{hasOnRequest ? 'Sob consulta' : formatCurrency(grandTotal)}</span>
                </div>
              )}
              {pieces.length > 0 && hasOnRequest && (
                <p className="text-xs text-white/50 mt-2">
                  Seu orçamento tem mármore sob consulta — nossa equipe retorna com o valor final.
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Seus dados</h2>
              <div className="space-y-4">
                <Field label="Nome completo" value={name} onChange={setName} />
                <Field label="Telefone / WhatsApp" value={phone} onChange={setPhone} />
                <Field
                  label="CPF ou CNPJ (opcional)"
                  value={cpfCnpj}
                  onChange={setCpfCnpj}
                  placeholder="000.000.000-00"
                />
                <p className="text-xs text-white/40 -mt-3">
                  Usado para você rastrear o pedido depois. Se não informar agora, pode ser solicitado na aprovação do orçamento.
                </p>
                <Field label="Email (opcional)" value={email} onChange={setEmail} />
              </div>

              <div className="glass-panel p-4 mt-6 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-white">Condições do orçamento (opcional)</p>
                  <p className="text-xs text-white/40 mt-0.5">Cada campo preenchido aparece no PDF do orçamento.</p>
                </div>
                <Field
                  label="Forma de pagamento"
                  value={paymentConditions}
                  onChange={setPaymentConditions}
                  placeholder="Ex: Pix, cartão em até 3x, boleto"
                />
                <Field
                  label="Condições de pagamento"
                  value={paymentTerm}
                  onChange={setPaymentTerm}
                  placeholder="Ex: 50% de entrada, 50% na entrega"
                />
                <Field
                  label="Prazo de entrega"
                  value={deliveryTerm}
                  onChange={setDeliveryTerm}
                  placeholder="Ex: 15 dias úteis"
                />
                <div>
                  <label className="text-sm text-white/60 mb-1 block">Detalhes / observações</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    placeholder="Informações adicionais para o cliente"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-marble-gold resize-y"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && quoteId && (
            <div className="text-center py-6">
              <Check className="mx-auto text-marble-gold mb-4" size={48} />
              <h2 className="text-2xl font-bold mb-2">Orçamento gerado!</h2>
              <p className="text-white/60 mb-8">
                {!hasOnRequest && piecesTotal > 0
                  ? `Valor estimado: ${formatCurrency(grandTotal)}`
                  : 'Nossa equipe vai retornar com os valores em breve.'}
              </p>
              {priceOnRequestNames.length > 0 && (
                <p className="text-sm text-marble-gold border border-marble-gold/40 bg-marble-gold/10 rounded-lg p-3 mb-8 -mt-4">
                  {priceOnRequestNames.join(', ')} {priceOnRequestNames.length > 1 ? 'são mármores' : 'é mármore'} sob
                  consulta. Nossa equipe vai retornar com o valor final.
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href={`/api/pdf/quote/${quoteId}`} target="_blank" rel="noreferrer">
                  <span className="inline-flex items-center px-6 py-3 rounded-full bg-marble-gold text-marble-dark font-semibold cursor-pointer">
                    Baixar PDF
                  </span>
                </a>
                <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer">
                  <span className="inline-flex items-center px-6 py-3 rounded-full border border-white/20 font-semibold cursor-pointer">
                    Falar no WhatsApp
                  </span>
                </a>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

      {confirmPriceOnRequestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" role="dialog" aria-modal="true">
          <div className="glass-panel bg-marble-dark max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Mármore sob consulta</h3>
            <p className="text-sm text-white/70">
              <span className="text-white font-medium">{priceOnRequestNames.join(', ')}</span>{' '}
              {priceOnRequestNames.length > 1 ? 'são mármores' : 'é mármore'} sob consulta. O orçamento e o PDF sairão
              sem valor, marcados como <strong className="text-white">sob consulta</strong>, e nossa equipe retornará
              com o valor final.
            </p>
            <p className="text-sm text-white/70">Deseja criar o orçamento mesmo assim?</p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => {
                  setConfirmPriceOnRequestOpen(false);
                  submitMutation.mutate();
                }}
                className="flex-1 px-4 py-2.5 rounded-full bg-marble-gold text-marble-dark font-semibold text-sm cursor-pointer"
              >
                Sim, criar orçamento
              </button>
              <button
                onClick={() => setConfirmPriceOnRequestOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-full border border-white/20 text-white/70 text-sm cursor-pointer"
              >
                Voltar e revisar
              </button>
            </div>
          </div>
        </div>
      )}

      {step > 0 && step < STEPS.length - 1 && (
        <div className="flex justify-between mt-8">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="text-white/50 text-sm cursor-pointer"
          >
            Voltar
          </button>
          <button
            onClick={next}
            disabled={submitMutation.isPending}
            className="px-6 py-3 rounded-full bg-marble-gold text-marble-dark font-semibold cursor-pointer disabled:opacity-50"
          >
            {step === 2 ? (submitMutation.isPending ? 'Enviando...' : 'Gerar orçamento') : 'Continuar'}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm text-white/60 mb-1 block">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-marble-gold"
      />
    </div>
  );
}
