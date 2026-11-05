// Barcha yozish amallari shu yerdan: Telegram imzosi tekshiriladi, keyin Supabase'ga server kaliti bilan boriladi.
import { verifyInitData, rpc, fullName, noteReach } from "./_lib.js";
import { isWord, pathWord } from "./_soz.js";
import { checkSolution } from "../js/gugurt-engine.js";
import { makeShch, makeKim } from "./_shch.js";
import { initArch, applyShot } from "../js/arch-engine.js";
import { initState as chessInit, findMove, applyMove as chessApply } from "../js/chess-engine.js";
import { APP_VERSION } from "../js/version.js";

const GAMES = ["shashka", "soz", "gugurt", "kim", "shch", "chess", "arch", "ww4"];
// yangi o'yinlarda boshlang'ich holatni server o'zi yaratadi (mijoz maxfiy ma'lumot yoki maqsadlarni o'zgartira olmaydi)
const initState = b => b.game === "arch" ? initArch() : b.game === "chess" ? chessInit() : b.game === "kim" ? makeKim() : b.game === "shch" ? makeShch(b.count) : (b.state || {});

export const AVATARS = ["😎", "🦁", "🐯", "🦊", "🐼", "🐸", "🦄", "🐲", "🦅", "🐺", "🤖", "👽", "🥷", "🧙", "👑", "🔥", "⚡", "🚀", "🎯", "🏆", "🦉", "🐻", "🐧", "🦈"];

// Bot orqali qisqa xabar (ilovani ochadigan tugma bilan)
async function tell(host, chat_id, text, btn = "▶️ Ochish") {
  const r = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id, text, reply_markup: { inline_keyboard: [[{ text: btn, web_app: { url: `https://${host}/` } }]] } }),
  }).then(x => x.json()).catch(() => null);
  if (r) await noteReach(chat_id, r);
}

