// Admin panel ma'lumotlari: parol (ADMIN_PASSWORD) bilan
import crypto from "node:crypto";
import { rpc } from "./_lib.js";

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
    res.status(200).json(await rpc("g_admin_players", {}));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server" });
  }
}
