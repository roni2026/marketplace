import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategoryBySlug, getCategoryLogoUrl } from '@/lib/categoryData';

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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {categories.map((category) => {
        const logoUrl = getCategoryLogoUrl(category.slug || category.name);
        const fallback = getCategoryBySlug(category.slug || category.name);
        const color = fallback?.color;
        return (
          <Link key={category.id} to={`/category/${category.slug}`}>
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group h-full">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden ${color || 'bg-primary/10'}`}
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={category.name}
                      className="w-full h-full object-cover rounded-xl"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-sm font-bold text-primary">
                      {category.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-xs sm:text-sm group-hover:text-primary transition-colors line-clamp-2">
                  {category.name}
                </h3>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
