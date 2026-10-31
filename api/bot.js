// Telegram webhook: /start → o'yinlarni ochadigan tugma; /start r_KOD → do'st chaqirgan xona;
// kontakt yuborilsa — o'yinchi akkauntiga telefon raqami yoziladi.
import { rpc, fullName } from "./_lib.js";

const send = (chat_id, text, extra = {}) => fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id, text, ...extra }),
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("ok");
  const secret = process.env.WEBHOOK_SECRET;
  if (secret && req.headers["x-telegram-bot-api-secret-token"] !== secret) return res.status(401).end();
  const m = req.body?.message;
  try {
    if (m?.contact && m.from && String(m.contact.user_id) === String(m.from.id)) {
      await rpc("g_player_upsert", { p_id: String(m.from.id), p_name: fullName(m.from), p_username: m.from.username || null,
        p_phone: String(m.contact.phone_number) });
    } else if (m?.text?.startsWith("/start")) {
      const arg = m.text.split(" ")[1] || "";
      const base = process.env.WEBAPP_URL || `https://${req.headers.host}/`;
      let url = base, text = "🎮 G'altak o'yinlari\n\nShashka, 2048 va So'z jangi — pastdagi tugmani bosing.";
      if (arg.startsWith("r_")) {
        url = `${base}?room=${encodeURIComponent(arg.slice(2))}`;
        text = "⚔️ Do'stingiz sizni o'yinga chaqiryapti!";
      }
      await send(m.chat.id, text, { reply_markup: { inline_keyboard: [[{ text: arg ? "⚔️ O'yinga kirish" : "🎮 O'ynash", web_app: { url } }]] } });
    }
  } catch (e) { console.error(e); }
  res.status(200).json({ ok: true });
}
