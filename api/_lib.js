import crypto from "node:crypto";

const SB_URL = "https://ljilvblrbdhdizvgqtyc.supabase.co";
const SB_KEY = "sb_publishable_dtWXod3KZbYtDS2U5_z8fQ_dMBma7IV";

// Telegram initData imzosini tekshiradi → foydalanuvchi (yoki null)
export function verifyInitData(initData, botToken, maxAgeSec = 7 * 24 * 3600) {
  if (!initData || !botToken) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const dcs = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calc = crypto.createHmac("sha256", secret).update(dcs).digest("hex");
  if (calc.length !== hash.length || !crypto.timingSafeEqual(Buffer.from(calc), Buffer.from(hash))) return null;
  const authDate = Number(params.get("auth_date") || 0);
  if (maxAgeSec && Date.now() / 1000 - authDate > maxAgeSec) return null;
  try { return JSON.parse(params.get("user") || "null"); } catch (e) { return null; }
}

export async function rpc(fn, args, withKey = true) {
  const body = withKey ? { p_key: process.env.G_SERVER_KEY, ...args } : args;
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${fn}: ${r.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

export const fullName = u => [u?.first_name, u?.last_name].filter(Boolean).join(" ").slice(0, 40) || "O'yinchi";
