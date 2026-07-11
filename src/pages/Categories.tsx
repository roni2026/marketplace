import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderTree, ChevronRight, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  subcategories?: Subcategory[];
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  category_id: string;
}

export default function Categories() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch categories
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('id, name, slug, icon, sort_order')
        .order('sort_order', { ascending: true });

      if (catError) throw catError;

      if (!catData || catData.length === 0) {
        setCategories([]);
        setIsLoading(false);
        return;
      }

      // Try to fetch subcategories - gracefully handle if table doesn't exist or is empty
      let subcategories: Subcategory[] = [];
      try {
        const { data: subData } = await supabase
          .from('subcategories')
          .select('id, name, slug, category_id')
          .order('name');
        subcategories = subData || [];
      } catch {
        // Subcategories table might not exist - continue without them
      }

      // Group subcategories under their parent categories
      const categoriesWithSubs: Category[] = catData.map(cat => ({
        ...cat,
        subcategories: subcategories.filter(sub => sub.category_id === cat.id),
      }));

      setCategories(categoriesWithSubs);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      setError(err?.message || 'Failed to load categories');
      setCategories([]);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="flex items-center gap-3 mb-6">
          <FolderTree className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t('nav.categories', 'Browse Categories')}</h1>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Could Not Load Categories</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <button
                onClick={fetchCategories}
                className="text-primary hover:underline text-sm"
              >
                Try again
              </button>
            </CardContent>
          </Card>
        ) : categories.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FolderTree className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold text-lg mb-2">No Categories Yet</h3>
              <p className="text-muted-foreground text-sm">
                Categories will appear here once they are added by the admin.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {categories.map((category) => (
              <div key={category.id} className="space-y-2">
                <Link to={`/category/${category.slug}`}>
                  <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group h-full">
                    <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        {category.icon ? (
                          <span className="text-2xl">{category.icon}</span>
                        ) : (
                          <span className="text-xl font-bold text-primary">
                            {category.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                          {category.name}
                        </h3>
                        {category.subcategories && category.subcategories.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {category.subcategories.length} subcategories
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Show subcategories as chips below the card */}
                {category.subcategories && category.subcategories.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-1">
                    {category.subcategories.slice(0, 3).map((sub) => (
                      <Link
                        key={sub.id}
                        to={`/search?subcategory=${sub.id}`}
                        className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        {sub.name}
                      </Link>
                    ))}
                    {category.subcategories.length > 3 && (
                      <Link
                        to={`/category/${category.slug}`}
                        className="text-xs px-2 py-1 text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-0.5"
                      >
                        +{category.subcategories.length - 3} more
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
