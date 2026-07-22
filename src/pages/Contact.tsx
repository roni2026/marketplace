import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, MessageCircle, Clock, LifeBuoy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function Contact() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error('Please fill in your name, email, and message.');
      return;
    }
    // Prefer the authenticated support inbox when signed in
    if (user) {
      toast.message('Opening your support inbox…');
      navigate('/my/support');
      return;
    }
    toast.success('Thanks — sign in to send this as a tracked support ticket.');
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Contact Us — BazarBD</title>
        <meta name="description" content="Contact BazarBD support for help with your account or listings." />
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 pb-24 lg:pb-12 max-w-5xl">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight mb-2">Contact us</h1>
          <p className="text-muted-foreground leading-relaxed">
            Questions about an order, listing, or your account? Send a note — or open a ticket if you’re already signed in.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Send a message</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="What’s this about?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      rows={6}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Share a bit of detail so we can help faster…"
                    />
                  </div>
                  <Button type="submit" className="w-full sm:w-auto">
                    {user ? 'Continue to support inbox' : 'Continue'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex gap-3">
                  <LifeBuoy className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Support inbox</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Signed-in users can track tickets in{' '}
                      <Link to="/my/support" className="text-primary underline-offset-4 hover:underline">
                        Customer support
                      </Link>
                      .
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Mail className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Email</p>
                    <p className="text-sm text-muted-foreground mt-1">support@bazarbd.com</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Clock className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Hours</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Sat–Thu, 10:00–18:00 (Maldives / regional business hours)
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <MessageCircle className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Help center</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Browse FAQs first — many answers are already there.{' '}
                      <Link to="/help" className="text-primary underline-offset-4 hover:underline">
                        Open help
                      </Link>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
