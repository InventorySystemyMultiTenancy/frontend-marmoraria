'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Client, Marble } from '@/types';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface ExtraInput {
  name: string;
  price: string;
}

interface BuilderItem {
  marbleId: string;
  widthCm: string;
  heightCm: string;
  thicknessMm: string;
  quantity: string;
  description: string;
  extras: ExtraInput[];
}

const emptyItem: BuilderItem = {
  marbleId: '',
  widthCm: '',
  heightCm: '',
  thicknessMm: '20',
  quantity: '1',
  description: '',
  extras: [],
};

export function QuoteBuilder() {
  const router = useRouter();
  const [useExistingClient, setUseExistingClient] = useState(true);
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [discount, setDiscount] = useState('0');
  const [discountPct, setDiscountPct] = useState('0');
  const [freightDistanceKm, setFreightDistanceKm] = useState('');
  const [freightRatePerKm, setFreightRatePerKm] = useState('');
  const [freightManual, setFreightManual] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<BuilderItem[]>([{ ...emptyItem }]);
  const [error, setError] = useState<string | null>(null);

  const { data: clientsData } = useQuery({
    queryKey: ['clients-options'],
    queryFn: async () => (await api.get('/clients', { params: { limit: 200 } })).data as { clients: Client[] },
  });

  const { data: marblesData } = useQuery({
    queryKey: ['marbles-options'],
    queryFn: async () => (await api.get('/marbles', { params: { limit: 200 } })).data as { marbles: Marble[] },
  });

  const marbles = marblesData?.marbles ?? [];

  function updateItem(idx: number, patch: Partial<BuilderItem>) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  }

  function addExtra(idx: number) {
    updateItem(idx, { extras: [...items[idx].extras, { name: '', price: '' }] });
  }

  function updateExtra(idx: number, extraIdx: number, patch: Partial<ExtraInput>) {
    const extras = items[idx].extras.map((ex, i) => (i === extraIdx ? { ...ex, ...patch } : ex));
    updateItem(idx, { extras });
  }

  function removeExtra(idx: number, extraIdx: number) {
    updateItem(idx, { extras: items[idx].extras.filter((_, i) => i !== extraIdx) });
  }

  // Preview local: replica a formula padrao (area*pricePerM2 + perimetro*acabamento +
  // perimetro3lados*instalacao) so para dar uma estimativa enquanto o usuario digita.
  // O calculo oficial e sempre feito no backend ao salvar, usando a formula configurada.
  function calcItemUnitPrice(item: BuilderItem) {
    const marble = marbles.find((m) => m.id === item.marbleId);
    const width = Number(item.widthCm) || 0;
    const height = Number(item.heightCm) || 0;
    const price = marble?.pricePerM2 ?? 0;
    const area = (width * height) / 10000;
    const perimeter = (2 * (width + height)) / 100;
    const threeSidePerimeter = (width + 2 * height) / 100;
    return area * price + perimeter * 110 + threeSidePerimeter * 150;
  }

  function calcItemExtrasTotal(item: BuilderItem) {
    return item.extras.reduce((sum, ex) => sum + (Number(ex.price) || 0), 0);
  }

  function calcItemTotal(item: BuilderItem) {
    const qty = Number(item.quantity) || 0;
    return calcItemUnitPrice(item) * qty + calcItemExtrasTotal(item);
  }

  const subtotal = items.reduce((sum, item) => sum + calcItemTotal(item), 0);
  const computedFreight =
    freightDistanceKm && freightRatePerKm
      ? Number(freightDistanceKm) * Number(freightRatePerKm)
      : Number(freightManual || 0);
  const total = Math.max(
    0,
    subtotal - Number(discount || 0) - (subtotal * Number(discountPct || 0)) / 100 + computedFreight
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        clientId: useExistingClient ? clientId || undefined : undefined,
        clientName: !useExistingClient ? clientName : undefined,
        clientPhone: !useExistingClient ? clientPhone : undefined,
        clientEmail: !useExistingClient ? clientEmail || undefined : undefined,
        items: items.map((i) => ({
          marbleId: i.marbleId,
          description: i.description || undefined,
          widthCm: Number(i.widthCm),
          heightCm: Number(i.heightCm),
          thicknessMm: Number(i.thicknessMm),
          quantity: Number(i.quantity),
          extras: i.extras
            .filter((ex) => ex.name && ex.price)
            .map((ex) => ({ name: ex.name, price: Number(ex.price) })),
        })),
        discount: Number(discount || 0),
        discountPct: Number(discountPct || 0),
        freight: computedFreight,
        freightDistanceKm: freightDistanceKm ? Number(freightDistanceKm) : undefined,
        notes: notes || undefined,
      };
      const { data } = await api.post('/quotes', payload);
      return data.quote;
    },
    onSuccess: (quote) => router.push(`/admin/orcamentos/${quote.id}`),
    onError: () => setError('Não foi possível salvar o orçamento. Verifique os campos.'),
  });

  function handleSubmit() {
    setError(null);
    if (!useExistingClient && !clientName) {
      setError('Informe o nome do cliente avulso.');
      return;
    }
    if (useExistingClient && !clientId) {
      setError('Selecione um cliente.');
      return;
    }
    if (items.some((i) => !i.marbleId || !i.widthCm || !i.heightCm)) {
      setError('Preencha mármore, largura e altura de todos os itens.');
      return;
    }
    createMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={useExistingClient} onChange={() => setUseExistingClient(true)} /> Cliente cadastrado
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={!useExistingClient} onChange={() => setUseExistingClient(false)} /> Cliente avulso
            </label>
          </div>

          {useExistingClient ? (
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Selecione...</option>
              {clientsData?.clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Nome *</Label><Input value={clientName} onChange={(e) => setClientName(e.target.value)} /></div>
              <div><Label>Telefone</Label><Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} /></div>
              <div><Label>Email</Label><Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} /></div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between flex-row">
          <CardTitle>Itens do orçamento</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setItems((p) => [...p, { ...emptyItem, extras: [] }])}>
            <Plus size={14} /> Adicionar item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="border border-gray-100 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="grid grid-cols-2 gap-3 flex-1">
                  <div className="col-span-2">
                    <Label>Mármore</Label>
                    <Select value={item.marbleId} onChange={(e) => updateItem(idx, { marbleId: e.target.value })}>
                      <option value="">Selecione...</option>
                      {marbles.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.pricePerM2 ? `— ${formatCurrency(m.pricePerM2)}/m²` : '(sob consulta)'}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div><Label>Descrição</Label><Input value={item.description} onChange={(e) => updateItem(idx, { description: e.target.value })} placeholder="Ex: Pia 2.00x0.60 com instalação" /></div>
                  <div className="grid grid-cols-4 gap-2 col-span-2">
                    <div><Label>Comprimento (cm)</Label><Input type="number" value={item.widthCm} onChange={(e) => updateItem(idx, { widthCm: e.target.value })} /></div>
                    <div><Label>Profundidade (cm)</Label><Input type="number" value={item.heightCm} onChange={(e) => updateItem(idx, { heightCm: e.target.value })} /></div>
                    <div><Label>Espessura (mm)</Label><Input type="number" value={item.thicknessMm} onChange={(e) => updateItem(idx, { thicknessMm: e.target.value })} /></div>
                    <div><Label>Qtd.</Label><Input type="number" value={item.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} /></div>
                  </div>
                </div>
                {items.length > 1 && (
                  <button onClick={() => setItems((p) => p.filter((_, i) => i !== idx))} className="ml-3 text-gray-400 hover:text-red-600 cursor-pointer">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="mb-0">Extras (ex: cuba de inox)</Label>
                  <button onClick={() => addExtra(idx)} className="text-xs text-marble-gold hover:underline cursor-pointer">
                    + Adicionar extra
                  </button>
                </div>
                {item.extras.map((extra, exIdx) => (
                  <div key={exIdx} className="flex gap-2 items-center">
                    <Input
                      placeholder="Nome (ex: Cuba de inox)"
                      value={extra.name}
                      onChange={(e) => updateExtra(idx, exIdx, { name: e.target.value })}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Valor (R$)"
                      value={extra.price}
                      onChange={(e) => updateExtra(idx, exIdx, { price: e.target.value })}
                      className="w-32"
                    />
                    <button onClick={() => removeExtra(idx, exIdx)} className="text-gray-400 hover:text-red-600 cursor-pointer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-sm text-right text-marble-gray">
                Subtotal do item: <span className="font-semibold text-marble-dark">{formatCurrency(calcItemTotal(item))}</span>
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Desconto, frete e observações</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Desconto (R$)</Label><Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
            <div><Label>Desconto (%)</Label><Input type="number" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Distância (km)</Label>
              <Input type="number" value={freightDistanceKm} onChange={(e) => setFreightDistanceKm(e.target.value)} />
            </div>
            <div>
              <Label>Taxa por km (R$)</Label>
              <Input type="number" value={freightRatePerKm} onChange={(e) => setFreightRatePerKm(e.target.value)} />
            </div>
            <div>
              <Label>Ou frete manual (R$)</Label>
              <Input
                type="number"
                value={freightManual}
                onChange={(e) => setFreightManual(e.target.value)}
                disabled={Boolean(freightDistanceKm && freightRatePerKm)}
                placeholder={freightDistanceKm && freightRatePerKm ? formatCurrency(computedFreight) : ''}
              />
            </div>
          </div>
          <div><Label>Observações</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-5">
        <div>
          <p className="text-sm text-gray-500">Subtotal: {formatCurrency(subtotal)}</p>
          {computedFreight > 0 && <p className="text-sm text-gray-500">Frete: {formatCurrency(computedFreight)}</p>}
          <p className="text-xl font-bold text-marble-dark">Total: {formatCurrency(total)}</p>
        </div>
        <div className="text-right">
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          <Button onClick={handleSubmit} disabled={createMutation.isPending} size="lg">
            {createMutation.isPending ? 'Salvando...' : 'Salvar orçamento'}
          </Button>
        </div>
      </div>
    </div>
  );
}
