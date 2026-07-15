"use client";

import { PlayerAvatar } from "./PlayerAvatar";

export interface TowerKeeper {
  playerId: string;
  name: string;
  newPrice: number;
}

const TOWER_H = 520; // px reference height = the full auction budget
const MIN_CHUNK = 52; // px floor so a face + name stay legible on cheap keepers
const FREE_MIN = 84; // px floor for the "left for auction" area so its text always fits
const BRAND_FILL = "color-mix(in srgb, var(--color-brand) 16%, transparent)";
const BRAND_EDGE = "color-mix(in srgb, var(--color-brand) 40%, transparent)";

/**
 * The keeper budget as a stacked "tower". Its resting height maps to the
 * auction budget; keepers stack from the bottom (newest on top) with a
 * per-chunk height proportional to price but floored so every headshot stays
 * readable. Above them sits the hatched roster-fill reserve ($1 per open
 * spot) and then the free-to-spend remainder. Because the chunk floor can
 * push the stack past the resting height, the tower *grows* to fit rather
 * than squeezing the remainder area (which would clip its text). Clicking a
 * chunk removes that keeper.
 */
export function BudgetTower({
  budget,
  selections,
  emptySpots,
  minToFillRoster,
  remaining,
  ok,
  onRemove,
}: {
  budget: number;
  /** Newest keeper first. */
  selections: TowerKeeper[];
  emptySpots: number;
  minToFillRoster: number;
  remaining: number;
  ok: boolean;
  onRemove: (playerId: string) => void;
}) {
  const scale = budget > 0 ? TOWER_H / budget : 0;
  const reserveH = minToFillRoster > 0 ? Math.max(8, minToFillRoster * scale) : 0;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="nameplate-type text-sm text-ink">Budget tower</span>
        <span className="tabular text-sm text-muted">${budget} cap</span>
      </div>

      <div
        style={{ minHeight: TOWER_H }}
        className="flex flex-col overflow-hidden rounded-md border border-line bg-canvas p-1.5"
      >
        {/* Free-to-spend remainder — grows to fill slack when the tower is at
            its resting height; holds a floor so its text never gets clipped. */}
        <div
          style={{ minHeight: FREE_MIN }}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 p-2 text-center"
        >
          {ok ? (
            <>
              <div className="tabular text-2xl font-semibold text-ink">
                ${remaining}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted">
                left for auction
              </div>
            </>
          ) : (
            <div className="text-sm font-semibold text-rejected">
              Over budget
            </div>
          )}
        </div>

        {/* Roster-fill reserve: $1 for every open spot. */}
        {reserveH > 0 && (
          <div
            style={{
              height: reserveH,
              backgroundImage:
                "repeating-linear-gradient(45deg, var(--color-line) 0 5px, transparent 5px 10px)",
            }}
            className="mt-1 flex shrink-0 items-center justify-center rounded-sm border border-line text-[10px] text-muted"
            title={`Reserve $${minToFillRoster} to fill ${emptySpots} open roster spots at $1 each`}
          >
            {reserveH >= 20 && (
              <span>
                reserve ${minToFillRoster} · {emptySpots} open
              </span>
            )}
          </div>
        )}

        {/* Keeper chunks — newest on top, height ∝ price (floored). */}
        {selections.map((k) => {
          const h = Math.max(MIN_CHUNK, k.newPrice * scale);
          const avatar = Math.min(44, Math.max(28, h - 14));
          return (
            <button
              key={k.playerId}
              onClick={() => onRemove(k.playerId)}
              style={{ height: h, backgroundColor: BRAND_FILL, borderColor: BRAND_EDGE }}
              className="group relative mt-1 flex shrink-0 items-center gap-2.5 overflow-hidden rounded-md border px-2.5 text-left"
              title="Remove keeper"
            >
              <PlayerAvatar playerId={k.playerId} name={k.name} size={avatar} />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                {k.name}
              </span>
              <span className="tabular text-sm font-medium text-ink">
                ${k.newPrice}
              </span>
              <span className="pointer-events-none absolute right-1 top-1 text-xs text-muted opacity-0 transition-opacity group-hover:opacity-100">
                ✕
              </span>
            </button>
          );
        })}

        {selections.length === 0 && (
          <div className="shrink-0 pb-2 text-center text-xs text-muted">
            Check players on the left to stack them here.
          </div>
        )}
      </div>
    </div>
  );
}
