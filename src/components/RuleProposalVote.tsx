"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Yes/No buttons for one proposal; the viewer's current pick is highlighted. */
export function RuleProposalVote({
  proposalId,
  myVote,
}: {
  proposalId: string;
  myVote: boolean | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cast(vote: boolean) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/rule-proposals/${proposalId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vote }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Vote failed.");
      setBusy(false);
      return;
    }
    setBusy(false);
    router.refresh();
  }

  const base =
    "rounded-md border px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => cast(true)}
        disabled={busy}
        aria-pressed={myVote === true}
        className={`${base} ${
          myVote === true
            ? "border-approved bg-approved/15 text-approved"
            : "border-line text-muted hover:text-ink"
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => cast(false)}
        disabled={busy}
        aria-pressed={myVote === false}
        className={`${base} ${
          myVote === false
            ? "border-rejected bg-rejected/15 text-rejected"
            : "border-line text-muted hover:text-ink"
        }`}
      >
        No
      </button>
      {myVote !== null && (
        <span className="text-xs text-muted">You can change your vote until the deadline.</span>
      )}
      {error && <span className="text-xs text-rejected">{error}</span>}
    </div>
  );
}
