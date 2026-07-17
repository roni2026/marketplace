import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: 'en' | 'bn') => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    toast.success(t('languageSwitcher.languageChanged', { language: lng === 'bn' ? t('common.bangla') : t('common.english') }));
  };

  const isBn = i18n.language?.startsWith('bn');

  return (
    <Button
      variant="ghost"
      size="sm"
      className="font-bold text-sm px-2 py-1 min-w-[40px]"
      onClick={() => changeLanguage(isBn ? 'en' : 'bn')}
    >
      {isBn ? 'EN' : 'BN'}
    </Button>
  );
}
