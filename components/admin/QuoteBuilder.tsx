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

interface BuilderItem {
  marbleId: string;
  widthCm: string;
  heightCm: string;
  thicknessMm: string;
  quantity: string;
  description: string;
}

const emptyItem: BuilderItem = { marbleId: '', widthCm: '', heightCm: '', thicknessMm: '20', quantity: '1', description: '' };

export function QuoteBuilder() {
  const router = useRouter();
  const [useExistingClient, setUseExistingClient] = useState(true);
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [discount, setDiscount] = useState('0');
  const [discountPct, setDiscountPct] = useState('0');
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

  function calcItemTotal(item: BuilderItem) {
    const marble = marbles.find((m) => m.id === item.marbleId);
    const width = Number(item.widthCm) || 0;
    const height = Number(item.heightCm) || 0;
    const qty = Number(item.quantity) || 0;
    const price = marble?.pricePerM2 ?? 0;
    const area = (width * height) / 10000;
    return area * price * qty;
  }

  const subtotal = items.reduce((sum, item) => sum + calcItemTotal(item), 0);
  const total = Math.max(0, subtotal - Number(discount || 0) - (subtotal * Number(discountPct || 0)) / 100);

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
        })),
        discount: Number(discount || 0),
        discountPct: Number(discountPct || 0),
        notes: notes || undefined,
      };
      const { data } = await api.post('/quotes', payload);
      return data.quote;
    },
    onSuccess: (quote) => router.push(`/orcamentos/${quote.id}`),
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
          <Button size="sm" variant="outline" onClick={() => setItems((p) => [...p, { ...emptyItem }])}>
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
                  <div><Label>Descrição</Label><Input value={item.description} onChange={(e) => updateItem(idx, { description: e.target.value })} placeholder="Ex: Bancada de cozinha" /></div>
                  <div className="grid grid-cols-4 gap-2 col-span-2">
                    <div><Label>Largura (cm)</Label><Input type="number" value={item.widthCm} onChange={(e) => updateItem(idx, { widthCm: e.target.value })} /></div>
                    <div><Label>Altura (cm)</Label><Input type="number" value={item.heightCm} onChange={(e) => updateItem(idx, { heightCm: e.target.value })} /></div>
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
              <p className="text-sm text-right text-marble-gray">
                Subtotal do item: <span className="font-semibold text-marble-dark">{formatCurrency(calcItemTotal(item))}</span>
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Desconto e observações</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Desconto (R$)</Label><Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
            <div><Label>Desconto (%)</Label><Input type="number" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} /></div>
          </div>
          <div><Label>Observações</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-5">
        <div>
          <p className="text-sm text-gray-500">Subtotal: {formatCurrency(subtotal)}</p>
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
