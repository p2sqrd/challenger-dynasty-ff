"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import type { NavLink } from "./NavLinks";
import { SignOutButton } from "./SignOutButton";
import { OnboardingLauncher } from "./OnboardingLauncher";
import { Nameplate } from "./Nameplate";
import type { Team } from "@/lib/teams";

// true on the client, false during SSR — lets us portal only after hydration
// (the sticky header's backdrop-blur traps position:fixed, so the sheet has to
// be portaled to document.body to cover the screen).
function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

/**
 * The phone navigation: a hamburger button (shown below `lg`) that opens a
 * full-width sheet with every nav link stacked, plus the tour button, the
 * manager's nameplate, and sign out. Desktop keeps the inline nav untouched.
 */
export function MobileMenu({
  links,
  team,
}: {
  links: NavLink[];
  team: Team | null;
}) {
  const mounted = useMounted();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // While open: lock body scroll and close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  function isActive(link: NavLink): boolean {
    if (link.children) return link.children.some(isActive);
    if (link.match === "prefix") return pathname.startsWith(link.href);
    return pathname === link.href;
  }

  const sheet = (
    <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="absolute inset-x-0 top-0 flex max-h-[92vh] flex-col overflow-y-auto border-b border-line bg-canvas shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-3">
          <span className="nameplate-type text-base text-ink">Menu</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex h-10 w-10 items-center justify-center rounded-md text-lg text-muted hover:text-ink"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col px-3 py-2">
          {links.map((link) =>
            link.children ? (
              <div key={link.label} className="py-1">
                <div className="px-3 pb-1 pt-2 text-xs uppercase tracking-wide text-muted">
                  {link.label}
                </div>
                {link.children.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-md px-6 py-3 text-base transition-colors hover:bg-surface-2 ${
                      isActive(c) ? "text-brand" : "text-ink"
                    }`}
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block rounded-md px-3 py-3 text-base transition-colors hover:bg-surface-2 ${
                  isActive(link) ? "text-brand" : "text-ink"
                }`}
              >
                {link.label}
              </Link>
            )
          )}
        </nav>

        <div className="mt-auto flex items-center justify-between gap-4 border-t border-line px-6 py-4">
          {team ? <Nameplate team={team} size="sm" /> : <span />}
          <div className="flex items-center gap-4">
            <OnboardingLauncher autoOpen={false} />
            <SignOutButton />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-md text-ink lg:hidden"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      {open && mounted ? createPortal(sheet, document.body) : null}
    </>
  );
}
