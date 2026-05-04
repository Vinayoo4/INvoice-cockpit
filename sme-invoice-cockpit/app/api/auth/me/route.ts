// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { requireUser } from "@/app/api/_auth";
import { getAll } from "@/lib/jsonDb";
import type { Business } from "@/lib/types";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const businesses = await getAll<Business>("businesses");
  const business = businesses.find((b) => b.id === user.businessId) ?? null;

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      businessId: user.businessId,
      role: user.role,
    },
    business,
  });
}
