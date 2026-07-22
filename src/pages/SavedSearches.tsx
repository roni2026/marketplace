import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useSavedSearches } from '@/hooks/useSavedSearches';
import { Search, Trash2, Bell, MapPin, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function SavedSearches() {
  const { savedSearches, isLoading, deleteSavedSearch, toggleNotification } = useSavedSearches();

  const handleDelete = async (id: string) => {
    await deleteSavedSearch(id);
    toast.success('Saved search deleted');
  };

  const handleToggleNotify = async (id: string, notify: boolean) => {
    await toggleNotification(id, notify);
    toast.success(notify ? 'Notifications enabled' : 'Notifications disabled');
  };

  const buildSearchUrl = (search: typeof savedSearches[0]) => {
    const params = new URLSearchParams();
    if (search.query) params.set('q', search.query);
    if (search.category_id) params.set('category', search.category_id);
    if (search.min_price) params.set('min_price', String(search.min_price));
    if (search.max_price) params.set('max_price', String(search.max_price));
    if (search.condition) params.set('condition', search.condition);
    if (search.division) params.set('division', search.division);
    if (search.district) params.set('district', search.district);
    return `/search?${params.toString()}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Saved Searches — BazarBD</title>
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="mb-6 flex items-center gap-3">
          <Search className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Saved Searches</h1>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : savedSearches.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <h3 className="font-semibold mb-1">No saved searches</h3>
              <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">
                Run a search, then save it to get alerts when new ads match your filters.
              </p>
              <div className="flex justify-center gap-2">
                <Button asChild>
                  <Link to="/search">Start a search</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/account">My account</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedSearches.map((search) => (
              <Card key={search.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate">{search.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        Saved {formatDistanceToNow(new Date(search.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive shrink-0"
                      onClick={() => handleDelete(search.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {search.query && (
                      <Badge variant="secondary" className="gap-1">
                        <Search className="h-3 w-3" />
                        {search.query}
                      </Badge>
                    )}
                    {search.min_price != null && (
                      <Badge variant="secondary">Min: ৳{search.min_price}</Badge>
                    )}
                    {search.max_price != null && (
                      <Badge variant="secondary">Max: ৳{search.max_price}</Badge>
                    )}
                    {search.condition && (
                      <Badge variant="secondary" className="capitalize">
                        <Tag className="h-3 w-3" />
                        {search.condition}
                      </Badge>
                    )}
                    {search.division && (
                      <Badge variant="secondary" className="gap-1">
                        <MapPin className="h-3 w-3" />
                        {search.division}
                      </Badge>
                    )}
                    {search.district && (
                      <Badge variant="secondary">{search.district}</Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Notify on match</span>
                      <Switch
                        checked={search.notify_on_match || false}
                        onCheckedChange={(checked) => handleToggleNotify(search.id, checked)}
                      />
                    </div>
                    <Link to={buildSearchUrl(search)}>
                      <Button variant="outline" size="sm">View Results</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
