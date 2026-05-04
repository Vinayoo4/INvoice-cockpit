// app/api/payments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/api/_auth";
import { paymentSchema } from "@/lib/validators";
import { addPaymentToInvoice, getPaymentsForBusiness } from "@/lib/invoices";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payments = await getPaymentsForBusiness(user.businessId);
  return NextResponse.json({ payments });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await addPaymentToInvoice(user, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
