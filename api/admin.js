// Admin panel ma'lumotlari: parol (ADMIN_PASSWORD) bilan
import crypto from "node:crypto";
import { rpc, noteReach } from "./_lib.js";
import { broadcast } from "./broadcast.js";
import { createRequire } from "node:module";
const iqdb = createRequire(import.meta.url)("./_iq/db.cjs");

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
    if (req.body?.action === "iq") {
      const [ov, pays, users] = await Promise.all([iqdb.rpc("iq_admin_overview", {}), iqdb.rpc("iq_admin_payments", { p_limit: 50 }), iqdb.rpc("iq_admin_users", { p_limit: 30 })]);
      return res.status(200).json({ ov, pays, users });
    }
    if (req.body?.action === "reach") return res.status(200).json(await reachCheck(Number(req.body.offset) || 0, req.headers.host));
    const [d, social, acts] = await Promise.all([rpc("g_admin_players", {}), rpc("g_admin_social", {}), rpc("g_admin_acts", {})]);
    res.status(200).json({ ...d, social: { ...social, acts } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server" });
  }
}

// Erkin xabar: matn va/yoki rasm — hammaga, faqat onlayn yoki bitta Telegram ID'ga (sinov uchun)
async function post(b, host) {
  const text = String(b.text || "").trim();
  const img = parseImage(b.image);
  if (b.image && !img) return { ok: false, error: "Rasm JPG, PNG yoki WEBP bo'lsin (4 MB gacha)" };
  if (!text && !img) return { ok: false, error: "Matn yoki rasm kiriting" };
  if (text.length > 3500) return { ok: false, error: "Matn 3500 belgidan oshmasin" };
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
  const mk = o => ({ ...o, ...(markup ? { reply_markup: markup } : {}) });
  const tgJson = (m, body) => fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${m}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());
  // rasm: birinchi yuborishda yuklanadi, keyin Telegram file_id bilan (tez va tejamkor). Sarlavha 1024 belgigacha — uzun matn alohida xabar bo'ladi.
  let fileId = null; const cap = img && text.length <= 1024;
  const sendOne = async chat_id => {
    let j;
    if (img) {
      if (!fileId) {
        const fd = new FormData(); fd.append("chat_id", chat_id); fd.append("photo", new Blob([img.buf], { type: img.mime }), "photo." + img.ext);
        if (cap) fd.append("caption", text); if (markup && (cap || !text)) fd.append("reply_markup", JSON.stringify(markup));
        j = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendPhoto`, { method: "POST", body: fd }).then(r => r.json());
        const ph = j?.result?.photo; if (j.ok && ph?.length) fileId = ph[ph.length - 1].file_id;
      } else j = await tgJson("sendPhoto", { chat_id, photo: fileId, ...(cap ? { caption: text } : {}), ...(markup && (cap || !text) ? { reply_markup: markup } : {}) });
      if (j.ok && !cap && text) j = await tgJson("sendMessage", mk({ chat_id, text }));
    } else j = await tgJson("sendMessage", mk({ chat_id, text }));
    await noteReach(chat_id, j);
    return j.ok;
  };
  let sent = 0, failed = 0, i = 0;
  if (img && ids.length > 1) { (await sendOne(ids[0]).catch(() => false)) ? sent++ : failed++; i = 1; } // file_id olish uchun birinchisi alohida
  for (; i < ids.length; i += 10) {
    const r = await Promise.all(ids.slice(i, i + 10).map(id => sendOne(id).catch(() => false)));
    r.forEach(ok => ok ? sent++ : failed++);
    await new Promise(r => setTimeout(r, 400)); // Telegram: sekundiga ~30 xabar
  }
  return { ok: true, sent, failed };
}
function parseImage(v) {
  const m = /^data:(image\/(jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(v || ""));
  if (!m) return null;
  const buf = Buffer.from(m[3], "base64");
  if (!buf.length || buf.length > 4 * 1024 * 1024) return null;
  return { buf, mime: m[1], ext: m[2] === "jpeg" ? "jpg" : m[2] };
}

// Botni bloklaganlarni aniqlash: har bir o'yinchiga "yozmoqda…" belgisi yuboriladi (xabar chiqmaydi), javobga qarab holat yoziladi.
const tgCall = (m, body) => fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${m}`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());
async function reachCheck(offset, host) {
  const STEP = 90;
  if (offset === 0) await tgCall("setWebhook", { url: `https://${host}/api/bot`,
    secret_token: process.env.WEBHOOK_SECRET, allowed_updates: ["message", "pre_checkout_query", "my_chat_member"] }).catch(() => {});
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
