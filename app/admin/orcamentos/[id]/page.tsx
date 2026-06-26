'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Check, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Quote, QuoteStatus, QUOTE_STATUS_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/permissions';

export default function OrcamentoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ['quote', id],
    queryFn: async () => (await api.get(`/quotes/${id}`)).data.quote as Quote,
  });

  const statusMutation = useMutation({
    mutationFn: async (status: QuoteStatus) => api.patch(`/quotes/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quote', id] }),
  });

  if (isLoading || !data) {
    return <p className="text-gray-400">Carregando...</p>;
  }

  const canApprove = hasPermission(user, 'quotes_approve');

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-marble-dark">{data.quoteNumber}</h1>
          <p className="text-sm text-gray-500">{formatDate(data.createdAt)}</p>
        </div>
        <div className="flex gap-2 items-center">
          <Badge variant="gold">{QUOTE_STATUS_LABELS[data.status]}</Badge>
          <a href={`/api/pdf/quote/${data.id}`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm"><Download size={14} /> PDF</Button>
          </a>
        </div>
      </div>

      {canApprove && data.status === 'DRAFT' && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => statusMutation.mutate('SENT')}>Marcar como enviado</Button>
        </div>
      )}
      {canApprove && (data.status === 'DRAFT' || data.status === 'SENT') && (
        <div className="flex gap-2">
          <Button size="sm" variant="gold" onClick={() => statusMutation.mutate('APPROVED')}>
            <Check size={14} /> Aprovar
          </Button>
          <Button size="sm" variant="destructive" onClick={() => statusMutation.mutate('REJECTED')}>
            <X size={14} /> Rejeitar
          </Button>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <p><strong>Nome:</strong> {data.client?.name ?? data.clientName ?? '-'}</p>
          <p><strong>Telefone:</strong> {data.clientPhone ?? '-'}</p>
          <p><strong>Email:</strong> {data.clientEmail ?? '-'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Itens</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3 text-left font-medium text-gray-600">Mármore</th>
                <th className="px-5 py-3 text-left font-medium text-gray-600">Dimensões</th>
                <th className="px-5 py-3 text-left font-medium text-gray-600">Área</th>
                <th className="px-5 py-3 text-left font-medium text-gray-600">Qtd.</th>
                <th className="px-5 py-3 text-left font-medium text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3">{item.marble?.name}</td>
                  <td className="px-5 py-3">{item.widthCm}x{item.heightCm}cm ({item.thicknessMm}mm)</td>
                  <td className="px-5 py-3">{item.areaM2.toFixed(2)} m²</td>
                  <td className="px-5 py-3">{item.quantity}</td>
                  <td className="px-5 py-3">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(data.subtotal)}</span></div>
          <div className="flex justify-between"><span>Desconto</span><span>{formatCurrency(data.discount + (data.subtotal * data.discountPct) / 100)}</span></div>
          <div className="flex justify-between text-lg font-bold text-marble-dark pt-2 border-t border-gray-100"><span>Total</span><span>{formatCurrency(data.total)}</span></div>
        </CardContent>
      </Card>

      {data.notes && (
        <Card>
          <CardHeader><CardTitle>Observações</CardTitle></CardHeader>
          <CardContent className="text-sm">{data.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
