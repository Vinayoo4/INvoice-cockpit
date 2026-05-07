// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { requireUser } from "@/app/api/_auth";
import { getAll, saveAll } from "@/lib/jsonDb";
import { userProfileSchema } from "@/lib/validators";
import { normalizePhone } from "@/lib/phone";
import type { Business, User } from "@/lib/types";

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
      whatsappNumber: user.whatsappNumber,
    },
    business,
  });
}

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = userProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const users = await getAll<User>("users");
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx === -1) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const rawWhatsApp = parsed.data.whatsappNumber;
    const normalizedWhatsApp =
      rawWhatsApp === "" ? undefined : normalizePhone(rawWhatsApp);

    users[idx] = { ...users[idx], whatsappNumber: normalizedWhatsApp };
    await saveAll("users", users);

    return NextResponse.json({
      user: {
        id: users[idx].id,
        email: users[idx].email,
        businessId: users[idx].businessId,
        role: users[idx].role,
        whatsappNumber: users[idx].whatsappNumber,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
