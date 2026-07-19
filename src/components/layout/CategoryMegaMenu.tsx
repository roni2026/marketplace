import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, LayoutGrid } from 'lucide-react';
import { useCategoryTree } from '@/hooks/useCategoryTree';
import { getCategoryIcon, getSubcategoryIcon } from '@/lib/categoryData';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

/**
 * Desktop mega dropdown: hover (or focus) "Categories" to reveal main
 * categories on the left; hovering/focusing a main category reveals its
 * subcategories on the right. Keyboard accessible (focus opens, Escape closes)
 * and driven entirely by database categories via useCategoryTree.
 */
export function CategoryMegaMenu() {
  const { categories } = useCategoryTree();
  const [open, setOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
    setActiveSlug((prev) => prev ?? categories[0]?.slug ?? null);
  };
  const closeMenu = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  if (categories.length === 0) return null;

  const active = categories.find((c) => c.slug === activeSlug) || categories[0];

  return (
    <div
      className="relative hidden lg:block"
      onMouseEnter={openMenu}
      onMouseLeave={closeMenu}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onFocus={openMenu}
        className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground transition-colors"
      >
        <LayoutGrid className="h-4 w-4" />
        Categories
        <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 w-[720px] max-w-[92vw] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150"
        >
          <div className="grid grid-cols-[240px_1fr]">
            {/* Main categories */}
            <ul className="max-h-[70vh] overflow-y-auto border-r p-2">
              {categories.map((cat) => {
                const Icon = getCategoryIcon(cat.slug);
                const isActive = active?.slug === cat.slug;
                return (
                  <li key={cat.id}>
                    <Link
                      to={`/category/${cat.slug}`}
                      role="menuitem"
                      onMouseEnter={() => setActiveSlug(cat.slug)}
                      onFocus={() => setActiveSlug(cat.slug)}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                        isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
                      )}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Icon className="h-4 w-4 shrink-0" />
                        {cat.name}
                      </span>
                      {cat.subcategories.length > 0 && <ChevronRight className="h-4 w-4 opacity-60" />}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Subcategories of the active category */}
            <div className="max-h-[70vh] overflow-y-auto p-4">
              {active && (
                <>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{active.name}</h3>
                    <Link
                      to={`/category/${active.slug}`}
                      onClick={() => setOpen(false)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View all
                    </Link>
                  </div>
                  {active.subcategories.length > 0 ? (
                    <div className="grid grid-cols-2 gap-1 xl:grid-cols-3">
                      {active.subcategories.map((sub) => {
                        const SubIcon = getSubcategoryIcon(active.slug, sub.slug);
                        return (
                          <Link
                            key={sub.id}
                            to={`/category/${active.slug}?subcategory=${sub.id}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          >
                            <SubIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{sub.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Browse everything in {active.name}.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Mobile-friendly expandable category navigation, intended for the mobile menu
 * sheet. Each main category expands to reveal its subcategories.
 */
export function CategoryMobileNav({ onNavigate }: { onNavigate?: () => void }) {
  const { categories } = useCategoryTree();
  if (categories.length === 0) return null;

  return (
    <Accordion type="single" collapsible className="w-full">
      {categories.map((cat) => {
        const Icon = getCategoryIcon(cat.slug);
        return (
          <AccordionItem key={cat.id} value={cat.slug} className="border-b-0">
            <AccordionTrigger className="py-2 text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {cat.name}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col">
                <Link
                  to={`/category/${cat.slug}`}
                  onClick={onNavigate}
                  className="py-1.5 pl-6 text-sm font-medium text-primary"
                >
                  View all {cat.name}
                </Link>
                {cat.subcategories.map((sub) => (
                  <Link
                    key={sub.id}
                    to={`/category/${cat.slug}?subcategory=${sub.id}`}
                    onClick={onNavigate}
                    className="py-1.5 pl-6 text-sm text-muted-foreground hover:text-foreground"
                  >
                    {sub.name}
                  </Link>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
