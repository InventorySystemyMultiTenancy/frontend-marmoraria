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

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-xl border border-[var(--line)] bg-white/90 px-3 py-2 text-sm text-ink shadow-[inset_0_1px_2px_rgba(26,22,20,0.04)] transition-[border-color,box-shadow] duration-200 hover:border-marble-gold/40 focus:outline-none focus:border-marble-gold focus:ring-4 focus:ring-marble-gold/15 disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
Select.displayName = 'Select';
