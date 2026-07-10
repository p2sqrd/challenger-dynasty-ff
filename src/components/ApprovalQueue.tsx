"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Submission {
  id: string;
  player_name: string;
  new_price: number;
  previous_price: number | null;
  price_rule: string;
  managerName: string;
}

export function ApprovalQueue({ submissions }: { submissions: Submission[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function act(id: string, action: "approve" | "reject") {
    setPendingId(id);
    await fetch(`/api/keepers/${id}/${action}`, { method: "POST" });
    setPendingId(null);
    router.refresh();
  }

  if (submissions.length === 0) {
    return <p className="mt-2 text-sm text-neutral-500">Nothing pending.</p>;
  }

  return (
    <table className="mt-2 w-full text-sm">
      <thead>
        <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
          <th className="py-2 font-normal">Manager</th>
          <th className="py-2 font-normal">Player</th>
          <th className="py-2 font-normal">Price</th>
          <th className="py-2 font-normal">Rule</th>
          <th className="py-2 font-normal" />
        </tr>
      </thead>
      <tbody>
        {submissions.map((s) => (
          <tr
            key={s.id}
            className="border-b border-neutral-100 dark:border-neutral-900"
          >
            <td className="py-2">{s.managerName}</td>
            <td className="py-2">{s.player_name}</td>
            <td className="py-2">
              ${s.previous_price ?? "—"} → ${s.new_price}
            </td>
            <td className="py-2 text-neutral-500">
              {s.price_rule.replace(/_/g, " ")}
            </td>
            <td className="py-2 text-right">
              <button
                onClick={() => act(s.id, "approve")}
                disabled={pendingId === s.id}
                className="mr-2 rounded bg-green-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => act(s.id, "reject")}
                disabled={pendingId === s.id}
                className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                Reject
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
