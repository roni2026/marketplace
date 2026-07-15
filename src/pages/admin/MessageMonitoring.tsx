import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { detectMessageSpam } from '@/lib/messaging_v2';
import { formatDistanceToNow } from 'date-fns';
import { Search, AlertTriangle, Flag, MessageSquare, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface MonitoredMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  is_read: boolean | null;
  created_at: string;
  sender?: { full_name: string | null; avatar_url: string | null };
  receiver?: { full_name: string | null; avatar_url: string | null };
}

export default function MessageMonitoring() {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = useState<MonitoredMessage[]>([]);
  const [flaggedMessages, setFlaggedMessages] = useState<MonitoredMessage[]>([]);
  const [reportedMessages, setReportedMessages] = useState<MonitoredMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'flagged' | 'reported'>('all');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }
      if (isAdmin === false) { /* stay on page — AdminRoute already gates access */ return; }
      if (isAdmin) {
        fetchMessages();
      }
    }
  }, [user, isAdmin, authLoading, navigate]);

  const fetchMessages = useCallback(async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(full_name, avatar_url),
        receiver:profiles!messages_receiver_id_fkey(full_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      toast.error('Failed to load messages');
      setIsLoading(false);
      return;
    }

    const allMessages = (data as MonitoredMessage[]) || [];
    setMessages(allMessages);

    const flagged = allMessages.filter((msg) => {
      const { isSpam } = detectMessageSpam(msg.body);
      return isSpam;
    });
    setFlaggedMessages(flagged);

    const { data: reports } = await supabase
      .from('reports')
      .select('resource_id')
      .eq('resource_type', 'message')
      .eq('status', 'pending');

    if (reports && reports.length > 0) {
      const reportedIds = new Set(reports.map((r: { resource_id: string }) => r.resource_id));
      const reported = allMessages.filter((msg) => reportedIds.has(msg.id));
      setReportedMessages(reported);
    } else {
      setReportedMessages([]);
    }

    setIsLoading(false);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchMessages();
      return;
    }

    setIsLoading(true);
    const { data } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(full_name, avatar_url),
        receiver:profiles!messages_receiver_id_fkey(full_name, avatar_url)
      `)
      .ilike('body', `%${searchQuery}%`)
      .order('created_at', { ascending: false })
      .limit(200);

    setMessages((data as MonitoredMessage[]) || []);
    setIsLoading(false);
  };

  const getSpamReasons = (body: string): string[] => {
    const { reasons } = detectMessageSpam(body);
    return reasons;
  };

  const displayedMessages = activeTab === 'flagged' ? flaggedMessages : activeTab === 'reported' ? reportedMessages : messages;

  if (authLoading || isLoading) {
    return (
      <AdminLayout>
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-96 rounded-lg" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Message Monitoring</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{messages.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged (Spam)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{flaggedMessages.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reported</CardTitle>
            <Flag className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{reportedMessages.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search messages..."
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={activeTab === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('all')}
        >
          All ({messages.length})
        </Button>
        <Button
          variant={activeTab === 'flagged' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('flagged')}
        >
          <AlertTriangle className="h-4 w-4 mr-1" />
          Flagged ({flaggedMessages.length})
        </Button>
        <Button
          variant={activeTab === 'reported' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('reported')}
        >
          <Flag className="h-4 w-4 mr-1" />
          Reported ({reportedMessages.length})
        </Button>
      </div>

      {/* Messages Table */}
      <Card>
        <CardContent className="p-0">
          {displayedMessages.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No messages found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sender</TableHead>
                    <TableHead>Receiver</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Flagged</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedMessages.map((msg) => {
                    const reasons = getSpamReasons(msg.body);
                    const isFlagged = reasons.length > 0;
                    const isReported = reportedMessages.some((r) => r.id === msg.id);

                    return (
                      <TableRow key={msg.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={msg.sender?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">{msg.sender?.full_name?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{msg.sender?.full_name || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={msg.receiver?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">{msg.receiver?.full_name?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{msg.receiver?.full_name || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <p className="text-sm truncate">{msg.body}</p>
                          {isFlagged && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {reasons.slice(0, 2).map((reason, i) => (
                                <Badge key={i} variant="destructive" className="text-xs">
                                  {reason}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {isReported ? (
                            <Badge variant="destructive">
                              <Flag className="h-3 w-3 mr-1" />
                              Reported
                            </Badge>
                          ) : isFlagged ? (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Spam
                            </Badge>
                          ) : (
                            <Badge variant="outline">Clean</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
