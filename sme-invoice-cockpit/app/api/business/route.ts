// app/api/business/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/api/_auth";
import { businessUpdateSchema } from "@/lib/validators";
import { getAll, saveAll } from "@/lib/jsonDb";
import type { Business } from "@/lib/types";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const businesses = await getAll<Business>("businesses");
  const business = businesses.find((b) => b.id === user.businessId);
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }
  return NextResponse.json({ business });
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = businessUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const businesses = await getAll<Business>("businesses");
    const idx = businesses.findIndex((b) => b.id === user.businessId);
    if (idx === -1) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    businesses[idx] = { ...businesses[idx], ...parsed.data };
    await saveAll("businesses", businesses);
    return NextResponse.json({ business: businesses[idx] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
