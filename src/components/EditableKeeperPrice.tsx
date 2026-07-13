"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Commissioner-only inline price editor for a keeper. Shows the price with a
 * small "edit" affordance; clicking opens an input to correct the amount and
 * saves via the edit route. For non-commissioners, render the price plainly
 * (this component is only mounted for commissioners).
 */
export function EditableKeeperPrice({
  keeperId,
  price,
}: {
  keeperId: string;
  price: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(price));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    const newPrice = Number(value);
    if (!Number.isInteger(newPrice) || newPrice < 0) {
      setError("Whole $ ≥ 0");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/keepers/${keeperId}/edit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPrice }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button
        onClick={() => {
          setValue(String(price));
          setEditing(true);
        }}
        className="tabular inline-flex items-center gap-1 text-ink hover:text-brand"
        title="Edit price"
      >
        ${price}
        <span aria-hidden className="text-[10px] text-muted">
          ✎
        </span>
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-muted">$</span>
      <input
        autoFocus
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setEditing(false);
        }}
        className="tabular w-16 rounded border border-line bg-canvas px-1.5 py-0.5 text-xs text-ink"
      />
      <button
        onClick={save}
        disabled={saving}
        className="rounded px-1.5 py-0.5 text-xs font-semibold text-approved hover:bg-[rgba(76,175,109,0.14)] disabled:opacity-40"
      >
        {saving ? "…" : "Save"}
      </button>
      <button
        onClick={() => setEditing(false)}
        className="rounded px-1.5 py-0.5 text-xs text-muted hover:text-ink"
      >
        Cancel
      </button>
      {error && <span className="text-xs text-rejected">{error}</span>}
    </span>
  );
}
