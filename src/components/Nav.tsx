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
    { href: "/", label: "Standings", match: "exact" as const },
    { href: "/trades", label: "Trades", match: "exact" as const },
    { href: "/keepers", label: "Keepers", match: "exact" as const },
    { href: "/players", label: "Players", match: "prefix" as const },
    { href: "/rules", label: "Rules", match: "exact" as const },
    { href: "/archive", label: "Archive", match: "exact" as const },
    ...(manager
      ? [{ href: `/budget/${manager.id}`, label: "Budget", match: "prefix" as const }]
      : []),
    ...(manager?.role === "commissioner"
      ? [{ href: "/keepers/approve", label: "Approval", match: "prefix" as const }]
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
