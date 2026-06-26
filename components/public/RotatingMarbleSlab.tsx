'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

const STEPS = [
  { title: 'Selecionadas com critério', description: 'Cada chapa é escolhida a olho nu por nossa equipe, garantindo veios e tonalidade uniformes.' },
  { title: 'Cortadas com precisão', description: 'Equipamentos de alta tecnologia garantem medidas exatas para o seu projeto.' },
  { title: 'Acabamento impecável', description: 'Polimento e acabamento que realçam o brilho natural de cada mármore.' },
];

export function RotatingMarbleSlab() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cleanup: (() => void) | undefined;

    (async () => {
      const gsap = (await import('gsap')).default;
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      if (!wrapperRef.current || !cardRef.current) return;

      const trigger = ScrollTrigger.create({
        trigger: wrapperRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          const progress = self.progress;
          gsap.set(cardRef.current, {
            rotateY: -30 + progress * 60,
            rotateX: 6 - progress * 4,
            scale: 0.92 + Math.sin(progress * Math.PI) * 0.12,
          });

          stepRefs.current.forEach((el, i) => {
            if (!el) return;
            const stepStart = i / STEPS.length;
            const stepEnd = (i + 1) / STEPS.length;
            const visible = progress >= stepStart && progress < stepEnd;
            gsap.to(el, { opacity: visible ? 1 : 0, y: visible ? 0 : 16, duration: 0.3 });
          });
        },
      });

      cleanup = () => trigger.kill();
    })();

    return () => cleanup?.();
  }, []);

  return (
    <div ref={wrapperRef} className="relative h-[250vh]">
      <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center px-6 sm:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl w-full">
          <div style={{ perspective: '1200px' }} className="flex justify-center">
            <div
              ref={cardRef}
              className="relative w-64 h-80 sm:w-80 sm:h-96 rounded-2xl overflow-hidden shadow-2xl"
              style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
            >
              <Image
                src="/hero-marble-slab.jpg"
                alt="Chapa de mármore Quartzito Taj Mahal"
                fill
                className="object-cover"
                sizes="320px"
              />
              <div className="absolute inset-0 ring-1 ring-white/20 rounded-2xl" />
            </div>
          </div>

          <div className="relative h-40">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                className="absolute inset-0 opacity-0 translate-y-4"
              >
                <p className="text-marble-gold text-sm uppercase tracking-widest mb-2">
                  Passo {i + 1} de {STEPS.length}
                </p>
                <h3 className="text-2xl sm:text-3xl font-bold mb-3">{step.title}</h3>
                <p className="text-white/60">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
