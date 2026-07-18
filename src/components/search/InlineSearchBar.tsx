import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface InlineSearchBarProps {
  /** Initial value to prefill the input with. */
  initialValue?: string;
  /**
   * Optional submit handler. When provided it is called with the trimmed
   * query instead of navigating to the global search page.
   */
  onSubmit?: (query: string) => void;
  className?: string;
}

/**
 * Search bar placed inline within listing pages, to the left of the sort
 * dropdown. Submitting navigates to the global search page unless a custom
 * onSubmit handler is provided.
 */
export function InlineSearchBar({ initialValue = '', onSubmit, className }: InlineSearchBarProps) {
  const [value, setValue] = useState(initialValue);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = value.trim();
    if (onSubmit) {
      onSubmit(query);
    } else if (query) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className || 'relative w-full sm:w-56 md:w-64'}>
      <Input
        type="text"
        placeholder={t('search.searchPlaceholder')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pr-10"
      />
      <Button
        type="submit"
        size="icon"
        variant="ghost"
        className="absolute right-0 top-0 h-full"
        aria-label={t('search.searchPlaceholder')}
      >
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
}
