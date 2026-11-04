'use strict';
// Supabase RPC (yopiq funksiyalar, IQ_API_SECRET bilan himoyalangan). Lokal sinov uchun IQ_DEV=1 da xotira ishlatiladi.
const SB_URL = process.env.SUPABASE_URL || 'https://ljilvblrbdhdizvgqtyc.supabase.co';
const SB_KEY = process.env.SUPABASE_KEY || 'sb_publishable_dtWXod3KZbYtDS2U5_z8fQ_dMBma7IV';

async function rpc(fn, args) {
  if (process.env.IQ_DEV === '1') return require('./memdb.cjs').call(fn, args);
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    body: JSON.stringify(Object.assign({ p_secret: process.env.IQ_API_SECRET }, args)),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`rpc ${fn}: ${r.status} ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
}
module.exports = { rpc };
