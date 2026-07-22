import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';

const sections = [
  {
    title: '1. Using BazarBD',
    body: 'BazarBD is a marketplace that connects buyers and sellers. You must provide accurate account information, keep your login secure, and use the platform lawfully. You’re responsible for activity under your account.',
  },
  {
    title: '2. Listings and content',
    body: 'Sellers must post honest descriptions, real photos, and lawful items. We may remove listings that violate our policies, mislead buyers, or appear fraudulent. Prohibited items include illegal goods, counterfeits, and content that exploits others.',
  },
  {
    title: '3. Transactions',
    body: 'Unless stated otherwise, deals are between buyers and sellers. BazarBD is not the seller of third-party listings. Inspect items, agree terms clearly, and keep payment proof. Promoted placement does not mean we endorse a seller.',
  },
  {
    title: '4. Fees and memberships',
    body: 'Some features require paid plans or promotions. Prices and benefits are shown before you purchase. Fees are generally non-refundable except where required by law or stated in a specific offer.',
  },
  {
    title: '5. Messaging and conduct',
    body: 'Don’t harass, spam, or scam other users. Keep negotiations respectful. We may limit messaging or suspend accounts that abuse the platform.',
  },
  {
    title: '6. Privacy',
    body: 'We process account and usage data to run the marketplace, improve safety, and provide support. See how we handle data in related privacy notices in your account settings where available.',
  },
  {
    title: '7. Suspension and termination',
    body: 'We may suspend or terminate accounts that break these terms, harm other users, or create legal risk. You can stop using BazarBD at any time and request account closure through support.',
  },
  {
    title: '8. Disclaimers',
    body: 'The service is provided on an “as is” basis. We work hard to keep it reliable, but we don’t guarantee uninterrupted access or that every listing is accurate. To the fullest extent allowed by law, our liability is limited.',
  },
  {
    title: '9. Changes',
    body: 'We may update these terms as the product evolves. Continued use after changes means you accept the updated terms. Material changes will be highlighted in-product when practical.',
  },
  {
    title: '10. Contact',
    body: 'Questions about these terms? Reach us via the contact page or customer support inbox.',
  },
];

export default function TermsOfService() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Terms of Service — BazarBD</title>
        <meta name="description" content="Terms of Service for using the BazarBD marketplace." />
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 pb-24 lg:pb-12 max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Legal</p>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: July 22, 2026</p>

        <div className="prose-none space-y-8">
          <p className="text-muted-foreground leading-relaxed">
            These terms explain the ground rules for using BazarBD. They’re written in plain language on purpose —
            if something important is unclear,{' '}
            <Link to="/contact" className="text-primary underline-offset-4 hover:underline">
              contact us
            </Link>
            .
          </p>
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold mb-2">{section.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3 text-sm">
          <Link to="/help" className="text-primary underline-offset-4 hover:underline">
            Help center
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/safety" className="text-primary underline-offset-4 hover:underline">
            Safety tips
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/privacy" className="text-primary underline-offset-4 hover:underline">
            Privacy
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/contact" className="text-primary underline-offset-4 hover:underline">
            Contact
          </Link>
        </div>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
