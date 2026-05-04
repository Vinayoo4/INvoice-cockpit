"use client";

type StatusBadgeProps = { status: string };

const statusMap: Record<string, string> = {
  draft: "badge-slate",
  sent: "badge-blue",
  paid: "badge-green",
  overdue: "badge-red",
};

const labelMap: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const cls = statusMap[status] ?? "badge-slate";
  return <span className={cls}>{labelMap[status] ?? status}</span>;
}

export function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
