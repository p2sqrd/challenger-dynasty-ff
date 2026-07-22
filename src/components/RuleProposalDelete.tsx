"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Trash-icon delete for a proposal's author (or the commissioner). Sits in the
 * card's top-right; hidden until the card is hovered on pointer devices, and
 * always visible on touch (where there's no hover).
 */
export function RuleProposalDelete({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm("Delete this proposal? This can't be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/rule-proposals/${proposalId}/delete`, {
      method: "POST",
    });
    if (res.ok) {
      router.refresh();
    } else {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      aria-label="Delete proposal"
      title="Delete proposal"
      className="text-rejected opacity-0 transition-opacity hover:text-rejected/80 focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-40 [@media(hover:none)]:opacity-100"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 6h18" />
        <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
      </svg>
    </button>
  );
}
