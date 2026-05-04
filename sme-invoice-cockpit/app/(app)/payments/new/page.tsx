"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/app/components/PageHeader";

type Invoice = { id: string; number: string; total: number; amountPaid: number; currency: string; status: string };

export default function NewPaymentPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [form, setForm] = useState({
    invoiceId: "",
    amount: "",
    method: "upi",
    reference: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((d) => {
        const outstanding = (d.invoices ?? []).filter(
          (i: Invoice) => i.status !== "paid" && i.status !== "draft"
        );
        setInvoices(outstanding);
      });
  }, []);

  const selectedInvoice = invoices.find((i) => i.id === form.invoiceId);
  const outstanding = selectedInvoice
    ? selectedInvoice.total - selectedInvoice.amountPaid
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const amount = parseFloat(form.amount);
    if (!form.invoiceId) { setError("Select an invoice."); return; }
    if (!amount || amount <= 0) { setError("Enter a valid amount."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to record payment");
      } else {
        router.push(`/invoices/${form.invoiceId}`);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md">
      <PageHeader title="Record Payment">
        <Link href="/payments" className="btn-secondary">← Back</Link>
      </PageHeader>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Invoice *</label>
          <select
            className="input"
            value={form.invoiceId}
            onChange={(e) => {
              const inv = invoices.find((i) => i.id === e.target.value);
              setForm((f) => ({
                ...f,
                invoiceId: e.target.value,
                amount: inv ? String((inv.total - inv.amountPaid).toFixed(2)) : "",
              }));
            }}
            required
          >
            <option value="">Select outstanding invoice…</option>
            {invoices.map((i) => (
              <option key={i.id} value={i.id}>
                {i.number} — {i.currency}{" "}
                {(i.total - i.amountPaid).toFixed(2)} outstanding
              </option>
            ))}
          </select>
          {invoices.length === 0 && (
            <p className="text-xs text-slate-500 mt-1">
              No outstanding invoices.{" "}
              <Link href="/invoices" className="text-indigo-400">View all →</Link>
            </p>
          )}
        </div>

        <div>
          <label className="label">
            Amount{outstanding != null ? ` (outstanding: ${outstanding.toFixed(2)})` : ""}
          </label>
          <input
            className="input"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="label">Method</label>
          <select
            className="input"
            value={form.method}
            onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
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
            placeholder="UTR / Transaction ID"
            value={form.reference}
            onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Recording…" : "Record Payment"}
          </button>
          <Link href="/payments" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
