'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { QuoteItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';

interface ExtraInput {
  name: string;
  price: string;
}

// Edição manual de um item (material, acabamento/frontão, instalação e custo
// adicional). Usado tanto na tela do orçamento quanto na do pedido — o pedido
// é só um orçamento aprovado, então a rota é a mesma e o backend já atualiza o
// lançamento de receita quando há pedido vinculado.
export function QuoteItemEditDialog({
  quoteId,
  item,
  isApproved,
  onClose,
  onSaved,
}: {
  quoteId: string;
  item: QuoteItem | null;
  isApproved?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState({ materialValue: '', acabamentoValue: '', instalacaoValue: '' });
  const [extras, setExtras] = useState<ExtraInput[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setValues({
      materialValue: String(item.materialValue ?? 0),
      acabamentoValue: String(item.acabamentoValue ?? 0),
      instalacaoValue: String(item.instalacaoValue ?? 0),
    });
    setExtras((item.extras ?? []).map((ex) => ({ name: ex.name, price: String(ex.price) })));
    setError(null);
  }, [item]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!item) return;
      await api.patch(`/quotes/${quoteId}/items/${item.id}/values`, {
        materialValue: Number(values.materialValue || 0),
        acabamentoValue: Number(values.acabamentoValue || 0),
        instalacaoValue: Number(values.instalacaoValue || 0),
        extras: extras
          .filter((ex) => ex.name.trim() && ex.price !== '')
          .map((ex) => ({ name: ex.name.trim(), price: Number(ex.price) })),
      });
    },
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: () => setError('Não foi possível salvar os valores.'),
  });

  if (!item) return null;

  const unitPrice =
    Number(values.materialValue || 0) + Number(values.acabamentoValue || 0) + Number(values.instalacaoValue || 0);
  const extrasTotal = extras.reduce((sum, ex) => sum + (Number(ex.price) || 0), 0);
  const previewTotal = unitPrice * item.quantity + extrasTotal;

  function save() {
    const numbers = [values.materialValue, values.acabamentoValue, values.instalacaoValue, ...extras.map((e) => e.price)];
    if (numbers.some((n) => n !== '' && (isNaN(Number(n)) || Number(n) < 0))) {
      setError('Os valores não podem ser negativos.');
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog open onClose={onClose}>
      <h2 className="text-lg font-semibold text-marble-dark mb-1">Editar item</h2>
      <p className="text-sm text-gray-500 mb-4">
        Valores por peça (antes de multiplicar pela quantidade). O custo adicional é somado uma vez ao total do item.
      </p>
      <div className="space-y-3">
        <div>
          <Label>Material (R$)</Label>
          <Input
            type="number"
            min={0}
            value={values.materialValue}
            onChange={(e) => setValues((v) => ({ ...v, materialValue: e.target.value }))}
          />
        </div>
        <div>
          <Label>Acabamento/frontão (R$)</Label>
          <Input
            type="number"
            min={0}
            value={values.acabamentoValue}
            onChange={(e) => setValues((v) => ({ ...v, acabamentoValue: e.target.value }))}
          />
        </div>
        <div>
          <Label>Instalação (R$)</Label>
          <Input
            type="number"
            min={0}
            value={values.instalacaoValue}
            onChange={(e) => setValues((v) => ({ ...v, instalacaoValue: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="mb-0">Custo adicional (ex: cuba de inox)</Label>
            <button
              type="button"
              onClick={() => setExtras((p) => [...p, { name: '', price: '' }])}
              className="text-xs text-marble-gold hover:underline cursor-pointer"
            >
              + Adicionar
            </button>
          </div>
          {extras.map((extra, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                placeholder="Nome"
                value={extra.name}
                onChange={(e) =>
                  setExtras((p) => p.map((ex, i) => (i === idx ? { ...ex, name: e.target.value } : ex)))
                }
                className="flex-1"
              />
              <Input
                type="number"
                min={0}
                placeholder="R$"
                value={extra.price}
                onChange={(e) =>
                  setExtras((p) => p.map((ex, i) => (i === idx ? { ...ex, price: e.target.value } : ex)))
                }
                className="w-28"
              />
              <button
                type="button"
                onClick={() => setExtras((p) => p.filter((_, i) => i !== idx))}
                className="text-gray-400 hover:text-red-600 cursor-pointer shrink-0"
                aria-label="Remover custo adicional"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between text-sm font-semibold text-marble-dark mt-4 pt-2 border-t border-gray-100">
        <span>Novo total do item</span>
        <span>{formatCurrency(previewTotal)}</span>
      </div>
      {isApproved && (
        <p className="text-xs text-amber-600 mt-2">Pedido já aprovado: o lançamento financeiro também será atualizado.</p>
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
