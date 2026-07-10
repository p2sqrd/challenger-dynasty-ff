import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const REASON_LABELS: Record<string, string> = {
  trade: "Trade",
  keeper: "Keeper",
  starting_budget: "Starting budget",
  other: "Other",
};

export default async function BudgetPage({
  params,
}: {
  params: Promise<{ manager: string }>;
}) {
  const { manager: managerId } = await params;
  const supabase = await createClient();

  const { data: manager } = await supabase
    .from("managers")
    .select("id, display_name")
    .eq("id", managerId)
    .single();

  if (!manager) notFound();

  const { data: entries } = await supabase
    .from("budget_ledger")
    .select("id, amount, reason, created_at")
    .eq("manager_id", managerId)
    .order("created_at", { ascending: false });

  const balance = (entries ?? []).reduce((sum, e) => sum + e.amount, 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold">{manager.display_name}&apos;s Budget</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Every transaction that produced the current balance — no more opaque
        running numbers.
      </p>
      <p className="mt-4 text-3xl font-semibold">${balance}</p>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
            <th className="py-2 font-normal">Date</th>
            <th className="py-2 font-normal">Reason</th>
            <th className="py-2 text-right font-normal">Amount</th>
          </tr>
        </thead>
        <tbody>
          {(entries ?? []).map((entry) => (
            <tr
              key={entry.id}
              className="border-b border-neutral-100 dark:border-neutral-900"
            >
              <td className="py-2">
                {new Date(entry.created_at).toLocaleDateString()}
              </td>
              <td className="py-2">{REASON_LABELS[entry.reason] ?? entry.reason}</td>
              <td className="py-2 text-right">
                {entry.amount >= 0 ? "+" : ""}
                {entry.amount}
              </td>
            </tr>
          ))}
          {(entries ?? []).length === 0 && (
            <tr>
              <td colSpan={3} className="py-6 text-center text-neutral-400">
                No ledger entries yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
