// app/api/webhooks/whatsapp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { sendWhatsAppText } from "@/lib/whatsappClient";
import { getAll, upsertById } from "@/lib/jsonDb";
import { listInvoicesForBusiness } from "@/lib/invoices";
import { normalizePhone } from "@/lib/phone";
import type { User, WebhookLog } from "@/lib/types";

const VERIFY_TOKEN = process.env.WA_WEBHOOK_VERIFY_TOKEN ?? "dev-verify-token";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Log the webhook
    const log: WebhookLog = {
      id: nanoid(),
      source: "whatsapp",
      direction: "inbound",
      payload: body,
      createdAt: new Date().toISOString(),
    };
    await upsertById("webhooks", log);

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const messages = changes?.value?.messages;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ status: "ignored" });
    }

    for (const msg of messages) {
      const from: string = msg.from;
      const type: string = msg.type;
      log.from = from;

      if (type !== "text") continue;

      const userText: string = (msg.text?.body ?? "").trim().toLowerCase();
      const fromNormalized = normalizePhone(from);

      // Find user mapped to this WhatsApp number
      const users = await getAll<User>("users");
      const mappedUser = users.find(
        (u) =>
          u.whatsappNumber &&
          normalizePhone(u.whatsappNumber) === fromNormalized
      );

      if (userText === "invoices" || userText === "overdue" || userText === "list") {
        if (mappedUser) {
          const invoices = await listInvoicesForBusiness(mappedUser.businessId);
          const overdue = invoices.filter((i) => i.status === "overdue");
          if (overdue.length === 0) {
            await sendWhatsAppText(from, "No overdue invoices right now ✅");
          } else {
            const totalOutstanding = overdue.reduce(
              (sum, i) => sum + (i.total - i.amountPaid),
              0
            );
            const currency = overdue[0]?.currency ?? "INR";
            const lines = overdue.slice(0, 3).map(
              (i) =>
                `${i.number}: ${i.currency} ${(i.total - i.amountPaid).toFixed(
                  2
                )} (due ${i.dueDate})`
            );
            await sendWhatsAppText(
              from,
              `You have ${overdue.length} overdue invoices (total ${currency} ${totalOutstanding.toFixed(
                2
              )}):\n${lines.join("\n")}`
            );
          }
        } else {
          await sendWhatsAppText(
            from,
            "Your number is not linked yet. Please add it in Invoice Cockpit Settings."
          );
        }
      } else if (userText === "help") {
        await sendWhatsAppText(
          from,
          "📋 Invoice Cockpit Commands:\n• *invoices* / *overdue* – see overdue invoices\n• *help* – show this menu"
        );
      } else {
        await sendWhatsAppText(
          from,
          "Hi! 👋 This is your Invoice Cockpit. Type *invoices* to see your outstanding invoices or *help* for options."
        );
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
