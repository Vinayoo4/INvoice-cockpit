"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/app/components/PageHeader";
import { StatusBadge, formatCurrency, formatDate } from "@/app/components/ui";

type Invoice = {
  id: string;
  number: string;
  customerId: string;
  issueDate: string;
  dueDate: string;
  status: string;
  currency: string;
  total: number;
  amountPaid: number;
  createdAt: string;
};

type Customer = { id: string; name: string };

const STATUSES = ["all", "draft", "sent", "paid", "overdue"];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [invRes, cusRes] = await Promise.all([
        fetch("/api/invoices"),
        fetch("/api/customers"),
      ]);
      const invData = await invRes.json();
      const cusData = await cusRes.json();
      if (!invRes.ok) throw new Error(invData.error ?? "Failed to load invoices");
      if (!cusRes.ok) throw new Error(cusData.error ?? "Failed to load customers");
      setInvoices(invData.invoices ?? []);
      setCustomers(cusData.customers ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c.name]));

  const filtered =
    filter === "all" ? invoices : invoices.filter((i) => i.status === filter);

  async function handleDelete(id: string) {
    if (!confirm("Delete this invoice?")) return;
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <PageHeader title="Invoices">
        <Link href="/invoices/new" className="btn-primary">+ New Invoice</Link>
      </PageHeader>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === s
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500 self-center">
          {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="card">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-sm mb-4">No invoices yet.</p>
          <Link href="/invoices/new" className="btn-primary">
            Create Invoice
          </Link>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="text-left px-4 py-3 font-medium">Number</th>
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">
                  Issue Date
                </th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">
                  Due Date
                </th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-slate-800 last:border-0 hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-indigo-400">
                    <Link href={`/invoices/${inv.id}`} className="hover:underline">
                      {inv.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-200">
                    {customerMap[inv.customerId] ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">
                    {formatDate(inv.issueDate)}
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">
                    {formatDate(inv.dueDate)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-white">
                    {formatCurrency(inv.total, inv.currency)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-xs text-slate-400 hover:text-slate-200"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleDelete(inv.id)}
                        className="text-xs text-red-500 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
