// BazarBD — Phase 2: SocialLinks component
// components/profile/SocialLinks.tsx

import { Facebook, Twitter, Instagram, Linkedin, Youtube, Globe, MessageCircle, Send } from 'lucide-react';
import type { SocialLinks as SocialLinksType } from '@/integrations/supabase/types_v2_profiles';
import { useTranslation } from 'react-i18next';

interface SocialLinksProps {
  links: SocialLinksType;
}

const iconMap: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  facebook: { icon: Facebook, label: 'Facebook', color: 'hover:text-blue-600' },
  twitter: { icon: Twitter, label: 'Twitter', color: 'hover:text-sky-500' },
  instagram: { icon: Instagram, label: 'Instagram', color: 'hover:text-pink-600' },
  linkedin: { icon: Linkedin, label: 'LinkedIn', color: 'hover:text-blue-700' },
  youtube: { icon: Youtube, label: 'YouTube', color: 'hover:text-red-600' },
  whatsapp: { icon: MessageCircle, label: 'WhatsApp', color: 'hover:text-green-600' },
  telegram: { icon: Send, label: 'Telegram', color: 'hover:text-blue-500' },
  website: { icon: Globe, label: 'Website', color: 'hover:text-primary' },
};

export function SocialLinks({ links }: SocialLinksProps) {
  const { t } = useTranslation();

  if (!links || Object.keys(links).length === 0) return null;

  const entries = Object.entries(links).filter(([, url]) => url && url.trim());

  if (entries.length === 0) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm text-muted-foreground">{t('profile.connect')}:</span>
      {entries.map(([key, url]) => {
        const config = iconMap[key];
        if (!config) return null;
        const Icon = config.icon;
        const href = key === 'whatsapp' ? `https://wa.me/${url}` : key === 'telegram' ? `https://t.me/${url}` : url;
        return (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-muted-foreground transition-colors ${config.color}`}
            title={config.label}
            aria-label={config.label}
          >
            <Icon className="h-5 w-5" />
          </a>
        );
      })}
    </div>
  );
}
