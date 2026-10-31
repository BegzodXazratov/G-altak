import { app, header, bindBack, show, home, me, api, read, toast, haptic, esc, load, save, shareInvite, copy, sleep,
  scoreCard, ratingLine, refreshProfile, nav } from "./core.js";
import { initBoard, legalMoves, applyMove, bestMove, countPieces } from "./shashka-engine.js";

const DEPTH = { oson: 1, orta: 3, qiyin: 6 };
const QUIET_DRAW = 30;
const STEP_MS = 170;
const freshState = () => ({ board: initBoard(), turn: "w", last: null, quiet: 0, winner: null });

// ---------------- lobby ----------------
export function shashkaMenu() {
  let level = load("shashka-level") || "orta";
  let color = load("shashka-color") || "w";
  let showAi = false;
  return {
    render() {
      app().innerHTML = header("Shashka") + `
        ${scoreCard()}
        <div class="stack">
          <button class="bigbtn b-fast" data-act="match"><span class="ic">⚡</span><span><b>Tezkor o'yin</b><small>Tasodifiy raqib · reytingga ta'sir qiladi</small></span></button>
          <button class="bigbtn b-friend" data-act="online"><span class="ic">🔗</span><span><b>Do'stni chaqirish</b><small>Havola yuboring — u bossa, o'yin boshlanadi</small></span></button>
          <button class="bigbtn b-ai" data-act="ai-toggle"><span class="ic">🤖</span><span><b>Kompyuter bilan</b><small>Mashq qilish uchun</small></span></button>
          ${showAi ? `<div class="card stack">
            <div class="seg">${[["oson", "Oson"], ["orta", "O'rta"], ["qiyin", "Qiyin"]].map(([k, l]) =>
              `<button data-level="${k}" aria-pressed="${level === k}">${l}</button>`).join("")}</div>
            <div class="seg">${[["w", "⚪ Oq — birinchi"], ["b", "⚫ Qora"]].map(([k, l]) =>
              `<button data-color="${k}" aria-pressed="${color === k}">${l}</button>`).join("")}</div>
            <button class="btn green" data-act="ai">Boshlash</button></div>` : ""}
          <button class="bigbtn b-local" data-act="local"><span class="ic">📱</span><span><b>Bitta telefonda</b><small>Yonma-yon o'tirib, navbat bilan</small></span></button>
          <div class="joinrow"><input class="inp" id="code" placeholder="Xona kodi" maxlength="6" autocapitalize="characters">
            <button class="btn alt" data-act="join">Kirish</button></div>
          <p class="small muted rules">Qoidalar: urish majburiy · oddiy dona orqaga ham uradi · damka uzoqqa yuradi.</p>
        </div>`;
      bindBack();
      const root = app();
      root.querySelectorAll("[data-level]").forEach(b => b.onclick = () => { level = b.dataset.level; save("shashka-level", level); this.render(); });
      root.querySelectorAll("[data-color]").forEach(b => b.onclick = () => { color = b.dataset.color; save("shashka-color", color); this.render(); });
      root.querySelector('[data-act="ai-toggle"]').onclick = () => { showAi = !showAi; this.render(); };
      const ai = root.querySelector('[data-act="ai"]');
      if (ai) ai.onclick = () => show(gameScreen({ mode: "ai", human: color === "w" ? 1 : -1, depth: DEPTH[level], level }));
      root.querySelector('[data-act="local"]').onclick = () => show(gameScreen({ mode: "local" }));
      root.querySelector('[data-act="online"]').onclick = () => startOnline("create");
      root.querySelector('[data-act="match"]').onclick = () => startOnline("match");
      root.querySelector('[data-act="join"]').onclick = () => {
        const code = root.querySelector("#code").value.trim().toUpperCase();
        if (code.length < 4) return toast("Xona kodini kiriting");
        joinRoom(code);
      };
    },
  };
}

async function startOnline(kind) {
  let room;
  try { room = await api(kind, { game: "shashka", state: freshState() }); }
  catch (e) { return toast(e.message); }
  if (room.status === "playing") return show(gameScreen({ mode: "online", room, mySide: room.p1 === me().id ? 1 : -1 }));
  show(waitingScreen(room, kind === "match"));
}

