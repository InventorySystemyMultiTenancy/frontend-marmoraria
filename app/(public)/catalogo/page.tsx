'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { publicApi } from '@/lib/api';
import { Marble, MARBLE_TYPE_LABELS, MarbleType } from '@/types';
import { formatCurrency } from '@/lib/utils';

const TYPE_FILTERS: ('' | MarbleType)[] = ['', 'MARBLE', 'GRANITE', 'QUARTZITE', 'PORCELAIN', 'LIMESTONE', 'TRAVERTINE'];

export default function CatalogoPage() {
  const [type, setType] = useState<'' | MarbleType>('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['public-marbles', type, search],
    queryFn: async () =>
      (await publicApi.get('/api/marbles/public', { params: { type: type || undefined, search: search || undefined, limit: 60 } }))
        .data as { marbles: Marble[] },
  });

  return (
    <div className="px-6 sm:px-10 py-28 max-w-6xl mx-auto">
      <h1 className="text-3xl sm:text-4xl font-bold mb-2">Catálogo de Mármores</h1>
      <p className="text-white/60 mb-8">Explore nossa seleção de mármores, granitos e quartzitos.</p>

      <div className="flex flex-wrap gap-2 mb-8">
        {TYPE_FILTERS.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors cursor-pointer ${
              type === t ? 'bg-marble-gold text-marble-dark' : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            {t === '' ? 'Todos' : MARBLE_TYPE_LABELS[t]}
          </button>
        ))}
        <input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-marble-gold"
        />
      </div>

      {isLoading ? (
        <p className="text-white/40">Carregando...</p>
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {data?.marbles.map((marble, i) => (
              <motion.div
                key={marble.id}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.04, duration: 0.4 }}
                className="group relative rounded-2xl overflow-hidden border border-white/10 h-72"
              >
                {marble.imageUrls[0] ? (
                  <Image
                    src={marble.imageUrls[0]}
                    alt={marble.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-marble-gray to-marble-dark" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute top-3 right-3">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      marble.pricePerM2 ? 'bg-marble-gold text-marble-dark' : 'bg-white/15 text-white'
                    }`}
                  >
                    {marble.pricePerM2 ? 'Preço disponível' : 'Sob consulta'}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="text-xs text-marble-gold uppercase tracking-wide mb-1">
                    {MARBLE_TYPE_LABELS[marble.type]} {marble.origin ? `· ${marble.origin}` : ''}
                  </p>
                  <h3 className="font-semibold text-lg">{marble.name}</h3>
                  {marble.pricePerM2 && <p className="text-sm text-white/70 mt-1">{formatCurrency(marble.pricePerM2)}/m²</p>}
                  <Link href={`/orcamento?marbleId=${marble.id}`}>
                    <span className="inline-block mt-3 text-sm text-marble-gold hover:underline cursor-pointer">
                      Usar no meu projeto →
                    </span>
                  </Link>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {!isLoading && data?.marbles.length === 0 && (
        <p className="text-white/40 text-center py-20">Nenhum mármore encontrado para esse filtro.</p>
      )}
    </div>
  );
}
