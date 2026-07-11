import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCompare } from '@/hooks/useCompare';
import { formatPrice } from '@/lib/constants';
import { X, ArrowLeft, Star, MapPin } from 'lucide-react';

export default function Compare() {
  const { products, sellers, isLoading, compareIds, removeFromCompare, clearComparison } = useCompare();

  const getSellerInfo = (sellerId: string) => sellers.find((s) => s.seller_id === sellerId);

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Compare Products — BazarBD</title>
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Compare Products</h1>
          {compareIds.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearComparison}>
              Clear All
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: compareIds.length || 2 }).map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-lg" />
            ))}
          </div>
        ) : compareIds.length === 0 ? (
          <div className="text-center py-12">
            <ArrowLeft className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No items to compare</h2>
            <p className="text-muted-foreground mb-4">
              Add items to compare by clicking the compare button on product pages.
            </p>
            <Link to="/">
              <Button>Browse Ads</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Product Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {products.map((product) => {
                const seller = getSellerInfo(product.user_id);
                return (
                  <Card key={product.id} className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 z-10"
                      onClick={() => removeFromCompare(product.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="aspect-square bg-muted rounded-t-lg overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <Link to={`/ad/${product.id}`} className="block">
                        <h3 className="font-semibold text-sm line-clamp-2 mb-2 hover:text-primary">
                          {product.title}
                        </h3>
                      </Link>
                      <p className="text-lg font-bold mb-2">{formatPrice(product.price, product.price_type)}</p>
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">{product.seller_rating.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({seller?.total_reviews || 0} reviews)
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {product.division}, {product.district}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Comparison Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Feature</TableHead>
                        {products.map((p) => (
                          <TableHead key={p.id} className="min-w-[150px]">{p.title}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Price</TableCell>
                        {products.map((p) => (
                          <TableCell key={p.id}>{formatPrice(p.price, p.price_type)}</TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Condition</TableCell>
                        {products.map((p) => (
                          <TableCell key={p.id}>
                            <Badge variant={p.condition === 'new' ? 'default' : 'secondary'}>
                              {p.condition}
                            </Badge>
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Location</TableCell>
                        {products.map((p) => (
                          <TableCell key={p.id}>{p.division}, {p.district}</TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Category</TableCell>
                        {products.map((p) => (
                          <TableCell key={p.id}>{p.category_name || 'N/A'}</TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Seller</TableCell>
                        {products.map((p) => (
                          <TableCell key={p.id}>{p.seller_name || 'Anonymous'}</TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Seller Rating</TableCell>
                        {products.map((p) => (
                          <TableCell key={p.id}>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {p.seller_rating.toFixed(1)}
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Seller Reviews</TableCell>
                        {products.map((p) => {
                          const seller = getSellerInfo(p.user_id);
                          return <TableCell key={p.id}>{seller?.total_reviews || 0}</TableCell>;
                        })}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Seller Response Rate</TableCell>
                        {products.map((p) => {
                          const seller = getSellerInfo(p.user_id);
                          return <TableCell key={p.id}>{seller?.response_rate || 0}%</TableCell>;
                        })}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Seller Followers</TableCell>
                        {products.map((p) => {
                          const seller = getSellerInfo(p.user_id);
                          return <TableCell key={p.id}>{seller?.followers || 0}</TableCell>;
                        })}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Listed</TableCell>
                        {products.map((p) => (
                          <TableCell key={p.id} className="text-xs">
                            {new Date(p.created_at).toLocaleDateString()}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