function waitingScreen(room, matching) {
  let timer, dots = 0;
  return {
    render() {
      app().innerHTML = header(matching ? "Raqib qidirilmoqda" : "Do'stni kutyapmiz") + (matching ? `
        <div class="card stack center">
          <div class="radar"><span></span><span></span><span></span><b>⚫</b></div>
          <p class="muted" id="wt" style="margin:0">Sizga mos raqib qidiryapmiz…</p>
          <button class="btn alt" data-share>🔗 Yoki do'stni chaqiring</button>
        </div>` : `
        <div class="card stack center">
          <p class="muted" style="margin:0">Xona kodi</p>
          <div class="code">${room.id}</div>
          <p class="small muted" style="margin:0">Do'stingiz havolani bossa yoki kodni kiritsa — o'yin o'zi boshlanadi. Siz oq donalar bilan o'ynaysiz.</p>
          <button class="btn" data-share>📨 Do'stga yuborish</button>
          <button class="btn alt" data-copy>Kodni nusxalash</button>
        </div>`);
      bindBack();
      app().querySelector("[data-share]").onclick = () => shareInvite(room.id, `Shashka o'ynaymizmi? ⚫⚪ Xona: ${room.id}`);
      const c = app().querySelector("[data-copy]"); if (c) c.onclick = () => copy(room.id);
      timer = setInterval(async () => {
        dots = (dots + 1) % 4;
        const wt = document.getElementById("wt"); if (wt) wt.textContent = "Sizga mos raqib qidiryapmiz" + ".".repeat(dots);
        try {
          const r = await read("g_room_get", { p_id: room.id });
          if (r.status === "playing") {
            clearInterval(timer); haptic("ok");
            show(gameScreen({ mode: "online", room: r, mySide: 1 }), false);
          }
        } catch (e) {}
      }, 1300);
    },
    leave() { clearInterval(timer); },
  };
}

export async function joinRoom(code) {
  let r;
  try { r = await api("join", { id: code }); } catch (e) { return toast(e.message); }
  if (r.error === "not_found") return toast("Bunday xona topilmadi");
  if (r.error === "full") return toast("Bu xonada allaqachon ikki kishi o'ynayapti");
  if (r.game === "soz") { const m = await import("./soz.js"); return m.openSozRoom(r); }
  if (r.game === "gugurt") { const m = await import("./gugurt.js"); return m.openGugRoom(r); }
  if (r.p1 === me().id && r.status === "waiting") return show(waitingScreen(r, false));
  show(gameScreen({ mode: "online", room: r, mySide: r.p1 === me().id ? 1 : -1 }));
}

