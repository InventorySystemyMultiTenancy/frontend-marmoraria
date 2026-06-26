'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { QUOTE_STATUS_LABELS, QuoteStatus } from '@/types';

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

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await api.get<DashboardSummary>('/dashboard/summary')).data,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-marble-dark">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Orçamentos no mês" value={isLoading ? '...' : String(data?.quotesThisMonth ?? 0)} />
        <SummaryCard label="Pedidos em andamento" value={isLoading ? '...' : String(data?.ordersInProgress ?? 0)} />
        <SummaryCard
          label="Receita do mês"
          value={isLoading ? '...' : formatCurrency(data?.revenue ?? 0)}
          accent="text-green-600"
        />
        <SummaryCard
          label="Lucro do mês"
          value={isLoading ? '...' : formatCurrency(data?.profit ?? 0)}
          accent={data && data.profit < 0 ? 'text-red-600' : 'text-marble-gold'}
        />
      </div>

      {data && data.lowStockCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg px-4 py-3">
          ⚠ {data.lowStockCount} mármore(s) com estoque baixo. Verifique a seção de Estoque.
        </div>
      )}

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
                <tr key={q.id} className="border-b border-gray-50 last:border-0">
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
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${accent ?? 'text-marble-dark'}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
