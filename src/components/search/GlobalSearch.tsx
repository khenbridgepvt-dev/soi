'use client';

import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';

type SearchResult = {
  id: string;
  reference: string | null;
  client_name: string;
  status: 'lead_pending' | 'active' | 'rejected' | 'completed';
  is_urgent: boolean;
  assigned_staff: string | null;
};

type GlobalSearchProps = {
  casesBasePath?: string;
};

const STATUS_LABELS: Record<SearchResult['status'], string> = {
  lead_pending: 'Lead',
  active: 'Active',
  rejected: 'Rejected',
  completed: 'Completed',
};

const STATUS_BADGE_CLASS: Record<SearchResult['status'], string> = {
  lead_pending: 'bg-[#ECEFF3] text-[#5C6B7A]',
  active: 'bg-[#E8F4FD] text-[#0F2B5B]',
  rejected: 'bg-[#FEE2E2] text-[#C41E24]',
  completed: 'bg-[#E8F5EC] text-[#1B7F4B]',
};

export default function GlobalSearch({ casesBasePath = '/cases' }: GlobalSearchProps) {
  const router = useRouter();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const showDropdown = open && debouncedQuery.trim().length >= 2;

  const navigateToCase = useCallback(
    (caseId: string) => {
      setOpen(false);
      setQuery('');
      setResults([]);
      setActiveIndex(-1);
      router.push(`${casesBasePath}/${caseId}`);
    },
    [casesBasePath, router],
  );

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      setActiveIndex(-1);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function runSearch() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ q: trimmed, limit: '8' });
        const response = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
        });
        const json = (await response.json()) as {
          data?: SearchResult[];
          error?: { message?: string };
        };

        if (!response.ok) {
          if (!cancelled) {
            setError(json.error?.message ?? 'Search failed.');
            setResults([]);
          }
          return;
        }

        if (!cancelled) {
          setResults(json.data ?? []);
          setActiveIndex(json.data?.length ? 0 : -1);
        }
      } catch (fetchError) {
        if (!cancelled && !(fetchError instanceof DOMException && fetchError.name === 'AbortError')) {
          setError('Unable to search right now.');
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void runSearch();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedQuery]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) {
      if (event.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, results.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
      event.preventDefault();
      navigateToCase(results[activeIndex].id);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search by reference, client name, or staff..."
        aria-label="Global search"
        aria-expanded={showDropdown}
        aria-controls={showDropdown ? listboxId : undefined}
        aria-autocomplete="list"
        role="combobox"
        className="w-full rounded-md border border-border bg-page px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-surface shadow-lg"
        >
          {loading && (
            <p className="px-3 py-2 text-sm text-text-muted">Searching…</p>
          )}

          {!loading && error && (
            <p className="px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          {!loading && !error && results.length === 0 && (
            <p className="px-3 py-2 text-sm text-text-muted">
              {`No results found for '${debouncedQuery.trim()}'`}
            </p>
          )}

          {!loading &&
            !error &&
            results.map((result, index) => {
              const isActive = index === activeIndex;
              const staffLabel = result.assigned_staff ?? '—';

              return (
                <button
                  key={result.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => navigateToCase(result.id)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                    isActive ? 'bg-page' : 'hover:bg-page'
                  }`}
                >
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGE_CLASS[result.status]}`}
                  >
                    {STATUS_LABELS[result.status]}
                  </span>
                  <span className="min-w-0 truncate font-mono text-xs text-text-secondary">
                    {result.reference ?? '—'}
                  </span>
                  <span className="text-text-muted">·</span>
                  <span className="min-w-0 truncate text-text-primary">{result.client_name}</span>
                  <span className="text-text-muted">·</span>
                  <span className="min-w-0 truncate text-text-secondary">{staffLabel}</span>
                  {result.is_urgent && (
                    <span className="ml-auto shrink-0 text-xs font-semibold text-red-600">Urgent</span>
                  )}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
