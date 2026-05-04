// app/api/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireUser } from "@/app/api/_auth";
import { customerSchema } from "@/lib/validators";
import { getAll, upsertById } from "@/lib/jsonDb";
import type { Customer } from "@/lib/types";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const all = await getAll<Customer>("customers");
  const customers = all
    .filter((c) => c.businessId === user.businessId)
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  return NextResponse.json({ customers });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const customer: Customer = {
      id: `cus_${nanoid()}`,
      businessId: user.businessId,
      name: parsed.data.name,
      email: parsed.data.email || undefined,
      phone: parsed.data.phone || undefined,
      gstin: parsed.data.gstin || undefined,
      billingAddress: parsed.data.billingAddress,
      shippingAddress: parsed.data.shippingAddress,
      createdAt: new Date().toISOString(),
    };

    await upsertById("customers", customer);
    return NextResponse.json({ customer }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
