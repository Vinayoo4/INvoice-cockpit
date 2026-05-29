// app/api/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireUser } from "@/app/api/_auth";
import { customerSchema } from "@/lib/validators";
import { getAll, upsertById, deleteById } from "@/lib/jsonDb";
import type { Customer, Invoice } from "@/lib/types";

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
    console.warn("POST /api/customers: No authenticated user");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.flatten();
      console.warn("POST /api/customers: Validation error", errors);
      return NextResponse.json(
        { 
          error: "Invalid customer data", 
          details: errors.fieldErrors
        },
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
      billingAddress: parsed.data.billingAddress || undefined,
      shippingAddress: parsed.data.shippingAddress || undefined,
      createdAt: new Date().toISOString(),
    };

    await upsertById("customers", customer);
    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error("POST /api/customers: Server error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const allCustomers = await getAll<Customer>("customers");
  const customer = allCustomers.find((c) => c.id === id && c.businessId === user.businessId);
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const allInvoices = await getAll<Invoice>("invoices");
  const hasInvoices = allInvoices.some((i) => i.customerId === id && i.businessId === user.businessId);
  if (hasInvoices) {
    return NextResponse.json(
      { error: "Cannot delete customer with existing invoices" },
      { status: 400 }
    );
  }

  await deleteById<Customer>("customers", id);
  return NextResponse.json({ ok: true });
}
