// Mini App uchun: bot username (do'stni chaqirish havolasi uchun)
let cached = null;
export default async function handler(req, res) {
  if (!cached && process.env.BOT_TOKEN) {
    try {
      const r = await (await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/getMe`)).json();
      cached = r.result?.username || null;
    } catch (e) {}
  }
  res.setHeader("Cache-Control", "s-maxage=3600");
  res.status(200).json({ bot: cached || process.env.BOT_USERNAME || "" });
}
