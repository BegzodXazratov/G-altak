import { app, header, bindBack, show, back, home, me, rpc, toast, haptic, tg, botUsername, esc, load, save } from "./core.js";
import { initBoard, legalMoves, applyMove, bestMove, countPieces } from "./shashka-engine.js";

const DEPTH = { oson: 1, orta: 3, qiyin: 6 };
const QUIET_DRAW = 30; // 30 yarim yurish faqat damkalar bilan, urishsiz — durang

// ---------------- menyu ----------------
export function shashkaMenu() {
  let level = load("shashka-level") || "orta";
  let color = load("shashka-color") || "w";
  return {
    render() {
      app().innerHTML = header("Shashka") + `
        <div class="stack">
          <div class="card stack">
            <h3 style="font-size:17px">🤖 Kompyuterga qarshi</h3>
            <div><label class="lbl">Qiyinlik</label>
              <div class="seg">${[["oson", "Oson"], ["orta", "O'rta"], ["qiyin", "Qiyin"]].map(([k, l]) =>
                `<button data-level="${k}" aria-pressed="${level === k}">${l}</button>`).join("")}</div></div>
            <div><label class="lbl">Sizning rangingiz</label>
              <div class="seg">${[["w", "⚪ Oq (birinchi)"], ["b", "⚫ Qora"]].map(([k, l]) =>
                `<button data-color="${k}" aria-pressed="${color === k}">${l}</button>`).join("")}</div></div>
            <button class="btn green" data-act="ai">Boshlash</button>
          </div>
          <div class="card stack">
            <h3 style="font-size:17px">👥 Do'st bilan</h3>
            <button class="btn" data-act="online">🔗 Do'stni havola bilan chaqirish</button>
            <div class="row"><input class="inp" id="code" placeholder="Xona kodi" maxlength="6" autocapitalize="characters" style="text-transform:uppercase">
              <button class="btn alt" data-act="join" style="flex:0 0 auto;width:auto">Qo'shilish</button></div>
            <button class="btn alt" data-act="local">📱 Bitta telefonda ikki kishi</button>
          </div>
          <p class="small muted" style="margin:4px 2px">Qoidalar: urish majburiy, oddiy dona orqaga ham uradi, damka uzoqqa yuradi.</p>
        </div>`;
      bindBack();
      const root = app();
      root.querySelectorAll("[data-level]").forEach(b => b.onclick = () => { level = b.dataset.level; save("shashka-level", level); this.render(); });
      root.querySelectorAll("[data-color]").forEach(b => b.onclick = () => { color = b.dataset.color; save("shashka-color", color); this.render(); });
      root.querySelector('[data-act="ai"]').onclick = () => show(gameScreen({ mode: "ai", human: color === "w" ? 1 : -1, depth: DEPTH[level] }));
      root.querySelector('[data-act="local"]').onclick = () => show(gameScreen({ mode: "local" }));
      root.querySelector('[data-act="online"]').onclick = createRoom;
      root.querySelector('[data-act="join"]').onclick = () => {
        const code = root.querySelector("#code").value.trim().toUpperCase();
        if (code.length < 4) return toast("Xona kodini kiriting");
        joinRoom(code);
      };
    },
  };
}

// ---------------- onlayn xona ----------------
const stateOf = g => ({ board: g.board, turn: g.side === 1 ? "w" : "b", last: g.last, quiet: g.quiet, winner: g.winner });

async function createRoom() {
  const u = me();
  let room;
  try {
    room = await rpc("g_room_create", { p_game: "shashka", p_player: u.id, p_name: u.name,
      p_state: { board: initBoard(), turn: "w", last: null, quiet: 0, winner: null } });
  } catch (e) { return toast("Internet bilan muammo. Qayta urinib ko'ring."); }
  show(waitingScreen(room));
}

function waitingScreen(room) {
  let timer;
  return {
    async render() {
      const bot = await botUsername();
      const link = bot ? `https://t.me/${bot}?start=r_${room.id}` : "";
      app().innerHTML = header("Do'stni kutyapmiz") + `
        <div class="card stack" style="text-align:center">
          <p class="muted" style="margin:0">Xona kodi</p>
          <div class="code">${room.id}</div>
          <p class="small muted" style="margin:0">Do'stingiz havolani ochsa yoki kodni kiritsa — o'yin boshlanadi. Siz oq donalar bilan o'ynaysiz.</p>
          <button class="btn" data-share>📨 Do'stga yuborish</button>
          <button class="btn alt" data-copy>Kodni nusxalash</button>
        </div>`;
      bindBack();
      app().querySelector("[data-share]").onclick = () => {
        const text = `Shashka o'ynaymizmi? ⚫⚪ Xona kodi: ${room.id}`;
        if (link && tg?.openTelegramLink) tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
        else if (navigator.share) navigator.share({ text: text + (link ? "\n" + link : "") }).catch(() => {});
        else copy(room.id);
      };
      app().querySelector("[data-copy]").onclick = () => copy(room.id);
      timer = setInterval(async () => {
        try {
          const r = await rpc("g_room_get", { p_id: room.id });
          if (r.status === "playing") {
            clearInterval(timer);
            haptic("ok");
            show(gameScreen({ mode: "online", room: r, mySide: 1 }), false);
          }
        } catch (e) {}
      }, 1500);
    },
    leave() { clearInterval(timer); },
  };
}

