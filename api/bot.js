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
  // o'yinchi botni bloklasa / qayta ochsa
  const mc = req.body?.my_chat_member;
  if (mc?.chat?.type === "private") {
    const st = mc.new_chat_member?.status;
    await rpc("g_mark_reach", { p_id: String(mc.chat.id), p_reach: st === "kicked" ? "blocked" : st === "member" ? "ok" : "gone" }).catch(() => {});
    return res.status(200).json({ ok: true });
  }
  try {
    const base = process.env.WEBAPP_URL || `https://${req.headers.host}/`;
    const playBtn = (text = "🎮 O'ynash", url = base) => ({ inline_keyboard: [[{ text, web_app: { url } }]] });
    if (m?.contact && m.from) {
      if (String(m.contact.user_id) !== String(m.from.id)) {
        await send(m.chat.id, "Iltimos, o'zingizning raqamingizni pastdagi tugma orqali yuboring.");
      } else {
        await rpc("g_player_upsert", { p_id: String(m.from.id), p_name: "", p_username: m.from.username || null,
          p_phone: String(m.contact.phone_number) });
        await send(m.chat.id, "✅ Rahmat! Akkauntingiz tayyor.", { reply_markup: { remove_keyboard: true } });
        await send(m.chat.id, "O'yinga qaytish uchun bosing 👇", { reply_markup: playBtn() });
      }
    } else if (m?.text?.startsWith("/start")) {
      const arg = m.text.split(" ")[1] || "";
      const prof = await rpc("g_profile", { p_id: String(m.from.id) }, false);
      if (!prof?.has_phone) {
        await rpc("g_player_upsert", { p_id: String(m.from.id), p_name: "", p_username: m.from.username || null, p_phone: null });
        await send(m.chat.id, "👋 G'altak o'yinlariga xush kelibsiz!\n\nRo'yxatdan o'tish uchun pastdagi «📱 Raqamni yuborish» tugmasini bosing.",
          { reply_markup: { keyboard: [[{ text: "📱 Raqamni yuborish", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true } });
      }
      if (arg.startsWith("r_")) {
        await send(m.chat.id, "⚔️ Do'stingiz sizni o'yinga chaqiryapti!", { reply_markup: playBtn("⚔️ O'yinga kirish", `${base}?room=${encodeURIComponent(arg.slice(2))}`) });
      } else if (prof?.has_phone) {
        await send(m.chat.id, "🎮 G'altak o'yinlari: Shashka, Topqir va Gugurt — hammasi 1 vs 1. Pastdagi tugmani bosing.", { reply_markup: playBtn() });
      }
    }
  } catch (e) { console.error(e); }
  res.status(200).json({ ok: true });
}
