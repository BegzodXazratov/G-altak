// Bir martalik sozlash: brauzerda /api/setup?key=WEBHOOK_SECRET ni oching.
// Webhook'ni ulaydi va bot menyusiga "O'ynash" tugmasini qo'yadi.
export default async function handler(req, res) {
  const { BOT_TOKEN, WEBHOOK_SECRET } = process.env;
  if (!BOT_TOKEN || !WEBHOOK_SECRET) return res.status(500).json({ error: "BOT_TOKEN va WEBHOOK_SECRET Vercel'da sozlanmagan" });
  if (req.query.key !== WEBHOOK_SECRET) return res.status(401).json({ error: "kalit noto'g'ri" });
  const host = `https://${req.headers.host}`;
  const tg = (m, body) => fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${m}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());
  const webhook = await tg("setWebhook", { url: `${host}/api/bot`, secret_token: WEBHOOK_SECRET, allowed_updates: ["message", "my_chat_member", "pre_checkout_query"] });
  const menu = await tg("setChatMenuButton", { menu_button: { type: "web_app", text: "O'ynash", web_app: { url: `${host}/` } } });
  const cmds = await tg("setMyCommands", { commands: [{ command: "start", description: "O'yinlarni ochish" }] });
  res.status(200).json({ webhook, menu, cmds });
}
