'use client';

import { CSSProperties, PointerEvent, useCallback, useRef } from 'react';

// Pré-visualização 3D ("holograma") de uma peça do pedido: uma placa com as
// proporções reais (comprimento × profundidade × espessura) e a textura do
// material. Feita só com CSS 3D (preserve-3d) — sem three.js/WebGL, sem canvas
// e sem JS extra pra baixar: o navegador compõe na GPU e cada peça custa
// praticamente nada, mesmo com muitas na tela.
//
// Interação: com o mouse, a peça gira acompanhando o cursor enquanto ele está
// em cima; no toque, gira arrastando. Ao sair, volta suave à pose inicial. O
// transform é escrito direto no DOM (sem re-render do React) pra ficar fluido.

const BASE_RX = -28; // inclinação inicial: mostra o tampo e duas laterais
const BASE_RY = -32;

// Miniatura leve no Cloudinary (≈256px, formato/qualidade automáticos) em vez
// da foto original — a textura ocupa poucos pixels na tela.
function thumbUrl(url?: string | null) {
  if (!url) return null;
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/c_fill,w_256,h_256,q_auto,f_auto/');
  }
  return url;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function Slab3D({
  imageUrl,
  widthCm,
  heightCm,
  thicknessMm,
  size = 64,
  label,
}: {
  imageUrl?: string | null;
  widthCm: number;
  heightCm: number;
  thicknessMm: number;
  size?: number;
  label?: string;
}) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Proporções reais, cabendo em ~78% do quadro. A espessura é exagerada (com
  // mínimo/máximo) — 2cm numa pia de 2m ficaria invisível.
  const w = Math.max(widthCm, 1);
  const d = Math.max(heightCm, 1);
  const scale = (size * 0.78) / Math.max(w, d);
  const W = Math.max(w * scale, size * 0.2);
  const D = Math.max(d * scale, size * 0.2);
  const T = clamp((thicknessMm / 10) * scale * 2.5, 3, size * 0.11);

  const tex = thumbUrl(imageUrl);
  const texture = tex
    ? `url("${tex}") center / cover`
    : // Sem foto: um "mármore" genérico com veios suaves.
      'repeating-linear-gradient(125deg, rgba(120,110,100,.18) 0 1px, transparent 1px 9px), linear-gradient(135deg, #efebe4, #cfc7ba)';

  const setPose = useCallback((rx: number, ry: number, ms: number) => {
    const el = sceneRef.current;
    if (!el) return;
    el.style.transition = `transform ${ms}ms cubic-bezier(.2,.8,.2,1)`;
    el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
  }, []);

  const reset = useCallback(() => {
    drag.current = null;
    setPose(BASE_RX, BASE_RY, 700);
  }, [setPose]);

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (drag.current) {
      // Arrastar (toque ou mouse pressionado): giro livre.
      const ry = drag.current.ry + (e.clientX - drag.current.x) * 0.9;
      const rx = clamp(drag.current.rx - (e.clientY - drag.current.y) * 0.9, -88, 88);
      setPose(rx, ry, 0);
      return;
    }
    if (e.pointerType !== 'mouse') return;
    // Passar o mouse: a posição do cursor vira o ângulo (cruzar a peça = ~1 volta).
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setPose(clamp(BASE_RX - y * 140, -88, 88), BASE_RY + x * 340, 120);
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    const m = sceneRef.current?.style.transform.match(/rotateX\(([-\d.]+)deg\) rotateY\(([-\d.]+)deg\)/);
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      rx: m ? Number(m[1]) : BASE_RX,
      ry: m ? Number(m[2]) : BASE_RY,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    drag.current = null;
    // No toque não existe "sair de cima": volta sozinho depois de um tempo.
    if (e.pointerType !== 'mouse') resetTimer.current = setTimeout(reset, 1400);
  }

  const face = (fw: number, fh: number, transform: string, shade: number, extra?: CSSProperties): CSSProperties => ({
    position: 'absolute',
    left: -fw / 2,
    top: -fh / 2,
    width: fw,
    height: fh,
    transform,
    background: `linear-gradient(rgba(0,0,0,${shade}), rgba(0,0,0,${shade})), ${texture}`,
    backfaceVisibility: 'hidden',
    ...extra,
  });

  return (
    <div
      className="slab3d"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Pré-visualização 3D${label ? ` de ${label}` : ''}: ${widthCm} × ${heightCm} cm, ${thicknessMm} mm`}
      title="Passe o mouse (ou arraste) para girar"
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={reset}
      onPointerLeave={(e) => e.pointerType === 'mouse' && reset()}
    >
      <div className="slab3d-shadow" />
      <div className="slab3d-float">
        <div
          ref={sceneRef}
          className="slab3d-scene"
          style={{ transform: `rotateX(${BASE_RX}deg) rotateY(${BASE_RY}deg)` }}
        >
          {/* tampo, fundo, frente, trás, direita, esquerda */}
          <div className="slab3d-face slab3d-top" style={face(W, D, `rotateX(90deg) translateZ(${T / 2}px)`, 0)} />
          <div className="slab3d-face" style={face(W, D, `rotateX(-90deg) translateZ(${T / 2}px)`, 0.55)} />
          <div className="slab3d-face" style={face(W, T, `translateZ(${D / 2}px)`, 0.28)} />
          <div className="slab3d-face" style={face(W, T, `rotateY(180deg) translateZ(${D / 2}px)`, 0.28)} />
          <div className="slab3d-face" style={face(D, T, `rotateY(90deg) translateZ(${W / 2}px)`, 0.4)} />
          <div className="slab3d-face" style={face(D, T, `rotateY(-90deg) translateZ(${W / 2}px)`, 0.4)} />
        </div>
      </div>
    </div>
  );
}
