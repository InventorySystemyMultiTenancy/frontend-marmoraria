'use client';

import * as React from 'react';
import { CountUp } from '@/components/ui/CountUp';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'gold' | 'positive' | 'negative';

const TONE_VALUE: Record<Tone, string> = {
  default: 'text-ink',
  gold: 'text-gold-deep',
  positive: 'text-emerald-700',
  negative: 'text-red-600',
};

const TONE_DOT: Record<Tone, string> = {
  default: 'bg-ink/30',
  gold: 'bg-marble-gold',
  positive: 'bg-emerald-500',
  negative: 'bg-red-500',
};

// Indicador numérico padrão das abas (estoque, financeiro...). Mostra só o
// valor que veio da API, com contagem animada.
export function StatCard({
  label,
  value,
  format,
  icon: Icon,
  tone = 'default',
  hint,
  index = 0,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  icon?: React.ElementType;
  tone?: Tone;
  hint?: React.ReactNode;
  index?: number;
}) {
  return (
    <div className="ds-card ds-lift ds-rise group p-5" style={{ '--i': index } as React.CSSProperties}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] text-marble-gray">
            <span className={cn('h-1.5 w-1.5 rounded-full', TONE_DOT[tone])} />
            {label}
          </p>
          <p className={cn('mt-2 text-2xl font-semibold tracking-tight', TONE_VALUE[tone])}>
            <CountUp value={value} format={format} />
          </p>
          {hint && <p className="mt-1 text-xs text-marble-gray">{hint}</p>}
        </div>
        {Icon && (
          <span className="ds-icon-tile h-10 w-10">
            <Icon size={18} strokeWidth={1.75} />
          </span>
        )}
      </div>
    </div>
  );
}
