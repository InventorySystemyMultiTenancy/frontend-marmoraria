'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

const CURRENCY_FORMATTER = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const compact = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toLocaleString('pt-BR')}k` : String(v));

// Tooltip e eixos no estilo do painel (ônix + ouro)
export const TOOLTIP_PROPS = {
  contentStyle: {
    borderRadius: 12,
    border: '1px solid rgba(201,169,110,0.35)',
    background: 'rgba(21,17,15,0.92)',
    boxShadow: '0 18px 40px -18px rgba(21,17,15,0.7)',
    color: '#fff',
    fontSize: 12,
    padding: '8px 12px',
  },
  itemStyle: { color: '#f3ead8' },
  labelStyle: { color: '#ead6a8', fontWeight: 600, marginBottom: 4 },
};
const AXIS = { fontSize: 12, axisLine: false, tickLine: false, tick: { fill: '#8a8079' } } as const;
const GRID = '#ece6dc';
const C_INCOME = '#2f9e6e';
const C_EXPENSE = '#d9644a';
const C_PROFIT = '#c9a96e';

interface MonthlyDatum {
  month: string;
  income: number;
  expense: number;
}

export function RevenueTrendChart({ data }: { data: MonthlyDatum[] }) {
  const withProfit = data.map((d) => ({ ...d, profit: d.income - d.expense }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={withProfit}>
        <defs>
          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C_INCOME} stopOpacity={0.28} />
            <stop offset="95%" stopColor={C_INCOME} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C_EXPENSE} stopOpacity={0.22} />
            <stop offset="95%" stopColor={C_EXPENSE} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C_PROFIT} stopOpacity={0.45} />
            <stop offset="95%" stopColor={C_PROFIT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="month" {...AXIS} />
        <YAxis {...AXIS} width={56} tickFormatter={compact} />
        <Tooltip
          {...TOOLTIP_PROPS}
          cursor={{ stroke: 'rgba(201,169,110,0.5)', strokeDasharray: '4 4' }}
          formatter={(value) => (typeof value === 'number' ? CURRENCY_FORMATTER(value) : value)}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Area type="monotone" dataKey="income" name="Receita" stroke={C_INCOME} fill="url(#colorIncome)" strokeWidth={2} animationDuration={1100} />
        <Area type="monotone" dataKey="expense" name="Despesa" stroke={C_EXPENSE} fill="url(#colorExpense)" strokeWidth={2} animationDuration={1100} />
        <Area type="monotone" dataKey="profit" name="Lucro" stroke={C_PROFIT} fill="url(#colorProfit)" strokeWidth={2.5} animationDuration={1100} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface TopProduct {
  name: string;
  totalRevenue: number;
}

export function TopProductsChart({ data }: { data: TopProduct[] }) {
  const sorted = [...data].sort((a, b) => a.totalRevenue - b.totalRevenue);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={sorted} layout="vertical" margin={{ left: 24 }}>
        <defs>
          <linearGradient id="barGold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a6834b" />
            <stop offset="100%" stopColor="#ead6a8" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
        <XAxis type="number" {...AXIS} tickFormatter={compact} />
        <YAxis dataKey="name" type="category" {...AXIS} width={140} tick={{ fill: '#3d342e' }} />
        <Tooltip
          {...TOOLTIP_PROPS}
          cursor={{ fill: 'rgba(201,169,110,0.08)' }}
          formatter={(value) => (typeof value === 'number' ? formatCurrency(value) : value)}
        />
        <Bar dataKey="totalRevenue" name="Receita" fill="url(#barGold)" radius={[0, 8, 8, 0]} barSize={18} animationDuration={1000} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#b8afa6',
  SENT: '#c9a96e',
  APPROVED: '#2f9e6e',
  REJECTED: '#d9644a',
  EXPIRED: '#e0a43a',
  CANCELLED: '#8c4a3c',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  SENT: 'Enviado',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  EXPIRED: 'Expirado',
  CANCELLED: 'Cancelado',
};

export function QuotesStatusDonut({ data }: { data: { status: string; count: number }[] }) {
  const chartData = data.map((d) => ({ name: STATUS_LABELS[d.status] ?? d.status, value: d.count, status: d.status }));
  const total = chartData.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return <p className="text-sm text-gray-400 text-center py-20">Sem orçamentos ainda.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cy="44%"
          innerRadius={64}
          outerRadius={96}
          paddingAngle={3}
          cornerRadius={6}
          stroke="none"
          animationDuration={1000}
        >
          {chartData.map((entry) => (
            <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#9ca3af'} />
          ))}
        </Pie>
        <text x="50%" y="44%" textAnchor="middle" dominantBaseline="middle" fill="#15110f" fontSize={26} fontWeight={700}>
          {total}
        </text>
        <text x="50%" y="44%" dy={22} textAnchor="middle" fill="#8a8079" fontSize={11}>
          orçamentos
        </text>
        <Tooltip {...TOOLTIP_PROPS} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
