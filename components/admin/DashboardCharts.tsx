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
            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#C9A96E" stopOpacity={0.45} />
            <stop offset="95%" stopColor="#C9A96E" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
        <XAxis dataKey="month" fontSize={12} axisLine={false} tickLine={false} />
        <YAxis fontSize={12} axisLine={false} tickLine={false} width={50} />
        <Tooltip formatter={(value) => (typeof value === 'number' ? CURRENCY_FORMATTER(value) : value)} />
        <Legend />
        <Area type="monotone" dataKey="income" name="Receita" stroke="#16a34a" fill="url(#colorIncome)" strokeWidth={2} />
        <Area type="monotone" dataKey="expense" name="Despesa" stroke="#dc2626" fill="url(#colorExpense)" strokeWidth={2} />
        <Area type="monotone" dataKey="profit" name="Lucro" stroke="#C9A96E" fill="url(#colorProfit)" strokeWidth={2} />
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
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
        <XAxis type="number" fontSize={12} axisLine={false} tickLine={false} />
        <YAxis dataKey="name" type="category" fontSize={12} width={140} axisLine={false} tickLine={false} />
        <Tooltip formatter={(value) => (typeof value === 'number' ? formatCurrency(value) : value)} />
        <Bar dataKey="totalRevenue" name="Receita" fill="#C9A96E" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#9ca3af',
  SENT: '#3b82f6',
  APPROVED: '#16a34a',
  REJECTED: '#dc2626',
  EXPIRED: '#f59e0b',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  SENT: 'Enviado',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  EXPIRED: 'Expirado',
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
        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
          {chartData.map((entry) => (
            <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#9ca3af'} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
