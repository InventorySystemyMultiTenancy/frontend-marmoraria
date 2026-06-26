'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { FinancialEntry, FinancialType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/admin/DataTable';
import { FinancialChart } from '@/components/admin/FinancialChart';
import { formatCurrency, formatDate } from '@/lib/utils';

const schema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().min(1, 'Categoria obrigatória'),
  description: z.string().min(1, 'Descrição obrigatória'),
  amount: z.coerce.number().positive('Informe um valor válido'),
  date: z.string().min(1, 'Informe a data'),
});
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

export default function FinanceiroPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ['financial-summary'],
    queryFn: async () => (await api.get('/financial/summary')).data as { income: number; expense: number; profit: number; margin: number },
  });

  const { data: monthly } = useQuery({
    queryKey: ['financial-monthly'],
    queryFn: async () => (await api.get('/financial/monthly')).data as { data: { month: string; income: number; expense: number }[] },
  });

  const { data: entries, isLoading } = useQuery({
    queryKey: ['financial-entries'],
    queryFn: async () => (await api.get('/financial', { params: { limit: 50 } })).data as { entries: FinancialEntry[] },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'INCOME', date: new Date().toISOString().slice(0, 10) },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => api.post('/financial', values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['financial-monthly'] });
      setShowForm(false);
      reset({ type: 'INCOME', date: new Date().toISOString().slice(0, 10) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/financial/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['financial-monthly'] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-marble-dark">Financeiro</h1>
        <Button onClick={() => setShowForm(true)}><Plus size={16} /> Novo lançamento</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><CardContent><p className="text-sm text-gray-500">Receita</p><p className="text-2xl font-bold text-green-600">{formatCurrency(summary?.income ?? 0)}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-gray-500">Despesas</p><p className="text-2xl font-bold text-red-600">{formatCurrency(summary?.expense ?? 0)}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-gray-500">Lucro</p><p className="text-2xl font-bold text-marble-dark">{formatCurrency(summary?.profit ?? 0)}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-gray-500">Margem</p><p className="text-2xl font-bold text-marble-gold">{(summary?.margin ?? 0).toFixed(1)}%</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Receitas x Despesas (6 meses)</CardTitle></CardHeader>
        <CardContent>
          <FinancialChart data={monthly?.data ?? []} />
        </CardContent>
      </Card>

      <DataTable
        data={entries?.entries ?? []}
        isLoading={isLoading}
        keyExtractor={(e) => e.id}
        columns={[
          { header: 'Tipo', cell: (e) => <Badge variant={e.type === 'INCOME' ? 'success' : 'danger'}>{e.type === 'INCOME' ? 'Receita' : 'Despesa'}</Badge> },
          { header: 'Categoria', cell: (e) => e.category },
          { header: 'Descrição', cell: (e) => e.description },
          { header: 'Valor', cell: (e) => formatCurrency(e.amount) },
          { header: 'Data', cell: (e) => formatDate(e.date) },
          {
            header: '',
            className: 'text-right',
            cell: (e) => (
              <button onClick={() => confirm('Remover este lançamento?') && deleteMutation.mutate(e.id)} className="text-gray-500 hover:text-red-600 cursor-pointer">
                <Trash2 size={16} />
              </button>
            ),
          },
        ]}
      />

      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <h2 className="text-lg font-semibold text-marble-dark mb-4">Novo lançamento</h2>
        <form onSubmit={handleSubmit((v) => saveMutation.mutate(schema.parse(v)))} className="space-y-3">
          <div>
            <Label>Tipo</Label>
            <Select {...register('type')}>
              <option value="INCOME">Receita</option>
              <option value="EXPENSE">Despesa</option>
            </Select>
          </div>
          <div>
            <Label>Categoria *</Label>
            <Input {...register('category')} placeholder="Ex: Material, Mão de obra, Venda" />
            {errors.category && <p className="text-xs text-red-600 mt-1">{errors.category.message}</p>}
          </div>
          <div>
            <Label>Descrição *</Label>
            <Input {...register('description')} />
            {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$) *</Label>
              <Input type="number" step="0.01" {...register('amount')} />
              {errors.amount && <p className="text-xs text-red-600 mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <Label>Data *</Label>
              <Input type="date" {...register('date')} />
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
