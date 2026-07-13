"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Nameplate } from "./Nameplate";
import { EditableKeeperPrice } from "./EditableKeeperPrice";

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
    return (
      <p className="mt-3 text-sm text-muted">
        Nothing pending — submitted keepers land here for review.
      </p>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-md border border-line bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <th className="py-3 pl-4 pr-4 text-left font-medium">Manager</th>
            <th className="py-3 pr-4 text-left font-medium">Player</th>
            <th className="py-3 pr-4 text-right font-medium">Price</th>
            <th className="py-3 pr-4 text-left font-medium">Rule</th>
            <th className="py-3 pr-4 text-right font-medium" />
          </tr>
        </thead>
        <tbody>
          {submissions.map((s) => (
            <tr key={s.id} className="border-b border-line last:border-0">
              <td className="py-3 pl-4 pr-4">
                <Nameplate alias={s.managerName} size="sm" />
              </td>
              <td className="py-3 pr-4 text-ink">{s.player_name}</td>
              <td className="py-3 pr-4 text-right">
                <span className="tabular text-muted">
                  ${s.previous_price ?? "—"}
                </span>
                <span className="mx-1 text-muted">→</span>
                <EditableKeeperPrice keeperId={s.id} price={s.new_price} />
              </td>
              <td className="py-3 pr-4 text-muted">
                {s.price_rule.replace(/_/g, " ")}
              </td>
              <td className="py-3 pr-4 text-right whitespace-nowrap">
                <button
                  onClick={() => act(s.id, "approve")}
                  disabled={pendingId === s.id}
                  className="mr-2 rounded px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-approved transition-colors hover:bg-[rgba(76,175,109,0.14)] disabled:opacity-40"
                >
                  Approve
                </button>
                <button
                  onClick={() => act(s.id, "reject")}
                  disabled={pendingId === s.id}
                  className="rounded px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-rejected transition-colors hover:bg-[rgba(229,72,77,0.14)] disabled:opacity-40"
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
