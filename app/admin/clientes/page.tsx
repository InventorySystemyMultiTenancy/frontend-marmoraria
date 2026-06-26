'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { DataTable } from '@/components/admin/DataTable';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/permissions';

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  cpfCnpj: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function ClientesPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: async () => (await api.get('/clients', { params: { search } })).data as { clients: Client[] },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editing) return api.put(`/clients/${editing.id}`, values);
      return api.post('/clients', values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });

  function openCreate() {
    setEditing(null);
    reset({ name: '', email: '', phone: '', cpfCnpj: '', city: '', state: '', notes: '' });
    setShowForm(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    reset({
      name: client.name,
      email: client.email ?? '',
      phone: client.phone ?? '',
      cpfCnpj: client.cpfCnpj ?? '',
      city: client.city ?? '',
      state: client.state ?? '',
      notes: client.notes ?? '',
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  const canEdit = hasPermission(user, 'clients_edit');
  const canCreate = hasPermission(user, 'clients_create');
  const canDelete = hasPermission(user, 'clients_delete');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-marble-dark">Clientes</h1>
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus size={16} /> Novo cliente
          </Button>
        )}
      </div>

      <Input
        placeholder="Buscar por nome, email ou telefone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <DataTable
        data={data?.clients ?? []}
        isLoading={isLoading}
        keyExtractor={(c) => c.id}
        columns={[
          { header: 'Nome', cell: (c) => c.name },
          { header: 'Telefone', cell: (c) => c.phone ?? '-' },
          { header: 'Email', cell: (c) => c.email ?? '-' },
          { header: 'Cidade/UF', cell: (c) => (c.city ? `${c.city}/${c.state ?? ''}` : '-') },
          {
            header: '',
            className: 'text-right',
            cell: (c) => (
              <div className="flex justify-end gap-2">
                {canEdit && (
                  <button onClick={() => openEdit(c)} className="text-gray-500 hover:text-marble-gold cursor-pointer">
                    <Pencil size={16} />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => confirm('Remover este cliente?') && deleteMutation.mutate(c.id)}
                    className="text-gray-500 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />

      <Dialog open={showForm} onClose={closeForm}>
        <h2 className="text-lg font-semibold text-marble-dark mb-4">
          {editing ? 'Editar cliente' : 'Novo cliente'}
        </h2>
        <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="space-y-3">
          <div>
            <Label>Nome *</Label>
            <Input {...register('name')} />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefone</Label>
              <Input {...register('phone')} />
            </div>
            <div>
              <Label>Email</Label>
              <Input {...register('email')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CPF/CNPJ</Label>
              <Input {...register('cpfCnpj')} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Cidade</Label>
                <Input {...register('city')} />
              </div>
              <div>
                <Label>UF</Label>
                <Input {...register('state')} maxLength={2} />
              </div>
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea rows={2} {...register('notes')} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
