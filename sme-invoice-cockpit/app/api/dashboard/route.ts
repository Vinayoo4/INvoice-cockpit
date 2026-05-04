// app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { requireUser } from "@/app/api/_auth";
import { getDashboardStats } from "@/lib/invoices";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await getDashboardStats(user.businessId);
  return NextResponse.json(stats);
}
