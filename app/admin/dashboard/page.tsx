'use client';

import { useMemo, useRef, useState } from 'react';
import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  Package,
  Plus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { CountUp } from '@/components/ui/CountUp';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';
import { useAuthStore } from '@/store/authStore';
import { QUOTE_STATUS_LABELS, QuoteStatus } from '@/types';
import { RevenueTrendChart, TopProductsChart, QuotesStatusDonut } from '@/components/admin/DashboardCharts';
import { MarbleMonolith } from '@/components/admin/dashboard/MarbleMonolith';

interface DashboardSummary {
  quotesCount: number;
  ordersInProgress: number;
  revenue: number;
  expense: number;
  profit: number;
  lowStockCount: number;
  recentQuotes: {
    id: string;
    quoteNumber: string;
    total: number;
    status: QuoteStatus;
    clientName?: string | null;
    client?: { name: string } | null;
    createdAt: string;
  }[];
}

type PeriodOption = 'month' | '30' | '90' | 'custom';

const PERIOD_OPTIONS: { value: PeriodOption; label: string }[] = [
  { value: 'month', label: 'Este mês' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: 'custom', label: 'Data específica' },
];

const DASHBOARD_KEYS = ['dashboard-summary', 'financial-monthly', 'dashboard-top-products', 'dashboard-quotes-by-status'];

