// Telegram webhook: /start → o'yinlarni ochadigan tugma. /start r_KOD → do'st chaqirgan shashka xonasi.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("ok");
  const secret = process.env.WEBHOOK_SECRET;
  if (secret && req.headers["x-telegram-bot-api-secret-token"] !== secret) return res.status(401).end();
  const m = req.body?.message;
  const text = m?.text || "";
  if (m && text.startsWith("/start")) {
    const arg = text.split(" ")[1] || "";
    const base = process.env.WEBAPP_URL || `https://${req.headers.host}/`;
    let url = base, msg = "🎮 G'altak o'yinlari\n\nShashka, 2048 va Rost yoki jur'at — pastdagi tugmani bosing.";
    if (arg.startsWith("r_")) {
      url = `${base}?room=${encodeURIComponent(arg.slice(2))}`;
      msg = "⚫⚪ Do'stingiz sizni shashka o'yiniga chaqiryapti!";
    }
    await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: m.chat.id, text: msg,
        reply_markup: { inline_keyboard: [[{ text: arg.startsWith("r_") ? "⚫ O'yinga kirish" : "🎮 O'ynash", web_app: { url } }]] } }),
    });
  }
  res.status(200).json({ ok: true });
}
