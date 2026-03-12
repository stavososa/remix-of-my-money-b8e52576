import { useState } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  key: keyof T;
  label: string;
  align?: 'left' | 'right' | 'center';
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowClassName?: (row: T) => string;
  pageSize?: number;
}

export function DataTable<T extends Record<string, any>>({ columns, data, rowClassName, pageSize }: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const va = a[sortKey], vb = b[sortKey];
    if (va == null) return 1;
    if (vb == null) return -1;
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  // Reset page when data changes
  const totalPages = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const safePage = Math.min(currentPage, totalPages);
  const displayData = pageSize
    ? sorted.slice((safePage - 1) * pageSize, safePage * pageSize)
    : sorted;

  // Reset to page 1 when data length changes significantly
  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  onClick={() => handleSort(col.key)}
                  className={`px-4 py-3 font-medium text-secondary-foreground cursor-pointer hover:text-foreground select-none ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, i) => (
              <tr key={i} className={`border-t border-border hover:bg-secondary/50 ${rowClassName ? rowClassName(row) : (i % 2 === 0 ? 'bg-transparent' : 'bg-secondary/20')}`}>
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                  >
                    {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {displayData.length === 0 && (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">Nenhum dado encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {pageSize && totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-3">
          <span className="text-xs text-muted-foreground">
            {((safePage - 1) * pageSize) + 1}–{Math.min(safePage * pageSize, sorted.length)} de {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(safePage - 1)}
              disabled={safePage <= 1}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Anterior
            </button>
            <span className="px-3 text-xs text-muted-foreground">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(safePage + 1)}
              disabled={safePage >= totalPages}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Próximo
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
