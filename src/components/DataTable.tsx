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
  maxHeight?: string;
  onRowClick?: (row: T) => void;
  // Server-side pagination props
  serverPagination?: {
    totalCount: number;
    currentPage: number;
    onPageChange: (page: number) => void;
  };
}

export function DataTable<T extends Record<string, any>>({ columns, data, rowClassName, pageSize, maxHeight, onRowClick, serverPagination }: DataTableProps<T>) {
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

  const isServerPaginated = !!serverPagination;

  // For server pagination, don't sort client-side
  const sorted = isServerPaginated ? data : [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const va = a[sortKey], vb = b[sortKey];
    if (va == null) return 1;
    if (vb == null) return -1;
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  // Pagination logic
  const effectivePageSize = serverPagination ? Math.ceil(serverPagination.totalCount / Math.max(1, Math.ceil(serverPagination.totalCount / (pageSize || 30)))) : pageSize;
  
  let totalPages: number;
  let safePage: number;
  let displayData: T[];

  if (isServerPaginated) {
    const ps = pageSize || 30;
    totalPages = Math.max(1, Math.ceil(serverPagination.totalCount / ps));
    safePage = Math.min(serverPagination.currentPage, totalPages);
    displayData = sorted; // already paginated from server
  } else {
    totalPages = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
    safePage = Math.min(currentPage, totalPages);
    displayData = pageSize
      ? sorted.slice((safePage - 1) * pageSize, safePage * pageSize)
      : sorted;
  }

  const handlePageChange = (page: number) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    if (isServerPaginated) {
      serverPagination.onPageChange(newPage);
    } else {
      setCurrentPage(newPage);
    }
  };

  const totalItems = isServerPaginated ? serverPagination.totalCount : sorted.length;
  const ps = pageSize || 30;

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-border" style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
        <table className="w-full text-[11px] sm:text-sm">
          <thead>
            <tr className="bg-secondary">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  onClick={() => !isServerPaginated && handleSort(col.key)}
                  className={`px-2 sm:px-4 py-2 sm:py-3 font-medium text-secondary-foreground whitespace-nowrap ${!isServerPaginated ? 'cursor-pointer hover:text-foreground' : ''} select-none ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {!isServerPaginated && <ArrowUpDown className="h-3 w-3" />}
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
                    className={`px-2 sm:px-4 py-2 sm:py-3 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                  >
                    {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {displayData.length === 0 && (
              <tr><td colSpan={columns.length} className="px-2 sm:px-4 py-8 text-center text-muted-foreground">Nenhum dado encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2 px-2 py-2 sm:py-3">
          <span className="text-[10px] sm:text-xs text-muted-foreground">
            {((safePage - 1) * ps) + 1}–{Math.min(safePage * ps, totalItems)} de {totalItems}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(safePage - 1)}
              disabled={safePage <= 1}
              className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              Anterior
            </button>
            <span className="px-2 sm:px-3 text-[10px] sm:text-xs text-muted-foreground">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(safePage + 1)}
              disabled={safePage >= totalPages}
              className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Próximo
              <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
