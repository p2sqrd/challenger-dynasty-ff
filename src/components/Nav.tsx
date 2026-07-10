import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";
import { SignOutButton } from "./SignOutButton";

const LINKS = [
  { href: "/", label: "Standings" },
  { href: "/trades", label: "Trades" },
  { href: "/keepers", label: "Keepers" },
  { href: "/rules", label: "Rules" },
  { href: "/archive", label: "Archive" },
];

export async function Nav() {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);

  return (
    <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
      <nav className="flex items-center gap-5">
        <span className="font-semibold">Challenger Dynasty FF</span>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            {link.label}
          </Link>
        ))}
        {manager && (
          <Link
            href={`/budget/${manager.id}`}
            className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            My Budget
          </Link>
        )}
        {manager?.role === "commissioner" && (
          <Link
            href="/keepers/approve"
            className="text-sm font-medium text-neutral-900 dark:text-neutral-100"
          >
            Approval Queue
          </Link>
        )}
      </nav>
      <div className="flex items-center gap-3">
        {manager && (
          <span className="text-sm text-neutral-500">
            {manager.display_name}
          </span>
        )}
        <SignOutButton />
      </div>
    </header>
  );
}
