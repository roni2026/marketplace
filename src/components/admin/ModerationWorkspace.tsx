/**
 * ModerationWorkspace — Enterprise moderation interface.
 *
 * Features:
 * - Single-page editable listing with all fields
 * - Professional image viewer (zoom, rotate, fullscreen, keyboard nav)
 * - Moderation actions: approve, reject, request changes, suspend, hide, escalate, assign
 * - Automatic queue navigation (next ad loads instantly after action)
 * - Review session tracking with live stats
 * - Review timer (auto-start/stop)
 * - Immutable audit timeline with color coding
 * - Field change history (old → new)
 * - Internal notes
 * - Keyboard shortcuts (A, R, S, N, P, E, Esc, Ctrl+Enter)
 * - Preloads next ad for instant transition
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatPrice } from '@/lib/constants';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  CheckCircle, XCircle, Eye, Flag, AlertTriangle, ShieldCheck,
  Image as ImageIcon, Clock, Package, Loader2, Ban, Heart,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Maximize,
  Download, Save, Undo2, Send, ArrowUp, UserCog, FileText,
  MapPin, Tag, DollarSign, Star, Zap, Crown, ExternalLink,
  History, StickyNote, ChevronDown, ChevronUp, Timer,
  TrendingUp, AlertCircle, EyeOff, ArrowRight, Copy,
} from 'lucide-react';
import {
  logModerationAction, ensureManualReviewInitialized, getModerationActions,
  getModerationNotes, addModerationNote, saveListingVersion, detectFieldChanges,
  updateSessionStats, logQueueEvent, ACTION_TYPE_META,
  type ModerationAction, type ModerationNote,
} from '@/lib/moderation';

// =========================================================================
// Types
// =========================================================================

interface AdImage {
  id: string;
  image_url: string;
  sort_order: number;
}

interface Seller {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  division: string | null;
  district: string | null;
  is_verified: boolean | null;
  seller_rating: number | null;
  total_sales: number | null;
  total_listings: number | null;
  created_at: string | null;
}

interface Ad {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number | null;
  price_type: string;
  condition: string;
  status: string;
  division: string;
  district: string;
  area: string | null;
  brand: string | null;
  model: string | null;
  tags: string[] | null;
  is_featured: boolean;
  is_premium: boolean | null;
  is_boosted: boolean | null;
  is_negotiable: boolean | null;
  views_count: number | null;
  favorites_count: number | null;
  shares_count: number | null;
  rejection_message: string | null;
  rejection_reason_code: string | null;
  created_at: string;
  updated_at: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  user_id: string;
  ad_images: AdImage[];
  categories: { name: string; slug: string } | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface WorkspaceProps {
  ad: Ad;
  categories: Category[];
  queuePosition: number;
  queueTotal: number;
  sessionId: string | null;
  enteredFromQueue: boolean;
  onActionComplete: (action: string) => void;
  onNavigateNext: () => void;
  onNavigatePrev: () => void;
  onClose: () => void;
}

// =========================================================================
// Main Component
// =========================================================================

export function ModerationWorkspace({
  ad, categories, queuePosition, queueTotal, sessionId,
  enteredFromQueue, onActionComplete, onNavigateNext, onNavigatePrev, onClose,
}: WorkspaceProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [images, setImages] = useState<AdImage[]>([]);
  const [actions, setActions] = useState<ModerationAction[]>([]);
  const [notes, setNotes] = useState<ModerationNote[]>([]);
  const [actionsTotal, setActionsTotal] = useState(0);
  const [actionsVisible, setActionsVisible] = useState(4);
  const [actionLoading, setActionLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [reviewTimer, setReviewTimer] = useState(0);
  const [waitTime, setWaitTime] = useState(0);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  // Editable fields
  const [editedFields, setEditedFields] = useState<Record<string, unknown>>({});
  const [hasEdits, setHasEdits] = useState(false);
  const [originalFields, setOriginalFields] = useState<Record<string, unknown>>({});

  // Image viewer state
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const imageViewerRef = useRef<HTMLDivElement>(null);

  const moderatorName = user?.email || 'Moderator';
  const moderatorRole = 'moderator';

  // =========================================================================
  // Data Fetching
  // =========================================================================

  const fetchAllData = useCallback(async () => {
    if (!ad || !user) return;
    setLoading(true);
    setReviewTimer(0);
    setEditedFields({});
    setHasEdits(false);
    setCurrentImageIdx(0);
    setZoomLevel(1);
    setRotation(0);

    try {
      // Store original field values for change detection
      const fields: Record<string, unknown> = {
        title: ad.title,
        description: ad.description,
        price: ad.price,
        condition: ad.condition,
        division: ad.division,
        district: ad.district,
        area: ad.area,
        brand: ad.brand,
        model: ad.model,
        tags: ad.tags,
        is_featured: ad.is_featured,
        is_negotiable: ad.is_negotiable,
      };
      setOriginalFields(fields);

      const [sellerRes, actionsRes, notesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, phone_number, division, district, is_verified, seller_rating, total_sales, created_at')
          .eq('user_id', ad.user_id)
          .maybeSingle(),
        getModerationActions(ad.id, 50, 0),
        getModerationNotes(ad.id),
      ]);

      if (sellerRes.data) setSeller(sellerRes.data as Seller);
      setImages(ad.ad_images?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) || []);
      setActions(actionsRes.actions);
      setActionsTotal(actionsRes.total);
      setNotes(notesRes);

      // Count seller's total listings
      if (sellerRes.data) {
        const { count } = await supabase
          .from('ads')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', ad.user_id);
        setSeller(prev => prev ? { ...prev, total_listings: count || 0 } : prev);
      }

      // If entered from queue, create "Manual Review Initialized" (once)
      if (enteredFromQueue && user) {
        await ensureManualReviewInitialized(ad.id, user.id, moderatorName, moderatorRole);
        // Refresh actions after creating the initial event
        const refreshed = await getModerationActions(ad.id, 50, 0);
        setActions(refreshed.actions);
        setActionsTotal(refreshed.total);
      }

      // Log queue event: review started
      await logQueueEvent({
        listingId: ad.id,
        eventType: 'review_started',
        moderatorId: user.id,
      });
    } catch (err) {
      console.error('ModerationWorkspace fetch error:', err);
    }
    setLoading(false);
  }, [ad, user, enteredFromQueue, moderatorName]);

  useEffect(() => {
    fetchAllData();
  }, [ad?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // =========================================================================
  // Review Timer
  // =========================================================================

  useEffect(() => {
    const interval = setInterval(() => {
      setReviewTimer(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [ad?.id]);

  // Wait time (time since listing entered queue)
  useEffect(() => {
    const updateWait = () => {
      const created = new Date(ad.created_at).getTime();
      setWaitTime(Math.floor((Date.now() - created) / 1000));
    };
    updateWait();
    const interval = setInterval(updateWait, 1000);
    return () => clearInterval(interval);
  }, [ad?.created_at]);

  // =========================================================================
  // Keyboard Shortcuts
  // =========================================================================

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;

      switch (e.key.toLowerCase()) {
        case 'a':
          if (e.ctrlKey || e.metaKey) { e.preventDefault(); handleApprove(); }
          else handleApprove();
          break;
        case 'r':
          if (!e.ctrlKey && !e.metaKey) { setShowRejectDialog(true); }
          break;
        case 's':
          if (hasEdits) handleSaveWithoutApprove();
          break;
        case 'n':
          onNavigateNext();
          break;
        case 'p':
          onNavigatePrev();
          break;
        case 'e':
          document.getElementById('edit-title')?.focus();
          break;
        case 'escape':
          if (isFullscreen) { setIsFullscreen(false); }
          else if (showRejectDialog) { setShowRejectDialog(false); }
          else if (showEscalateDialog) { setShowEscalateDialog(false); }
          else onClose();
          break;
        case ' ':
          if (!isFullscreen) { e.preventDefault(); setZoomLevel(z => z >= 3 ? 1 : z + 0.5); }
          break;
        case 'arrowleft':
          if (currentImageIdx > 0) { setCurrentImageIdx(currentImageIdx - 1); setZoomLevel(1); setRotation(0); }
          break;
        case 'arrowright':
          if (currentImageIdx < images.length - 1) { setCurrentImageIdx(currentImageIdx + 1); setZoomLevel(1); setRotation(0); }
          break;
      }

      // Ctrl+Enter = approve
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleApprove();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [ad?.id, hasEdits, isFullscreen, showRejectDialog, showEscalateDialog, currentImageIdx, images.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // =========================================================================
  // Field Editing
  // =========================================================================

  const updateField = (field: string, value: unknown) => {
    setEditedFields(prev => ({ ...prev, [field]: value }));
    setHasEdits(true);
  };

  const handleUndoEdits = () => {
    setEditedFields({});
    setHasEdits(false);
    if (user) {
      logModerationAction({
        listingId: ad.id, moderatorId: user.id, moderatorName,
        actionType: 'undo_edits', reason: 'Moderator discarded all unsaved edits',
      });
    }
    toast.info('Edits discarded');
  };

  const handleSaveWithoutApprove = async () => {
    if (!user || !hasEdits) return;
    setActionLoading(true);
    try {
      const changes = detectFieldChanges(originalFields, { ...originalFields, ...editedFields });
      const updateData: Record<string, unknown> = { ...editedFields, updated_at: new Date().toISOString() };

      const { error } = await supabase.from('ads').update(updateData).eq('id', ad.id);
      if (error) throw error;

      // Log each field change
      for (const change of changes) {
        const action = await logModerationAction({
          listingId: ad.id, moderatorId: user.id, moderatorName,
          actionType: getActionTypeForField(change.field),
          previousValue: { [change.field]: change.oldValue },
          newValue: { [change.field]: change.newValue },
        });
        await saveListingVersion({
          listingId: ad.id, fieldName: change.field,
          oldValue: change.oldValue, newValue: change.newValue,
          changedBy: user.id, changedByName: moderatorName,
          moderationActionId: action?.id,
        });
      }

      await logModerationAction({
        listingId: ad.id, moderatorId: user.id, moderatorName,
        actionType: 'save_without_approve',
      });

      setHasEdits(false);
      setOriginalFields(prev => ({ ...prev, ...editedFields }));
      toast.success(`Saved ${changes.length} change(s)`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save');
    }
    setActionLoading(false);
  };

  function getActionTypeForField(field: string): any {
    const map: Record<string, string> = {
      title: 'title_changed',
      description: 'description_edited',
      price: 'price_changed',
      category_id: 'category_changed',
      brand: 'brand_changed',
      model: 'model_changed',
      division: 'location_changed',
      district: 'location_changed',
      area: 'location_changed',
      condition: 'condition_changed',
      tags: 'tags_changed',
    };
    return map[field] || 'title_changed';
  }

  // =========================================================================
  // Moderation Actions
  // =========================================================================

  const handleApprove = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      // Save any pending edits first
      if (hasEdits) {
        const changes = detectFieldChanges(originalFields, { ...originalFields, ...editedFields });
        if (changes.length > 0) {
          await supabase.from('ads').update({ ...editedFields, updated_at: new Date().toISOString() }).eq('id', ad.id);
          for (const change of changes) {
            const action = await logModerationAction({
              listingId: ad.id, moderatorId: user.id, moderatorName,
              actionType: getActionTypeForField(change.field),
              previousValue: { [change.field]: change.oldValue },
              newValue: { [change.field]: change.newValue },
            });
            await saveListingVersion({
              listingId: ad.id, fieldName: change.field,
              oldValue: change.oldValue, newValue: change.newValue,
              changedBy: user.id, changedByName: moderatorName,
              moderationActionId: action?.id,
            });
          }
        }
      }

      const { error } = await supabase.from('ads').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', ad.id);
      if (error) throw error;

      await logModerationAction({
        listingId: ad.id, moderatorId: user.id, moderatorName,
        actionType: 'approval',
      });

      if (sessionId) await updateSessionStats(sessionId, 'approvals');
      await logQueueEvent({ listingId: ad.id, eventType: 'approved', moderatorId: user.id, waitTimeSeconds: waitTime });

      // Notify seller
      try {
        await supabase.from('notifications').insert({
          user_id: ad.user_id, type: 'ad_approved',
          title: 'Your ad has been approved', body: `"${ad.title}" is now live.`,
        });
      } catch {}

      toast.success('Approved — loading next ad...');
      setActionLoading(false);
      onActionComplete('approve');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to approve');
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!user || !rejectReason) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('ads').update({
        status: 'rejected', rejection_reason_code: rejectReason,
        rejection_message: rejectNotes || undefined, updated_at: new Date().toISOString(),
      }).eq('id', ad.id);
      if (error) throw error;

      await logModerationAction({
        listingId: ad.id, moderatorId: user.id, moderatorName,
        actionType: 'rejection', reason: rejectReason, notes: rejectNotes,
      });

      if (sessionId) await updateSessionStats(sessionId, 'rejections');
      await logQueueEvent({ listingId: ad.id, eventType: 'rejected', moderatorId: user.id, waitTimeSeconds: waitTime });

      try {
        await supabase.from('notifications').insert({
          user_id: ad.user_id, type: 'ad_rejected',
          title: 'Your ad was rejected', body: `"${ad.title}": ${rejectReason}`,
        });
      } catch {}

      setShowRejectDialog(false);
      setRejectReason('');
      setRejectNotes('');
      toast.success('Rejected — loading next ad...');
      setActionLoading(false);
      onActionComplete('reject');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reject');
      setActionLoading(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await logModerationAction({
        listingId: ad.id, moderatorId: user.id, moderatorName,
        actionType: 'request_changes', reason: 'Changes requested by moderator',
      });
      if (sessionId) await updateSessionStats(sessionId, 'ads_reviewed');
      await logQueueEvent({ listingId: ad.id, eventType: 'changes_requested', moderatorId: user.id });
      toast.success('Changes requested — loading next ad...');
      setActionLoading(false);
      onActionComplete('request_changes');
    } catch (err: any) {
      toast.error(err?.message || 'Failed');
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await supabase.from('ads').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', ad.id);
      await logModerationAction({ listingId: ad.id, moderatorId: user.id, moderatorName, actionType: 'suspend' });
      if (sessionId) await updateSessionStats(sessionId, 'ads_reviewed');
      toast.success('Suspended — loading next ad...');
      setActionLoading(false);
      onActionComplete('suspend');
    } catch (err: any) {
      toast.error(err?.message || 'Failed');
      setActionLoading(false);
    }
  };

  const handleHide = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await supabase.from('ads').update({ status: 'draft', updated_at: new Date().toISOString() }).eq('id', ad.id);
      await logModerationAction({ listingId: ad.id, moderatorId: user.id, moderatorName, actionType: 'hide' });
      if (sessionId) await updateSessionStats(sessionId, 'ads_reviewed');
      toast.success('Hidden — loading next ad...');
      setActionLoading(false);
      onActionComplete('hide');
    } catch (err: any) {
      toast.error(err?.message || 'Failed');
      setActionLoading(false);
    }
  };

  const handleEscalate = async () => {
    if (!user || !escalateReason) return;
    setActionLoading(true);
    try {
      await logModerationAction({
        listingId: ad.id, moderatorId: user.id, moderatorName,
        actionType: 'escalated', reason: escalateReason,
      });
      if (sessionId) await updateSessionStats(sessionId, 'escalated');
      await logQueueEvent({ listingId: ad.id, eventType: 'escalated', moderatorId: user.id });
      setShowEscalateDialog(false);
      setEscalateReason('');
      toast.success('Escalated — loading next ad...');
      setActionLoading(false);
      onActionComplete('escalate');
    } catch (err: any) {
      toast.error(err?.message || 'Failed');
      setActionLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!user || !assignTo) return;
    setActionLoading(true);
    try {
      await logModerationAction({
        listingId: ad.id, moderatorId: user.id, moderatorName,
        actionType: 'assigned', notes: `Assigned to: ${assignTo}`,
      });
      await logQueueEvent({ listingId: ad.id, eventType: 'assigned', fromModerator: user.id, toModerator: assignTo });
      setShowAssignDialog(false);
      setAssignTo('');
      toast.success('Assigned — loading next ad...');
      setActionLoading(false);
      onActionComplete('assign');
    } catch (err: any) {
      toast.error(err?.message || 'Failed');
      setActionLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!user || !noteText.trim()) return;
    const note = await addModerationNote(ad.id, user.id, moderatorName, noteText.trim());
    if (note) {
      setNotes(prev => [note, ...prev]);
      setNoteText('');
      toast.success('Note added');
    }
  };

  const handleSkip = () => {
    if (sessionId) updateSessionStats(sessionId, 'skipped');
    if (user) logQueueEvent({ listingId: ad.id, eventType: 'skipped', moderatorId: user.id });
    toast.info('Skipped — loading next ad...');
    onActionComplete('skip');
  };

  // =========================================================================
  // Image Viewer
  // =========================================================================

  const currentImage = images[currentImageIdx];

  const handleImageKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && currentImageIdx > 0) { setCurrentImageIdx(currentImageIdx - 1); setZoomLevel(1); setRotation(0); }
    if (e.key === 'ArrowRight' && currentImageIdx < images.length - 1) { setCurrentImageIdx(currentImageIdx + 1); setZoomLevel(1); setRotation(0); }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      imageViewerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // =========================================================================
  // Render Helpers
  // =========================================================================

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const actionColor = (color: string) => {
    const map: Record<string, string> = {
      green: 'text-green-600 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900',
      red: 'text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900',
      blue: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900',
      orange: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900',
      gray: 'text-gray-600 bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800',
      purple: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900',
    };
    return map[color] || map.gray;
  };

  const actionIcon = (iconName: string) => {
    const map: Record<string, React.ComponentType<{ className?: string }>> = {
      eye: Eye, edit: FileText, dollar: DollarSign, folder: Package,
      tag: Tag, map: MapPin, image: ImageIcon, phone: AlertCircle,
      copy: Copy, alert: AlertTriangle, note: StickyNote, check: CheckCircle,
      x: XCircle, 'arrow-up': ArrowUp, user: UserCog, mail: Send,
      rotate: RotateCw, 'eye-off': EyeOff, server: Package, sparkles: Star,
      flag: Flag, save: Save, undo: Undo2,
    };
    return map[iconName] || Package;
  };

  const currentValue = (field: string) => {
    return editedFields[field] !== undefined ? editedFields[field] : originalFields[field];
  };

  const isEdited = (field: string) => editedFields[field] !== undefined && JSON.stringify(editedFields[field]) !== JSON.stringify(originalFields[field]);

  // =========================================================================
  // Render
  // =========================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading moderation workspace...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" onKeyDown={handleImageKey}>
      {/* ===== Top Stats Bar ===== */}
      <div className="flex items-center justify-between gap-4 px-4 py-2 border-b bg-card flex-wrap shrink-0">
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <div className="flex items-center gap-1.5">
            <Timer className="h-4 w-4 text-primary" />
            <span className="font-mono font-semibold">{formatTimer(reviewTimer)}</span>
            <span className="text-xs text-muted-foreground">review time</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono">{formatTimer(waitTime)}</span>
            <span className="text-xs text-muted-foreground">waiting</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1.5">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{queuePosition}</span>
            <span className="text-muted-foreground">of {queueTotal}</span>
          </div>
          {hasEdits && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1">
                <AlertCircle className="h-3 w-3" /> Unsaved edits
              </Badge>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onNavigatePrev} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSkip} className="gap-1">
            Skip <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>Exit</Button>
        </div>
      </div>

      {/* Queue Progress Bar */}
      <div className="h-1 bg-muted shrink-0">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${queueTotal > 0 ? (queuePosition / queueTotal) * 100 : 0}%` }}
        />
      </div>

      {/* ===== Main Content: 3-column layout ===== */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr_320px] gap-0 min-h-full">
          {/* ===== Left: Image Viewer ===== */}
          <div className="border-r p-4 space-y-3">
            <div
              ref={imageViewerRef}
              className={`relative bg-black/5 dark:bg-black/20 rounded-lg overflow-hidden flex items-center justify-center ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'aspect-square'}`}
            >
              {currentImage ? (
                <img
                  src={currentImage.image_url}
                  alt={`Image ${currentImageIdx + 1}`}
                  className="max-w-full max-h-full object-contain transition-transform duration-200"
                  style={{ transform: `scale(${zoomLevel}) rotate(${rotation}deg)` }}
                  loading="lazy"
                />
              ) : (
                <div className="flex flex-col items-center text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mb-2 opacity-30" />
                  <span className="text-sm">No images</span>
                </div>
              )}

              {/* Image controls */}
              {currentImage && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-card/90 backdrop-blur rounded-lg p-1 shadow-lg">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoomLevel(z => Math.max(1, z - 0.5))}>
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs font-mono px-1">{Math.round(zoomLevel * 100)}%</span>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoomLevel(z => Math.min(4, z + 0.5))}>
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                  <Separator orientation="vertical" className="h-4" />
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setRotation(r => r + 90)}>
                    <RotateCw className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={toggleFullscreen}>
                    <Maximize className="h-3.5 w-3.5" />
                  </Button>
                  <Separator orientation="vertical" className="h-4" />
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" as="a" href={currentImage.image_url} download>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* Image counter */}
              {images.length > 0 && (
                <div className="absolute top-2 right-2 bg-card/90 backdrop-blur rounded px-2 py-0.5 text-xs font-mono">
                  {currentImageIdx + 1} / {images.length}
                </div>
              )}

              {/* Nav arrows */}
              {currentImageIdx > 0 && (
                <Button variant="ghost" size="sm" className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 bg-card/80" onClick={() => { setCurrentImageIdx(currentImageIdx - 1); setZoomLevel(1); setRotation(0); }}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              {currentImageIdx < images.length - 1 && (
                <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 bg-card/80" onClick={() => { setCurrentImageIdx(currentImageIdx + 1); setZoomLevel(1); setRotation(0); }}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Thumbnail gallery */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => { setCurrentImageIdx(idx); setZoomLevel(1); setRotation(0); }}
                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${idx === currentImageIdx ? 'border-primary ring-1 ring-primary' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}

            {/* Image metadata */}
            {currentImage && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center justify-between">
                  <span>Image ID: {currentImage.id.slice(0, 8)}</span>
                  {currentImage.sort_order === 0 && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                </div>
                <div>Sort order: {currentImage.sort_order}</div>
              </div>
            )}
          </div>

          {/* ===== Center: Editable Listing Fields ===== */}
          <div className="p-4 space-y-4 overflow-y-auto">
            {/* Listing ID & Status */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Badge variant={ad.status === 'pending' ? 'secondary' : 'outline'} className="capitalize">{ad.status}</Badge>
                <span className="text-xs text-muted-foreground font-mono">ID: {ad.id.slice(0, 8)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Created {formatDistanceToNow(new Date(ad.created_at))} ago
                {ad.updated_at && ` · Updated ${formatDistanceToNow(new Date(ad.updated_at))} ago`}
              </div>
            </div>

            {/* Title */}
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                Title {isEdited('title') && <Badge variant="outline" className="text-amber-600 text-[10px] py-0">edited</Badge>}
              </Label>
              <Input
                id="edit-title"
                value={String(currentValue('title') || '')}
                onChange={e => updateField('title', e.target.value)}
                className="mt-1 font-semibold"
              />
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                Description {isEdited('description') && <Badge variant="outline" className="text-amber-600 text-[10px] py-0">edited</Badge>}
              </Label>
              <Textarea
                value={String(currentValue('description') || '')}
                onChange={e => updateField('description', e.target.value)}
                rows={5}
                className="mt-1"
              />
            </div>

            {/* Price & Condition */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  Price {isEdited('price') && <Badge variant="outline" className="text-amber-600 text-[10px] py-0">edited</Badge>}
                </Label>
                <Input
                  type="number"
                  value={String(currentValue('price') ?? '')}
                  onChange={e => updateField('price', e.target.value ? Number(e.target.value) : null)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  Condition {isEdited('condition') && <Badge variant="outline" className="text-amber-600 text-[10px] py-0">edited</Badge>}
                </Label>
                <Select value={String(currentValue('condition') || 'used')} onValueChange={v => updateField('condition', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Category */}
            <div>
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select
                value={String(currentValue('category_id') || ad.category_id || '')}
                onValueChange={v => updateField('category_id', v)}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Brand & Model */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  Brand {isEdited('brand') && <Badge variant="outline" className="text-amber-600 text-[10px] py-0">edited</Badge>}
                </Label>
                <Input value={String(currentValue('brand') || '')} onChange={e => updateField('brand', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  Model {isEdited('model') && <Badge variant="outline" className="text-amber-600 text-[10px] py-0">edited</Badge>}
                </Label>
                <Input value={String(currentValue('model') || '')} onChange={e => updateField('model', e.target.value)} className="mt-1" />
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Division</Label>
                <Input value={String(currentValue('division') || '')} onChange={e => updateField('division', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">District</Label>
                <Input value={String(currentValue('district') || '')} onChange={e => updateField('district', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Area</Label>
                <Input value={String(currentValue('area') || '')} onChange={e => updateField('area', e.target.value)} className="mt-1" />
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label className="text-xs text-muted-foreground">Tags</Label>
              <Input
                value={Array.isArray(currentValue('tags')) ? (currentValue('tags') as string[]).join(', ') : ''}
                onChange={e => updateField('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                className="mt-1"
                placeholder="Comma-separated tags"
              />
            </div>

            {/* Flags */}
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!currentValue('is_featured')} onChange={e => updateField('is_featured', e.target.checked)} className="rounded" />
                <Star className="h-3.5 w-3.5" /> Featured
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!currentValue('is_negotiable')} onChange={e => updateField('is_negotiable', e.target.checked)} className="rounded" />
                Negotiable
              </label>
            </div>

            {/* Listing Stats */}
            <div className="grid grid-cols-4 gap-2 pt-2">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <Eye className="h-4 w-4 mx-auto text-muted-foreground" />
                <div className="text-sm font-semibold mt-1">{ad.views_count || 0}</div>
                <div className="text-xs text-muted-foreground">Views</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <Heart className="h-4 w-4 mx-auto text-muted-foreground" />
                <div className="text-sm font-semibold mt-1">{ad.favorites_count || 0}</div>
                <div className="text-xs text-muted-foreground">Favorites</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <Share2 className="h-4 w-4 mx-auto text-muted-foreground" />
                <div className="text-sm font-semibold mt-1">{ad.shares_count || 0}</div>
                <div className="text-xs text-muted-foreground">Shares</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <Flag className="h-4 w-4 mx-auto text-muted-foreground" />
                <div className="text-sm font-semibold mt-1">{actions.filter(a => a.action_type === 'auto_flagged').length}</div>
                <div className="text-xs text-muted-foreground">Flags</div>
              </div>
            </div>

            {/* ===== Audit Timeline ===== */}
            <Separator className="my-4" />
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <History className="h-4 w-4" /> Audit Timeline
                <Badge variant="secondary" className="text-xs">{actionsTotal} events</Badge>
              </h3>

              {actions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No audit events yet</p>
              ) : (
                <div className="space-y-2">
                  {actions.slice(0, actionsVisible).map((action) => {
                    const meta = ACTION_TYPE_META[action.action_type] || { label: action.action_type, color: 'gray', icon: 'package' };
                    const Icon = actionIcon(meta.icon);
                    return (
                      <div key={action.id} className={`rounded-lg border p-3 ${actionColor(meta.color)}`}>
                        <div className="flex items-start gap-2">
                          <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium">{meta.label}</span>
                              <span className="text-xs text-muted-foreground shrink-0">{format(new Date(action.created_at), 'MMM d, HH:mm:ss')}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {action.moderator_name || 'System'}
                              {action.duration_from_previous_seconds != null && ` · +${action.duration_from_previous_seconds}s`}
                              {action.version_number && ` · v${action.version_number}`}
                            </div>
                            {action.reason && <div className="text-xs mt-1 opacity-80">Reason: {action.reason}</div>}
                            {action.notes && <div className="text-xs mt-1 opacity-80">Notes: {action.notes}</div>}
                            {action.previous_value && action.new_value && (
                              <div className="text-xs mt-1 space-y-0.5">
                                {Object.entries(action.previous_value).map(([key, oldVal]) => (
                                  <div key={key} className="flex items-center gap-1">
                                    <span className="text-muted-foreground line-through">{String(oldVal)}</span>
                                    <ArrowRight className="h-3 w-3" />
                                    <span className="font-medium">{String(action.new_value?.[key] ?? '')}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {actionsTotal > actionsVisible && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setActionsVisible(actionsVisible + 10)}
                    >
                      Show more ({actionsTotal - actionsVisible} remaining)
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                  {actionsVisible > 4 && actions.length > 4 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setActionsVisible(4)}
                    >
                      Show less
                      <ChevronUp className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ===== Right: Seller Info + Actions + Notes ===== */}
          <div className="border-l p-4 space-y-4 overflow-y-auto">
            {/* Seller Info */}
            {seller && (
              <div>
                <h3 className="font-semibold text-sm mb-2">Seller Information</h3>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={seller.avatar_url || undefined} />
                    <AvatarFallback>{seller.full_name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{seller.full_name || 'Unknown'}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {seller.is_verified && <ShieldCheck className="h-3 w-3 text-green-600" />}
                      {seller.is_verified ? 'Verified' : 'Unverified'}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Rating</span><span className="font-medium">{seller.seller_rating?.toFixed(1) || 'N/A'} ★</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Sales</span><span className="font-medium">{seller.total_sales || 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Listings</span><span className="font-medium">{seller.total_listings || 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Member Since</span><span className="font-medium">{seller.created_at ? format(new Date(seller.created_at), 'MMM yyyy') : 'N/A'}</span></div>
                  {seller.phone_number && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-medium font-mono">{seller.phone_number}</span></div>
                  )}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-2 gap-1" as="a" href={`/user/${seller.user_id}`} target="_blank">
                  <ExternalLink className="h-3.5 w-3.5" /> View Seller Profile
                </Button>
              </div>
            )}

            <Separator />

            {/* Moderation Actions */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Moderation Actions</h3>
              <div className="space-y-2">
                <Button
                  size="sm"
                  className="w-full gap-1 bg-green-600 hover:bg-green-700"
                  onClick={handleApprove}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Approve <kbd className="ml-auto text-[10px] opacity-70">A</kbd>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full gap-1"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={actionLoading}
                >
                  <XCircle className="h-4 w-4" /> Reject <kbd className="ml-auto text-[10px] opacity-70">R</kbd>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-1"
                  onClick={handleRequestChanges}
                  disabled={actionLoading}
                >
                  <FileText className="h-4 w-4" /> Request Changes
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" className="gap-1" onClick={handleSuspend} disabled={actionLoading}>
                    <Ban className="h-3.5 w-3.5" /> Suspend
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={handleHide} disabled={actionLoading}>
                    <EyeOff className="h-3.5 w-3.5" /> Hide
                  </Button>
                </div>
                <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => setShowEscalateDialog(true)} disabled={actionLoading}>
                  <ArrowUp className="h-3.5 w-3.5" /> Escalate
                </Button>
                <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => setShowAssignDialog(true)} disabled={actionLoading}>
                  <UserCog className="h-3.5 w-3.5" /> Assign
                </Button>
              </div>
            </div>

            {/* Save / Undo edits */}
            {hasEdits && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Button size="sm" variant="default" className="w-full gap-1" onClick={handleSaveWithoutApprove} disabled={actionLoading}>
                    <Save className="h-3.5 w-3.5" /> Save Changes <kbd className="ml-auto text-[10px] opacity-70">S</kbd>
                  </Button>
                  <Button size="sm" variant="ghost" className="w-full gap-1" onClick={handleUndoEdits}>
                    <Undo2 className="h-3.5 w-3.5" /> Undo Edits
                  </Button>
                </div>
              </>
            )}

            <Separator />

            {/* Internal Notes */}
            <div>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-1">
                <StickyNote className="h-4 w-4" /> Internal Notes
              </h3>
              <div className="space-y-2 mb-2">
                {notes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No notes yet</p>
                ) : notes.map(note => (
                  <div key={note.id} className="rounded-lg bg-muted/50 p-2 text-xs">
                    <p>{note.note}</p>
                    <div className="text-muted-foreground mt-1">
                      {note.moderator_name} · {formatDistanceToNow(new Date(note.created_at))} ago
                    </div>
                  </div>
                ))}
              </div>
              <Textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Add internal note..."
                rows={2}
                className="text-sm"
              />
              <Button size="sm" variant="outline" className="w-full mt-1" onClick={handleAddNote} disabled={!noteText.trim()}>
                Add Note
              </Button>
            </div>

            <Separator />

            {/* Keyboard shortcuts help */}
            <div className="text-xs text-muted-foreground space-y-1">
              <h4 className="font-medium text-foreground mb-1">Shortcuts</h4>
              <div className="flex justify-between"><span>Approve</span><kbd className="font-mono">A / Ctrl+↵</kbd></div>
              <div className="flex justify-between"><span>Reject</span><kbd className="font-mono">R</kbd></div>
              <div className="flex justify-between"><span>Save</span><kbd className="font-mono">S</kbd></div>
              <div className="flex justify-between"><span>Next / Prev</span><kbd className="font-mono">N / P</kbd></div>
              <div className="flex justify-between"><span>Zoom image</span><kbd className="font-mono">Space</kbd></div>
              <div className="flex justify-between"><span>Exit</span><kbd className="font-mono">Esc</kbd></div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Reject Dialog ===== */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowRejectDialog(false)}>
          <div className="bg-card rounded-lg max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" /> Reject Listing
            </h3>
            <div>
              <Label>Reason *</Label>
              <Select value={rejectReason} onValueChange={setRejectReason}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prohibited_item">Prohibited Item</SelectItem>
                  <SelectItem value="spam_duplicate">Spam / Duplicate</SelectItem>
                  <SelectItem value="inappropriate_content">Inappropriate Content</SelectItem>
                  <SelectItem value="fake_counterfeit">Fake / Counterfeit</SelectItem>
                  <SelectItem value="price_manipulation">Price Manipulation</SelectItem>
                  <SelectItem value="misleading_description">Misleading Description</SelectItem>
                  <SelectItem value="contact_info_in_description">Contact Info in Description</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} rows={3} className="mt-1" placeholder="Additional feedback..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject} disabled={!rejectReason || actionLoading}>
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Escalate Dialog ===== */}
      {showEscalateDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowEscalateDialog(false)}>
          <div className="bg-card rounded-lg max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold flex items-center gap-2 text-orange-600">
              <ArrowUp className="h-5 w-5" /> Escalate Listing
            </h3>
            <div>
              <Label>Reason *</Label>
              <Textarea value={escalateReason} onChange={e => setEscalateReason(e.target.value)} rows={3} className="mt-1" placeholder="Why is this being escalated?" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowEscalateDialog(false)}>Cancel</Button>
              <Button variant="default" onClick={handleEscalate} disabled={!escalateReason || actionLoading} className="bg-orange-600 hover:bg-orange-700">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />} Confirm Escalation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Assign Dialog ===== */}
      {showAssignDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowAssignDialog(false)}>
          <div className="bg-card rounded-lg max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold flex items-center gap-2">
              <UserCog className="h-5 w-5" /> Assign to Moderator
            </h3>
            <div>
              <Label>Moderator User ID or Email</Label>
              <Input value={assignTo} onChange={e => setAssignTo(e.target.value)} className="mt-1" placeholder="user-id or email" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
              <Button onClick={handleAssign} disabled={!assignTo || actionLoading}>
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCog className="h-4 w-4" />} Assign
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
