import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { SiteLogo } from '@/components/public/SiteLogo';

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME;

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-marble-dark text-white">
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 sm:px-10 py-4 backdrop-blur-md bg-marble-dark/60 border-b border-white/10">
        <SiteLogo company={COMPANY} />
        <nav className="hidden sm:flex items-center gap-8 text-sm text-white/80">
          <Link href="/catalogo" className="hover:text-marble-gold transition-colors">Catálogo</Link>
          <Link href="/orcamento" className="hover:text-marble-gold transition-colors">Orçamento</Link>
          <Link href="/acompanhar-pedido" className="hover:text-marble-gold transition-colors">Acompanhar Pedido</Link>
        </nav>
        <a
          href={`https://wa.me/${WHATSAPP}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 bg-marble-gold text-marble-dark px-4 py-2 rounded-full text-sm font-medium hover:bg-marble-gold/90 transition-colors"
        >
          <MessageCircle size={16} /> WhatsApp
        </a>
      </header>

      <main className="flex-1 pt-[64px]">{children}</main>

      <footer className="border-t border-white/10 px-6 sm:px-10 py-8 text-sm text-white/50 flex flex-col sm:flex-row justify-between gap-2">
        <p>© {new Date().getFullYear()} {COMPANY}. Todos os direitos reservados.</p>
        <div className="flex items-center gap-4">
          <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" className="hover:text-marble-gold">
            Fale conosco no WhatsApp
          </a>
          <Link href="/admin/login" className="hover:text-marble-gold">
            Acesso administrativo
          </Link>
        </div>
      </footer>
    </div>
  );
}
