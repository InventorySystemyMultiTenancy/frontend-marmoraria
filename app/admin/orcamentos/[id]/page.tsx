'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Check, X, Pencil, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Quote, QuoteItem, QuoteStatus, QUOTE_STATUS_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Label } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/permissions';
import { QuoteItemEditDialog } from '@/components/admin/QuoteItemEditDialog';
import { ShowExtrasToggle } from '@/components/admin/ShowExtrasToggle';
import { QuoteFreightDialog } from '@/components/admin/QuoteFreightDialog';
import { QuoteConditionsDialog } from '@/components/admin/QuoteConditionsDialog';

export default function OrcamentoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [showCpfDialog, setShowCpfDialog] = useState(false);
  const [cpfInput, setCpfInput] = useState('');
  const [cpfDialogError, setCpfDialogError] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<QuoteItem | null>(null);
  const [showFreightDialog, setShowFreightDialog] = useState(false);
  const [showConditionsDialog, setShowConditionsDialog] = useState(false);

  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [discountInput, setDiscountInput] = useState({ discount: '', discountPct: '' });
  const [discountError, setDiscountError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['quote', id],
    queryFn: async () => (await api.get(`/quotes/${id}`)).data.quote as Quote,
  });

  const statusMutation = useMutation({
    mutationFn: async (payload: { status: QuoteStatus; clientCpfCnpj?: string }) =>
      api.patch(`/quotes/${id}/status`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      setShowCpfDialog(false);
      setCpfInput('');
      setCpfDialogError(null);
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Não foi possível concluir a ação.';
      if (showCpfDialog) setCpfDialogError(message);
    },
  });

  const discountMutation = useMutation({
    mutationFn: async () =>
      api.patch(`/quotes/${id}/discount`, {
        discount: Number(discountInput.discount || 0),
        discountPct: Number(discountInput.discountPct || 0),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      setShowDiscountDialog(false);
      setDiscountError(null);
    },
    onError: (error: unknown) =>
      setDiscountError(
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Não foi possível salvar o desconto.'
      ),
  });

  if (isLoading || !data) {
    return <p className="text-gray-400">Carregando...</p>;
  }

  const canApprove = hasPermission(user, 'quotes_approve');
  const isMaster = user?.role === 'MASTER';
  const canEditDiscount = hasPermission(user, 'quotes_edit');

  // Prévia do novo total enquanto o admin digita o desconto no diálogo.
  const discountValue = Number(discountInput.discount || 0);
  const discountPctValue = Number(discountInput.discountPct || 0);
  const previewDiscountTotal = discountValue + (data.subtotal * discountPctValue) / 100;
  const previewTotal = Math.max(0, data.subtotal - previewDiscountTotal + data.freight);

  function openDiscountDialog() {
    if (!data) return;
    setDiscountInput({ discount: String(data.discount ?? 0), discountPct: String(data.discountPct ?? 0) });
    setDiscountError(null);
    setShowDiscountDialog(true);
  }

  function saveDiscount() {
    if (discountValue < 0 || discountPctValue < 0 || discountPctValue > 100) {
      setDiscountError('Informe um desconto válido (R$ ≥ 0 e % entre 0 e 100).');
      return;
    }
    if (previewDiscountTotal > data!.subtotal) {
      setDiscountError('O desconto não pode ser maior que o subtotal.');
      return;
    }
    discountMutation.mutate();
  }
  const hasCpfCnpj = Boolean(data.clientCpfCnpj || data.client?.cpfCnpj);

  function openEditItem(item: QuoteItem) {
    setEditingItem(item);
  }

  function handleApproveClick() {
    if (hasCpfCnpj) {
      statusMutation.mutate({ status: 'APPROVED' });
      return;
    }
    setCpfDialogError(null);
    setShowCpfDialog(true);
  }

  function confirmCpfAndApprove() {
    if (!cpfInput.trim()) {
      setCpfDialogError('Informe o CPF ou CNPJ do cliente.');
      return;
    }
    statusMutation.mutate({ status: 'APPROVED', clientCpfCnpj: cpfInput.trim() });
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-marble-dark">{data.quoteNumber}</h1>
          <p className="text-sm text-gray-500">{formatDate(data.createdAt)}</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Badge variant="gold">{QUOTE_STATUS_LABELS[data.status]}</Badge>
          {data.order && (
            <Link href={`/admin/pedidos/${data.order.id}`}>
              <Button variant="gold" size="sm">
                Ir para pedido <ArrowRight size={14} />
              </Button>
            </Link>
          )}
          <a href={`/api/pdf/quote/${data.id}`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm"><Download size={14} /> PDF</Button>
          </a>
        </div>
      </div>

      {canApprove && data.status === 'DRAFT' && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => statusMutation.mutate({ status: 'SENT' })}>Marcar como enviado</Button>
        </div>
      )}
      {canApprove && (data.status === 'DRAFT' || data.status === 'SENT') && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="gold" onClick={handleApproveClick}>
            <Check size={14} /> Aprovar
          </Button>
          <Button size="sm" variant="destructive" onClick={() => statusMutation.mutate({ status: 'REJECTED' })}>
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
          <p><strong>CPF/CNPJ:</strong> {data.clientCpfCnpj ?? data.client?.cpfCnpj ?? '-'}</p>
          <p><strong>Endereço de entrega:</strong> {data.deliveryAddress ?? '-'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Itens</CardTitle></CardHeader>
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
              {data.items.map((item) => {
                const hasServiceBreakdown = item.includeAcabamento || item.includeInstalacao;
                return (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3">
                      {item.marble?.name}
                      {hasServiceBreakdown && (
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
                    </td>
                    <td className="px-5 py-3">{item.widthCm}x{item.heightCm}cm ({item.thicknessMm}mm)</td>
                    <td className="px-5 py-3">{item.areaM2.toFixed(2)} m²</td>
                    <td className="px-5 py-3">{item.quantity}</td>
                    <td className="px-5 py-3">
                      {formatCurrency(item.totalPrice)}
                      {item.marble?.pricePerM2 == null && (
                        <div className="text-xs text-gray-400 mt-0.5">Aproximadamente (preço sob consulta)</div>
                      )}
                    </td>
                    {isMaster && (
                      <td className="px-5 py-3">
                        <button
                          onClick={() => openEditItem(item)}
                          className="text-gray-400 hover:text-marble-gold cursor-pointer"
                          aria-label="Editar valores do item"
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(data.subtotal)}</span></div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              Desconto
              {data.discountPct > 0 && <span className="text-xs text-gray-400">({data.discountPct}%{data.discount > 0 ? ` + ${formatCurrency(data.discount)}` : ''})</span>}
              {canEditDiscount && (
                <button
                  onClick={openDiscountDialog}
                  className="text-gray-400 hover:text-marble-gold cursor-pointer"
                  aria-label="Editar desconto"
                >
                  <Pencil size={13} />
                </button>
              )}
            </span>
            <span>{formatCurrency(data.discount + (data.subtotal * data.discountPct) / 100)}</span>
          </div>
          {(data.freight > 0 || canEditDiscount) && (
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                Frete{data.freightDistanceKm ? ` (${data.freightDistanceKm}km)` : ''}
                {canEditDiscount && (
                  <button
                    onClick={() => setShowFreightDialog(true)}
                    className="text-gray-400 hover:text-marble-gold cursor-pointer"
                    aria-label="Editar frete"
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </span>
              <span>{formatCurrency(data.freight)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-marble-dark pt-2 border-t border-gray-100"><span>Total</span><span>{formatCurrency(data.total)}</span></div>
          <div className="pt-3 mt-2 border-t border-gray-100">
            <ShowExtrasToggle
              quoteId={id}
              checked={Boolean(data.showExtras)}
              disabled={!canEditDiscount}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ['quote', id] })}
            />
          </div>
        </CardContent>
      </Card>

      {(data.projectName || data.paymentConditions || data.paymentTerm || data.deliveryTerm || data.notes || canEditDiscount) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Pagamento e detalhes</CardTitle>
            {canEditDiscount && (
              <Button size="sm" variant="outline" onClick={() => setShowConditionsDialog(true)}>
                <Pencil size={14} /> Editar
              </Button>
            )}
          </CardHeader>
          <CardContent className="text-sm space-y-1 whitespace-pre-line">
            {data.projectName && <p><strong>Projeto:</strong> {data.projectName}</p>}
            {data.paymentConditions && <p><strong>Forma de pagamento:</strong> {data.paymentConditions}</p>}
            {data.paymentTerm && <p><strong>Condições de pagamento:</strong> {data.paymentTerm}</p>}
            {data.deliveryTerm && <p><strong>Prazo para ficar pronto:</strong> {data.deliveryTerm}</p>}
            {data.notes && <p><strong>Observações:</strong> {data.notes}</p>}
            {!data.paymentConditions && !data.paymentTerm && !data.deliveryTerm && !data.notes && (
              <p className="text-gray-400">Nenhuma condição de pagamento ou detalhe informado.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showCpfDialog} onClose={() => setShowCpfDialog(false)}>
        <h2 className="text-lg font-semibold text-marble-dark mb-1">CPF ou CNPJ do cliente</h2>
        <p className="text-sm text-gray-500 mb-4">
          Esse orçamento foi criado sem CPF/CNPJ. Informe agora para que o cliente consiga rastrear o pedido depois de aprovado.
        </p>
        <Label>CPF ou CNPJ *</Label>
        <Input value={cpfInput} onChange={(e) => setCpfInput(e.target.value)} placeholder="000.000.000-00" />
        {cpfDialogError && <p className="text-xs text-red-600 mt-1">{cpfDialogError}</p>}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setShowCpfDialog(false)}>Cancelar</Button>
          <Button variant="gold" onClick={confirmCpfAndApprove} disabled={statusMutation.isPending}>
            {statusMutation.isPending ? 'Aprovando...' : 'Confirmar e aprovar'}
          </Button>
        </div>
      </Dialog>

      <Dialog open={showDiscountDialog} onClose={() => setShowDiscountDialog(false)}>
        <h2 className="text-lg font-semibold text-marble-dark mb-1">Desconto do orçamento</h2>
        <p className="text-sm text-gray-500 mb-4">
          Informe o desconto em reais, em porcentagem ou os dois. O total do orçamento e do PDF é recalculado.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Desconto (R$)</Label>
            <Input
              type="number"
              min={0}
              value={discountInput.discount}
              onChange={(e) => setDiscountInput((v) => ({ ...v, discount: e.target.value }))}
            />
          </div>
          <div>
            <Label>Desconto (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={discountInput.discountPct}
              onChange={(e) => setDiscountInput((v) => ({ ...v, discountPct: e.target.value }))}
            />
          </div>
        </div>
        <div className="text-sm text-gray-600 mt-4 space-y-0.5">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(data.subtotal)}</span></div>
          <div className="flex justify-between"><span>Desconto</span><span>- {formatCurrency(previewDiscountTotal)}</span></div>
          {data.freight > 0 && (
            <div className="flex justify-between"><span>Frete</span><span>{formatCurrency(data.freight)}</span></div>
          )}
          <div className="flex justify-between font-semibold text-marble-dark pt-1 border-t border-gray-100">
            <span>Novo total</span><span>{formatCurrency(previewTotal)}</span>
          </div>
        </div>
        {data.status === 'APPROVED' && (
          <p className="text-xs text-amber-600 mt-2">Orçamento já aprovado: o lançamento financeiro do pedido também será atualizado.</p>
        )}
        {discountError && <p className="text-xs text-red-600 mt-2">{discountError}</p>}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setShowDiscountDialog(false)}>Cancelar</Button>
          <Button variant="gold" onClick={saveDiscount} disabled={discountMutation.isPending}>
            {discountMutation.isPending ? 'Salvando...' : 'Aplicar desconto'}
          </Button>
        </div>
      </Dialog>

      <QuoteConditionsDialog
        quote={data}
        open={showConditionsDialog}
        onClose={() => setShowConditionsDialog(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['quote', id] })}
      />

      <QuoteFreightDialog
        quote={data}
        open={showFreightDialog}
        onClose={() => setShowFreightDialog(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['quote', id] })}
      />

      {/* Só o MASTER pode sobrescrever valores do item (inclusive custo adicional). */}
      <QuoteItemEditDialog
        quoteId={id}
        item={editingItem}
        isApproved={data.status === 'APPROVED'}
        onClose={() => setEditingItem(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['quote', id] })}
      />
    </div>
  );
}