function copy(t) {
  navigator.clipboard?.writeText(t).then(() => toast("Nusxalandi: " + t), () => toast("Kod: " + t));
}

export async function joinRoom(code) {
  const u = me();
  let r;
  try { r = await rpc("g_room_join", { p_id: code, p_player: u.id, p_name: u.name }); }
  catch (e) { return toast("Internet bilan muammo. Qayta urinib ko'ring."); }
  if (r.error === "not_found") return toast("Bunday xona topilmadi");
  if (r.error === "full") return toast("Bu xonada allaqachon ikki kishi o'ynayapti");
  if (r.p1 === u.id && r.status === "waiting") return show(waitingScreen(r));
  show(gameScreen({ mode: "online", room: r, mySide: r.p1 === u.id ? 1 : -1 }));
}

// ---------------- o'yin ekrani ----------------
function gameScreen(opt) {
  const g = { board: initBoard(), side: 1, last: null, quiet: 0, winner: null, sel: null, thinking: false };
  let room = opt.room || null, poll = null, sending = false;
  if (room?.state?.board) adopt(room.state);

  const flip = (opt.mode === "ai" && opt.human === -1) || (opt.mode === "online" && opt.mySide === -1);
  const names = () => {
    if (opt.mode === "ai") return opt.human === 1 ? ["Siz", "Kompyuter"] : ["Kompyuter", "Siz"];
    if (opt.mode === "local") return ["Oq", "Qora"];
    return [room.p1_name || "O'yinchi 1", room.p2_name || "O'yinchi 2"];
  };
  const mine = () => opt.mode === "local" || (opt.mode === "ai" ? g.side === opt.human && !g.thinking : g.side === opt.mySide && room.status === "playing");

  function adopt(s) {
    g.board = s.board; g.side = s.turn === "w" ? 1 : -1; g.last = s.last; g.quiet = s.quiet || 0; g.winner = s.winner || null; g.sel = null;
  }

  function finishCheck() {
    if (g.quiet >= QUIET_DRAW) g.winner = "draw";
    else if (!legalMoves(g.board, g.side).length) g.winner = g.side === 1 ? "b" : "w";
  }

  function play(m) {
    const moved = g.board[m.path[0]];
    g.board = applyMove(g.board, m);
    g.last = m.path;
    g.quiet = m.caps.length || Math.abs(moved) === 1 ? 0 : g.quiet + 1;
    g.side = -g.side; g.sel = null;
    haptic(m.caps.length ? "medium" : "light");
    finishCheck();
  }

  async function sendOnline() {
    sending = true;
    try {
      const r = await rpc("g_room_move", { p_id: room.id, p_player: me().id, p_version: room.version,
        p_state: stateOf(g), p_status: g.winner ? "done" : "playing" });
      if (r.error === "stale") { room = r; adopt(r.state); toast("O'yin yangilandi"); }
      else if (r.error) toast("Yurish yuborilmadi: " + r.error);
      else room = r;
    } catch (e) { toast("Internet bilan muammo — yurish yuborilmadi"); }
    sending = false;
    render();
  }

  function aiTurn() {
    if (opt.mode !== "ai" || g.winner || g.side === opt.human) return;
    g.thinking = true; render();
    setTimeout(() => {
      const m = bestMove(g.board, g.side, opt.depth);
      g.thinking = false;
      if (m) play(m); else finishCheck();
      render();
    }, 350);
  }

  function tap(i) {
    if (g.winner || !mine() || sending) return;
    const moves = legalMoves(g.board, g.side);
    if (g.sel !== null) {
      const m = moves.find(x => x.path[0] === g.sel && x.path[x.path.length - 1] === i);
      if (m) {
        play(m); render();
        if (opt.mode === "online") sendOnline(); else aiTurn();
        return;
      }
    }
    if (g.board[i] * g.side > 0 && moves.some(x => x.path[0] === i)) { g.sel = i; haptic("light"); }
    else if (g.board[i] * g.side > 0 && moves[0]?.caps.length) toast("Urish majburiy — belgilangan donani yuring");
    else g.sel = null;
    render();
  }

  function render() {
    const moves = g.winner ? [] : legalMoves(g.board, g.side);
    const must = moves.length && moves[0].caps.length ? new Set(moves.map(m => m.path[0])) : new Set();
    const targets = new Set(g.sel === null ? [] : moves.filter(m => m.path[0] === g.sel).map(m => m.path[m.path.length - 1]));
    const lastSet = new Set(g.last || []);
    const [nW, nB] = names();
    const cnt = countPieces(g.board);
    let cells = "";
    for (let k = 0; k < 64; k++) {
      const i = flip ? 63 - k : k;
      const r = (i / 8) | 0, c = i % 8, dark = (r + c) % 2 === 1, p = g.board[i];
      const cls = ["sq", dark ? "d" : "l", lastSet.has(i) ? "last" : "", targets.has(i) ? "target" : ""].join(" ");
      const pc = p ? `<div class="pc ${p > 0 ? "w" : "b"} ${g.sel === i ? "sel" : ""} ${must.has(i) && mine() ? "must" : ""}">${Math.abs(p) === 2 ? "♛" : ""}</div>` : "";
      cells += `<div class="${cls}" data-i="${i}">${pc}</div>`;
    }
    const topIsWhite = flip;
    const pl = (white) => `<div class="player ${(g.side === 1) === white && !g.winner ? "on" : ""}">
        <span class="dot" style="background:${white ? "#efe6d6;border:1px solid #bbb" : "#1a1612"}"></span>
        ${esc(white ? nW : nB)} · ${white ? cnt.w : cnt.b} ta ${(g.side === 1) === white && !g.winner ? (g.thinking ? "· o'ylayapti…" : "· navbat") : ""}</div>`;
    let status = "";
    if (opt.mode === "online") status = room.status === "waiting" ? "Do'st kutilmoqda" : (g.side === opt.mySide ? "Sizning navbatingiz" : "Raqib o'ylayapti…");
    else if (opt.mode === "ai") status = g.side === opt.human ? "Sizning navbatingiz" : "Kompyuter o'ylayapti…";
    else status = (g.side === 1 ? "Oq" : "Qora") + " yuradi";

    app().innerHTML = header("Shashka") + `
      <div class="status"><span class="who">${g.winner ? "O'yin tugadi" : status}</span>
        ${opt.mode === "online" ? `<span class="pill">Xona ${room.id}</span>` : `<button class="pill" data-restart>↻ Qaytadan</button>`}</div>
      ${pl(topIsWhite)}
      <div class="board">${cells}</div>
      ${pl(!topIsWhite)}
      ${g.winner ? endOverlay() : ""}`;
    bindBack();
    app().querySelectorAll("[data-i]").forEach(el => el.onclick = () => tap(+el.dataset.i));
    const rs = app().querySelector("[data-restart]");
    if (rs) rs.onclick = restart;
    app().querySelectorAll("[data-end]").forEach(b => b.onclick = () => b.dataset.end === "again" ? restart() : home());
  }

  function endOverlay() {
    let title, sub = "";
    if (g.winner === "draw") title = "Durang 🤝";
    else {
      const wSide = g.winner === "w" ? 1 : -1;
      const meSide = opt.mode === "ai" ? opt.human : opt.mode === "online" ? opt.mySide : null;
      if (meSide === null) title = (wSide === 1 ? "Oq" : "Qora") + " yutdi! 🏆";
      else if (meSide === wSide) { title = "Siz yutdingiz! 🏆"; haptic("ok"); }
      else { title = "Bu safar yutqazdingiz"; sub = "Yana bir bor urinib ko'ring!"; }
    }
    return `<div class="overlay"><div class="card stack"><h2>${title}</h2>${sub ? `<p class="muted" style="margin:0">${sub}</p>` : ""}
      ${opt.mode !== "online" ? `<button class="btn green" data-end="again">Yana o'ynash</button>` : ""}
      <button class="btn alt" data-end="menu">Menyuga</button></div></div>`;
  }

  function restart() {
    if (opt.mode === "online") return;
    Object.assign(g, { board: initBoard(), side: 1, last: null, quiet: 0, winner: null, sel: null, thinking: false });
    render(); aiTurn();
  }

  return {
    render() {
      render();
      aiTurn();
      if (opt.mode === "online" && !poll) {
        poll = setInterval(async () => {
          if (sending) return;
          try {
            const r = await rpc("g_room_get", { p_id: room.id });
            if (!r.error && r.version > room.version) {
              room = r; adopt(r.state); haptic("light"); render();
            }
          } catch (e) {}
        }, 1200);
      }
    },
    leave() { clearInterval(poll); poll = null; },
  };
}
