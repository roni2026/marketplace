/**
 * Enterprise Moderation Library
 *
 * All moderation business logic: sessions, actions, audit trail,
 * listing versions, notes, queue events.
 *
 * Every action is append-only — nothing is ever updated or deleted.
 */

import { supabase } from '@/integrations/supabase/client';

// =========================================================================
// Types
// =========================================================================

export interface ModerationSession {
  id: string;
  moderator_id: string;
  moderator_name: string | null;
  started_at: string;
  ended_at: string | null;
  session_duration_seconds: number | null;
  ads_reviewed: number;
  approvals: number;
  rejections: number;
  skipped: number;
  escalated: number;
  errors: number;
  avg_response_time_seconds: number | null;
  avg_handling_time_seconds: number | null;
  queue_size_at_start: number | null;
  is_active: boolean;
}

export interface ModerationAction {
  id: string;
  listing_id: string;
  moderator_id: string | null;
  moderator_name: string | null;
  moderator_role: string | null;
  action_type: ModerationActionType;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason: string | null;
  notes: string | null;
  ip_address: string | null;
  browser_session_id: string | null;
  version_number: number;
  duration_from_previous_seconds: number | null;
  created_at: string;
}

export type ModerationActionType =
  | 'manual_review_initialized'
  | 'title_changed'
  | 'description_edited'
  | 'price_changed'
  | 'category_changed'
  | 'brand_changed'
  | 'model_changed'
  | 'location_changed'
  | 'condition_changed'
  | 'tags_changed'
  | 'image_deleted'
  | 'image_reordered'
  | 'phone_removed'
  | 'duplicate_detected'
  | 'seller_warned'
  | 'internal_note_added'
  | 'approval'
  | 'rejection'
  | 'request_changes'
  | 'suspend'
  | 'hide'
  | 'escalated'
  | 'assigned'
  | 'seller_contacted'
  | 'reopened'
  | 'restored'
  | 'visibility_changed'
  | 'system_action'
  | 'ai_suggestion'
  | 'auto_flagged'
  | 'save_without_approve'
  | 'undo_edits'
  | 'preview_listing';

export interface ListingVersion {
  id: string;
  listing_id: string;
  version_number: number;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_by_name: string | null;
  changed_at: string;
}

export interface ModerationNote {
  id: string;
  listing_id: string;
  moderator_id: string;
  moderator_name: string | null;
  note: string;
  is_pinned: boolean;
  created_at: string;
}

export interface QueueEvent {
  id: string;
  listing_id: string;
  event_type: string;
  moderator_id: string | null;
  from_moderator: string | null;
  to_moderator: string | null;
  queue_position: number | null;
  wait_time_seconds: number | null;
  created_at: string;
}

// =========================================================================
// Session Management
// =========================================================================

