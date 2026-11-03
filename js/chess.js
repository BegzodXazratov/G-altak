import { isMe, waitScreen, markJoining } from "./core.js";
import { app, header, bindBack, show, home, api, read, toast, haptic, esc, load, save, scoreCard, ratingLine, refreshProfile, nav } from "./core.js";
import { initState, legalMoves, applyMove, bestMove, inCheck, findMove, P, N, B, R, Q, K } from "./chess-engine.js";

const DEPTH = { oson: 1, orta: 2, qiyin: 3 };
const GL = { [P]: "♟︎", [N]: "♞︎", [B]: "♝︎", [R]: "♜︎", [Q]: "♛︎", [K]: "♚︎" };
const NAMES = { mat: "Shoh va mat", pat: "Pat — durang", 50: "50 yurishda piyoda yurmadi va urilmadi — durang", rep: "Pozitsiya 3 marta takrorlandi — durang", ins: "Mat qo'yishga dona yetmaydi — durang" };

export function chessMenu() {
  let level = load("chess-level") || "orta", color = load("chess-color") || "w", showAi = false;
  return {
    render() {
      app().innerHTML = header("Shaxmat") + `
        ${scoreCard()}
        <div class="stack">
          <button class="bigbtn b-fast" data-act="match"><span class="ic">⚡</span><span><b>Tezkor o'yin</b><small>Tasodifiy raqib · reytingga ta'sir qiladi</small></span></button>
          <button class="bigbtn b-friend" data-act="online"><span class="ic">🔗</span><span><b>Do'stni chaqirish</b><small>Havola yuboring — u bossa, o'yin boshlanadi</small></span></button>
          <button class="bigbtn b-ai" data-act="ai-toggle"><span class="ic">🤖</span><span><b>Kompyuter bilan</b><small>Mashq qilish uchun</small></span></button>
          ${showAi ? `<div class="card stack">
            <div class="seg">${[["oson", "Oson"], ["orta", "O'rta"], ["qiyin", "Qiyin"]].map(([k, l]) => `<button data-level="${k}" aria-pressed="${level === k}">${l}</button>`).join("")}</div>
            <div class="seg">${[["w", "⚪ Oq — birinchi"], ["b", "⚫ Qora"]].map(([k, l]) => `<button data-color="${k}" aria-pressed="${color === k}">${l}</button>`).join("")}</div>
            <button class="btn green" data-act="ai">Boshlash</button></div>` : ""}
          <button class="bigbtn b-local" data-act="local"><span class="ic">📱</span><span><b>Bitta telefonda</b><small>Yonma-yon o'tirib, navbat bilan</small></span></button>
          <p class="small muted rules">Online o'yinda har bir yurishga 1 daqiqa beriladi — yurmasangiz yutqazasiz.</p>
        </div>`;
      bindBack();
      const root = app();
      root.querySelectorAll("[data-level]").forEach(b => b.onclick = () => { level = b.dataset.level; save("chess-level", level); this.render(); });
      root.querySelectorAll("[data-color]").forEach(b => b.onclick = () => { color = b.dataset.color; save("chess-color", color); this.render(); });
      root.querySelector('[data-act="ai-toggle"]').onclick = () => { showAi = !showAi; this.render(); };
      const ai = root.querySelector('[data-act="ai"]');
      if (ai) ai.onclick = () => show(gameScreen({ mode: "ai", human: color === "w" ? 1 : -1, depth: DEPTH[level] }));
      root.querySelector('[data-act="local"]').onclick = () => show(gameScreen({ mode: "local" }));
      root.querySelector('[data-act="online"]').onclick = () => startOnline("create");
      root.querySelector('[data-act="match"]').onclick = () => startOnline("match");
    },
  };
}

