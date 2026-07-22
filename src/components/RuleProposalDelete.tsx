"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Small delete control shown to a proposal's author (or the commissioner). */
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
      className="text-xs text-muted transition-colors hover:text-rejected disabled:opacity-50"
    >
      Delete
    </button>
  );
}
