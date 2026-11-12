'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Marble, QuoteItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';

interface PreviewResult {
  materialValue: number;
  acabamentoValue: number;
  instalacaoValue: number;
}

interface ExtraInput {
  name: string;
  price: string;
}

// Edição manual de um item (mármore, medidas, quantidade, material, acabamento/frontão, instalação e custo
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
  const [marbleId, setMarbleId] = useState('');
  const [dims, setDims] = useState({ description: '', widthCm: '', heightCm: '', thicknessMm: '', quantity: '' });
  // Só recalcula pela fórmula depois que o usuário mexe nas medidas — ao abrir,
  // mantém os valores salvos (que podem ter sido ajustados manualmente).
  const [dimsTouched, setDimsTouched] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const { data: marblesData } = useQuery({
    queryKey: ['marbles-options'],
    queryFn: async () => (await api.get('/marbles', { params: { limit: 200 } })).data as { marbles: Marble[] },
    enabled: Boolean(item),
  });
  const marbles = marblesData?.marbles ?? [];
  const selectedMarble = marbles.find((m) => m.id === marbleId);
  // Preço/m² usado no recálculo: o do mármore escolhido; enquanto a lista não
  // carrega (ou se o mármore não estiver nela), o que veio junto do item.
  const pricePerM2 =
    selectedMarble?.pricePerM2 ?? (marbleId === item?.marbleId ? item?.marble?.pricePerM2 : undefined) ?? 0;
  const [extras, setExtras] = useState<ExtraInput[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setValues({
      materialValue: String(item.materialValue ?? 0),
      acabamentoValue: String(item.acabamentoValue ?? 0),
      instalacaoValue: String(item.instalacaoValue ?? 0),
    });
    setMarbleId(item.marbleId);
    setDims({
      description: item.description ?? '',
      widthCm: String(item.widthCm),
      heightCm: String(item.heightCm),
      thicknessMm: String(item.thicknessMm),
      quantity: String(item.quantity),
    });
    setDimsTouched(false);
    setExtras((item.extras ?? []).map((ex) => ({ name: ex.name, price: String(ex.price) })));
    setError(null);
  }, [item]);

  // Medidas alteradas → recalcula material/acabamento/instalação pela fórmula
  // ativa (mesma prévia do QuoteBuilder), com debounce pra não chamar a cada tecla.
  useEffect(() => {
    if (!item || !dimsTouched) return;
    const width = Number(dims.widthCm);
    const height = Number(dims.heightCm);
    const thickness = Number(dims.thicknessMm) || 20;
    if (!(width > 0) || !(height > 0)) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setRecalculating(true);
      try {
        const { data } = await api.post<PreviewResult>('/formula/preview', {
          width,
          height,
          thickness,
          pricePerM2,
          quantity: 1,
          includeAcabamento: item.includeAcabamento ?? false,
          includeInstalacao: item.includeInstalacao ?? false,
        });
        if (cancelled) return;
        setValues({
          materialValue: String(Math.round(data.materialValue * 100) / 100),
          acabamentoValue: String(Math.round(data.acabamentoValue * 100) / 100),
          instalacaoValue: String(Math.round(data.instalacaoValue * 100) / 100),
        });
      } catch {
        if (!cancelled) setError('Não foi possível recalcular os valores pela fórmula.');
      } finally {
        if (!cancelled) setRecalculating(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [item, dimsTouched, dims.widthCm, dims.heightCm, dims.thicknessMm, pricePerM2]);

  function updateDim(field: 'widthCm' | 'heightCm' | 'thicknessMm', value: string) {
    setDims((d) => ({ ...d, [field]: value }));
    setDimsTouched(true);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!item) return;
      await api.patch(`/quotes/${quoteId}/items/${item.id}/values`, {
        marbleId,
        description: dims.description.trim(),
        widthCm: Number(dims.widthCm),
        heightCm: Number(dims.heightCm),
        thicknessMm: Number(dims.thicknessMm),
        quantity: Number(dims.quantity),
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
  const quantity = Number(dims.quantity) || 0;
  const previewTotal = unitPrice * quantity + extrasTotal;
  const areaM2 = ((Number(dims.widthCm) || 0) * (Number(dims.heightCm) || 0)) / 10000;

  function save() {
    if (!marbleId) {
      setError('Selecione o mármore.');
      return;
    }
    if (!(Number(dims.widthCm) > 0) || !(Number(dims.heightCm) > 0) || !(Number(dims.thicknessMm) > 0)) {
      setError('Informe comprimento, profundidade e espessura maiores que zero.');
      return;
    }
    if (!Number.isInteger(Number(dims.quantity)) || Number(dims.quantity) < 1) {
      setError('A quantidade deve ser um número inteiro maior que zero.');
      return;
    }
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
          <Label>Material</Label>
          <Select
            value={marbleId}
            onChange={(e) => {
              setMarbleId(e.target.value);
              setDimsTouched(true);
            }}
          >
            {!selectedMarble && item.marble && <option value={item.marbleId}>{item.marble.name}</option>}
            {marbles.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} {m.pricePerM2 ? `— ${formatCurrency(m.pricePerM2)}/m²` : '(sob consulta)'}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Descrição</Label>
          <Input value={dims.description} onChange={(e) => setDims((d) => ({ ...d, description: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <Label>Comprimento (cm)</Label>
            <Input type="number" min={0} value={dims.widthCm} onChange={(e) => updateDim('widthCm', e.target.value)} />
          </div>
          <div>
            <Label>Profundidade (cm)</Label>
            <Input type="number" min={0} value={dims.heightCm} onChange={(e) => updateDim('heightCm', e.target.value)} />
          </div>
          <div>
            <Label>Espessura (mm)</Label>
            <Input
              type="number"
              min={0}
              value={dims.thicknessMm}
              onChange={(e) => updateDim('thicknessMm', e.target.value)}
            />
          </div>
          <div>
            <Label>Qtd.</Label>
            <Input
              type="number"
              min={1}
              step={1}
              value={dims.quantity}
              onChange={(e) => setDims((d) => ({ ...d, quantity: e.target.value }))}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Área: {areaM2.toFixed(2)} m²
          {recalculating
            ? ' · recalculando valores...'
            : dimsTouched
              ? ' · valores recalculados pela fórmula (ajuste abaixo se precisar)'
              : ''}
        </p>
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
        <Button variant="gold" onClick={save} disabled={mutation.isPending || recalculating}>
          {mutation.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </Dialog>
  );
}
