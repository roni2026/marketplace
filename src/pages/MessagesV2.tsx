/**
 * MessagesV2 — Full-featured real-time messaging interface.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { useMessagingSystem } from '@/hooks/useMessagingSystem';
import { useAuth } from '@/hooks/useAuth';
import { useMarketplaceExperience } from '@/hooks/useMarketplaceExperience';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { useNavigate, Link } from 'react-router-dom';
import {
  Send, Search, Pin, Archive, BellOff, MoreVertical, ArrowLeft, Paperclip,
  Image as ImageIcon, Reply, Copy, Forward, Edit, Trash2, Check, CheckCheck,
  Clock, X, MessageSquare, AlertCircle, File, Download, Eye, Flag, Ban,
  ChevronLeft, Smile,
} from 'lucide-react';
import type { ExtendedMessage, ConversationListItem, SendMessageData } from '@/integrations/supabase/types_v8_messaging';
import { CONVERSATION_REPORT_REASONS } from '@/integrations/supabase/types_v8_messaging';

function formatDateSeparator(date: string): string {
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d, yyyy');
}

function formatMessageTime(date: string): string {
  return format(new Date(date), 'h:mm a');
}

export default function MessagesV2() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const {
    conversations, messages, activeConversationId, typingIndicators,
    isLoading, isLoadingMessages, isSending, error,
    fetchConversations, selectConversation, sendMessage,
    editMessage, deleteMessageForSelf, deleteMessageForEveryone,
    copyMessage, forwardMessage,
    pinConversation, archiveConversation, muteConversation,
    markConversationUnread, deleteConversation,
    setTyping, shareProductInChat,
    createReport,
  } = useMessagingSystem();
  const { blockSeller } = useMarketplaceExperience();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<ExtendedMessage | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; isSender: boolean } | null>(null);
  const [showConvDeleteDialog, setShowConvDeleteDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchConversations();
  }, [user, fetchConversations]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Filter conversations
  const filteredConversations = conversations.filter(c => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.otherUserName?.toLowerCase().includes(q) && !c.lastMessage?.toLowerCase().includes(q)) return false;
    }
    if (filterTab === 'unread') return c.unreadCount > 0;
    if (filterTab === 'pinned') return c.isPinned;
    if (filterTab === 'archived') return c.isArchived;
    return !c.isArchived;
  }).sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
  });

  const activeConversation = conversations.find(c => c.conversation.id === activeConversationId);
  const otherUserTyping = typingIndicators.some(t => t.user_id !== user?.id && t.is_typing);

  const handleSelectConversation = useCallback(async (conv: ConversationListItem) => {
    await selectConversation(conv.conversation.id);
  }, [selectConversation]);

  const handleSend = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) return;
    if (!activeConversation) return;

    const data: SendMessageData = {
      receiver_id: activeConversation.otherUserId,
      body: newMessage.trim(),
      ad_id: activeConversation.conversation.ad_id,
      reply_to_id: replyTo?.id || undefined,
      attachments: selectedFiles.length > 0 ? selectedFiles : undefined,
    };

    const result = await sendMessage(data);
    if (result) {
      setNewMessage('');
      setReplyTo(null);
      setSelectedFiles([]);
      setFilePreviews([]);
    }
  };

  const handleTyping = (text: string) => {
    setNewMessage(text);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTyping(true);
    typingTimeoutRef.current = setTimeout(() => setTyping(false), 3000);
  };

  const handleFileSelect = (files: File[]) => {
    const validFiles: File[] = [];
    const previews: string[] = [];
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} exceeds 5MB limit`); continue; }
        validFiles.push(file);
        previews.push(URL.createObjectURL(file));
      } else {
        if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} exceeds 10MB limit`); continue; }
        validFiles.push(file);
        previews.push('');
      }
    }
    setSelectedFiles(prev => [...prev, ...validFiles]);
    setFilePreviews(prev => [...prev, ...previews]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(Array.from(e.dataTransfer.files));
  };

  const handleEditMessage = async () => {
    if (!editingMessageId || !editText.trim()) return;
    await editMessage(editingMessageId, editText.trim());
    setEditingMessageId(null);
    setEditText('');
  };

  const handleDeleteMessage = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.isSender) {
      await deleteMessageForEveryone(deleteTarget.id);
    } else {
      await deleteMessageForSelf(deleteTarget.id, false);
    }
    setShowDeleteDialog(false);
    setDeleteTarget(null);
  };

  const handleReport = async () => {
    if (!reportReason || !activeConversation) return;
    await createReport({
      reported_user_id: activeConversation.otherUserId,
      conversation_id: activeConversation.conversation.id,
      reason: reportReason as any,
      description: reportDescription || undefined,
    });
    setShowReportDialog(false);
    setReportReason('');
    setReportDescription('');
  };

  const handleBlock = async () => {
    if (!activeConversation) return;
    await blockSeller(activeConversation.otherUserId);
    setShowBlockDialog(false);
  };

  const handleCopy = async (msg: ExtendedMessage) => {
    try {
      await navigator.clipboard.writeText(msg.body);
      toast.success('Copied');
    } catch {}
  };

  const handleForward = async (msg: ExtendedMessage) => {
    // Forward to first available conversation that isn't the current one
    const target = conversations.find(c => c.conversation.id !== activeConversationId);
    if (!target) { toast.info('No other conversations to forward to'); return; }
    await forwardMessage(msg.id, target.otherUserId, target.conversation.ad_id || undefined);
    toast.success('Message forwarded');
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-0 sm:px-4 py-0 sm:py-4 max-w-7xl">
        <div className="flex h-[calc(100vh-64px)] sm:h-[calc(100vh-120px)] bg-card sm:rounded-lg sm:border overflow-hidden">
          {/* Conversation List */}
          <div className={`${activeConversationId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 border-r`}>
            <div className="p-3 border-b space-y-2">
              <h1 className="text-lg font-bold px-1">Messages</h1>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search conversations..." className="pl-8 h-9" />
              </div>
              <Tabs value={filterTab} onValueChange={setFilterTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="all" className="flex-1 text-xs">All</TabsTrigger>
                  <TabsTrigger value="unread" className="flex-1 text-xs">Unread</TabsTrigger>
                  <TabsTrigger value="pinned" className="flex-1 text-xs">Pinned</TabsTrigger>
                  <TabsTrigger value="archived" className="flex-1 text-xs">Archived</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-2 p-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">{searchQuery ? 'No conversations found' : 'No conversations yet'}</p>
                  {!searchQuery && <Button variant="outline" size="sm" onClick={() => navigate('/search')} className="mt-3">Browse Listings</Button>}
                </div>
              ) : (
                filteredConversations.map(conv => (
                  <div
                    key={conv.conversation.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`flex items-center gap-3 p-3 cursor-pointer border-b transition-colors ${
                      activeConversationId === conv.conversation.id ? 'bg-primary/5' : 'hover:bg-accent/50'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center text-sm font-medium overflow-hidden">
                        {conv.otherUserAvatar ? (
                          <img src={conv.otherUserAvatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          conv.otherUserName?.charAt(0).toUpperCase() || '?'
                        )}
                      </div>
                      {conv.otherUserOnline && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium text-sm truncate">{conv.otherUserName}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {conv.isPinned && <Pin className="h-3 w-3 text-muted-foreground" />}
                          {conv.isMuted && <BellOff className="h-3 w-3 text-muted-foreground" />}
                          <span className="text-xs text-muted-foreground">{conv.lastMessageAt ? formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false }) : ''}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs text-muted-foreground truncate">{conv.lastMessage || 'No messages yet'}</p>
                        {conv.unreadCount > 0 && <Badge variant="default" className="text-[10px] h-4 px-1.5 shrink-0">{conv.unreadCount}</Badge>}
                      </div>
                      {conv.adTitle && <p className="text-[10px] text-muted-foreground truncate mt-0.5">📦 {conv.adTitle}</p>}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button onClick={e => e.stopPropagation()} className="p-1 rounded hover:bg-accent shrink-0">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => pinConversation(conv.conversation.id, !conv.isPinned)} className="gap-2">
                          <Pin className="h-3.5 w-3.5" /> {conv.isPinned ? 'Unpin' : 'Pin'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => archiveConversation(conv.conversation.id, !conv.isArchived)} className="gap-2">
                          <Archive className="h-3.5 w-3.5" /> {conv.isArchived ? 'Unarchive' : 'Archive'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => muteConversation(conv.conversation.id, !conv.isMuted)} className="gap-2">
                          <BellOff className="h-3.5 w-3.5" /> {conv.isMuted ? 'Unmute' : 'Mute'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => markConversationUnread(conv.conversation.id, true)} className="gap-2">
                          <MessageSquare className="h-3.5 w-3.5" /> Mark Unread
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { setShowConvDeleteDialog(true); }} className="gap-2 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Panel */}
          <div className={`${activeConversationId ? 'flex' : 'hidden md:flex'} flex-col flex-1`}>
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center gap-3 p-3 border-b bg-card">
                  <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={() => selectConversation('' as any)}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="relative shrink-0">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium overflow-hidden">
                      {activeConversation.otherUserAvatar ? (
                        <img src={activeConversation.otherUserAvatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        activeConversation.otherUserName?.charAt(0).toUpperCase() || '?'
                      )}
                    </div>
                    {activeConversation.otherUserOnline && (
                      <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{activeConversation.otherUserName}</p>
                    <p className="text-xs text-muted-foreground">
                      {otherUserTyping ? 'typing...' : activeConversation.otherUserOnline ? 'Online' : activeConversation.otherUserLastSeen ? `Last seen ${formatDistanceToNow(new Date(activeConversation.otherUserLastSeen), { addSuffix: true })}` : 'Offline'}
                    </p>
                  </div>
                  {activeConversation.adTitle && (
                    <Link to={`/ad/${activeConversation.conversation.ad_id}`} className="hidden sm:block text-xs text-primary hover:underline truncate max-w-32">
                      📦 {activeConversation.adTitle}
                    </Link>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowReportDialog(true)} className="gap-2"><Flag className="h-3.5 w-3.5" /> Report</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowBlockDialog(true)} className="gap-2 text-destructive"><Ban className="h-3.5 w-3.5" /> Block User</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => muteConversation(activeConversation.conversation.id, !activeConversation.isMuted)} className="gap-2">
                        <BellOff className="h-3.5 w-3.5" /> {activeConversation.isMuted ? 'Unmute' : 'Mute'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => archiveConversation(activeConversation.conversation.id, !activeConversation.isArchived)} className="gap-2">
                        <Archive className="h-3.5 w-3.5" /> {activeConversation.isArchived ? 'Unarchive' : 'Archive'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Messages */}
                <div
                  ref={messagesContainerRef}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 relative"
                >
                  {isDragging && (
                    <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-10">
                      <p className="text-primary font-medium">Drop files here to attach</p>
                    </div>
                  )}
                  {isLoadingMessages ? (
                    <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className={`h-16 w-2/3 ${i % 2 ? 'ml-auto' : ''}`} />)}</div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <MessageSquare className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, index) => {
                        const isSender = msg.sender_id === user?.id;
                        const prevMsg = messages[index - 1];
                        const showDateSep = !prevMsg || new Date(prevMsg.created_at).toDateString() !== new Date(msg.created_at).toDateString();
                        const isDeleted = msg.deleted_for_everyone;
                        const isEdited = !!msg.edited_at;

                        return (
                          <div key={msg.id}>
                            {showDateSep && (
                              <div className="flex items-center gap-2 my-3">
                                <Separator className="flex-1" />
                                <span className="text-xs text-muted-foreground px-2">{formatDateSeparator(msg.created_at)}</span>
                                <Separator className="flex-1" />
                              </div>
                            )}
                            <div className={`group flex ${isSender ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[75%] sm:max-w-[60%] ${isSender ? 'items-end' : 'items-start'} flex flex-col`}>
                                {msg.reply_to_id && (
                                  <div className={`text-xs text-muted-foreground bg-muted rounded px-2 py-1 mb-1 ${isSender ? 'self-end' : 'self-start'}`}>
                                    <Reply className="h-3 w-3 inline mr-1" />
                                    Reply to: {messages.find(m => m.id === msg.reply_to_id)?.body.slice(0, 50) || 'Message'}
                                  </div>
                                )}
                                <div
                                  className={`rounded-lg px-3 py-2 text-sm ${
                                    isSender ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                                  } ${isDeleted ? 'italic opacity-60' : ''}`}
                                >
                                  {editingMessageId === msg.id ? (
                                    <div className="flex flex-col gap-1">
                                      <Textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2} className="bg-background text-foreground text-sm" />
                                      <div className="flex gap-1">
                                        <Button size="sm" variant="secondary" onClick={handleEditMessage}>Save</Button>
                                        <Button size="sm" variant="ghost" onClick={() => { setEditingMessageId(null); setEditText(''); }}>Cancel</Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                                      {/* Image attachments */}
                                      {msg.attachments?.filter(a => a.file_type.startsWith('image/')).map(att => (
                                        <img
                                          key={att.id}
                                          src={att.file_url}
                                          alt={att.file_name}
                                          className="mt-2 rounded cursor-pointer max-w-full"
                                          onClick={() => setExpandedImage(att.file_url)}
                                        />
                                      ))}
                                      {/* File attachments */}
                                      {msg.attachments?.filter(a => !a.file_type.startsWith('image/')).map(att => (
                                        <a key={att.id} href={att.file_url} download={att.file_name} className={`mt-2 flex items-center gap-2 p-2 rounded ${isSender ? 'bg-primary-foreground/10' : 'bg-background'} text-xs hover:underline`}>
                                          <File className="h-4 w-4 shrink-0" />
                                          <span className="truncate">{att.file_name}</span>
                                          <Download className="h-3 w-3 shrink-0" />
                                        </a>
                                      ))}
                                      {/* Product card */}
                                      {msg.message_type === 'product_card' && msg.metadata && (
                                        <Link
                                          to={`/ad/${(msg.metadata as any).ad_slug}-${(msg.metadata as any).ad_id}`}
                                          className={`mt-2 flex items-center gap-2 p-2 rounded ${isSender ? 'bg-primary-foreground/10' : 'bg-background'} hover:opacity-80 transition-opacity`}
                                        >
                                          {(msg.metadata as any).ad_image && (
                                            <img src={(msg.metadata as any).ad_image} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
                                          )}
                                          <div className="min-w-0">
                                            <p className="text-xs font-medium truncate">{(msg.metadata as any).ad_title}</p>
                                            <p className="text-xs opacity-70">{(msg.metadata as any).ad_price != null ? formatPrice((msg.metadata as any).ad_price, (msg.metadata as any).ad_price_type) : ''}</p>
                                          </div>
                                          <Eye className="h-3 w-3 shrink-0" />
                                        </Link>
                                      )}
                                    </>
                                  )}
                                </div>
                                <div className={`flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground ${isSender ? 'self-end' : 'self-start'}`}>
                                  <span>{formatMessageTime(msg.created_at)}</span>
                                  {isEdited && !isDeleted && <span>· edited</span>}
                                  {isSender && !isDeleted && (
                                    msg.status === 'read' ? <CheckCheck className="h-3 w-3 text-blue-500" /> :
                                    msg.status === 'delivered' ? <CheckCheck className="h-3 w-3" /> :
                                    <Check className="h-3 w-3" />
                                  )}
                                </div>
                                {/* Hover actions */}
                                {!isDeleted && editingMessageId !== msg.id && (
                                  <div className={`hidden group-hover:flex items-center gap-0.5 mt-0.5 ${isSender ? 'self-end' : 'self-start'}`}>
                                    <button onClick={() => { setReplyTo(msg); }} className="p-1 rounded hover:bg-accent" title="Reply"><Reply className="h-3 w-3" /></button>
                                    <button onClick={() => handleCopy(msg)} className="p-1 rounded hover:bg-accent" title="Copy"><Copy className="h-3 w-3" /></button>
                                    <button onClick={() => handleForward(msg)} className="p-1 rounded hover:bg-accent" title="Forward"><Forward className="h-3 w-3" /></button>
                                    {isSender && (
                                      <button onClick={() => { setEditingMessageId(msg.id); setEditText(msg.body); }} className="p-1 rounded hover:bg-accent" title="Edit"><Edit className="h-3 w-3" /></button>
                                    )}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button className="p-1 rounded hover:bg-accent" title="Delete"><Trash2 className="h-3 w-3" /></button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => { setDeleteTarget({ id: msg.id, isSender: false }); setShowDeleteDialog(true); }} className="gap-2 text-xs">
                                          <Trash2 className="h-3 w-3" /> Delete for me
                                        </DropdownMenuItem>
                                        {isSender && (
                                          <DropdownMenuItem onClick={() => { setDeleteTarget({ id: msg.id, isSender: true }); setShowDeleteDialog(true); }} className="gap-2 text-xs text-destructive">
                                            <Trash2 className="h-3 w-3" /> Delete for everyone
                                          </DropdownMenuItem>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {otherUserTyping && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Reply Preview */}
                {replyTo && (
                  <div className="px-3 py-2 border-t bg-muted/50 flex items-center gap-2">
                    <Reply className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Replying to: <span className="font-medium">{replyTo.body.slice(0, 60)}</span></p>
                    </div>
                    <button onClick={() => setReplyTo(null)} className="p-1 rounded hover:bg-accent"><X className="h-4 w-4" /></button>
                  </div>
                )}

                {/* File Previews */}
                {filePreviews.length > 0 && (
                  <div className="px-3 py-2 border-t flex gap-2 overflow-x-auto">
                    {filePreviews.map((preview, i) => (
                      <div key={i} className="relative shrink-0">
                        {preview ? (
                          <img src={preview} alt="" className="h-16 w-16 rounded-md object-cover" />
                        ) : (
                          <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center"><File className="h-6 w-6 text-muted-foreground" /></div>
                        )}
                        <button onClick={() => removeFile(i)} className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input Area */}
                <div className="p-3 border-t flex items-end gap-2">
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => e.target.files && handleFileSelect(Array.from(e.target.files))} />
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <Textarea
                    value={newMessage}
                    onChange={e => handleTyping(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Type a message..."
                    rows={1}
                    className="flex-1 min-h-[40px] max-h-32 resize-none"
                  />
                  <Button onClick={handleSend} disabled={(!newMessage.trim() && selectedFiles.length === 0) || isSending} className="shrink-0 gap-2">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
                <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-lg font-semibold mb-1">Your Messages</h2>
                <p className="text-sm text-muted-foreground mb-4">Select a conversation to start chatting</p>
                <Button variant="outline" onClick={() => navigate('/search')}>Browse Listings to Start a Chat</Button>
              </div>
            )}
          </div>
        </div>
      </div>
      <MobileNav />

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Report Conversation</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Reason</label>
              <select className="w-full mt-1 border rounded p-2 text-sm" value={reportReason} onChange={e => setReportReason(e.target.value)}>
                <option value="">Select a reason</option>
                {CONVERSATION_REPORT_REASONS.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Additional Details (optional)</label>
              <Textarea value={reportDescription} onChange={e => setReportDescription(e.target.value)} rows={3} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReport} disabled={!reportReason}>Submit Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Message Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.isSender ? 'This will delete the message for everyone. This action cannot be undone.' : 'This will delete the message from your view only.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMessage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {activeConversation?.otherUserName}?</AlertDialogTitle>
            <AlertDialogDescription>They won't be able to send you messages and their listings will be hidden from your search results.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Block</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Expand */}
      {expandedImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setExpandedImage(null)}>
          <img src={expandedImage} alt="" className="max-w-full max-h-full rounded-lg" />
          <button className="absolute top-4 right-4 text-white p-2"><X className="h-6 w-6" /></button>
        </div>
      )}
    </div>
  );
}
