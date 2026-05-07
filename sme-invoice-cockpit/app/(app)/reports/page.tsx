"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/app/components/PageHeader";
import { formatCurrency } from "@/app/components/ui";

type Summary = {
  month: string;
  invoiceCount: number;
  invoiceValue: number;
  monthlyRevenue: number;
  avgDaysToPay: number;
  topByRevenue: { name: string; revenue: number; unpaid: number }[];
  topByUnpaid: { name: string; revenue: number; unpaid: number }[];
};

export default function ReportsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const month = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    fetch(`/api/reports?mode=summary&month=${month}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to load reports");
        setData(d);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load")
      )
      .finally(() => setLoading(false));
  }, [month]);

  return (
    <div>
      <PageHeader title="Reports">
        <a className="btn-secondary" href="/api/reports?mode=export&type=invoices">
          Export Invoices CSV
        </a>
        <a className="btn-secondary" href="/api/reports?mode=export&type=payments">
          Export Payments CSV
        </a>
      </PageHeader>

      {loading ? (
        <div className="card">Loading...</div>
      ) : error ? (
        <div className="card text-red-400">{error}</div>
      ) : data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card">
              <p className="text-xs text-slate-400">Invoices ({month})</p>
              <p className="text-xl font-semibold">{data.invoiceCount}</p>
            </div>
            <div className="card">
              <p className="text-xs text-slate-400">Invoice Value</p>
              <p className="text-xl font-semibold">
                {formatCurrency(data.invoiceValue)}
              </p>
            </div>
            <div className="card">
              <p className="text-xs text-slate-400">Revenue</p>
              <p className="text-xl font-semibold text-emerald-400">
                {formatCurrency(data.monthlyRevenue)}
              </p>
            </div>
          </div>

          <div className="card">
            <p className="text-xs text-slate-400 mb-2">Top customers by unpaid</p>
            <div className="space-y-2">
              {data.topByUnpaid.map((c) => (
                <div key={c.name} className="flex justify-between text-sm">
                  <span>{c.name}</span>
                  <span className="text-red-400">{formatCurrency(c.unpaid)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
