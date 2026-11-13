'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TOOLTIP_PROPS } from '@/components/admin/DashboardCharts';

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

export function FinancialChart({ data }: { data: MonthlyData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ece6dc" vertical={false} />
        <XAxis dataKey="month" fontSize={12} axisLine={false} tickLine={false} tick={{ fill: '#8a8079' }} />
        <YAxis fontSize={12} axisLine={false} tickLine={false} tick={{ fill: '#8a8079' }} width={56} />
        <Tooltip
          {...TOOLTIP_PROPS}
          cursor={{ fill: 'rgba(201,169,110,0.08)' }}
          formatter={(value) =>
            typeof value === 'number' ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : value
          }
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="income" name="Receita" fill="#2f9e6e" radius={[6, 6, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expense" name="Despesa" fill="#d9644a" radius={[6, 6, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
