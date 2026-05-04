// lib/invoices.ts
import { nanoid } from "nanoid";
import { getAll, saveAll, upsertById } from "./jsonDb";
import type { Invoice, InvoiceLineItem, Payment, User } from "./types";

function computeTotals(lineItems: InvoiceLineItem[]): {
  subtotal: number;
  taxTotal: number;
  total: number;
} {
  let subtotal = 0;
  let taxTotal = 0;
  for (const li of lineItems) {
    const amount = li.quantity * li.rate;
    const taxAmount = (amount * li.gstRate) / 100;
    li.amount = Math.round(amount * 100) / 100;
    li.taxAmount = Math.round(taxAmount * 100) / 100;
    subtotal += li.amount;
    taxTotal += li.taxAmount;
  }
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    total: Math.round((subtotal + taxTotal) * 100) / 100,
  };
}

export async function createInvoiceNumber(businessId: string): Promise<string> {
  const invoices = await getAll<Invoice>("invoices");
  const bizInvoices = invoices.filter((i) => i.businessId === businessId);
  const next = bizInvoices.length + 1;
  return `INV-${String(next).padStart(4, "0")}`;
}

export async function createInvoice(
  user: User,
  payload: {
    customerId: string;
    issueDate: string;
    dueDate: string;
    currency: string;
    notes?: string;
    status?: "draft" | "sent";
    lineItems: {
      itemId?: string;
      description: string;
      quantity: number;
      rate: number;
      gstRate: number;
    }[];
  }
): Promise<Invoice> {
  const lineItems: InvoiceLineItem[] = payload.lineItems.map((li) => ({
    id: nanoid(),
    itemId: li.itemId,
    description: li.description,
    quantity: li.quantity,
    rate: li.rate,
    gstRate: li.gstRate,
    amount: 0,
    taxAmount: 0,
  }));

  const totals = computeTotals(lineItems);

  const invoice: Invoice = {
    id: nanoid(),
    businessId: user.businessId,
    number: await createInvoiceNumber(user.businessId),
    customerId: payload.customerId,
    issueDate: payload.issueDate,
    dueDate: payload.dueDate,
    status: payload.status ?? "sent",
    currency: payload.currency,
    lineItems,
    subtotal: totals.subtotal,
    taxTotal: totals.taxTotal,
    total: totals.total,
    amountPaid: 0,
    notes: payload.notes,
    createdAt: new Date().toISOString(),
  };

  await upsertById("invoices", invoice);
  return invoice;
}

export async function listInvoicesForBusiness(
  businessId: string
): Promise<Invoice[]> {
  const all = await getAll<Invoice>("invoices");
  // Mark overdue invoices on the fly
  const now = new Date();
  return all
    .filter((i) => i.businessId === businessId)
    .map((inv) => {
      if (
        inv.status === "sent" &&
        new Date(inv.dueDate) < now
      ) {
        return { ...inv, status: "overdue" as const };
      }
      return inv;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export async function getInvoiceById(
  businessId: string,
  id: string
): Promise<Invoice | null> {
  const all = await getAll<Invoice>("invoices");
  const inv = all.find((i) => i.id === id && i.businessId === businessId);
  if (!inv) return null;
  if (inv.status === "sent" && new Date(inv.dueDate) < new Date()) {
    return { ...inv, status: "overdue" };
  }
  return inv;
}

export async function updateInvoice(
  businessId: string,
  id: string,
  updates: Partial<Pick<Invoice, "status" | "notes" | "dueDate">>
): Promise<Invoice | null> {
  const all = await getAll<Invoice>("invoices");
  const idx = all.findIndex((i) => i.id === id && i.businessId === businessId);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates };
  await saveAll("invoices", all);
  return all[idx];
}

export async function deleteInvoice(
  businessId: string,
  id: string
): Promise<boolean> {
  const all = await getAll<Invoice>("invoices");
  const filtered = all.filter(
    (i) => !(i.id === id && i.businessId === businessId)
  );
  if (filtered.length === all.length) return false;
  await saveAll("invoices", filtered);
  return true;
}

export async function addPaymentToInvoice(
  user: User,
  paymentInput: {
    invoiceId: string;
    amount: number;
    method: Payment["method"];
    reference?: string;
    paidAt?: string;
  }
): Promise<{ invoice: Invoice; payment: Payment }> {
  const invoices = await getAll<Invoice>("invoices");
  const invoiceIdx = invoices.findIndex(
    (i) => i.id === paymentInput.invoiceId && i.businessId === user.businessId
  );
  if (invoiceIdx === -1) throw new Error("Invoice not found");

  const invoice = invoices[invoiceIdx];

  const payment: Payment = {
    id: nanoid(),
    invoiceId: invoice.id,
    businessId: user.businessId,
    amount: paymentInput.amount,
    currency: invoice.currency,
    method: paymentInput.method,
    reference: paymentInput.reference,
    paidAt: paymentInput.paidAt || new Date().toISOString(),
  };

  const payments = await getAll<Payment>("payments");
  payments.push(payment);
  await saveAll("payments", payments);

  invoice.amountPaid = Math.round((invoice.amountPaid + payment.amount) * 100) / 100;
  if (invoice.amountPaid >= invoice.total) {
    invoice.status = "paid";
  }
  invoices[invoiceIdx] = invoice;
  await saveAll("invoices", invoices);

  return { invoice, payment };
}

export async function getPaymentsForBusiness(
  businessId: string
): Promise<Payment[]> {
  const all = await getAll<Payment>("payments");
  return all
    .filter((p) => p.businessId === businessId)
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
}

export async function getDashboardStats(businessId: string) {
  const [invoices, payments] = await Promise.all([
    getAll<Invoice>("invoices"),
    getAll<Payment>("payments"),
  ]);

  const bizInvoices = invoices.filter((i) => i.businessId === businessId);
  const now = new Date();

  let totalRevenue = 0;
  let totalReceivable = 0;
  let overdueAmount = 0;
  let draftCount = 0;
  let sentCount = 0;
  let paidCount = 0;
  let overdueCount = 0;

  for (const inv of bizInvoices) {
    const outstanding = inv.total - inv.amountPaid;
    if (inv.status === "paid") {
      totalRevenue += inv.amountPaid;
      paidCount++;
    } else if (inv.status === "draft") {
      draftCount++;
    } else {
      // sent or overdue
      totalReceivable += outstanding;
      if (inv.status === "overdue" || new Date(inv.dueDate) < now) {
        overdueAmount += outstanding;
        overdueCount++;
      } else {
        sentCount++;
      }
    }
  }

  const bizPayments = payments.filter((p) => p.businessId === businessId);
  const recentPayments = bizPayments
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
    .slice(0, 5);

  return {
    totalInvoices: bizInvoices.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalReceivable: Math.round(totalReceivable * 100) / 100,
    overdueAmount: Math.round(overdueAmount * 100) / 100,
    draftCount,
    sentCount,
    paidCount,
    overdueCount,
    recentPayments,
  };
}
