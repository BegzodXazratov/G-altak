// Barcha yozish amallari shu yerdan: Telegram imzosi tekshiriladi, keyin Supabase'ga server kaliti bilan boriladi.
import { verifyInitData, rpc, fullName } from "./_lib.js";
import { isWord, pathWord } from "./_soz.js";

const GAMES = ["shashka", "soz"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const b = req.body || {};
  const user = verifyInitData(b.initData, process.env.BOT_TOKEN);
  if (!user) return res.status(401).json({ error: "auth" });
  const id = String(user.id);
  const name = (b.name || "").trim() || fullName(user);
  try {
    let out;
    switch (b.action) {
      case "me":
        out = await rpc("g_profile", { p_id: id }, false);
        if (!out) out = { id, name: fullName(user), has_phone: false, stats: {}, isNew: true };
        break;
      case "register": {
        // telefon: requestContact natijasi (contact.user_id foydalanuvchiniki bo'lishi shart)
        const c = b.contact || {};
        const phone = c.phone_number && String(c.user_id) === id ? String(c.phone_number) : null;
        out = await rpc("g_player_upsert", { p_id: id, p_name: name, p_username: user.username || null, p_phone: phone });
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
    res.status(200).json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server" });
  }
}
