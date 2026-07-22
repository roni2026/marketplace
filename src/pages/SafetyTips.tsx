import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Shield,
  MapPin,
  Banknote,
  MessageSquareWarning,
  Eye,
  Users,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

const tips = [
  {
    icon: MapPin,
    title: 'Meet in public',
    body: 'Choose busy places — malls, cafés, or police-station vicinity meeting spots. Bring a friend when you can.',
  },
  {
    icon: Banknote,
    title: 'Pay carefully',
    body: 'Prefer cash on delivery or trusted payment methods. Never send deposits to strangers or share banking OTPs.',
  },
  {
    icon: MessageSquareWarning,
    title: 'Keep chat on-platform',
    body: 'Scammers often push you to WhatsApp or email quickly. Staying in Messages keeps a record if something goes wrong.',
  },
  {
    icon: Eye,
    title: 'Inspect before you buy',
    body: 'Check the item in person. Test electronics, verify documents for vehicles/property, and compare with the listing photos.',
  },
  {
    icon: Users,
    title: 'Trust signals matter',
    body: 'Look for verified badges, complete profiles, clear photos, and realistic prices. Too-good-to-be-true usually is.',
  },
  {
    icon: AlertTriangle,
    title: 'Report problems early',
    body: 'Use Report on listings or messages. If you feel unsafe, leave the meetup and contact local authorities if needed.',
  },
];

const redFlags = [
  'Seller refuses to meet or only accepts advance payment',
  'Pressure to decide immediately or “last item” urgency',
  'Requests for gift cards, crypto, or payment to a third party',
  'Listing photos look stolen or descriptions are copy-pasted',
  'Buyer/seller asks for your NID, OTP, or remote access to your phone',
];

export default function SafetyTips() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Safety Tips — BazarBD</title>
        <meta
          name="description"
          content="Practical safety tips for buying and selling on BazarBD."
        />
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 pb-24 lg:pb-12 max-w-4xl">
        <div className="mb-8">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 mb-4">
            <Shield className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">Stay safe on BazarBD</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Most people here are genuine. A few aren’t. These habits keep deals smooth without making the experience feel paranoid.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          {tips.map((tip) => (
            <Card key={tip.title} className="shadow-none">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <tip.icon className="h-4 w-4" />
                  </span>
                  <CardTitle className="text-base font-medium">{tip.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{tip.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mb-8 border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Red flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {redFlags.map((flag) => (
                <li key={flag} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-600 shrink-0" />
                  {flag}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-6">
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">See something off?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Report the listing or open a support ticket. We review reports every day.
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Link
                to="/help"
                className="inline-flex h-10 flex-1 sm:flex-none items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
              >
                Help center
              </Link>
              <Link
                to="/my/support"
                className="inline-flex h-10 flex-1 sm:flex-none items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Contact support
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
