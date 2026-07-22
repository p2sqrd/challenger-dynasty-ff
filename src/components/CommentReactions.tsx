"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { REACTION_EMOJIS, type ReactionSummary } from "@/lib/rule-proposals";

/**
 * Emoji reactions on a comment: existing reactions as toggle chips (with
 * counts + who reacted on hover), plus a "+" that opens the full palette.
 */
export function CommentReactions({
  proposalId,
  commentId,
  reactions,
}: {
  proposalId: string;
  commentId: string;
  reactions: ReactionSummary[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const mine = new Set(reactions.filter((r) => r.mine).map((r) => r.emoji));

  async function toggle(emoji: string) {
    setBusy(true);
    const res = await fetch(
      `/api/rule-proposals/${proposalId}/comments/${commentId}/react`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      }
    );
    setBusy(false);
    setOpen(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => toggle(r.emoji)}
          disabled={busy}
          title={r.names.join(", ")}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
            r.mine
              ? "border-brand bg-brand/10 text-ink"
              : "border-line text-muted hover:text-ink"
          }`}
        >
          <span>{r.emoji}</span>
          <span className="tabular">{r.count}</span>
        </button>
      ))}

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Add reaction"
          className="inline-flex h-[22px] items-center rounded-full border border-line px-2 text-xs text-muted transition-colors hover:text-ink"
        >
          <span aria-hidden>☺</span>
          <span className="ml-0.5">+</span>
        </button>
        {open && (
          <div className="absolute left-0 top-full z-20 mt-1 flex gap-0.5 rounded-md border border-line bg-surface p-1 shadow-lg">
            {REACTION_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => toggle(e)}
                disabled={busy}
                className={`rounded px-1.5 py-1 text-base transition-colors hover:bg-surface-2 ${
                  mine.has(e) ? "bg-brand/10" : ""
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
