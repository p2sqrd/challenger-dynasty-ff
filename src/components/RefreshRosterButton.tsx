"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RefreshRosterButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-ink transition-colors hover:bg-surface-2 disabled:opacity-50"
    >
      <span aria-hidden className={pending ? "animate-spin" : ""}>
        ↻
      </span>
      {pending ? "Refreshing…" : "Pull latest rosters"}
    </button>
  );
}
