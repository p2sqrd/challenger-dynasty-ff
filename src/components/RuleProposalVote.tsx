"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { VoteChoice } from "@/types/database";

/** Yes/No/Abstain buttons for one proposal; the viewer's pick is highlighted. */
export function RuleProposalVote({
  proposalId,
  myChoice,
}: {
  proposalId: string;
  myChoice: VoteChoice | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cast(choice: VoteChoice) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/rule-proposals/${proposalId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choice }),
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
  const off = "border-line text-muted hover:text-ink";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => cast("yes")}
        disabled={busy}
        aria-pressed={myChoice === "yes"}
        className={`${base} ${
          myChoice === "yes"
            ? "border-approved bg-approved/15 text-approved"
            : off
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => cast("no")}
        disabled={busy}
        aria-pressed={myChoice === "no"}
        className={`${base} ${
          myChoice === "no"
            ? "border-rejected bg-rejected/15 text-rejected"
            : off
        }`}
      >
        No
      </button>
      <button
        type="button"
        onClick={() => cast("abstain")}
        disabled={busy}
        aria-pressed={myChoice === "abstain"}
        className={`${base} ${
          myChoice === "abstain"
            ? "border-pending bg-pending/15 text-pending"
            : off
        }`}
      >
        Abstain
      </button>
      {myChoice !== null && (
        <span className="text-xs text-muted">
          You can change your choice until the deadline.
        </span>
      )}
      {error && <span className="text-xs text-rejected">{error}</span>}
    </div>
  );
}
