import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, ArrowLeft, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface Conversation {
  id: string;
  other_user_id: string;
  other_user_name: string;
  ad_id: string | null;
  ad_title: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export default function Messages() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [tableExists, setTableExists] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      fetchConversations();
    }
  }, [user, authLoading, navigate]);

  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id, sender_id, receiver_id, body, is_read, created_at,
          ad_id
        `)
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        if (error.message?.includes('relation') || error.message?.includes('does not exist') || error.code === '42P01') {
          setTableExists(false);
          setConversations([]);
        } else {
          setConversations([]);
        }
      } else if (data && data.length > 0) {
        // Group messages into conversations
        const convMap = new Map<string, Conversation>();
        for (const msg of data as any[]) {
          const otherId = msg.sender_id === user!.id ? msg.receiver_id : msg.sender_id;
          const key = `${otherId}-${msg.ad_id || 'none'}`;
          if (!convMap.has(key)) {
            convMap.set(key, {
              id: key,
              other_user_id: otherId,
              other_user_name: 'User',
              ad_id: msg.ad_id,
              ad_title: null,
              last_message: msg.body,
              last_message_at: msg.created_at,
              unread_count: 0,
            });
          } else {
            const conv = convMap.get(key)!;
            if (!conv.last_message_at || new Date(msg.created_at) > new Date(conv.last_message_at)) {
              conv.last_message = msg.body;
              conv.last_message_at = msg.created_at;
            }
          }
          if (msg.receiver_id === user!.id && !msg.is_read) {
            convMap.get(key)!.unread_count++;
          }
        }
        setConversations(Array.from(convMap.values()).sort((a, b) =>
          new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
        ));
      } else {
        setConversations([]);
      }
    } catch {
      setTableExists(false);
      setConversations([]);
    }
    setIsLoading(false);
  };

  const fetchMessages = async (conversation: Conversation) => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${conversation.other_user_id}),and(sender_id.eq.${conversation.other_user_id},receiver_id.eq.${user!.id})`)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data as Message[]);
        // Mark as read
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('sender_id', conversation.other_user_id)
          .eq('receiver_id', user!.id)
          .eq('is_read', false);
      }
    } catch {
      setMessages([]);
    }
    setIsLoadingMessages(false);
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    fetchMessages(conv);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;
    setIsSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: selectedConversation.other_user_id,
        ad_id: selectedConversation.ad_id,
        body: newMessage.trim(),
        is_read: false,
      });
      if (error) throw error;
      setNewMessage('');
      fetchMessages(selectedConversation);
      fetchConversations();
    } catch (err: any) {
      toast.error('Could not send message');
    }
    setIsSending(false);
  };

  const filteredConversations = conversations.filter(c =>
    !searchQuery || c.other_user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t('nav.messages', 'Messages')}</h1>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : !tableExists ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold text-lg mb-2">Messaging Coming Soon</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                The messaging system is being set up. You'll be able to chat with sellers and buyers 
                about listings once it's active.
              </p>
            </CardContent>
          </Card>
        ) : conversations.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold text-lg mb-2">No Messages Yet</h3>
              <p className="text-muted-foreground text-sm">
                Start a conversation by contacting a seller from their listing page.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/search')}>
                Browse Listings
              </Button>
            </CardContent>
          </Card>
        ) : selectedConversation ? (
          /* Chat view */
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedConversation(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to conversations
            </Button>
            <Card>
              <CardContent className="p-4">
                <div className="border-b pb-3 mb-3">
                  <p className="font-semibold">{selectedConversation.other_user_name}</p>
                  {selectedConversation.ad_title && (
                    <p className="text-sm text-muted-foreground">Re: {selectedConversation.ad_title}</p>
                  )}
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                  {isLoadingMessages ? (
                    <div className="text-center py-8">
                      <Skeleton className="h-8 w-32 mx-auto" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No messages in this conversation</p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === user!.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 text-sm ${
                            msg.sender_id === user!.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p>{msg.body}</p>
                          <p className={`text-xs mt-1 ${msg.sender_id === user!.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Conversation list */
          <div className="space-y-3">
            {conversations.length > 5 && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="pl-10"
                />
              </div>
            )}
            {filteredConversations.map((conv) => (
              <Card
                key={conv.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleSelectConversation(conv)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm truncate">{conv.other_user_name}</h4>
                      {conv.unread_count > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{conv.last_message}</p>
                    {conv.last_message_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(conv.last_message_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
