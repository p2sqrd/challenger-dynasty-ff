import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";
import { resolveTeam } from "@/lib/teams";
import { NavLinks } from "./NavLinks";
import { Nameplate } from "./Nameplate";
import { SignOutButton } from "./SignOutButton";

export async function Nav() {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  const team = manager ? resolveTeam(manager.display_name) : null;

  const links = [
    { href: "/keepers", label: "Keepers", match: "prefix" as const },
    { href: "/trades", label: "Trades", match: "prefix" as const },
    { href: "/budget", label: "Budget", match: "prefix" as const },
    { href: "/fire-sale", label: "Fire Sale", match: "prefix" as const },
    { href: "/trash-talk", label: "Trash Talk", match: "prefix" as const },
    {
      href: "/archive",
      label: "Archive",
      children: [
        { href: "/standings", label: "Historical Standings", match: "prefix" as const },
        { href: "/players", label: "Players", match: "prefix" as const },
        { href: "/rules", label: "Rules", match: "prefix" as const },
        { href: "/proposals", label: "Rule Proposals", match: "prefix" as const },
        { href: "/punishment", label: "Punishment Tracker", match: "prefix" as const },
      ],
    },
    ...(manager?.role === "commissioner"
      ? [{ href: "/commish", label: "Commish", match: "prefix" as const }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex min-w-0 items-center gap-5">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span aria-hidden className="h-5 w-1.5 rounded-sm bg-brand" />
            <span className="nameplate-type whitespace-nowrap text-base leading-none text-ink">
              Challenger Dynasty
            </span>
          </Link>
          <NavLinks links={links} />
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {team && <Nameplate team={team} size="sm" />}
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
