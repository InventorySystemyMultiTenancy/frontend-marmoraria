import * as React from 'react';
import { cn } from '@/lib/utils';

// Card do design system: superfície clara com borda fina, sombra em camadas e
// revelação ao rolar (animação dirigida pela rolagem, só CSS). `interactive`
// adiciona a elevação no hover para cards clicáveis.
export const Card = ({
  className,
  interactive,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) => (
  <div className={cn('ds-card ds-reveal', interactive && 'ds-lift', className)} {...props} />
);

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('px-5 pt-5 pb-4 border-b border-[var(--line)]', className)} {...props} />
);

export const CardTitle = ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn('flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-ink', className)}
    {...props}
  >
    <span aria-hidden className="h-4 w-1 rounded-full bg-gradient-to-b from-gold-light to-gold-deep shrink-0" />
    {children}
  </h3>
);

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-5', className)} {...props} />
);
