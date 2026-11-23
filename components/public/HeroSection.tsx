'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';

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

// Breakpoint igual ao do useIsMobile: abaixo disso usa o vídeo vertical.
const MOBILE_QUERY = '(max-width: 767px)';
const VIDEO_HORIZONTAL = '/videohorizontalmarmore.mp4';
const VIDEO_VERTICAL = '/videoverticalmarmore.mp4';

// Quanto o vídeo "persegue" o scroll por segundo. Maior = responde mais rápido;
// menor = mais suave. O easing evita os saltos quando o scroll anda aos trancos
// (roda do mouse) e deixa a ida e a volta igualmente fluidas.
const FOLLOW_SPEED = 10;

export function HeroSection() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [activeChapter, setActiveChapter] = useState(0);
  const [showHint, setShowHint] = useState(true);

  // Escolhe o vídeo só no navegador (antes renderizava o horizontal e trocava
  // depois no celular, baixando os dois). Enquanto isso o poster já aparece.
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const pick = () => setVideoSrc(mq.matches ? VIDEO_VERTICAL : VIDEO_HORIZONTAL);
    pick();
    mq.addEventListener('change', pick);
    return () => mq.removeEventListener('change', pick);
  }, []);

  // Baixa o vídeo inteiro para a memória (blob): assim cada seek do scroll é
  // local e instantâneo, sem depender de requisições parciais ao servidor — era
  // isso que travava o vídeo enquanto o usuário rolava.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    let cancelled = false;
    let objectUrl: string | null = null;
    setVideoReady(false);

    const onLoaded = () => {
      if (cancelled) return;
      // iOS/Safari não desenham frame de vídeo pausado que nunca rodou: liga e
      // desliga rapidamente para forçar a decodificação do primeiro frame.
      const playPromise = video.play();
      if (playPromise) playPromise.then(() => video.pause()).catch(() => {});
      setVideoReady(true);
    };
    video.addEventListener('loadeddata', onLoaded, { once: true });

    fetch(videoSrc)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        video.src = objectUrl;
        video.load();
      })
      .catch(() => {
        // Sem blob (ex: navegador antigo): usa o arquivo direto mesmo.
        if (cancelled) return;
        video.src = videoSrc;
        video.load();
      });

    return () => {
      cancelled = true;
      video.removeEventListener('loadeddata', onLoaded);
      video.removeAttribute('src');
      video.load();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [videoSrc]);

  // Loop de animação: lê a posição do scroll a cada frame, suaviza o tempo do
  // vídeo em direção ao alvo e só pede um novo seek quando o anterior terminou
  // (pedir seek em cima de seek é o que deixava o vídeo engasgado). Roda apenas
  // enquanto a seção está na tela.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const video = videoRef.current;
    if (!wrapper || !video) return;

    let raf = 0;
    let running = false;
    let lastTs = 0;
    let current = -1;
    let lastSeek = -1;
    let lastChapter = -1;
    let lastHint: boolean | null = null;

    const tick = (ts: number) => {
      const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.1) : 1 / 60;
      lastTs = ts;

      const rect = wrapper.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(Math.max(-rect.top / scrollable, 0), 1) : 0;

      const chapter = Math.min(Math.floor(progress * CHAPTERS.length), CHAPTERS.length - 1);
      if (chapter !== lastChapter) {
        lastChapter = chapter;
        setActiveChapter(chapter);
      }
      const hint = progress < 0.05;
      if (hint !== lastHint) {
        lastHint = hint;
        setShowHint(hint);
      }

      const duration = video.duration;
      if (Number.isFinite(duration) && duration > 0 && video.readyState >= 1) {
        const target = progress * Math.max(duration - 0.05, 0);
        if (current < 0) current = target;
        else current += (target - current) * (1 - Math.exp(-FOLLOW_SPEED * dt));
        if (Math.abs(target - current) < 0.002) current = target;

        // Compara com o último seek pedido (alguns navegadores arredondam o
        // currentTime) e ignora diferenças menores que meio frame (24 fps).
        if (!video.seeking && Math.abs(lastSeek - current) > 0.02) {
          lastSeek = current;
          video.currentTime = current;
        }
      }

      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      lastTs = 0;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    // Vídeo novo (troca de orientação) ou o play/pause do iOS mexeram no tempo:
    // força o próximo frame do loop a reposicionar.
    const resetSeek = () => {
      lastSeek = -1;
    };
    video.addEventListener('loadedmetadata', resetSeek);
    video.addEventListener('pause', resetSeek);

    const observer = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    observer.observe(wrapper);

    return () => {
      observer.disconnect();
      video.removeEventListener('loadedmetadata', resetSeek);
      video.removeEventListener('pause', resetSeek);
      stop();
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative h-[500vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Primeiro frame do vídeo como imagem leve: aparece na hora, antes do JS e
            do vídeo carregarem — nada de tela preta. */}
        <picture>
          <source media={MOBILE_QUERY} srcSet="/hero-poster-vertical.webp" />
          <img
            src="/hero-poster-horizontal.webp"
            alt=""
            fetchPriority="high"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </picture>
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            videoReady ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/40 to-black/70" />
        {/* Encobre a marca d'agua do gerador de IA no canto inferior direito do video, com a logo (mesmo tamanho do navbar) */}
        <div className="absolute bottom-10 right-16 sm:bottom-14 sm:right-32 pointer-events-none">
          <div className="absolute inset-0 -m-8 rounded-full bg-marble-dark/95 blur-lg" />
          <Image
            src="/logo.png"
            alt=""
            width={52}
            height={52}
            className="relative rounded-full ring-2 ring-marble-gold/30 shadow-lg shadow-black/50"
          />
        </div>

        <div className="relative z-10 h-full flex items-center justify-center px-6">
          <div className="relative max-w-3xl w-full text-center h-72">
            {CHAPTERS.map((chapter, ci) => (
              <div
                key={chapter.title}
                aria-hidden={ci !== activeChapter}
                className={`absolute inset-0 flex flex-col items-center justify-center transition-[opacity,transform] duration-500 ease-out ${
                  ci === activeChapter ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-4'
                }`}
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

        <div
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 z-10 transition-opacity duration-300 ${
            showHint ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <ChevronDown size={28} className="animate-bounce" />
        </div>
      </div>
    </div>
  );
}
