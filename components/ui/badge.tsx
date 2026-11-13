import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', {
  variants: {
    variant: {
      default: 'bg-gray-100/80 text-gray-700 ring-gray-500/15',
      success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
      warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
      danger: 'bg-red-50 text-red-700 ring-red-600/20',
      info: 'bg-sky-50 text-sky-700 ring-sky-600/20',
      gold: 'bg-marble-gold/12 text-gold-deep ring-marble-gold/30',
    },
  },
  defaultVariants: { variant: 'default' },
});

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
