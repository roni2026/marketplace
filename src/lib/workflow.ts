import { supabase } from '@/integrations/supabase/client';
import type {
  WorkflowRule,
  WorkflowRuleInsert,
  WorkflowRuleUpdate,
  WorkflowLog,
  CronJob,
  CronJobInsert,
} from '@/integrations/supabase/types_v2_cms';

// -------------------------------------------------------------------------
// Workflow Rules
// -------------------------------------------------------------------------

export async function createWorkflowRule(
  name: string,
  trigger: string,
  condition: Record<string, unknown>,
  action: string
): Promise<WorkflowRule | null> {
  const payload: WorkflowRuleInsert = {
    name,
    trigger,
    condition,
    action,
    is_active: true,
    priority: 0,
  };
  const { data, error } = await supabase
    .from('workflow_rules')
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error('Failed to create workflow rule:', error);
    return null;
  }
  return data as WorkflowRule;
}

export async function getWorkflowRules(): Promise<WorkflowRule[]> {
  const { data, error } = await supabase
    .from('workflow_rules')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch workflow rules:', error);
    return [];
  }
  return (data as WorkflowRule[]) || [];
}

export async function toggleWorkflowRule(ruleId: string, isActive: boolean): Promise<void> {
  const update: WorkflowRuleUpdate = { is_active: isActive };
  const { error } = await supabase.from('workflow_rules').update(update).eq('id', ruleId);
  if (error) {
    console.error('Failed to toggle workflow rule:', error);
  }
}

export async function deleteWorkflowRule(ruleId: string): Promise<void> {
  const { error } = await supabase.from('workflow_rules').delete().eq('id', ruleId);
  if (error) {
    console.error('Failed to delete workflow rule:', error);
  }
}

// -------------------------------------------------------------------------
// Rule Evaluation & Execution
// -------------------------------------------------------------------------

export function evaluateRule(
  rule: WorkflowRule,
  entity: Record<string, unknown>
): boolean {
  const condition = rule.condition || {};
  for (const [key, value] of Object.entries(condition)) {
    if (entity[key] !== value) return false;
  }
  return true;
}

export async function executeAction(
  rule: WorkflowRule,
  entity: Record<string, unknown>
): Promise<boolean> {
  try {
    const entityId = String(entity.id || '');
    const entityType = rule.trigger.replace('_trigger', '');

    switch (rule.action) {
      case 'auto_approve':
        await supabase.from('ads').update({ status: 'approved' }).eq('id', entityId);
        break;
      case 'auto_reject':
        await supabase.from('ads').update({ status: 'rejected' }).eq('id', entityId);
        break;
      case 'auto_feature':
        await supabase.from('ads').update({ is_featured: true }).eq('id', entityId);
        break;
      case 'auto_expire':
        await supabase.from('ads').update({ status: 'expired' }).eq('id', entityId);
        break;
      case 'send_reminder':
        await supabase.from('notifications').insert({
          user_id: String(entity.user_id || ''),
          type: 'ad_expiring',
          title: 'Reminder',
          message: 'Your listing requires attention.',
        });
        break;
      case 'auto_cleanup':
        await supabase.from('ads').delete().eq('id', entityId).eq('status', 'expired');
        break;
      default:
        console.warn(`Unknown workflow action: ${rule.action}`);
        return false;
    }

    await logWorkflowExecution(rule.id, entityId, entityType, rule.action, true);
    return true;
  } catch (error) {
    console.error('Failed to execute workflow action:', error);
    await logWorkflowExecution(rule.id, String(entity.id || ''), rule.trigger, rule.action, false);
    return false;
  }
}

export async function logWorkflowExecution(
  ruleId: string,
  entityId: string,
  entityType: string,
  action: string,
  success: boolean
): Promise<void> {
  try {
    await supabase.from('workflow_logs').insert({
      rule_id: ruleId,
      entity_id: entityId,
      entity_type: entityType,
      action_taken: action,
      success,
    });
  } catch (error) {
    console.error('Failed to log workflow execution:', error);
  }
}

export async function getWorkflowLogs(limit = 50): Promise<WorkflowLog[]> {
  const { data, error } = await supabase
    .from('workflow_logs')
    .select('*, workflow_rules(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('Failed to fetch workflow logs:', error);
    return [];
  }
  return (data as WorkflowLog[]) || [];
}

// -------------------------------------------------------------------------
// Automation Actions
// -------------------------------------------------------------------------

