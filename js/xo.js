import { isMe, waitScreen } from "./core.js";
import { app, header, bindBack, show, home, api, read, toast, haptic, esc, load, save, ratingLine, refreshProfile, nav } from "./core.js";
import { WIN, aiMove, xoInit, xoApply } from "./xo-engine.js";

const LEVELS = [["oson", "Oson"], ["orta", "O'rta"], ["qiyin", "Qiyin"]];
const MARK = { w: "X", b: "O" };
const cfg = () => ({ size: +load("xo-size") || 3, rounds: +load("xo-rounds") || 3 });
let showAi = false;

export function xoMenu() {
  let { size, rounds } = cfg(), level = load("xo-level") || "orta", first = load("xo-first") || "x";
  return {
    render() {
      app().innerHTML = header("X | O") + `
        <div class="stack">
          <div class="card stack">
            <b>Maydon o'lchami</b>
            <div class="seg">${[3, 4, 5].map(n => `<button data-size="${n}" aria-pressed="${size === n}">${n}×${n}</button>`).join("")}</div>
            <p class="small muted" style="margin:0">${size === 3 ? "3 ta belgini qatorga tering" : "4 ta belgini qatorga tering (gorizontal, vertikal yoki diagonal)"}</p>
            <b>Raundlar soni</b>
            <div class="seg">${[1, 3, 5].map(n => `<button data-rounds="${n}" aria-pressed="${rounds === n}">${n} raund</button>`).join("")}</div>
          </div>
          <button class="bigbtn b-fast" data-act="match"><span class="ic">⚡</span><span><b>Tezkor o'yin</b><small>Tasodifiy raqib · reytingga ta'sir qiladi</small></span></button>
          <button class="bigbtn b-friend" data-act="online"><span class="ic">🔗</span><span><b>Sherikni chaqirish</b><small>Havola yuboring — u bossa, o'yin boshlanadi</small></span></button>
          <button class="bigbtn b-ai" data-act="ai-toggle"><span class="ic">🤖</span><span><b>Kompyuter bilan</b><small>Mashq qilish uchun</small></span></button>
          <div class="card stack" data-ai hidden>
            <div class="seg">${LEVELS.map(([k, l]) => `<button data-level="${k}" aria-pressed="${level === k}">${l}</button>`).join("")}</div>
            <div class="seg">${[["x", "❌ X — birinchi"], ["o", "⭕ O"]].map(([k, l]) => `<button data-first="${k}" aria-pressed="${first === k}">${l}</button>`).join("")}</div>
            <button class="btn green" data-act="ai">Boshlash</button>
          </div>
          <button class="bigbtn b-local" data-act="local"><span class="ic">📱</span><span><b>Bitta telefonda</b><small>Yonma-yon o'tirib, navbat bilan</small></span></button>
          <p class="small muted rules">Onlayn o'yinda g'alaba +3, durang +1, mag'lubiyat −1 ball.</p>
        </div>`;
      bindBack();
      const root = app();
      root.querySelectorAll("[data-size]").forEach(b => b.onclick = () => { size = +b.dataset.size; save("xo-size", size); this.render(); });
      root.querySelectorAll("[data-rounds]").forEach(b => b.onclick = () => { rounds = +b.dataset.rounds; save("xo-rounds", rounds); this.render(); });
      root.querySelectorAll("[data-level]").forEach(b => b.onclick = () => { level = b.dataset.level; save("xo-level", level); showAi = true; this.render(); });
      root.querySelectorAll("[data-first]").forEach(b => b.onclick = () => { first = b.dataset.first; save("xo-first", first); showAi = true; this.render(); });
      const box = root.querySelector("[data-ai]"); box.hidden = !showAi;
      root.querySelector('[data-act="ai-toggle"]').onclick = () => { showAi = !showAi; box.hidden = !showAi; };
      root.querySelector('[data-act="ai"]').onclick = () => show(gameScreen({ mode: "ai", size, rounds, level, human: first === "x" ? "w" : "b" }));
      root.querySelector('[data-act="local"]').onclick = () => show(gameScreen({ mode: "local", size, rounds }));
      root.querySelector('[data-act="online"]').onclick = () => startOnline("create");
      root.querySelector('[data-act="match"]').onclick = () => startOnline("match");
    },
  };
}

