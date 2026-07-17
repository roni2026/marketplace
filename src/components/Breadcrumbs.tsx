import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronRight, Home } from 'lucide-react';
import { buildBreadcrumbList, type BreadcrumbItem } from '@/lib/seo/structuredData';
import { getBaseUrl } from '@/lib/seo/urls';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  const schema = buildBreadcrumbList(
    items.map((item) => ({
      name: item.name,
      url: item.url.startsWith('http') ? item.url : `${getBaseUrl()}${item.url}`,
    }))
  );

  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      </Helmet>
      <nav aria-label="Breadcrumb" className={`py-2 ${className}`}>
        <ol className="flex items-center flex-wrap gap-1 text-sm text-muted-foreground">
          <li>
            <Link to="/" className="flex items-center hover:text-foreground transition-colors">
              <Home className="h-3.5 w-3.5" />
            </Link>
          </li>
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            return (
              <React.Fragment key={i}>
              <li className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                {isLast || !item.url ? (
                  <span className="text-foreground font-medium truncate max-w-[200px]" aria-current="page">
                    {item.name}
                  </span>
                ) : (
                  <Link to={item.url} className="hover:text-foreground transition-colors truncate max-w-[200px]">
                    {item.name}
                  </Link>
                )}
              </li>
              </React.Fragment>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
