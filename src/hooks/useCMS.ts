import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type {
  Banner,
  BannerInsert,
  HomepageSection,
  LandingPage,
  LandingPageInsert,
  FAQEntry,
  FAQEntryInsert,
  BlogPost,
  BlogPostInsert,
  StaticPage,
  StaticPageInsert,
} from '@/integrations/supabase/types_v2_cms';
import {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  getHomepageSections,
  updateHomepageSection,
  getLandingPages,
  createLandingPage,
  getFAQEntries,
  createFAQEntry,
  updateFAQEntry,
  deleteFAQEntry,
  getBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getStaticPages,
  createStaticPage,
  updateStaticPage,
  deleteStaticPage,
} from '@/lib/cms';

export function useCMS() {
  const { user } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>([]);
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [faqEntries, setFaqEntries] = useState<FAQEntry[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [staticPages, setStaticPages] = useState<StaticPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBanners = useCallback(async () => {
    const data = await getBanners();
    setBanners(data);
  }, []);

  const addBanner = useCallback(async (data: BannerInsert) => {
    const banner = await createBanner(data);
    if (banner) {
      setBanners((prev) => [...prev, banner]);
    }
    return banner;
  }, []);

  const editBanner = useCallback(async (id: string, data: Partial<BannerInsert>) => {
    const banner = await updateBanner(id, data);
    if (banner) {
      setBanners((prev) => prev.map((b) => (b.id === id ? banner : b)));
    }
    return banner;
  }, []);

  const removeBanner = useCallback(async (id: string) => {
    await deleteBanner(id);
    setBanners((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const fetchHomepageSections = useCallback(async () => {
    const data = await getHomepageSections();
    setHomepageSections(data);
  }, []);

  const editHomepageSection = useCallback(async (id: string, config: Record<string, unknown>) => {
    const section = await updateHomepageSection(id, config);
    if (section) {
      setHomepageSections((prev) => prev.map((s) => (s.id === id ? section : s)));
    }
    return section;
  }, []);

  const fetchLandingPages = useCallback(async () => {
    const data = await getLandingPages();
    setLandingPages(data);
  }, []);

  const addLandingPage = useCallback(async (data: LandingPageInsert) => {
    const page = await createLandingPage(data);
    if (page) {
      setLandingPages((prev) => [page, ...prev]);
    }
    return page;
  }, []);

  const fetchFAQEntries = useCallback(async () => {
    const data = await getFAQEntries();
    setFaqEntries(data);
  }, []);

  const addFAQEntry = useCallback(async (data: FAQEntryInsert) => {
    const entry = await createFAQEntry(data);
    if (entry) {
      setFaqEntries((prev) => [...prev, entry]);
    }
    return entry;
  }, []);

  const editFAQEntry = useCallback(async (id: string, data: Partial<FAQEntryInsert>) => {
    await updateFAQEntry(id, data);
    setFaqEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)));
  }, []);

  const removeFAQEntry = useCallback(async (id: string) => {
    await deleteFAQEntry(id);
    setFaqEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const fetchBlogPosts = useCallback(async () => {
    const data = await getBlogPosts();
    setBlogPosts(data);
  }, []);

  const addBlogPost = useCallback(async (data: BlogPostInsert) => {
    const post = await createBlogPost(data);
    if (post) {
      setBlogPosts((prev) => [post, ...prev]);
    }
    return post;
  }, []);

  const editBlogPost = useCallback(async (id: string, data: Partial<BlogPostInsert>) => {
    await updateBlogPost(id, data);
    setBlogPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  }, []);

  const removeBlogPost = useCallback(async (id: string) => {
    await deleteBlogPost(id);
    setBlogPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const fetchStaticPages = useCallback(async () => {
    const data = await getStaticPages();
    setStaticPages(data);
  }, []);

  const addStaticPage = useCallback(async (data: StaticPageInsert) => {
    const page = await createStaticPage(data);
    if (page) {
      setStaticPages((prev) => [page, ...prev]);
    }
    return page;
  }, []);

  const editStaticPage = useCallback(async (id: string, data: Partial<StaticPageInsert>) => {
    await updateStaticPage(id, data);
    setStaticPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  }, []);

  const removeStaticPage = useCallback(async (id: string) => {
    await deleteStaticPage(id);
    setStaticPages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    Promise.all([
      fetchBanners(),
      fetchHomepageSections(),
      fetchLandingPages(),
      fetchFAQEntries(),
      fetchBlogPosts(),
      fetchStaticPages(),
    ])
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [user, fetchBanners, fetchHomepageSections, fetchLandingPages, fetchFAQEntries, fetchBlogPosts, fetchStaticPages]);

  return {
    banners,
    homepageSections,
    landingPages,
    faqEntries,
    blogPosts,
    staticPages,
    isLoading,
    error,
    fetchBanners,
    addBanner,
    editBanner,
    removeBanner,
    fetchHomepageSections,
    editHomepageSection,
    fetchLandingPages,
    addLandingPage,
    fetchFAQEntries,
    addFAQEntry,
    editFAQEntry,
    removeFAQEntry,
    fetchBlogPosts,
    addBlogPost,
    editBlogPost,
    removeBlogPost,
    fetchStaticPages,
    addStaticPage,
    editStaticPage,
    removeStaticPage,
    refetch: () => {
      fetchBanners();
      fetchHomepageSections();
      fetchLandingPages();
      fetchFAQEntries();
      fetchBlogPosts();
      fetchStaticPages();
    },
  };
}
