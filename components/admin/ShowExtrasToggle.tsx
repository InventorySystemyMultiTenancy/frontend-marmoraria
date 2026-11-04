'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Check "Mostrar custo adicional": decide se os extras dos itens aparecem no
// PDF e no acompanhamento do pedido pro cliente. Desmarcado, o cliente só vê o
// total — que continua somando o custo adicional.
export function ShowExtrasToggle({
  quoteId,
  checked,
  disabled,
  onSaved,
}: {
  quoteId: string;
  checked: boolean;
  disabled?: boolean;
  onSaved: () => void;
}) {
  const mutation = useMutation({
    mutationFn: async (showExtras: boolean) => api.patch(`/quotes/${quoteId}/show-extras`, { showExtras }),
    onSuccess: onSaved,
  });

  return (
    <div className="text-sm">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled || mutation.isPending}
          onChange={(e) => mutation.mutate(e.target.checked)}
        />
        Mostrar custo adicional no PDF e no acompanhamento do cliente
      </label>
      <p className="text-xs text-gray-400 mt-0.5 ml-5">
        Desmarcado, o cliente vê só o valor total (o custo adicional continua somado).
      </p>
      {mutation.isError && <p className="text-xs text-red-600 mt-1 ml-5">Não foi possível salvar.</p>}
    </div>
  );
}
