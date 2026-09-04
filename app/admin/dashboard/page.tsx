'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, Package, TrendingUp, Wallet, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { formatCurrency, formatDate } from '@/lib/utils';
import { QUOTE_STATUS_LABELS, QuoteStatus } from '@/types';
import { RevenueTrendChart, TopProductsChart, QuotesStatusDonut } from '@/components/admin/DashboardCharts';

interface DashboardSummary {
  quotesCount: number;
  ordersInProgress: number;
  revenue: number;
  expense: number;
  profit: number;
  lowStockCount: number;
  recentQuotes: {
    id: string;
    quoteNumber: string;
    total: number;
    status: QuoteStatus;
    clientName?: string | null;
    client?: { name: string } | null;
    createdAt: string;
  }[];
}

type PeriodOption = 'month' | '30' | '90' | 'custom';

const PERIOD_OPTIONS: { value: PeriodOption; label: string }[] = [
  { value: 'month', label: 'Este mês' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: 'custom', label: 'Data específica' },
];

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
};

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodOption>('month');
  const [customFrom, setCustomFrom] = useState(toISODate(new Date()));
  const [customTo, setCustomTo] = useState(toISODate(new Date()));
  const [appliedCustomRange, setAppliedCustomRange] = useState({ from: customFrom, to: customTo });

  const range = useMemo(() => {
    if (period === 'month') return {};
    if (period === '30') {
      const from = new Date();
      from.setDate(from.getDate() - 29);
      return { from: toISODate(from), to: toISODate(new Date()) };
    }
    if (period === '90') {
      const from = new Date();
      from.setDate(from.getDate() - 89);
      return { from: toISODate(from), to: toISODate(new Date()) };
    }
    return { from: appliedCustomRange.from, to: appliedCustomRange.to };
  }, [period, appliedCustomRange]);

  const periodLabel = period === 'month' ? 'no mês' : 'no período';

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary', range],
    queryFn: async () => (await api.get<DashboardSummary>('/dashboard/summary', { params: range })).data,
  });

  const { data: monthly } = useQuery({
    queryKey: ['financial-monthly'],
    queryFn: async () => (await api.get('/financial/monthly')).data as { data: { month: string; income: number; expense: number }[] },
  });

  const { data: topProducts } = useQuery({
    queryKey: ['dashboard-top-products', range],
    queryFn: async () => (await api.get('/dashboard/top-products', { params: range })).data as { products: { marbleId: string; name: string; totalRevenue: number }[] },
  });

  const { data: quotesByStatus } = useQuery({
    queryKey: ['dashboard-quotes-by-status', range],
    queryFn: async () => (await api.get('/dashboard/quotes-by-status', { params: range })).data as { data: { status: string; count: number }[] },
  });

  const kpis = [
    { label: `Orçamentos ${periodLabel}`, value: String(data?.quotesCount ?? 0), icon: FileText, accent: 'from-blue-500/15 text-blue-600' },
    { label: 'Pedidos em andamento', value: String(data?.ordersInProgress ?? 0), icon: Package, accent: 'from-marble-gold/15 text-marble-gold' },
    { label: `Receita ${periodLabel}`, value: formatCurrency(data?.revenue ?? 0), icon: TrendingUp, accent: 'from-green-500/15 text-green-600' },
    {
      label: `Lucro ${periodLabel}`,
      value: formatCurrency(data?.profit ?? 0),
      icon: Wallet,
      accent: data && data.profit < 0 ? 'from-red-500/15 text-red-600' : 'from-marble-gold/15 text-marble-gold',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-marble-dark"
        >
          Dashboard
        </motion.h1>

        <div className="flex flex-wrap items-center gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                period === opt.value
                  ? 'bg-marble-dark text-white border-marble-dark'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-marble-gold'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {period === 'custom' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-end gap-3 bg-white border border-gray-100 rounded-xl p-3"
        >
          <div>
            <Label>De</Label>
            <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label>Até</Label>
            <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9" />
          </div>
          <Button
            size="sm"
            variant="gold"
            onClick={() => setAppliedCustomRange({ from: customFrom, to: customTo })}
          >
            Aplicar
          </Button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} custom={i} initial="hidden" animate="visible" variants={cardVariants}>
            <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
              <CardContent className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${kpi.accent} flex items-center justify-center shrink-0`}>
                  <kpi.icon size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{kpi.label}</p>
                  <p className="text-xl font-bold mt-0.5 text-marble-dark">{isLoading ? '...' : kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {data && data.lowStockCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg px-4 py-3"
        >
          <AlertTriangle size={16} />
          {data.lowStockCount} mármore(s) com estoque baixo. Verifique a seção de Estoque.
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Receita, despesa e lucro (6 meses)</CardTitle></CardHeader>
            <CardContent>
              <RevenueTrendChart data={monthly?.data ?? []} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardHeader><CardTitle>Orçamentos por status</CardTitle></CardHeader>
            <CardContent>
              <QuotesStatusDonut data={quotesByStatus?.data ?? []} />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader><CardTitle>Mármores mais vendidos</CardTitle></CardHeader>
          <CardContent>
            {topProducts?.products.length ? (
              <TopProductsChart data={topProducts.products} />
            ) : (
              <p className="text-sm text-gray-400 text-center py-20">Sem dados de vendas ainda.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card>
          <CardHeader>
            <CardTitle>Últimos orçamentos</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Número</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Cliente</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Total</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Data</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentQuotes.map((q) => (
                  <tr key={q.id} className="border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link href={`/admin/orcamentos/${q.id}`} className="text-marble-gold hover:underline">
                        {q.quoteNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{q.client?.name ?? q.clientName ?? '-'}</td>
                    <td className="px-5 py-3">
                      <Badge variant="gold">{QUOTE_STATUS_LABELS[q.status]}</Badge>
                    </td>
                    <td className="px-5 py-3">{formatCurrency(q.total)}</td>
                    <td className="px-5 py-3">{formatDate(q.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
