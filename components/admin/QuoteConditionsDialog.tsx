'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Quote } from '@/types';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';

// Forma de pagamento, condições de pagamento, prazo e detalhes opcionais
// (observações) de um orçamento/pedido. Ficam gravados no orçamento — o pedido
// é o orçamento aprovado —, então aparecem no PDF sempre que ele for gerado.
// Campo vazio some do PDF.
export function QuoteConditionsDialog({
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
  const [form, setForm] = useState({ paymentConditions: '', paymentTerm: '', deliveryTerm: '', notes: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      paymentConditions: quote.paymentConditions ?? '',
      paymentTerm: quote.paymentTerm ?? '',
      deliveryTerm: quote.deliveryTerm ?? '',
      notes: quote.notes ?? '',
    });
    setError(null);
  }, [open, quote]);

  const mutation = useMutation({
    mutationFn: async () =>
      api.put(`/quotes/${quote.id}`, {
        paymentConditions: form.paymentConditions.trim(),
        paymentTerm: form.paymentTerm.trim(),
        deliveryTerm: form.deliveryTerm.trim(),
        notes: form.notes.trim(),
      }),
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (err: unknown) =>
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Não foi possível salvar as condições.'
      ),
  });

  return (
    <Dialog open={open} onClose={onClose}>
      <h2 className="text-lg font-semibold text-marble-dark mb-1">Pagamento e detalhes</h2>
      <p className="text-sm text-gray-500 mb-4">Tudo o que for preenchido aparece no PDF. Campos vazios não aparecem.</p>
      <div className="space-y-3">
        <div>
          <Label>Forma de pagamento</Label>
          <Input
            value={form.paymentConditions}
            onChange={(e) => setForm((f) => ({ ...f, paymentConditions: e.target.value }))}
            placeholder="Ex: Pix, cartão em até 3x, boleto"
          />
        </div>
        <div>
          <Label>Condições de pagamento</Label>
          <Textarea
            rows={2}
            value={form.paymentTerm}
            onChange={(e) => setForm((f) => ({ ...f, paymentTerm: e.target.value }))}
            placeholder="Ex: 50% de entrada, 50% na entrega"
          />
        </div>
        <div>
          <Label>Prazo para ficar pronto</Label>
          <Input
            value={form.deliveryTerm}
            onChange={(e) => setForm((f) => ({ ...f, deliveryTerm: e.target.value }))}
            placeholder="Ex: 15 dias úteis"
          />
        </div>
        <div>
          <Label>Detalhes / observações</Label>
          <Textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Informações adicionais para o cliente (opcional)"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button variant="gold" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </Dialog>
  );
}
