// Admin panel ma'lumotlari: parol (ADMIN_PASSWORD) bilan
import crypto from "node:crypto";
import { rpc, noteReach } from "./_lib.js";
import { broadcast } from "./broadcast.js";

const same = (a, b) => {
  const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return res.status(500).json({ error: "ADMIN_PASSWORD sozlanmagan" });
  if (!same(req.body?.password, pass)) {
    await new Promise(r => setTimeout(r, 800)); // taxmin qilishni sekinlashtirish
    return res.status(401).json({ error: "Parol noto'g'ri" });
  }
  try {
    res.setHeader("Cache-Control", "no-store");
    if (req.body?.action === "post") return res.status(200).json(await post(req.body, req.headers.host));
    if (req.body?.action === "broadcast") return res.status(200).json(await broadcast(req.headers.host));
    if (req.body?.action === "reach") return res.status(200).json(await reachCheck(Number(req.body.offset) || 0, req.headers.host));
    const [d, social, acts] = await Promise.all([rpc("g_admin_players", {}), rpc("g_admin_social", {}), rpc("g_admin_acts", {})]);
    res.status(200).json({ ...d, social: { ...social, acts } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server" });
  }
}

// Erkin xabar: adminning o'zi yozgan matn — hammaga, faqat onlayn yoki bitta Telegram ID'ga (sinov uchun)
async function post(b, host) {
  const text = String(b.text || "").trim();
  if (!text || text.length > 3500) return { ok: false, error: "Matn 1–3500 belgi bo'lsin" };
  const btn = String(b.btn || "").trim().slice(0, 40), url = String(b.url || "").trim();
  if (url && !/^https:\/\//i.test(url)) return { ok: false, error: "Havola https:// bilan boshlansin" };
  const d = await rpc("g_admin_players", {});
  const all = (d?.players || d || []).filter(p => p && p.tg_id);
  let ids;
  if (b.audience === "one") ids = [String(b.tg_id || "").trim()].filter(x => /^\d{3,15}$/.test(x));
  else if (b.audience === "online") ids = all.filter(p => Date.now() - new Date(p.seen_at) < 120e3).map(p => p.tg_id);
  else ids = all.map(p => p.tg_id);
  if (!ids.length) return { ok: false, error: "Qabul qiluvchi topilmadi" };
  if (b.dry) return { ok: true, count: ids.length };
  const markup = btn ? { inline_keyboard: [[url ? { text: btn, url } : { text: btn, web_app: { url: `https://${host}/` } }]] } : undefined;
  let sent = 0, failed = 0;
  for (const chat_id of ids) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id, text, ...(markup ? { reply_markup: markup } : {}) }),
      });
      const j = await r.json(); await noteReach(chat_id, j);
      j.ok ? sent++ : failed++;
    } catch (e) { failed++; }
    await new Promise(r => setTimeout(r, 40));
  }
  return { ok: true, sent, failed };
}

// Botni bloklaganlarni aniqlash: har bir o'yinchiga "yozmoqda…" belgisi yuboriladi (xabar chiqmaydi), javobga qarab holat yoziladi.
const tgCall = (m, body) => fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${m}`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());
async function reachCheck(offset, host) {
  const STEP = 90;
  if (offset === 0) await tgCall("setWebhook", { url: `https://${host}/api/bot`,
    secret_token: process.env.WEBHOOK_SECRET, allowed_updates: ["message", "my_chat_member"] }).catch(() => {});
  const d = await rpc("g_admin_players", {});
  const all = (d?.players || []).filter(p => p?.tg_id).sort((a, b) => String(a.tg_id).localeCompare(String(b.tg_id)));
  const part = all.slice(offset, offset + STEP), c = { ok: 0, blocked: 0, never: 0, gone: 0 };
  for (const p of part) {
    try {
      const j = await tgCall("sendChatAction", { chat_id: p.tg_id, action: "typing" });
      const r = await noteReach(p.tg_id, j); if (r) c[r]++;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 40));
  }
  return { ok: true, total: all.length, next: offset + STEP < all.length ? offset + STEP : null, ...c };
}
