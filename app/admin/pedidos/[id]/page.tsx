'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Download, Check, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Order, OrderStatus, ORDER_STATUS_LABELS, QuoteItem, User } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { QuoteItemEditDialog } from '@/components/admin/QuoteItemEditDialog';
import { Slab3D } from '@/components/ui/Slab3D';
import { ShowExtrasToggle } from '@/components/admin/ShowExtrasToggle';
import { QuoteFreightDialog } from '@/components/admin/QuoteFreightDialog';
import { QuoteConditionsDialog } from '@/components/admin/QuoteConditionsDialog';
import { QuoteClientDialog } from '@/components/admin/QuoteClientDialog';
import { Button } from '@/components/ui/button';
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

  const canViewCosts = hasPermission(user, 'orders_view_costs');
  const canListUsers = hasPermission(user, 'users_view');

  const [editingItem, setEditingItem] = useState<QuoteItem | null>(null);
  const [showFreightDialog, setShowFreightDialog] = useState(false);
  const [showConditionsDialog, setShowConditionsDialog] = useState(false);
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    assignedToId: '',
    startDate: '',
    estimatedDate: '',
    completedDate: '',
    productionNotes: '',
    materialCost: '',
    laborCost: '',
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-options'],
    queryFn: async () => (await api.get('/users', { params: { limit: 100 } })).data as { users: User[] },
    enabled: canListUsers,
  });

  const refreshOrder = () => queryClient.invalidateQueries({ queryKey: ['order', id] });

  // Edição dos dados de produção do pedido (responsável, datas, observações e
  // custos) — o backend já aceitava, só faltava a tela.
  const editOrderMutation = useMutation({
    mutationFn: async () =>
      api.put(`/orders/${id}`, {
        ...(canListUsers ? { assignedToId: editForm.assignedToId || null } : {}),
        startDate: editForm.startDate || undefined,
        estimatedDate: editForm.estimatedDate || undefined,
        completedDate: editForm.completedDate || undefined,
        productionNotes: editForm.productionNotes,
        ...(canViewCosts && editForm.materialCost !== '' ? { materialCost: Number(editForm.materialCost) } : {}),
        ...(canViewCosts && editForm.laborCost !== '' ? { laborCost: Number(editForm.laborCost) } : {}),
      }),
    onSuccess: () => {
      refreshOrder();
      setShowEditDialog(false);
    },
  });

  // Nome opcional do pedido (aparece na lista, no detalhe e no PDF).
  const nameMutation = useMutation({
    mutationFn: async () => api.put(`/orders/${id}`, { name: nameInput.trim() || null }),
    onSuccess: () => {
      refreshOrder();
      setEditingName(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (status: OrderStatus) => api.put(`/orders/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['order', id] }),
  });

  const [discount, setDiscount] = useState('0');
  const [discountPct, setDiscountPct] = useState('0');

  useEffect(() => {
    if (data?.quote) {
      setDiscount(String(data.quote.discount ?? 0));
      setDiscountPct(String(data.quote.discountPct ?? 0));
    }
  }, [data?.quote]);

  const discountMutation = useMutation({
    mutationFn: async () =>
      api.patch(`/orders/${id}/discount`, {
        discount: Number(discount) || 0,
        discountPct: Number(discountPct) || 0,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['order', id] }),
  });

  if (isLoading || !data) {
    return <p className="text-gray-400">Carregando...</p>;
  }

  const canUpdateStatus = hasPermission(user, 'orders_update_status');
  const canApplyDiscount = hasPermission(user, 'orders_apply_discount');
  const canEditQuote = hasPermission(user, 'quotes_edit');
  const isMaster = user?.role === 'MASTER';
  const quote = data.quote;

  const toDateInput = (d?: string | null) => (d ? d.slice(0, 10) : '');

  function openEditDialog() {
    if (!data) return;
    setEditForm({
      assignedToId: data.assignedToId ?? data.assignedTo?.id ?? '',
      startDate: toDateInput(data.startDate),
      estimatedDate: toDateInput(data.estimatedDate),
      completedDate: toDateInput(data.completedDate),
      productionNotes: data.productionNotes ?? '',
      materialCost: data.materialCost != null ? String(data.materialCost) : '',
      laborCost: data.laborCost != null ? String(data.laborCost) : '',
    });
    editOrderMutation.reset();
    setShowEditDialog(true);
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                className="h-9 w-64 max-w-full"
                value={nameInput}
                placeholder="Nome do pedido (ex: Cozinha apto 302)"
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') nameMutation.mutate();
                  if (e.key === 'Escape') setEditingName(false);
                }}
              />
              <button
                onClick={() => nameMutation.mutate()}
                disabled={nameMutation.isPending}
                className="text-green-600 hover:text-green-700 cursor-pointer"
                aria-label="Salvar nome do pedido"
              >
                <Check size={18} />
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="text-gray-400 hover:text-red-600 cursor-pointer"
                aria-label="Cancelar"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <h1 className="ds-title flex items-center gap-2 flex-wrap">
              {data.name || data.orderNumber}
              {canUpdateStatus && (
                <button
                  onClick={() => {
                    setNameInput(data.name ?? '');
                    setEditingName(true);
                  }}
                  className="text-gray-400 hover:text-marble-gold cursor-pointer"
                  aria-label="Editar nome do pedido"
                >
                  <Pencil size={15} />
                </button>
              )}
            </h1>
          )}
          {nameMutation.isError && <p className="text-xs text-red-600">Não foi possível salvar o nome.</p>}
          <p className="text-sm text-gray-500">
            {data.name ? `${data.orderNumber} · ` : ''}Criado em {formatDate(data.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="gold">{ORDER_STATUS_LABELS[data.status]}</Badge>
          {quote && (
            <a href={`/api/pdf/quote/${quote.id}`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm"><Download size={14} /> PDF</Button>
            </a>
          )}
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
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Cliente</CardTitle>
          {canEditQuote && quote && (
            <Button size="sm" variant="outline" onClick={() => setShowClientDialog(true)}>
              <Pencil size={14} /> Editar
            </Button>
          )}
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p><strong>Nome:</strong> {quote?.client?.name ?? quote?.clientName ?? '-'}</p>
          <p><strong>Telefone:</strong> {quote?.client?.phone || quote?.clientPhone || '-'}</p>
          <p><strong>Email:</strong> {quote?.client?.email || quote?.clientEmail || '-'}</p>
          <p><strong>CPF/CNPJ:</strong> {quote?.client?.cpfCnpj || quote?.clientCpfCnpj || '-'}</p>
          {(quote?.client?.address || quote?.client?.city) && (
            <p>
              <strong>Endereço:</strong>{' '}
              {[quote?.client?.address, [quote?.client?.city, quote?.client?.state].filter(Boolean).join('/')]
                .filter(Boolean)
                .join(' — ')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Produção</CardTitle>
          {canUpdateStatus && (
            <Button size="sm" variant="outline" onClick={openEditDialog}>
              <Pencil size={14} /> Editar pedido
            </Button>
          )}
        </CardHeader>
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
                    <th className="px-5 py-3 text-left font-medium text-gray-600">Material</th>
                    <th className="px-5 py-3 text-left font-medium text-gray-600">Dimensões</th>
                    <th className="px-5 py-3 text-left font-medium text-gray-600">Área</th>
                    <th className="px-5 py-3 text-left font-medium text-gray-600">Qtd.</th>
                    <th className="px-5 py-3 text-left font-medium text-gray-600">Total</th>
                    {isMaster && <th className="px-5 py-3"></th>}
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Slab3D
                            imageUrl={item.marble?.imageUrls?.[0]}
                            widthCm={item.widthCm}
                            heightCm={item.heightCm}
                            thicknessMm={item.thicknessMm}
                            size={64}
                            label={item.marble?.name}
                          />
                          <div className="min-w-0">
                            {item.marble?.name}
                            {(item.includeAcabamento || item.includeInstalacao) && (
                              <div className="text-xs text-gray-400 mt-0.5">
                                Material: {formatCurrency((item.materialValue ?? 0) * item.quantity)}
                                {item.includeAcabamento && ` · Acabamento/frontão: ${formatCurrency((item.acabamentoValue ?? 0) * item.quantity)}`}
                                {item.includeInstalacao && ` · Instalação: ${formatCurrency((item.instalacaoValue ?? 0) * item.quantity)}`}
                              </div>
                            )}
                            {item.extras && item.extras.length > 0 && (
                              <div className="text-xs text-gray-400 mt-0.5">
                                + {item.extras.map((ex) => `${ex.name} (${formatCurrency(ex.price)})`).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">{item.widthCm}x{item.heightCm}cm ({item.thicknessMm}mm)</td>
                      <td className="px-5 py-3">{item.areaM2.toFixed(2)} m²</td>
                      <td className="px-5 py-3">{item.quantity}</td>
                      <td className="px-5 py-3">{formatCurrency(item.totalPrice)}</td>
                      {isMaster && (
                        <td className="px-5 py-3">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="text-gray-400 hover:text-marble-gold cursor-pointer"
                            aria-label="Editar item"
                          >
                            <Pencil size={14} />
                          </button>
                        </td>
                      )}
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

              <div className="pt-3 mt-2 border-t border-gray-100">
                <ShowExtrasToggle
                  quoteId={quote.id}
                  checked={Boolean(quote.showExtras)}
                  disabled={!canEditQuote}
                  onSaved={refreshOrder}
                />
              </div>

              {canApplyDiscount && (
                <div className="pt-4 mt-2 border-t border-gray-100 space-y-3">
                  <p className="font-medium text-marble-dark">Aplicar desconto</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Desconto (R$)</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Desconto (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={discountPct}
                        onChange={(e) => setDiscountPct(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="gold"
                    disabled={discountMutation.isPending}
                    onClick={() => discountMutation.mutate()}
                  >
                    {discountMutation.isPending ? 'Aplicando...' : 'Aplicar desconto'}
                  </Button>
                  {discountMutation.isSuccess && (
                    <p className="text-green-600 text-xs">Desconto aplicado com sucesso.</p>
                  )}
                  {discountMutation.isError && (
                    <p className="text-red-600 text-xs">Não foi possível aplicar o desconto.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Pagamento e detalhes</CardTitle>
              {canEditQuote && (
                <Button size="sm" variant="outline" onClick={() => setShowConditionsDialog(true)}>
                  <Pencil size={14} /> Editar
                </Button>
              )}
            </CardHeader>
            <CardContent className="text-sm space-y-1 whitespace-pre-line">
              {quote.projectName && <p><strong>Projeto:</strong> {quote.projectName}</p>}
              <p><strong>Forma de pagamento:</strong> {quote.paymentConditions || '-'}</p>
              <p><strong>Condições de pagamento:</strong> {quote.paymentTerm || '-'}</p>
              {quote.deliveryTerm && <p><strong>Prazo para ficar pronto:</strong> {quote.deliveryTerm}</p>}
              {quote.notes && <p><strong>Observações:</strong> {quote.notes}</p>}
              <p className="text-xs text-gray-400 pt-1">Essas informações aparecem no PDF do pedido.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Entrega e frete</CardTitle>
              {canEditQuote && (
                <Button size="sm" variant="outline" onClick={() => setShowFreightDialog(true)}>
                  <Pencil size={14} /> Editar
                </Button>
              )}
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p><strong>Endereço de entrega:</strong> {quote.deliveryAddress || '-'}</p>
              <p>
                <strong>Frete:</strong> {formatCurrency(quote.freight)}
                {quote.freightDistanceKm ? ` (${quote.freightDistanceKm}km)` : ''}
              </p>
              <p className="text-xs text-gray-400 pt-1">O frete é somado ao total do pedido e aparece no PDF.</p>
            </CardContent>
          </Card>

          <Link href={`/admin/orcamentos/${quote.id}`} className="inline-block text-sm text-marble-gold hover:underline">
            Ver orçamento original ({quote.quoteNumber})
          </Link>

          <QuoteClientDialog
            quote={quote}
            open={showClientDialog}
            onClose={() => setShowClientDialog(false)}
            onSaved={refreshOrder}
          />

          <QuoteConditionsDialog
            quote={quote}
            open={showConditionsDialog}
            onClose={() => setShowConditionsDialog(false)}
            onSaved={refreshOrder}
          />

          <QuoteFreightDialog
            quote={quote}
            open={showFreightDialog}
            onClose={() => setShowFreightDialog(false)}
            onSaved={refreshOrder}
          />

          <QuoteItemEditDialog
            quoteId={quote.id}
            item={editingItem}
            isApproved
            onClose={() => setEditingItem(null)}
            onSaved={refreshOrder}
          />
        </>
      )}

      <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)}>
        <h2 className="text-lg font-semibold text-marble-dark mb-4">Editar pedido</h2>
        <div className="space-y-3">
          {canListUsers && (
            <div>
              <Label>Responsável</Label>
              <Select
                value={editForm.assignedToId}
                onChange={(e) => setEditForm((f) => ({ ...f, assignedToId: e.target.value }))}
              >
                <option value="">Não atribuído</option>
                {usersData?.users
                  .filter((u) => u.isActive !== false)
                  .map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
              </Select>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Início</Label>
              <Input
                type="date"
                value={editForm.startDate}
                onChange={(e) => setEditForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label>Previsão</Label>
              <Input
                type="date"
                value={editForm.estimatedDate}
                onChange={(e) => setEditForm((f) => ({ ...f, estimatedDate: e.target.value }))}
              />
            </div>
            <div>
              <Label>Conclusão</Label>
              <Input
                type="date"
                value={editForm.completedDate}
                onChange={(e) => setEditForm((f) => ({ ...f, completedDate: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>Observações de produção</Label>
            <Textarea
              rows={3}
              value={editForm.productionNotes}
              onChange={(e) => setEditForm((f) => ({ ...f, productionNotes: e.target.value }))}
            />
          </div>
          {canViewCosts && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Custo de material (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editForm.materialCost}
                  onChange={(e) => setEditForm((f) => ({ ...f, materialCost: e.target.value }))}
                />
              </div>
              <div>
                <Label>Custo de mão de obra (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editForm.laborCost}
                  onChange={(e) => setEditForm((f) => ({ ...f, laborCost: e.target.value }))}
                />
              </div>
            </div>
          )}
          {isMaster && (
            <p className="text-xs text-gray-400">
              Para alterar os valores dos produtos (material, acabamento, instalação e custo adicional), use o lápis em cada item.
            </p>
          )}
        </div>
        {editOrderMutation.isError && <p className="text-xs text-red-600 mt-2">Não foi possível salvar o pedido.</p>}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancelar</Button>
          <Button variant="gold" onClick={() => editOrderMutation.mutate()} disabled={editOrderMutation.isPending}>
            {editOrderMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
