'use client';

import { useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Camera, Sparkles, X, Plus, Trash2, Pencil } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { Company, Marble } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { calcPieceBreakdown } from '@/lib/pricing';

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

function pieceBreakdown(piece: PieceDraft, marbles: Marble[]) {
  const marble = marbles.find((m) => m.id === piece.marbleId);
  const width = Number(piece.widthCm) || 0;
  const height = Number(piece.heightCm) || 0;
  const qty = Number(piece.quantity) || 0;
  const price = marble?.pricePerM2 ?? 0;
  const breakdown = calcPieceBreakdown(width, height, price, piece.includeAcabamento, piece.includeInstalacao);
  const extrasTotal = piece.extras.reduce((sum, ex) => sum + (Number(ex.price) || 0), 0);
  const total = breakdown.unitPrice * qty + extrasTotal;
  return { marble, breakdown, extrasTotal, total };
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
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [userDescription, setUserDescription] = useState('');
  const [aiResult, setAiResult] = useState<AiRecommendationResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['public-marbles-form'],
    queryFn: async () => (await publicApi.get('/api/marbles/public', { params: { limit: 60 } })).data as { marbles: Marble[] },
  });
  const marbles = data?.marbles ?? [];

  const { data: companyData } = useQuery({
    queryKey: ['public-company-form'],
    queryFn: async () => (await publicApi.get('/api/company/public')).data as { company: Company | null },
  });
  const freightRate = companyData?.company?.freightRatePerKm ?? null;

  const piecesTotal = pieces.reduce((sum, p) => sum + pieceBreakdown(p, marbles).total, 0);
  const freight = freightRate && distanceKm ? Number(distanceKm) * freightRate : 0;
  const grandTotal = piecesTotal + freight;

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
                    const { marble, breakdown, extrasTotal, total } = pieceBreakdown(piece, marbles);
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
                            <span>Material ({breakdown.areaM2.toFixed(2)} m²)</span>
                            <span>{marble?.pricePerM2 != null ? formatCurrency(breakdown.material) : 'sob consulta'}</span>
                          </div>
                          {piece.includeAcabamento && (
                            <div className="flex justify-between"><span>Acabamento/frontão ({breakdown.perimeterMl.toFixed(2)}ml)</span><span>{formatCurrency(breakdown.acabamento)}</span></div>
                          )}
                          {piece.includeInstalacao && (
                            <div className="flex justify-between"><span>Instalação ({breakdown.threeSidePerimeterMl.toFixed(2)}ml)</span><span>{formatCurrency(breakdown.instalacao)}</span></div>
                          )}
                          {extrasTotal > 0 && <div className="flex justify-between"><span>Extras</span><span>{formatCurrency(extrasTotal)}</span></div>}
                          <div className="flex justify-between text-white font-semibold pt-1 border-t border-white/10 mt-1">
                            <span>Subtotal da peça{marble?.pricePerM2 == null ? ' (+ material)' : ''}</span>
                            <span>{formatCurrency(total)}</span>
                          </div>
                        </div>
                        {marble?.pricePerM2 == null && (
                          <p className="text-xs text-marble-gold/80 mt-1">
                            Preço do material sob consulta — valor final informado no orçamento.
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
                  <label className="text-sm text-white/60 mb-1 block">Mármore</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {marbles.map((m) => (
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
                        <div className="absolute inset-0 bg-black/40 flex items-end p-1">
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
                  <span className="text-xl font-bold text-marble-gold">{formatCurrency(grandTotal)}</span>
                </div>
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
            </div>
          )}

          {step === 3 && quoteId && (
            <div className="text-center py-6">
              <Check className="mx-auto text-marble-gold mb-4" size={48} />
              <h2 className="text-2xl font-bold mb-2">Orçamento gerado!</h2>
              <p className="text-white/60 mb-8">
                {piecesTotal > 0 ? `Valor estimado: ${formatCurrency(grandTotal)}` : 'Nossa equipe vai retornar com os valores em breve.'}
              </p>
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
