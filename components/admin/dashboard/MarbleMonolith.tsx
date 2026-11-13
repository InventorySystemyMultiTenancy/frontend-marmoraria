'use client';

import { CSSProperties, useEffect, useRef } from 'react';

// Elemento 3D do hero do dashboard: três placas de mármore (negro, branco e
// calacatta dourado) em "vista explodida", flutuando em camadas. Só CSS 3D:
// nada de WebGL/three.js, texturas de ~10 KB, composição na GPU.
//
// - Mouse sobre o hero: o conjunto inclina acompanhando o cursor.
// - Rolagem: leve parallax (sobe e gira um pouco conforme a página desce).
// O transform é escrito direto no DOM, sem re-render do React.

const SLABS = [
  { tex: '/textures/marble-noir.webp', w: 150, d: 104, t: 12, y: 44, layer: 0 },
  { tex: '/textures/marble-white.webp', w: 138, d: 96, t: 11, y: 4, layer: 1 },
  { tex: '/textures/marble-gold.webp', w: 124, d: 86, t: 10, y: -36, layer: 2 },
];

const BASE = { rx: -26, ry: -38 };

function face(w: number, h: number, transform: string, tex: string, shade: number): CSSProperties {
  return {
    left: -w / 2,
    top: -h / 2,
    width: w,
    height: h,
    transform,
    background: `linear-gradient(rgba(0,0,0,${shade}), rgba(0,0,0,${shade})), url("${tex}") center / cover`,
  };
}

export function MarbleMonolith({
  hostRef,
  className,
}: {
  // Elemento que recebe o mouse (o hero inteiro, não só a ilustração)
  hostRef: React.RefObject<HTMLElement | null>;
  className?: string;
}) {
  const rigRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const rig = rigRef.current;
    if (!host || !rig) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const scroller = host.closest('main');
    let tilt = { x: 0, y: 0 };
    let scroll = 0;
    let raf = 0;

    const apply = () => {
      raf = 0;
      const rx = BASE.rx - tilt.y * 14 + scroll * 0.02;
      const ry = BASE.ry + tilt.x * 26 + scroll * 0.05;
      rig.style.transform = `translateY(${-scroll * 0.12}px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = host.getBoundingClientRect();
      tilt = { x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 };
      queue();
    };
    const onLeave = () => {
      tilt = { x: 0, y: 0 };
      queue();
    };
    const onScroll = () => {
      scroll = Math.min(scroller?.scrollTop ?? 0, 400);
      queue();
    };

    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    scroller?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      scroller?.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [hostRef]);

  return (
    <div className={`monolith ${className ?? ''}`} aria-hidden>
      <div className="monolith-glow" />
      <span className="monolith-spark" style={{ left: '18%', top: '30%' }} />
      <span className="monolith-spark" style={{ left: '82%', top: '22%', animationDelay: '-1.8s' }} />
      <span className="monolith-spark" style={{ left: '70%', top: '78%', animationDelay: '-3.2s' }} />
      <div
        ref={rigRef}
        className="monolith-rig"
        style={{ transform: `rotateX(${BASE.rx}deg) rotateY(${BASE.ry}deg)` }}
      >
        {SLABS.map((s) => (
          <div
            key={s.tex}
            className="monolith-slab monolith-float"
            data-layer={s.layer}
            style={{ transform: `translateY(${s.y}px)` }}
          >
            {/* tampo, fundo, frente, trás, direita, esquerda */}
            <div className="monolith-face monolith-top" style={face(s.w, s.d, `rotateX(90deg) translateZ(${s.t / 2}px)`, s.tex, 0)} />
            <div className="monolith-face" style={face(s.w, s.d, `rotateX(-90deg) translateZ(${s.t / 2}px)`, s.tex, 0.6)} />
            <div className="monolith-face" style={face(s.w, s.t, `translateZ(${s.d / 2}px)`, s.tex, 0.25)} />
            <div className="monolith-face" style={face(s.w, s.t, `rotateY(180deg) translateZ(${s.d / 2}px)`, s.tex, 0.25)} />
            <div className="monolith-face" style={face(s.d, s.t, `rotateY(90deg) translateZ(${s.w / 2}px)`, s.tex, 0.42)} />
            <div className="monolith-face" style={face(s.d, s.t, `rotateY(-90deg) translateZ(${s.w / 2}px)`, s.tex, 0.42)} />
          </div>
        ))}
      </div>
    </div>
  );
}
