import { Suspense } from 'react';
import { QuoteForm } from '@/components/public/QuoteForm';

export default function OrcamentoPage() {
  return (
    <div className="px-6 sm:px-10 py-28">
      <Suspense fallback={<p className="text-white/40 text-center">Carregando...</p>}>
        <QuoteForm />
      </Suspense>
    </div>
  );
}
