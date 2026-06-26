'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

export function FloatingMarbleSlab() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [activeFace, setActiveFace] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let tween: { kill: () => void } | undefined;

    (async () => {
      const gsap = (await import('gsap')).default;
      if (!cardRef.current) return;

      tween = gsap.to(cardRef.current, {
        rotateY: 360,
        duration: 14,
        ease: 'none',
        repeat: -1,
        onUpdate: function () {
          const progress = this.progress();
          setActiveFace(progress > 0.5 ? 1 : 0);
        },
      });
    })();

    return () => tween?.kill();
  }, []);

  return (
    <div style={{ perspective: '1400px' }} className="flex justify-center">
      <div
        ref={cardRef}
        className="relative w-56 h-40 sm:w-72 sm:h-52"
        style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
      >
        <Image
          src="/marmoreanimation1.png"
          alt="Chapa de mármore claro"
          fill
          priority
          className="object-contain drop-shadow-2xl transition-opacity duration-500"
          style={{ opacity: activeFace === 0 ? 1 : 0 }}
          sizes="288px"
        />
        <Image
          src="/marmoreanimation2.png"
          alt="Chapa de mármore escuro"
          fill
          className="object-contain drop-shadow-2xl transition-opacity duration-500"
          style={{ opacity: activeFace === 1 ? 1 : 0 }}
          sizes="288px"
        />
      </div>
    </div>
  );
}