// Botdagi taklif xabaridan "Qabul qilish" tugmasini olib tashlaymiz
async function closeInvites(room, status, text) {
  try {
    const rows = await rpc("g_invite_close", { p_room: String(room || ""), p_status: status });
    await Promise.all((rows || []).map(r => fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/editMessageText`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: r.to_id, message_id: r.msg, text: `${text}${r.from_name ? ` — ${r.from_name}` : ""}`, reply_markup: { inline_keyboard: [] } }),
    }).catch(() => {})));
  } catch (e) { console.error("closeInvites", e.message); }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const b = req.body || {};
  const user = verifyInitData(b.initData, process.env.BOT_TOKEN);
  if (!user) return res.status(401).json({ error: "auth" });
  const id = String(user.id);
  // eski versiya: yangi mijozga "yangilandi" signali; versiyasiz (juda eski) mijoz — ishlamaydi, qayta ochishi kerak
  if (!b.ver) return res.status(426).json({ error: "update" });
  if (b.ver !== APP_VERSION) return res.status(200).json({ update: true });
  try {
    // xonalarda faqat o'yinchi o'zi kiritgan ism ishlatiladi
    let name = "";
    if (["create", "match", "join", "rematch", "room_send"].includes(b.action)) {
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
        {
          const [pg, , rc] = await Promise.all([rpc("g_ping", { p_id: id }), rpc("g_set_act", { p_id: id, p_act: String(b.act || "") }).catch(() => {}),
            rpc("g_room_count", { p_id: id, p_after: Number(b.rl) || 0 }).catch(() => null)]);
          out = rc ? { ...pg, room_last: rc.last, room_n: rc.n } : pg;
        }
        break;
      case "online":
        out = await rpc("g_online", { p_id: id });
        break;
      case "invite": {
        if (!GAMES.includes(b.game)) return res.status(400).json({ error: "game" });
        out = await rpc("g_invite", { p_from: id, p_to_h: String(b.h || ""), p_game: b.game, p_room: String(b.room || "") });
        if (out?.ok) {
          const GN = { shashka: "Shashka", soz: "Topqir", gugurt: "Gugurt", kim: "Kim topadi?", shch: "SH-chyot", chess: "Shaxmat", arch: "Kamonchi", ww4: "World War 4" };
          const url = `https://${req.headers.host}/?room=${encodeURIComponent(b.room)}`;
          const sent = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: out.to_id, text: `🎮 ${out.from_name} sizni ${GN[b.game]} o'yiniga chaqirmoqda!${["soz", "gugurt"].includes(b.game) && b.seconds ? ` (${Math.round(b.seconds / 60)} daqiqa)` : ""}`,
              reply_markup: { inline_keyboard: [[{ text: "▶️ Qabul qilish", web_app: { url } }]] } }),
          }).then(r => r.json()).catch(() => null);
          if (sent) await noteReach(out.to_id, sent);
          if (sent?.result?.message_id && out.invite) await rpc("g_invite_msg", { p_invite: out.invite, p_msg: sent.result.message_id }).catch(() => {});
          out = { ok: true };
        }
        break;
      }
      case "profile_update": {
        const nm = String(b.name || "").replace(/\s+/g, " ").trim().slice(0, 24);
        if (nm.length < 2 || nm.toLowerCase() === "o'yinchi" || !/\p{L}/u.test(nm)) return res.status(200).json({ error: "bad_name" });
        const av = AVATARS.includes(b.avatar) ? b.avatar : "";
        out = await rpc("g_profile_update", { p_id: id, p_name: nm, p_avatar: av });
        break;
      }
      case "room_get": // ommaviy "O'yin chati": oxirgi xabarlar
        out = await rpc("g_room_get", { p_id: id });
        break;
      case "room_send":
        out = await rpc("g_room_send", { p_id: id, p_body: String(b.text || ""), p_reply: Number(b.reply) || null });
        break;
      case "chat_list":
        out = await rpc("g_chat_list", { p_id: id });
        break;
      case "friends":
        out = await rpc("g_friends_list", { p_id: id });
        break;
      case "friend_add":
        out = await rpc("g_friend_request", { p_from: id, p_to_h: String(b.h || "") });
        if (out?.ok && out.to_id && !out.sent) {
          await tell(req.headers.host, out.to_id, out.accepted ? `🤝 ${out.from_name} siz bilan do'st bo'ldi!` : `👋 ${out.from_name} sizga do'stlik so'rovi yubordi`, out.accepted ? "▶️ O'ynash" : "Ko'rish");
          delete out.to_id;
        }
        break;
      case "friend_answer":
        out = await rpc("g_friend_answer", { p_id: id, p_h: String(b.h || ""), p_accept: !!b.accept });
        if (out?.ok && b.accept) await tell(req.headers.host, out.to_id, `🤝 ${out.name} do'stlik so'rovingizni qabul qildi!`, "▶️ O'ynash");
        if (out?.ok) out = { ok: true };
        break;
      case "friend_remove":
        out = await rpc("g_friend_remove", { p_id: id, p_h: String(b.h || "") });
        break;
      case "block":
        out = await rpc("g_block", { p_id: id, p_h: String(b.h || "") });
        break;
      case "unblock":
        out = await rpc("g_unblock", { p_id: id, p_h: String(b.h || "") });
        break;
      case "chat_get":
        out = await rpc("g_chat_get", { p_id: id, p_h: String(b.h || ""), p_after: Number(b.after) || 0 });
        break;
      case "chat_send":
        out = await rpc("g_chat_send", { p_from: id, p_to_h: String(b.h || ""), p_body: String(b.text || "") });
        if (out?.notify) { await tell(req.headers.host, out.to_id, `💬 ${out.from_name} sizga xabar yozdi`, "Ochish"); }
        out = { ok: !!out?.ok, id: out?.id, error: out?.error };
        break;
      case "cancel":
        out = await rpc("g_room_cancel", { p_id: String(b.id || ""), p_player: id });
        await closeInvites(b.id, "", "⌛ Taklif bekor qilindi");
        break;
      case "answer":
        out = await rpc("g_invite_answer", { p_id: id, p_invite: Number(b.invite) || 0, p_accept: !!b.accept });
        if (out?.room && !b.accept) await closeInvites(out.room, "", "❌ Taklif rad etildi");
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
        out = await rpc("g_room_create", { p_game: b.game, p_player: id, p_name: name, p_state: initState(b), p_public: false });
        break;
      case "match":
        if (!GAMES.includes(b.game)) return res.status(400).json({ error: "game" });
        out = await rpc("g_room_match", { p_game: b.game, p_player: id, p_name: name, p_state: initState(b) });
        break;
      case "join":
        out = await rpc("g_room_join", { p_id: String(b.id || ""), p_player: id, p_name: name });
        if (out?.status === "playing") await closeInvites(b.id, "accepted", "✅ O'yin boshlandi");
        break;
      case "move": {
        const rm = await rpc("g_room_get", { p_id: String(b.id || "") }, false);
        if (!rm || rm.error || rm.game !== "shashka") return res.status(200).json({ error: "bad_game" });
        out = await rpc("g_room_move", { p_id: b.id, p_player: id, p_version: b.version, p_state: b.state });
        break;
      }
      case "ashot": {
        const rm = await rpc("g_room_get", { p_id: String(b.id || "") }, false);
        if (!rm || rm.error || rm.game !== "arch") return res.status(200).json({ error: "bad_game" });
        if (rm.version !== b.version) return res.status(200).json({ error: "stale", ...rm });
        if (rm.status !== "playing" || !rm.state?.hp || rm.state.winner) return res.status(200).json({ error: "not_playing" });
        const ang = Number(b.angle), pw = Number(b.power);
        if (!(ang >= -50 && ang <= 85 && pw >= 10 && pw <= 100)) return res.status(200).json({ error: "illegal" });
        out = await rpc("g_room_move", { p_id: rm.id, p_player: id, p_version: rm.version, p_state: applyShot(rm.state, rm.state.turn, ang, pw, Math.max(0, Math.min(120, Number(b.el) || 0))) });
        break;
      }
      case "cmove": {
        const rm = await rpc("g_room_get", { p_id: String(b.id || "") }, false);
        if (!rm || rm.error || rm.game !== "chess") return res.status(200).json({ error: "bad_game" });
        if (rm.version !== b.version) return res.status(200).json({ error: "stale", ...rm });
        if (rm.status !== "playing" || !rm.state?.board) return res.status(200).json({ error: "not_playing" });
        const m = findMove(rm.state, Number(b.from), Number(b.to), Number(b.promo) || 0);
        if (!m) return res.status(200).json({ error: "illegal" });
        out = await rpc("g_room_move", { p_id: rm.id, p_player: id, p_version: rm.version, p_state: chessApply(rm.state, m) });
        break;
      }
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
      case "rematch": {
        const old = ["kim", "shch", "chess", "arch"].includes(b.game) ? { ...b } : null;
        out = await rpc("g_room_rematch", { p_id: b.id, p_player: id, p_name: name, p_state: old ? initState(old) : (b.state || {}) });
        break;
      }
      case "kt_setup":
        out = await rpc("g_kt_setup", { p_id: String(b.id || ""), p_player: id, p_secret: String(b.secret || ""), p_pref: String(b.pref || "first") });
        break;
      case "kt_guess":
        out = await rpc("g_kt_guess", { p_id: String(b.id || ""), p_player: id, p_guess: String(b.guess || "") });
        break;
      case "shch_claim": {
        const path = Array.isArray(b.path) ? b.path.map(Number) : [];
        if (path.length < 2 || path.length > 14 || path.some(x => !Number.isInteger(x))) return res.status(200).json({ error: "bad_path" });
        out = await rpc("g_shch_claim", { p_id: String(b.id || ""), p_player: id, p_path: path });
        break;
      }
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
