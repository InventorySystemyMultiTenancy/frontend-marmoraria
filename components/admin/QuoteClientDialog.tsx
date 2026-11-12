'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Quote } from '@/types';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';

// Edição do nome e dados do cliente direto do orçamento/pedido, sem ir na aba
// de clientes. Cliente cadastrado: o cadastro dele também é atualizado (vale
// pra todos os orçamentos dele). Cliente avulso: só este orçamento.
export function QuoteClientDialog({
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
  const isRegistered = Boolean(quote.clientId);
  const [form, setForm] = useState({ name: '', phone: '', email: '', cpfCnpj: '', address: '', city: '', state: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const c = quote.client;
    setForm({
      name: c?.name ?? quote.clientName ?? '',
      phone: c?.phone ?? quote.clientPhone ?? '',
      email: c?.email ?? quote.clientEmail ?? '',
      cpfCnpj: c?.cpfCnpj ?? quote.clientCpfCnpj ?? '',
      address: c?.address ?? '',
      city: c?.city ?? '',
      state: c?.state ?? '',
    });
    setError(null);
  }, [open, quote]);

  const mutation = useMutation({
    mutationFn: async () =>
      api.patch(`/quotes/${quote.id}/client`, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        cpfCnpj: form.cpfCnpj.trim(),
        ...(isRegistered
          ? { address: form.address.trim(), city: form.city.trim(), state: form.state.trim() }
          : {}),
      }),
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (err: unknown) => {
      const data = (err as { response?: { data?: { error?: string; details?: { message?: string }[] } } })
        ?.response?.data;
      setError(data?.details?.[0]?.message ?? data?.error ?? 'Não foi possível salvar os dados do cliente.');
    },
  });

  function save() {
    if (form.name.trim().length < 2) {
      setError('Informe o nome do cliente.');
      return;
    }
    mutation.mutate();
  }

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose}>
      <h2 className="text-lg font-semibold text-marble-dark mb-1">Dados do cliente</h2>
      <p className="text-sm text-gray-500 mb-4">
        {isRegistered
          ? 'Cliente cadastrado: as alterações também atualizam o cadastro dele na aba Clientes.'
          : 'Cliente avulso: as alterações valem só para este orçamento/pedido.'}
      </p>
      <div className="space-y-3">
        <div>
          <Label>Nome *</Label>
          <Input value={form.name} onChange={set('name')} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Telefone</Label>
            <Input value={form.phone} onChange={set('phone')} placeholder="(00) 00000-0000" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={set('email')} />
          </div>
        </div>
        <div>
          <Label>CPF ou CNPJ</Label>
          <Input value={form.cpfCnpj} onChange={set('cpfCnpj')} placeholder="000.000.000-00" />
        </div>
        {isRegistered && (
          <>
            <div>
              <Label>Endereço</Label>
              <Input value={form.address} onChange={set('address')} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>Cidade</Label>
                <Input value={form.city} onChange={set('city')} />
              </div>
              <div>
                <Label>UF</Label>
                <Input value={form.state} onChange={set('state')} maxLength={2} />
              </div>
            </div>
          </>
        )}
      </div>
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
