// lib/whatsappClient.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let waBot: any = null;

const phoneId = process.env.WA_PHONE_NUMBER_ID;
const token = process.env.WA_ACCESS_TOKEN;

async function getBot() {
  if (!phoneId || !token) return null;
  if (!waBot) {
    try {
      const { createBot } = await import("whatsapp-cloud-api");
      waBot = createBot(phoneId, token);
    } catch {
      return null;
    }
  }
  return waBot;
}

export async function sendWhatsAppText(to: string, body: string): Promise<void> {
  const bot = await getBot();
  if (!bot) {
    console.warn("[WhatsApp] Not configured – skipping send to", to);
    return;
  }
  await bot.sendText(to, body);
}
