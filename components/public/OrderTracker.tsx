'use client';

import { useState, FormEvent } from 'react';
import Image from 'next/image';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, X } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { OrderStatus } from '@/types';

interface TrackedOrderItem {
  marbleName: string;
  marbleImage: string | null;
  description: string | null;
  widthCm: number;
  heightCm: number;
  thicknessMm: number;
  quantity: number;
  areaM2: number;
  totalPrice: number;
}

interface TrackedOrder {
  orderNumber: string;
  status: OrderStatus;
  startDate: string | null;
  estimatedDate: string | null;
  completedDate: string | null;
  createdAt: string;
  stages: { stageName: string; status: string; completedAt: string | null }[];
  quote: {
    quoteNumber: string;
    clientName: string | null;
    subtotal: number;
    discount: number;
    discountPct: number;
    freight: number;
    total: number;
    items: TrackedOrderItem[];
  };
}

const STAGE_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'PENDING', label: 'Aprovado' },
  { status: 'IN_CUTTING', label: 'Corte' },
  { status: 'IN_POLISHING', label: 'Polimento' },
  { status: 'IN_FINISHING', label: 'Acabamento' },
  { status: 'READY', label: 'Pronto' },
  { status: 'DELIVERED', label: 'Entregue' },
];

export function OrderTracker() {
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [results, setResults] = useState<TrackedOrder[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await publicApi.post('/api/orders/track', { cpfCnpj });
      return data.orders as TrackedOrder[];
    },
    onSuccess: (orders) => {
      setResults(orders);
      setErrorMessage(null);
    },
    onError: (error: unknown) => {
      setResults(null);
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Não foi possível localizar pedidos para esse CPF/CNPJ. Tente novamente.';
      setErrorMessage(message);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!cpfCnpj) {
      setErrorMessage('Informe o CPF ou CNPJ.');
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-center">Acompanhar Pedido</h1>
      <p className="text-white/60 text-center mb-10">
        Digite o CPF ou CNPJ usado na hora de fazer o orçamento para ver o andamento dos seus pedidos.
      </p>

      <form onSubmit={handleSubmit} className="glass-panel p-6 space-y-4">
        <div>
          <label className="text-sm text-white/60 mb-1 block">CPF ou CNPJ</label>
          <input
            value={cpfCnpj}
            onChange={(e) => setCpfCnpj(e.target.value)}
            placeholder="000.000.000-00"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-marble-gold"
          />
        </div>

        {errorMessage && <p className="text-red-400 text-sm">{errorMessage}</p>}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-marble-gold text-marble-dark font-semibold hover:bg-marble-gold/90 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Search size={16} />
          {mutation.isPending ? 'Buscando...' : 'Buscar pedidos'}
        </button>
      </form>

      <AnimatePresence mode="wait">
        {results && (
          <motion.div
            key={cpfCnpj}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-8 space-y-10"
          >
            {results.map((order) => (
              <OrderCard key={order.orderNumber} order={order} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OrderCard({ order }: { order: TrackedOrder }) {
  const currentIndex = STAGE_STEPS.findIndex((s) => s.status === order.status);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold">{order.orderNumber}</h2>
          {isCancelled && (
            <span className="flex items-center gap-1 text-sm text-red-400">
              <X size={14} /> Cancelado
            </span>
          )}
        </div>
        <p className="text-sm text-white/50">Orçamento {order.quote.quoteNumber}</p>
        {order.quote.clientName && <p className="text-sm text-white/50">Cliente: {order.quote.clientName}</p>}
      </div>

      {!isCancelled && (
        <div className="glass-panel p-6">
          <h3 className="text-sm font-semibold text-marble-gold uppercase tracking-wide mb-6">Andamento</h3>
          <div className="flex items-center justify-between">
            {STAGE_STEPS.map((step, i) => (
              <div key={step.status} className="flex-1 flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                    i <= currentIndex ? 'bg-marble-gold text-marble-dark' : 'bg-white/10 text-white/50'
                  }`}
                >
                  {i < currentIndex ? <Check size={16} /> : i + 1}
                </div>
                {i < STAGE_STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-2 ${i < currentIndex ? 'bg-marble-gold' : 'bg-white/10'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {STAGE_STEPS.map((step) => (
              <span key={step.status} className="flex-1 text-center text-[10px] text-white/50 px-0.5">
                {step.label}
              </span>
            ))}
          </div>

          {order.estimatedDate && (
            <p className="text-sm text-white/60 mt-6">
              Previsão de conclusão: <span className="text-white">{formatDate(order.estimatedDate)}</span>
            </p>
          )}
        </div>
      )}

      <div className="glass-panel p-6">
        <h3 className="text-sm font-semibold text-marble-gold uppercase tracking-wide mb-4">Produtos</h3>
        <div className="space-y-4">
          {order.quote.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 border-b border-white/10 pb-4 last:border-0 last:pb-0">
              {item.marbleImage ? (
                <Image
                  src={item.marbleImage}
                  alt={item.marbleName}
                  width={56}
                  height={56}
                  className="rounded object-cover h-14 w-14 shrink-0"
                />
              ) : (
                <div className="h-14 w-14 rounded bg-white/5 shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{item.marbleName}</p>
                {item.description && <p className="text-xs text-white/50">{item.description}</p>}
                <p className="text-xs text-white/50">
                  {item.widthCm}x{item.heightCm}cm ({item.thicknessMm}mm) — {item.areaM2.toFixed(2)} m² — Qtd. {item.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold text-marble-gold">{formatCurrency(item.totalPrice)}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 space-y-1 text-sm">
          <div className="flex justify-between text-white/60">
            <span>Subtotal</span>
            <span>{formatCurrency(order.quote.subtotal)}</span>
          </div>
          {(order.quote.discount > 0 || order.quote.discountPct > 0) && (
            <div className="flex justify-between text-white/60">
              <span>Desconto</span>
              <span>-{formatCurrency(order.quote.discount + (order.quote.subtotal * order.quote.discountPct) / 100)}</span>
            </div>
          )}
          {order.quote.freight > 0 && (
            <div className="flex justify-between text-white/60">
              <span>Frete</span>
              <span>{formatCurrency(order.quote.freight)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2">
            <span>Total</span>
            <span className="text-marble-gold">{formatCurrency(order.quote.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
