import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";
import { resolveTeam } from "@/lib/teams";
import { NavLinks, type NavLink } from "./NavLinks";
import { Nameplate } from "./Nameplate";
import { SignOutButton } from "./SignOutButton";
import { NotificationBell } from "./NotificationBell";
import { OnboardingLauncher } from "./OnboardingLauncher";
import { MobileMenu } from "./MobileMenu";

export async function Nav() {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  const team = manager ? resolveTeam(manager.display_name) : null;

  const draftPrep: NavLink = {
    href: "/draft-prep",
    label: "Draft Prep",
    children: [
      { href: "/keepers", label: "Keepers", match: "prefix" },
      { href: "/rule-proposals", label: "2026 Rule Proposals", match: "prefix" },
    ],
  };
  const trades: NavLink = { href: "/trades", label: "Trades", match: "prefix" };
  const budget: NavLink = { href: "/budget", label: "Auction Budget", match: "prefix" };
  const fireSale: NavLink = { href: "/fire-sale", label: "Fire Sale", match: "prefix" };
  const standings: NavLink = { href: "/standings", label: "Historical Standings", match: "prefix" };
  const scheduleLuck: NavLink = { href: "/schedule-luck", label: "Schedule Luck", match: "prefix" };
  const askMissAje: NavLink = { href: "/assistant", label: "Ask Miss Aje", match: "prefix" };
  const archiveExtras: NavLink[] = [
    { href: "/trash-talk", label: "Trash Talk", match: "prefix" },
    { href: "/players", label: "Players", match: "prefix" },
    { href: "/rules", label: "Rules", match: "prefix" },
    { href: "/proposals", label: "Previous Rule Proposals", match: "prefix" },
    { href: "/punishment", label: "Punishment Tracker", match: "prefix" },
  ];
  const commish: NavLink[] =
    manager?.role === "commissioner"
      ? [{ href: "/commish", label: "Commish", match: "prefix" }]
      : [];

  // Wide (xl+): Historical Standings and Schedule Luck sit top-level.
  const linksWide: NavLink[] = [
    draftPrep,
    trades,
    budget,
    fireSale,
    standings,
    scheduleLuck,
    askMissAje,
    { href: "/archive", label: "More", children: archiveExtras },
    ...commish,
  ];

  // Compact (lg–xl): those two fold into "More" so the bar doesn't overflow.
  const linksCompact: NavLink[] = [
    draftPrep,
    trades,
    budget,
    fireSale,
    askMissAje,
    {
      href: "/archive",
      label: "More",
      children: [archiveExtras[0], standings, scheduleLuck, ...archiveExtras.slice(1)],
    },
    ...commish,
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex min-w-0 items-center gap-5">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span aria-hidden className="h-5 w-1.5 rounded-sm bg-brand" />
            <span className="nameplate-type whitespace-nowrap text-base leading-none text-ink">
              Challenger Dynasty
            </span>
          </Link>
          {/* Compact between lg and xl; wide at xl+. Below lg both hide and the
              hamburger takes over. */}
          <NavLinks
            links={linksCompact}
            className="hidden items-center gap-0.5 lg:flex xl:hidden"
          />
          <NavLinks
            links={linksWide}
            className="hidden items-center gap-0.5 xl:flex"
          />
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {/*
            Below `lg` the tour launcher, nameplate, and sign out move into the
            hamburger sheet. The OnboardingLauncher stays mounted (just hidden)
            so its first-login auto-open still fires on phones.
          */}
          {manager && (
            <span className="hidden lg:inline-flex">
              <OnboardingLauncher autoOpen={manager.onboarded_at === null} />
            </span>
          )}
          {manager && <NotificationBell />}
          {team && (
            <span className="hidden lg:inline-flex">
              <Nameplate team={team} size="sm" />
            </span>
          )}
          <span className="hidden lg:inline-flex">
            <SignOutButton />
          </span>
          {manager && <MobileMenu links={linksWide} team={team} />}
        </div>
      </div>
    </header>
  );
}
