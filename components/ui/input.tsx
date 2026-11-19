import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-xl border border-[var(--line)] bg-white/90 px-3 py-2 text-sm text-ink shadow-[inset_0_1px_2px_rgba(26,22,20,0.04)] transition-[border-color,box-shadow] duration-200 hover:border-marble-gold/40 placeholder:text-gray-400 focus:outline-none focus:border-marble-gold focus:ring-4 focus:ring-marble-gold/15 disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn('text-[13px] font-medium text-ink/80 mb-1.5 block', className)} {...props} />
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex w-full rounded-xl border border-[var(--line)] bg-white/90 px-3 py-2 text-sm text-ink shadow-[inset_0_1px_2px_rgba(26,22,20,0.04)] transition-[border-color,box-shadow] duration-200 hover:border-marble-gold/40 placeholder:text-gray-400 focus:outline-none focus:border-marble-gold focus:ring-4 focus:ring-marble-gold/15 disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

// Seta desenhada (em vez da nativa) para o campo sempre parecer um seletor.
const SELECT_CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a6834b' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, style, ...props }, ref) => (
    <select
      ref={ref}
      // Fundo e texto opacos + esquema claro forçado: a lista de opções nativa
      // não pode herdar o modo escuro do sistema/navegador (texto branco em fundo branco).
      style={{ colorScheme: 'light', backgroundImage: SELECT_CHEVRON, ...style }}
      className={cn(
        'flex h-10 w-full cursor-pointer appearance-none rounded-xl border border-gray-300 bg-white bg-[length:16px_16px] bg-[position:right_0.75rem_center] bg-no-repeat py-2 pl-3 pr-9 text-sm text-ink shadow-[inset_0_1px_2px_rgba(26,22,20,0.04)] transition-[border-color,box-shadow] duration-200 hover:border-marble-gold/60 focus:outline-none focus:border-marble-gold focus:ring-4 focus:ring-marble-gold/15 disabled:opacity-50 [&>option]:bg-white [&>option]:text-ink',
        className
      )}
      {...props}
    />
  )
);
Select.displayName = 'Select';
