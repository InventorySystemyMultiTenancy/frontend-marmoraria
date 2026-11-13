import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'ds-btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-[transform,box-shadow,background-color,color,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marble-gold/60 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-b from-ink-2 to-ink text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_6px_16px_-8px_rgba(21,17,15,0.8)] ring-1 ring-marble-gold/25 hover:ring-marble-gold/60 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_22px_-10px_rgba(21,17,15,0.9)]',
        gold:
          'bg-gradient-to-br from-gold-light via-marble-gold to-gold-deep text-ink font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_20px_-10px_rgba(166,131,75,0.9)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_12px_26px_-10px_rgba(166,131,75,1)]',
        outline:
          'border border-[var(--line)] bg-white/80 text-ink shadow-[0_1px_2px_rgba(26,22,20,0.05)] hover:border-marble-gold/50 hover:bg-white',
        ghost: 'text-ink hover:bg-marble-gold/10',
        destructive:
          'bg-gradient-to-b from-red-500 to-red-600 text-white shadow-[0_6px_16px_-8px_rgba(220,38,38,0.8)] hover:from-red-600 hover:to-red-700',
        link: 'text-gold-deep underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs rounded-lg',
        lg: 'h-12 px-6 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = 'Button';

export { Button, buttonVariants };
