'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Quote, QuoteStatus, QUOTE_STATUS_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/admin/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';

const STATUS_VARIANT: Record<QuoteStatus, 'success' | 'warning' | 'default' | 'danger' | 'info'> = {
  DRAFT: 'default',
  SENT: 'info',
  APPROVED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'warning',
};

export default function OrcamentosPage() {
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['quotes', status],
    queryFn: async () =>
      (await api.get('/quotes', { params: { status: status || undefined, limit: 50 } })).data as {
        quotes: Quote[];
      },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-marble-dark">Orçamentos</h1>
        <Link href="/admin/orcamentos/novo">
          <Button>
            <Plus size={16} /> Novo orçamento
          </Button>
        </Link>
      </div>

      <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
        <option value="">Todos os status</option>
        {Object.entries(QUOTE_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </Select>

      <DataTable
        data={data?.quotes ?? []}
        isLoading={isLoading}
        keyExtractor={(q) => q.id}
        columns={[
          { header: 'Número', cell: (q) => <Link href={`/admin/orcamentos/${q.id}`} className="text-marble-gold hover:underline">{q.quoteNumber}</Link> },
          { header: 'Cliente', cell: (q) => q.client?.name ?? q.clientName ?? '-' },
          { header: 'Vendedor', cell: (q) => q.createdBy?.name ?? '-' },
          { header: 'Status', cell: (q) => <Badge variant={STATUS_VARIANT[q.status]}>{QUOTE_STATUS_LABELS[q.status]}</Badge> },
          { header: 'Total', cell: (q) => formatCurrency(q.total) },
          { header: 'Data', cell: (q) => formatDate(q.createdAt) },
        ]}
      />
    </div>
  );
}
