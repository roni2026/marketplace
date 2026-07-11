import { supabase } from '@/integrations/supabase/client';

export async function getTranslations(locale: string) {
  const { data, error } = await supabase
    .from('translations')
    .select('key_id, value, locale')
    .eq('locale', locale);
  if (error) throw error;

  const { data: keys, error: keysError } = await supabase
    .from('translation_keys')
    .select('id, key, namespace');
  if (keysError) throw keysError;

  const keyMap = new Map(keys.map((k) => [k.id, k.key]));
  const translations: Record<string, string> = {};
  (data ?? []).forEach((t) => {
    const key = keyMap.get(t.key_id);
    if (key) translations[key] = t.value;
  });
  return translations;
}

export async function getTranslation(key: string, locale: string) {
  const { data: keyRow, error: keyError } = await supabase
    .from('translation_keys')
    .select('id')
    .eq('key', key)
    .single();
  if (keyError) return null;

  const { data, error } = await supabase
    .from('translations')
    .select('value')
    .eq('key_id', keyRow.id)
    .eq('locale', locale)
    .single();
  if (error) return null;
  return data?.value ?? null;
}

export async function updateTranslation(keyId: string, locale: string, value: string) {
  const { data, error } = await supabase
    .from('translations')
    .upsert({ key_id: keyId, locale, value })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getSupportedLocales() {
  return [
    { code: 'en', name: 'English', nativeName: 'English', rtl: false },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', rtl: false },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', rtl: false },
    { code: 'ur', name: 'Urdu', nativeName: 'اردو', rtl: true },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
    { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false },
    { code: 'fr', name: 'French', nativeName: 'Français', rtl: false },
    { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false },
  ];
}

export async function addLocale(code: string, name: string) {
  // Placeholder: would add locale to supported list
  return { code, name, addedAt: new Date().toISOString() };
}

export function formatCurrency(amount: number, currency: string, _locale: string) {
  const currencySymbols: Record<string, string> = {
    BDT: '৳',
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    PKR: '₨',
    SAR: 'ر.س',
    AED: 'د.إ',
  };
  const symbol = currencySymbols[currency] ?? currency;
  return `${symbol}${amount.toLocaleString()}`;
}

export function formatDate(date: string | Date, locale: string, format?: string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  try {
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: format === 'short' ? 'short' : 'long',
      day: 'numeric',
    });
  } catch {
    return d.toLocaleDateString();
  }
}

export function formatNumber(num: number, locale: string) {
  try {
    return num.toLocaleString(locale);
  } catch {
    return num.toLocaleString();
  }
}

export function setRTL(isRTL: boolean) {
  if (typeof document !== 'undefined') {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }
}

export async function getLocaleSettings(locale: string) {
  const localeMap: Record<string, { timezone: string; dateFormat: string; numberFormat: string; currency: string }> = {
    en: { timezone: 'UTC', dateFormat: 'MM/DD/YYYY', numberFormat: 'en-US', currency: 'USD' },
    bn: { timezone: 'Asia/Dhaka', dateFormat: 'DD/MM/YYYY', numberFormat: 'bn-BD', currency: 'BDT' },
    hi: { timezone: 'Asia/Kolkata', dateFormat: 'DD/MM/YYYY', numberFormat: 'hi-IN', currency: 'INR' },
    ur: { timezone: 'Asia/Karachi', dateFormat: 'DD/MM/YYYY', numberFormat: 'ur-PK', currency: 'PKR' },
    ar: { timezone: 'Asia/Riyadh', dateFormat: 'DD/MM/YYYY', numberFormat: 'ar-SA', currency: 'SAR' },
    es: { timezone: 'Europe/Madrid', dateFormat: 'DD/MM/YYYY', numberFormat: 'es-ES', currency: 'EUR' },
    fr: { timezone: 'Europe/Paris', dateFormat: 'DD/MM/YYYY', numberFormat: 'fr-FR', currency: 'EUR' },
    de: { timezone: 'Europe/Berlin', dateFormat: 'DD.MM.YYYY', numberFormat: 'de-DE', currency: 'EUR' },
  };
  return localeMap[locale] ?? localeMap.en;
}
