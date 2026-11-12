'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Quote } from '@/types';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';

// Edição do endereço de entrega, distância e frete de um orçamento já criado
// (também usado na tela do pedido). Frete = distância × taxa por km quando os
// dois são informados; senão, vale o frete manual. O total é recalculado no
// backend, que também atualiza o lançamento de receita se já houver pedido.
export function QuoteFreightDialog({
  quote,
  open,
  onClose,
  onSaved,
}: {
  quote: Quote;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ deliveryAddress: '', distance: '', rate: '', manual: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const hasRate = quote.freightRatePerKm != null && quote.freightRatePerKm > 0;
    setForm({
      deliveryAddress: quote.deliveryAddress ?? '',
      distance: quote.freightDistanceKm != null ? String(quote.freightDistanceKm) : '',
      rate: hasRate ? String(quote.freightRatePerKm) : '',
      manual: hasRate ? '' : String(quote.freight ?? 0),
    });
    setError(null);
  }, [open, quote]);

  const distance = Number(form.distance || 0);
  const rate = Number(form.rate || 0);
  const usesRate = distance > 0 && rate > 0;
  const freight = usesRate ? Math.round(distance * rate * 100) / 100 : Number(form.manual || 0);
  const discountTotal = quote.discount + (quote.subtotal * quote.discountPct) / 100;
  const previewTotal = Math.max(0, quote.subtotal - discountTotal + freight);

  const mutation = useMutation({
    mutationFn: async () =>
      api.patch(`/quotes/${quote.id}/freight`, {
        deliveryAddress: form.deliveryAddress.trim() || null,
        freightDistanceKm: form.distance !== '' ? distance : null,
        freightRatePerKm: form.rate !== '' ? rate : null,
        freight: usesRate ? undefined : freight,
      }),
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (err: unknown) =>
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Não foi possível salvar o frete.'
      ),
  });

  function save() {
    const numbers = [form.distance, form.rate, form.manual];
    if (numbers.some((n) => n !== '' && (isNaN(Number(n)) || Number(n) < 0))) {
      setError('Os valores não podem ser negativos.');
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <h2 className="text-lg font-semibold text-marble-dark mb-1">Entrega e frete</h2>
      <p className="text-sm text-gray-500 mb-4">
        Informe distância e taxa por km para calcular o frete, ou um valor manual. O total do orçamento e do PDF é
        recalculado.
      </p>
      <div className="space-y-3">
        <div>
          <Label>Endereço de entrega</Label>
          <Input
            value={form.deliveryAddress}
            onChange={(e) => setForm((f) => ({ ...f, deliveryAddress: e.target.value }))}
            placeholder="Rua, número, bairro, cidade"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>Distância (km)</Label>
            <Input
              type="number"
              min={0}
              value={form.distance}
              onChange={(e) => setForm((f) => ({ ...f, distance: e.target.value }))}
            />
          </div>
          <div>
            <Label>Taxa por km (R$)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.rate}
              onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
            />
          </div>
          <div>
            <Label>Ou frete manual (R$)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={usesRate ? '' : form.manual}
              onChange={(e) => setForm((f) => ({ ...f, manual: e.target.value }))}
              disabled={usesRate}
              placeholder={usesRate ? formatCurrency(freight) : ''}
            />
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-600 mt-4 space-y-0.5">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(quote.subtotal)}</span></div>
        <div className="flex justify-between"><span>Desconto</span><span>- {formatCurrency(discountTotal)}</span></div>
        <div className="flex justify-between"><span>Frete</span><span>{formatCurrency(freight)}</span></div>
        <div className="flex justify-between font-semibold text-marble-dark pt-1 border-t border-gray-100">
          <span>Novo total</span><span>{formatCurrency(previewTotal)}</span>
        </div>
      </div>
      {quote.status === 'APPROVED' && (
        <p className="text-xs text-amber-600 mt-2">Orçamento já aprovado: o lançamento financeiro do pedido também será atualizado.</p>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button variant="gold" onClick={save} disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </Dialog>
  );
}
