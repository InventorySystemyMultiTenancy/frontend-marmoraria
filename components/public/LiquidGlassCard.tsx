'use client';

import { cn } from '@/lib/utils';

export function LiquidGlassCard({
  className,
  children,
  as: Component = 'div',
}: {
  className?: string;
  children: React.ReactNode;
  as?: React.ElementType;
}) {
  return (
    <Component className={cn('glass-panel transition-transform duration-300 hover:scale-[1.02]', className)}>
      {children}
    </Component>
  );
}
