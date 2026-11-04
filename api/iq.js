// IQ testlar bo'limi: bitta endpoint, action bo'yicha. Telegram imzosi tekshiriladi (G'altak bilan bir xil).
import { createRequire } from "node:module";
import crypto from "node:crypto";
import { verifyInitData } from "./_lib.js";
const require = createRequire(import.meta.url);
const { rpc } = require("./_iq/db.cjs");
const { buildTest } = require("./_iq/gen.cjs");
const { score } = require("./_iq/score.cjs");
const { publicResult, detailOf, botName, tg, PRICE, isAdmin } = require("./_iq/common.cjs");

const FREE_PER_DAY = 2; // kuniga bepul urinishlar
const RETRY_PRICE = () => Number(process.env.IQ_RETRY_PRICE) || 20; // 3-urinishdan boshlab har biri
async function dayInfo(u) { // bugungi (Toshkent vaqti) urinishlar
  if (isAdmin(u.id)) return { used: 0, free: FREE_PER_DAY, credits: 0, left: 999, price: RETRY_PRICE() };
  const d = (await rpc("iq_day_usage", { p_tg: u.id })) || {};
  const used = Number(d.used) || 0, credits = Number(d.credits) || 0;
  return { used, free: FREE_PER_DAY, credits, left: Math.max(0, FREE_PER_DAY + credits - used), price: RETRY_PRICE() };
}
const out = (res, code, o) => res.status(code).setHeader("Cache-Control", "no-store").json(o);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const b = req.body || {};
  const u = verifyInitData(b.initData || b.init_data, process.env.BOT_TOKEN);
  if (!u) return out(res, 401, { error: "auth" });
  try {
    if (b.action === "status") rpc("iq_touch_user", { p_tg: u.id, p_name: u.first_name || "", p_username: u.username || "", p_chat: false }).catch(() => {});
    switch (b.action) {
      case "status": { // bosh sahifa: oxirgi natija, tarix, kutish muddati
        const [last, hist, today] = await Promise.all([rpc("iq_last_session", { p_tg: u.id }), rpc("iq_history", { p_tg: u.id }), dayInfo(u)]);
        const o = { history: hist || [], bot: await botName(), price: PRICE(), today };
        if (last?.finished_at) o.last = { id: last.id };
        return out(res, 200, o);
      }
      case "start": {
        const day = await dayInfo(u);
        if (day.left <= 0) return out(res, 402, { error: "limit", need_pay: true, today: day });
        let seen = [];
        try { seen = (await rpc("iq_seen", { p_tg: u.id })) || []; } catch (e) { console.error("seen", e.message); }
        const t = buildTest(crypto.randomInt(1, 2147483646), seen);
        const sid = await rpc("iq_create_session", { p_tg: u.id, p_name: u.first_name || "", p_username: u.username || "", p_key: t.key });
        return out(res, 200, { session_id: sid, sections: t.sections, today: await dayInfo(u) });
      }
      case "finish": {
        const s = await rpc("iq_get_session", { p_id: b.session_id });
        if (!s || Number(s.tg_id) !== Number(u.id)) return out(res, 404, { error: "session" });
        const norm = await rpc("iq_norm", {});
        if (s.finished_at) return out(res, 200, { result: publicResult(s, norm) });
        const key = s.key, ans = b.answers && typeof b.answers === "object" ? b.answers : {};
        let raw = 0; const by = {}, rows = [], chosen = [];
        Object.keys(key).forEach(id => {
          const k = key[id], a = ans[id];
          const c = a && Number.isInteger(a.c) && a.c >= 0 && a.c < 8 ? a.c : null;
          const ok = c !== null && c === k.a;
          if (ok) raw++;
          if (c !== null) chosen.push(c);
          by[k.sec] = by[k.sec] || { c: 0, t: 0 }; by[k.sec].t++; if (ok) by[k.sec].c++;
          rows.push({ id, tpl: k.tpl, sig: k.sig, sec: k.sec, lvl: k.lvl, c, ok, ms: a && Number.isFinite(a.ms) ? Math.max(0, Math.min(600000, Math.round(a.ms))) : null });
        });
        const elapsed = (Date.now() - Date.parse(s.created_at)) / 1000;
        const counts = {}; chosen.forEach(c => { counts[c] = (counts[c] || 0) + 1; });
        const top = Math.max(0, ...Object.values(counts));
        const flags = { fast: elapsed < 90, patterned: chosen.length >= 15 && top / chosen.length >= 0.8, answered: chosen.length };
        flags.invalid = flags.fast || flags.patterned;
        const sc = score(raw, norm);
        await rpc("iq_finish_session", { p_id: s.id, p_raw: raw, p_by: by, p_iq: sc.iq, p_lo: sc.lo, p_hi: sc.hi, p_answers: rows, p_flags: flags, p_norm: norm.version });
        return out(res, 200, { result: publicResult(Object.assign({}, s, { raw, iq: sc.iq, ci_lo: sc.lo, ci_hi: sc.hi }), norm) });
      }
      case "result": {
        const s = await rpc("iq_get_session", { p_id: b.session_id });
        if (!s || Number(s.tg_id) !== Number(u.id) || !s.finished_at) return out(res, 404, { error: "session" });
        const [norm, paid] = await Promise.all([rpc("iq_norm", {}), rpc("iq_paid", { p_tg: u.id, p_sid: s.id })]);
        const o = { result: publicResult(s, norm), paid: !!paid, bot: await botName(), name: u.first_name || "" };
        if (paid) o.detail = detailOf(s);
        return out(res, 200, o);
      }
      case "invoice": {
        const s = await rpc("iq_get_session", { p_id: b.session_id });
        if (!s || Number(s.tg_id) !== Number(u.id) || !s.finished_at) return out(res, 404, { error: "session" });
        if (await rpc("iq_paid", { p_tg: u.id, p_sid: s.id })) return out(res, 200, { paid: true });
        const link = await tg("createInvoiceLink", {
          title: "Batafsil natija", description: "4 bo'lim bo'yicha tahlil, kuchli va zaif tomonlar, xatolaringiz izohi",
          payload: "detail:" + s.id, currency: "XTR", prices: [{ label: "Batafsil natija", amount: PRICE() }],
        });
        return out(res, 200, { link });
      }
      case "invoice_retry": { // 3-urinishdan boshlab: har bir qo'shimcha urinish uchun Stars
        const day = await dayInfo(u);
        if (day.left > 0) return out(res, 200, { free: true, today: day });
        const link = await tg("createInvoiceLink", {
          title: "Qo'shimcha IQ urinish", description: "Bugungi bepul urinishlar tugadi. Bitta qo'shimcha test topshirish",
          payload: `retry:${u.id}:${Date.now()}`, currency: "XTR", prices: [{ label: "Qo'shimcha urinish", amount: RETRY_PRICE() }],
        });
        return out(res, 200, { link });
      }
      case "top": {
        const rows = await rpc("iq_top", { p_limit: 30 });
        return out(res, 200, { top: rows || [], me: String(u.id) });
      }
      default: return out(res, 400, { error: "action" });
    }
  } catch (e) { console.error("iq", e); return out(res, 500, { error: "server" }); }
}
