"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/app/components/PageHeader";

type Customer = { id: string; name: string };
type Item = { id: string; name: string; price: number; gstRate: number; unit: string };

type LineItem = {
  id: string;
  itemId?: string;
  description: string;
  quantity: number;
  rate: number;
  gstRate: number;
};

function genId() {
  return Math.random().toString(36).slice(2);
}

function emptyLine(): LineItem {
  return {
    id: genId(),
    description: "",
    quantity: 1,
    rate: 0,
    gstRate: 18,
  };
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({
    customerId: "",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    currency: "INR",
    notes: "",
    status: "sent" as "draft" | "sent",
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLine()]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/customers"), fetch("/api/items")]).then(
      async ([cRes, iRes]) => {
        const cData = await cRes.json();
        const iData = await iRes.json();
        setCustomers(cData.customers ?? []);
        setItems(iData.items ?? []);
      }
    );
  }, []);

  function updateLine(id: string, patch: Partial<LineItem>) {
    setLineItems((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLine(id: string) {
    setLineItems((ls) => ls.filter((l) => l.id !== id));
  }

  function selectItem(lineId: string, itemId: string) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    updateLine(lineId, {
      itemId,
      description: item.name,
      rate: item.price,
      gstRate: item.gstRate,
    });
  }

  function subtotals() {
    return lineItems.map((l) => ({
      amount: l.quantity * l.rate,
      tax: (l.quantity * l.rate * l.gstRate) / 100,
    }));
  }

  const totals = subtotals();
  const subtotal = totals.reduce((s, t) => s + t.amount, 0);
  const taxTotal = totals.reduce((s, t) => s + t.tax, 0);
  const grandTotal = subtotal + taxTotal;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.customerId) {
      setError("Please select a customer.");
      return;
    }
    if (lineItems.some((l) => !l.description || l.rate < 0)) {
      setError("All line items need a description and valid rate.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          lineItems: lineItems.map(({ id: _id, ...l }) => l),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create invoice");
      } else {
        router.push(`/invoices/${data.invoice.id}`);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="New Invoice">
        <Link href="/invoices" className="btn-secondary">
          ← Back
        </Link>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header fields */}
        <div className="card grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Customer *</label>
            <select
              className="input"
              value={form.customerId}
              onChange={(e) =>
                setForm((f) => ({ ...f, customerId: e.target.value }))
              }
              required
            >
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {customers.length === 0 && (
              <p className="text-xs text-slate-500 mt-1">
                No customers yet.{" "}
                <Link href="/customers/new" className="text-indigo-400">
                  Add one first →
                </Link>
              </p>
            )}
          </div>
          <div>
            <label className="label">Issue Date</label>
            <input
              className="input"
              type="date"
              value={form.issueDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, issueDate: e.target.value }))
              }
              required
            />
          </div>
          <div>
            <label className="label">Due Date</label>
            <input
              className="input"
              type="date"
              value={form.dueDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, dueDate: e.target.value }))
              }
              required
            />
          </div>
          <div>
            <label className="label">Currency</label>
            <select
              className="input"
              value={form.currency}
              onChange={(e) =>
                setForm((f) => ({ ...f, currency: e.target.value }))
              }
            >
              <option>INR</option>
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: e.target.value as "draft" | "sent",
                }))
              }
            >
              <option value="sent">Sent</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Line items */}
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">
            Line Items
          </h2>
          <div className="space-y-3">
            {lineItems.map((line, idx) => (
              <div
                key={line.id}
                className="grid grid-cols-12 gap-2 items-start border-b border-slate-800 pb-3 last:border-0 last:pb-0"
              >
                <div className="col-span-12 sm:col-span-4">
                  <label className="label">Description</label>
                  {items.length > 0 && (
                    <select
                      className="input mb-1"
                      value={line.itemId ?? ""}
                      onChange={(e) => selectItem(line.id, e.target.value)}
                    >
                      <option value="">— pick from catalogue —</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    className="input"
                    type="text"
                    placeholder="Service description"
                    value={line.description}
                    onChange={(e) =>
                      updateLine(line.id, { description: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className="label">Qty</label>
                  <input
                    className="input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(line.id, {
                        quantity: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className="label">Rate</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.rate}
                    onChange={(e) =>
                      updateLine(line.id, {
                        rate: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className="label">GST %</label>
                  <select
                    className="input"
                    value={line.gstRate}
                    onChange={(e) =>
                      updateLine(line.id, {
                        gstRate: parseFloat(e.target.value),
                      })
                    }
                  >
                    {[0, 5, 12, 18, 28].map((r) => (
                      <option key={r} value={r}>
                        {r}%
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-8 sm:col-span-1 flex items-end pb-0.5">
                  <span className="text-sm text-slate-300 font-medium">
                    {new Intl.NumberFormat("en-IN").format(
                      line.quantity * line.rate
                    )}
                  </span>
                </div>
                <div className="col-span-4 sm:col-span-1 flex items-end justify-end pb-0.5">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      className="text-red-500 hover:text-red-400 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setLineItems((ls) => [...ls, emptyLine()])}
            className="btn-ghost mt-3 text-xs"
          >
            + Add Line Item
          </button>

          {/* Totals */}
          <div className="mt-4 border-t border-slate-800 pt-4 space-y-1 text-sm text-right">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span>{new Intl.NumberFormat("en-IN").format(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Tax (GST)</span>
              <span>{new Intl.NumberFormat("en-IN").format(taxTotal)}</span>
            </div>
            <div className="flex justify-between text-white font-semibold text-base border-t border-slate-700 pt-2">
              <span>Total ({form.currency})</span>
              <span>{new Intl.NumberFormat("en-IN").format(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <label className="label">Notes (optional)</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Payment terms, bank details, UPI ID…"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? "Creating…" : "Create Invoice"}
          </button>
          <Link href="/invoices" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
