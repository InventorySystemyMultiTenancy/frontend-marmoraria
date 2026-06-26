'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { Marble, MARBLE_TYPE_LABELS } from '@/types';
import { formatCurrency } from '@/lib/utils';

const STEPS = ['Mármore', 'Medidas', 'Seus dados', 'Resultado'];
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

export function QuoteForm() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get('marbleId');

  const [step, setStep] = useState(0);
  const [marbleId, setMarbleId] = useState(preselected ?? '');
  const [width, setWidth] = useState('100');
  const [height, setHeight] = useState('60');
  const [thickness, setThickness] = useState('20');
  const [quantity, setQuantity] = useState('1');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['public-marbles-form'],
    queryFn: async () => (await publicApi.get('/api/marbles/public', { params: { limit: 60 } })).data as { marbles: Marble[] },
  });

  const marbles = data?.marbles ?? [];
  const selectedMarble = marbles.find((m) => m.id === marbleId);

  const areaM2 = (Number(width) * Number(height)) / 10000;
  const estimatedTotal = selectedMarble?.pricePerM2 ? areaM2 * selectedMarble.pricePerM2 * Number(quantity || 1) : null;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data } = await publicApi.post('/api/quotes/public', {
        clientName: name,
        clientPhone: phone,
        clientEmail: email || undefined,
        source: 'SELF_SERVICE',
        items: [
          { marbleId, widthCm: Number(width), heightCm: Number(height), thicknessMm: Number(thickness), quantity: Number(quantity) },
        ],
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
    if (step === 0 && !marbleId) return setError('Selecione um mármore.');
    if (step === 1 && (!width || !height)) return setError('Informe largura e altura.');
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

          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Informe as medidas</h2>
              <p className="text-white/50 text-sm mb-6">{selectedMarble?.name} — {MARBLE_TYPE_LABELS[selectedMarble?.type ?? 'MARBLE']}</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Field label="Largura (cm)" value={width} onChange={setWidth} />
                <Field label="Altura (cm)" value={height} onChange={setHeight} />
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

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Seus dados</h2>
              <div className="space-y-4">
                <Field label="Nome completo" value={name} onChange={setName} />
                <Field label="Telefone / WhatsApp" value={phone} onChange={setPhone} />
                <Field label="Email (opcional)" value={email} onChange={setEmail} />
              </div>
            </div>
          )}

          {step === 3 && quoteId && (
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

      {step < 3 && (
        <div className="flex justify-between mt-8">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="text-white/50 disabled:opacity-0 text-sm cursor-pointer"
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

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm text-white/60 mb-1 block">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-marble-gold"
      />
    </div>
  );
}
