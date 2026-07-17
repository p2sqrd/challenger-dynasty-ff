"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Item {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  created_at: string;
  read_at: string | null;
}

function ago(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function NotificationBell() {
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const d = (await res.json()) as { items: Item[]; unread: number };
        if (!cancelled) {
          setItems(d.items);
          setUnread(d.unread);
        }
      } catch {
        /* ignore */
      }
    }
    load();
    const poll = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      setItems((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
      );
      await fetch("/api/notifications/read", { method: "POST" }).catch(() => {});
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        aria-label="Notifications"
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:text-ink"
      >
        <span aria-hidden className="text-lg leading-none">
          🔔
        </span>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-[var(--color-brand-ink)]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden rounded-md border border-line bg-surface shadow-lg">
          <div className="border-b border-line px-3 py-2 text-xs uppercase tracking-wide text-muted">
            Notifications
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">
              Nothing yet.
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => {
                const inner = (
                  <div
                    className={`border-b border-line px-3 py-2.5 last:border-0 ${
                      n.link ? "hover:bg-surface-2" : ""
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-ink">
                        {n.title}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted">
                        {ago(n.created_at)}
                      </span>
                    </div>
                    {n.body && (
                      <p className="mt-0.5 text-xs text-muted">{n.body}</p>
                    )}
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link href={n.link} onClick={() => setOpen(false)}>
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
