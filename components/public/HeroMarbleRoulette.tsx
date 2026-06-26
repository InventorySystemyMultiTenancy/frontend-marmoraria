'use client';

import Image from 'next/image';
import { Marble } from '@/types';

function Row({
  marbles,
  reverse,
  durationS,
  opacityClass,
}: {
  marbles: Marble[];
  reverse?: boolean;
  durationS: number;
  opacityClass: string;
}) {
  if (!marbles.length) return null;
  const track = [...marbles, ...marbles, ...marbles];

  return (
    <div className={`overflow-hidden ${opacityClass}`}>
      <div
        className="flex w-max"
        style={{
          animation: `marble-roulette ${durationS}s linear infinite`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        {track.map((marble, i) => (
          <div key={`${marble.id}-${i}`} className="relative w-48 h-64 sm:w-60 sm:h-80 mx-4 shrink-0 rounded-xl overflow-hidden">
            {marble.imageUrls[0] ? (
              <Image src={marble.imageUrls[0]} alt="" fill className="object-cover" sizes="240px" />
            ) : (
              <div className="w-full h-full bg-marble-gray" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroMarbleRoulette({ marbles }: { marbles: Marble[] }) {
  if (!marbles.length) return null;

  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-6 opacity-40 blur-[1px]">
      <Row marbles={marbles} durationS={38} opacityClass="opacity-70" />
      <Row marbles={marbles} reverse durationS={48} opacityClass="opacity-40" />
    </div>
  );
}
