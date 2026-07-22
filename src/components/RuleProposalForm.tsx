"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Collapsible "propose a rule" form. */
export function RuleProposalForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Give your proposal a title.");
    setStatus("saving");
    setError("");
    const res = await fetch("/api/rule-proposals/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Couldn't post the proposal.");
      setStatus("idle");
      return;
    }
    setTitle("");
    setBody("");
    setStatus("idle");
    setOpen(false);
    router.refresh();
  }

  const field =
    "w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-[var(--color-brand-ink)]"
      >
        Propose a rule change
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-md border border-line bg-surface p-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-wide text-muted">Proposal</span>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Convert a bench spot to a starting WR"
          className={field}
        />
      </label>
      <label className="mt-3 flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-wide text-muted">
          Details <span className="normal-case">(optional)</span>
        </span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Explain the reasoning, edge cases, lead time…"
          className={field}
        />
      </label>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-[var(--color-brand-ink)] transition-opacity disabled:opacity-40"
        >
          {status === "saving" ? "Posting…" : "Post proposal"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError("");
          }}
          className="rounded-md border border-line px-4 py-2 text-sm text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-rejected">{error}</p>}
    </form>
  );
}
