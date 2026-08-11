"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TradeSidesView, type TradeSideView } from "./TradeSides";
import { CashDirectionInput, type CashDirection } from "./CashDirectionInput";

/** What the current viewer can do with this in-flight trade. */
export type TradeAction = "enter_cash" | "approve" | "none";

const STATUS_LABEL = {
  pending_cash: "Awaiting cash",
  pending_approval: "Awaiting commissioner approval",
} as const;

/**
 * One card in the "Active trades" list. Everyone sees the same trade summary;
 * the action region underneath depends on who's looking — the manager who owes
 * cash gets the cash-entry control, the commissioner gets approve/reject, and
 * everyone else just sees it read-only.
 */
export function ActiveTradeCard({
  tradeId,
  status,
  createdAt,
  sides,
  action,
  myManagerId,
  warnings = [],
}: {
  tradeId: string;
  status: "pending_cash" | "pending_approval";
  createdAt: string;
  sides: TradeSideView[];
  action: TradeAction;
  myManagerId?: string;
  warnings?: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("0");
  const [direction, setDirection] = useState<CashDirection>("receive");

  // A party to the trade enters cash from their own side. A commissioner who
  // isn't in the trade picks which side the cash is for.
  const isParty = !!myManagerId && sides.some((s) => s.managerId === myManagerId);
  const [refId, setRefId] = useState(
    () => (isParty ? myManagerId! : sides[0]?.managerId) ?? ""
  );
  const otherSides = sides.filter((s) => s.managerId !== refId);
  const otherName = otherSides.length === 1 ? otherSides[0].managerName : null;

  async function submitCash() {
    const mag = Number(amount);
    if (!Number.isInteger(mag) || mag < 0) {
      setError("Enter a whole dollar amount.");
      return;
    }
    setBusy(true);
    setError("");
    const signed = direction === "receive" ? mag : -mag;
    const res = await fetch(`/api/trades/${tradeId}/cash`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cashAmount: signed, sideManagerId: refId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Submission failed.");
      setBusy(false);
      return;
    }
    router.refresh();
  }

  async function decide(verb: "approve" | "reject") {
    setBusy(true);
    await fetch(`/api/trades/${tradeId}/${verb}`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-md border border-line bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-full border border-line px-2 py-0.5 text-xs text-pending">
          {STATUS_LABEL[status]}
        </span>
        <span className="tabular text-xs text-muted">
          {new Date(createdAt).toLocaleDateString()}
        </span>
      </div>

      <TradeSidesView sides={sides} />

      {action === "enter_cash" && (
        <div className="mt-4 border-t border-line pt-4 text-sm">
          <div className="mb-2 text-xs uppercase tracking-wide text-muted">
            Cash
          </div>
          {!isParty && sides.length > 1 && (
            <label className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
              Cash for
              <select
                value={refId}
                onChange={(e) => setRefId(e.target.value)}
                className="rounded border border-line bg-canvas px-2 py-1 text-sm text-ink"
              >
                {sides.map((s) => (
                  <option key={s.managerId} value={s.managerId}>
                    {s.managerName}
                  </option>
                ))}
              </select>
            </label>
          )}
          <CashDirectionInput
            amount={amount}
            onAmountChange={setAmount}
            direction={direction}
            onDirectionChange={setDirection}
            receiveLabel={otherName ? `Received from ${otherName}` : "Received"}
            sendLabel={otherName ? `Sent to ${otherName}` : "Sent"}
            inputId={`cash-${tradeId}`}
          />
          <div className="mt-3">
            <button
              onClick={submitCash}
              disabled={busy}
              className="rounded-md bg-brand px-3 py-1.5 font-semibold text-[var(--color-brand-ink)] transition-opacity disabled:opacity-40"
            >
              {busy ? "Sending…" : "Send to commissioner"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            No cash in this deal? Leave it at $0. Only one side needs cash
            entered — the other is set automatically, then it moves to
            commissioner approval.
          </p>
          {error && <p className="mt-2 text-rejected">{error}</p>}
        </div>
      )}

      {action === "approve" && (
        <>
          {warnings.length > 0 && (
            <div className="mt-4 rounded-md border border-[rgba(232,163,61,0.35)] bg-[rgba(232,163,61,0.10)] p-3 text-sm text-pending">
              {warnings.map((w, i) => (
                <p key={i}>⚠ {w}</p>
              ))}
            </div>
          )}
          <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
            <button
              onClick={() => decide("approve")}
              disabled={busy}
              className="rounded-md bg-[rgba(76,175,109,0.14)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-approved transition-colors hover:bg-[rgba(76,175,109,0.24)] disabled:opacity-40"
            >
              Approve
            </button>
            <button
              onClick={() => decide("reject")}
              disabled={busy}
              className="rounded-md bg-[rgba(229,72,77,0.14)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-rejected transition-colors hover:bg-[rgba(229,72,77,0.24)] disabled:opacity-40"
            >
              Reject
            </button>
          </div>
        </>
      )}
    </div>
  );
}
