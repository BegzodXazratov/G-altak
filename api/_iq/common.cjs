'use strict';
const { SECTIONS } = require('./gen.cjs');
const { levelOf } = require('./score.cjs');

function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}
async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  const chunks = []; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch (e) { return {}; }
}
async function tg(method, params) {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error('BOT_TOKEN yo\'q');
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params || {}) });
  const j = await r.json();
  if (!j.ok) throw new Error(`${method}: ${j.description}`);
  return j.result;
}
const adminIds = () => (process.env.IQ_ADMINS || '').split(',').map((x) => Number(x.trim())).filter(Boolean);
const isAdmin = (id) => adminIds().includes(Number(id));
let _bot = null;
async function botName() {
  if (process.env.BOT_USERNAME) return process.env.BOT_USERNAME.replace('@', '');
  if (_bot) return _bot;
  try { _bot = (await tg('getMe')).username; } catch (e) { _bot = ''; }
  return _bot;
}
const PRICE = () => Number(process.env.IQ_PRICE || 30);

// sessiyadan ochiq natija (va to'langan bo'lsa batafsil)
function publicResult(s, norm) {
  const lv = levelOf(s.iq);
  const prov = !norm || !!norm.provisional || Number(norm.n) < 300;
  return { id: s.id, iq: s.iq, lo: s.ci_lo, hi: s.ci_hi, level: lv.level, levelText: lv.levelText, pct: lv.pct, provisional: prov, raw: s.raw, total: 31, price: PRICE() };
}
function detailOf(s) {
  const key = s.key || {}; const rows = s.answers || [];
  const by = {};
  SECTIONS.forEach((sec) => { by[sec.id] = { id: sec.id, name: sec.name, c: 0, t: 0 }; });
  const wrong = [];
  rows.forEach((r) => {
    const k = key[r.id]; if (!k) return;
    by[k.sec].t++; if (r.ok) by[k.sec].c++;
    else {
      const txt = (o) => (typeof o === 'string' ? o : null);
      wrong.push({ id: r.id, sec: k.sec, q: k.q, yours: r.c == null ? null : txt((k.o || [])[r.c]), right: txt((k.o || [])[k.a]), ex: k.ex });
    }
  });
  const sections = Object.values(by).map((x) => Object.assign(x, { pct: x.t ? Math.round((100 * x.c) / x.t) : 0 }));
  const best = sections.slice().sort((a, b) => b.pct - a.pct)[0];
  const worst = sections.slice().sort((a, b) => a.pct - b.pct)[0];
  const ms = rows.filter((r) => r.ms).map((r) => r.ms);
  return { sections, best: best && best.id, worst: worst && worst.id, wrong, avgSec: ms.length ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length / 100) / 10 : null };
}
module.exports = { adminIds, isAdmin, json, body, tg, botName, PRICE, publicResult, detailOf };
