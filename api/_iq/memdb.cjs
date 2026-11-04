'use strict';
// Faqat lokal sinov uchun (IQ_DEV=1)
const crypto = require('crypto');
const S = { users: {}, sessions: {}, pays: [], norms: [{ version: 1, mean: 15.5, sd: 5.5, n: 0, provisional: true }] };
function call(fn, a) {
  switch (fn) {
    case 'iq_create_session': { const id = crypto.randomUUID(); S.sessions[id] = { id, tg_id: a.p_tg, tg_name: a.p_name, tg_username: a.p_username, key: a.p_key, created_at: new Date().toISOString(), finished_at: null }; return id; }
    case 'iq_get_session': return S.sessions[a.p_id] || null;
    case 'iq_last_session': { const l = Object.values(S.sessions).filter((s) => s.tg_id === a.p_tg && s.finished_at).sort((x, y) => (y.finished_at > x.finished_at ? 1 : -1))[0]; return l ? { id: l.id, finished_at: l.finished_at } : null; }
    case 'iq_seen': return [].concat(...Object.values(S.sessions).filter((s) => s.tg_id === a.p_tg && s.answers).map((s) => s.answers.map((r) => r.sig).filter(Boolean)));
    case 'iq_touch_user': { const u = S.users[a.p_tg] || (S.users[a.p_tg] = { tg_id: a.p_tg, first_seen: new Date().toISOString(), chat_ok: false, blocked: false }); Object.assign(u, { name: a.p_name, username: a.p_username, last_seen: new Date().toISOString() }); if (a.p_chat) { u.chat_ok = true; u.blocked = false; } return null; }
    case 'iq_mark_blocked': if (S.users[a.p_tg]) S.users[a.p_tg].blocked = true; return null;
    case 'iq_admin_overview': { const U = Object.values(S.users), Se = Object.values(S.sessions), fin = Se.filter((x) => x.finished_at); return { users: U.length, users_24h: U.length, users_7d: U.length, chat_ok: U.filter((u) => u.chat_ok && !u.blocked).length, blocked: U.filter((u) => u.blocked).length, started: Se.length, started_24h: Se.length, finished: fin.length, finished_24h: fin.length, finished_7d: fin.length, avg_iq: fin.length ? Math.round(fin.reduce((t, x) => t + x.iq, 0) / fin.length * 10) / 10 : null, invalid: 0, pay_n: S.pays.length, pay_stars: S.pays.reduce((t, x) => t + x.stars, 0), pay_n_24h: S.pays.length, pay_stars_24h: S.pays.reduce((t, x) => t + x.stars, 0), pay_stars_7d: S.pays.reduce((t, x) => t + x.stars, 0), payers: new Set(S.pays.map((x) => x.tg_id)).size }; }
    case 'iq_admin_payments': return S.pays.slice().reverse().slice(0, a.p_limit || 20).map((x) => ({ tg_id: x.tg_id, name: (S.users[x.tg_id] || {}).name, username: (S.users[x.tg_id] || {}).username, stars: x.stars, created_at: new Date().toISOString() }));
    case 'iq_admin_users': return Object.values(S.users).slice(0, a.p_limit || 30).map((u) => Object.assign({ iq: null, tests: 0, stars: 0 }, u));
    case 'iq_broadcast_batch': return Object.values(S.users).filter((u) => u.chat_ok && !u.blocked && u.tg_id > (a.p_after || 0)).map((u) => u.tg_id).sort((x, y) => x - y).slice(0, a.p_limit || 20);
    case 'iq_history': return Object.values(S.sessions).filter((x) => x.tg_id === a.p_tg && x.finished_at).map((x) => ({ id: x.id, iq: x.iq, lo: x.ci_lo, hi: x.ci_hi, at: x.finished_at, raw: x.raw }));
    case 'iq_top': { const best = {}; Object.values(S.sessions).filter((x) => x.finished_at).forEach((x) => { const b = best[x.tg_id] || (best[x.tg_id] = { id: String(x.tg_id), name: x.tg_name || "O'yinchi", iq: 0, tests: 0 }); b.iq = Math.max(b.iq, x.iq); b.tests++; }); return Object.values(best).sort((m, n) => n.iq - m.iq); }
    case 'iq_day_usage': return { used: Object.values(S.sessions).filter((x) => x.tg_id === a.p_tg).length, credits: S.pays.filter((x) => x.tg_id === a.p_tg && String(x.payload).startsWith('retry:')).length };
    case 'iq_norm': return S.norms[S.norms.length - 1];
    case 'iq_finish_session': { const s = S.sessions[a.p_id]; if (!s || s.finished_at) return false; Object.assign(s, { finished_at: new Date().toISOString(), raw: a.p_raw, by_section: a.p_by, iq: a.p_iq, ci_lo: a.p_lo, ci_hi: a.p_hi, answers: a.p_answers, flags: a.p_flags, norm_version: a.p_norm }); return true; }
    case 'iq_record_payment': if (!S.pays.find((p) => p.charge_id === a.p_charge)) S.pays.push({ charge_id: a.p_charge, tg_id: a.p_tg, stars: a.p_stars, payload: a.p_payload }); return null;
    case 'iq_paid': return S.pays.some((p) => p.tg_id === a.p_tg && p.payload === 'detail:' + a.p_sid);
    default: throw new Error('memdb: ' + fn);
  }
}
module.exports = { call, S };
