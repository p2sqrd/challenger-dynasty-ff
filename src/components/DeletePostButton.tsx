"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeletePostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("Delete this post?")) return;
    setBusy(true);
    const res = await fetch(`/api/trash-talk/${postId}/delete`, {
      method: "POST",
    });
    if (res.ok) {
      router.refresh();
    } else {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={remove}
      disabled={busy}
      className="text-xs text-muted transition-colors hover:text-rejected disabled:opacity-40"
    >
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}
