"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/app/components/PageHeader";

export default function NewCustomerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/customers";

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    gstin: "",
    billingAddress: "",
    shippingAddress: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add customer");
      } else {
        router.push(redirectTo);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="Add Customer">
        <Link href="/customers" className="btn-secondary">← Back</Link>
      </PageHeader>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Name *</label>
          <input
            className="input"
            type="text"
            placeholder="Vikas Steels"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            autoFocus
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="accounts@vikas.in"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              className="input"
              type="tel"
              placeholder="+911234567890"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <label className="label">GSTIN</label>
          <input
            className="input"
            type="text"
            placeholder="06BBBBB0000B1Z2"
            value={form.gstin}
            onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Billing Address</label>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="Street, City, State, PIN"
            value={form.billingAddress}
            onChange={(e) =>
              setForm((f) => ({ ...f, billingAddress: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="label">Shipping Address (if different)</label>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="Same as billing if empty"
            value={form.shippingAddress}
            onChange={(e) =>
              setForm((f) => ({ ...f, shippingAddress: e.target.value }))
            }
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Saving…" : "Add Customer"}
          </button>
          <Link href="/customers" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
