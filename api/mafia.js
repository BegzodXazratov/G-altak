// Mafia xonalari: barcha mantiq serverda (js/mafia-engine.js). Mijoz faqat o'ziga ruxsat etilgan ko'rinishni oladi.
import { verifyInitData, rpc } from "./_lib.js";
import { APP_VERSION } from "../js/version.js";
import { MIN_P, MAX_P, BOT_NAMES, newLobby, start, tick, act, chat, leave, view } from "../js/mafia-engine.js";

const code = () => Array.from({ length: 5 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[(Math.random() * 32) | 0]).join("");
const ERR = { exists: "Xona topilmadi", full: "Xona to'la (12 kishi)", started: "O'yin allaqachon boshlangan", not_host: "Faqat xona egasi qila oladi",
  few: `Kamida ${MIN_P} kishi kerak`, not_in: "Siz bu xonada emassiz", bad_audio: "Ovoz yozilmadi — qayta urinib ko'ring" };

async function load(id) {
  const r = await rpc("g_mafia_get", { p_id: String(id || "") });
  return r && r.state ? r : null;
}

// holatni o'qib → o'zgartirib → versiya bilan yozadi (to'qnashuvda qayta urinadi)
async function mutate(id, fn, readonly = false) {
  for (let k = 0; k < 4; k++) {
    const r = await load(id);
    if (!r) return { error: "exists" };
    const s = r.state, now = Date.now(), was = s.phase;
    const res = fn(s, now);
    if (res && res.error) return res;
    const moved = tick(s, now);
    if (readonly && !moved) return { s, id: r.id }; // o'zgarish yo'q — bazaga yozmaymiz
    const status = s.phase === "lobby" ? "lobby" : s.phase === "end" ? "end" : "playing";
    const w = await rpc("g_mafia_put", { p_id: r.id, p_version: r.version, p_status: status, p_state: s });
    if (w?.ok) {
      // o'yin tugadi yoki xona qayta lobbiga qaytdi — shu xonaning ovozli xabarlari serverdan o'chiriladi
      if (was !== s.phase && (s.phase === "end" || (was === "end" && s.phase === "lobby")))
        await rpc("g_mafia_voice_clear", { p_room: r.id }).catch(() => {});
      // tugagan o'yin tarixga yoziladi (admin paneldagi Mafia statistikasi uchun)
      if (was !== "end" && s.phase === "end" && s.winner)
        await rpc("g_mafia_game_save", { p_room: r.id, p_winner: s.winner, p_rounds: s.round || 0, p_started: Number(s.startedAt) || 0,
          p_players: s.players.map(p => ({ id: p.bot ? "" : p.id, name: p.name, role: p.role, alive: !!p.alive, bot: !!p.bot, left: !!p.left })) }).catch(e => console.error("mafia save", e.message));
      return { s, id: r.id };
    }
  }
  return { error: "busy" };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const b = req.body || {};
  const user = verifyInitData(b.initData, process.env.BOT_TOKEN);
  if (!user) return res.status(401).json({ error: "auth" });
  if (b.ver !== APP_VERSION) return res.status(200).json({ update: true });
  const uid = String(user.id);
  const send = (out) => res.status(200).json(out);
  const fail = (e) => send({ error: e, msg: ERR[e] || "Xatolik" });
  const out = (r) => r.error ? fail(r.error) : send({ id: r.id, ...view(r.s, uid) });
  try {
    let prof = null;
    if (["create", "join"].includes(b.action)) {
      prof = await rpc("g_profile", { p_id: uid }, false);
      if (!prof || prof.needs_name) return send({ error: "need_name" });
    }
    const me = () => ({ id: uid, name: prof.name, av: prof.avatar || "" });
    switch (b.action) {
      case "open":
        return send({ rooms: await rpc("g_mafia_open", {}) });
      case "create": {
        for (let k = 0; k < 5; k++) {
          const id = code();
          const c = await rpc("g_mafia_create", { p_id: id, p_public: b.public !== false, p_state: newLobby(me(), Date.now()) });
          if (c?.ok) return out({ id, s: (await load(id)).state });
        }
        return fail("busy");
      }
      case "join":
        return out(await mutate(b.id, (s) => {
          const i = s.players.findIndex(p => p.id === uid);
          if (i >= 0) { s.players[i].left = false; return; }
          if (s.phase !== "lobby") return { error: "started" };
          if (s.players.length >= MAX_P) return { error: "full" };
          s.players.push({ ...me(), alive: true, role: null });
          if (!s.host) s.host = uid;
        }));
      case "bot": // xona egasi bo'sh joyni bot bilan to'ldiradi (sinov uchun ham qulay)
        return out(await mutate(b.id, (s) => {
          if (s.host !== uid) return { error: "not_host" };
          if (s.phase !== "lobby") return { error: "started" };
          if (b.remove) { const j = s.players.map((p, i) => p.bot ? i : -1).filter(i => i >= 0).pop(); if (j !== undefined) s.players.splice(j, 1); return; }
          if (s.players.length >= MAX_P) return { error: "full" };
          const used = new Set(s.players.map(p => p.name));
          const name = BOT_NAMES.find(n => !used.has(n + " 🤖")) || "Bot";
          s.players.push({ id: "bot:" + code(), name: name + " 🤖", av: "🤖", bot: true, alive: true, role: null });
        }));
      case "start":
        return out(await mutate(b.id, (s, now) => {
          if (s.host !== uid) return { error: "not_host" };
          if (s.phase !== "lobby") return { error: "started" };
          if (s.players.length < MIN_P) return { error: "few" };
          start(s, now);
        }));
      case "again": // o'yin tugagach — o'sha xonada yangi o'yin (lobbyga qaytish)
        return out(await mutate(b.id, (s, now) => {
          if (s.host !== uid) return { error: "not_host" };
          if (s.phase !== "end") return;
          s.players = s.players.filter(p => !p.left).map(p => ({ ...p, alive: true, role: null }));
          Object.assign(s, { phase: "lobby", round: 0, deadline: 0, night: {}, votes: {}, ready: [], lastHeal: -1, winner: null, log: [], chat: [], at: now });
        }));
      case "state":
        return out(await mutate(b.id, (s) => { if (!s.players.some(p => p.id === uid)) return { error: "not_in" }; }, true));
      case "act":
        return out(await mutate(b.id, (s, now) => {
          const i = s.players.findIndex(p => p.id === uid);
          if (i < 0) return { error: "not_in" };
          const e = act(s, i, String(b.kind || ""), b.target, now);
          if (e) return { error: e };
        }));
      case "chat":
        return out(await mutate(b.id, (s, now) => {
          const i = s.players.findIndex(p => p.id === uid);
          if (i < 0) return { error: "not_in" };
          const e = chat(s, i, b.text, now);
          if (e) return { error: e };
        }));
      case "voice_send": { // ovozli xabar: avval yozishga ruxsat bormi tekshiramiz, keyin faylni saqlaymiz
        const data = String(b.data || ""), mime = String(b.mime || "");
        if (!/^audio\//.test(mime) || !data || data.length > 560000 || !/^[A-Za-z0-9+/=]+$/.test(data)) return fail("bad_audio");
        const r0 = await load(b.id); if (!r0) return fail("exists");
        const i0 = r0.state.players.findIndex(p => p.id === uid); if (i0 < 0) return fail("not_in");
        const dry = structuredClone(r0.state), e0 = chat(dry, i0, "", Date.now(), { vid: 0, dur: 1 });
        if (e0) return fail(e0);
        const vid = await rpc("g_mafia_voice_put", { p_room: r0.id, p_data: data, p_mime: mime });
        return out(await mutate(b.id, (s, now) => {
          const i = s.players.findIndex(p => p.id === uid);
          const e = chat(s, i, "", now, { vid: Number(vid), dur: Number(b.dur) || 1 });
          if (e) return { error: e };
        }));
      }
      case "voice_get": { // faqat o'sha xabarni ko'rishga haqqi borlar eshita oladi (mafia ovozlari — faqat mafiaga)
        const r0 = await load(b.id); if (!r0) return fail("exists");
        const vid = Number(b.vid);
        if (!view(r0.state, uid).chat.some(c => c.voice === vid)) return fail("no");
        const a = await rpc("g_mafia_voice_get", { p_id: vid });
        return a ? send({ data: a.data, mime: a.mime }) : fail("exists");
      }
      case "leave":
        await mutate(b.id, (s, now) => { const i = s.players.findIndex(p => p.id === uid); if (i >= 0) leave(s, i, now); });
        return send({ ok: true });
      default:
        return res.status(400).json({ error: "action" });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server" });
  }
}
