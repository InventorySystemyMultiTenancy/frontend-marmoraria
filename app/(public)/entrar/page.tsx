import { redirect } from 'next/navigation';
import { getSiteSession, safeNextPath } from '@/lib/session';
import { SiteLoginForm } from '@/components/public/SiteLoginForm';

export const metadata = { title: 'Entrar para fazer orçamento' };

// Número do WhatsApp da marmoraria: variável de ambiente ou, na falta dela, o
// cadastrado em Empresa no painel.
async function getWhatsappNumber() {
  const fromEnv = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  if (fromEnv) return fromEnv;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/company/public`, { next: { revalidate: 300 } });
    if (!res.ok) return '';
    const data = await res.json();
    return String(data.company?.whatsapp ?? data.company?.phone ?? '').replace(/\D/g, '');
  } catch {
    return '';
  }
}

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const next = safeNextPath((await searchParams).next);

  // Já logado (cliente ou admin): vai direto para o orçamento.
  if (await getSiteSession()) redirect(next);

  return (
    <div className="px-6 sm:px-10 py-20 sm:py-28 flex justify-center">
      <SiteLoginForm next={next} whatsapp={await getWhatsappNumber()} />
    </div>
  );
}
