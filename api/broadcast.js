// Yangilanish xabari: /api/broadcast?key=WEBHOOK_SECRET — har versiya uchun faqat bir marta yuboriladi.
import { rpc, noteReach } from "./_lib.js";
import { APP_VERSION, NEWS } from "../js/version.js";

export default async function handler(req, res) {
  const key = new URL(req.url, "http://x").searchParams.get("key");
  if (!process.env.WEBHOOK_SECRET || key !== process.env.WEBHOOK_SECRET) return res.status(403).json({ error: "forbidden" });
  const q = new URL(req.url, "http://x").searchParams;
  // ?rest=<ISO vaqt>: shu vaqtdan oldin xabar olmaganlarga (blok qilmaganlarga) davom ettirib yuborish, 120 tadan
  if (q.get("rest")) return res.status(200).json(await broadcastRest(req.headers.host, q.get("rest"), 120));
  res.status(200).json(await broadcast(req.headers.host));
}

export async function broadcastRest(host, before, limit) {
  const claim = await rpc("g_broadcast_rest", { p_before: before, p_limit: limit });
  const ids = claim.ids || [];
  let sent = 0, failed = 0;
  for (let i = 0; i < ids.length; i += 6) {
    await Promise.all(ids.slice(i, i + 6).map(async chat_id => {
      try {
        const r = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id, text: NEWS, reply_markup: { inline_keyboard: [[{ text: "▶️ O'ynash", web_app: { url: `https://${host}/` } }]] } }),
        });
        const j = await r.json(); await noteReach(chat_id, j);
        j.ok ? sent++ : failed++;
      } catch (e) { failed++; }
    }));
    await new Promise(r => setTimeout(r, 250));
  }
  return { ok: true, picked: ids.length, sent, failed };
}

export async function broadcast(host) {
  const claim = await rpc("g_broadcast_claim", { p_ver: APP_VERSION });
  if (claim?.error) return { ok: false, reason: "Bu versiya uchun xabar allaqachon yuborilgan", version: APP_VERSION };
  const url = `https://${host}/`;
  let sent = 0, failed = 0;
  for (const chat_id of claim.ids || []) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id, text: NEWS, reply_markup: { inline_keyboard: [[{ text: "▶️ O'ynash", web_app: { url } }]] } }),
      });
      const j = await r.json(); await noteReach(chat_id, j);
      j.ok ? sent++ : failed++;
    } catch (e) { failed++; }
    await new Promise(r => setTimeout(r, 40)); // Telegram cheklovi: sekundiga ~25 ta
  }
  return { ok: true, version: APP_VERSION, sent, failed };
}
