/**
 * Categories — Professional category browser with search, filtering,
 * expandable subcategories, and rich lucide-react icons.
 *
 * Features:
 * - Always shows static CATEGORY_DATA immediately (no blank page)
 * - Enhances with DB categories/subcategories when available
 * - Live search across categories and subcategories
 * - Grid layout with category cards showing icon, name, description
 * - Expandable subcategory lists with individual icons
 * - "View All" toggle per category for large subcategory lists
 * - Stats bar showing total categories and subcategories
 * - Responsive: 1 col mobile, 2 col tablet, 3-4 col desktop
 * - Dark mode support
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FolderTree, ChevronRight, ChevronDown, Search, AlertCircle,
  LayoutGrid, List, Package, ArrowRight, X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import {
  CATEGORY_DATA, searchCategories, TOTAL_CATEGORIES, TOTAL_SUBCATEGORIES,
  type CategoryDef,
} from '@/lib/categoryData';

interface DBCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  subcategories?: DBSubcategory[];
}

interface DBSubcategory {
  id: string;
  name: string;
  slug: string;
  category_id: string;
}

type ViewMode = 'grid' | 'list';

export default function Categories() {
  const { t } = useTranslation();
  const [dbCategories, setDbCategories] = useState<DBCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('id, name, slug, icon, sort_order')
        .order('sort_order', { ascending: true });

      if (catError) throw catError;

      if (!catData || catData.length === 0) {
        // DB is empty — use static fallback data
        setDbCategories([]);
        setIsLoading(false);
        return;
      }

      let subcategories: DBSubcategory[] = [];
      try {
        const { data: subData } = await supabase
          .from('subcategories')
          .select('id, name, slug, category_id')
          .order('name');
        subcategories = subData || [];
      } catch {
        // Subcategories table might not exist
      }

      const categoriesWithSubs: DBCategory[] = catData.map(cat => ({
        ...cat,
        subcategories: subcategories.filter(sub => sub.category_id === cat.id),
      }));

      setDbCategories(categoriesWithSubs);
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Silently fall back to static data
      setDbCategories([]);
    }
    setIsLoading(false);
  };

  const toggleExpand = useCallback((catId: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }, []);

  // Build the display list: use DB data if available, otherwise static fallback.
  // Always have content — never show an empty page.
  const activeCategories: CategoryDef[] = useMemo(() => {
    // If we have DB categories, map them (merging with static icons/descriptions)
    if (dbCategories.length > 0) {
      return dbCategories
        .map(dbCat => {
          const fallback = CATEGORY_DATA.find(fc => fc.slug === dbCat.slug || fc.name === dbCat.name);
          const icon = fallback?.icon;
          const color = fallback?.color || 'text-primary bg-primary/10';
          const description = fallback?.description || '';
          const fallbackSubs = fallback?.subcategories || [];

          const dbSubs = (dbCat.subcategories || []).map(dbSub => {
            const fallbackSub = fallbackSubs.find(fs => fs.slug === dbSub.slug || fs.name === dbSub.name);
            return {
              id: dbSub.id,
              name: dbSub.name,
              slug: dbSub.slug,
              icon: fallbackSub?.icon,
            };
          });

          // If DB has no subcategories, use fallback
          const subs = dbSubs.length > 0 ? dbSubs : fallbackSubs;

          return {
            id: dbCat.id,
            name: dbCat.name,
            slug: dbCat.slug,
            icon: icon || Package,
            color,
            description,
            subcategories: searchQuery
              ? subs.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
              : subs,
          };
        })
        .filter(cat => {
          if (!searchQuery) return true;
          const lower = searchQuery.toLowerCase();
          return cat.name.toLowerCase().includes(lower) ||
                 cat.description.toLowerCase().includes(lower) ||
                 cat.subcategories.length > 0;
        });
    }

    // No DB data — use static fallback (always available)
    return searchCategories(searchQuery);
  }, [dbCategories, searchQuery]);

  const totalSubs = useMemo(() =>
    activeCategories.reduce((sum, cat) => sum + cat.subcategories.length, 0),
  [activeCategories]);

  const usingFallback = dbCategories.length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header hideSearch />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8 max-w-7xl">
        {/* Header Section */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FolderTree className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {t('nav.categories', 'Browse Categories')}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Explore {activeCategories.length} categories & {totalSubs} subcategories
                </p>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border bg-card p-0.5">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search categories or subcategories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-11"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-4 flex-wrap">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1">
              <Package className="h-3.5 w-3.5" />
              {activeCategories.length} categories
            </Badge>
            <Badge variant="secondary" className="gap-1.5 px-3 py-1">
              <FolderTree className="h-3.5 w-3.5" />
              {totalSubs} subcategories
            </Badge>
            {usingFallback && !isLoading && (
              <Badge variant="outline" className="gap-1.5 px-3 py-1 text-amber-600 border-amber-300">
                <AlertCircle className="h-3.5 w-3.5" />
                Using default catalog
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <CategoryGridSkeleton />
        ) : activeCategories.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold text-lg mb-2">No Results Found</h3>
              <p className="text-muted-foreground text-sm mb-4">
                No categories match "{searchQuery}". Try a different search term.
              </p>
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <CategoryGrid
            categories={activeCategories}
            expandedCats={expandedCats}
            onToggleExpand={toggleExpand}
          />
        ) : (
          <CategoryList
            categories={activeCategories}
            expandedCats={expandedCats}
            onToggleExpand={toggleExpand}
          />
        )}
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}

