# Marmoraria Pedras Pedroza — Frontend

E-commerce público e painel administrativo da Marmoraria Pedras Pedroza, em Next.js 16 (App Router) + TypeScript + Tailwind CSS v4.

## Arquitetura

- **`/` `/catalogo` `/orcamento`** — e-commerce público (landing com animações GSAP/Framer Motion, catálogo filtrável, orçamento self-service).
- **`/admin/*`** — painel administrativo (dashboard, clientes, orçamentos, pedidos, estoque, financeiro, funcionários, fórmula de precificação).
- **`app/api/*`** — *Backend for Frontend*: como o frontend (Vercel) e o backend (Render) vivem em domínios diferentes, o login não depende de cookie cross-site. As rotas de API do Next.js fazem proxy para o backend e gravam um cookie httpOnly de primeira parte (`token`) no próprio domínio do frontend. Todas as chamadas autenticadas do admin passam por `lib/api.ts` (`baseURL: /api`); as páginas públicas chamam o backend diretamente via `publicApi`.

## Pré-requisitos

- Node.js 20+
- Backend da Marmoraria Pedras Pedroza rodando (veja `marmoraria-backend`)

## Como rodar localmente

```bash
npm install
cp .env.example .env.local
# ajuste BACKEND_URL / NEXT_PUBLIC_API_URL para apontar ao backend local ou remoto

npm run dev
```

Acesse `http://localhost:3000` (e-commerce) e `http://localhost:3000/admin/login` (painel administrativo).

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `BACKEND_URL` | URL do backend, usada apenas no servidor (rotas de proxy em `app/api`) |
| `NEXT_PUBLIC_API_URL` | URL do backend, usada nas chamadas públicas feitas direto do navegador |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número de WhatsApp exibido no e-commerce |
| `NEXT_PUBLIC_COMPANY_NAME` | Nome da empresa exibido nos textos |

## Scripts

- `npm run dev` — desenvolvimento
- `npm run build` — build de produção
- `npm start` — roda o build de produção

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. Configure as variáveis de ambiente acima (principalmente `BACKEND_URL` e `NEXT_PUBLIC_API_URL` apontando para o backend no Render).
3. Build command: `next build` (padrão).
4. No backend (Render), configure `FRONTEND_URL` com a URL final da Vercel para liberar o CORS.

## Notas de implementação

- **Tailwind v4** usa configuração via `@theme` em `app/globals.css` (sem `tailwind.config.ts`).
- Componentes de UI (`components/ui`) são primitivos próprios no estilo shadcn (Button, Input, Dialog, Badge, Card) — sem dependência do CLI do shadcn.
- Animações GSAP só são inicializadas no client (`typeof window !== 'undefined'`) para evitar erros de SSR.
- PDFs de orçamento são sempre gerados no backend (Puppeteer) — o link `/api/pdf/quote/:id` passa pelo mesmo proxy.
