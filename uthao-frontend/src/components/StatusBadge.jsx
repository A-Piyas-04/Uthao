const BADGE_STYLES = {
  AVAILABLE: "bg-green-50 text-green-700",
  MATCHED: "bg-green-50 text-green-700",
  COMPLETED: "bg-green-50 text-green-700",
  SUCCESS: "bg-green-50 text-green-700",
  ONGOING: "bg-amber-50 text-amber-700",
  REQUESTED: "bg-amber-50 text-amber-700",
  PENDING: "bg-amber-50 text-amber-700",
  CANCELLED: "bg-red-50 text-red-700",
  OFFLINE: "bg-red-50 text-red-700",
  NO_DRIVER_FOUND: "bg-red-50 text-red-700",
  REFUNDED: "bg-neutral-100 text-neutral-600",
};

export default function StatusBadge({ status }) {
  const colors = BADGE_STYLES[status] ?? "bg-neutral-100 text-neutral-600";
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold capitalize ${colors}`}
    >
      {String(status).replace(/_/g, " ")}
    </span>
  );
}
