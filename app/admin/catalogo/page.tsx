'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { Marble, MARBLE_TYPE_LABELS, MarbleType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/admin/DataTable';
import { formatCurrency } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  description: z.string().optional(),
  origin: z.string().optional(),
  color: z.string().optional(),
  type: z.enum(['MARBLE', 'GRANITE', 'QUARTZITE', 'PORCELAIN', 'LIMESTONE', 'TRAVERTINE', 'OTHER']),
  pricePerM2: z.string().optional(),
  thickness: z.string().optional(),
  isAvailable: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function CatalogoAdminPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Marble | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['marbles-admin', search],
    queryFn: async () => (await api.get('/marbles', { params: { search } })).data as { marbles: Marble[] },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'MARBLE', isAvailable: true, isPublic: true },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = { ...values, pricePerM2: values.pricePerM2 || null, thickness: values.thickness || null };
      if (editing) return api.put(`/marbles/${editing.id}`, payload);
      return api.post('/marbles', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marbles-admin'] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/marbles/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marbles-admin'] }),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ id, files }: { id: string; files: FileList }) => {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append('images', f));
      return api.post(`/marbles/${id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marbles-admin'] }),
    onSettled: () => setUploadingId(null),
  });

  function openCreate() {
    setEditing(null);
    reset({ name: '', description: '', origin: '', color: '', type: 'MARBLE', pricePerM2: '', thickness: '', isAvailable: true, isPublic: true });
    setShowForm(true);
  }

  function openEdit(marble: Marble) {
    setEditing(marble);
    reset({
      name: marble.name,
      description: marble.description ?? '',
      origin: marble.origin ?? '',
      color: marble.color ?? '',
      type: marble.type,
      pricePerM2: marble.pricePerM2 != null ? String(marble.pricePerM2) : '',
      thickness: marble.thickness != null ? String(marble.thickness) : '',
      isAvailable: marble.isAvailable,
      isPublic: marble.isPublic,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-marble-dark">Catálogo de Mármores</h1>
        <Button onClick={openCreate}>
          <Plus size={16} /> Novo mármore
        </Button>
      </div>

      <Input
        placeholder="Buscar por nome..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <DataTable
        data={data?.marbles ?? []}
        isLoading={isLoading}
        keyExtractor={(m) => m.id}
        columns={[
          {
            header: 'Imagem',
            cell: (m) =>
              m.imageUrls[0] ? (
                <Image src={m.imageUrls[0]} alt={m.name} width={48} height={48} className="rounded object-cover h-12 w-12" />
              ) : (
                <div className="h-12 w-12 rounded bg-gray-100" />
              ),
          },
          { header: 'Nome', cell: (m) => m.name },
          { header: 'Tipo', cell: (m) => MARBLE_TYPE_LABELS[m.type as MarbleType] },
          { header: 'Origem', cell: (m) => m.origin ?? '-' },
          { header: 'Preço/m²', cell: (m) => (m.pricePerM2 ? formatCurrency(m.pricePerM2) : 'Sob consulta') },
          {
            header: 'Status',
            cell: (m) => (
              <div className="flex gap-1">
                <Badge variant={m.isAvailable ? 'success' : 'danger'}>{m.isAvailable ? 'Disponível' : 'Indisponível'}</Badge>
                {m.isPublic && <Badge variant="info">Público</Badge>}
              </div>
            ),
          },
          {
            header: '',
            className: 'text-right',
            cell: (m) => (
              <div className="flex justify-end gap-2 items-center">
                <label className="text-gray-500 hover:text-marble-gold cursor-pointer">
                  <Upload size={16} />
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        setUploadingId(m.id);
                        uploadMutation.mutate({ id: m.id, files: e.target.files });
                      }
                    }}
                  />
                </label>
                <button onClick={() => openEdit(m)} className="text-gray-500 hover:text-marble-gold cursor-pointer">
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => confirm('Remover este mármore?') && deleteMutation.mutate(m.id)}
                  className="text-gray-500 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
                {uploadingId === m.id && <span className="text-xs text-gray-400">enviando...</span>}
              </div>
            ),
          },
        ]}
      />

      <Dialog open={showForm} onClose={closeForm}>
        <h2 className="text-lg font-semibold text-marble-dark mb-4">
          {editing ? 'Editar mármore' : 'Novo mármore'}
        </h2>
        <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="space-y-3">
          <div>
            <Label>Nome *</Label>
            <Input {...register('name')} />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea rows={2} {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Origem</Label>
              <Input {...register('origin')} placeholder="Ex: Brasil - MG" />
            </div>
            <div>
              <Label>Cor</Label>
              <Input {...register('color')} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select {...register('type')}>
                {Object.entries(MARBLE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Preço/m² (R$)</Label>
              <Input type="number" step="0.01" {...register('pricePerM2')} placeholder="Sob consulta" />
            </div>
            <div>
              <Label>Espessura (mm)</Label>
              <Input type="number" step="1" {...register('thickness')} />
            </div>
          </div>
          <div className="flex gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('isAvailable')} /> Disponível
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('isPublic')} /> Visível no e-commerce
            </label>
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
