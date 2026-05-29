"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/app/components/PageHeader";
import { formatDate } from "@/app/components/ui";
import { useCollection, triggerRefresh } from "@/lib/useData";
import type { Customer } from "@/lib/types";

export default function CustomersPage() {
  const { data: customers, loading } = useCollection<Customer>("customers");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/customers?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete customer");
      } else {
        triggerRefresh("customers");
      }
    } catch (err) {
      alert("Network error. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(
    () =>
      customers.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.email?.toLowerCase().includes(search.toLowerCase()) ||
          c.phone?.includes(search)
      ),
    [customers, search]
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
          <table className="w-full text-sm table-responsive">
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
                  <td className="px-4 py-3 text-white font-medium" data-label="Name">{c.name}</td>
                  <td className="px-4 py-3 text-slate-400 hidden sm:table-cell" data-label="Email">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400 hidden md:table-cell" data-label="Phone">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400 hidden md:table-cell" data-label="Added">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/invoices/new?customerId=${c.id}`}
                      className="text-xs text-indigo-400 hover:text-indigo-300 mr-3"
                    >
                      Invoice
                    </Link>
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      disabled={deletingId === c.id}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      {deletingId === c.id ? "Deleting..." : "Delete"}
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
