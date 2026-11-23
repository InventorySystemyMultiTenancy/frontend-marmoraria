import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { QuoteForm } from '@/components/public/QuoteForm';
import { getSiteSession } from '@/lib/session';

export default async function OrcamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Orçamento só com login (cliente cadastrado ou admin/funcionário). Quem já
  // entrou no painel admin passa direto, sem logar de novo.
  const session = await getSiteSession();
  if (!session) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
      if (typeof value === 'string') params.set(key, value);
    }
    const query = params.toString();
    redirect(`/entrar?next=${encodeURIComponent(`/orcamento${query ? `?${query}` : ''}`)}`);
  }

  return (
    <div className="px-6 sm:px-10 py-28">
      <Suspense fallback={<p className="text-white/40 text-center">Carregando...</p>}>
        <QuoteForm session={session} />
      </Suspense>
    </div>
  );
}
