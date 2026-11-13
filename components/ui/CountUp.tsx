'use client';

import { useEffect, useRef, useState } from 'react';

// Contagem animada de um número real (nunca inventa valor: só anima do valor
// anterior até o atual). Quando o valor muda depois de carregado — ex.: ao
// clicar em Atualizar —, o número dá um brilho rápido. Respeita
// prefers-reduced-motion mostrando o valor final direto.
export function CountUp({
  value,
  format = (n) => String(Math.round(n)),
  duration = 900,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const [flash, setFlash] = useState(0);
  const from = useRef(0);
  const first = useRef(true);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const start = from.current;
    if (!first.current && start !== value) setFlash((f) => f + 1);
    first.current = false;
    from.current = value;

    if (reduce || start === value) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(start + (value - start) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span key={flash} className={`${flash ? 'ds-flash ' : ''}tabular-nums ${className ?? ''}`}>
      {format(display)}
    </span>
  );
}
