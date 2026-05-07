"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/app/components/PageHeader";
import { formatCurrency, formatDate } from "@/app/components/ui";
import { useAuth } from "@/app/components/AuthProvider";

type Stats = {
  totalInvoices: number;
  totalRevenue: number;
  totalReceivable: number;
  overdueAmount: number;
  draftCount: number;
  sentCount: number;
  paidCount: number;
  overdueCount: number;
  recentPayments: {
    id: string;
    invoiceId: string;
    amount: number;
    currency: string;
    method: string;
    paidAt: string;
  }[];
};

function StatCard({
  label,
  value,
  sub,
  color = "text-white",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="card">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { business } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load dashboard");
        return data;
      })
      .then(setStats)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  const s = stats!;

  return (
    <div>
      <PageHeader title={`Welcome back${business ? `, ${business.name}` : ""} 👋`}>
        <Link href="/invoices/new" className="btn-primary">
          + New Invoice
        </Link>
      </PageHeader>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Invoices"
          value={String(s.totalInvoices)}
          sub={`${s.draftCount} draft · ${s.sentCount} sent · ${s.paidCount} paid`}
        />
        <StatCard
          label="Revenue Collected"
          value={formatCurrency(s.totalRevenue)}
          color="text-emerald-400"
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(s.totalReceivable)}
          color="text-blue-400"
        />
        <StatCard
          label="Overdue"
          value={formatCurrency(s.overdueAmount)}
          sub={`${s.overdueCount} invoice(s)`}
          color={s.overdueAmount > 0 ? "text-red-400" : "text-white"}
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link
          href="/invoices/new"
          className="card hover:border-indigo-700 transition-colors text-center py-6"
        >
          <div className="text-2xl mb-2">🧾</div>
          <p className="font-medium text-white text-sm">New Invoice</p>
          <p className="text-xs text-slate-500 mt-1">Create and send instantly</p>
        </Link>
        <Link
          href="/customers/new"
          className="card hover:border-indigo-700 transition-colors text-center py-6"
        >
          <div className="text-2xl mb-2">👤</div>
          <p className="font-medium text-white text-sm">Add Customer</p>
          <p className="text-xs text-slate-500 mt-1">Save billing details</p>
        </Link>
        <Link
          href="/payments/new"
          className="card hover:border-indigo-700 transition-colors text-center py-6"
        >
          <div className="text-2xl mb-2">💰</div>
          <p className="font-medium text-white text-sm">Record Payment</p>
          <p className="text-xs text-slate-500 mt-1">Mark invoices as paid</p>
        </Link>
      </div>

      {/* Recent payments */}
      {s.recentPayments.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">
            Recent Payments
          </h2>
          <div className="space-y-3">
            {s.recentPayments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0"
              >
                <div>
                  <p className="text-sm text-white font-medium">
                    {formatCurrency(p.amount, p.currency)}
                  </p>
                  <p className="text-xs text-slate-500">
                    via {p.method} · {formatDate(p.paidAt)}
                  </p>
                </div>
                <Link
                  href={`/invoices/${p.invoiceId}`}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  View Invoice →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {s.totalInvoices === 0 && (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🚀</p>
          <h2 className="text-lg font-semibold text-white mb-2">
            You&apos;re all set!
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Start by creating your first invoice or adding a customer.
          </p>
          <Link href="/invoices/new" className="btn-primary">
            Create First Invoice
          </Link>
        </div>
      )}
    </div>
  );
}