export async function autoApproveTrustedSeller(adId: string): Promise<boolean> {
  try {
    const { data: ad } = await supabase
      .from('ads')
      .select('user_id, profiles!ads_user_id_fkey(role, is_verified)')
      .eq('id', adId)
      .single();

    const profile = (ad as Record<string, unknown>)?.profiles as
      | { role: string; is_verified: boolean | null }
      | null;
    if (profile && profile.is_verified) {
      await supabase.from('ads').update({ status: 'approved' }).eq('id', adId);
      await logWorkflowExecution('', adId, 'ad', 'auto_approve', true);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to auto-approve trusted seller:', error);
    return false;
  }
}

export async function autoRejectSpam(adId: string): Promise<boolean> {
  try {
    const { data: ad } = await supabase
      .from('ads')
      .select('title, description')
      .eq('id', adId)
      .single();

    if (!ad) return false;
    const text = `${(ad as Record<string, unknown>).title || ''} ${(ad as Record<string, unknown>).description || ''}`.toLowerCase();
    const spamKeywords = ['viagra', 'casino', 'lottery', 'free money', 'click here now'];
    const isSpam = spamKeywords.some((kw) => text.includes(kw));

    if (isSpam) {
      await supabase.from('ads').update({ status: 'rejected' }).eq('id', adId);
      await logWorkflowExecution('', adId, 'ad', 'auto_reject', true);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to auto-reject spam:', error);
    return false;
  }
}

export async function autoFeaturePremium(adId: string): Promise<boolean> {
  try {
    const { data: ad } = await supabase
      .from('ads')
      .select('is_premium')
      .eq('id', adId)
      .single();

    if (ad && (ad as Record<string, unknown>).is_premium) {
      await supabase.from('ads').update({ is_featured: true }).eq('id', adId);
      await logWorkflowExecution('', adId, 'ad', 'auto_feature', true);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to auto-feature premium ad:', error);
    return false;
  }
}

export async function autoExpireListings(): Promise<number> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('ads')
      .update({ status: 'expired' })
      .neq('status', 'expired')
      .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .select('id');

    if (error) {
      console.error('Failed to auto-expire listings:', error);
      return 0;
    }
    const expired = (data as { id: string }[]) || [];
    for (const ad of expired) {
      await logWorkflowExecution('', ad.id, 'ad', 'auto_expire', true);
    }
    return expired.length;
  } catch (error) {
    console.error('Failed to auto-expire listings:', error);
    return 0;
  }
}

export async function autoReminders(): Promise<number> {
  try {
    const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: ads } = await supabase
      .from('ads')
      .select('id, user_id, title')
      .eq('status', 'approved')
      .lt('created_at', new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString());

    if (!ads) return 0;
    let count = 0;
    for (const ad of ads as { id: string; user_id: string; title: string }[]) {
      await supabase.from('notifications').insert({
        user_id: ad.user_id,
        type: 'ad_expiring',
        title: 'Your Ad Is Expiring Soon',
        message: `Your listing "${ad.title}" will expire in 3 days. Consider renewing it.`,
        data: { ad_id: ad.id },
      });
      count++;
    }
    return count;
  } catch (error) {
    console.error('Failed to send auto reminders:', error);
    return 0;
  }
}

export async function autoCleanup(): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('ads')
      .delete()
      .eq('status', 'expired')
      .lt('created_at', cutoff)
      .select('id');

    if (error) {
      console.error('Failed to auto-cleanup:', error);
      return 0;
    }
    return ((data as { id: string }[]) || []).length;
  } catch (error) {
    console.error('Failed to auto-cleanup:', error);
    return 0;
  }
}

// -------------------------------------------------------------------------
// Cron Jobs
// -------------------------------------------------------------------------

export async function getCronJobs(): Promise<CronJob[]> {
  const { data, error } = await supabase
    .from('cron_jobs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch cron jobs:', error);
    return [];
  }
  return (data as CronJob[]) || [];
}

export async function createCronJob(
  name: string,
  schedule: string,
  command: string
): Promise<CronJob | null> {
  const payload: CronJobInsert = {
    name,
    schedule,
    command,
    is_active: true,
  };
  const { data, error } = await supabase
    .from('cron_jobs')
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error('Failed to create cron job:', error);
    return null;
  }
  return data as CronJob;
}

export async function toggleCronJob(jobId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('cron_jobs').update({ is_active: isActive }).eq('id', jobId);
  if (error) {
    console.error('Failed to toggle cron job:', error);
  }
}

export async function deleteCronJob(jobId: string): Promise<void> {
  const { error } = await supabase.from('cron_jobs').delete().eq('id', jobId);
  if (error) {
    console.error('Failed to delete cron job:', error);
  }
}
