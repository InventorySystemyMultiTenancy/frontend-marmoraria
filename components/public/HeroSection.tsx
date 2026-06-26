'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useIsMobile } from '@/lib/useIsMobile';

const TITLE_WORDS = ['Mármores', 'e', 'Granitos', 'de', 'Excelência'];

interface Chapter {
  kind: 'title' | 'text';
  eyebrow?: string;
  title: string;
  body?: string;
  cta?: boolean;
}

const CHAPTERS: Chapter[] = [
  {
    kind: 'title',
    title: 'Mármores e Granitos de Excelência',
    body: 'Peças exclusivas para cozinhas, banheiros e fachadas. Monte seu orçamento em minutos.',
    cta: true,
  },
  {
    kind: 'text',
    eyebrow: 'Desde sempre',
    title: 'Mais de 20 anos de experiência',
    body: 'Há mais de duas décadas transformando blocos de pedra em obras de arte funcionais, com a tradição de quem entende do assunto.',
  },
  {
    kind: 'text',
    eyebrow: 'Tradição familiar',
    title: 'Uma empresa de respeito, feita em família',
    body: 'Da geração que fundou aos profissionais que hoje seguem o legado, mantemos os mesmos valores: honestidade, compromisso e cuidado com cada cliente.',
  },
  {
    kind: 'text',
    eyebrow: 'Nossa equipe',
    title: 'Profissionais respeitados e competentes',
    body: 'Marmoristas experientes, reconhecidos pela precisão no corte, no acabamento e na entrega de cada projeto — do orçamento à instalação final.',
  },
  {
    kind: 'text',
    eyebrow: 'Nosso propósito',
    title: 'Construímos sonhos, não apenas ambientes',
    body: 'Cada bancada, cada piso, cada fachada carrega a confiança de quem escolheu a Marmoraria Pedras Pedroza para fazer parte da sua história.',
    cta: true,
  },
];

export function HeroSection() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chapterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollHintRef = useRef<HTMLDivElement>(null);
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

          chapterRefs.current.forEach((el, i) => {
            if (!el) return;
            const start = i / CHAPTERS.length;
            const end = (i + 1) / CHAPTERS.length;
            const visible = progress >= start && progress < end;
            gsap.to(el, { opacity: visible ? 1 : 0, y: visible ? 0 : 16, duration: 0.3 });
          });

          if (scrollHintRef.current) {
            gsap.to(scrollHintRef.current, { opacity: progress < 0.05 ? 1 : 0, duration: 0.3 });
          }
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
    <div ref={wrapperRef} className="relative h-[500vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        <video
          key={videoSrc}
          ref={videoRef}
          src={videoSrc}
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/40 to-black/70" />

        <div className="relative z-10 h-full flex items-center justify-center px-6">
          <div className="relative max-w-3xl w-full text-center h-72">
            {CHAPTERS.map((chapter, ci) => (
              <div
                key={chapter.title}
                ref={(el) => {
                  chapterRefs.current[ci] = el;
                }}
                className="absolute inset-0 flex flex-col items-center justify-center opacity-0 translate-y-4"
              >
                {chapter.kind === 'title' ? (
                  <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white">
                    {TITLE_WORDS.map((word, wi) => (
                      <span key={wi} className="inline-block whitespace-nowrap mr-[0.25em]">
                        {word}
                      </span>
                    ))}
                  </h1>
                ) : (
                  <>
                    {chapter.eyebrow && (
                      <p className="text-marble-gold text-sm uppercase tracking-widest mb-3">{chapter.eyebrow}</p>
                    )}
                    <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">{chapter.title}</h2>
                  </>
                )}

                {chapter.body && (
                  <p className="text-white/70 mt-6 text-lg max-w-xl">{chapter.body}</p>
                )}

                {chapter.cta && (
                  <div className="mt-10">
                    <Link href="/orcamento">
                      <span className="glass-panel inline-flex items-center px-8 py-4 text-marble-gold font-semibold hover:scale-105 transition-transform cursor-pointer">
                        Monte seu orçamento
                      </span>
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div ref={scrollHintRef} className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 z-10">
          <ChevronDown size={28} className="animate-bounce" />
        </div>
      </div>
    </div>
  );
}
