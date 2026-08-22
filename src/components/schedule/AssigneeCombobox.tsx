'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

export type AssigneeOption = {
  id: string;
  full_name: string;
};

type AssigneeComboboxProps = {
  id: string;
  options: AssigneeOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  error?: string | null;
};

export default function AssigneeCombobox({
  id,
  options,
  value,
  onChange,
  disabled = false,
  error = null,
}: AssigneeComboboxProps) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  );

  const [query, setQuery] = useState(selected?.full_name ?? '');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setQuery(selected?.full_name ?? '');
  }, [selected?.full_name, value]);

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return options;
    }

    return options.filter((option) => option.full_name.toLowerCase().includes(normalized));
  }, [options, query]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
        if (selected) {
          setQuery(selected.full_name);
        }
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [selected]);

  function selectOption(option: AssigneeOption) {
    onChange(option.id);
    setQuery(option.full_name);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleInputChange(next: string) {
    setQuery(next);
    setOpen(true);
    setActiveIndex(filteredOptions.length > 0 ? 0 : -1);

    const exact = options.find(
      (option) => option.full_name.toLowerCase() === next.trim().toLowerCase(),
    );
    if (exact) {
      onChange(exact.id);
    } else if (value) {
      onChange('');
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      setOpen(true);
      setActiveIndex(filteredOptions.length > 0 ? 0 : -1);
      event.preventDefault();
      return;
    }

    if (!open) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) =>
        filteredOptions.length === 0 ? -1 : (index + 1) % filteredOptions.length,
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) =>
        filteredOptions.length === 0
          ? -1
          : (index - 1 + filteredOptions.length) % filteredOptions.length,
      );
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0 && filteredOptions[activeIndex]) {
        selectOption(filteredOptions[activeIndex]);
      }
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      if (selected) {
        setQuery(selected.full_name);
      }
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={
          open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        value={query}
        disabled={disabled}
        onChange={(event) => handleInputChange(event.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search staff…"
        className={`min-h-[44px] w-full rounded-md border bg-surface px-3 py-2 text-sm ${error ? 'border-error' : 'border-border'}`}
      />

      {open && filteredOptions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-lg"
        >
          {filteredOptions.map((option, index) => {
            const isSelected = option.id === value;
            const isActive = index === activeIndex;

            return (
              <li
                key={option.id}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={isSelected}
                className={`cursor-pointer px-3 py-2 text-sm ${isActive ? 'bg-page' : ''} ${isSelected ? 'font-medium text-text' : 'text-text'}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
              >
                {option.full_name}
              </li>
            );
          })}
        </ul>
      )}

      {open && filteredOptions.length === 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-secondary shadow-lg">
          No matching staff.
        </div>
      )}

      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}
