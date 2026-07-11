/**
 * SearchAutocomplete — Reusable autocomplete search component with
 * debounced suggestions, keyboard navigation, and type-based routing.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchDiscovery } from '@/hooks/useSearchDiscovery';
import { useAuth } from '@/hooks/useAuth';
import { highlightKeyword } from '@/lib/searchDiscovery';
import type { AutocompleteSuggestion } from '@/integrations/supabase/types_v5_search';
import {
  Search, X, TrendingUp, Package, FolderTree, Tag, Store, User,
  Clock, ChevronRight, Loader2, Hash,
} from 'lucide-react';

interface SearchAutocompleteProps {
  value?: string;
  onChange?: (value: string) => void;
  onSelect?: (suggestion: AutocompleteSuggestion) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  showOnFocus?: boolean;
}

const SUGGESTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  listing: Package,
  category: FolderTree,
  brand: Tag,
  model: Tag,
  seller: User,
  store: Store,
  tag: Hash,
  location: FolderTree,
  keyword: Search,
  trending: TrendingUp,
  recent: Clock,
};

export function SearchAutocomplete({
  value: controlledValue,
  onChange,
  onSelect,
  placeholder = 'Search for anything...',
  className = '',
  autoFocus = false,
  showOnFocus = true,
}: SearchAutocompleteProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchSuggestions, suggestions, fetchTrending } = useSearchDiscovery();

  const [internalValue, setInternalValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((newValue: string) => {
    if (onChange) onChange(newValue);
    else setInternalValue(newValue);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);

    if (newValue.trim().length > 0) {
      loadingTimerRef.current = setTimeout(() => setIsLoading(true), 150);
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(newValue);
        setIsLoading(false);
        setIsOpen(true);
        setActiveIndex(-1);
      }, 200);
    } else {
      setIsLoading(false);
      if (showOnFocus) {
        fetchTrending();
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    }
  }, [onChange, fetchSuggestions, fetchTrending, showOnFocus]);

  const handleFocus = useCallback(() => {
    if (showOnFocus && value.trim().length === 0) {
      fetchTrending();
      setIsOpen(true);
    } else if (value.trim().length > 0) {
      setIsOpen(true);
    }
  }, [showOnFocus, value, fetchTrending]);

  const handleSuggestionClick = useCallback((suggestion: AutocompleteSuggestion) => {
    setIsOpen(false);
    setActiveIndex(-1);
    if (onSelect) {
      onSelect(suggestion);
      return;
    }
    // Navigate based on type
    if (suggestion.href) {
      navigate(suggestion.href);
    } else {
      navigate(`/search?q=${encodeURIComponent(suggestion.value)}`);
    }
    if (onChange) onChange(suggestion.value);
    else setInternalValue(suggestion.value);
  }, [onSelect, onChange, navigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter' && value.trim()) {
        navigate(`/search?q=${encodeURIComponent(value.trim())}`);
        setIsOpen(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          handleSuggestionClick(suggestions[activeIndex]);
        } else if (value.trim()) {
          navigate(`/search?q=${encodeURIComponent(value.trim())}`);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  }, [isOpen, suggestions, activeIndex, value, handleSuggestionClick, navigate]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const handleClear = () => {
    if (onChange) onChange('');
    else setInternalValue('');
    inputRef.current?.focus();
    if (showOnFocus) {
      fetchTrending();
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => handleChange(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-9 pr-9"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="search-suggestions-listbox"
          aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
        {!isLoading && value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div
          id="search-suggestions-listbox"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-96 overflow-y-auto z-50"
        >
          {suggestions.map((suggestion, index) => {
            const Icon = SUGGESTION_ICONS[suggestion.type] || Search;
            const isActive = index === activeIndex;
            return (
              <div
                key={`${suggestion.type}-${suggestion.label}-${index}`}
                id={`suggestion-${index}`}
                role="option"
                aria-selected={isActive}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                  isActive ? 'bg-accent' : 'hover:bg-accent/50'
                }`}
              >
                <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {suggestion.image_url ? (
                    <img src={suggestion.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    dangerouslySetInnerHTML={{ __html: highlightKeyword(suggestion.label, value) }}
                  />
                  {suggestion.subtitle && (
                    <p className="text-xs text-muted-foreground truncate">{suggestion.subtitle}</p>
                  )}
                </div>
                {suggestion.search_count != null && suggestion.search_count > 0 && (
                  <span className="text-xs text-muted-foreground shrink-0">{suggestion.search_count} searches</span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            );
          })}
        </div>
      )}

      {isOpen && !isLoading && suggestions.length === 0 && value.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg p-4 z-50">
          <p className="text-sm text-muted-foreground text-center">No suggestions found. Press Enter to search for "{value}"</p>
        </div>
      )}
    </div>
  );
}

export default SearchAutocomplete;
