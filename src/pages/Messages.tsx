import { useEffect, useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/hooks/useAuth';
import { Send, MessageCircle, ArrowLeft, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

export default function Messages() {
  const { user } = useAuth();
  const { conversations, messages, unreadCount, isLoading, activeConversationUserId,
    setActiveConversationUserId, fetchMessages, sendMessage } = useMessages();
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConversationUserId) return;
    setIsSending(true);
    const activeConv = conversations.find(c => c.otherUserId === activeConversationUserId);
    await sendMessage(activeConversationUserId, replyText.trim(), activeConv?.adId || undefined);
    setReplyText('');
    setIsSending(false);
  };

  const activeConv = conversations.find(c => c.otherUserId === activeConversationUserId);

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Messages — BazarBD</title>
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="mb-6 flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Messages</h1>
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>

        <Card className="h-[600px] flex">
          {/* Conversation List */}
          <div className={`w-full md:w-80 border-r border-border flex flex-col ${activeConversationUserId ? 'hidden md:flex' : ''}`}>
            <div className="p-4 border-b border-border">
              <p className="text-sm font-medium text-muted-foreground">Conversations</p>
            </div>
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {conversations.map((conv) => (
                    <button
                      key={`${conv.otherUserId}-${conv.adId}`}
                      onClick={() => {
                        setActiveConversationUserId(conv.otherUserId);
                        fetchMessages(conv.otherUserId, conv.adId || undefined);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left ${
                        activeConversationUserId === conv.otherUserId ? 'bg-accent' : ''
                      }`}
                    >
                      <Avatar className="w-10 h-10 shrink-0">
                        <AvatarImage src={conv.otherUserAvatar || undefined} />
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate text-sm">
                            {conv.otherUserName || 'Anonymous'}
                          </p>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage}
                        </p>
                        {conv.adTitle && (
                          <p className="text-xs text-primary truncate mt-0.5">
                            Re: {conv.adTitle}
                          </p>
                        )}
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col ${!activeConversationUserId ? 'hidden md:flex' : ''}`}>
            {activeConversationUserId ? (
              <>
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setActiveConversationUserId(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={activeConv?.otherUserAvatar || undefined} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {activeConv?.otherUserName || 'Anonymous'}
                    </p>
                    {activeConv?.adTitle && (
                      <Link to={`/ad/${activeConv.adId}`} className="text-xs text-primary hover:underline truncate">
                        {activeConv.adTitle}
                      </Link>
                    )}
                  </div>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <p>No messages in this conversation</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg px-4 py-2 ${
                            msg.sender_id === user?.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                          <p className={`text-xs mt-1 ${
                            msg.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSend} className="p-4 border-t border-border flex gap-2">
                  <Input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type a message..."
                    disabled={isSending}
                  />
                  <Button type="submit" size="icon" disabled={isSending || !replyText.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Select a conversation to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
