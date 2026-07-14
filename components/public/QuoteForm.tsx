'use client';

import { useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Camera, Sparkles, X } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { Marble, MARBLE_TYPE_LABELS } from '@/types';
import { formatCurrency } from '@/lib/utils';

const STEPS = ['Foto (opcional)', 'Mármore', 'Medidas', 'Seus dados', 'Resultado'];
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

export function QuoteForm() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get('marbleId');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [marbleId, setMarbleId] = useState(preselected ?? '');
  const [width, setWidth] = useState('100');
  const [height, setHeight] = useState('60');
  const [thickness, setThickness] = useState('20');
  const [quantity, setQuantity] = useState('1');
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
  const [dimensionsFromAi, setDimensionsFromAi] = useState(false);

  const { data } = useQuery({
    queryKey: ['public-marbles-form'],
    queryFn: async () => (await publicApi.get('/api/marbles/public', { params: { limit: 60 } })).data as { marbles: Marble[] },
  });

  const marbles = data?.marbles ?? [];
  const selectedMarble = marbles.find((m) => m.id === marbleId);

  const areaM2 = (Number(width) * Number(height)) / 10000;
  const estimatedTotal = selectedMarble?.pricePerM2 ? areaM2 * selectedMarble.pricePerM2 * Number(quantity || 1) : null;

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
    setMarbleId(rec.marble.id);
    if (aiResult?.estimatedWidthCm && aiResult?.estimatedHeightCm) {
      setWidth(String(aiResult.estimatedWidthCm));
      setHeight(String(aiResult.estimatedHeightCm));
      setDimensionsFromAi(true);
    }
    setStep(2);
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data } = await publicApi.post('/api/quotes/public', {
        clientName: name,
        clientPhone: phone,
        clientEmail: email || undefined,
        clientCpfCnpj: cpfCnpj,
        source: 'SELF_SERVICE',
        items: [
          { marbleId, widthCm: Number(width), heightCm: Number(height), thicknessMm: Number(thickness), quantity: Number(quantity) },
        ],
      });
      return data.quote;
    },
    onSuccess: (quote) => {
      setQuoteId(quote.id);
      setStep(4);
    },
    onError: () => setError('Não foi possível gerar o orçamento. Tente novamente.'),
  });

  function next() {
    setError(null);
    if (step === 1 && !marbleId) return setError('Selecione um mármore.');
    if (step === 2 && (!width || !height)) return setError('Informe largura e altura.');
    if (step === 3) {
      if (!name || !phone) return setError('Informe seu nome e telefone.');
      if (!cpfCnpj) return setError('Informe seu CPF ou CNPJ.');
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
              <h2 className="text-2xl font-bold mb-6">Selecione o mármore</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {marbles.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMarbleId(m.id)}
                    className={`relative rounded-xl overflow-hidden h-32 border-2 transition-colors cursor-pointer ${
                      marbleId === m.id ? 'border-marble-gold' : 'border-transparent'
                    }`}
                  >
                    {m.imageUrls[0] ? (
                      <Image src={m.imageUrls[0]} alt={m.name} fill className="object-cover" sizes="200px" />
                    ) : (
                      <div className="w-full h-full bg-marble-gray" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                      <p className="text-xs font-medium">{m.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Informe as medidas</h2>
              <p className="text-white/50 text-sm mb-6">{selectedMarble?.name} — {MARBLE_TYPE_LABELS[selectedMarble?.type ?? 'MARBLE']}</p>
              {dimensionsFromAi && (
                <p className="text-xs text-marble-gold/80 mb-3">
                  Medida preenchida pela IA a partir da foto — confirme a medida real antes de continuar.
                </p>
              )}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Field label="Largura (cm)" value={width} onChange={(v) => { setWidth(v); setDimensionsFromAi(false); }} />
                <Field label="Altura (cm)" value={height} onChange={(v) => { setHeight(v); setDimensionsFromAi(false); }} />
                <Field label="Espessura (mm)" value={thickness} onChange={setThickness} />
                <Field label="Quantidade" value={quantity} onChange={setQuantity} />
              </div>
              <div className="glass-panel p-5">
                <p className="text-sm text-white/60">Área estimada: {areaM2.toFixed(2)} m²</p>
                {estimatedTotal != null ? (
                  <p className="text-xl font-bold text-marble-gold mt-1">≈ {formatCurrency(estimatedTotal)}</p>
                ) : (
                  <p className="text-white/60 mt-1 text-sm">Este mármore é sob consulta — valor será informado no orçamento.</p>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Seus dados</h2>
              <div className="space-y-4">
                <Field label="Nome completo" value={name} onChange={setName} />
                <Field label="Telefone / WhatsApp" value={phone} onChange={setPhone} />
                <Field label="CPF ou CNPJ" value={cpfCnpj} onChange={setCpfCnpj} placeholder="000.000.000-00" />
                <Field label="Email (opcional)" value={email} onChange={setEmail} />
              </div>
            </div>
          )}

          {step === 4 && quoteId && (
            <div className="text-center py-6">
              <Check className="mx-auto text-marble-gold mb-4" size={48} />
              <h2 className="text-2xl font-bold mb-2">Orçamento gerado!</h2>
              <p className="text-white/60 mb-8">
                {estimatedTotal != null
                  ? `Valor estimado: ${formatCurrency(estimatedTotal)}`
                  : 'Nossa equipe vai retornar com os valores em breve.'}
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

      {step > 0 && step < 4 && (
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
            {step === 3 ? (submitMutation.isPending ? 'Enviando...' : 'Gerar orçamento') : 'Continuar'}
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
