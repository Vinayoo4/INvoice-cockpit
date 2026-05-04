// app/api/webhooks/meta/route.ts
// Placeholder for Instagram / Facebook Messenger webhooks
// These use the same Meta Graph API webhook structure.
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { upsertById } from "@/lib/jsonDb";
import type { WebhookLog } from "@/lib/types";

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN ?? "dev-verify-token";

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

    const log: WebhookLog = {
      id: nanoid(),
      source: "meta",
      direction: "inbound",
      payload: body,
      createdAt: new Date().toISOString(),
    };
    await upsertById("webhooks", log);

    // Instagram / FB Messenger message parsing
    const entry = body.entry?.[0];
    const messaging = entry?.messaging?.[0];

    if (messaging?.message?.text) {
      // TODO: Implement full IG/FB response logic using the same
      // listInvoicesForBusiness / createInvoice helpers as WhatsApp.
      console.log("[Meta Webhook] message from", messaging.sender?.id, ":", messaging.message.text);
    }

    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
