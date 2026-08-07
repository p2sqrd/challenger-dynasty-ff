"use client";

import { useEffect, useRef, useState } from "react";

export interface FilterOption {
  value: string;
  label: string;
}

/**
 * A compact dropdown of checkboxes for multi-selecting filter values. The
 * caller owns the selected Set; picking values narrows a table (AND across
 * different filters, OR within one).
 */
export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: FilterOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function toggle(value: string) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors ${
          selected.size > 0
            ? "border-brand text-ink"
            : "border-line text-muted hover:text-ink"
        }`}
      >
        {label}
        {selected.size > 0 && (
          <span className="tabular rounded bg-brand px-1.5 text-xs font-semibold text-[var(--color-brand-ink)]">
            {selected.size}
          </span>
        )}
        <span aria-hidden className="text-[10px]">
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-1 max-h-72 w-56 overflow-auto rounded-md border border-line bg-surface p-1 shadow-lg">
          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => onChange(new Set())}
              className="mb-1 w-full rounded px-2 py-1.5 text-left text-xs text-muted hover:bg-surface-2 hover:text-ink"
            >
              Clear ({selected.size})
            </button>
          )}
          {options.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted">None</p>
          ) : (
            options.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-ink hover:bg-surface-2"
              >
                <input
                  type="checkbox"
                  checked={selected.has(opt.value)}
                  onChange={() => toggle(opt.value)}
                  className="h-4 w-4 accent-[var(--color-brand)]"
                />
                <span className="truncate">{opt.label}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
