import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORY_DATA } from '@/lib/categoryData';

export interface CategoryTreeSub {
  id: string;
  name: string;
  slug: string;
}

export interface CategoryTreeItem {
  id: string;
  name: string;
  slug: string;
  subcategories: CategoryTreeSub[];
}

// Module-level cache so the mega menu (rendered in the header on every page)
// only hits the database once per session.
let cache: CategoryTreeItem[] | null = null;
let inflight: Promise<CategoryTreeItem[]> | null = null;

/** Static fallback used when the database has no categories yet. */
function staticTree(): CategoryTreeItem[] {
  return CATEGORY_DATA.map((c) => ({
    id: c.slug,
    name: c.name,
    slug: c.slug,
    subcategories: c.subcategories.map((s) => ({ id: s.slug, name: s.name, slug: s.slug })),
  }));
}

async function loadTree(): Promise<CategoryTreeItem[]> {
  try {
    const { data: cats, error } = await supabase
      .from('categories')
      .select('id, name, slug, sort_order')
      .order('sort_order', { ascending: true });

    if (error || !cats || cats.length === 0) return staticTree();

    let subs: { id: string; name: string; slug: string; category_id: string }[] = [];
    try {
      const { data } = await supabase
        .from('subcategories')
        .select('id, name, slug, category_id')
        .order('name');
      subs = (data as typeof subs) || [];
    } catch {
      /* subcategories table is optional */
    }

    return cats.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      subcategories: subs
        .filter((s) => s.category_id === c.id)
        .map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
    }));
  } catch {
    return staticTree();
  }
}

/**
 * Returns the full category tree (main categories + their subcategories),
 * sourced from the database with a static fallback. Cached per session.
 */
export function useCategoryTree() {
  const [categories, setCategories] = useState<CategoryTreeItem[]>(cache || []);
  const [isLoading, setIsLoading] = useState(!cache);

  useEffect(() => {
    let active = true;
    if (cache) {
      setCategories(cache);
      setIsLoading(false);
      return;
    }
    if (!inflight) inflight = loadTree();
    inflight.then((tree) => {
      cache = tree;
      if (active) {
        setCategories(tree);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return { categories, isLoading };
}
