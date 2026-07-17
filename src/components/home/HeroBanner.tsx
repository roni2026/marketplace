import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ShieldCheck, Users, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function HeroBanner() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <section className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background py-12 md:py-24">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
          {t('homepage.heroTitle', { country: 'Bangladesh' })}
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          {t('homepage.heroSubtitle')}
        </p>
        
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('homepage.heroSearchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>
          <Button type="submit" size="lg" className="px-8">
            {t('homepage.heroSearchButton')}
          </Button>
        </form>

        {/* Popular searches - hidden on mobile */}
        <div className="mt-6 hidden md:flex flex-wrap justify-center gap-2 text-sm">
          <span className="text-muted-foreground">{t('homepage.popular')}</span>
          {['iPhone', 'Car', 'Flat', 'Laptop', 'Bike'].map((term) => (
            <button
              key={term}
              onClick={() => navigate(`/search?q=${term}`)}
              className="px-3 py-1 rounded-full bg-card border border-border hover:border-primary hover:text-primary transition-colors"
            >
              {term}
            </button>
          ))}
        </div>

        {/* Trust badges - hidden on mobile */}
        <div className="mt-10 hidden md:flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {t('homepage.freeSecure')}
          </span>
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {t('homepage.trustedBy')}
          </span>
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            {t('homepage.newAdsDaily')}
          </span>
        </div>
      </div>
    </section>
  );
}
