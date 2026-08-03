"use client";

export type CashDirection = "receive" | "send";

/**
 * A friendlier way to enter trade cash than a signed number: a segmented
 * "received / sent" toggle plus an always-positive dollar amount. The caller
 * owns the state and turns the direction into a sign wherever it needs one.
 * Labels are passed in so the same control reads "Received from Kartik" on a
 * real trade and "Receives from Kartik" in the simulator.
 */
export function CashDirectionInput({
  amount,
  onAmountChange,
  direction,
  onDirectionChange,
  receiveLabel,
  sendLabel,
  inputId,
}: {
  amount: string;
  onAmountChange: (v: string) => void;
  direction: CashDirection;
  onDirectionChange: (d: CashDirection) => void;
  receiveLabel: string;
  sendLabel: string;
  inputId?: string;
}) {
  // Receiving cash is good for your budget (green); sending it costs you (red).
  const seg = (active: boolean, tone: "receive" | "send") => {
    if (!active) {
      return "rounded px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:text-ink";
    }
    const bg = tone === "receive" ? "bg-approved" : "bg-rejected";
    return `rounded px-2.5 py-1 text-xs font-medium text-[var(--color-brand-ink)] transition-colors ${bg}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-md border border-line bg-canvas p-0.5">
        <button
          type="button"
          onClick={() => onDirectionChange("receive")}
          aria-pressed={direction === "receive"}
          className={seg(direction === "receive", "receive")}
        >
          {receiveLabel}
        </button>
        <button
          type="button"
          onClick={() => onDirectionChange("send")}
          aria-pressed={direction === "send"}
          className={seg(direction === "send", "send")}
        >
          {sendLabel}
        </button>
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted">
          $
        </span>
        <input
          id={inputId}
          type="number"
          min={0}
          inputMode="numeric"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          className="tabular w-24 rounded border border-line bg-canvas py-1 pl-5 pr-2 text-ink"
        />
      </div>
    </div>
  );
}
