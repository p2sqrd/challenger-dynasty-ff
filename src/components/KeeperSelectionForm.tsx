"use client";

import { useMemo, useState } from "react";
import { computeKeeperPrice } from "@/lib/rules/keeper-pricing";
import {
  validateKeeperBudget,
  validateKeeperCount,
  DEFAULT_MIN_REMAINING_BUDGET,
} from "@/lib/rules/budget-validation";
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
  maxKeepers,
  eligiblePlayers,
  existingSelections,
}: {
  seasonId: string;
  startingBudget: number;
  maxKeepers: number;
  eligiblePlayers: EligiblePlayer[];
  existingSelections: ExistingSelection[];
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(existingSelections.map((s) => s.player_id))
  );
  const [manualEntries, setManualEntries] = useState<
    Record<string, ManualEntry>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

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
  const budgetCheck = validateKeeperBudget({
    startingBudget,
    totalKeeperSpend: totalSpend,
  });
  const countCheck = validateKeeperCount({
    keeperCount: selected.size,
    maxKeepers,
  });
  const allComputable = selections.every((s) => s.price.computable);
  const canSubmit =
    budgetCheck.ok && countCheck.ok && allComputable && !submitting;

  const remaining = budgetCheck.remainingBudget;
  const belowFloor = remaining < DEFAULT_MIN_REMAINING_BUDGET;
  // Meter fill across the full starting budget, with a floor marker.
  const fillPct = Math.max(0, Math.min(100, (remaining / startingBudget) * 100));
  const floorPct = Math.min(100, (DEFAULT_MIN_REMAINING_BUDGET / startingBudget) * 100);

  function toggle(playerId: string) {
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

    setSubmitted(true);
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="rounded-md border border-line bg-surface p-5">
        <div className="flex items-center gap-2 text-sm text-approved">
          <span className="inline-block h-2 w-2 rounded-full bg-approved" />
          Submitted — this now sits in your commissioner&apos;s approval queue.
        </div>
      </div>
    );
  }

  return (
    <div>
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
                  <td className="py-3 pl-4 pr-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(player.playerId)}
                      className="h-4 w-4 accent-[var(--color-brand)]"
                    />
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

      {/* Budget meter — cap space for next year's auction. */}
      <div className="mt-6 rounded-md border border-line bg-surface p-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">
              Remaining for next auction
            </div>
            <div
              className={`tabular mt-1 text-2xl font-semibold ${
                belowFloor ? "text-rejected" : "text-ink"
              }`}
            >
              ${remaining}
            </div>
          </div>
          <div className="text-right text-xs text-muted">
            {selected.size} / {maxKeepers} slots · ${totalSpend} committed
          </div>
        </div>

        <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-canvas">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${fillPct}%`,
              backgroundColor: belowFloor
                ? "var(--color-rejected)"
                : "var(--color-brand)",
            }}
          />
          {/* Floor marker at $125 */}
          <div
            className="absolute top-0 h-full w-px bg-muted"
            style={{ left: `${floorPct}%` }}
            title="$125 floor"
          />
        </div>
        <div className="mt-1.5 text-xs text-muted">
          Must stay at or above the $125 floor (marker).
        </div>

        {!countCheck.ok && (
          <p className="mt-3 text-sm text-rejected">{countCheck.violations[0]}</p>
        )}
        {!budgetCheck.ok && (
          <p className="mt-1 text-sm text-rejected">{budgetCheck.violations[0]}</p>
        )}
        {!allComputable && (
          <p className="mt-1 text-sm text-pending">
            Enter FAAB paid (or original auction price if drafted and dropped)
            for every waiver-sourced player before submitting.
          </p>
        )}
      </div>

      {submitError && <p className="mt-3 text-sm text-rejected">{submitError}</p>}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="mt-5 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-[var(--color-brand-ink)] transition-opacity disabled:opacity-40"
      >
        {submitting ? "Submitting…" : "Submit keepers"}
      </button>
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
