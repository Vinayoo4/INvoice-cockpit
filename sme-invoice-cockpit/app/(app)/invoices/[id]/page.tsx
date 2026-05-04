"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/app/components/PageHeader";
import { StatusBadge, formatCurrency, formatDate } from "@/app/components/ui";

type InvoiceLineItem = {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  gstRate: number;
  amount: number;
  taxAmount: number;
};

type Invoice = {
  id: string;
  number: string;
  customerId: string;
  issueDate: string;
  dueDate: string;
  status: string;
  currency: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  notes?: string;
  createdAt: string;
};

type Customer = { id: string; name: string; email?: string; phone?: string };
type Payment = {
  id: string;
  amount: number;
  currency: string;
  method: string;
  reference?: string;
  paidAt: string;
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: "",
    method: "upi" as string,
    reference: "",
  });
  const [payError, setPayError] = useState("");
  const [updating, setUpdating] = useState(false);

  async function load() {
    const [invRes, payRes] = await Promise.all([
      fetch(`/api/invoices/${id}`),
      fetch("/api/payments"),
    ]);
    if (!invRes.ok) { router.push("/invoices"); return; }
    const invData = await invRes.json();
    const payData = await payRes.json();
    const inv: Invoice = invData.invoice;
    setInvoice(inv);
    const allPayments: Payment[] = payData.payments ?? [];
    setPayments(allPayments.filter((p) => (p as unknown as { invoiceId: string }).invoiceId === id));

    // Load customer
    const cusRes = await fetch("/api/customers");
    const cusData = await cusRes.json();
    const cus = (cusData.customers ?? []).find(
      (c: Customer) => c.id === inv.customerId
    );
    setCustomer(cus ?? null);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function handleStatusChange(status: string) {
    setUpdating(true);
    await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
    setUpdating(false);
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    setPayError("");
    const amount = parseFloat(payForm.amount);
    if (!amount || amount <= 0) {
      setPayError("Enter a valid amount.");
      return;
    }
    setPaying(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: id,
          amount,
          method: payForm.method,
          reference: payForm.reference || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayError(data.error ?? "Payment failed");
      } else {
        setPayForm({ amount: "", method: "upi", reference: "" });
        load();
      }
    } catch {
      setPayError("Network error.");
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!invoice) return null;

  const outstanding = invoice.total - invoice.amountPaid;

  return (
    <div className="max-w-3xl">
      <PageHeader title={invoice.number}>
        <StatusBadge status={invoice.status} />
        <Link href="/invoices" className="btn-secondary">
          ← Back
        </Link>
      </PageHeader>

      {/* Invoice card */}
      <div className="card mb-5">
        <div className="flex justify-between flex-wrap gap-4 mb-5">
          <div>
            <p className="text-xs text-slate-400 mb-1">Customer</p>
            <p className="font-semibold text-white">{customer?.name ?? "—"}</p>
            {customer?.email && (
              <p className="text-xs text-slate-500">{customer.email}</p>
            )}
            {customer?.phone && (
              <p className="text-xs text-slate-500">{customer.phone}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 mb-1">Issue / Due</p>
            <p className="text-sm text-white">{formatDate(invoice.issueDate)}</p>
            <p className="text-sm text-white">{formatDate(invoice.dueDate)}</p>
          </div>
        </div>

        {/* Line items */}
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="text-slate-400 border-b border-slate-800">
              <th className="text-left pb-2 font-medium">Description</th>
              <th className="text-right pb-2 font-medium">Qty</th>
              <th className="text-right pb-2 font-medium">Rate</th>
              <th className="text-right pb-2 font-medium">GST</th>
              <th className="text-right pb-2 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((li) => (
              <tr key={li.id} className="border-b border-slate-800/50">
                <td className="py-2 text-slate-200">{li.description}</td>
                <td className="py-2 text-right text-slate-400">{li.quantity}</td>
                <td className="py-2 text-right text-slate-400">
                  {formatCurrency(li.rate, invoice.currency)}
                </td>
                <td className="py-2 text-right text-slate-400">{li.gstRate}%</td>
                <td className="py-2 text-right text-white font-medium">
                  {formatCurrency(li.amount + li.taxAmount, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="space-y-1 text-sm border-t border-slate-800 pt-3">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal</span>
            <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Tax (GST)</span>
            <span>{formatCurrency(invoice.taxTotal, invoice.currency)}</span>
          </div>
          <div className="flex justify-between text-white font-bold text-base border-t border-slate-700 pt-2">
            <span>Total</span>
            <span>{formatCurrency(invoice.total, invoice.currency)}</span>
          </div>
          {invoice.amountPaid > 0 && (
            <>
              <div className="flex justify-between text-emerald-400">
                <span>Amount Paid</span>
                <span>{formatCurrency(invoice.amountPaid, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-white font-semibold">
                <span>Outstanding</span>
                <span>{formatCurrency(outstanding, invoice.currency)}</span>
              </div>
            </>
          )}
        </div>

        {invoice.notes && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-400 mb-1">Notes</p>
            <p className="text-sm text-slate-300">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {invoice.status !== "paid" && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {invoice.status === "draft" && (
            <button
              onClick={() => handleStatusChange("sent")}
              className="btn-primary"
              disabled={updating}
            >
              Mark as Sent
            </button>
          )}
          {invoice.status === "sent" || invoice.status === "overdue" ? (
            <button
              onClick={() => handleStatusChange("paid")}
              className="btn-primary"
              disabled={updating}
            >
              Mark as Paid (full)
            </button>
          ) : null}
          {invoice.status !== "draft" && (
            <button
              onClick={() => handleStatusChange("draft")}
              className="btn-secondary"
              disabled={updating}
            >
              Revert to Draft
            </button>
          )}
        </div>
      )}

      {/* Record payment */}
      {invoice.status !== "paid" && outstanding > 0 && (
        <div className="card mb-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">
            Record Payment
          </h2>
          <form onSubmit={handlePayment} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Amount</label>
              <input
                className="input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder={outstanding.toFixed(2)}
                value={payForm.amount}
                onChange={(e) =>
                  setPayForm((f) => ({ ...f, amount: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="label">Method</label>
              <select
                className="input"
                value={payForm.method}
                onChange={(e) =>
                  setPayForm((f) => ({ ...f, method: e.target.value }))
                }
              >
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Reference (optional)</label>
              <input
                className="input"
                type="text"
                placeholder="UTR / Ref no."
                value={payForm.reference}
                onChange={(e) =>
                  setPayForm((f) => ({ ...f, reference: e.target.value }))
                }
              />
            </div>
            {payError && (
              <p className="sm:col-span-3 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                {payError}
              </p>
            )}
            <div className="sm:col-span-3">
              <button type="submit" className="btn-primary" disabled={paying}>
                {paying ? "Recording…" : "Record Payment"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">
            Payment History
          </h2>
          <div className="space-y-2">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0"
              >
                <div>
                  <p className="text-sm text-white">
                    {formatCurrency(p.amount, p.currency)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.method}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </p>
                </div>
                <p className="text-xs text-slate-400">{formatDate(p.paidAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
