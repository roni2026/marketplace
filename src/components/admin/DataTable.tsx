import { useState, useMemo, useCallback, type ReactNode } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Inbox,
  Download, ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  exportValue?: (row: T) => string | number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  pageSize?: number;
  loading?: boolean;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  bulkActions?: ReactNode;
  toolbarActions?: ReactNode;
  filters?: ReactNode;
  onExport?: () => void;
  dense?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchable = true,
  searchPlaceholder = 'Search...',
  searchKeys,
  pageSize = 20,
  loading = false,
  selectable = false,
  selectedIds,
  onSelectionChange,
  getRowId,
  onRowClick,
  emptyMessage = 'No data available',
  emptyIcon,
  bulkActions,
  toolbarActions,
  filters,
  onExport,
  dense = true,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const filteredData = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    const keys = searchKeys ?? (columns.map((c) => c.key) as (keyof T)[]);
    return data.filter((row) =>
      keys.some((k) => String(row[k] ?? '').toLowerCase().includes(q)),
    );
  }, [data, search, searchKeys, columns]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filteredData;
    const sorted = [...filteredData].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredData, sortKey, sortDir, columns]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const pageData = sortedData.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const handleSort = useCallback(
    (col: Column<T>) => {
      if (!col.sortable) return;
      if (sortKey === col.key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(col.key);
        setSortDir('asc');
      }
    },
    [sortKey],
  );

  const allSelected = pageData.length > 0 && pageData.every((r) => selectedIds?.has(getRowId(r)));
  const someSelected = pageData.some((r) => selectedIds?.has(getRowId(r))) && !allSelected;

  const handleSelectAll = () => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (allSelected) {
      pageData.forEach((r) => next.delete(getRowId(r)));
    } else {
      pageData.forEach((r) => next.add(getRowId(r)));
    }
    onSelectionChange(next);
  };

  const handleSelectRow = (id: string) => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const startItem = sortedData.length === 0 ? 0 : currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, sortedData.length);

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {searchable && (
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder={searchPlaceholder}
              className="h-8 w-48 pl-7 pr-3 text-xs lg:w-64"
            />
          </div>
        )}
        {filters}
        <div className="ml-auto flex items-center gap-2">
          {onExport && (
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onExport}>
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          )}
          {toolbarActions}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectable && selectedIds && selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5">
          <span className="text-xs font-medium text-primary">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">{bulkActions}</div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-md border border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                {selectable && (
                  <TableHead className="w-9 px-2">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      'h-8 px-2 text-xs font-semibold',
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right',
                      col.sortable && 'cursor-pointer select-none hover:text-foreground',
                    )}
                    style={{ width: col.width }}
                    onClick={() => col.sortable && handleSort(col)}
                  >
                    <div
                      className={cn(
                        'flex items-center gap-1',
                        col.align === 'center' && 'justify-center',
                        col.align === 'right' && 'justify-end',
                      )}
                    >
                      {col.label}
                      {col.sortable && sortKey === col.key && (
                        sortDir === 'asc'
                          ? <ChevronUp className="h-3 w-3" />
                          : <ChevronDown className="h-3 w-3" />
                      )}
                      {col.sortable && sortKey !== col.key && (
                        <ArrowUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    {selectable && <TableCell className="px-2"><Skeleton className="h-3.5 w-3.5" /></TableCell>}
                    {columns.map((col) => (
                      <TableCell key={col.key} className="px-2 py-1.5">
                        <Skeleton className="h-3 w-full" style={{ width: `${50 + Math.random() * 40}%` }} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : pageData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      {emptyIcon || <Inbox className="h-8 w-8 opacity-40" />}
                      <p className="text-xs">{emptyMessage}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pageData.map((row, idx) => {
                  const id = getRowId(row);
                  const isSelected = selectedIds?.has(id) ?? false;
                  return (
                    <TableRow
                      key={id}
                      data-state={isSelected && 'selected'}
                      className={cn(
                        'h-8 text-xs transition-colors',
                        idx % 2 === 1 && 'bg-muted/20',
                        onRowClick && 'cursor-pointer',
                      )}
                      onClick={() => onRowClick?.(row)}
                    >
                      {selectable && (
                        <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleSelectRow(id)}
                            aria-label={`Select row ${id}`}
                          />
                        </TableCell>
                      )}
                      {columns.map((col) => (
                        <TableCell
                          key={col.key}
                          className={cn(
                            'px-2 py-1.5 text-xs',
                            col.align === 'center' && 'text-center',
                            col.align === 'right' && 'text-right',
                            dense && 'py-1',
                          )}
                        >
                          {col.render ? col.render(row) : String(row[col.key] ?? '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {startItem}–{endItem} of {sortedData.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={currentPage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[11px] text-muted-foreground px-1">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