// ---------------- o'yin ----------------
function gameScreen(opt) {
  const g = { board: initBoard(), side: 1, last: null, quiet: 0, winner: null, sel: null, thinking: false, anim: false };
  let room = opt.room || null, poll = null, sending = false, alive = true;
  if (room?.state?.board) adopt(room.state);

  const flip = (opt.mode === "ai" && opt.human === -1) || (opt.mode === "online" && opt.mySide === -1);
  const names = () => {
    if (opt.mode === "ai") return opt.human === 1 ? ["Siz", "Kompyuter"] : ["Kompyuter", "Siz"];
    if (opt.mode === "local") return ["Oq", "Qora"];
    return [room.p1_name || "O'yinchi 1", room.p2_name || "O'yinchi 2"];
  };
  const myTurn = () => !g.anim && (opt.mode === "local" || (opt.mode === "ai" ? g.side === opt.human && !g.thinking
    : g.side === opt.mySide && room.status === "playing"));

  function adopt(s) {
    g.board = s.board; g.side = s.turn === "w" ? 1 : -1; g.last = s.last; g.quiet = s.quiet || 0; g.winner = s.winner || null; g.sel = null;
  }
  const stateOf = () => ({ board: g.board, turn: g.side === 1 ? "w" : "b", last: g.last, quiet: g.quiet, winner: g.winner });

  // ----- animatsiya: dona yo'l bo'ylab sakraydi, urilganlar so'nadi -----
  const pos = i => { const r = (i / 8) | 0, c = i % 8; return flip ? [7 - r, 7 - c] : [r, c]; };
  async function animate(path, caps) {
    const el = document.querySelector(`.pc[data-at="${path[0]}"]`);
    if (!el) return;
    g.anim = true;
    el.classList.add("moving");
    for (let k = 1; k < path.length; k++) {
      const [r, c] = pos(path[k]);
      el.style.transform = `translate(${c * 100}%, ${r * 100}%)`;
      const cap = caps?.[k - 1];
      if (cap !== undefined) setTimeout(() => document.querySelector(`.pc[data-at="${cap}"]`)?.classList.add("gone"), STEP_MS * 0.6);
      await sleep(STEP_MS + 20);
    }
    await sleep(60);
    g.anim = false;
  }

  function finishCheck() {
    if (g.quiet >= QUIET_DRAW) g.winner = "draw";
    else if (!legalMoves(g.board, g.side).length) g.winner = g.side === 1 ? "b" : "w";
  }

  async function play(m) {
    await animate(m.path, m.caps);
    const moved = g.board[m.path[0]];
    g.board = applyMove(g.board, m);
    g.last = { path: m.path, caps: m.caps };
    g.quiet = m.caps.length || Math.abs(moved) === 1 ? 0 : g.quiet + 1;
    g.side = -g.side; g.sel = null;
    haptic(m.caps.length ? "medium" : "light");
    finishCheck();
    if (g.winner && opt.mode === "ai" && g.winner === (opt.human === 1 ? "w" : "b")) api("aiwin", { game: "shashka" }).catch(() => {});
    render();
  }

  async function sendOnline() {
    sending = true;
    try {
      const r = await api("move", { id: room.id, version: room.version, state: stateOf() });
      if (r.error === "stale") { room = r; adopt(r.state); toast("O'yin yangilandi"); }
      else if (r.error) toast("Yurish yuborilmadi");
      else room = r;
    } catch (e) { toast("Internet bilan muammo — yurish yuborilmadi"); }
    sending = false;
    render();
  }

  function aiTurn() {
    if (opt.mode !== "ai" || g.winner || g.side === opt.human || g.thinking) return;
    g.thinking = true; render();
    setTimeout(async () => {
      if (!alive) return;
      const m = bestMove(g.board, g.side, opt.depth);
      g.thinking = false;
      if (m) await play(m); else { finishCheck(); render(); }
    }, 380);
  }

  async function tap(i) {
    if (g.winner || !myTurn() || sending) return;
    const moves = legalMoves(g.board, g.side);
    if (g.sel !== null) {
      const m = moves.find(x => x.path[0] === g.sel && x.path[x.path.length - 1] === i);
      if (m) {
        await play(m);
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
    if (!alive) return;
    const moves = g.winner ? [] : legalMoves(g.board, g.side);
    const must = moves.length && moves[0].caps.length ? new Set(moves.map(m => m.path[0])) : new Set();
    const targets = new Set(g.sel === null ? [] : moves.filter(m => m.path[0] === g.sel).map(m => m.path[m.path.length - 1]));
    const lastSet = new Set(g.last?.path || []);
    const [nW, nB] = names();
    const cnt = countPieces(g.board);
    let squares = "", pieces = "";
    for (let k = 0; k < 64; k++) {
      const i = flip ? 63 - k : k;
      const r = (i / 8) | 0, c = i % 8, dark = (r + c) % 2 === 1;
      squares += `<div class="sq ${dark ? "d" : "l"} ${lastSet.has(i) ? "last" : ""} ${targets.has(i) ? "target" : ""}" data-i="${i}"></div>`;
      const p = g.board[i];
      if (p) {
        const [pr, pc] = pos(i);
        pieces += `<div class="pc ${p > 0 ? "w" : "b"} ${Math.abs(p) === 2 ? "king" : ""} ${g.sel === i ? "sel" : ""} ${must.has(i) && myTurn() ? "must" : ""}"
          data-at="${i}" style="transform:translate(${pc * 100}%, ${pr * 100}%)"><i></i></div>`;
      }
    }
    const topIsWhite = flip;
    const pl = white => {
      const on = (g.side === 1) === white && !g.winner;
      return `<div class="player ${on ? "on" : ""}"><span class="dot ${white ? "w" : "b"}"></span>
        <span class="pn">${esc(white ? nW : nB)}</span><span class="cnt">${white ? cnt.w : cnt.b}</span>
        ${on ? `<span class="turnpill">${g.thinking ? "o'ylayapti…" : "navbat"}</span>` : ""}</div>`;
    };
    let status;
    if (opt.mode === "online") status = g.side === opt.mySide ? "Sizning navbatingiz" : "Raqib o'ylayapti…";
    else if (opt.mode === "ai") status = g.side === opt.human ? "Sizning navbatingiz" : "Kompyuter o'ylayapti…";
    else status = (g.side === 1 ? "Oq" : "Qora") + " yuradi";

    const right = opt.mode === "online" ? (room.status === "playing" ? `<button class="pill" data-resign>🏳️ Taslim</button>` : "")
      : `<button class="pill" data-restart>↻ Qaytadan</button>`;
    app().innerHTML = header("Shashka", right) + `
      <div class="status">${g.winner ? "O'yin tugadi" : status}</div>
      ${pl(topIsWhite)}
      <div class="board"><div class="squares">${squares}</div><div class="pieces">${pieces}</div></div>
      ${pl(!topIsWhite)}
      ${g.winner || room?.status === "done" ? endOverlay() : ""}`;
    bindBack();
    app().querySelectorAll(".sq").forEach(el => el.onclick = () => tap(+el.dataset.i));
    app().querySelectorAll(".pc").forEach(el => el.onclick = () => tap(+el.dataset.at));
    const rs = app().querySelector("[data-restart]"); if (rs) rs.onclick = restart;
    const rg = app().querySelector("[data-resign]"); if (rg) rg.onclick = resign;
    app().querySelectorAll("[data-end]").forEach(b => b.onclick = () => endAction(b.dataset.end));
  }

  function endOverlay() {
    let title, sub = "";
    const res = room?.result;
    let winSide = g.winner === "draw" ? 0 : g.winner === "w" ? 1 : g.winner === "b" ? -1 : null;
    if (res && !res.cancelled) winSide = res.winner === "draw" ? 0 : res.winner === "p1" ? 1 : -1;
    const meSide = opt.mode === "ai" ? opt.human : opt.mode === "online" ? opt.mySide : null;
    if (winSide === 0) title = "Durang 🤝";
    else if (meSide === null) title = (winSide === 1 ? "Oq" : "Qora") + " yutdi! 🏆";
    else if (meSide === winSide) { title = "Siz yutdingiz! 🏆"; haptic("ok"); }
    else { title = "Bu safar yutqazdingiz"; sub = room?.state?.resigned === me().id ? "Siz taslim bo'ldingiz" : "Revansh olasizmi?"; }
    if (room?.state?.resigned && room.state.resigned !== me().id) sub = "Raqib taslim bo'ldi";
    const rematchOffer = room?.state?.rematch && room.state.rematch_by !== me().id;
    return `<div class="overlay"><div class="card stack center"><h2>${title}</h2>${sub ? `<p class="muted" style="margin:0">${sub}</p>` : ""}
      ${opt.mode === "online" ? ratingLine(room) : ""}
      ${opt.mode === "online" ? `<button class="btn green" data-end="rematch">${rematchOffer ? "✅ Revanshni qabul qilish" : "🔁 Revansh"}</button>`
        : `<button class="btn green" data-end="again">Yana o'ynash</button>`}
      ${opt.mode === "online" ? `<button class="btn alt" data-end="lb">🏆 Reyting</button>` : ""}
      <button class="btn alt" data-end="menu">Menyuga</button></div></div>`;
  }

  async function endAction(a) {
    if (a === "again") return restart();
    if (a === "menu") return home();
    if (a === "lb") return show(nav.leaderboard("shashka"));
    if (a === "rematch") {
      try {
        const r = await api("rematch", { id: room.id, state: freshState() });
        if (r.error) return toast("Revansh ochilmadi");
        if (r.status === "playing") show(gameScreen({ mode: "online", room: r, mySide: r.p1 === me().id ? 1 : -1 }), false);
        else show(waitingScreen(r, false), false);
      } catch (e) { toast(e.message); }
    }
  }

  async function resign() {
    if (!confirm("Taslim bo'lasizmi? Reytingdan ochko yo'qotasiz.")) return;
    try { room = await api("resign", { id: room.id }); g.winner = opt.mySide === 1 ? "b" : "w"; render(); } catch (e) { toast(e.message); }
  }

  function restart() {
    if (opt.mode === "online") return;
    Object.assign(g, { board: initBoard(), side: 1, last: null, quiet: 0, winner: null, sel: null, thinking: false });
    render(); aiTurn();
  }

  return {
    render() {
      alive = true;
      render();
      aiTurn();
      if (opt.mode === "online" && !poll) {
        poll = setInterval(async () => {
          if (sending || g.anim) return;
          try {
            const r = await read("g_room_get", { p_id: room.id });
            if (!r.error && r.version > room.version) {
              const prev = room; room = r;
              const s = r.state;
              const changed = JSON.stringify(s.board) !== JSON.stringify(g.board);
              if (changed && s.last?.path && g.board[s.last.path[0]]) {
                await animate(s.last.path, s.last.caps); haptic("light");
              }
              adopt(s);
              if (r.status === "done") refreshProfile();
              render();
            }
          } catch (e) {}
        }, 1100);
      }
    },
    leave() { alive = false; clearInterval(poll); poll = null; },
  };
}
