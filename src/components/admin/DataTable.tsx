import { useState, useMemo, ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Inbox,
} from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  className?: string;
  width?: string;
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
  onRowClick?: (row: T) => void;
  bulkActions?: ReactNode;
  emptyMessage?: string;
  toolbarActions?: ReactNode;
  getRowId: (row: T) => string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchable = true,
  searchPlaceholder = 'Search...',
  searchKeys,
  pageSize = 10,
  loading = false,
  selectable = false,
  onRowClick,
  bulkActions,
  emptyMessage = 'No data found',
  toolbarActions,
  getRowId,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    const keys = searchKeys || (columns.map((c) => c.key) as (keyof T)[]);
    return data.filter((row) =>
      keys.some((k) => String(row[k] ?? '').toLowerCase().includes(q))
    );
  }, [data, search, searchKeys, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === paged.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paged.map(getRowId)));
    }
  };

  const handleExport = () => {
    const headers = columns.map((c) => c.label).join(',');
    const rows = sorted.map((row) =>
      columns.map((c) => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      {(searchable || toolbarActions || bulkActions) && (
        <div className="flex items-center gap-2 flex-wrap">
          {searchable && (
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                className="pl-8 h-9"
              />
            </div>
          )}
          {selected.size > 0 && bulkActions && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-lg">
              <span className="text-xs font-medium text-primary">{selected.size} selected</span>
              {bulkActions}
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {toolbarActions}
            <Button variant="outline" size="sm" className="h-9 gap-2" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                {selectable && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={paged.length > 0 && selected.size === paged.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                )}
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={col.className}
                    style={{ width: col.width }}
                  >
                    {col.sortable ? (
                      <button
                        onClick={() => handleSort(col.key)}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        {col.label}
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.label
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {selectable && <TableCell><Skeleton className="h-4 w-4" /></TableCell>}
                    {columns.map((col) => (
                      <TableCell key={col.key}>
                        <Skeleton className="h-4 w-full max-w-[120px]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="h-32">
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <Inbox className="h-8 w-8 opacity-40" />
                      <p className="text-sm">{emptyMessage}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((row) => {
                  const id = getRowId(row);
                  return (
                    <TableRow
                      key={id}
                      onClick={() => onRowClick?.(row)}
                      className={onRowClick ? 'cursor-pointer hover:bg-accent/50' : ''}
                    >
                      {selectable && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selected.has(id)}
                            onCheckedChange={() => toggleSelect(id)}
                          />
                        </TableCell>
                      )}
                      {columns.map((col) => (
                        <TableCell key={col.key} className={col.className}>
                          {col.render ? col.render(row) : String(row[col.key] ?? '—')}
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
          <p className="text-xs text-muted-foreground">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs px-2">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
