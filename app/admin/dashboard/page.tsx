'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, Package, TrendingUp, Wallet, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { QUOTE_STATUS_LABELS, QuoteStatus } from '@/types';
import { RevenueTrendChart, TopProductsChart, QuotesStatusDonut } from '@/components/admin/DashboardCharts';

interface DashboardSummary {
  quotesThisMonth: number;
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

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
};

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await api.get<DashboardSummary>('/dashboard/summary')).data,
  });

  const { data: monthly } = useQuery({
    queryKey: ['financial-monthly'],
    queryFn: async () => (await api.get('/financial/monthly')).data as { data: { month: string; income: number; expense: number }[] },
  });

  const { data: topProducts } = useQuery({
    queryKey: ['dashboard-top-products'],
    queryFn: async () => (await api.get('/dashboard/top-products')).data as { products: { marbleId: string; name: string; totalRevenue: number }[] },
  });

  const { data: quotesByStatus } = useQuery({
    queryKey: ['dashboard-quotes-by-status'],
    queryFn: async () => (await api.get('/dashboard/quotes-by-status')).data as { data: { status: string; count: number }[] },
  });

  const kpis = [
    { label: 'Orçamentos no mês', value: String(data?.quotesThisMonth ?? 0), icon: FileText, accent: 'from-blue-500/15 text-blue-600' },
    { label: 'Pedidos em andamento', value: String(data?.ordersInProgress ?? 0), icon: Package, accent: 'from-marble-gold/15 text-marble-gold' },
    { label: 'Receita do mês', value: formatCurrency(data?.revenue ?? 0), icon: TrendingUp, accent: 'from-green-500/15 text-green-600' },
    {
      label: 'Lucro do mês',
      value: formatCurrency(data?.profit ?? 0),
      icon: Wallet,
      accent: data && data.profit < 0 ? 'from-red-500/15 text-red-600' : 'from-marble-gold/15 text-marble-gold',
    },
  ];

  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-marble-dark"
      >
        Dashboard
      </motion.h1>

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
          <CardContent className="p-0">
            <table className="w-full text-sm">
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
