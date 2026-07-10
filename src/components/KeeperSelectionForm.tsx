"use client";

import { useMemo, useState } from "react";
import { computeKeeperPrice } from "@/lib/rules/keeper-pricing";
import {
  validateKeeperBudget,
  validateKeeperCount,
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
      <p className="mt-6 rounded-md bg-green-50 p-4 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
        Submitted — this now sits in your commissioner&apos;s approval queue.
      </p>
    );
  }

  return (
    <div className="mt-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
            <th className="py-2 font-normal">Keep</th>
            <th className="py-2 font-normal">Player</th>
            <th className="py-2 font-normal">Last price</th>
            <th className="py-2 font-normal">New price</th>
          </tr>
        </thead>
        <tbody>
          {eligiblePlayers.map((player) => {
            const isSelected = selected.has(player.playerId);
            const price = priceFor(player);
            return (
              <tr
                key={player.playerId}
                className="border-b border-neutral-100 dark:border-neutral-900"
              >
                <td className="py-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(player.playerId)}
                  />
                </td>
                <td className="py-2">{player.playerName}</td>
                <td className="py-2 text-neutral-500">
                  {player.priorRecord ? `$${player.priorRecord.price}` : "—"}
                </td>
                <td className="py-2">
                  {!isSelected ? (
                    "—"
                  ) : player.priorRecord ? (
                    `$${price.newPrice} (${price.priceRule.replace(/_/g, " ")})`
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

      <div className="mt-4 space-y-1 text-sm">
        <p>
          Selected: {selected.size} / {maxKeepers} roster slots
          {!countCheck.ok && (
            <span className="ml-2 text-red-600">{countCheck.violations[0]}</span>
          )}
        </p>
        <p>
          Remaining budget for next auction: ${budgetCheck.remainingBudget}
          {!budgetCheck.ok && (
            <span className="ml-2 text-red-600">
              {budgetCheck.violations[0]}
            </span>
          )}
        </p>
        {!allComputable && (
          <p className="text-red-600">
            Enter FAAB paid (or original auction price if drafted and
            dropped) for every waiver-sourced player above before submitting.
          </p>
        )}
      </div>

      {submitError && <p className="mt-2 text-sm text-red-600">{submitError}</p>}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="mt-4 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        {submitting ? "Submitting..." : "Submit keepers"}
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
        className="rounded border border-neutral-300 px-1 py-0.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
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
        className="w-16 rounded border border-neutral-300 px-1 py-0.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
      />
    </div>
  );
}
