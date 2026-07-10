import { Nameplate } from "./Nameplate";

export interface TradeSideView {
  managerId: string;
  managerName: string;
  playersReceived: string[];
  cashAmount: number | null;
}

function Cash({ amount }: { amount: number | null }) {
  if (!amount) return null;
  const positive = amount > 0;
  return (
    <span className="tabular text-xs text-muted">
      {positive ? "▲ +" : "▼ −"}
      {Math.abs(amount)} cash
    </span>
  );
}

function SidePanel({ side }: { side: TradeSideView }) {
  return (
    <div className="min-w-0 flex-1">
      <Nameplate alias={side.managerName} size="sm" />
      <ul className="mt-2 space-y-0.5 text-sm text-ink">
        {side.playersReceived.length > 0 ? (
          side.playersReceived.map((p) => <li key={p}>{p}</li>)
        ) : (
          <li className="text-muted">—</li>
        )}
      </ul>
      <div className="mt-1">
        <Cash amount={side.cashAmount} />
      </div>
    </div>
  );
}

/**
 * Two nameplates with a swap glyph between them — read who-gave-what in
 * under two seconds. Falls back to a stacked list for 3+ team trades.
 */
export function TradeSidesView({ sides }: { sides: TradeSideView[] }) {
  if (sides.length === 2) {
    return (
      <div className="flex items-start gap-4">
        <SidePanel side={sides[0]} />
        <div
          aria-hidden
          className="mt-0.5 shrink-0 text-lg leading-none text-brand"
          title="traded for"
        >
          ⇄
        </div>
        <SidePanel side={sides[1]} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sides.map((s) => (
        <SidePanel key={s.managerId} side={s} />
      ))}
    </div>
  );
}
