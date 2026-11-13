'use client';

import Link from 'next/link';
import { Package } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Order, OrderStatus, ORDER_STATUS_LABELS } from '@/types';
import { Select } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/admin/PageHeader';

const COLUMNS: OrderStatus[] = ['PENDING', 'IN_CUTTING', 'IN_POLISHING', 'IN_FINISHING', 'READY', 'DELIVERED'];

export default function PedidosPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => (await api.get('/orders', { params: { limit: 100 } })).data as { orders: Order[] },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => api.put(`/orders/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  if (isLoading)
    return (
      <p className="flex items-center gap-2 text-sm text-marble-gray">
        <span className="h-4 w-4 rounded-full border-2 border-marble-gold/30 border-t-marble-gold animate-spin" />
        Carregando...
      </p>
    );

  const orders = data?.orders ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Comercial"
        icon={Package}
        title="Pedidos em Produção"
        description="Acompanhe cada pedido pelas etapas de produção."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {COLUMNS.map((status) => (
          <div key={status} className="space-y-2 rounded-2xl border border-[var(--line)] bg-white/40 p-2 backdrop-blur-[2px]">
            <h2 className="flex items-center justify-between px-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-marble-gray">
              {ORDER_STATUS_LABELS[status]}
              <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] tracking-normal text-gold-light">
                {orders.filter((o) => o.status === status).length}
              </span>
            </h2>
            <div className="space-y-2">
              {orders
                .filter((o) => o.status === status)
                .map((order) => (
                  <Card key={order.id} interactive>
                    <CardContent className="p-3 space-y-2">
                      <Link
                        href={`/admin/pedidos/${order.id}`}
                        className="text-sm font-semibold text-ink hover:text-gold-deep transition-colors block"
                      >
                        {order.orderNumber}
                      </Link>
                      {order.name && <p className="text-xs font-medium text-marble-dark -mt-1">{order.name}</p>}
                      <p className="text-xs text-gray-500">{order.quote?.client?.name ?? '-'}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(order.quote?.total ?? 0)}</p>
                      {order.estimatedDate && (
                        <p className="text-xs text-gray-400">Previsão: {formatDate(order.estimatedDate)}</p>
                      )}
                      <Select
                        className="h-8 text-xs"
                        value={order.status}
                        onChange={(e) => updateMutation.mutate({ id: order.id, status: e.target.value as OrderStatus })}
                      >
                        {COLUMNS.concat('CANCELLED').map((s) => (
                          <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                        ))}
                      </Select>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
