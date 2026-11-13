import * as React from 'react';
import { cn } from '@/lib/utils';

// Cabeçalho padrão das abas do admin: ícone em "pedra", rótulo da seção,
// título forte, descrição discreta e as ações à direita (empilham no celular).
export function PageHeader({
  title,
  description,
  eyebrow,
  icon: Icon,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: string;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('ds-rise flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="flex items-center gap-4 min-w-0">
        {Icon && (
          <span className="ds-icon-tile h-12 w-12 hidden sm:inline-flex">
            <Icon size={22} strokeWidth={1.75} />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="ds-eyebrow mb-1">{eyebrow}</p>}
          <h1 className="ds-title">{title}</h1>
          {description && <p className="mt-1.5 text-sm text-marble-gray max-w-2xl">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
