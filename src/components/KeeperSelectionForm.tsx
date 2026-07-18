"use client";

import { useMemo, useState } from "react";
import { computeKeeperPrice } from "@/lib/rules/keeper-pricing";
import {
  validateKeeperRoster,
  ROSTER_SIZE,
} from "@/lib/rules/budget-validation";
import { BudgetTower, type TowerKeeper } from "./BudgetTower";
import type { DraftSource, KeeperPriceRule } from "@/types/database";

export interface EligiblePlayer {
  playerId: string;
  playerName: string;
  /** Absent when the player wasn't in last season's draft_records (e.g.
   * added off waivers mid-season) — needs manual pricing input below. */
  priorRecord?: { price: number; source: DraftSource };
}

interface ExistingSelection {
  player_id: string;
  new_price: number;
}

interface ManualEntry {
  rule: "waiver_first_year" | "drafted_and_dropped";
  basePrice: number;
}

export function KeeperSelectionForm({
  seasonId,
  startingBudget,
  rosterSize = ROSTER_SIZE,
  eligiblePlayers,
  existingSelections,
  deadlineLabel,
}: {
  seasonId: string;
  startingBudget: number;
  rosterSize?: number;
  eligiblePlayers: EligiblePlayer[];
  existingSelections: ExistingSelection[];
  deadlineLabel?: string | null;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(existingSelections.map((s) => s.player_id))
  );
  const [manualEntries, setManualEntries] = useState<
    Record<string, ManualEntry>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [saved, setSaved] = useState(false);

  function priceFor(player: EligiblePlayer): {
    newPrice: number;
    priceRule: KeeperPriceRule;
    computable: boolean;
  } {
    if (player.priorRecord) {
      const result = computeKeeperPrice({ priorRecord: player.priorRecord });
      return { ...result, computable: true };
    }
    const manual = manualEntries[player.playerId];
    if (!manual) return { newPrice: 0, priceRule: "waiver_first_year", computable: false };
    const result = computeKeeperPrice({
      priorRecord: { price: manual.basePrice, source: "waiver" },
      originalAuctionPrice:
        manual.rule === "drafted_and_dropped" ? manual.basePrice : undefined,
    });
    return { ...result, computable: true };
  }

  const selections = useMemo(
    () =>
      eligiblePlayers
        .filter((p) => selected.has(p.playerId))
        .map((p) => ({ player: p, price: priceFor(p) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eligiblePlayers, selected, manualEntries]
  );

  const totalSpend = selections.reduce((sum, s) => sum + s.price.newPrice, 0);
  const roster = validateKeeperRoster({
    startingBudget,
    totalKeeperSpend: totalSpend,
    keeperCount: selected.size,
    rosterSize,
  });
  const allComputable = selections.every((s) => s.price.computable);
  const canSubmit = roster.ok && allComputable && !submitting;
  const remaining = roster.remainingBudget;

  // Tower shows keepers newest-first: the `selected` Set keeps insertion
  // order, so reversing it puts the most recently added keeper on top.
  const towerSelections: TowerKeeper[] = useMemo(() => {
    const byId = new Map(
      selections.map((s) => [
        s.player.playerId,
        { name: s.player.playerName, newPrice: s.price.newPrice },
      ])
    );
    return [...selected]
      .filter((id) => byId.has(id))
      .reverse()
      .map((id) => ({ playerId: id, ...byId.get(id)! }));
  }, [selected, selections]);

  function toggle(playerId: string) {
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError("");

    const payload = {
      seasonId,
      selections: selections.map(({ player, price }) => ({
        playerId: player.playerId,
        playerName: player.playerName,
        previousPrice: player.priorRecord?.price ?? null,
        newPrice: price.newPrice,
        priceRule: price.priceRule,
      })),
    };

    const res = await fetch("/api/keepers/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setSubmitError(body.error ?? "Submission failed.");
      setSubmitting(false);
      return;
    }

    setSaved(true);
    setSubmitting(false);
  }

  return (
    <div className="lg:grid lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-6">
      {/* LEFT: pick list */}
      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <th className="w-12 py-3 pl-4 pr-2 text-left font-medium">Keep</th>
              <th className="py-3 pr-4 text-left font-medium">Player</th>
              <th className="py-3 pr-4 text-right font-medium">Last</th>
              <th className="py-3 pr-4 text-left font-medium">New price</th>
            </tr>
          </thead>
          <tbody>
            {eligiblePlayers.map((player) => {
              const isSelected = selected.has(player.playerId);
              const price = priceFor(player);
              return (
                <tr
                  key={player.playerId}
                  className={`border-b border-line last:border-0 ${
                    isSelected ? "bg-surface-2" : ""
                  }`}
                >
                  <td className="p-0">
                    {/* Full-cell label → a comfortable ~44px tap target on
                        phones, not just the 16px box. */}
                    <label className="flex min-h-[44px] cursor-pointer items-center py-2 pl-4 pr-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(player.playerId)}
                        className="h-5 w-5 accent-[var(--color-brand)]"
                      />
                    </label>
                  </td>
                  <td className="py-3 pr-4 text-ink">{player.playerName}</td>
                  <td className="tabular py-3 pr-4 text-right text-muted">
                    {player.priorRecord ? `$${player.priorRecord.price}` : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    {!isSelected ? (
                      <span className="text-muted">—</span>
                    ) : player.priorRecord ? (
                      <span className="flex items-center gap-2">
                        <span className="tabular text-ink">
                          ${price.newPrice}
                        </span>
                        <span className="rounded bg-canvas px-1.5 py-0.5 text-xs text-muted">
                          {price.priceRule.replace(/_/g, " ")}
                        </span>
                      </span>
                    ) : (
                      <ManualPriceInputs
                        value={manualEntries[player.playerId]}
                        onChange={(entry) =>
                          setManualEntries((prev) => ({
                            ...prev,
                            [player.playerId]: entry,
                          }))
                        }
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* RIGHT: budget tower + submit, sticky on desktop */}
      <div className="mt-6 lg:mt-0 lg:sticky lg:top-20">
        <BudgetTower
          budget={startingBudget}
          selections={towerSelections}
          emptySpots={roster.emptySpots}
          minToFillRoster={roster.minToFillRoster}
          remaining={remaining}
          ok={roster.ok}
          onRemove={toggle}
        />

        <div className="mt-3 text-xs text-muted">
          {selected.size} kept · {roster.emptySpots} open of {rosterSize} · $
          {totalSpend} committed
        </div>

        {!roster.ok && (
          <p className="mt-2 text-sm text-rejected">{roster.violations[0]}</p>
        )}
        {!allComputable && (
          <p className="mt-2 text-sm text-pending">
            Enter FAAB paid (or original auction price if drafted and dropped)
            for every waiver-sourced player before submitting.
          </p>
        )}
        {submitError && <p className="mt-2 text-sm text-rejected">{submitError}</p>}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="mt-3 w-full rounded-md bg-brand px-4 py-2 text-sm font-semibold text-[var(--color-brand-ink)] transition-opacity disabled:opacity-40"
        >
          {submitting ? "Submitting…" : saved ? "Update keepers" : "Submit keepers"}
        </button>
        {saved && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-approved">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-approved" />
            Saved
          </p>
        )}
        <p className="mt-2 text-center text-xs text-muted">
          {deadlineLabel
            ? `You can keep editing until the keeper deadline (${deadlineLabel}).`
            : "You can keep editing until the keeper deadline."}
        </p>
      </div>
    </div>
  );
}

function ManualPriceInputs({
  value,
  onChange,
}: {
  value?: ManualEntry;
  onChange: (entry: ManualEntry) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={value?.rule ?? "waiver_first_year"}
        onChange={(e) =>
          onChange({
            rule: e.target.value as ManualEntry["rule"],
            basePrice: value?.basePrice ?? 0,
          })
        }
        className="rounded border border-line bg-canvas px-1.5 py-1 text-xs text-ink"
      >
        <option value="waiver_first_year">FAAB paid</option>
        <option value="drafted_and_dropped">Original auction price</option>
      </select>
      <input
        type="number"
        min={0}
        value={value?.basePrice ?? ""}
        onChange={(e) =>
          onChange({
            rule: value?.rule ?? "waiver_first_year",
            basePrice: Number(e.target.value),
          })
        }
        className="tabular w-16 rounded border border-line bg-canvas px-1.5 py-1 text-xs text-ink"
      />
    </div>
  );
}
