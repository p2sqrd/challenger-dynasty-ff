"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLink {
  href: string;
  label: string;
  /** How to decide active: exact match, or any path under this prefix. */
  match?: "exact" | "prefix";
}

export function NavLinks({
  links,
}: {
  links: NavLink[];
}) {
  const pathname = usePathname();

  function isActive(link: NavLink) {
    if (link.match === "prefix") return pathname.startsWith(link.href);
    return pathname === link.href;
  }

  return (
    <nav className="flex items-center gap-0.5">
      {links.map((link) => {
        const active = isActive(link);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`relative whitespace-nowrap px-2 py-1 text-sm transition-colors ${
              active ? "text-brand" : "text-muted hover:text-ink"
            }`}
          >
            {link.label}
            {active && (
              <span className="absolute inset-x-2 -bottom-[13px] h-0.5 bg-brand" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
