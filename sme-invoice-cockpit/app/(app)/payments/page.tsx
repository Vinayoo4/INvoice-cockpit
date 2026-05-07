"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/app/components/PageHeader";
import { formatCurrency, formatDate } from "@/app/components/ui";

type Payment = {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  method: string;
  reference?: string;
  paidAt: string;
};

type Invoice = { id: string; number: string };

const METHOD_LABELS: Record<string, string> = {
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  card: "Card",
  other: "Other",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoiceMap, setInvoiceMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/payments"), fetch("/api/invoices")])
      .then(async ([pRes, iRes]) => {
        const pData = await pRes.json();
        const iData = await iRes.json();
        if (!pRes.ok) throw new Error(pData.error ?? "Failed to load payments");
        if (!iRes.ok) throw new Error(iData.error ?? "Failed to load invoices");
        setPayments(pData.payments ?? []);
        const invs: Invoice[] = iData.invoices ?? [];
        setInvoiceMap(Object.fromEntries(invs.map((i) => [i.id, i.number])));
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => setLoading(false));
  }, []);

  const totalReceived = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <PageHeader title="Payments">
        <Link href="/payments/new" className="btn-primary">+ Record Payment</Link>
      </PageHeader>

      {/* Summary */}
      {payments.length > 0 && (
        <div className="card mb-6 inline-block">
          <p className="text-xs text-slate-400 mb-1">Total Received</p>
          <p className="text-2xl font-bold text-emerald-400">
            {formatCurrency(totalReceived)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {payments.length} payment{payments.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="card">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-sm mb-4">No payments recorded yet.</p>
          <Link href="/payments/new" className="btn-primary">Record Payment</Link>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="text-left px-4 py-3 font-medium">Invoice</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">
                  Method
                </th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                  Reference
                </th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-800 last:border-0 hover:bg-slate-800/40"
                >
                  <td className="px-4 py-3">
                    {invoiceMap[p.invoiceId] ? (
                      <Link
                        href={`/invoices/${p.invoiceId}`}
                        className="text-indigo-400 hover:underline font-mono text-xs"
                      >
                        {invoiceMap[p.invoiceId]}
                      </Link>
                    ) : (
                      <span className="text-slate-500 text-xs">{p.invoiceId}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-400">
                    {formatCurrency(p.amount, p.currency)}
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">
                    {METHOD_LABELS[p.method] ?? p.method}
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                    {p.reference ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">
                    {formatDate(p.paidAt)}
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
