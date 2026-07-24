import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

const CARDS = [
  {
    href: "/keepers",
    icon: "🏈",
    title: "Keepers",
    blurb:
      "Lock in the players you're carrying into the 2026 auction, watch your budget fill up, and see the league's kept rosters once the deadline hits.",
    cta: "Set your keepers",
  },
  {
    href: "/rule-proposals",
    icon: "🗳️",
    title: "2026 Rule Proposals",
    blurb:
      "Propose rule changes for the upcoming season, discuss them, and vote — everything that shapes how the draft and year will run.",
    cta: "Propose & vote",
  },
];

export default function DraftPrepPage() {
  return (
    <div>
      <PageHeader
        title="Draft Prep"
        subtitle="Everything that gets the league ready for the 2026 auction — your keepers and the rule changes up for a vote."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group flex flex-col rounded-md border border-line bg-surface p-6 transition-colors hover:bg-surface-2"
          >
            <div className="flex items-center gap-3">
              <span aria-hidden className="text-2xl">
                {c.icon}
              </span>
              <h2 className="nameplate-type text-lg text-ink">{c.title}</h2>
            </div>
            <p className="mt-3 flex-1 text-sm text-muted">{c.blurb}</p>
            <span className="mt-4 text-sm font-semibold text-brand">
              {c.cta} →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
