import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/api/_auth";
import { getAll } from "@/lib/jsonDb";
import type { Customer, Invoice, Payment } from "@/lib/types";

function toCsv(rows: Record<string, string | number | undefined>[]) {
  const firstRow = rows[0];
  if (!firstRow) return "";
  const headers = Object.keys(firstRow);
  const escape = (v: string | number | undefined) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = new URL(req.url).searchParams.get("mode") ?? "summary";
  const [invoices, payments, customers] = await Promise.all([
    getAll<Invoice>("invoices"),
    getAll<Payment>("payments"),
    getAll<Customer>("customers"),
  ]);
  const bizInvoices = invoices.filter((i) => i.businessId === user.businessId);
  const bizPayments = payments.filter((p) => p.businessId === user.businessId);
  const bizCustomers = customers.filter((c) => c.businessId === user.businessId);

  if (mode === "export") {
    const type = new URL(req.url).searchParams.get("type") ?? "invoices";
    let csv = "";
    if (type === "payments") {
      csv = toCsv(
        bizPayments.map((p) => ({
          id: p.id,
          invoiceId: p.invoiceId,
          amount: p.amount,
          currency: p.currency,
          method: p.method,
          paidAt: p.paidAt,
        }))
      );
    } else if (type === "customers") {
      csv = toCsv(
        bizCustomers.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          gstin: c.gstin,
        }))
      );
    } else {
      csv = toCsv(
        bizInvoices.map((i) => ({
          id: i.id,
          number: i.number,
          customerId: i.customerId,
          status: i.status,
          total: i.total,
          amountPaid: i.amountPaid,
          dueDate: i.dueDate,
        }))
      );
    }
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}.csv"`,
      },
    });
  }

  const byCustomer = new Map<
    string,
    { revenue: number; unpaid: number; name: string }
  >();
  for (const c of bizCustomers) {
    byCustomer.set(c.id, { revenue: 0, unpaid: 0, name: c.name });
  }
  for (const inv of bizInvoices) {
    const stat = byCustomer.get(inv.customerId);
    if (!stat) continue;
    stat.revenue += inv.amountPaid;
    stat.unpaid += Math.max(inv.total - inv.amountPaid, 0);
  }

  const topByRevenue = Array.from(byCustomer.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const topByUnpaid = Array.from(byCustomer.values())
    .sort((a, b) => b.unpaid - a.unpaid)
    .slice(0, 5);

  const month = new URL(req.url).searchParams.get("month");
  const monthInvoices = month
    ? bizInvoices.filter((i) => i.issueDate.startsWith(month))
    : bizInvoices;
  const monthlyRevenue = bizPayments
    .filter((p) => !month || p.paidAt.startsWith(month))
    .reduce((sum, p) => sum + p.amount, 0);
  const paymentDates = new Map<string, number>();
  for (const p of bizPayments) {
    const paidAt = new Date(p.paidAt).getTime();
    if (!Number.isFinite(paidAt)) continue;
    const prev = paymentDates.get(p.invoiceId);
    paymentDates.set(p.invoiceId, prev == null ? paidAt : Math.min(prev, paidAt));
  }
  const avgDaysToPay = bizInvoices
    .filter((i) => i.amountPaid > 0 && paymentDates.has(i.id))
    .map((i) => {
      const created = new Date(i.issueDate).getTime();
      const paid = paymentDates.get(i.id)!;
      return Math.max((paid - created) / (24 * 60 * 60 * 1000), 0);
    });

  return NextResponse.json({
    month: month ?? "all",
    invoiceCount: monthInvoices.length,
    invoiceValue: monthInvoices.reduce((sum, i) => sum + i.total, 0),
    monthlyRevenue,
    topByRevenue,
    topByUnpaid,
    avgDaysToPay: avgDaysToPay.length
      ? avgDaysToPay.reduce((a, b) => a + b, 0) / avgDaysToPay.length
      : 0,
  });
}
