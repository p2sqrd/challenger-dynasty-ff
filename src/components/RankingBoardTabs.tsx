"use client";

import { useState, type ReactNode } from "react";

interface BoardTab {
  key: string;
  label: string;
  panel: ReactNode;
}

export function RankingBoardTabs({ tabs }: { tabs: BoardTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");

  return (
    <div>
      <div
        role="tablist"
        aria-label="Ranking board"
        className="mb-6 flex gap-2"
      >
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={on}
              onClick={() => setActive(t.key)}
              className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                on
                  ? "bg-brand text-brand-ink"
                  : "text-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tabs.map((t) => (
        <div key={t.key} role="tabpanel" hidden={t.key !== active}>
          {t.panel}
        </div>
      ))}
    </div>
  );
}
