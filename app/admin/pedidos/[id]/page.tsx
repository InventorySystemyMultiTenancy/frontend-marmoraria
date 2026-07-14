'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Order, OrderStatus, ORDER_STATUS_LABELS } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/permissions';

const ALL_STATUSES: OrderStatus[] = [
  'PENDING',
  'IN_CUTTING',
  'IN_POLISHING',
  'IN_FINISHING',
  'READY',
  'DELIVERED',
  'CANCELLED',
];

export default function PedidoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => (await api.get(`/orders/${id}`)).data.order as Order,
  });

  const updateMutation = useMutation({
    mutationFn: async (status: OrderStatus) => api.put(`/orders/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['order', id] }),
  });

  if (isLoading || !data) {
    return <p className="text-gray-400">Carregando...</p>;
  }

  const canUpdateStatus = hasPermission(user, 'orders_update_status');
  const canViewCosts = hasPermission(user, 'orders_view_costs');
  const quote = data.quote;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-marble-dark">{data.orderNumber}</h1>
          <p className="text-sm text-gray-500">Criado em {formatDate(data.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="gold">{ORDER_STATUS_LABELS[data.status]}</Badge>
          {canUpdateStatus && (
            <Select
              className="h-9 text-xs w-44"
              value={data.status}
              onChange={(e) => updateMutation.mutate(e.target.value as OrderStatus)}
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
              ))}
            </Select>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <p><strong>Nome:</strong> {quote?.client?.name ?? quote?.clientName ?? '-'}</p>
          <p><strong>Telefone:</strong> {quote?.client?.phone ?? quote?.clientPhone ?? '-'}</p>
          <p><strong>Email:</strong> {quote?.client?.email ?? quote?.clientEmail ?? '-'}</p>
          <p><strong>CPF/CNPJ:</strong> {quote?.client?.cpfCnpj ?? quote?.clientCpfCnpj ?? '-'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Produção</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <p><strong>Responsável:</strong> {data.assignedTo?.name ?? 'Não atribuído'}</p>
          <p><strong>Início:</strong> {data.startDate ? formatDate(data.startDate) : '-'}</p>
          <p><strong>Previsão:</strong> {data.estimatedDate ? formatDate(data.estimatedDate) : '-'}</p>
          <p><strong>Conclusão:</strong> {data.completedDate ? formatDate(data.completedDate) : '-'}</p>
          {data.productionNotes && <p><strong>Observações:</strong> {data.productionNotes}</p>}
          {canViewCosts && (
            <>
              <p><strong>Custo de material:</strong> {data.materialCost != null ? formatCurrency(data.materialCost) : '-'}</p>
              <p><strong>Custo de mão de obra:</strong> {data.laborCost != null ? formatCurrency(data.laborCost) : '-'}</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Histórico de andamento</CardTitle></CardHeader>
        <CardContent>
          {data.stages && data.stages.length > 0 ? (
            <ul className="text-sm space-y-2">
              {data.stages.map((s) => (
                <li key={s.id} className="flex justify-between border-b border-gray-50 pb-2 last:border-0">
                  <span>{s.stageName}</span>
                  <span className="text-gray-400">{s.completedAt ? formatDate(s.completedAt) : '-'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm">Sem histórico ainda.</p>
          )}
        </CardContent>
      </Card>

      {quote && (
        <>
          <Card>
            <CardHeader><CardTitle>Produtos</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
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
                  {quote.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-3">
                        {item.marble?.name}
                        {item.extras && item.extras.length > 0 && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            + {item.extras.map((ex) => `${ex.name} (${formatCurrency(ex.price)})`).join(', ')}
                          </div>
                        )}
                      </td>
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
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(quote.subtotal)}</span></div>
              <div className="flex justify-between"><span>Desconto</span><span>{formatCurrency(quote.discount + (quote.subtotal * quote.discountPct) / 100)}</span></div>
              {quote.freight > 0 && (
                <div className="flex justify-between">
                  <span>Frete{quote.freightDistanceKm ? ` (${quote.freightDistanceKm}km)` : ''}</span>
                  <span>{formatCurrency(quote.freight)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-marble-dark pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>{formatCurrency(quote.total)}</span>
              </div>
            </CardContent>
          </Card>

          <Link href={`/admin/orcamentos/${quote.id}`} className="inline-block text-sm text-marble-gold hover:underline">
            Ver orçamento original ({quote.quoteNumber})
          </Link>
        </>
      )}
    </div>
  );
}
