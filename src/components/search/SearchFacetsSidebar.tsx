/**
 * SearchFacetsSidebar — Renders clickable facet chips from search results.
 * Allows one-click filtering by category, brand, condition, price range, and location.
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface FacetItem {
  id?: string;
  name: string;
  slug?: string;
  count: number;
}

interface PriceRange {
  min: number;
  max: number;
}

interface SearchFacets {
  categories: FacetItem[];
  brands: FacetItem[];
  conditions: FacetItem[];
  listing_types: FacetItem[];
  price_range: PriceRange;
  divisions: FacetItem[];
}

interface SearchFacetsSidebarProps {
  facets: SearchFacets | null;
  activeFilters: {
    categoryId?: string;
    brand?: string;
    condition?: string;
    listingType?: string;
    minPrice?: string;
    maxPrice?: string;
    division?: string;
  };
  onFilterChange: (key: string, value: string) => void;
  className?: string;
}

export function SearchFacetsSidebar({ facets, activeFilters, onFilterChange, className }: SearchFacetsSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    categories: true,
    brands: true,
    conditions: true,
    listing_types: false,
    price: true,
    divisions: false,
  });

  if (!facets) return null;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const FacetSection = ({ title, section, items, activeValue, filterKey }: {
    title: string; section: string; items: FacetItem[]; activeValue?: string; filterKey: string;
  }) => {
    if (!items || items.length === 0) return null;
    const expanded = expandedSections[section];
    const visibleItems = expanded ? items : items.slice(0, 5);

    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => toggleSection(section)}
          className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors"
        >
          {title}
          {items.length > 5 && (expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
        </button>
        <div className="space-y-1">
          {visibleItems.map(item => {
            const isActive = activeValue === (item.id || item.name);
            return (
              <button
                key={item.id || item.name}
                type="button"
                onClick={() => onFilterChange(filterKey, isActive ? '' : (item.id || item.name))}
                className={cn(
                  'flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                )}
              >
                <span className="truncate">{item.name}</span>
                <span className={cn('text-xs shrink-0 ml-2', isActive ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Active filters */}
      {Object.values(activeFilters).some(v => v) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Active Filters</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => {
              Object.keys(activeFilters).forEach(key => onFilterChange(key, ''));
            }}>
              Clear All
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(activeFilters).filter(([, v]) => v).map(([key, value]) => (
              <Badge key={key} variant="secondary" className="gap-1 cursor-pointer" onClick={() => onFilterChange(key, '')}>
                {value} <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Separator />

      <FacetSection title="Categories" section="categories" items={facets.categories} activeValue={activeFilters.categoryId} filterKey="categoryId" />
      <Separator />
      <FacetSection title="Brands" section="brands" items={facets.brands} activeValue={activeFilters.brand} filterKey="brand" />
      <Separator />
      <FacetSection title="Conditions" section="conditions" items={facets.conditions} activeValue={activeFilters.condition} filterKey="condition" />
      <Separator />
      <FacetSection title="Listing Types" section="listing_types" items={facets.listing_types} activeValue={activeFilters.listingType} filterKey="listingType" />
      <Separator />
      <FacetSection title="Locations" section="divisions" items={facets.divisions} activeValue={activeFilters.division} filterKey="division" />

      {/* Price range */}
      {facets.price_range && facets.price_range.max > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <span className="text-sm font-medium">Price Range</span>
            <div className="text-xs text-muted-foreground">
              ৳{facets.price_range.min.toLocaleString()} — ৳{facets.price_range.max.toLocaleString()}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Under ৳1,000', min: '0', max: '1000' },
                { label: '৳1K–5K', min: '1000', max: '5000' },
                { label: '৳5K–20K', min: '5000', max: '20000' },
                { label: '৳20K–100K', min: '20000', max: '100000' },
                { label: '৳100K+', min: '100000', max: '' },
              ].map(range => (
                <button
                  key={range.label}
                  type="button"
                  onClick={() => {
                    onFilterChange('minPrice', range.min);
                    onFilterChange('maxPrice', range.max);
                  }}
                  className="px-2 py-1 rounded-md text-xs border hover:border-primary hover:text-primary transition-colors"
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
