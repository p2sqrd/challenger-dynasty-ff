"use client";

import { useState } from "react";

/**
 * Copies an absolute link to the given in-app path to the clipboard, so a
 * manager can paste it into the league chat. The origin is read at click time
 * (`window.location.origin`) so the link is correct in every environment.
 */
export function CopyLinkButton({
  path,
  label = "Copy link",
  className = "",
}: {
  path: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard blocked (e.g. insecure context) — select-and-copy fallback.
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-ink transition-colors hover:bg-surface-2 ${className}`}
    >
      <span aria-hidden>{copied ? "✓" : "🔗"}</span>
      {copied ? "Copied!" : label}
    </button>
  );
}
