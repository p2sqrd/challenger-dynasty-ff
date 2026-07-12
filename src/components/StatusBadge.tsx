/**
 * Approval-state pill. Status color is reserved strictly for trade/keeper
 * state and never shares a hue with a team accent. Pending's amber and the
 * achievement gold are close enough that a colorblind viewer could mix them
 * up, so the label text always carries the meaning — color alone never does.
 */
export type Status = "pending" | "approved" | "rejected";

const STYLES: Record<Status, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#E8A33D", bg: "rgba(232,163,61,0.14)" },
  approved: { label: "Approved", color: "#4CAF6D", bg: "rgba(76,175,109,0.14)" },
  rejected: { label: "Rejected", color: "#E5484D", bg: "rgba(229,72,77,0.14)" },
};

export function StatusBadge({
  status,
  label,
}: {
  status: Status;
  label?: string;
}) {
  const s = STYLES[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide"
      style={{ color: s.color, backgroundColor: s.bg }}
    >
      {label ?? s.label}
    </span>
  );
}
