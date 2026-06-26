'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const TITLE = 'Mármores e Granitos de Excelência';

export function HeroSection() {
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let ctx: { revert: () => void } | undefined;

    (async () => {
      const gsap = (await import('gsap')).default;
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      if (bgRef.current) {
        const animation = gsap.to(bgRef.current, {
          yPercent: 20,
          ease: 'none',
          scrollTrigger: {
            trigger: bgRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        });
        ctx = { revert: () => animation.scrollTrigger?.kill() };
      }
    })();

    return () => ctx?.revert();
  }, []);

  return (
    <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
      <div
        ref={bgRef}
        className="absolute inset-0 bg-gradient-to-br from-marble-dark via-[#2a231f] to-marble-dark"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(201,169,110,0.15), transparent 50%), radial-gradient(circle at 80% 70%, rgba(245,240,232,0.08), transparent 50%)',
        }}
      />

      <div className="relative z-10 text-center px-6 max-w-3xl">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-balance">
          {TITLE.split('').map((char, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02, duration: 0.4 }}
              className={char === ' ' ? 'inline-block w-2' : 'inline-block text-white'}
            >
              {char}
            </motion.span>
          ))}
        </h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="text-white/70 mt-6 text-lg"
        >
          Peças exclusivas para cozinhas, banheiros e fachadas. Monte seu orçamento em minutos.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.5 }}
          className="mt-10"
        >
          <Link href="/orcamento">
            <span className="glass-panel inline-flex items-center px-8 py-4 text-marble-gold font-semibold hover:scale-105 transition-transform cursor-pointer">
              Monte seu orçamento
            </span>
          </Link>
        </motion.div>
      </div>

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 1.6 }}
        className="absolute bottom-8 text-white/40"
      >
        <ChevronDown size={28} />
      </motion.div>
    </section>
  );
}
