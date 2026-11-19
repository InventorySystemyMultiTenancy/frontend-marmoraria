'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

// Exclusão definitiva de orçamento ou pedido, com confirmação. O backend apaga
// junto o que depende do registro (pedido, etapas e receita lançada).
export function DeleteRecordButton({
  endpoint,
  redirectTo,
  title,
  description,
}: {
  endpoint: string;
  redirectTo: string;
  title: string;
  description: React.ReactNode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => api.delete(endpoint),
    onSuccess: () => {
      // Listas, painel e financeiro mudam com a exclusão.
      queryClient.invalidateQueries();
      setOpen(false);
      router.replace(redirectTo);
    },
    onError: (err: unknown) =>
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Não foi possível excluir. Tente novamente.'
      ),
  });

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="text-red-600 hover:border-red-300 hover:bg-red-50"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <Trash2 size={14} /> Excluir
      </Button>
      <Dialog open={open} onClose={() => !mutation.isPending && setOpen(false)}>
        <h2 className="text-lg font-semibold text-ink mb-2 pr-8">{title}</h2>
        <div className="text-sm text-gray-600 space-y-2">{description}</div>
        <p className="mt-3 text-sm font-medium text-red-600">Esta ação é definitiva e não pode ser desfeita.</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            <Trash2 size={14} /> {mutation.isPending ? 'Excluindo...' : 'Excluir definitivamente'}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
