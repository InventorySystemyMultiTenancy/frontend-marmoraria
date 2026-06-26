import Link from 'next/link';
import { HeroSection } from '@/components/public/HeroSection';
import { ScrollScrubMarbleVideo } from '@/components/public/ScrollScrubMarbleVideo';
import { ScrollingMarbles } from '@/components/public/ScrollingMarbles';
import { HowItWorks } from '@/components/public/HowItWorks';
import { Marble } from '@/types';

async function getFeaturedMarbles(): Promise<Marble[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/marbles/public?limit=8`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.marbles ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const marbles = await getFeaturedMarbles();

  return (
    <>
      <HeroSection marbles={marbles} />

      <ScrollScrubMarbleVideo />

      <section className="py-16">
        <h2 className="text-center text-white/50 text-sm uppercase tracking-widest mb-6">Nosso catálogo</h2>
        <ScrollingMarbles marbles={marbles} />
      </section>

      <HowItWorks />

      <section className="px-6 sm:px-10 py-24 text-center">
        <div className="glass-panel max-w-2xl mx-auto px-10 py-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Pronto para transformar seu projeto?</h2>
          <p className="text-white/60 mb-8">Monte seu orçamento agora mesmo, sem compromisso.</p>
          <Link href="/orcamento">
            <span className="inline-flex items-center px-8 py-4 rounded-full bg-marble-gold text-marble-dark font-semibold hover:scale-105 transition-transform cursor-pointer">
              Começar agora
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}
