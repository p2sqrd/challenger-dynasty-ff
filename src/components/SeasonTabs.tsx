"use client";

import { useState } from "react";

interface SeasonTab {
  key: string;
  label: string;
  panel: React.ReactNode;
}

/**
 * Season switcher shared by pages that show one season at a time (Budget). The
 * first tab is selected by default; callers order tabs newest-first. All panels
 * stay mounted (hidden, not unmounted) so switching is instant.
 */
export function SeasonTabs({ tabs }: { tabs: SeasonTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");

  return (
    <div>
      <div
        role="tablist"
        aria-label="Season"
        className="mb-6 flex gap-1 border-b border-line"
      >
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={on}
              onClick={() => setActive(t.key)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                on
                  ? "border-brand text-ink"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tabs.map((t) => (
        <div key={t.key} hidden={t.key !== active}>
          {t.panel}
        </div>
      ))}
    </div>
  );
}
