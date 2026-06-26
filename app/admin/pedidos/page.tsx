'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Order, OrderStatus, ORDER_STATUS_LABELS } from '@/types';
import { Select } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';

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

  if (isLoading) return <p className="text-gray-400">Carregando...</p>;

  const orders = data?.orders ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-marble-dark">Pedidos em Produção</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {COLUMNS.map((status) => (
          <div key={status} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase text-gray-500 px-1">
              {ORDER_STATUS_LABELS[status]} ({orders.filter((o) => o.status === status).length})
            </h2>
            <div className="space-y-2">
              {orders
                .filter((o) => o.status === status)
                .map((order) => (
                  <Card key={order.id}>
                    <CardContent className="p-3 space-y-2">
                      <p className="text-sm font-semibold text-marble-dark">{order.orderNumber}</p>
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
