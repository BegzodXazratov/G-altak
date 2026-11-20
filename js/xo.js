import { app, header, bindBack, show, home, toast, haptic, esc, load, save, me } from "./core.js";
import { WIN, result, aiMove } from "./xo-engine.js";

const LEVELS = [["oson", "Oson"], ["orta", "O'rta"], ["qiyin", "Qiyin"]];
const MARK = { 1: "X", [-1]: "O" };

export function xoMenu() {
  let size = +load("xo-size") || 3, rounds = +load("xo-rounds") || 3, level = load("xo-level") || "orta", first = load("xo-first") || "x";
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
          <button class="bigbtn b-ai" data-act="ai-toggle"><span class="ic">🤖</span><span><b>Kompyuter bilan</b><small>Mashq qilish uchun</small></span></button>
          <div class="card stack" data-ai hidden>
            <div class="seg">${LEVELS.map(([k, l]) => `<button data-level="${k}" aria-pressed="${level === k}">${l}</button>`).join("")}</div>
            <div class="seg">${[["x", "❌ X — birinchi"], ["o", "⭕ O"]].map(([k, l]) => `<button data-first="${k}" aria-pressed="${first === k}">${l}</button>`).join("")}</div>
            <button class="btn green" data-act="ai">Boshlash</button>
          </div>
          <button class="bigbtn b-local" data-act="local"><span class="ic">📱</span><span><b>Bitta telefonda</b><small>Yonma-yon o'tirib, navbat bilan</small></span></button>
        </div>`;
      bindBack();
      const root = app();
      root.querySelectorAll("[data-size]").forEach(b => b.onclick = () => { size = +b.dataset.size; save("xo-size", size); this.render(); });
      root.querySelectorAll("[data-rounds]").forEach(b => b.onclick = () => { rounds = +b.dataset.rounds; save("xo-rounds", rounds); this.render(); });
      root.querySelectorAll("[data-level]").forEach(b => b.onclick = () => { level = b.dataset.level; save("xo-level", level); showAi = true; this.render(); });
      root.querySelectorAll("[data-first]").forEach(b => b.onclick = () => { first = b.dataset.first; save("xo-first", first); showAi = true; this.render(); });
      const box = root.querySelector("[data-ai]"); box.hidden = !showAi;
      root.querySelector('[data-act="ai-toggle"]').onclick = () => { showAi = !showAi; box.hidden = !showAi; };
      root.querySelector('[data-act="ai"]').onclick = () => show(gameScreen({ mode: "ai", size, rounds, level, human: first === "x" ? 1 : -1 }));
      root.querySelector('[data-act="local"]').onclick = () => show(gameScreen({ mode: "local", size, rounds }));
    },
  };
}
let showAi = false;

function gameScreen(opt) {
  const n = opt.size, need = Math.floor(opt.rounds / 2) + 1;
  let board, turn, round, starter, score, res, matchOver, thinking, alive = true, timer = null;
  function newMatch() { score = { 1: 0, [-1]: 0, d: 0 }; round = 1; starter = 1; matchOver = false; newRound(); }
  function newRound() { board = Array(n * n).fill(0); turn = starter; res = null; thinking = false; }
  const names = () => opt.mode === "ai" ? (opt.human === 1 ? { 1: "Siz", [-1]: "Kompyuter" } : { 1: "Kompyuter", [-1]: "Siz" }) : { 1: "X", [-1]: "O" };

  function finishRound() {
    if (res.w === 0) score.d++; else score[res.w]++;
    const left = opt.rounds - round;
    const a = score[1], b = score[-1];
    // g'alaba oldindan aniq bo'lsa yoki raundlar tugasa — o'yin tugaydi
    if (a >= need || b >= need || left === 0 || Math.abs(a - b) > left) matchOver = true;
  }
  function place(i) {
    if (res || board[i] || thinking) return;
    board[i] = turn; haptic("light");
    const r = result(board, n);
    if (r) { res = r; finishRound(); if (r.w) haptic("ok"); render(); return; }
    turn = -turn; render(); aiTurn();
  }
  function aiTurn() {
    if (opt.mode !== "ai" || res || turn === opt.human || !alive) return;
    thinking = true; render();
    timer = setTimeout(() => {
      if (!alive) return;
      thinking = false;
      const i = aiMove(board.slice(), n, turn, opt.level);
      if (i >= 0) place(i); else render();
    }, 400);
  }
  function nextRound() { round++; starter = -starter; newRound(); render(); aiTurn(); }

  function endCard() {
    const nm = names(), a = score[1], b = score[-1];
    if (!matchOver) {
      const t = res.w === 0 ? "Durang 🤝" : opt.mode === "ai" ? (res.w === opt.human ? "Raundni yutdingiz! 🎉" : "Raundni kompyuter oldi") : `${MARK[res.w]} raundni yutdi!`;
      return `<div class="xo-res"><b>${t}</b><button class="btn green" data-next>Keyingi raund →</button></div>`;
    }
    let t;
    if (a === b) t = "Durang 🤝";
    else { const w = a > b ? 1 : -1; t = opt.mode === "ai" ? (w === opt.human ? "Siz yutdingiz! 🏆" : "Bu safar yutqazdingiz") : `${MARK[w]} yutdi! 🏆`; }
    return `<div class="overlay"><div class="card stack center"><h2>${t}</h2><p class="muted" style="margin:0">Hisob: ${a} : ${b}${score.d ? ` · durang ${score.d}` : ""}</p>
      <button class="btn green" data-again>Yana o'ynash</button><button class="btn alt" data-menu>Menyuga</button></div></div>`;
  }

  function render() {
    if (!alive) return;
    const nm = names(), cur = res ? 0 : turn;
    const win = new Set(res?.line || []);
    const cells = board.map((v, i) => `<button class="xo-c ${v ? "f " + (v === 1 ? "x" : "o") : ""} ${win.has(i) ? "w" : ""}" data-i="${i}" aria-label="katak ${i + 1}">${v ? MARK[v] : ""}</button>`).join("");
    const pl = s => `<div class="xo-p ${cur === s ? "on" : ""}"><i class="${s === 1 ? "x" : "o"}">${MARK[s]}</i><span>${esc(nm[s])}</span><b>${score[s]}</b></div>`;
    const status = res ? "Raund tugadi" : opt.mode === "ai" ? (turn === opt.human ? "Sizning navbatingiz" : "Kompyuter o'ylayapti…") : `${MARK[turn]} yuradi`;
    app().innerHTML = header("X | O", `<button class="pill" data-restart>↻</button>`) + `
      <div class="status">Raund ${round}/${opt.rounds} · ${n}×${n} · ${WIN[n]} ta qator${res ? "" : " · " + status}</div>
      <div class="xo-bar">${pl(1)}<span class="xo-d">${score.d ? "= " + score.d : ""}</span>${pl(-1)}</div>
      <div class="xo-board" style="--n:${n}">${cells}</div>
      ${res && !matchOver ? endCard() : ""}${matchOver ? endCard() : ""}`;
    bindBack();
    app().querySelectorAll(".xo-c").forEach(b => b.onclick = () => {
      if (opt.mode === "ai" && turn !== opt.human) return;
      place(+b.dataset.i);
    });
    const q = s => app().querySelector(s);
    if (q("[data-next]")) q("[data-next]").onclick = nextRound;
    if (q("[data-again]")) q("[data-again]").onclick = () => { newMatch(); render(); aiTurn(); };
    if (q("[data-menu]")) q("[data-menu]").onclick = () => home();
    if (q("[data-restart]")) q("[data-restart]").onclick = () => { newMatch(); render(); aiTurn(); };
  }

  return {
    busy: true, act: `xo:${opt.mode}`,
    render() { alive = true; if (!board) newMatch(); render(); aiTurn(); },
    leave() { alive = false; clearTimeout(timer); },
  };
}
