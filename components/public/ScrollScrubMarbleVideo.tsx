'use client';

import { useEffect, useRef, useState } from 'react';

const STEPS = [
  { title: 'Selecionadas com critério', description: 'Cada chapa é escolhida a olho nu por nossa equipe, garantindo veios e tonalidade uniformes.' },
  { title: 'Cortadas com precisão', description: 'Equipamentos de alta tecnologia garantem medidas exatas para o seu projeto.' },
  { title: 'Acabamento impecável', description: 'Polimento e acabamento que realçam o brilho natural de cada mármore.' },
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}

export function ScrollScrubMarbleVideo() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isMobile = useIsMobile();
  const videoSrc = isMobile ? '/videoverticalmarmore.mp4' : '/videohorizontalmarmore.mp4';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cleanup: (() => void) | undefined;
    let durationReady = false;
    let pendingProgress = 0;

    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => {
      durationReady = Number.isFinite(video.duration) && video.duration > 0;
      if (durationReady) {
        video.currentTime = pendingProgress * video.duration;
      }
    };
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.pause();

    (async () => {
      const gsap = (await import('gsap')).default;
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      if (!wrapperRef.current) return;

      const trigger = ScrollTrigger.create({
        trigger: wrapperRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          const progress = self.progress;
          pendingProgress = progress;

          if (durationReady && video.duration) {
            video.currentTime = Math.min(progress * video.duration, video.duration - 0.05);
          }

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

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      cleanup?.();
    };
  }, [videoSrc]);

  return (
    <div ref={wrapperRef} className="relative h-[250vh]">
      <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center px-6 sm:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl w-full">
          <div className="flex justify-center">
            <video
              key={videoSrc}
              ref={videoRef}
              src={videoSrc}
              muted
              playsInline
              preload="auto"
              className="w-full max-w-md rounded-2xl shadow-2xl"
            />
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