const STATUS_BADGE: Record<QuoteStatus, 'default' | 'info' | 'success' | 'danger' | 'warning' | 'gold'> = {
  DRAFT: 'default',
  SENT: 'gold',
  APPROVED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'warning',
  CANCELLED: 'danger',
};

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const pct = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const heroRef = useRef<HTMLElement>(null);

  const [period, setPeriod] = useState<PeriodOption>('month');
  const [customFrom, setCustomFrom] = useState(toISODate(new Date()));
  const [customTo, setCustomTo] = useState(toISODate(new Date()));
  const [appliedCustomRange, setAppliedCustomRange] = useState({ from: customFrom, to: customTo });

  const range = useMemo(() => {
    if (period === 'month') return {};
    if (period === '30') {
      const from = new Date();
      from.setDate(from.getDate() - 29);
      return { from: toISODate(from), to: toISODate(new Date()) };
    }
    if (period === '90') {
      const from = new Date();
      from.setDate(from.getDate() - 89);
      return { from: toISODate(from), to: toISODate(new Date()) };
    }
    return { from: appliedCustomRange.from, to: appliedCustomRange.to };
  }, [period, appliedCustomRange]);

  const periodLabel = period === 'month' ? 'no mês' : 'no período';
  const canReports = hasPermission(user, 'financial_reports');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary', range],
    queryFn: async () => (await api.get<DashboardSummary>('/dashboard/summary', { params: range })).data,
  });

  // O endpoint mensal exige a permissão de relatórios; sem ela, não pede.
  const { data: monthly } = useQuery({
    queryKey: ['financial-monthly'],
    enabled: canReports,
    queryFn: async () =>
      (await api.get('/financial/monthly')).data as { data: { month: string; income: number; expense: number }[] },
  });

  const { data: topProducts } = useQuery({
    queryKey: ['dashboard-top-products', range],
    queryFn: async () =>
      (await api.get('/dashboard/top-products', { params: range })).data as {
        products: { marbleId: string; name: string; totalRevenue: number }[];
      },
  });

  const { data: quotesByStatus } = useQuery({
    queryKey: ['dashboard-quotes-by-status', range],
    queryFn: async () =>
      (await api.get('/dashboard/quotes-by-status', { params: range })).data as {
        data: { status: string; count: number }[];
      },
  });

  const fetching = useIsFetching({ predicate: (q) => DASHBOARD_KEYS.includes(String(q.queryKey[0])) }) > 0;

  function refresh() {
    DASHBOARD_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  }

  // ── Derivados (só a partir dos dados reais da API) ──
  const revenue = data?.revenue ?? 0;
  const expense = data?.expense ?? 0;
  const profit = data?.profit ?? 0;
  const margin = revenue > 0 ? (profit / revenue) * 100 : null;
  const expenseShare = revenue > 0 ? Math.min(100, (expense / revenue) * 100) : null;

  const months = monthly?.data ?? [];
  // Comparação com o mês anterior: só faz sentido no filtro "Este mês" e
  // quando o histórico mensal existe e o mês anterior teve receita.
  const prevIncome = months.length >= 2 ? months[months.length - 2].income : 0;
  const curIncome = months.length >= 1 ? months[months.length - 1].income : 0;
  const delta = period === 'month' && prevIncome > 0 ? ((curIncome - prevIncome) / prevIncome) * 100 : null;

  const approvedCount = quotesByStatus?.data.find((d) => d.status === 'APPROVED')?.count ?? 0;
  const lowStock = data?.lowStockCount ?? 0;
  const stockLevel = lowStock === 0 ? 'ok' : lowStock >= 5 ? 'critical' : 'warn';

  const firstName = user?.name?.split(' ')[0] ?? '';
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <section ref={heroRef} className="dash-hero ds-rise">
        <div className="relative z-10 grid items-center gap-6 p-5 sm:p-7 lg:p-8 md:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-light/80 first-letter:uppercase">
              {today}
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white via-[#f3ead8] to-gold-light bg-clip-text text-transparent">
                Dashboard
              </span>
            </h1>
            <p className="mt-2 text-sm text-white/60 max-w-md">
              {greeting()}
              {firstName ? `, ${firstName}` : ''}. Este é o resumo da marmoraria {periodLabel}.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                onClick={refresh}
                disabled={fetching}
                className="ds-btn dash-chip inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium cursor-pointer disabled:cursor-wait"
              >
                <RefreshCw size={15} className={cn('transition-transform', fetching && 'animate-spin')} />
                {fetching ? 'Atualizando...' : 'Atualizar'}
              </button>
              {hasPermission(user, 'quotes_create') && (
                <Link href="/admin/orcamentos/novo">
                  <Button variant="gold" className="rounded-xl">
                    <Plus size={16} /> Novo orçamento
                  </Button>
                </Link>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-1.5" role="group" aria-label="Período">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  data-active={period === opt.value}
                  aria-pressed={period === opt.value}
                  className="dash-chip rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer"
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {period === 'custom' && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex flex-wrap items-end gap-3"
              >
                <div>
                  <Label className="text-white/60">De</Label>
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-9 bg-white/10 border-white/15 text-white [color-scheme:dark] hover:border-marble-gold/60"
                  />
                </div>
                <div>
                  <Label className="text-white/60">Até</Label>
                  <Input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-9 bg-white/10 border-white/15 text-white [color-scheme:dark] hover:border-marble-gold/60"
                  />
                </div>
                <Button size="sm" variant="gold" onClick={() => setAppliedCustomRange({ from: customFrom, to: customTo })}>
                  Aplicar
                </Button>
              </motion.div>
            )}
          </div>

          <MarbleMonolith hostRef={heroRef} className="hidden sm:block h-[210px] w-[240px] lg:h-[230px] lg:w-[280px] justify-self-end" />
        </div>
      </section>

      {/* ── Valores ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr]">
        <div className="ds-card dash-feature ds-rise group p-6 md:col-span-2 lg:col-span-1" style={{ '--i': 1 } as React.CSSProperties}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="ds-eyebrow !text-gold-light/80">Receita {periodLabel}</p>
              <p className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
                {isLoading ? <span className="text-white/40">—</span> : <CountUp value={revenue} format={formatCurrency} />}
              </p>
              {delta !== null && (
                <p
                  className={cn(
                    'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                    delta >= 0 ? 'bg-emerald-400/15 text-emerald-300' : 'bg-red-400/15 text-red-300'
                  )}
                >
                  {delta >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {pct(Math.abs(delta))} vs. mês anterior
                </p>
              )}
            </div>
            <span className="ds-icon-tile h-11 w-11 !bg-[linear-gradient(145deg,#ead6a8,#a6834b)] !text-ink">
              <TrendingUp size={20} strokeWidth={2} />
            </span>
          </div>
          {canReports && months.length > 1 && <Sparkline values={months.map((m) => m.income)} labels={months.map((m) => m.month)} />}
        </div>

        <MetricCard
          index={2}
          label={`Despesas ${periodLabel}`}
          icon={TrendingDown}
          loading={isLoading}
          value={expense}
          tone="text-[#b8503a]"
          footer={
            expenseShare !== null ? (
              <Meter value={expenseShare} label={`${pct(expenseShare)} da receita`} color="from-[#e9927f] to-[#d9644a]" />
            ) : (
              <p className="text-xs text-marble-gray">Sem receita no período para comparar.</p>
            )
          }
        />
        <MetricCard
          index={3}
          label={`Lucro ${periodLabel}`}
          icon={Wallet}
          loading={isLoading}
          value={profit}
          tone={profit < 0 ? 'text-red-600' : 'text-gold-deep'}
          footer={
            margin !== null ? (
              <Meter
                value={Math.max(0, Math.min(100, margin))}
                label={`Margem de ${pct(margin)}`}
                color={margin < 0 ? 'from-red-300 to-red-500' : 'from-gold-light to-gold-deep'}
              />
            ) : (
              <p className="text-xs text-marble-gray">Margem aparece quando houver receita.</p>
            )
          }
        />
      </div>

      {/* ── Operação ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <OpsCard
          index={4}
          icon={FileText}
          title="Orçamentos"
          value={data?.quotesCount ?? 0}
          loading={isLoading}
          description={
            approvedCount > 0
              ? `criados ${periodLabel} · ${approvedCount} aprovado${approvedCount > 1 ? 's' : ''}`
              : `criados ${periodLabel}`
          }
          action={hasPermission(user, 'quotes_view') ? { href: '/admin/orcamentos', label: 'Ver orçamentos' } : undefined}
        />
        <OpsCard
          index={5}
          icon={Package}
          title="Pedidos em andamento"
          value={data?.ordersInProgress ?? 0}
          loading={isLoading}
          description="em produção ou aguardando entrega"
          action={hasPermission(user, 'orders_view') ? { href: '/admin/pedidos', label: 'Ver pedidos' } : undefined}
        />
        <OpsCard
          index={6}
          icon={stockLevel === 'ok' ? CheckCircle2 : AlertTriangle}
          title="Alertas de estoque"
          value={lowStock}
          loading={isLoading}
          severity={stockLevel}
          description={
            stockLevel === 'ok'
              ? 'Estoque em dia, nenhum material abaixo do mínimo'
              : `${lowStock > 1 ? 'materiais' : 'material'} com menos de 3 peças disponíveis`
          }
          action={hasPermission(user, 'stock_view') ? { href: '/admin/estoque', label: 'Abrir estoque' } : undefined}
        />
      </div>

      {/* ── Gráficos (revelados ao rolar) ── */}
      <div className={cn('grid grid-cols-1 gap-4', canReports && 'lg:grid-cols-3')}>
        {canReports && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Receita, despesa e lucro · 6 meses</CardTitle>
            </CardHeader>
            <CardContent>
              <InViewChart>
                <RevenueTrendChart data={months} />
              </InViewChart>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Orçamentos por status</CardTitle>
          </CardHeader>
          <CardContent>
            <InViewChart>
              <QuotesStatusDonut data={quotesByStatus?.data ?? []} />
            </InViewChart>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Materiais mais vendidos</CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts?.products.length ? (
            <InViewChart>
              <TopProductsChart data={topProducts.products} />
            </InViewChart>
          ) : (
            <EmptyState text="Sem dados de vendas no período." />
          )}
        </CardContent>
      </Card>

      {/* ── Últimos orçamentos ── */}
      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <CardTitle>Últimos orçamentos</CardTitle>
          {hasPermission(user, 'quotes_view') && (
            <Link
              href="/admin/orcamentos"
              className="group inline-flex items-center gap-1 text-xs font-medium text-gold-deep hover:text-ink transition-colors"
            >
              Ver todos <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {data && data.recentQuotes.length === 0 ? (
            <EmptyState text="Nenhum orçamento criado ainda." />
          ) : (
            <table className="ds-table w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[#faf8f4]">
                  <th className="px-5 py-3 text-left">Número</th>
                  <th className="px-5 py-3 text-left">Cliente</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-right">Data</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentQuotes.map((q) => (
                  <tr key={q.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/orcamentos/${q.id}`} className="font-medium text-gold-deep hover:text-ink transition-colors">
                        {q.quoteNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-ink">{q.client?.name ?? q.clientName ?? '-'}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={STATUS_BADGE[q.status]}>{QUOTE_STATUS_LABELS[q.status]}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium tabular-nums text-ink">{formatCurrency(q.total)}</td>
                    <td className="px-5 py-3.5 text-right text-marble-gray tabular-nums">{formatDate(q.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Peças da página ──

function MetricCard({
  index,
  label,
  icon: Icon,
  value,
  loading,
  tone,
  footer,
}: {
  index: number;
  label: string;
  icon: React.ElementType;
  value: number;
  loading: boolean;
  tone: string;
  footer: React.ReactNode;
}) {
  return (
    <div className="ds-card ds-lift ds-rise group flex flex-col justify-between gap-5 p-6" style={{ '--i': index } as React.CSSProperties}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ds-eyebrow">{label}</p>
          <p className={cn('mt-3 text-2xl sm:text-[28px] font-semibold tracking-tight', tone)}>
            {loading ? <span className="text-gray-300">—</span> : <CountUp value={value} format={formatCurrency} />}
          </p>
        </div>
        <span className="ds-icon-tile h-10 w-10">
          <Icon size={18} strokeWidth={1.75} />
        </span>
      </div>
      {footer}
    </div>
  );
}

function Meter({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#efe9df]">
        <motion.div
          className={cn('h-full rounded-full bg-gradient-to-r', color)}
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1], delay: 0.2 }}
        />
      </div>
      <p className="mt-2 text-xs text-marble-gray">{label}</p>
    </div>
  );
}

const SEVERITY = {
  ok: { ring: '', value: 'text-ink', tile: '', glow: '' },
  warn: {
    ring: 'border-amber-300/70',
    value: 'text-amber-600',
    tile: '!bg-[linear-gradient(145deg,#fcd58a,#d9922b)] !text-ink',
    glow: 'bg-[radial-gradient(240px_140px_at_100%_0%,rgba(245,170,60,0.16),transparent_70%)]',
  },
  critical: {
    ring: 'border-red-300/80',
    value: 'text-red-600',
    tile: '!bg-[linear-gradient(145deg,#f8a59a,#d9442f)] !text-white',
    glow: 'bg-[radial-gradient(240px_140px_at_100%_0%,rgba(230,70,50,0.16),transparent_70%)]',
  },
} as const;

// Card operacional com leve inclinação 3D seguindo o mouse.
function OpsCard({
  index,
  icon: Icon,
  title,
  value,
  loading,
  description,
  action,
  severity = 'ok',
}: {
  index: number;
  icon: React.ElementType;
  title: string;
  value: number;
  loading: boolean;
  description: string;
  action?: { href: string; label: string };
  severity?: keyof typeof SEVERITY;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const sev = SEVERITY[severity];

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse' || !ref.current) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.transform = `perspective(900px) rotateX(${-y * 6}deg) rotateY(${x * 8}deg) translateY(-3px)`;
  }
  function onLeave() {
    if (ref.current) ref.current.style.transform = '';
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn('ds-card ds-lift ds-rise group flex flex-col p-5 will-change-transform', sev.ring)}
      style={{ '--i': index } as React.CSSProperties}
    >
      {sev.glow && <div aria-hidden className={cn('pointer-events-none absolute inset-0 rounded-[inherit]', sev.glow)} />}
      <div className="relative flex items-center gap-3">
        <span className={cn('ds-icon-tile h-10 w-10', sev.tile)}>
          <Icon size={18} strokeWidth={1.9} />
        </span>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {severity === 'critical' && (
          <span className="ml-auto relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
        )}
      </div>
      <p className={cn('relative mt-4 text-4xl font-semibold tracking-tight', sev.value)}>
        {loading ? <span className="text-gray-300">—</span> : <CountUp value={value} />}
      </p>
      <p className="relative mt-1 text-[13px] text-marble-gray">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="relative mt-4 inline-flex items-center gap-1.5 self-start rounded-lg border border-[var(--line)] bg-white/70 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-marble-gold/60 hover:bg-white"
        >
          {action.label}
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

// Minigráfico da receita dos últimos meses (dados de /financial/monthly).
function Sparkline({ values, labels }: { values: number[]; labels: string[] }) {
  const W = 300;
  const H = 56;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * W,
    H - 4 - ((v - min) / (max - min || 1)) * (H - 10),
  ]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;

  return (
    <div className="mt-5">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-14 w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c9a96e" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#c9a96e" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={area}
          fill="url(#sparkFill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke="#ead6a8"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1], delay: 0.3 }}
        />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-white/35">
        <span>{labels[0]}</span>
        <span>Receita · 6 meses</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}

// Monta o gráfico só quando ele entra na tela, para a animação do Recharts
// acontecer à vista (e não gastar render fora da tela).
function InViewChart({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -60px 0px' });
  return (
    <div ref={ref} className="min-h-[300px]">
      {inView ? children : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <span className="h-10 w-10 rounded-full border border-dashed border-marble-gold/50" />
      <p className="text-sm text-marble-gray">{text}</p>
    </div>
  );
}
