"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Commissioner-only control: force a proposal to pass regardless of the votes
 * or deadline, or clear an override to hand the result back to the tally.
 */
export function RuleProposalOverride({
  proposalId,
  overridden,
}: {
  proposalId: string;
  overridden: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function set(status: "passed" | null) {
    setBusy(true);
    const res = await fetch(`/api/rule-proposals/${proposalId}/override`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      setBusy(false);
    }
  }

  if (overridden) {
    return (
      <button
        type="button"
        onClick={() => set(null)}
        disabled={busy}
        className="rounded-md border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:text-ink disabled:opacity-50"
      >
        Clear commish override
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => set("passed")}
      disabled={busy}
      className="rounded-md border border-gold px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
    >
      Force pass (commish)
    </button>
  );
}
