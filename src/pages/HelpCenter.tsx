import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Search,
  ShoppingBag,
  Shield,
  CreditCard,
  MessageCircle,
  User,
  Store,
  HelpCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';

const topics = [
  {
    icon: ShoppingBag,
    title: 'Buying',
    blurb: 'Search, contact sellers, and complete a purchase safely.',
    href: '/search',
  },
  {
    icon: Store,
    title: 'Selling',
    blurb: 'Post ads, manage listings, and track inquiries.',
    href: '/seller-portal',
  },
  {
    icon: Shield,
    title: 'Safety',
    blurb: 'Tips to avoid scams and trade with confidence.',
    href: '/safety',
  },
  {
    icon: CreditCard,
    title: 'Membership & billing',
    blurb: 'Plans, benefits, invoices, and payment history.',
    href: '/membership-plans',
  },
  {
    icon: MessageCircle,
    title: 'Messages',
    blurb: 'Chat with buyers and sellers about listings.',
    href: '/messages',
  },
  {
    icon: User,
    title: 'Your account',
    blurb: 'Profile, addresses, preferences, and privacy.',
    href: '/profile',
  },
];

const faqs = [
  {
    q: 'How do I post an ad?',
    a: 'Sign in, tap Sell or Post ad, add photos, a clear title, price, and location, then submit. Most ads go live after a quick review.',
  },
  {
    q: 'Why is my ad still pending?',
    a: 'New and edited listings are checked for quality and policy compliance. This usually takes a short time. You’ll get a notification when it’s approved or if changes are needed.',
  },
  {
    q: 'How do I contact a seller?',
    a: 'Open the listing and use Message seller. Keep the chat on the platform so you have a record of the conversation.',
  },
  {
    q: 'Can I edit or delete my listing?',
    a: 'Yes. Go to My ads or Seller portal, open the listing, and choose edit, mark as sold, or delete.',
  },
  {
    q: 'How do memberships work?',
    a: 'Membership plans unlock higher limits, promotions, and shop tools. Compare plans on the membership page and manage billing anytime from your account.',
  },
  {
    q: 'I found a suspicious listing. What should I do?',
    a: 'Use Report on the listing or message. Don’t share OTPs, pay deposits to unknown accounts, or meet in isolated places. See our safety tips for more.',
  },
  {
    q: 'How do I change my password or notification settings?',
    a: 'Open Profile for account details, and Notification preferences to control email and push alerts.',
  },
  {
    q: 'Still stuck?',
    a: 'Open a support ticket from Customer support. Include your account email, listing link if relevant, and a short description of the issue.',
  },
];

export default function HelpCenter() {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(
      (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Help Center — BazarBD</title>
        <meta
          name="description"
          content="Get help buying, selling, and managing your BazarBD account."
        />
      </Helmet>
      <Header />
      <main className="flex-1">
        <section className="border-b bg-muted/40">
          <div className="container mx-auto px-4 py-10 md:py-14 max-w-3xl text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
              <HelpCircle className="h-6 w-6" />
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">
              How can we help?
            </h1>
            <p className="text-muted-foreground mb-6">
              Quick answers for buyers, sellers, and shop owners — written the way you’d ask a person.
            </p>
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search help articles…"
                className="pl-9 h-11 bg-background"
              />
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-8 md:py-10 pb-24 lg:pb-10 space-y-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((topic) => (
              <Link key={topic.title} to={topic.href} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-muted/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground">
                        <topic.icon className="h-4 w-4" />
                      </span>
                      <CardTitle className="text-base font-medium">{topic.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">{topic.blurb}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <section className="max-w-3xl mx-auto">
            <h2 className="text-lg font-semibold mb-4">Common questions</h2>
            {filtered.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground text-sm">
                  No matches for “{query}”. Try another phrase or{' '}
                  <Link to="/my/support" className="text-primary underline-offset-4 hover:underline">
                    contact support
                  </Link>
                  .
                </CardContent>
              </Card>
            ) : (
              <Accordion type="single" collapsible className="rounded-xl border bg-card px-4">
                {filtered.map((item, idx) => (
                  <AccordionItem key={item.q} value={`faq-${idx}`} className="border-border/80">
                    <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </section>

          <Card className="max-w-3xl mx-auto border-dashed">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-6">
              <div>
                <p className="font-medium">Need a human?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Open a ticket and we’ll get back to you as soon as we can.
                </p>
              </div>
              <Link
                to="/my/support"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Contact support
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