// ============================================================================
// Category Grid View
// ============================================================================

function CategoryGrid({
  categories,
  expandedCats,
  onToggleExpand,
}: {
  categories: CategoryDef[];
  expandedCats: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {categories.map((category) => {
        const Icon = category.icon;
        const isExpanded = expandedCats.has(category.id);
        const visibleSubs = isExpanded ? category.subcategories : category.subcategories.slice(0, 5);
        const hasMore = category.subcategories.length > 5;

        return (
          <div key={category.id} className="space-y-2">
            <Link to={`/category/${category.slug}`}>
              <Card className="hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group h-full overflow-hidden">
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${category.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {category.subcategories.length}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1">
                      {category.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {category.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Subcategory chips */}
            {category.subcategories.length > 0 && (
              <div className="px-1 space-y-1">
                <div className="flex flex-wrap gap-1.5">
                  {visibleSubs.map((sub) => {
                    const SubIcon = sub.icon;
                    return (
                      <Link
                        key={sub.id}
                        to={`/search?category=${category.slug}&subcategory=${sub.slug}`}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-all duration-200 group/sub"
                      >
                        {SubIcon && <SubIcon className="h-3 w-3 opacity-60 group-hover/sub:opacity-100" />}
                        {sub.name}
                      </Link>
                    );
                  })}
                </div>
                {hasMore && (
                  <button
                    onClick={() => onToggleExpand(category.id)}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 text-muted-foreground hover:text-primary transition-colors font-medium"
                  >
                    {isExpanded ? (
                      <>Show less <ChevronDown className="h-3 w-3 rotate-180" /></>
                    ) : (
                      <>+{category.subcategories.length - 5} more <ChevronRight className="h-3 w-3" /></>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Category List View
// ============================================================================

function CategoryList({
  categories,
  expandedCats,
  onToggleExpand,
}: {
  categories: CategoryDef[];
  expandedCats: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {categories.map((category) => {
        const Icon = category.icon;
        const isExpanded = expandedCats.has(category.id);

        return (
          <Card key={category.id} className="overflow-hidden">
            <CardContent className="p-0">
              {/* Category Header Row */}
              <div className="flex items-center gap-3 p-4 hover:bg-accent/30 transition-colors">
                <Link to={`/category/${category.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${category.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {category.description}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {category.subcategories.length} subcategories
                  </Badge>
                  {category.subcategories.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onToggleExpand(category.id)}
                    >
                      <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </Button>
                  )}
                </div>
              </div>

              {/* Expandable Subcategory List */}
              {isExpanded && category.subcategories.length > 0 && (
                <div className="border-t bg-muted/30 p-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {category.subcategories.map((sub) => {
                      const SubIcon = sub.icon;
                      return (
                        <Link
                          key={sub.id}
                          to={`/search?category=${category.slug}&subcategory=${sub.slug}`}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card hover:bg-primary/5 hover:text-primary transition-all duration-200 group/sub border border-transparent hover:border-primary/20"
                        >
                          {SubIcon && <SubIcon className="h-4 w-4 shrink-0 opacity-60 group-hover/sub:opacity-100" />}
                          <span className="text-xs font-medium truncate">{sub.name}</span>
                          <ArrowRight className="h-3 w-3 ml-auto shrink-0 opacity-0 group-hover/sub:opacity-100 transition-opacity" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================================
// Skeleton Loader
// ============================================================================

function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-32 rounded-lg" />
          <div className="flex flex-wrap gap-1.5 px-1">
            <Skeleton className="h-6 w-20 rounded-lg" />
            <Skeleton className="h-6 w-16 rounded-lg" />
            <Skeleton className="h-6 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
