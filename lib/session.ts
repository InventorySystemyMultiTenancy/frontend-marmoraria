// Uso exclusivo no servidor (route handlers e server components).
import { cookies } from 'next/headers';
import { SiteSession } from '@/types';

// Login salvo no navegador por 90 dias (mesma validade do token no backend).
export const SESSION_COOKIE = 'token';
export const SESSION_MAX_AGE_S = 90 * 24 * 60 * 60;

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE_S,
};

// Quem está logado no site (admin/funcionário ou cliente), validado no backend.
// O mesmo cookie vale para o painel e para o orçamento do site, então quem já
// entrou no admin não precisa logar de novo para orçar.
export async function getSiteSession(): Promise<SiteSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${process.env.BACKEND_URL}/api/auth/session`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.session as SiteSession) ?? null;
  } catch {
    return null;
  }
}

// Só aceita caminhos internos no ?next= (evita redirecionar para outro site).
export function safeNextPath(next: string | string[] | undefined, fallback = '/orcamento') {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}
