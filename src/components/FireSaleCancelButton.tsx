"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FireSaleCancelButton({ saleId }: { saleId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function cancel() {
    if (!confirm("Cancel this Fire Sale?")) return;
    setBusy(true);
    const res = await fetch(`/api/fire-sale/${saleId}/cancel`, {
      method: "POST",
    });
    if (res.ok) router.refresh();
    else setBusy(false);
  }

  return (
    <button
      onClick={cancel}
      disabled={busy}
      className="text-xs text-muted transition-colors hover:text-rejected disabled:opacity-40"
    >
      {busy ? "Cancelling…" : "Cancel"}
    </button>
  );
}
