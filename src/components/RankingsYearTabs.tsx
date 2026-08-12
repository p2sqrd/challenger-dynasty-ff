"use client";

import { useState } from "react";

interface YearTab {
  key: string;
  label: string;
  panel: React.ReactNode;
}

/**
 * Year switcher for the Rankings page. Both panels stay mounted (hidden, not
 * unmounted) so the author's in-progress edits on the current-year tab survive
 * a peek at last year.
 */
export function RankingsYearTabs({ tabs }: { tabs: YearTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");

  return (
    <div>
      <div
        role="tablist"
        aria-label="Ranking year"
        className="mb-8 flex gap-1 border-b border-line"
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
