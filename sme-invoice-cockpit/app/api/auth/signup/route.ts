// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { signupSchema } from "@/lib/validators";
import { getAll, saveAll, upsertById } from "@/lib/jsonDb";
import { hashPassword, createSession, findUserByEmail } from "@/lib/auth";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import type { Business, User } from "@/lib/types";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (isRateLimited(`auth:signup:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, businessName } = parsed.data;

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const business: Business = {
      id: `biz_${nanoid()}`,
      name: businessName,
      country: "IN",
      timezone: "Asia/Kolkata",
      createdAt: new Date().toISOString(),
    };

    const passwordHash = await hashPassword(password);

    const user: User = {
      id: `usr_${nanoid()}`,
      email,
      passwordHash,
      businessId: business.id,
      role: "owner",
      createdAt: new Date().toISOString(),
    };

    const businesses = await getAll<Business>("businesses");
    businesses.push(business);
    await saveAll("businesses", businesses);
    await upsertById("users", user);

    const session = await createSession(user.id);

    const res = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          businessId: user.businessId,
          role: user.role,
        },
      },
      { status: 201 }
    );
    res.cookies.set("session_token", session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
