import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';

const sections = [
  {
    title: '1. What we collect',
    body: 'Account details (name, email, phone), profile info, listings you post, messages, offers, device/browser data for security, and usage data that helps us run search and recommendations.',
  },
  {
    title: '2. How we use it',
    body: 'To operate the marketplace, show your ads, enable chat and offers, process memberships, prevent fraud, send service notifications you opt into, and improve product quality.',
  },
  {
    title: '3. Who can see what',
    body: 'Public profile fields and active listings are visible to other users. Private data (email, phone unless you share it, payment history, support tickets) stays limited to you and authorized staff.',
  },
  {
    title: '4. Messages & offers',
    body: 'Conversations and offers are stored so both parties have a record. We may review reported content for safety. Don’t share passwords, OTPs, or bank codes in chat.',
  },
  {
    title: '5. Cookies & devices',
    body: 'We use cookies and similar tech for login sessions, preferences, and basic analytics. You can control cookies in your browser; some features need them to work.',
  },
  {
    title: '6. Sharing',
    body: 'We don’t sell your personal data. We may share limited data with payment providers, hosting/infrastructure vendors, or authorities when required by law or to stop abuse.',
  },
  {
    title: '7. Retention',
    body: 'We keep account and transaction records as long as needed to run the service and meet legal obligations. You can request deletion of your account through support.',
  },
  {
    title: '8. Your choices',
    body: 'Update your profile anytime. Control notification preferences. Request a copy of your data or account closure via Customer support. Some records may remain for fraud prevention or legal reasons.',
  },
  {
    title: '9. Security',
    body: 'We use industry-standard safeguards, but no system is perfect. Use a strong password and treat unexpected payment requests as suspicious.',
  },
  {
    title: '10. Contact',
    body: 'Privacy questions? Reach us through Contact or Customer support. We’ll respond as soon as we can.',
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Privacy Policy — BazarBD</title>
        <meta name="description" content="How BazarBD collects, uses, and protects your data." />
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 pb-24 lg:pb-12 max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Legal</p>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: July 22, 2026</p>

        <div className="space-y-8">
          <p className="text-muted-foreground leading-relaxed">
            This explains what we collect and why — in plain language. For product rules, see{' '}
            <Link to="/terms" className="text-primary underline-offset-4 hover:underline">
              Terms of Service
            </Link>
            .
          </p>
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold mb-2">{s.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3 text-sm">
          <Link to="/terms" className="text-primary underline-offset-4 hover:underline">
            Terms
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/help" className="text-primary underline-offset-4 hover:underline">
            Help
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/my/support" className="text-primary underline-offset-4 hover:underline">
            Support
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
