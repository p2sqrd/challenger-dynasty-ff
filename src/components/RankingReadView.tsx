import { Nameplate } from "@/components/Nameplate";
import { assignRosterSlots, type SlottablePlayer } from "@/lib/roster-slots";
import { positionColor } from "@/lib/player-badges";
import type { ManagerCard } from "@/lib/rankings";

/** Position accent dot + short label used on each roster slot. */
function SlotBadge({ kind, label }: { kind: string; label: string }) {
  return (
    <span
      className="inline-flex w-11 shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted"
      title={label}
    >
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: positionColor(kind === "FLEX" ? null : kind) }}
      />
      {label}
    </span>
  );
}

/**
 * The kept players slotted into the league's roster positions. Open slots read
 * as gaps — exactly the holes the manager still has to fill in the draft.
 */
function RosterBoard({ card }: { card: ManagerCard }) {
  if (!card.keptVisible) {
    return (
      <p className="rounded-md border border-dashed border-line px-3 py-4 text-center text-xs text-muted">
        Keepers are hidden until the deadline locks them in.
      </p>
    );
  }

  const slottable: SlottablePlayer[] = card.kept.map((p) => ({
    playerId: p.playerId,
    name: p.name,
    newPrice: p.price,
    position: p.position,
  }));
  const slots = assignRosterSlots(slottable);

  return (
    <ul className="space-y-1">
      {slots.map((slot, i) => (
        <li
          key={i}
          className="flex items-center gap-2 rounded-md border border-line bg-canvas px-2.5 py-1.5 text-sm"
        >
          <SlotBadge kind={slot.kind} label={slot.label} />
          {slot.player ? (
            <>
              <span className="min-w-0 flex-1 truncate text-ink">
                {slot.player.name}
              </span>
              <span className="tabular shrink-0 text-xs text-muted">
                ${slot.player.newPrice}
              </span>
            </>
          ) : (
            <span className="flex-1 text-xs italic text-muted">Open</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Starting Budget | Keeper Spend | Remaining. */
function MoneyStrip({ card }: { card: ManagerCard }) {
  const cell = (label: string, value: number | null) => (
    <div className="flex-1 px-2 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="tabular mt-0.5 text-sm font-semibold text-ink">
        {value === null ? "—" : `$${value}`}
      </div>
    </div>
  );
  return (
    <div className="flex divide-x divide-line rounded-md border border-line bg-canvas">
      {cell("Starting", card.startingBudget)}
      {cell("Keeper Spend", card.keeperSpend)}
      {cell("Remaining", card.remaining)}
    </div>
  );
}

const NEEDS_ACCENT: Record<string, string> = {
  QB: "#FF6B6B",
  RB: "#5DD39E",
  WR: "#4DA8FF",
  TE: "#FF9D4D",
};

/** Biggest-draft-needs chips (colored for the standard positions). */
export function DraftNeedChips({ needs }: { needs: string[] }) {
  if (needs.length === 0) {
    return <p className="text-sm text-muted">No draft needs listed yet.</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {needs.map((need, i) => {
        const accent = NEEDS_ACCENT[need.toUpperCase()];
        return (
          <span
            key={i}
            className="rounded-full border px-2.5 py-1 text-xs font-semibold"
            style={
              accent
                ? {
                    color: accent,
                    borderColor: `color-mix(in srgb, ${accent} 55%, transparent)`,
                    backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
                  }
                : undefined
            }
          >
            {need}
          </span>
        );
      })}
    </div>
  );
}

/** One ranking row: pinned manager details left, scrolling write-up right. */
function RankingRow({ rank, card }: { rank: number; card: ManagerCard }) {
  return (
    <div className="grid grid-cols-1 gap-6 border-t border-line py-8 lg:grid-cols-[minmax(0,20rem)_1fr]">
      {/* Left: pinned within the row while the right side scrolls. */}
      <div className="lg:sticky lg:top-20 lg:self-start">
        <div className="mb-3 flex items-baseline gap-3">
          <span className="nameplate-type text-4xl leading-none text-muted">
            {rank}
          </span>
          <Nameplate alias={card.name} size="lg" />
        </div>
        <div className="mb-3">
          <MoneyStrip card={card} />
        </div>
        <RosterBoard card={card} />
      </div>

      {/* Right: the scrolling write-up. */}
      <div className="min-w-0 space-y-5">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Biggest Draft Needs
          </h3>
          <DraftNeedChips needs={card.draftNeeds} />
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Why they&apos;re here
          </h3>
          {card.explanation.trim() ? (
            <div className="space-y-3 text-sm leading-relaxed text-ink">
              {card.explanation
                .split(/\n{2,}/)
                .map((para) => para.trim())
                .filter(Boolean)
                .map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No write-up yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Read-only Post-Keeper rankings: a stack of manager rows, each with the
 * manager's details pinned on the left and the author's write-up scrolling on
 * the right until the row hands off to the next manager.
 */
export function RankingReadView({ cards }: { cards: ManagerCard[] }) {
  if (cards.length === 0) {
    return <p className="text-sm text-muted">No managers to rank yet.</p>;
  }
  return (
    <div>
      {cards.map((card, i) => (
        <RankingRow key={card.managerId} rank={i + 1} card={card} />
      ))}
    </div>
  );
}
