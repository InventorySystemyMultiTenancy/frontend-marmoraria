import axios from 'axios';

// Todas as chamadas autenticadas do admin passam pelo proxy do Next.js
// (app/api/[...path]) para que o token JWT viva em um cookie httpOnly de
// primeira parte (frontend e backend estão em domínios diferentes — Vercel e Render).
export const api = axios.create({
  baseURL: '/api',
});

// Cliente para chamadas públicas do e-commerce direto ao backend (sem necessidade de cookie).
export const publicApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Sessão expirada: no painel volta para o login do admin; no site, para o login
// de clientes (voltando depois para a página em que estava).
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (typeof window !== 'undefined' && error?.response?.status === 401) {
      const { pathname, search } = window.location;
      if (pathname.startsWith('/admin')) {
        if (pathname !== '/admin/login') window.location.href = '/admin/login';
      } else if (pathname !== '/entrar') {
        window.location.href = `/entrar?next=${encodeURIComponent(pathname + search)}`;
      }
    }
    return Promise.reject(error);
  }
);
