import { supabase } from '@/integrations/supabase/client';

export interface AccessibilitySettings {
  high_contrast: boolean;
  font_scale: number;
  screen_reader: boolean;
  keyboard_nav: boolean;
}

export async function getAccessibilitySettings(userId: string): Promise<AccessibilitySettings> {
  const { data, error } = await supabase
    .from('accessibility_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;

  if (data) {
    return {
      high_contrast: data.high_contrast,
      font_scale: data.font_scale,
      screen_reader: data.screen_reader,
      keyboard_nav: data.keyboard_nav,
    };
  }

  return {
    high_contrast: false,
    font_scale: 1.0,
    screen_reader: false,
    keyboard_nav: false,
  };
}

export async function updateAccessibilitySettings(userId: string, settings: Partial<AccessibilitySettings>) {
  const { data: existing } = await supabase
    .from('accessibility_settings')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('accessibility_settings')
      .update(settings)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('accessibility_settings')
    .insert({ user_id: userId, ...settings })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function toggleHighContrast(enable: boolean) {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('high-contrast', enable);
  }
}

export function setFontScale(scale: number) {
  if (typeof document !== 'undefined') {
    document.documentElement.style.fontSize = `${scale * 100}%`;
  }
}

export function toggleScreenReader(enable: boolean) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-screen-reader', enable ? 'true' : 'false');
  }
}

export function toggleKeyboardNav(enable: boolean) {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('keyboard-nav', enable);
  }
}

export async function runAccessibilityAudit() {
  // Placeholder: would run automated accessibility audit
  return {
    score: 92,
    totalChecks: 50,
    passed: 46,
    warnings: 3,
    failures: 1,
    issues: [
      { severity: 'warning', element: 'img', message: 'Missing alt text on 2 images', wcag: '1.1.1' },
      { severity: 'warning', element: 'button', message: 'Low contrast on 1 button', wcag: '1.4.3' },
      { severity: 'failure', element: 'form', message: 'Missing label on 1 input', wcag: '3.3.2' },
    ],
    auditedAt: new Date().toISOString(),
  };
}

export async function checkWCAGCompliance() {
  // Placeholder: WCAG compliance check
  return {
    level: 'AA',
    compliant: true,
    criteria: {
      '1.1.1 Non-text Content': { status: 'pass', notes: 'All images have alt text' },
      '1.3.1 Info and Relationships': { status: 'pass', notes: 'Proper semantic HTML' },
      '1.4.3 Contrast (Minimum)': { status: 'warning', notes: 'Some elements near minimum contrast' },
      '1.4.4 Resize Text': { status: 'pass', notes: 'Text scales to 200%' },
      '2.1.1 Keyboard': { status: 'pass', notes: 'All functionality keyboard accessible' },
      '2.4.6 Headings and Labels': { status: 'pass', notes: 'Descriptive headings' },
      '3.3.2 Labels or Instructions': { status: 'warning', notes: '1 form missing label' },
      '4.1.2 Name, Role, Value': { status: 'pass', notes: 'ARIA attributes correct' },
    },
  };
}
