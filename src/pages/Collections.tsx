/**
 * Collections — User collections (wishlists) management page.
 * Create, edit, delete collections; add/remove/move items; share public collections.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { AdCard } from '@/components/ads/AdCard';
import { useSearchDiscovery } from '@/hooks/useSearchDiscovery';
import { useAuth } from '@/hooks/useAuth';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Folder, Plus, Edit, Trash2, Share2, Heart, Lock, Globe, Move,
  MoreVertical, ChevronRight, Package,
} from 'lucide-react';
import type { UserCollection } from '@/integrations/supabase/types_v5_search';

export default function Collections() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const {
    collections, fetchCollections, createCollection, updateCollection, deleteCollection,
    collectionItems, fetchCollectionItems, removeFromCollection, moveCollectionItem,
  } = useSearchDiscovery();

  const [isLoading, setIsLoading] = useState(true);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCollection, setEditingCollection] = useState<UserCollection | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserCollection | null>(null);
  const [colForm, setColForm] = useState({ name: '', description: '', visibility: 'private' as 'private' | 'public' });

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchCollections().then(() => setIsLoading(false));
    }
  }, [user, fetchCollections]);

  useEffect(() => {
    if (collections.length > 0 && !selectedCollectionId) {
      setSelectedCollectionId(collections[0].id);
    }
  }, [collections, selectedCollectionId]);

  useEffect(() => {
    if (selectedCollectionId) {
      fetchCollectionItems(selectedCollectionId);
    }
  }, [selectedCollectionId, fetchCollectionItems]);

  const openCreateDialog = () => {
    setEditingCollection(null);
    setColForm({ name: '', description: '', visibility: 'private' });
    setShowCreateDialog(true);
  };

  const openEditDialog = (col: UserCollection) => {
    setEditingCollection(col);
    setColForm({ name: col.name, description: col.description || '', visibility: col.visibility });
    setShowCreateDialog(true);
  };

  const handleSaveCollection = async () => {
    if (!colForm.name.trim()) { toast.error('Collection name is required'); return; }
    if (editingCollection) {
      await updateCollection(editingCollection.id, {
        name: colForm.name,
        description: colForm.description || null,
        visibility: colForm.visibility,
      });
    } else {
      const result = await createCollection({
        name: colForm.name,
        description: colForm.description || null,
        visibility: colForm.visibility,
      });
      if (result) setSelectedCollectionId(result.id);
    }
    setShowCreateDialog(false);
    fetchCollections();
  };

  const handleDeleteCollection = async () => {
    if (!deleteTarget) return;
    const success = await deleteCollection(deleteTarget.id);
    if (success) {
      if (selectedCollectionId === deleteTarget.id) {
        setSelectedCollectionId(collections.find(c => c.id !== deleteTarget.id)?.id || null);
      }
    }
    setDeleteTarget(null);
  };

  const handleShare = (col: UserCollection) => {
    if (col.visibility !== 'public') {
      toast.info('Make this collection public to share it');
      return;
    }
    const url = `${window.location.origin}/collections/${col.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Collection link copied');
  };

  const handleMoveItem = async (itemId: string, adId: string, toCollectionId: string) => {
    if (!selectedCollectionId) return;
    await moveCollectionItem(itemId, selectedCollectionId, toCollectionId);
    fetchCollectionItems(selectedCollectionId);
    fetchCollections();
    toast.success('Item moved');
  };

  if (authLoading || (!user && !authLoading)) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  const selectedCollection = collections.find(c => c.id === selectedCollectionId);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">My Collections</h1>
            <p className="text-sm text-muted-foreground">Organize your saved listings into collections</p>
          </div>
          <Button onClick={openCreateDialog} className="gap-2"><Plus className="h-4 w-4" /> New Collection</Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Collections List */}
          <aside className="lg:w-72 shrink-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Folder className="h-4 w-4" /> Collections</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {isLoading ? (
                  <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : collections.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-6">No collections yet</p>
                ) : (
                  <div className="space-y-1">
                    {collections.map(col => (
                      <div
                        key={col.id}
                        onClick={() => setSelectedCollectionId(col.id)}
                        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                          selectedCollectionId === col.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                        }`}
                      >
                        {col.is_default ? <Heart className="h-4 w-4 shrink-0" /> : <Folder className="h-4 w-4 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{col.name}</p>
                          <p className={`text-xs ${selectedCollectionId === col.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {col.item_count || 0} items
                          </p>
                        </div>
                        {col.visibility === 'public' ? <Globe className="h-3 w-3 shrink-0" /> : <Lock className="h-3 w-3 shrink-0" />}
                        {!col.is_default && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={e => e.stopPropagation()}
                                className={`p-1 rounded ${selectedCollectionId === col.id ? 'hover:bg-primary-foreground/20' : 'hover:bg-accent'}`}
                              >
                                <MoreVertical className="h-3 w-3" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => openEditDialog(col)} className="gap-2"><Edit className="h-3 w-3" /> Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleShare(col)} className="gap-2"><Share2 className="h-3 w-3" /> Share</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteTarget(col)} className="gap-2 text-destructive"><Trash2 className="h-3 w-3" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>

          {/* Collection Items */}
          <div className="flex-1 min-w-0">
            {selectedCollection ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold">{selectedCollection.name}</h2>
                    {selectedCollection.description && <p className="text-sm text-muted-foreground">{selectedCollection.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={selectedCollection.visibility === 'public' ? 'default' : 'secondary'} className="gap-1">
                      {selectedCollection.visibility === 'public' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      {selectedCollection.visibility}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => handleShare(selectedCollection)} className="gap-2">
                      <Share2 className="h-4 w-4" /> Share
                    </Button>
                  </div>
                </div>

                {collectionItems.length === 0 ? (
                  <div className="text-center py-16">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-2">This collection is empty</p>
                    <p className="text-sm text-muted-foreground">Browse listings and add them to this collection</p>
                    <Button onClick={() => navigate('/search')} className="mt-4">Browse Listings</Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {collectionItems.map(item => (
                      <div key={item.id} className="relative group">
                        <AdCard ad={item.ad as any} />
                        <div className="absolute top-2 right-2 z-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="secondary" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => removeFromCollection(selectedCollection.id, item.ad_id)}
                                className="gap-2 text-destructive"
                              >
                                <Trash2 className="h-3 w-3" /> Remove from collection
                              </DropdownMenuItem>
                              {collections.filter(c => c.id !== selectedCollection.id).length > 0 && (
                                <>
                                  <DropdownMenuSeparator />
                                  <div className="px-2 py-1 text-xs text-muted-foreground">Move to:</div>
                                  {collections.filter(c => c.id !== selectedCollection.id).map(c => (
                                    <DropdownMenuItem
                                      key={c.id}
                                      onClick={() => handleMoveItem(item.id, item.ad_id, c.id)}
                                      className="gap-2"
                                    >
                                      <Move className="h-3 w-3" /> {c.name}
                                    </DropdownMenuItem>
                                  ))}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Select a collection to view its items</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
      <MobileNav />

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCollection ? 'Edit Collection' : 'Create New Collection'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name *</Label>
              <Input value={colForm.name} onChange={e => setColForm({ ...colForm, name: e.target.value })} placeholder="e.g. Birthday Gifts" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={colForm.description} onChange={e => setColForm({ ...colForm, description: e.target.value })} rows={2} placeholder="Optional description" />
            </div>
            <div>
              <Label>Visibility</Label>
              <Select value={colForm.visibility} onValueChange={v => setColForm({ ...colForm, visibility: v as 'private' | 'public' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private"><span className="flex items-center gap-2"><Lock className="h-4 w-4" /> Private</span></SelectItem>
                  <SelectItem value="public"><span className="flex items-center gap-2"><Globe className="h-4 w-4" /> Public</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCollection}>{editingCollection ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the collection and remove all items from it. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCollection} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
