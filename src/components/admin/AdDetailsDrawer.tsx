import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle, XCircle, Trash2, RotateCcw, Rocket, ExternalLink, Pencil,
  Mail, Phone, MapPin, Tag, Layers, Calendar, Clock, User, History,
} from 'lucide-react';
import { formatPrice } from '@/lib/constants';
import {
  getAdDetails, moderateAd, statusBadgeClass,
  type AdDetails, type ModerateAction,
} from '@/lib/adSearch';
import { ACTION_TYPE_META } from '@/lib/moderation';
import { useMyPermissions } from '@/hooks/useMyPermissions';
import {
  CAN_APPROVE_ADS, CAN_REJECT_ADS, CAN_DELETE_ADS, CAN_RESTORE_ADS, CAN_BOOST_ADS,
} from '@/lib/permissions_v2';

interface Props {
  adId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

function Field({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="text-[13px] text-foreground break-words">{children || <span className="text-muted-foreground">—</span>}</div>
      </div>
    </div>
  );
}

export function AdDetailsDrawer({ adId, open, onOpenChange, onChanged }: Props) {
  const { can } = useMyPermissions();
  const [details, setDetails] = useState<AdDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);

  const load = async (id: string) => {
    setLoading(true);
    try {
      const d = await getAdDetails(id);
      setDetails(d);
    } catch {
      toast.error('Failed to load ad details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && adId) load(adId);
    if (!open) setDetails(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, adId]);

  const doAction = async (action: ModerateAction, reason?: string) => {
    if (!adId) return;
    setActing(true);
    try {
      const res = await moderateAd(adId, action, reason);
      if (!res.ok) {
        toast.error(res.error || 'Action failed');
      } else {
        toast.success(`Ad ${action}d`);
        await load(adId);
        onChanged?.();
      }
    } finally {
      setActing(false);
    }
  };

  const dt = (iso: string) => {
    try {
      return { date: format(new Date(iso), 'PP'), time: format(new Date(iso), 'p') };
    } catch {
      return { date: iso, time: '' };
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="text-base font-semibold pr-8 leading-snug">
            {loading ? <Skeleton className="h-5 w-48" /> : details?.title || 'Ad Details'}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2 text-[11px]">
            {details && (
              <>
                <Badge variant="outline" className={`h-5 px-1.5 text-[10px] capitalize ${statusBadgeClass(details.status)}`}>
                  {details.status}
                </Badge>
                <span className="font-mono text-muted-foreground">#{details.id.slice(0, 8)}</span>
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        {/* Quick moderation actions */}
        {details && (
          <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2">
            {can(CAN_APPROVE_ADS) && (
              <Button size="sm" variant="outline" disabled={acting} onClick={() => doAction('approve')} className="h-7 gap-1 text-xs text-green-600 hover:text-green-700">
                <CheckCircle className="h-3.5 w-3.5" /> Approve
              </Button>
            )}
            {can(CAN_REJECT_ADS) && (
              <Button size="sm" variant="outline" disabled={acting} onClick={() => doAction('reject')} className="h-7 gap-1 text-xs text-destructive hover:text-destructive">
                <XCircle className="h-3.5 w-3.5" /> Reject
              </Button>
            )}
            {can(CAN_BOOST_ADS) && (
              <Button size="sm" variant="outline" disabled={acting} onClick={() => doAction(details.is_boosted ? 'unboost' : 'boost')} className="h-7 gap-1 text-xs text-violet-600 hover:text-violet-700">
                <Rocket className="h-3.5 w-3.5" /> {details.is_boosted ? 'Unboost' : 'Boost'}
              </Button>
            )}
            {can(CAN_RESTORE_ADS) && (
              <Button size="sm" variant="outline" disabled={acting} onClick={() => doAction('restore')} className="h-7 gap-1 text-xs">
                <RotateCcw className="h-3.5 w-3.5" /> Restore
              </Button>
            )}
            {can(CAN_DELETE_ADS) && (
              <Button size="sm" variant="outline" disabled={acting} onClick={() => doAction('delete')} className="h-7 gap-1 text-xs text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            )}
            <Button size="sm" variant="ghost" asChild className="h-7 gap-1 text-xs">
              <Link to={`/ad/${details.slug}-${details.id}`} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> View
              </Link>
            </Button>
          </div>
        )}

        <Tabs defaultValue="details" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="mx-4 mt-2 h-8 w-fit">
            <TabsTrigger value="details" className="h-6 text-xs gap-1"><Layers className="h-3.5 w-3.5" /> Details</TabsTrigger>
            <TabsTrigger value="audit" className="h-6 text-xs gap-1">
              <History className="h-3.5 w-3.5" /> Audit Log{details?.history?.length ? ` (${details.history.length})` : ''}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0">
            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : !details ? (
              <p className="p-4 text-sm text-muted-foreground">No details available.</p>
            ) : (
              <>
                <TabsContent value="details" className="m-0 px-4 py-3">
                  {/* Images */}
                  {details.images.length > 0 && (
                    <div className="mb-3 grid grid-cols-4 gap-1.5">
                      {details.images.slice(0, 8).map((img, i) => (
                        <img key={i} src={img.image_url} alt="" loading="lazy"
                          className="aspect-square w-full rounded-md border border-border object-cover" />
                      ))}
                    </div>
                  )}

                  <section>
                    <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Listing Information</h4>
                    <Field icon={Tag} label="Price">{formatPrice(details.price, details.price_type)}</Field>
                    <Field icon={Layers} label="Category">{details.category_name}{details.subcategory_name ? ` › ${details.subcategory_name}` : ''}</Field>
                    <Field icon={Tag} label="Condition"><span className="capitalize">{details.condition}</span></Field>
                    <Field icon={MapPin} label="Location">{[details.area, details.district, details.division].filter(Boolean).join(', ')}</Field>
                    <Field icon={Pencil} label="Description"><span className="whitespace-pre-wrap">{details.description}</span></Field>
                    {details.rejection_message && (
                      <Field icon={XCircle} label="Rejection Message"><span className="text-destructive">{details.rejection_message}</span></Field>
                    )}
                  </section>

                  <Separator className="my-3" />

                  <section>
                    <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Seller Information</h4>
                    <Field icon={User} label="Seller">
                      <Link to={`/user/${details.user_id}`} className="text-primary hover:underline">
                        {details.seller_name || details.user_id.slice(0, 12)}
                      </Link>
                    </Field>
                    <Field icon={Mail} label="Email">{details.seller_email}</Field>
                    <Field icon={Phone} label="Contact Number">
                      {details.contact_phone || details.seller_phone}
                      {(details.secondary_phone || details.seller_secondary_phone) &&
                        ` · ${details.secondary_phone || details.seller_secondary_phone}`}
                    </Field>
                  </section>

                  <Separator className="my-3" />

                  <section>
                    <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Timeline</h4>
                    <Field icon={Calendar} label="Created">{dt(details.created_at).date} · {dt(details.created_at).time}</Field>
                    <Field icon={Clock} label="Updated">{dt(details.updated_at).date} · {dt(details.updated_at).time}</Field>
                    <Field icon={CheckCircle} label="Current Status"><span className="capitalize">{details.status}</span></Field>
                  </section>
                </TabsContent>

                <TabsContent value="audit" className="m-0 px-4 py-3">
                  {details.history.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No moderation history yet.</p>
                  ) : (
                    <ol className="relative space-y-0 border-l border-border pl-4">
                      {details.history.map((h) => {
                        const meta = ACTION_TYPE_META[h.action_type as keyof typeof ACTION_TYPE_META];
                        const when = dt(h.created_at);
                        return (
                          <li key={h.id} className="relative pb-4">
                            <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[13px] font-medium">{meta?.label || h.action_type}</span>
                              <span className="text-[10px] text-muted-foreground">{when.date} · {when.time}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {h.moderator_name || 'System'}
                              {h.moderator_role ? ` · ${h.moderator_role}` : ''}
                            </p>
                            {(h.previous_value || h.new_value) && (
                              <p className="mt-0.5 text-[11px]">
                                {h.previous_value && <span className="text-muted-foreground line-through mr-1">{JSON.stringify(h.previous_value)}</span>}
                                {h.new_value && <span className="text-foreground">{JSON.stringify(h.new_value)}</span>}
                              </p>
                            )}
                            {h.reason && <p className="mt-0.5 text-[11px] italic text-muted-foreground">“{h.reason}”</p>}
                            {h.notes && <p className="mt-0.5 text-[11px] text-muted-foreground">Note: {h.notes}</p>}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </TabsContent>
              </>
            )}
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

export default AdDetailsDrawer;