export async function startModerationSession(
  moderatorId: string,
  moderatorName: string,
  queueSize: number,
): Promise<ModerationSession | null> {
  try {
    // End any existing active sessions for this moderator
    await supabase
      .from('moderation_sessions')
      .update({
        is_active: false,
        ended_at: new Date().toISOString(),
        session_duration_seconds: Math.floor(
          (Date.now() - Date.now()) / 1000,
        ),
      })
      .eq('moderator_id', moderatorId)
      .eq('is_active', true);

    const { data, error } = await supabase
      .from('moderation_sessions')
      .insert({
        moderator_id: moderatorId,
        moderator_name: moderatorName,
        queue_size_at_start: queueSize,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ModerationSession;
  } catch (err) {
    console.error('startModerationSession error:', err);
    return null;
  }
}

export async function endModerationSession(sessionId: string): Promise<void> {
  try {
    const { data: session } = await supabase
      .from('moderation_sessions')
      .select('started_at, ads_reviewed, approvals, rejections')
      .eq('id', sessionId)
      .single();

    if (session) {
      const durationSeconds = Math.floor(
        (Date.now() - new Date(session.started_at).getTime()) / 1000,
      );
      const avgHandling =
        session.ads_reviewed > 0
          ? Math.floor(durationSeconds / session.ads_reviewed)
          : null;

      await supabase
        .from('moderation_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
          session_duration_seconds: durationSeconds,
          avg_handling_time_seconds: avgHandling,
        })
        .eq('id', sessionId);
    }
  } catch (err) {
    console.error('endModerationSession error:', err);
  }
}

export async function updateSessionStats(
  sessionId: string,
  field: 'ads_reviewed' | 'approvals' | 'rejections' | 'skipped' | 'escalated' | 'errors',
): Promise<void> {
  try {
    // Fetch current then increment (safe upsert pattern)
    const { data } = await supabase
      .from('moderation_sessions')
      .select(field)
      .eq('id', sessionId)
      .single();

    if (data) {
      await supabase
        .from('moderation_sessions')
        .update({ [field]: (data[field] || 0) + 1 })
        .eq('id', sessionId);
    }
  } catch (err) {
    console.error('updateSessionStats error:', err);
  }
}

export async function getActiveSession(
  moderatorId: string,
): Promise<ModerationSession | null> {
  try {
    const { data, error } = await supabase
      .from('moderation_sessions')
      .select('*')
      .eq('moderator_id', moderatorId)
      .eq('is_active', true)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as ModerationSession | null;
  } catch (err) {
    console.error('getActiveSession error:', err);
    return null;
  }
}

// =========================================================================
// Moderation Actions (Audit Trail)
// =========================================================================

export async function logModerationAction(params: {
  listingId: string;
  moderatorId: string;
  moderatorName?: string;
  moderatorRole?: string;
  actionType: ModerationActionType;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  reason?: string;
  notes?: string;
  browserSessionId?: string;
}): Promise<ModerationAction | null> {
  try {
    // Get the current max version_number for this listing
    const { data: existing } = await supabase
      .from('moderation_actions')
      .select('version_number')
      .eq('listing_id', params.listingId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (existing?.version_number || 0) + 1;

    // Calculate duration from previous event
    let durationFromPrev: number | null = null;
    const { data: prevAction } = await supabase
      .from('moderation_actions')
      .select('created_at')
      .eq('listing_id', params.listingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (prevAction) {
      durationFromPrev = Math.floor(
        (Date.now() - new Date(prevAction.created_at).getTime()) / 1000,
      );
    }

    const { data, error } = await supabase
      .from('moderation_actions')
      .insert({
        listing_id: params.listingId,
        moderator_id: params.moderatorId,
        moderator_name: params.moderatorName || null,
        moderator_role: params.moderatorRole || null,
        action_type: params.actionType,
        previous_value: params.previousValue || null,
        new_value: params.newValue || null,
        reason: params.reason || null,
        notes: params.notes || null,
        browser_session_id: params.browserSessionId || null,
        version_number: nextVersion,
        duration_from_previous_seconds: durationFromPrev,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ModerationAction;
  } catch (err) {
    console.error('logModerationAction error:', err);
    return null;
  }
}

export async function getModerationActions(
  listingId: string,
  limit = 50,
  offset = 0,
): Promise<{ actions: ModerationAction[]; total: number }> {
  try {
    const [dataRes, countRes] = await Promise.all([
      supabase
        .from('moderation_actions')
        .select('*')
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
      supabase
        .from('moderation_actions')
        .select('*', { count: 'exact', head: true })
        .eq('listing_id', listingId),
    ]);

    return {
      actions: (dataRes.data as ModerationAction[]) || [],
      total: countRes.count || 0,
    };
  } catch (err) {
    console.error('getModerationActions error:', err);
    return { actions: [], total: 0 };
  }
}

/**
 * Check if "Manual Review Initialized" already exists for a listing.
 * Only create it once — never duplicate.
 */
export async function hasManualReviewInitialized(
  listingId: string,
): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('moderation_actions')
      .select('*', { count: 'exact', head: true })
      .eq('listing_id', listingId)
      .eq('action_type', 'manual_review_initialized');

    if (error) throw error;
    return (count || 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Create "Manual Review Initialized" if it doesn't already exist.
 * Returns true if created, false if already existed.
 */
export async function ensureManualReviewInitialized(
  listingId: string,
  moderatorId: string,
  moderatorName: string,
  moderatorRole: string,
  reason = 'Entered moderation queue',
): Promise<boolean> {
  try {
    const exists = await hasManualReviewInitialized(listingId);
    if (exists) return false;

    await logModerationAction({
      listingId,
      moderatorId,
      moderatorName,
      moderatorRole,
      actionType: 'manual_review_initialized',
      reason,
    });

    // Also record a queue event
    await supabase.from('moderation_queue_events').insert({
      listing_id: listingId,
      event_type: 'entered_queue',
      moderator_id: moderatorId,
    });

    return true;
  } catch (err) {
    console.error('ensureManualReviewInitialized error:', err);
    return false;
  }
}

// =========================================================================
// Listing Versions (Field Change History)
// =========================================================================

export async function saveListingVersion(params: {
  listingId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  changedByName?: string;
  moderationActionId?: string;
}): Promise<void> {
  try {
    // Get current max version
    const { data: existing } = await supabase
      .from('listing_versions')
      .select('version_number')
      .eq('listing_id', params.listingId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (existing?.version_number || 0) + 1;

    await supabase.from('listing_versions').insert({
      listing_id: params.listingId,
      version_number: nextVersion,
      field_name: params.fieldName,
      old_value: params.oldValue,
      new_value: params.newValue,
      changed_by: params.changedBy,
      changed_by_name: params.changedByName || null,
      moderation_action_id: params.moderationActionId || null,
    });
  } catch (err) {
    console.error('saveListingVersion error:', err);
  }
}

export async function getListingVersions(
  listingId: string,
): Promise<ListingVersion[]> {
  try {
    const { data, error } = await supabase
      .from('listing_versions')
      .select('*')
      .eq('listing_id', listingId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return (data as ListingVersion[]) || [];
  } catch (err) {
    console.error('getListingVersions error:', err);
    return [];
  }
}

// =========================================================================
// Moderation Notes
// =========================================================================

export async function getModerationNotes(
  listingId: string,
): Promise<ModerationNote[]> {
  try {
    const { data, error } = await supabase
      .from('moderation_notes')
      .select('*')
      .eq('listing_id', listingId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as ModerationNote[]) || [];
  } catch (err) {
    console.error('getModerationNotes error:', err);
    return [];
  }
}

export async function addModerationNote(
  listingId: string,
  moderatorId: string,
  moderatorName: string,
  note: string,
): Promise<ModerationNote | null> {
  try {
    const { data, error } = await supabase
      .from('moderation_notes')
      .insert({
        listing_id: listingId,
        moderator_id: moderatorId,
        moderator_name: moderatorName,
        note,
      })
      .select()
      .single();

    if (error) throw error;

    // Also log as a moderation action
    await logModerationAction({
      listingId,
      moderatorId,
      moderatorName,
      actionType: 'internal_note_added',
      notes: note,
    });

    return data as ModerationNote;
  } catch (err) {
    console.error('addModerationNote error:', err);
    return null;
  }
}

// =========================================================================
// Queue Events
// =========================================================================

export async function logQueueEvent(params: {
  listingId: string;
  eventType: string;
  moderatorId?: string;
  fromModerator?: string;
  toModerator?: string;
  queuePosition?: number;
  waitTimeSeconds?: number;
}): Promise<void> {
  try {
    await supabase.from('moderation_queue_events').insert({
      listing_id: params.listingId,
      event_type: params.eventType,
      moderator_id: params.moderatorId || null,
      from_moderator: params.fromModerator || null,
      to_moderator: params.toModerator || null,
      queue_position: params.queuePosition || null,
      wait_time_seconds: params.waitTimeSeconds || null,
    });
  } catch (err) {
    console.error('logQueueEvent error:', err);
  }
}

// =========================================================================
// Helper: Detect field changes and log versions
// =========================================================================

export function detectFieldChanges(
  original: Record<string, unknown>,
  edited: Record<string, unknown>,
): { field: string; oldValue: string; newValue: string }[] {
  const changes: { field: string; oldValue: string; newValue: string }[] = [];
  for (const key of Object.keys(edited)) {
    const oldVal = original[key];
    const newVal = edited[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        field: key,
        oldValue: oldVal == null ? '' : String(oldVal),
        newValue: newVal == null ? '' : String(newVal),
      });
    }
  }
  return changes;
}

// =========================================================================
// Action type metadata for UI rendering
// =========================================================================

export const ACTION_TYPE_META: Record<
  ModerationActionType,
  { label: string; color: string; icon: string }
> = {
  manual_review_initialized: { label: 'Manual Review Initialized', color: 'gray', icon: 'eye' },
  title_changed: { label: 'Title Changed', color: 'blue', icon: 'edit' },
  description_edited: { label: 'Description Edited', color: 'blue', icon: 'edit' },
  price_changed: { label: 'Price Changed', color: 'blue', icon: 'dollar' },
  category_changed: { label: 'Category Changed', color: 'blue', icon: 'folder' },
  brand_changed: { label: 'Brand Changed', color: 'blue', icon: 'tag' },
  model_changed: { label: 'Model Changed', color: 'blue', icon: 'tag' },
  location_changed: { label: 'Location Changed', color: 'blue', icon: 'map' },
  condition_changed: { label: 'Condition Changed', color: 'blue', icon: 'package' },
  tags_changed: { label: 'Tags Changed', color: 'blue', icon: 'tag' },
  image_deleted: { label: 'Image Deleted', color: 'orange', icon: 'image' },
  image_reordered: { label: 'Image Reordered', color: 'orange', icon: 'image' },
  phone_removed: { label: 'Phone Removed', color: 'orange', icon: 'phone' },
  duplicate_detected: { label: 'Duplicate Detected', color: 'orange', icon: 'copy' },
  seller_warned: { label: 'Seller Warned', color: 'orange', icon: 'alert' },
  internal_note_added: { label: 'Internal Note Added', color: 'gray', icon: 'note' },
  approval: { label: 'Approval', color: 'green', icon: 'check' },
  rejection: { label: 'Rejection', color: 'red', icon: 'x' },
  request_changes: { label: 'Request Changes', color: 'orange', icon: 'edit' },
  suspend: { label: 'Suspended', color: 'red', icon: 'ban' },
  hide: { label: 'Hidden', color: 'gray', icon: 'eye-off' },
  escalated: { label: 'Escalated', color: 'orange', icon: 'arrow-up' },
  assigned: { label: 'Assigned', color: 'blue', icon: 'user' },
  seller_contacted: { label: 'Seller Contacted', color: 'blue', icon: 'mail' },
  reopened: { label: 'Reopened', color: 'orange', icon: 'rotate' },
  restored: { label: 'Restored', color: 'green', icon: 'rotate' },
  visibility_changed: { label: 'Visibility Changed', color: 'gray', icon: 'eye' },
  system_action: { label: 'System Action', color: 'gray', icon: 'server' },
  ai_suggestion: { label: 'AI Suggestion', color: 'purple', icon: 'sparkles' },
  auto_flagged: { label: 'Auto Flagged', color: 'orange', icon: 'flag' },
  save_without_approve: { label: 'Saved Without Approving', color: 'blue', icon: 'save' },
  undo_edits: { label: 'Edits Undone', color: 'gray', icon: 'undo' },
  preview_listing: { label: 'Preview Listing', color: 'gray', icon: 'eye' },
};


// =========================================================================
// Content Moderation Utilities (preserved from original moderation.ts)
// Profanity filtering, spam detection, duplicate detection, keyword filtering
// =========================================================================

const PROFANITY_LIST = [
  'damn', 'hell', 'crap', 'ass', 'bastard', 'idiot', 'stupid',
  'hate', 'kill', 'scam', 'fake', 'fraud', 'cheat', 'steal',
  'illegal', 'weapon', 'drug', 'gamble', 'porno', 'sex', 'nude',
  'violence', 'abuse', 'threat', 'harass', 'spam',
];

const SPAM_KEYWORDS = [
  'click here', 'buy now', 'limited offer', 'act now', 'free money',
  'get rich', 'work from home', 'earn money fast', 'guaranteed income',
  'no risk', '100% free', 'double your', 'miracle', 'amazing deal',
  'once in a lifetime', 'congratulations you won', 'lottery winner',
];

const SUSPICIOUS_PATTERNS = [
  /(.)\1{10,}/i,
  /(http|https|www\.)/gi,
  /\b\d{10,}\b/g,
];

export interface ContentModerationResult {
  passed: boolean;
  flags: string[];
  filteredText?: string;
}

export function filterProfanity(text: string): ContentModerationResult {
  const flags: string[] = [];
  let filtered = text;
  for (const word of PROFANITY_LIST) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(text)) {
      flags.push(`profanity:${word}`);
      filtered = filtered.replace(regex, '*'.repeat(word.length));
    }
  }
  return { passed: flags.length === 0, flags, filteredText: filtered };
}

export function detectSpam(text: string): ContentModerationResult {
  const flags: string[] = [];
  const lowerText = text.toLowerCase();
  for (const keyword of SPAM_KEYWORDS) {
    if (lowerText.includes(keyword)) flags.push(`spam_keyword:${keyword}`);
  }
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(text)) flags.push(`suspicious_pattern:${pattern.source}`);
  }
  return { passed: flags.length === 0, flags };
}

export function detectDuplicate(
  newTitle: string,
  newDescription: string,
  existingAds: { title: string; description: string | null }[],
  threshold = 0.7,
): ContentModerationResult {
  const flags: string[] = [];
  const newWords = new Set(tokenize(newTitle + ' ' + (newDescription || '')));
  for (const existing of existingAds) {
    const existingWords = new Set(tokenize(existing.title + ' ' + (existing.description || '')));
    const similarity = jaccardSimilarity(newWords, existingWords);
    if (similarity >= threshold) {
      flags.push(`duplicate:${similarity.toFixed(2)}:"${existing.title.slice(0, 30)}"`);
    }
  }
  return { passed: flags.length === 0, flags };
}

export function filterBannedKeywords(text: string, bannedKeywords: string[]): ContentModerationResult {
  const flags: string[] = [];
  let filtered = text;
  for (const keyword of bannedKeywords) {
    const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'gi');
    if (regex.test(text)) {
      flags.push(`banned_keyword:${keyword}`);
      filtered = filtered.replace(regex, '*'.repeat(keyword.length));
    }
  }
  return { passed: flags.length === 0, flags, filteredText: filtered };
}

export function moderateContent(
  text: string,
  options?: { bannedKeywords?: string[]; checkSpam?: boolean; checkProfanity?: boolean },
): ContentModerationResult {
  const allFlags: string[] = [];
  let filteredText = text;
  if (options?.checkProfanity !== false) {
    const r = filterProfanity(text);
    allFlags.push(...r.flags);
    if (r.filteredText) filteredText = r.filteredText;
  }
  if (options?.checkSpam !== false) {
    allFlags.push(...detectSpam(text).flags);
  }
  if (options?.bannedKeywords?.length) {
    const r = filterBannedKeywords(filteredText, options.bannedKeywords);
    allFlags.push(...r.flags);
    if (r.filteredText) filteredText = r.filteredText;
  }
  return { passed: allFlags.length === 0, flags: allFlags, filteredText };
}

export function getSpamScore(text: string): number {
  let score = 0;
  const lowerText = text.toLowerCase();
  for (const keyword of SPAM_KEYWORDS) {
    if (lowerText.includes(keyword)) score += 15;
  }
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(text)) score += 10;
  }
  if (text.length > 20 && text === text.toUpperCase()) score += 15;
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 3) score += 10;
  if (/(.)\1{5,}/i.test(text)) score += 10;
  return Math.min(score, 100);
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
}

function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
