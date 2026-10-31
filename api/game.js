// Barcha yozish amallari shu yerdan: Telegram imzosi tekshiriladi, keyin Supabase'ga server kaliti bilan boriladi.
import { verifyInitData, rpc, fullName } from "./_lib.js";
import { isWord, pathWord } from "./_soz.js";
import { checkSolution } from "../js/gugurt-engine.js";

const GAMES = ["shashka", "soz", "gugurt"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const b = req.body || {};
  const user = verifyInitData(b.initData, process.env.BOT_TOKEN);
  if (!user) return res.status(401).json({ error: "auth" });
  const id = String(user.id);
  try {
    // xonalarda faqat o'yinchi o'zi kiritgan ism ishlatiladi
    let name = "";
    if (["create", "match", "join", "rematch"].includes(b.action)) {
      const prof = await rpc("g_profile", { p_id: id }, false);
      if (!prof || prof.needs_name) return res.status(200).json({ error: "need_name" });
      name = prof.name;
    }
    let out;
    switch (b.action) {
      case "me":
        out = await rpc("g_profile", { p_id: id }, false);
        if (!out) out = { id, name: "", needs_name: true, has_phone: false, stats: {}, isNew: true };
        break;
      case "register": {
        const nm = String(b.name || "").replace(/\s+/g, " ").trim().slice(0, 24);
        if (nm.length < 2 || nm.toLowerCase() === "o'yinchi" || !/\p{L}/u.test(nm)) return res.status(200).json({ error: "bad_name" });
        // telefon faqat bot chatidagi "Raqamni yuborish" tugmasi orqali keladi (api/bot.js)
        out = await rpc("g_player_upsert", { p_id: id, p_name: nm, p_username: user.username || null, p_phone: null });
        break;
      }
      case "ping":
        out = await rpc("g_ping", { p_id: id });
        break;
      case "online":
        out = await rpc("g_online", { p_id: id });
        break;
      case "invite": {
        if (!GAMES.includes(b.game)) return res.status(400).json({ error: "game" });
        out = await rpc("g_invite", { p_from: id, p_to_h: String(b.h || ""), p_game: b.game, p_room: String(b.room || "") });
        if (out?.ok) {
          const GN = { shashka: "Shashka", soz: "Topqir", gugurt: "Gugurt" };
          const url = `https://${req.headers.host}/?room=${encodeURIComponent(b.room)}`;
          await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: out.to_id, text: `🎮 ${out.from_name} sizni ${GN[b.game]} o'yiniga chaqirmoqda!${b.game !== "shashka" && b.seconds ? ` (${Math.round(b.seconds / 60)} daqiqa)` : ""}`,
              reply_markup: { inline_keyboard: [[{ text: "▶️ Qabul qilish", web_app: { url } }]] } }),
          }).catch(() => {});
          out = { ok: true };
        }
        break;
      }
      case "cancel":
        out = await rpc("g_room_cancel", { p_id: String(b.id || ""), p_player: id });
        break;
      case "answer":
        out = await rpc("g_invite_answer", { p_id: id, p_invite: Number(b.invite) || 0, p_accept: !!b.accept });
        break;
      case "askphone":
        await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: user.id, text: "📱 Ro'yxatdan o'tishni tugatish uchun pastdagi tugmani bosing — raqamingiz bot orqali xavfsiz yuboriladi.",
            reply_markup: { keyboard: [[{ text: "📱 Raqamni yuborish", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true } }),
        });
        out = { ok: true };
        break;
      case "gsolve": {
        const room = await rpc("g_room_get", { p_id: String(b.id || "") }, false);
        if (!room || room.error || room.game !== "gugurt") return res.status(200).json({ error: "not_found" });
        const idx = Number(b.idx), start = room.state?.puzzles?.[idx % (room.state?.puzzles?.length || 1)];
        if (!Number.isInteger(idx) || !start || !checkSolution(start, b.answer)) return res.status(200).json({ error: "wrong" });
        out = await rpc("g_gug_solve", { p_id: room.id, p_player: id, p_idx: idx });
        break;
      }
      case "create":
        if (!GAMES.includes(b.game)) return res.status(400).json({ error: "game" });
        out = await rpc("g_room_create", { p_game: b.game, p_player: id, p_name: name, p_state: b.state || {}, p_public: false });
        break;
      case "match":
        if (!GAMES.includes(b.game)) return res.status(400).json({ error: "game" });
        out = await rpc("g_room_match", { p_game: b.game, p_player: id, p_name: name, p_state: b.state || {} });
        break;
      case "join":
        out = await rpc("g_room_join", { p_id: String(b.id || ""), p_player: id, p_name: name });
        break;
      case "move":
        out = await rpc("g_room_move", { p_id: b.id, p_player: id, p_version: b.version, p_state: b.state });
        break;
      case "resign":
        out = await rpc("g_room_resign", { p_id: b.id, p_player: id });
        break;
      case "claim": {
        const room = await rpc("g_room_get", { p_id: String(b.id || "") }, false);
        if (!room || room.error || room.game !== "soz") return res.status(200).json({ error: "not_found" });
        const word = pathWord(room.state?.grid || [], b.path);
        if (!word || !isWord(word)) return res.status(200).json({ error: "no_word" });
        out = await rpc("g_soz_claim", { p_id: room.id, p_player: id, p_word: word });
        break;
      }
      case "finish":
        out = await rpc("g_soz_finish", { p_id: b.id });
        break;
      case "rematch":
        out = await rpc("g_room_rematch", { p_id: b.id, p_player: id, p_name: name, p_state: b.state || {} });
        break;
      case "aiwin":
        if (!GAMES.includes(b.game)) return res.status(400).json({ error: "game" });
        await rpc("g_ai_win", { p_id: id, p_game: b.game });
        out = { ok: true };
        break;
      default:
        return res.status(400).json({ error: "action" });
    }
    // yangi mijoz (v2) ochgan xonada ID yashiriladi; eski mijoz qatnashsa — xona eski ko'rinishda qoladi
    if (["create", "match", "join", "rematch"].includes(b.action) && out?.id) {
      out = await rpc("g_room_mode", { p_id: out.id, p_player: id, p_legacy: b.v !== 2 });
    }
    res.status(200).json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server" });
  }
}
