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

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (typeof window !== 'undefined' && error?.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
