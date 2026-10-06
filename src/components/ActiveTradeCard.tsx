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
  const [faabAmount, setFaabAmount] = useState("0");
  const [faabDirection, setFaabDirection] = useState<CashDirection>("receive");
  const [editingCash, setEditingCash] = useState(false);
  const [editAmount, setEditAmount] = useState("0");
  const [editDirection, setEditDirection] = useState<CashDirection>("receive");
  const [editFaabAmount, setEditFaabAmount] = useState("0");
  const [editFaabDirection, setEditFaabDirection] = useState<CashDirection>("receive");
  const [editRefId, setEditRefId] = useState(() => sides[0]?.managerId ?? "");

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
    const faabMag = Number(faabAmount);
    if (!Number.isInteger(faabMag) || faabMag < 0) {
      setError("Enter a whole FAAB amount.");
      return;
    }
    setBusy(true);
    setError("");
    const signed = direction === "receive" ? mag : -mag;
    const signedFaab = faabDirection === "receive" ? faabMag : -faabMag;
    const res = await fetch(`/api/trades/${tradeId}/cash`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cashAmount: signed, faabAmount: signedFaab, sideManagerId: refId }),
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

  async function updateCash() {
    const mag = Number(editAmount);
    if (!Number.isInteger(mag) || mag < 0) {
      setError("Enter a whole dollar amount.");
      return;
    }
    const faabMag = Number(editFaabAmount);
    if (!Number.isInteger(faabMag) || faabMag < 0) {
      setError("Enter a whole FAAB amount.");
      return;
    }
    setBusy(true);
    setError("");
    const signed = editDirection === "receive" ? mag : -mag;
    const signedFaab = editFaabDirection === "receive" ? faabMag : -faabMag;
    const res = await fetch(`/api/trades/${tradeId}/update-cash`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cashAmount: signed, faabAmount: signedFaab, sideManagerId: editRefId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to update cash.");
      setBusy(false);
      return;
    }
    setBusy(false);
    setEditingCash(false);
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
          <div className="mb-2 mt-3 text-xs uppercase tracking-wide text-muted">
            FAAB
          </div>
          <CashDirectionInput
            amount={faabAmount}
            onAmountChange={setFaabAmount}
            direction={faabDirection}
            onDirectionChange={setFaabDirection}
            receiveLabel={otherName ? `Received from ${otherName}` : "Received"}
            sendLabel={otherName ? `Sent to ${otherName}` : "Sent"}
            inputId={`faab-${tradeId}`}
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
            No cash or FAAB in this deal? Leave them at $0. Only one side
            needs values entered — the other is set automatically, then it
            moves to commissioner approval.
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
          {editingCash ? (
            <div className="mt-4 border-t border-line pt-4 text-sm">
              <div className="mb-2 text-xs uppercase tracking-wide text-muted">
                Edit cash &amp; FAAB
              </div>
              {sides.length > 1 && (
                <label className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                  For
                  <select
                    value={editRefId}
                    onChange={(e) => setEditRefId(e.target.value)}
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
              <div className="mb-1 text-xs text-muted">Cash</div>
              <CashDirectionInput
                amount={editAmount}
                onAmountChange={setEditAmount}
                direction={editDirection}
                onDirectionChange={setEditDirection}
                receiveLabel={sides.length === 2 ? `Received from ${sides.find((s) => s.managerId !== editRefId)?.managerName ?? "other"}` : "Received"}
                sendLabel={sides.length === 2 ? `Sent to ${sides.find((s) => s.managerId !== editRefId)?.managerName ?? "other"}` : "Sent"}
                inputId={`edit-cash-${tradeId}`}
              />
              <div className="mb-1 mt-3 text-xs text-muted">FAAB</div>
              <CashDirectionInput
                amount={editFaabAmount}
                onAmountChange={setEditFaabAmount}
                direction={editFaabDirection}
                onDirectionChange={setEditFaabDirection}
                receiveLabel={sides.length === 2 ? `Received from ${sides.find((s) => s.managerId !== editRefId)?.managerName ?? "other"}` : "Received"}
                sendLabel={sides.length === 2 ? `Sent to ${sides.find((s) => s.managerId !== editRefId)?.managerName ?? "other"}` : "Sent"}
                inputId={`edit-faab-${tradeId}`}
              />
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={updateCash}
                  disabled={busy}
                  className="rounded-md bg-brand px-3 py-1.5 font-semibold text-[var(--color-brand-ink)] transition-opacity disabled:opacity-40"
                >
                  {busy ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => { setEditingCash(false); setError(""); }}
                  className="text-sm text-muted hover:text-ink"
                >
                  Cancel
                </button>
              </div>
              {error && <p className="mt-2 text-sm text-rejected">{error}</p>}
            </div>
          ) : (
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
              <button
                onClick={() => setEditingCash(true)}
                className="ml-auto text-xs text-muted hover:text-ink"
              >
                Edit cash / FAAB
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
