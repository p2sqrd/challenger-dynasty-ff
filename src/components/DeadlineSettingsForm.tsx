"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Format a stored ISO timestamp for a <input type="datetime-local"> (local time). */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function DeadlineSettingsForm({
  keeperDeadline,
  draftDatetime,
}: {
  keeperDeadline: string | null;
  draftDatetime: string | null;
}) {
  const router = useRouter();
  const [keeper, setKeeper] = useState(toLocalInput(keeperDeadline));
  const [draft, setDraft] = useState(toLocalInput(draftDatetime));
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError("");

    const res = await fetch("/api/season/deadlines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // datetime-local has no timezone; interpret it in the commissioner's
        // local time and store as ISO (UTC).
        keeperDeadline: keeper ? new Date(keeper).toISOString() : null,
        draftDatetime: draft ? new Date(draft).toISOString() : null,
      }),
    });

    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Save failed.");
      setStatus("idle");
      return;
    }
    setStatus("saved");
    router.refresh(); // re-render server components so timers/lock update
  }

  const field =
    "rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none [color-scheme:dark]";

  return (
    <form
      onSubmit={save}
      className="rounded-md border border-line bg-surface p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted">
            Keeper deadline
          </span>
          <input
            type="datetime-local"
            value={keeper}
            onChange={(e) => {
              setKeeper(e.target.value);
              setStatus("idle");
            }}
            className={field}
          />
          <span className="text-xs text-muted">
            Locks everyone&apos;s keepers when it passes. Leave blank for TBD.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted">
            Draft day &amp; time
          </span>
          <input
            type="datetime-local"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setStatus("idle");
            }}
            className={field}
          />
          <span className="text-xs text-muted">
            Shown as the draft-day countdown. Leave blank for TBD.
          </span>
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-[var(--color-brand-ink)] transition-opacity disabled:opacity-40"
        >
          {status === "saving" ? "Saving…" : "Save deadlines"}
        </button>
        {status === "saved" && (
          <span className="flex items-center gap-1.5 text-xs text-approved">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-approved" />
            Saved
          </span>
        )}
        {error && <span className="text-xs text-rejected">{error}</span>}
      </div>
    </form>
  );
}
