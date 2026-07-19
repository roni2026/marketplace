/**
 * AdSearch — Universal admin ad search.
 *
 * One large search box auto-detects Ad ID / Slug / Title / Seller Email /
 * Seller Phone. Results stream from the server-side `search_ads_admin` RPC
 * (indexed + paginated + filtered) into a compact enterprise table. Clicking
 * a row opens the right-side detail drawer with the full audit log.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { AdDetailsDrawer } from '@/components/admin/AdDetailsDrawer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Search, Eye, Pencil, Gavel, History, ChevronLeft, ChevronRight,
  X, ImageIcon, SlidersHorizontal,
} from 'lucide-react';
import { formatPrice, DIVISIONS, DISTRICTS } from '@/lib/constants';
import {
  searchAds, detectSearchType, statusBadgeClass, loadCategories, loadSubcategories,
  loadShops, AD_STATUS_OPTIONS, SEARCH_TYPE_LABEL,
  type AdSearchRow, type SortOption,
} from '@/lib/adSearch';

const PAGE_SIZE = 50;
const PLACEHOLDER = `Search by  Ad ID · Listing Slug · Title · Seller Email · Seller Phone`;

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price_high', label: 'Price: High → Low' },
  { value: 'price_low', label: 'Price: Low → High' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'relevance', label: 'Best match' },
];

const ALL = '__all__';

export default function AdSearch() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [rows, setRows] = useState<AdSearchRow[]>([]);
  const [total, setTotal] = useState(0);
  const [detectedType, setDetectedType] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // filters
  const [status, setStatus] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [division, setDivision] = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');

  // option data
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; name: string }[]>([]);
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);

  // drawer
  const [drawerAdId, setDrawerAdId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const reqId = useRef(0);

  useEffect(() => {
    loadCategories().then(setCategories);
    loadShops().then(setShops);
  }, []);

  useEffect(() => {
    if (categoryId) loadSubcategories(categoryId).then(setSubcategories);
    else setSubcategories([]);
  }, [categoryId]);

  // debounce 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // reset to page 1 whenever the query or a filter changes
  useEffect(() => {
    setPage(1);
  }, [debounced, status, categoryId, subcategoryId, division, district, shopId, dateFrom, dateTo, priceMin, priceMax, sort]);

  const runSearch = useCallback(async () => {
    const current = ++reqId.current;
    setLoading(true);
    try {
      const res = await searchAds({
        query: debounced,
        type: 'auto',
        status,
        categoryId,
        subcategoryId,
        division,
        district,
        shopId,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : null,
        dateTo: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : null,
        priceMin: priceMin ? Number(priceMin) : null,
        priceMax: priceMax ? Number(priceMax) : null,
        sort,
        page,
        pageSize: PAGE_SIZE,
      });
      if (current !== reqId.current) return; // stale response
      setRows(res.rows);
      setTotal(res.total);
      setDetectedType(res.type);
    } catch (e: any) {
      if (current !== reqId.current) return;
      toast.error(e?.message || 'Search failed');
      setRows([]);
      setTotal(0);
    } finally {
      if (current === reqId.current) setLoading(false);
    }
  }, [debounced, status, categoryId, subcategoryId, division, district, shopId, dateFrom, dateTo, priceMin, priceMax, sort, page]);

  useEffect(() => {
    void runSearch();
  }, [runSearch]);

  const uiDetected = useMemo(() => (query.trim() ? detectSearchType(query) : ''), [query]);
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const toggleStatus = (s: string) => {
    setStatus((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const clearFilters = () => {
    setStatus([]); setCategoryId(null); setSubcategoryId(null); setDivision(null);
    setDistrict(null); setShopId(null); setDateFrom(''); setDateTo('');
    setPriceMin(''); setPriceMax(''); setSort('newest');
  };

  const activeFilterCount =
    status.length + [categoryId, subcategoryId, division, district, shopId].filter(Boolean).length +
    (dateFrom || dateTo ? 1 : 0) + (priceMin || priceMax ? 1 : 0);

  const openDrawer = (id: string) => { setDrawerAdId(id); setDrawerOpen(true); };
  const fmtDate = (iso: string) => { try { return format(new Date(iso), 'dd MMM yyyy'); } catch { return '—'; } };

  return (
    <AdminLayout>
      <PageHeader
        title="Ad Search"
        description="Universal search across every listing — by Ad ID, slug, title, seller email or phone."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Ads' }, { label: 'Ad Search' }]}
      />

      {/* Sticky search + filter header */}
      <div className="sticky top-0 z-20 -mx-3 mb-3 border-b border-border bg-background/95 px-3 pb-3 pt-1 backdrop-blur md:-mx-4 md:px-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={PLACEHOLDER}
            className="h-11 rounded-lg pl-10 pr-28 text-sm"
            autoFocus
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
            {query && uiDetected && (
              <Badge variant="secondary" className="h-6 px-2 text-[10px] font-medium">
                {SEARCH_TYPE_LABEL[uiDetected]}
              </Badge>
            )}
            {query && (
              <button onClick={() => setQuery('')} className="rounded p-1 text-muted-foreground hover:bg-accent" aria-label="Clear">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
            {activeFilterCount > 0 && <Badge className="ml-1 h-4 px-1 text-[9px]">{activeFilterCount}</Badge>}
          </Button>

          <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
            <SelectTrigger className="h-7 w-[150px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <span className="ml-auto text-[11px] text-muted-foreground">
            {loading ? 'Searching…' : `${total.toLocaleString()} result${total === 1 ? '' : 's'}`}
            {detectedType && total > 0 && !loading && ` · matched by ${detectedType}`}
          </span>
        </div>

        {showFilters && (
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-md border border-border bg-card p-2 sm:grid-cols-3 lg:grid-cols-4">
            {/* Status multi-toggle */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-4">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
              <div className="flex flex-wrap gap-1">
                {AD_STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleStatus(s)}
                    className={`rounded-md border px-2 py-0.5 text-[11px] capitalize transition-colors ${
                      status.includes(s) ? statusBadgeClass(s) : 'border-border text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <FilterSelect label="Category" value={categoryId} onChange={(v) => { setCategoryId(v); setSubcategoryId(null); }}
              options={categories.map((c) => ({ value: c.id, label: c.name }))} />
            <FilterSelect label="Subcategory" value={subcategoryId} onChange={setSubcategoryId} disabled={!categoryId}
              options={subcategories.map((c) => ({ value: c.id, label: c.name }))} />
            <FilterSelect label="Division" value={division} onChange={(v) => { setDivision(v); setDistrict(null); }}
              options={DIVISIONS.map((d) => ({ value: d, label: d }))} />
            <FilterSelect label="District" value={district} onChange={setDistrict} disabled={!division}
              options={(division ? DISTRICTS[division] || [] : []).map((d) => ({ value: d, label: d }))} />
            <FilterSelect label="Shop" value={shopId} onChange={setShopId}
              options={shops.map((s) => ({ value: s.id, label: s.name }))} />

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Date from</p>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-7 text-xs" />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Date to</p>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-7 text-xs" />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Min price</p>
              <Input type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="0" className="h-7 text-xs" />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Max price</p>
              <Input type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="∞" className="h-7 text-xs" />
            </div>

            <div className="col-span-2 flex items-end justify-end sm:col-span-3 lg:col-span-4">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>Clear all</Button>
            </div>
          </div>
        )}
      </div>

      {/* Results table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="max-h-[calc(100vh-260px)] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 w-[52px] text-[11px]">Image</TableHead>
                <TableHead className="h-8 text-[11px]">Ad ID</TableHead>
                <TableHead className="h-8 text-[11px]">Title</TableHead>
                <TableHead className="h-8 text-[11px]">Category</TableHead>
                <TableHead className="h-8 text-[11px]">Seller</TableHead>
                <TableHead className="h-8 text-[11px]">Phone</TableHead>
                <TableHead className="h-8 text-[11px]">Email</TableHead>
                <TableHead className="h-8 text-[11px]">Price</TableHead>
                <TableHead className="h-8 text-[11px]">Status</TableHead>
                <TableHead className="h-8 text-[11px]">Created</TableHead>
                <TableHead className="h-8 text-[11px]">Updated</TableHead>
                <TableHead className="h-8 text-right text-[11px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={12} className="py-2"><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="py-16 text-center">
                    <Search className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      {debounced || activeFilterCount ? 'No listings match your search.' : 'Start typing to search across every listing.'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer text-[13px] hover:bg-accent/50"
                    onClick={() => openDrawer(r.id)}
                  >
                    <TableCell className="py-1.5">
                      {r.thumbnail ? (
                        <img src={r.thumbnail} alt="" loading="lazy" className="h-9 w-9 rounded-md border border-border object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted">
                          <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5 font-mono text-[11px] text-muted-foreground">{r.id.slice(0, 8)}</TableCell>
                    <TableCell className="max-w-[220px] py-1.5">
                      <span className="line-clamp-1 font-medium">{r.title}</span>
                      <span className="line-clamp-1 text-[11px] text-muted-foreground">{r.slug}</span>
                    </TableCell>
                    <TableCell className="py-1.5 text-[12px]">
                      {r.category_name || '—'}
                      {r.subcategory_name && <span className="block text-[11px] text-muted-foreground">{r.subcategory_name}</span>}
                    </TableCell>
                    <TableCell className="max-w-[130px] py-1.5">
                      <span className="line-clamp-1">{r.seller_name || '—'}</span>
                    </TableCell>
                    <TableCell className="py-1.5 text-[12px]">{r.contact_phone || r.seller_phone || '—'}</TableCell>
                    <TableCell className="max-w-[150px] py-1.5 text-[12px]">
                      <span className="line-clamp-1">{r.seller_email || '—'}</span>
                    </TableCell>
                    <TableCell className="py-1.5 text-[12px] font-medium">{formatPrice(r.price, r.price_type)}</TableCell>
                    <TableCell className="py-1.5">
                      <Badge variant="outline" className={`h-5 px-1.5 text-[10px] capitalize ${statusBadgeClass(r.status)}`}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5 text-[11px] text-muted-foreground">{fmtDate(r.created_at)}</TableCell>
                    <TableCell className="py-1.5 text-[11px] text-muted-foreground">{fmtDate(r.updated_at)}</TableCell>
                    <TableCell className="py-1.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-0.5">
                        <IconAction title="View" to={`/ad/${r.slug}-${r.id}`}><Eye className="h-3.5 w-3.5" /></IconAction>
                        <IconAction title="Edit" to={`/ad/${r.slug}-${r.id}/edit`}><Pencil className="h-3.5 w-3.5" /></IconAction>
                        <IconBtn title="Moderate" onClick={() => openDrawer(r.id)}><Gavel className="h-3.5 w-3.5" /></IconBtn>
                        <IconBtn title="Audit Log" onClick={() => openDrawer(r.id)}><History className="h-3.5 w-3.5" /></IconBtn>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <span className="text-[11px] text-muted-foreground">
              Page {page} of {totalPages} · {total.toLocaleString()} listings
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(p - 1, 1))}>
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </Button>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(p + 1, totalPages))}>
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AdDetailsDrawer
        adId={drawerAdId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onChanged={runSearch}
      />
    </AdminLayout>
  );
}

function FilterSelect({
  label, value, onChange, options, disabled,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? null : v)} disabled={disabled}>
        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={`Any ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL} className="text-xs">Any {label.toLowerCase()}</SelectItem>
          {options.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function IconAction({ title, to, children }: { title: string; to: string; children: React.ReactNode }) {
  return (
    <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title={title}>
      <Link to={to}>{children}</Link>
    </Button>
  );
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title={title} onClick={onClick}>
      {children}
    </Button>
  );
}
