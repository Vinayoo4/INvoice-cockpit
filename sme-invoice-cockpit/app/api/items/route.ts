// app/api/items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireUser } from "@/app/api/_auth";
import { itemSchema } from "@/lib/validators";
import { getAll, upsertById, deleteById } from "@/lib/jsonDb";
import type { Item } from "@/lib/types";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const all = await getAll<Item>("items");
  const items = all.filter((i) => i.businessId === user.businessId);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = itemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const item: Item = {
      id: `itm_${nanoid()}`,
      businessId: user.businessId,
      ...parsed.data,
    };

    await upsertById("items", item);
    return NextResponse.json({ item }, { status: 201 });
  } catch {
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

  const all = await getAll<Item>("items");
  const item = all.find((i) => i.id === id && i.businessId === user.businessId);
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  await deleteById<Item>("items", id);
  return NextResponse.json({ ok: true });
}
