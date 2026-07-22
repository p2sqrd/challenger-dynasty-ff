"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Post a comment to a proposal's discussion. */
export function CommentForm({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/rule-proposals/${proposalId}/comments/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Couldn't post the comment.");
      setBusy(false);
      return;
    }
    setBody("");
    setBusy(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-3">
      <div className="flex items-start gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={1}
          placeholder="Add to the discussion…"
          className="min-h-[38px] flex-1 rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !body.trim()}
          className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-[var(--color-brand-ink)] transition-opacity disabled:opacity-40"
        >
          Post
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-rejected">{error}</p>}
    </form>
  );
}
