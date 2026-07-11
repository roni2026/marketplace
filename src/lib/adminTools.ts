import { supabase } from '@/integrations/supabase/client';

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const results: SearchResult[] = [];
  const q = query.trim();

  const [adsRes, usersRes, reportsRes, categoriesRes, ticketsRes] = await Promise.all([
    supabase
      .from('ads')
      .select('id, title, price, location')
      .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      .limit(5),
    supabase
      .from('profiles')
      .select('user_id, full_name, phone_number, email')
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(5),
    supabase
      .from('reports')
      .select('id, reason, status')
      .ilike('reason', `%${q}%`)
      .limit(5),
    supabase
      .from('categories')
      .select('id, name, slug')
      .ilike('name', `%${q}%`)
      .limit(5),
    supabase
      .from('support_tickets')
      .select('id, subject, status')
      .ilike('subject', `%${q}%`)
      .limit(5),
  ]);

  if (adsRes.data) {
    adsRes.data.forEach((ad) =>
      results.push({
        type: 'Ad',
        id: ad.id,
        title: ad.title,
        subtitle: `৳${ad.price} · ${ad.location ?? ''}`,
        href: `/ad/${ad.id}`,
      })
    );
  }
  if (usersRes.data) {
    usersRes.data.forEach((u) =>
      results.push({
        type: 'User',
        id: u.user_id,
        title: u.full_name ?? 'Unknown',
        subtitle: u.email ?? u.phone_number ?? '',
        href: `/admin/users`,
      })
    );
  }
  if (reportsRes.data) {
    reportsRes.data.forEach((r) =>
      results.push({
        type: 'Report',
        id: r.id,
        title: r.reason,
        subtitle: r.status,
        href: `/admin/reports`,
      })
    );
  }
  if (categoriesRes.data) {
    categoriesRes.data.forEach((c) =>
      results.push({
        type: 'Category',
        id: c.id,
        title: c.name,
        subtitle: c.slug,
        href: `/admin/categories`,
      })
    );
  }
  if (ticketsRes.data) {
    ticketsRes.data.forEach((t) =>
      results.push({
        type: 'Ticket',
        id: t.id,
        title: t.subject,
        subtitle: t.status,
        href: `/admin/support`,
      })
    );
  }

  return results;
}

export async function getAdminBookmarks(adminId: string) {
  const { data, error } = await supabase
    .from('admin_bookmarks')
    .select('*')
    .eq('admin_id', adminId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addBookmark(
  adminId: string,
  entityType: string,
  entityId: string,
  label: string
) {
  const { data, error } = await supabase
    .from('admin_bookmarks')
    .insert({ admin_id: adminId, entity_type: entityType, entity_id: entityId, label })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeBookmark(id: string) {
  const { error } = await supabase.from('admin_bookmarks').delete().eq('id', id);
  if (error) throw error;
}

export async function getAdminNotes(adminId: string, entityType: string, entityId: string) {
  const { data, error } = await supabase
    .from('admin_notes')
    .select('*')
    .eq('admin_id', adminId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addAdminNote(
  adminId: string,
  entityType: string,
  entityId: string,
  note: string
) {
  const { data, error } = await supabase
    .from('admin_notes')
    .insert({ admin_id: adminId, entity_type: entityType, entity_id: entityId, note })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAdminReminders(adminId: string) {
  const { data, error } = await supabase
    .from('admin_reminders')
    .select('*')
    .eq('admin_id', adminId)
    .order('reminder_date', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addAdminReminder(adminId: string, title: string, date: string, description?: string) {
  const { data, error } = await supabase
    .from('admin_reminders')
    .insert({ admin_id: adminId, title, reminder_date: date, description })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function completeReminder(id: string) {
  const { data, error } = await supabase
    .from('admin_reminders')
    .update({ completed: true })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function impersonateUser(adminId: string, targetUserId: string, reason: string) {
  const { data, error } = await supabase
    .from('admin_impersonation_logs')
    .insert({ admin_id: adminId, target_user_id: targetUserId, reason })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function stopImpersonation(logId: string) {
  const { data, error } = await supabase
    .from('admin_impersonation_logs')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', logId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getImpersonationLogs() {
  const { data, error } = await supabase
    .from('admin_impersonation_logs')
    .select('*, admin:auth.users!admin_id(email), target:auth.users!target_user_id(email)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    // Fallback without joins
    const { data: fallback, error: err2 } = await supabase
      .from('admin_impersonation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (err2) throw err2;
    return fallback;
  }
  return data;
}

export async function bulkImport(type: string, data: Record<string, unknown>[]) {
  const { data: result, error } = await supabase.from(type).insert(data).select();
  if (error) throw error;
  return result;
}

export async function bulkExport(type: string, filters?: Record<string, unknown>) {
  let query = supabase.from(type).select('*');
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value as string);
    }
  }
  const { data, error } = await query.limit(10000);
  if (error) throw error;
  return data;
}

export async function dataMigration(
  fromTable: string,
  toTable: string,
  mapping: Record<string, string>
) {
  const { data: source, error: srcError } = await supabase.from(fromTable).select('*');
  if (srcError) throw srcError;

  const mapped = (source ?? []).map((row) => {
    const newRow: Record<string, unknown> = {};
    for (const [srcKey, destKey] of Object.entries(mapping)) {
      newRow[destKey] = row[srcKey];
    }
    return newRow;
  });

  const { data: result, error } = await supabase.from(toTable).insert(mapped).select();
  if (error) throw error;
  return result;
}
