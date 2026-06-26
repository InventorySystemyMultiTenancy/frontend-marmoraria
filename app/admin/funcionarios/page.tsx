'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Shield, Ban } from 'lucide-react';
import { api } from '@/lib/api';
import { User, UserRole, PERMISSION_GROUPS, UserPermissions } from '@/types';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/admin/DataTable';
import { useAuthStore } from '@/store/authStore';

const createSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo de 6 caracteres'),
  role: z.enum(['MASTER', 'ADMIN', 'EMPLOYEE', 'SALESPERSON']),
});
type CreateFormValues = z.infer<typeof createSchema>;

const ROLE_LABELS: Record<UserRole, string> = {
  MASTER: 'Master',
  ADMIN: 'Admin',
  EMPLOYEE: 'Funcionário',
  SALESPERSON: 'Vendedor',
};

export default function FuncionariosPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [showForm, setShowForm] = useState(false);
  const [permTarget, setPermTarget] = useState<User | null>(null);
  const [perms, setPerms] = useState<UserPermissions | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users', { params: { limit: 100 } })).data as { users: User[] },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'EMPLOYEE' },
  });

  const createMutation = useMutation({
    mutationFn: async (values: CreateFormValues) => api.post('/users', values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      reset({ role: 'EMPLOYEE' });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const permsMutation = useMutation({
    mutationFn: async () => api.put(`/users/${permTarget!.id}/permissions`, perms),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setPermTarget(null);
    },
  });

  function openPermissions(user: User) {
    setPermTarget(user);
    setPerms({ ...user.permissions });
  }

  function copyFrom(sourceId: string) {
    const source = data?.users.find((u) => u.id === sourceId);
    if (source) setPerms({ ...source.permissions });
  }

  const isMaster = currentUser?.role === 'MASTER';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-marble-dark">Funcionários</h1>
        <Button onClick={() => setShowForm(true)}><Plus size={16} /> Novo funcionário</Button>
      </div>

      <DataTable
        data={data?.users ?? []}
        isLoading={isLoading}
        keyExtractor={(u) => u.id}
        columns={[
          { header: 'Nome', cell: (u) => u.name },
          { header: 'Email', cell: (u) => u.email },
          { header: 'Papel', cell: (u) => <Badge variant="gold">{ROLE_LABELS[u.role]}</Badge> },
          { header: 'Status', cell: (u) => <Badge variant={u.isActive ? 'success' : 'danger'}>{u.isActive ? 'Ativo' : 'Inativo'}</Badge> },
          {
            header: '',
            className: 'text-right',
            cell: (u) => (
              <div className="flex justify-end gap-2">
                {isMaster && u.role !== 'MASTER' && (
                  <button onClick={() => openPermissions(u)} className="text-gray-500 hover:text-marble-gold cursor-pointer" title="Permissões">
                    <Shield size={16} />
                  </button>
                )}
                {u.role !== 'MASTER' && u.isActive && (
                  <button onClick={() => confirm('Desativar este funcionário?') && deactivateMutation.mutate(u.id)} className="text-gray-500 hover:text-red-600 cursor-pointer" title="Desativar">
                    <Ban size={16} />
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />

      <Dialog open={showForm} onClose={() => setShowForm(false)}>
        <h2 className="text-lg font-semibold text-marble-dark mb-4">Novo funcionário</h2>
        <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="space-y-3">
          <div><Label>Nome *</Label><Input {...register('name')} />{errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}</div>
          <div><Label>Email *</Label><Input type="email" {...register('email')} />{errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}</div>
          <div><Label>Senha *</Label><Input type="password" {...register('password')} />{errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}</div>
          <div>
            <Label>Papel</Label>
            <Select {...register('role')}>
              <option value="EMPLOYEE">Funcionário</option>
              <option value="SALESPERSON">Vendedor</option>
              <option value="ADMIN">Admin</option>
              <option value="MASTER">Master</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={!!permTarget} onClose={() => setPermTarget(null)} className="max-w-2xl">
        <h2 className="text-lg font-semibold text-marble-dark mb-1">Permissões de {permTarget?.name}</h2>
        <div className="mb-4">
          <Label>Copiar permissões de</Label>
          <Select onChange={(e) => e.target.value && copyFrom(e.target.value)} defaultValue="">
            <option value="">Selecione um funcionário...</option>
            {data?.users.filter((u) => u.id !== permTarget?.id && u.role !== 'MASTER').map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </Select>
        </div>

        {perms && (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.label}>
                <h3 className="text-sm font-semibold text-marble-dark mb-2">{group.label}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {group.keys.map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={perms[key]}
                        onChange={(e) => setPerms({ ...perms, [key]: e.target.checked })}
                      />
                      {key}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setPermTarget(null)}>Cancelar</Button>
          <Button onClick={() => permsMutation.mutate()} disabled={permsMutation.isPending}>
            {permsMutation.isPending ? 'Salvando...' : 'Salvar permissões'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