const sideOf = r => isMe(r.p1) ? "w" : "b";
async function startOnline(kind) {
  let room;
  try { room = await api(kind, { game: "xo", ...cfg() }); } catch (e) { return toast(e.message); }
  if (room.status === "playing") return show(gameScreen({ mode: "online", room, mySide: sideOf(room) }));
  show(waitingScreen(room, kind === "match"));
}
export async function createPrivate() {
  const room = await api("create", { game: "xo", ...cfg() });
  if (!room?.id) throw new Error("Xona ochilmadi");
  show(waitingScreen(room, false, arguments[0] || ""));
  return room;
}
function waitingScreen(room, matching, invited = "") {
  return waitScreen(room, { matching, invited, icon: "❌", shareText: "X | O o'ynaymizmi? ❌⭕",
    onStart: r => show(gameScreen({ mode: "online", room: r, mySide: sideOf(r) }), false) });
}
export function openXoRoom(r) {
  if (isMe(r.p1) && r.status === "waiting") return show(waitingScreen(r, false));
  show(gameScreen({ mode: "online", room: r, mySide: sideOf(r) }));
}

function gameScreen(opt) {
  let room = opt.room || null;
  let st = room?.state?.board ? room.state : xoInit(opt.size, opt.rounds);
  let thinking = false, sending = false, alive = true, poll = null, timer = null, banner = null, bannerT = null, lastShown = st.last?.round || 0;
  const n = () => st.n;
  const myTurn = () => !st.winner && !thinking && !sending && (opt.mode === "local" || (opt.mode === "ai" ? st.turn === opt.human : room?.status === "playing" && st.turn === opt.mySide));
  const names = () => opt.mode === "ai" ? (opt.human === "w" ? { w: "Siz", b: "Kompyuter" } : { w: "Kompyuter", b: "Siz" })
    : opt.mode === "local" ? { w: "X", b: "O" } : { w: room.p1_name || "O'yinchi 1", b: room.p2_name || "O'yinchi 2" };
  const me = () => opt.mode === "ai" ? opt.human : opt.mode === "online" ? opt.mySide : null;

  function flash(last) {
    if (!last || last.round <= lastShown) return;
    lastShown = last.round;
    const m = me(), nm = names();
    banner = last.w === "draw" ? `Raund ${last.round}: durang 🤝` : m ? (last.w === m ? `Raund ${last.round}: siz yutdingiz! 🎉` : `Raund ${last.round}: raqib yutdi`) : `Raund ${last.round}: ${MARK[last.w]} yutdi`;
    if (st.winner) return;
    clearTimeout(bannerT); bannerT = setTimeout(() => { banner = null; render(); }, 2200);
  }
  function setState(ns) { st = ns; flash(ns.last); }

  async function place(i) {
    if (!myTurn() || st.board[i]) return;
    haptic("light");
    if (opt.mode === "online") {
      sending = true; render();
      try {
        const r = await api("xmove", { id: room.id, version: room.version, i });
        if (r.error === "stale") { room = r; if (r.state?.board) setState(r.state); toast("O'yin yangilandi"); }
        else if (r.error) toast("Yurish qabul qilinmadi");
        else { room = r; setState(r.state); if (r.status === "done") refreshProfile(); }
      } catch (e) { toast("Internet bilan muammo — yurish yuborilmadi"); }
      sending = false; render(); return;
    }
    const ns = xoApply(st, i, st.turn);
    if (!ns) return;
    setState(ns);
    if (opt.mode === "ai" && st.winner === opt.human) api("aiwin", { game: "xo" }).catch(() => {});
    if (st.winner || st.last) haptic("ok");
    render(); aiTurn();
  }
  function aiTurn() {
    if (opt.mode !== "ai" || st.winner || st.turn === opt.human || thinking || !alive) return;
    thinking = true; render();
    timer = setTimeout(() => {
      if (!alive) return;
      thinking = false;
      const side = st.turn, i = aiMove(st.board.slice(), n(), side === "w" ? 1 : -1, opt.level);
      if (i >= 0) { const ns = xoApply(st, i, side); if (ns) setState(ns); haptic("light"); }
      render(); aiTurn();
    }, 450);
  }

  function endOverlay() {
    const m = me(), w = st.winner, s = st.score;
    let title, sub = `Hisob: ${s.w} : ${s.b}${s.d ? ` · durang ${s.d}` : ""}`;
    const res = room?.result;
    let win = w; if (res && !res.cancelled) win = res.winner === "draw" ? "draw" : res.winner === "p1" ? "w" : "b";
    if (win === "draw") title = "Durang 🤝";
    else if (!m) title = `${MARK[win]} yutdi! 🏆`;
    else if (win === m) { title = "Siz yutdingiz! 🏆"; haptic("ok"); }
    else title = "Bu safar yutqazdingiz";
    if (room?.state?.resigned) sub = isMe(room.state.resigned) ? "Siz taslim bo'ldingiz" : "Raqib taslim bo'ldi — g'alaba sizniki";
    const offer = room?.state?.rematch && !isMe(room.state.rematch_by);
    return `<div class="overlay"><div class="card stack center"><h2>${title}</h2><p class="muted" style="margin:0">${sub}</p>
      ${opt.mode === "online" ? ratingLine(room) : ""}
      ${opt.mode === "online" ? `<button class="btn green" data-end="rematch">${offer ? "✅ Revanshni qabul qilish" : "🔁 Revansh"}</button><button class="btn alt" data-end="lb">🏆 Reyting</button>` : `<button class="btn green" data-end="again">Yana o'ynash</button>`}
      <button class="btn alt" data-end="menu">Menyuga</button></div></div>`;
  }
  async function endAction(a) {
    if (a === "again") return restart();
    if (a === "menu") return home();
    if (a === "lb") return show(nav.leaderboard("xo"));
    if (a === "rematch") {
      try {
        const r = await api("rematch", { id: room.id, game: "xo", size: st.n, rounds: st.rounds });
        if (r.error) return toast("Revansh ochilmadi");
        if (r.status === "playing") show(gameScreen({ mode: "online", room: r, mySide: sideOf(r) }), false); else show(waitingScreen(r, false), false);
      } catch (e) { toast(e.message); }
    }
  }
  async function resign() {
    if (!confirm("Taslim bo'lasizmi? Reytingdan ochko yo'qotasiz.")) return;
    try { room = await api("resign", { id: room.id }); st = { ...st, winner: opt.mySide === "w" ? "b" : "w" }; render(); refreshProfile(); } catch (e) { toast(e.message); }
  }
  function restart() { if (opt.mode === "online") return; st = xoInit(opt.size, opt.rounds); lastShown = 0; banner = null; thinking = false; render(); aiTurn(); }

  function render() {
    if (!alive) return;
    const nm = names(), N = n(), win = new Set(st.line || []);
    const showBoard = st.board;
    const cells = showBoard.map((v, i) => `<button class="xo-c ${v ? "f " + (v === 1 ? "x" : "o") : ""} ${win.has(i) ? "w" : ""}" data-i="${i}" aria-label="katak ${i + 1}">${v ? (v === 1 ? "X" : "O") : ""}</button>`).join("");
    const on = s => !st.winner && st.turn === s;
    const pl = s => `<div class="xo-p ${on(s) ? "on" : ""}"><i class="${s === "w" ? "x" : "o"}">${MARK[s]}</i><span>${esc(nm[s])}</span><b>${st.score[s]}</b></div>`;
    let status;
    if (opt.mode === "online") status = st.turn === opt.mySide ? "Sizning navbatingiz" : "Raqib o'ylayapti…";
    else if (opt.mode === "ai") status = st.turn === opt.human ? "Sizning navbatingiz" : "Kompyuter o'ylayapti…";
    else status = `${MARK[st.turn]} yuradi`;
    const right = opt.mode === "online" ? (room.status === "playing" && !st.winner ? `<button class="pill" data-resign>🏳️ Taslim</button>` : "") : `<button class="pill" data-restart>↻</button>`;
    app().innerHTML = header("X | O", right) + `
      <div class="status">Raund ${Math.min(st.round, st.rounds)}/${st.rounds} · ${N}×${N} · ${WIN[N]} ta qator${st.winner ? "" : " · " + status}</div>
      <div class="xo-bar">${pl("w")}<span class="xo-d">${st.score.d ? "= " + st.score.d : ""}</span>${pl("b")}</div>
      <div class="xo-board" style="--n:${N}">${cells}</div>
      ${banner && !st.winner ? `<div class="xo-res"><b>${banner}</b></div>` : ""}
      ${st.winner ? endOverlay() : ""}`;
    bindBack();
    app().querySelectorAll(".xo-c").forEach(b => b.onclick = () => place(+b.dataset.i));
    const q = s => app().querySelector(s);
    if (q("[data-restart]")) q("[data-restart]").onclick = restart;
    if (q("[data-resign]")) q("[data-resign]").onclick = resign;
    app().querySelectorAll("[data-end]").forEach(b => b.onclick = () => endAction(b.dataset.end));
  }

  return {
    busy: true, act: `xo:${opt.mode}`,
    render() {
      alive = true; render(); aiTurn();
      if (opt.mode === "online") {
        poll = setInterval(async () => {
          if (sending) return;
          try {
            const r = await read("g_room_get", { p_id: room.id });
            if (!r.error && r.version > room.version) {
              room = r; setState(r.state); haptic("light");
              if (r.status === "done") refreshProfile();
              render();
            }
          } catch (e) {}
        }, 1100);
      }
    },
    leave() { alive = false; clearTimeout(timer); clearTimeout(bannerT); clearInterval(poll); },
  };
}
