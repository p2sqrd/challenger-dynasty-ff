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

  const keepers: NavLink = {
    href: "/keepers",
    label: "Keepers",
    children: [
      // "Set My Keepers" is /keepers itself, so match it exactly — otherwise it
      // would light up on every /keepers/* sub-page too.
      { href: "/keepers", label: "Set My Keepers", match: "exact" },
      { href: "/keepers/simulate", label: "Simulate Keepers", match: "prefix" },
      { href: "/keepers/league", label: "League Keepers", match: "prefix" },
    ],
  };
  const ruleProposals: NavLink = {
    href: "/rule-proposals",
    label: "Rule Proposals",
    match: "prefix",
  };
  const trades: NavLink = {
    href: "/trades",
    label: "Trades",
    children: [
      // "Process Trades" is /trades itself, so match it exactly — otherwise it
      // would light up on every /trades/* sub-page too.
      { href: "/trades", label: "Process Trade", match: "exact" },
      { href: "/trades/simulator", label: "Simulate Trade", match: "prefix" },
      { href: "/trades/history", label: "Trade History", match: "prefix" },
    ],
  };
  const budget: NavLink = { href: "/budget", label: "Auction Budget", match: "prefix" };
  const fireSale: NavLink = { href: "/fire-sale", label: "Fire Sale", match: "prefix" };
  const standings: NavLink = { href: "/standings", label: "Historical Standings", match: "prefix" };
  const scheduleLuck: NavLink = { href: "/schedule-luck", label: "Schedule Luck", match: "prefix" };
  const askMissAje: NavLink = { href: "/assistant", label: "Ask Miss Aje", match: "prefix" };
  const archiveExtras: NavLink[] = [
    { href: "/trash-talk", label: "Trash Talk", match: "prefix" },
    standings,
    scheduleLuck,
    { href: "/players", label: "Players", match: "prefix" },
    { href: "/rules", label: "Rules", match: "prefix" },
    { href: "/proposals", label: "Previous Rule Proposals", match: "prefix" },
    { href: "/punishment", label: "Punishment Tracker", match: "prefix" },
  ];
  const commish: NavLink[] =
    manager?.role === "commissioner"
      ? [{ href: "/commish", label: "Commish", match: "prefix" }]
      : [];

  const links: NavLink[] = [
    keepers,
    ruleProposals,
    trades,
    budget,
    fireSale,
    askMissAje,
    { href: "/archive", label: "More", children: archiveExtras },
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
          {/* Desktop nav from lg up; below lg the hamburger takes over. */}
          <NavLinks
            links={links}
            className="hidden items-center gap-0.5 lg:flex"
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
          {manager && <MobileMenu links={links} team={team} />}
        </div>
      </div>
    </header>
  );
}
