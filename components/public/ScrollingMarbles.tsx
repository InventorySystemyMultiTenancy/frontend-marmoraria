'use client';

import Image from 'next/image';
import { Marble } from '@/types';
import { formatCurrency } from '@/lib/utils';

export function ScrollingMarbles({ marbles }: { marbles: Marble[] }) {
  if (!marbles.length) return null;
  const track = [...marbles, ...marbles];

  return (
    <div className="overflow-hidden py-4">
      <div className="marble-marquee">
        {track.map((marble, i) => (
          <div
            key={`${marble.id}-${i}`}
            className="group relative w-64 h-80 mx-3 shrink-0 rounded-2xl overflow-hidden border border-white/10"
          >
            {marble.imageUrls[0] ? (
              <Image
                src={marble.imageUrls[0]}
                alt={marble.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                sizes="256px"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-marble-gray to-marble-dark" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="font-semibold text-white">{marble.name}</p>
              <p className="text-sm text-marble-gold">
                {marble.pricePerM2 ? `${formatCurrency(marble.pricePerM2)}/m²` : 'Sob consulta'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
