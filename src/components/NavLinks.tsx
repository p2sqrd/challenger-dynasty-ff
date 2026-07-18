"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavLink {
  href: string;
  label: string;
  /** How to decide active: exact match, or any path under this prefix. */
  match?: "exact" | "prefix";
  /** When present, this item is a dropdown menu of these children. */
  children?: NavLink[];
}

export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  function isActive(link: NavLink): boolean {
    if (link.children) return link.children.some((c) => isActive(c));
    if (link.match === "prefix") return pathname.startsWith(link.href);
    return pathname === link.href;
  }

  return (
    // Desktop only — below `lg` the links live in the hamburger menu.
    <nav className="hidden items-center gap-0.5 lg:flex">
      {links.map((link) =>
        link.children ? (
          <NavDropdown
            key={link.label}
            label={link.label}
            active={isActive(link)}
            items={link.children}
            isActive={isActive}
          />
        ) : (
          <NavItem key={link.href} link={link} active={isActive(link)} />
        )
      )}
    </nav>
  );
}

function NavItem({ link, active }: { link: NavLink; active: boolean }) {
  return (
    <Link
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
}

function NavDropdown({
  label,
  active,
  items,
  isActive,
}: {
  label: string;
  active: boolean;
  items: NavLink[];
  isActive: (link: NavLink) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click. (Selecting an item closes it via its onClick.)
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`relative flex items-center gap-1 whitespace-nowrap px-2 py-1 text-sm transition-colors ${
          active ? "text-brand" : "text-muted hover:text-ink"
        }`}
      >
        {label}
        <span
          aria-hidden
          className={`text-[10px] transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
        {active && (
          <span className="absolute inset-x-2 -bottom-[13px] h-0.5 bg-brand" />
        )}
      </button>

      {open && (
        // top-full + pt-2 keeps the 8px visual gap as *hoverable* padding that
        // touches the button, so moving the pointer down into the menu never
        // crosses dead space (which would fire mouseleave and close it).
        <div role="menu" className="absolute left-0 top-full z-30 min-w-[13rem] pt-2">
          <div className="overflow-hidden rounded-md border border-line bg-surface py-1 shadow-lg">
            {items.map((item) => {
              const itemActive = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2 text-sm transition-colors hover:bg-surface-2 ${
                    itemActive ? "text-brand" : "text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
