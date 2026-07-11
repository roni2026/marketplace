import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { toast } from 'sonner';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: 'en' | 'bn') => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    toast.success(t('languageSwitcher.languageChanged', { language: lng === 'bn' ? t('common.bangla') : t('common.english') }));
  };

  const currentLang = i18n.language?.startsWith('bn') ? 'BN' : 'EN';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Globe className="h-5 w-5" />
          <span className="sr-only">{t('common.language')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => changeLanguage('en')}
          className={i18n.language?.startsWith('en') ? 'font-semibold' : ''}
        >
          {t('common.english')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => changeLanguage('bn')}
          className={i18n.language?.startsWith('bn') ? 'font-semibold' : ''}
        >
          {t('common.bangla')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
