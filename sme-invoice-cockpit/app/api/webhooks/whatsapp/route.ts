// app/api/webhooks/whatsapp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { sendWhatsAppText } from "@/lib/whatsappClient";
import { getAll, upsertById } from "@/lib/jsonDb";
import { listInvoicesForBusiness } from "@/lib/invoices";
import type { Customer, User, WebhookLog } from "@/lib/types";

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

      // Try to find a user mapped to this phone number
      const customers = await getAll<Customer>("customers");
      const matchedCustomer = customers.find((c) => c.phone === `+${from}`);

      if (userText.startsWith("invoices") || userText === "list") {
        // Find business by customer
        if (matchedCustomer) {
          const users = await getAll<User>("users");
          const bizUser = users.find(
            (u) => u.businessId === matchedCustomer.businessId
          );
          if (bizUser) {
            const invoices = await listInvoicesForBusiness(bizUser.businessId);
            const overdue = invoices.filter(
              (i) => i.status === "overdue" || i.status === "sent"
            );
            if (overdue.length === 0) {
              await sendWhatsAppText(from, "You have no outstanding invoices. ✅");
            } else {
              const total = overdue.reduce((s, i) => s + (i.total - i.amountPaid), 0);
              const list = overdue
                .slice(0, 3)
                .map(
                  (i) =>
                    `• ${i.number}: ${i.currency} ${(i.total - i.amountPaid).toFixed(2)} (due ${i.dueDate})`
                )
                .join("\n");
              await sendWhatsAppText(
                from,
                `You have ${overdue.length} outstanding invoice(s) totalling ${overdue[0].currency} ${total.toFixed(2)}:\n${list}`
              );
            }
          } else {
            await sendWhatsAppText(from, "Your account is not linked to a business.");
          }
        } else {
          await sendWhatsAppText(
            from,
            "Your number is not registered. Please contact your business owner."
          );
        }
      } else if (userText === "help") {
        await sendWhatsAppText(
          from,
          "📋 Invoice Cockpit Commands:\n• *invoices* – see outstanding invoices\n• *help* – show this menu"
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
