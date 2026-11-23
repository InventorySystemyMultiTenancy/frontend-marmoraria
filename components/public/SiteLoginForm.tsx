'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { Lock, MessageCircle } from 'lucide-react';
import { siteLogin } from '@/lib/auth';

const WHATSAPP_MESSAGE = 'Olá! Gostaria de criar meu login para fazer orçamentos pelo site.';

export function SiteLoginForm({ next, whatsapp }: { next: string; whatsapp: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const whatsappUrl = `https://wa.me/${whatsapp}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return setError('Informe seu e-mail e senha.');
    setError(null);
    setSubmitting(true);
    try {
      await siteLogin(email.trim(), password);
      router.replace(next);
      router.refresh();
    } catch (err) {
      const status = isAxiosError(err) ? err.response?.status : undefined;
      setError(
        status === 429
          ? 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
          : status === 401 || status === 400
            ? 'E-mail ou senha inválidos.'
            : 'Não foi possível entrar agora. Tente novamente.'
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="glass-panel w-full max-w-md px-6 sm:px-10 py-10">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-marble-gold/15 flex items-center justify-center">
          <Lock className="text-marble-gold" size={22} />
        </div>
        <h1 className="text-2xl font-bold">Entre para fazer seu orçamento</h1>
        <p className="text-white/60 text-sm mt-2">
          Os orçamentos pelo site são exclusivos para clientes cadastrados.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="site-email" className="text-sm text-white/70 mb-1.5 block">
            E-mail
          </label>
          <input
            id="site-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-marble-gold"
          />
        </div>
        <div>
          <label htmlFor="site-password" className="text-sm text-white/70 mb-1.5 block">
            Senha
          </label>
          <input
            id="site-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-marble-gold"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-full bg-marble-gold text-marble-dark font-semibold hover:bg-marble-gold/90 transition-colors disabled:opacity-60"
        >
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <div className="mt-8 pt-8 border-t border-white/10 text-center">
        <p className="text-white/80 font-medium">Ainda não tem login?</p>
        <p className="text-white/50 text-sm mt-1 mb-5">
          Peça o seu pelo nosso WhatsApp — criamos seu acesso com e-mail e senha para você montar seus orçamentos.
        </p>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-full border border-[#25D366]/60 text-[#25D366] font-semibold hover:bg-[#25D366]/10 transition-colors"
        >
          <MessageCircle size={18} /> Pedir meu login no WhatsApp
        </a>
      </div>
    </div>
  );
}
