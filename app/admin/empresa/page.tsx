'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { Company } from '@/types';

export default function EmpresaPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data } = useQuery({
    queryKey: ['company'],
    queryFn: async () => (await api.get('/company')).data as { company: Company | null },
  });

  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [freightRatePerKm, setFreightRatePerKm] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.company) {
      setName(data.company.name ?? '');
      setCnpj(data.company.cnpj ?? '');
      setPhone(data.company.phone ?? '');
      setWhatsapp(data.company.whatsapp ?? '');
      setEmail(data.company.email ?? '');
      setAddress(data.company.address ?? '');
      setFreightRatePerKm(data.company.freightRatePerKm != null ? String(data.company.freightRatePerKm) : '');
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () =>
      api.put('/company', {
        name,
        cnpj: cnpj || undefined,
        phone: phone || undefined,
        whatsapp: whatsapp || undefined,
        email: email || undefined,
        address: address || undefined,
        freightRatePerKm: freightRatePerKm ? Number(freightRatePerKm) : undefined,
      }),
    onSuccess: () => {
      setSaveError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      queryClient.invalidateQueries({ queryKey: ['company'] });
    },
    onError: () => setSaveError('Não foi possível salvar. Verifique os campos.'),
  });

  if (user && user.role !== 'MASTER' && user.role !== 'ADMIN') {
    return <p className="text-gray-500">Apenas MASTER ou ADMIN podem editar os dados da empresa.</p>;
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-marble-dark">Configurações da Empresa</h1>
        <p className="text-sm text-gray-500 mt-1">
          Dados exibidos no PDF de orçamentos, no site público e usados no cálculo de frete.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Dados cadastrais</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>CNPJ</Label><Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" /></div>
            <div><Label>Telefone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 0000-0000" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>WhatsApp</Label><Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="5511999999999" /></div>
            <div><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          </div>
          <div><Label>Endereço</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Frete</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="max-w-xs">
            <Label>Taxa por km (R$)</Label>
            <Input type="number" step="0.01" value={freightRatePerKm} onChange={(e) => setFreightRatePerKm(e.target.value)} placeholder="7.00" />
          </div>
          <p className="text-xs text-gray-400">
            Usada para calcular automaticamente o frete no orçamento público do site, a partir da distância
            informada pelo cliente (distância × taxa).
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        {saveError && <p className="text-sm text-red-600">{saveError}</p>}
        {saved && <p className="text-sm text-green-600">Salvo!</p>}
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}
