"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Delete control for a comment's author (or the commissioner). */
export function CommentDelete({
  proposalId,
  commentId,
}: {
  proposalId: string;
  commentId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm("Delete this comment?")) return;
    setBusy(true);
    const res = await fetch(
      `/api/rule-proposals/${proposalId}/comments/${commentId}/delete`,
      { method: "POST" }
    );
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