async function startOnline(kind) {
  let room;
  try { room = await api(kind, { game: "chess" }); } catch (e) { return toast(e.message); }
  if (room.status === "playing") return show(gameScreen({ mode: "online", room, mySide: isMe(room.p1) ? 1 : -1 }));
  show(waitingScreen(room, kind === "match"));
}
export async function createPrivate() {
  const room = await api("create", { game: "chess" });
  if (!room?.id) throw new Error("Xona ochilmadi");
  show(waitingScreen(room, false, arguments[0] || ""));
  return room;
}
function waitingScreen(room, matching, invited = "") {
  return waitScreen(room, { matching, invited, icon: "♞", shareText: "Shaxmat o'ynaymizmi? ♞",
    onStart: r => show(gameScreen({ mode: "online", room: r, mySide: isMe(r.p1) ? 1 : -1 }), false) });
}
export function openChessRoom(r) {
  if (isMe(r.p1) && r.status === "waiting") return show(waitingScreen(r, false));
  show(gameScreen({ mode: "online", room: r, mySide: isMe(r.p1) ? 1 : -1 }));
}

function gameScreen(opt) {
  let room = opt.room || null, st = room?.state?.board ? room.state : initState();
  let sel = -1, promo = null, thinking = false, sending = false, alive = true, poll = null, clk = null, deadline = 0;
  const setClock = r => { deadline = r && r.turn_left != null && r.status === "playing" ? Date.now() + r.turn_left * 1000 : 0; };
  setClock(room);
  const side = () => st.turn === "w" ? 1 : -1;
  const flip = (opt.mode === "ai" && opt.human === -1) || (opt.mode === "online" && opt.mySide === -1);
  const myTurn = () => !st.winner && !thinking && !sending && (opt.mode === "local" || (opt.mode === "ai" ? side() === opt.human : room?.status === "playing" && side() === opt.mySide));
  const names = () => opt.mode === "ai" ? (opt.human === 1 ? ["Siz", "Kompyuter"] : ["Kompyuter", "Siz"]) : opt.mode === "local" ? ["Oq", "Qora"] : [room.p1_name || "O'yinchi 1", room.p2_name || "O'yinchi 2"];
  const tickClock = () => {
    const el = document.getElementById("tclk"); if (!el) return;
    if (!deadline || st.winner || room?.status !== "playing") { el.textContent = ""; return; }
    const t = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    el.textContent = `⏱ ${(t / 60) | 0}:${String(t % 60).padStart(2, "0")}`;
    el.className = "tclk" + (t <= 15 ? " low" : "") + (side() === opt.mySide ? " mine" : "");
  };

  async function commit(m, promoPiece) {
    sel = -1; promo = null;
    const next = applyMove(st, m);
    haptic(st.board[m.t] || m.e ? "medium" : "light");
    if (opt.mode === "online") {
      sending = true; render();
      try {
        const r = await api("cmove", { id: room.id, version: room.version, from: m.f, to: m.t, promo: promoPiece || 0 });
        if (r.error === "stale") { room = r; setClock(r); if (r.state?.board) st = r.state; toast("O'yin yangilandi"); }
        else if (r.error) toast("Yurish qabul qilinmadi");
        else { room = r; setClock(r); st = r.state; if (r.status === "done") refreshProfile(); }
      } catch (e) { toast("Internet bilan muammo — yurish yuborilmadi"); }
      sending = false; render(); return;
    }
    st = next;
    if (opt.mode === "ai" && st.winner === (opt.human === 1 ? "w" : "b")) api("aiwin", { game: "chess" }).catch(() => {});
    render(); aiTurn();
  }
  function aiTurn() {
    if (opt.mode !== "ai" || st.winner || side() === opt.human || thinking) return;
    thinking = true; render();
    setTimeout(() => {
      if (!alive) return;
      const m = bestMove(st, opt.depth);
      thinking = false;
      if (m) { st = applyMove(st, m); haptic("light"); }
      render();
    }, 350);
  }
  function tap(i) {
    if (!myTurn() || promo) return;
    const color = side(), moves = legalMoves(st);
    if (sel >= 0) {
      const cand = moves.filter(m => m.f === sel && m.t === i);
      if (cand.length) {
        if (cand[0].p) { promo = { f: sel, t: i }; return render(); }
        return commit(cand[0]);
      }
    }
    if (st.board[i] * color > 0 && moves.some(m => m.f === i)) { sel = sel === i ? -1 : i; haptic("light"); } else sel = -1;
    render();
  }

  function render() {
    if (!alive) return;
    const color = side(), moves = st.winner ? [] : legalMoves(st);
    const targets = new Map(sel < 0 ? [] : moves.filter(m => m.f === sel).map(m => [m.t, st.board[m.t] || m.e]));
    const chk = !st.winner && inCheck(st.board, color) ? st.board.indexOf(color * K) : -1;
    const [nW, nB] = names();
    let sq = "";
    for (let k = 0; k < 64; k++) {
      const i = flip ? 63 - k : k, r = i >> 3, c = i & 7, v = st.board[i];
      const cls = ["sq", (r + c) % 2 ? "d" : "l", st.last && (st.last.from === i || st.last.to === i) ? "last" : "", sel === i ? "selc" : "", targets.has(i) ? (targets.get(i) ? "cap" : "tgt") : "", chk === i ? "chk" : ""].join(" ");
      sq += `<div class="${cls}" data-i="${i}">${v ? `<span class="cp ${v > 0 ? "w" : "b"}">${GL[Math.abs(v)]}</span>` : ""}</div>`;
    }
    const pl = white => {
      const on = (color === 1) === white && !st.winner;
      return `<div class="player ${on ? "on" : ""}"><span class="dot ${white ? "w" : "b"}"></span><span class="pn">${esc(white ? nW : nB)}</span>
        ${on ? `<span class="turnpill">${thinking ? "o'ylayapti…" : "navbat"}</span>` : ""}</div>`;
    };
    let status;
    if (opt.mode === "online") status = color === opt.mySide ? "Sizning navbatingiz" : "Raqib o'ylayapti…";
    else if (opt.mode === "ai") status = color === opt.human ? "Sizning navbatingiz" : "Kompyuter o'ylayapti…";
    else status = (color === 1 ? "Oq" : "Qora") + " yuradi";
    if (chk >= 0) status += " · SHOH!";
    const right = opt.mode === "online" ? (room.status === "playing" ? `<button class="pill" data-resign>🏳️ Taslim</button>` : "") : `<button class="pill" data-restart>↻ Qaytadan</button>`;
    const pp = promo ? `<div class="overlay"><div class="card stack center"><h2>Piyoda — kim bo'lsin?</h2><div class="promo">${[Q, R, B, N].map(p => `<button class="cpb" data-pr="${p}"><span class="cp ${color === 1 ? "w" : "b"}">${GL[p]}</span></button>`).join("")}</div></div></div>` : "";
    app().innerHTML = header("Shaxmat", right) + `
      <div class="status">${st.winner ? "O'yin tugadi" : status}${opt.mode === "online" && room?.status === "playing" && !st.winner ? ` <span id="tclk" class="tclk"></span>` : ""}</div>
      ${pl(flip)}<div class="board chess"><div class="squares">${sq}</div></div>${pl(!flip)}
      ${pp}${st.winner || room?.status === "done" ? endOverlay() : ""}`;
    bindBack();
    app().querySelectorAll(".sq").forEach(el => el.onclick = () => tap(+el.dataset.i));
    app().querySelectorAll("[data-pr]").forEach(b => b.onclick = () => { const pr = +b.dataset.pr, m = findMove(st, promo.f, promo.t, pr); commit(m, pr); });
    const rs = app().querySelector("[data-restart]"); if (rs) rs.onclick = restart;
    const rg = app().querySelector("[data-resign]"); if (rg) rg.onclick = resign;
    app().querySelectorAll("[data-end]").forEach(b => b.onclick = () => endAction(b.dataset.end));
    tickClock();
  }

  function endOverlay() {
    let title, sub = "";
    const res = room?.result;
    let win = st.winner === "draw" ? 0 : st.winner === "w" ? 1 : st.winner === "b" ? -1 : null;
    if (res && !res.cancelled) win = res.winner === "draw" ? 0 : res.winner === "p1" ? 1 : -1;
    const me = opt.mode === "ai" ? opt.human : opt.mode === "online" ? opt.mySide : null;
    if (win === 0) { title = "Durang 🤝"; sub = NAMES[st.reason] || ""; }
    else if (me === null) { title = (win === 1 ? "Oq" : "Qora") + " yutdi! 🏆"; sub = NAMES[st.reason] || ""; }
    else if (me === win) { title = "Siz yutdingiz! 🏆"; haptic("ok"); sub = st.reason === "mat" ? "Shoh va mat!" : ""; }
    else { title = "Bu safar yutqazdingiz"; sub = st.reason === "mat" ? "Shoh va mat" : "Revansh olasizmi?"; }
    if (room?.state?.timeout) sub = isMe(room.state.resigned) ? "Yurish vaqti (1 daqiqa) tugadi" : "Raqib 1 daqiqada yurmadi — g'alaba sizniki";
    else if (room?.state?.resigned && !isMe(room.state.resigned)) sub = room.state.left ? "Raqib o'yinni tashlab chiqib ketdi — g'alaba sizniki" : "Raqib taslim bo'ldi";
    else if (room?.state?.resigned) sub = "Siz taslim bo'ldingiz";
    const offer = room?.state?.rematch && !isMe(room.state.rematch_by);
    return `<div class="overlay"><div class="card stack center"><h2>${title}</h2>${sub ? `<p class="muted" style="margin:0">${sub}</p>` : ""}
      ${opt.mode === "online" ? ratingLine(room) : ""}
      ${opt.mode === "online" ? `<button class="btn green" data-end="rematch">${offer ? "✅ Revanshni qabul qilish" : "🔁 Revansh"}</button>` : `<button class="btn green" data-end="again">Yana o'ynash</button>`}
      ${opt.mode === "online" ? `<button class="btn alt" data-end="lb">🏆 Reyting</button>` : ""}
      <button class="btn alt" data-end="menu">Menyuga</button></div></div>`;
  }
  async function endAction(a) {
    if (a === "again") return restart();
    if (a === "menu") return home();
    if (a === "lb") return show(nav.leaderboard("chess"));
    if (a === "rematch") {
      try {
        const r = await api("rematch", { id: room.id, game: "chess" });
        if (r.error) return toast("Revansh ochilmadi");
        if (r.status === "playing") show(gameScreen({ mode: "online", room: r, mySide: isMe(r.p1) ? 1 : -1 }), false); else show(waitingScreen(r, false), false);
      } catch (e) { toast(e.message); }
    }
  }
  async function resign() {
    if (!confirm("Taslim bo'lasizmi? Reytingdan ochko yo'qotasiz.")) return;
    try { room = await api("resign", { id: room.id }); st = { ...st, winner: opt.mySide === 1 ? "b" : "w" }; render(); } catch (e) { toast(e.message); }
  }
  function restart() { if (opt.mode === "online") return; st = initState(); sel = -1; thinking = false; render(); aiTurn(); }

  return {
    busy: true,
    render() {
      alive = true; render(); aiTurn();
      if (opt.mode === "online") {
        clk = setInterval(tickClock, 250);
        poll = setInterval(async () => {
          if (sending) return;
          try {
            const r = await read("g_room_get", { p_id: room.id });
            if (!r.error && r.version > room.version) {
              room = r; setClock(r); st = r.state; sel = -1; promo = null; haptic("light");
              if (r.status === "done") refreshProfile();
              render();
            }
          } catch (e) {}
        }, 1100);
      }
    },
    leave() { alive = false; clearInterval(poll); clearInterval(clk); },
  };
}
