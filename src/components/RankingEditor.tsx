"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Nameplate } from "@/components/Nameplate";
import { RankingReadView } from "@/components/RankingReadView";
import type { ManagerCard, RankingEntry, RankingKind } from "@/lib/rankings";

const STANDARD_NEEDS = ["QB", "RB", "WR", "TE"] as const;

interface EditRow {
  managerId: string;
  draftNeeds: string[];
  explanation: string;
}

/** One draggable manager row in the editor. */
function SortableRow({
  row,
  card,
  onChange,
}: {
  row: EditRow;
  card: ManagerCard;
  onChange: (next: EditRow) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.managerId });
  const [custom, setCustom] = useState("");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  function toggleNeed(need: string) {
    onChange({
      ...row,
      draftNeeds: row.draftNeeds.includes(need)
        ? row.draftNeeds.filter((n) => n !== need)
        : [...row.draftNeeds, need],
    });
  }

  function addCustom() {
    const value = custom.trim();
    if (!value) return;
    if (!row.draftNeeds.some((n) => n.toLowerCase() === value.toLowerCase())) {
      onChange({ ...row, draftNeeds: [...row.draftNeeds, value] });
    }
    setCustom("");
  }

  const customNeeds = row.draftNeeds.filter(
    (n) => !STANDARD_NEEDS.some((s) => s === n.toUpperCase())
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-md border border-line bg-surface p-4"
    >
      <div className="mb-3 flex items-center gap-3">
        <button
          type="button"
          className="cursor-grab touch-none rounded px-1.5 py-1 text-lg leading-none text-muted hover:text-ink active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <Nameplate alias={card.name} />
        <span className="tabular ml-auto text-xs text-muted">
          {card.remaining === null
            ? `$${card.startingBudget} budget`
            : `$${card.remaining} left`}
        </span>
      </div>

      <div className="mb-3">
        <div className="mb-1.5 text-[11px] uppercase tracking-wide text-muted">
          Biggest Draft Needs
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {STANDARD_NEEDS.map((need) => {
            const on = row.draftNeeds.includes(need);
            return (
              <button
                key={need}
                type="button"
                onClick={() => toggleNeed(need)}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                  on
                    ? "border-brand bg-[color-mix(in_srgb,var(--color-brand)_16%,transparent)] text-brand"
                    : "border-line text-muted hover:text-ink"
                }`}
              >
                {need}
              </button>
            );
          })}
          {customNeeds.map((need) => (
            <button
              key={need}
              type="button"
              onClick={() => toggleNeed(need)}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-canvas px-2.5 py-1 text-xs font-semibold text-ink"
              title="Remove chip"
            >
              {need}
              <span aria-hidden className="text-muted">
                ×
              </span>
            </button>
          ))}
          <span className="inline-flex items-center gap-1">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="Custom…"
              className="w-24 rounded border border-line bg-canvas px-2 py-1 text-xs text-ink placeholder:text-muted"
            />
            <button
              type="button"
              onClick={addCustom}
              className="rounded border border-line px-2 py-1 text-xs text-muted hover:text-ink"
            >
              Add
            </button>
          </span>
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-[11px] uppercase tracking-wide text-muted">
          Why they&apos;re here
        </div>
        <textarea
          value={row.explanation}
          onChange={(e) => onChange({ ...row, explanation: e.target.value })}
          rows={4}
          placeholder="A paragraph or two on why they land here…"
          className="w-full resize-y rounded border border-line bg-canvas px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-muted"
        />
      </div>
    </div>
  );
}

/**
 * Author-only ranking editor: drag to reorder the stack, toggle draft-need
 * chips, and write each manager's blurb. Save keeps a private draft; Publish
 * reveals it to the league and blasts a notification. Once published, Save
 * silently pushes updates live. `kind` selects which board is being edited
 * (post-keeper or post-draft).
 */
export function RankingEditor({
  cards,
  initialEntries,
  published,
  kind,
}: {
  cards: ManagerCard[];
  initialEntries: RankingEntry[];
  published: boolean;
  kind: RankingKind;
}) {
  const router = useRouter();
  const cardById = useMemo(
    () => new Map(cards.map((c) => [c.managerId, c])),
    [cards]
  );

  // Seed editor order from saved entries, then append any unranked manager in
  // the order loadRankingCards already placed them (budget desc).
  const [rows, setRows] = useState<EditRow[]>(() => {
    const seeded = new Map(initialEntries.map((e) => [e.managerId, e]));
    return cards.map((c) => {
      const e = seeded.get(c.managerId);
      return {
        managerId: c.managerId,
        draftNeeds: e?.draftNeeds ?? [],
        explanation: e?.explanation ?? "",
      };
    });
  });

  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState<"save" | "publish" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setRows((prev) => {
      const from = prev.findIndex((r) => r.managerId === active.id);
      const to = prev.findIndex((r) => r.managerId === over.id);
      if (from === -1 || to === -1) return prev;
      return arrayMove(prev, from, to);
    });
  }

  function updateRow(next: EditRow) {
    setRows((prev) =>
      prev.map((r) => (r.managerId === next.managerId ? next : r))
    );
  }

  const entries: RankingEntry[] = rows.map((r) => ({
    managerId: r.managerId,
    draftNeeds: r.draftNeeds,
    explanation: r.explanation,
  }));

  async function save() {
    setBusy("save");
    setError("");
    setMessage("");
    const res = await fetch("/api/rankings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, entries }),
    });
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Save failed.");
      return;
    }
    setMessage(published ? "Saved — changes are live." : "Draft saved.");
    router.refresh();
  }

  async function publish() {
    setBusy("publish");
    setError("");
    setMessage("");
    // Persist the latest edits, then flip to published + notify the league.
    const saveRes = await fetch("/api/rankings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, entries }),
    });
    if (!saveRes.ok) {
      const body = await saveRes.json().catch(() => ({}));
      setBusy(null);
      setError(body.error ?? "Save failed.");
      return;
    }
    const res = await fetch("/api/rankings/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Publish failed.");
      return;
    }
    setMessage("Published — the league has been notified.");
    router.refresh();
  }

  // Reconstruct read-view cards from base derived data + current edits.
  const previewCards: ManagerCard[] = rows.map((r) => {
    const base = cardById.get(r.managerId)!;
    return { ...base, draftNeeds: r.draftNeeds, explanation: r.explanation };
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy !== null}
          className="rounded-md border border-line px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-2 disabled:opacity-40"
        >
          {busy === "save" ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          onClick={publish}
          disabled={busy !== null}
          className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-[var(--color-brand-ink)] transition-opacity disabled:opacity-40"
        >
          {busy === "publish"
            ? "Publishing…"
            : published
            ? "Re-publish"
            : "Publish to league"}
        </button>
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className="ml-auto rounded-md border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:text-ink"
        >
          {preview ? "Back to editing" : "Preview"}
        </button>
      </div>

      {published && (
        <p className="mb-4 rounded-md border border-[color-mix(in_srgb,var(--color-approved)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-approved)_10%,transparent)] px-3 py-2 text-xs text-approved">
          Published — visible to the whole league. Saving pushes edits live
          immediately.
        </p>
      )}
      {message && <p className="mb-4 text-sm text-approved">{message}</p>}
      {error && <p className="mb-4 text-sm text-rejected">{error}</p>}

      {preview ? (
        <RankingReadView cards={previewCards} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={rows.map((r) => r.managerId)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {rows.map((row) => (
                <SortableRow
                  key={row.managerId}
                  row={row}
                  card={cardById.get(row.managerId)!}
                  onChange={updateRow}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
