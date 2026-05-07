import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireUser } from "@/app/api/_auth";
import { getAll, saveAll } from "@/lib/jsonDb";
import type { Invoice } from "@/lib/types";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoices = await getAll<Invoice>("invoices");
  const idx = invoices.findIndex(
    (i) => i.id === params.id && i.businessId === user.businessId
  );
  if (idx === -1) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const invoice = invoices[idx];
  const base =
    process.env.RAZORPAY_PAYMENT_LINK_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  const token = nanoid(12);
  invoice.paymentLinkUrl = `${base.replace(/\/$/, "")}/pay/${invoice.id}?token=${token}`;
  invoices[idx] = invoice;
  await saveAll("invoices", invoices);

  return NextResponse.json({ paymentLinkUrl: invoice.paymentLinkUrl });
}
