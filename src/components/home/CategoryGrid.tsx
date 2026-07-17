import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategoryBySlug, getCategoryLogoUrl, getCategoryIcon } from '@/lib/categoryData';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

interface CategoryGridProps {
  categories: Category[];
  isLoading?: boolean;
}

export function CategoryGrid({ categories, isLoading = false }: CategoryGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="h-14 w-14 rounded-xl" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
      {categories.map((category) => {
        const logoUrl = getCategoryLogoUrl(category.slug || category.name);
        const fallback = getCategoryBySlug(category.slug || category.name);
        const Icon = getCategoryIcon(category.slug || category.name);
        const color = fallback?.color || 'bg-primary/10 text-primary';
        return (
          <Link
            key={category.id}
            to={`/category/${category.slug}`}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="h-14 w-14 rounded-xl overflow-hidden flex items-center justify-center group-hover:scale-110 transition-transform">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={category.name}
                  className="w-full h-full object-cover rounded-xl"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              {!logoUrl && (
                <div className={`w-full h-full rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              )}
              {/* Hidden fallback shown if image fails to load */}
              {logoUrl && (
                <div className={`w-full h-full rounded-xl flex items-center justify-center ${color} hidden`}>
                  <Icon className="h-6 w-6" />
                </div>
              )}
            </div>
            <h3 className="font-semibold text-xs sm:text-sm group-hover:text-primary transition-colors line-clamp-2 text-center leading-tight">
              {category.name}
            </h3>
          </Link>
        );
      })}
    </div>
  );
}
