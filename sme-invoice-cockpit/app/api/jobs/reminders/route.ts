import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getAll, upsertById } from "@/lib/jsonDb";
import { sendWhatsAppText } from "@/lib/whatsappClient";
import { normalizePhone } from "@/lib/phone";
import type { Invoice, User, WebhookLog } from "@/lib/types";

function daysUntil(dateStr: string): number {
  const now = new Date();
  const due = new Date(dateStr);
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.ceil((due.getTime() - now.getTime()) / oneDay);
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const headerSecret = req.headers.get("x-cron-secret");
  if (secret && headerSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [users, invoices] = await Promise.all([
    getAll<User>("users"),
    getAll<Invoice>("invoices"),
  ]);

  let sent = 0;
  for (const user of users) {
    const to = normalizePhone(user.whatsappNumber);
    if (!to) continue;

    const bizInvoices = invoices.filter(
      (i) => i.businessId === user.businessId && i.status !== "paid"
    );
    const dueSoon = bizInvoices.filter((i) => {
      const days = daysUntil(i.dueDate);
      return days >= 0 && days <= 3;
    });
    const overdue = bizInvoices.filter((i) => daysUntil(i.dueDate) < 0);
    if (!dueSoon.length && !overdue.length) continue;

    const dueSoonLine = dueSoon.length
      ? `Due soon (≤3d): ${dueSoon.length}`
      : undefined;
    const overdueLine = overdue.length
      ? `Overdue: ${overdue.length}`
      : undefined;
    const text = ["📌 Invoice reminder", dueSoonLine, overdueLine]
      .filter(Boolean)
      .join("\n");

    await sendWhatsAppText(to, text);
    const log: WebhookLog = {
      id: nanoid(),
      source: "whatsapp",
      direction: "outbound",
      to,
      payload: { kind: "scheduled-reminder", text },
      createdAt: new Date().toISOString(),
    };
    await upsertById("webhooks", log);
    sent += 1;
  }

  return NextResponse.json({ ok: true, remindersSent: sent });
}
