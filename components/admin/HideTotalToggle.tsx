'use client';

import { useMutation } from '@tanstack/react-query';
import { EyeOff, Sigma } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// Botão "Ocultar valor total": quando ligado, o PDF e o acompanhamento do
// pedido mostram só o valor de cada item, sem a soma (subtotal/total).
export function HideTotalButton({
  checked,
  onChange,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('text-sm', className)}>
      <button
        type="button"
        aria-pressed={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'inline-flex items-center gap-2 h-9 px-3 rounded-xl border text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
          checked
            ? 'border-marble-gold bg-marble-gold/15 text-gold-deep'
            : 'border-[var(--line)] bg-white/80 text-ink hover:border-marble-gold/50'
        )}
      >
        {checked ? <EyeOff size={15} /> : <Sigma size={15} />}
        {checked ? 'Valor total oculto' : 'Ocultar valor total'}
      </button>
      <p className="text-xs text-gray-400 mt-1">
        {checked
          ? 'O PDF e o acompanhamento mostram só o valor de cada item, sem a soma. Clique para voltar a mostrar.'
          : 'Ligado, o PDF e o acompanhamento mostram só o valor de cada item, sem o total do orçamento.'}
      </p>
    </div>
  );
}

// Versão para orçamento/pedido já criado: salva na hora.
export function HideTotalToggle({
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
    mutationFn: async (hideTotal: boolean) => api.patch(`/quotes/${quoteId}/hide-total`, { hideTotal }),
    onSuccess: onSaved,
  });

  return (
    <div>
      <HideTotalButton checked={checked} disabled={disabled || mutation.isPending} onChange={(v) => mutation.mutate(v)} />
      {mutation.isError && <p className="text-xs text-red-600 mt-1">Não foi possível salvar.</p>}
    </div>
  );
}
