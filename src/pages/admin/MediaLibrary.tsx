import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Search, Trash2, Image as ImageIcon, Video, Copy, HardDrive, AlertTriangle, CheckSquare, Square } from 'lucide-react';

interface MediaItem {
  id: string;
  user_id: string;
  filename: string;
  url: string;
  thumbnail_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  hash: string | null;
  duplicate_of: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
}

interface StorageStats {
  totalFiles: number;
  totalSize: number;
  imageCount: number;
  videoCount: number;
  duplicateCount: number;
}

export default function MediaLibraryAdmin() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [duplicateFilter, setDuplicateFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [stats, setStats] = useState<StorageStats | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isAdmin === false) {
      navigate('/');
      return;
    }
    if (isAdmin) {
      fetchMedia();
      fetchStats();
    }
  }, [user, isAdmin, navigate]);

  const fetchMedia = useCallback(async () => {
    setIsLoading(true);
    let query = supabase
      .from('media_library')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });

    if (typeFilter === 'image') {
      query = query.like('mime_type', 'image/%');
    } else if (typeFilter === 'video') {
      query = query.like('mime_type', 'video/%');
    }

    if (duplicateFilter === 'duplicates') {
      query = query.not('duplicate_of', 'is', null);
    } else if (duplicateFilter === 'unique') {
      query = query.is('duplicate_of', null);
    }

    const { data, error } = await query;

    if (error) {
      toast.error('Failed to fetch media');
      console.error('fetchMedia error:', error);
      setMediaItems([]);
    } else {
      let items = (data as MediaItem[]) || [];
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        items = items.filter(
          (item) =>
            item.filename.toLowerCase().includes(lower) ||
            item.profiles?.full_name?.toLowerCase().includes(lower)
        );
      }
      setMediaItems(items);
    }
    setIsLoading(false);
  }, [typeFilter, duplicateFilter, searchTerm]);

  const fetchStats = useCallback(async () => {
    const { data, error } = await supabase
      .from('media_library')
      .select('file_size, mime_type, duplicate_of');

    if (error || !data) {
      setStats(null);
      return;
    }

    const totalFiles = data.length;
    const totalSize = data.reduce((sum, item) => sum + (item.file_size || 0), 0);
    const imageCount = data.filter((item) => item.mime_type?.startsWith('image/')).length;
    const videoCount = data.filter((item) => item.mime_type?.startsWith('video/')).length;
    const duplicateCount = data.filter((item) => item.duplicate_of !== null).length;

    setStats({ totalFiles, totalSize, imageCount, videoCount, duplicateCount });
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchMedia();
    }
  }, [isAdmin, fetchMedia]);

  const handleDelete = async () => {
    const idsToDelete = deleteTarget ? [deleteTarget] : selectedIds;
    if (idsToDelete.length === 0) return;

    const { error } = await supabase
      .from('media_library')
      .delete()
      .in('id', idsToDelete);

    if (error) {
      toast.error('Failed to delete media');
      console.error('Delete error:', error);
      return;
    }

    toast.success(`${idsToDelete.length} media item(s) deleted`);
    setMediaItems((prev) => prev.filter((m) => !idsToDelete.includes(m.id)));
    setSelectedIds([]);
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    fetchStats();
  };

  const handleSelectAll = () => {
    if (selectedIds.length === mediaItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(mediaItems.map((m) => m.id));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getMediaTypeIcon = (mimeType: string | null) => {
    if (mimeType?.startsWith('video/')) return <Video className="h-4 w-4" />;
    return <ImageIcon className="h-4 w-4" />;
  };

  const getMediaTypeLabel = (mimeType: string | null): string => {
    if (mimeType?.startsWith('video/')) return 'Video';
    if (mimeType?.startsWith('image/')) return 'Image';
    return 'Other';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Media Library</h1>
            <p className="text-sm text-muted-foreground">Manage all media across the platform</p>
          </div>
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedIds.length})
            </Button>
          )}
        </div>

        {/* Storage Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Files</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalFiles ?? '—'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatFileSize(stats?.totalSize ?? null)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Images / Videos</CardTitle>
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.imageCount ?? '—'} / {stats?.videoCount ?? '—'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Duplicates</CardTitle>
              <Copy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.duplicateCount ?? '—'}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search" className="sr-only">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by filename or user..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-full sm:w-48">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Media type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                    <SelectItem value="video">Videos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-48">
                <Select value={duplicateFilter} onValueChange={setDuplicateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Duplicate status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Media</SelectItem>
                    <SelectItem value="duplicates">Duplicates Only</SelectItem>
                    <SelectItem value="unique">Unique Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Media Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Media Files ({mediaItems.length})</CardTitle>
              {mediaItems.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  {selectedIds.length === mediaItems.length ? (
                    <>
                      <Square className="h-4 w-4 mr-2" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Select All
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : mediaItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No media files found</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.length === mediaItems.length && mediaItems.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-16">Preview</TableHead>
                      <TableHead>Filename</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Dimensions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mediaItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(item.id)}
                            onCheckedChange={() => handleSelectOne(item.id)}
                          />
                        </TableCell>
                        <TableCell>
                          {item.thumbnail_url || item.url ? (
                            <img
                              src={item.thumbnail_url || item.url}
                              alt={item.filename}
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                              {getMediaTypeIcon(item.mime_type)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium max-w-48 truncate" title={item.filename}>
                          {item.filename}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getMediaTypeIcon(item.mime_type)}
                            <span className="text-sm">{getMediaTypeLabel(item.mime_type)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.profiles?.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-sm">{formatFileSize(item.file_size)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.width && item.height ? `${item.width}×${item.height}` : '—'}
                        </TableCell>
                        <TableCell>
                          {item.duplicate_of ? (
                            <Badge variant="secondary" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Duplicate
                            </Badge>
                          ) : (
                            <Badge variant="outline">Unique</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeleteTarget(item.id);
                              setDeleteDialogOpen(true);
                            }}
                            title="Delete media"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Media</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteTarget
              ? 'Are you sure you want to delete this media file? This action cannot be undone.'
              : `Are you sure you want to delete ${selectedIds.length} selected media files? This action cannot be undone.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteTarget(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
