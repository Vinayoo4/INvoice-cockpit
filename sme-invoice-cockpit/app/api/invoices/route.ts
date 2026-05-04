// app/api/invoices/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/api/_auth";
import { invoiceCreateSchema } from "@/lib/validators";
import {
  createInvoice,
  listInvoicesForBusiness,
} from "@/lib/invoices";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const invoices = await listInvoicesForBusiness(user.businessId);
  return NextResponse.json({ invoices });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = invoiceCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const invoice = await createInvoice(user, parsed.data);
    return NextResponse.json({ invoice }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
