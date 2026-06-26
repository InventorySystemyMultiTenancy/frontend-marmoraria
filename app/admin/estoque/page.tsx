'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Marble, StockItem, StockStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/admin/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';

const STATUS_VARIANT: Record<StockStatus, 'success' | 'warning' | 'default' | 'danger'> = {
  AVAILABLE: 'success',
  RESERVED: 'warning',
  USED: 'default',
  DAMAGED: 'danger',
};

const STATUS_LABEL: Record<StockStatus, string> = {
  AVAILABLE: 'Disponível',
  RESERVED: 'Reservado',
  USED: 'Usado',
  DAMAGED: 'Danificado',
};

const schema = z.object({
  marbleId: z.string().min(1, 'Selecione um mármore'),
  slabNumber: z.string().optional(),
  widthCm: z.coerce.number().positive('Informe a largura'),
  heightCm: z.coerce.number().positive('Informe a altura'),
  thicknessMm: z.coerce.number().positive('Informe a espessura'),
  costPrice: z.coerce.number().nonnegative().optional(),
  location: z.string().optional(),
  status: z.enum(['AVAILABLE', 'RESERVED', 'USED', 'DAMAGED']),
});
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

export default function EstoquePage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['stock'],
    queryFn: async () => (await api.get('/stock', { params: { limit: 100 } })).data as { items: StockItem[] },
  });

  const { data: summary } = useQuery({
    queryKey: ['stock-summary'],
    queryFn: async () => (await api.get('/stock/summary')).data as { totalValue: number; totalAreaM2: number; totalItems: number },
  });

  const { data: marblesData } = useQuery({
    queryKey: ['marbles-options'],
    queryFn: async () => (await api.get('/marbles', { params: { limit: 100 } })).data as { marbles: Marble[] },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'AVAILABLE' },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => api.post('/stock', values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
      setShowForm(false);
      reset({ status: 'AVAILABLE' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/stock/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-marble-dark">Estoque</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} /> Nova entrada
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent><p className="text-sm text-gray-500">Itens disponíveis</p><p className="text-2xl font-bold text-marble-dark">{summary?.totalItems ?? 0}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-gray-500">Área total</p><p className="text-2xl font-bold text-marble-dark">{(summary?.totalAreaM2 ?? 0).toFixed(1)} m²</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-gray-500">Valor em estoque</p><p className="text-2xl font-bold text-marble-gold">{formatCurrency(summary?.totalValue ?? 0)}</p></CardContent></Card>
      </div>

      <DataTable
        data={data?.items ?? []}
        isLoading={isLoading}
        keyExtractor={(s) => s.id}
        columns={[
          { header: 'Mármore', cell: (s) => s.marble?.name ?? '-' },
          { header: 'Lote', cell: (s) => s.slabNumber ?? '-' },
          { header: 'Dimensões', cell: (s) => `${s.widthCm}x${s.heightCm}cm (${s.thicknessMm}mm)` },
          { header: 'Área', cell: (s) => `${s.areaM2.toFixed(2)} m²` },
          { header: 'Local', cell: (s) => s.location ?? '-' },
          { header: 'Status', cell: (s) => <Badge variant={STATUS_VARIANT[s.status]}>{STATUS_LABEL[s.status]}</Badge> },
          { header: 'Entrada', cell: (s) => formatDate(s.entryDate) },
          {
            header: '',
            className: 'text-right',
            cell: (s) => (
              <button onClick={() => confirm('Remover este item?') && deleteMutation.mutate(s.id)} className="text-gray-500 hover:text-red-600 cursor-pointer">
                <Trash2 size={16} />
              </button>
            ),
          },
        ]}
      />

      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <h2 className="text-lg font-semibold text-marble-dark mb-4">Nova entrada de estoque</h2>
        <form onSubmit={handleSubmit((v) => saveMutation.mutate(schema.parse(v)))} className="space-y-3">
          <div>
            <Label>Mármore *</Label>
            <Select {...register('marbleId')}>
              <option value="">Selecione...</option>
              {marblesData?.marbles.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
            {errors.marbleId && <p className="text-xs text-red-600 mt-1">{errors.marbleId.message}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Largura (cm) *</Label><Input type="number" step="0.1" {...register('widthCm')} /></div>
            <div><Label>Altura (cm) *</Label><Input type="number" step="0.1" {...register('heightCm')} /></div>
            <div><Label>Espessura (mm) *</Label><Input type="number" step="1" {...register('thicknessMm')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nº do lote</Label><Input {...register('slabNumber')} /></div>
            <div><Label>Custo (R$)</Label><Input type="number" step="0.01" {...register('costPrice')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Localização</Label><Input {...register('location')} placeholder="Ex: Galpão A" /></div>
            <div>
              <Label>Status</Label>
              <Select {...register('status')}>
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
