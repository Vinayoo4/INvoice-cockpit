"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/app/components/PageHeader";
import { formatDate } from "@/app/components/ui";

type Customer = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  gstin?: string;
  billingAddress?: string;
  createdAt: string;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load customers");
      setCustomers(data.customers ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this customer? This will not delete their invoices.")) return;
    // Soft delete by removing from list (no delete endpoint needed for MVP)
    alert("Delete not implemented in MVP – invoices may reference this customer.");
  }

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  );

  return (
    <div>
      <PageHeader title="Customers">
        <Link href="/customers/new" className="btn-primary">+ Add Customer</Link>
      </PageHeader>

      <div className="mb-4">
        <input
          className="input max-w-xs"
          type="text"
          placeholder="Search by name, email, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
          <p className="text-slate-400 text-sm mb-4">
            {search ? "No customers match your search." : "No customers yet."}
          </p>
          {!search && (
            <Link href="/customers/new" className="btn-primary">Add Customer</Link>
          )}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Phone</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-800 last:border-0 hover:bg-slate-800/40"
                >
                  <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">
                    {c.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                    {c.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                    {formatDate(c.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/invoices/new?customerId=${c.id}`}
                      className="text-xs text-indigo-400 hover:text-indigo-300 mr-3"
                    >
                      Invoice
                    </Link>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-xs text-red-500 hover:text-red-400"
                    >
                      Delete
                    </button>
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
