'use client';

import { cn } from '@/lib/utils';

export interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  keyExtractor: (row: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  emptyMessage = 'Nenhum registro encontrado.',
  keyExtractor,
}: DataTableProps<T>) {
  return (
    <div className="ds-card ds-reveal overflow-x-auto">
      <table className="ds-table w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] bg-[#faf8f4]">
            {columns.map((col, i) => (
              <th key={i} className={cn('px-4 py-3 text-left', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-400">
                <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-marble-gold/30 border-t-marble-gold animate-spin" />Carregando...</span>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={keyExtractor(row)} className="border-b border-[var(--line)] last:border-0">
                {columns.map((col, i) => (
                  <td key={i} className={cn('px-4 py-3', col.className)}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
