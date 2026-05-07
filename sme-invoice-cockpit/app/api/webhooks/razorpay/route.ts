import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getAll, saveAll, upsertById } from "@/lib/jsonDb";
import type { Invoice, Payment, WebhookLog } from "@/lib/types";

function verifyRazorpaySignature(body: string, signature?: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signature) return false;
  const digest = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  if (!verifyRazorpaySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const log: WebhookLog = {
    id: nanoid(),
    source: "razorpay",
    direction: "inbound",
    payload,
    createdAt: new Date().toISOString(),
  };
  await upsertById("webhooks", log);

  if (payload?.event !== "payment.captured") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const entity = payload?.payload?.payment?.entity;
  const invoiceId = entity?.notes?.invoiceId as string | undefined;
  const amountPaise = entity?.amount as number | undefined;
  if (!invoiceId || !amountPaise) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const [invoices, payments] = await Promise.all([
    getAll<Invoice>("invoices"),
    getAll<Payment>("payments"),
  ]);
  const idx = invoices.findIndex((i) => i.id === invoiceId);
  if (idx === -1) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const invoice = invoices[idx];
  const amount = amountPaise / 100;
  const payment: Payment = {
    id: nanoid(),
    invoiceId: invoice.id,
    businessId: invoice.businessId,
    amount,
    currency: invoice.currency,
    method: "other",
    reference: entity?.id ?? "razorpay",
    paidAt: new Date().toISOString(),
  };
  payments.push(payment);
  invoice.amountPaid = Math.round((invoice.amountPaid + amount) * 100) / 100;
  if (invoice.amountPaid >= invoice.total) {
    invoice.status = "paid";
  }
  invoices[idx] = invoice;

  await Promise.all([saveAll("payments", payments), saveAll("invoices", invoices)]);
  return NextResponse.json({ ok: true });
}
