import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Search, X, Loader2, MapPin, Sparkles } from 'lucide-react';
import {
  hybridSearchIndia,
  resolveGooglePlaceCoords,
  getPlaceTypeIcon,
  type IndiaPlace,
} from '../lib/indiaSearch';
import { cx } from '../lib/format';

interface Props {
  id?: string;
  value?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  onSearchChange?: (val: string) => void;
  onSelectPlace?: (place: IndiaPlace) => void;
  onSubmitText?: (val: string) => void;
}

export function IndiaSearchBar({
  id = 'map-search',
  value: controlledValue,
  placeholder = 'Search Indian places, cities, food (e.g. Pune, Taj Mahal, Goa)',
  className = '',
  inputClassName = '',
  autoFocus = false,
  onSearchChange,
  onSelectPlace,
  onSubmitText,
}: Props) {
  const [query, setQuery] = useState(controlledValue || '');
  const [suggestions, setSuggestions] = useState<IndiaPlace[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Sync with controlled value if provided
  useEffect(() => {
    if (controlledValue !== undefined && controlledValue !== query) {
      setQuery(controlledValue);
    }
  }, [controlledValue]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Hybrid search with 280ms debounce
  const triggerSearch = (text: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!text.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceTimerRef.current = window.setTimeout(async () => {
      try {
        const results = await hybridSearchIndia(text);
        setSuggestions(results);
        setIsOpen(true);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 280);
  };

  const handleChange = (newVal: string) => {
    setQuery(newVal);
    onSearchChange?.(newVal);
    triggerSearch(newVal);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    onSearchChange?.('');
    inputRef.current?.focus();
  };

  const handleSelect = async (place: IndiaPlace) => {
    setIsOpen(false);
    setQuery(place.name);
    onSearchChange?.(place.name);

    // Resolve coordinates if missing (e.g. from Google Places prediction)
    let resolved = place;
    if (!place.latitude || !place.longitude) {
      setLoading(true);
      resolved = await resolveGooglePlaceCoords(place);
      setLoading(false);
    }

    onSelectPlace?.(resolved);

    // Dispatch global event for 3D map navigation
    window.dispatchEvent(
      new CustomEvent('anvesha:fly-to', {
        detail: resolved,
      })
    );
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSubmitText?.(query);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          handleSelect(suggestions[activeIndex]);
        } else if (suggestions.length > 0) {
          handleSelect(suggestions[0]);
        } else {
          onSubmitText?.(query);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className={cx('relative w-full', className)}>
      <div className="flex h-12 items-center gap-2 rounded-2xl bg-white px-4 shadow-lift transition focus-within:ring-2 focus-within:ring-brand-400">
        <Search size={18} className="shrink-0 text-ink-400" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          autoFocus={autoFocus}
          autoComplete="off"
          aria-label="Search Indian destinations, landmarks, and experiences"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          role="combobox"
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            if (query.trim() && suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cx(
            'min-w-0 flex-1 bg-transparent text-[14px] font-medium text-ink-950 outline-none placeholder:text-ink-400',
            inputClassName
          )}
        />

        {loading && <Loader2 size={16} className="shrink-0 animate-spin text-brand-500" />}

        {query && !loading && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[360px] overflow-y-auto rounded-2xl border border-ink-100/80 bg-white p-1.5 shadow-lift backdrop-blur-xl animate-fade-up"
        >
          {suggestions.length > 0 ? (
            suggestions.map((place, index) => {
              const isSelected = index === activeIndex;
              const icon = getPlaceTypeIcon(place.type, place.category);
              const subtitle = [place.city, place.state].filter(Boolean).join(', ');

              return (
                <div
                  key={place.id || `${place.name}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSelect(place)}
                  className={cx(
                    'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition',
                    isSelected ? 'bg-ink-50 text-ink-950' : 'text-ink-800 hover:bg-ink-50'
                  )}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-100/70 text-[16px]">
                    {icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[14px] font-bold text-ink-950">
                        {place.name}
                      </span>
                      {place.category && (
                        <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10.5px] font-bold text-brand-700">
                          {place.category}
                        </span>
                      )}
                    </div>
                    {subtitle && (
                      <div className="truncate text-[12px] font-medium text-ink-500">
                        {subtitle}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-brand-600 opacity-0 transition group-hover:opacity-100 sm:opacity-75">
                    Fly to 3D →
                  </span>
                </div>
              );
            })
          ) : !loading && query.trim().length >= 2 ? (
            <div className="p-4 text-center">
              <MapPin size={22} className="mx-auto text-ink-300" />
              <div className="mt-1 text-[13.5px] font-semibold text-ink-700">No places found</div>
              <p className="mt-0.5 text-[12px] text-ink-400">
                Try searching Indian cities, forts, beaches, or dishes like "Taj Mahal", "Goa", or "Misal Pav"
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
