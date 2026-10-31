import { app, header, bindBack, home, load, save, haptic } from "./core.js";

// Kataklar bir xil o'lchamda (CSS grid fon), raqamli plitkalar ustida absolyut joylashib, silliq suriladi.
const SLIDE_MS = 110;

export function game2048() {
  let tiles, score, best = +(load("2048-best") || 0), over = false, won = false, keepGoing = false, busy = false, nextId = 1;
  let showHelp = !load("2048-help-seen");

  const at = (r, c) => tiles.find(t => t.r === r && t.c === c && !t.dead);
  function addTile() {
    const free = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!at(r, c)) free.push([r, c]);
    if (!free.length) return;
    const [r, c] = free[(Math.random() * free.length) | 0];
    tiles.push({ id: nextId++, v: Math.random() < 0.9 ? 2 : 4, r, c, isNew: true });
  }
  function reset() {
    tiles = []; score = 0; over = false; won = false; keepGoing = false;
    addTile(); addTile();
  }

  function canMove() {
    if (tiles.filter(t => !t.dead).length < 16) return true;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const v = at(r, c)?.v;
      if ((c < 3 && at(r, c + 1)?.v === v) || (r < 3 && at(r + 1, c)?.v === v)) return true;
    }
    return false;
  }

  async function move(dir) {
    if (busy || over || (won && !keepGoing) || showHelp) return;
    tiles = tiles.filter(t => !t.dead);
    tiles.forEach(t => { t.isNew = false; t.merged = false; });
    const vec = { left: [0, -1], right: [0, 1], up: [-1, 0], down: [1, 0] }[dir];
    const order = [0, 1, 2, 3];
    const rows = vec[0] === 1 ? [...order].reverse() : order;
    const cols = vec[1] === 1 ? [...order].reverse() : order;
    let moved = false, gained = 0;
    for (const r of rows) for (const c of cols) {
      const t = at(r, c);
      if (!t) continue;
      let nr = r, nc = c;
      while (true) {
        const tr = nr + vec[0], tc = nc + vec[1];
        if (tr < 0 || tr > 3 || tc < 0 || tc > 3) break;
        const o = at(tr, tc);
        if (!o) { nr = tr; nc = tc; continue; }
        if (o.v === t.v && !o.merged && !o.dead) {
          // birlashish: t o'sha katakka siljiydi va yo'qoladi, o ikki baravar bo'ladi
          t.dead = true; o.merged = true; o.v *= 2; o.pending = true; gained += o.v;
          nr = tr; nc = tc;
        }
        break;
      }
      if (nr !== r || nc !== c) { t.r = nr; t.c = nc; moved = true; }
    }
    if (!moved) return;
    busy = true;
    score += gained;
    // 1) siljish animatsiyasi (eski qiymatlar bilan)
    tiles.forEach(t => { if (t.pending) { t.showV = t.v / 2; } });
    draw();
    await new Promise(r => setTimeout(r, SLIDE_MS));
    // 2) birlashganlar yangilanadi, yangi plitka chiqadi
    tiles = tiles.filter(t => !t.dead);
    tiles.forEach(t => { delete t.showV; t.pop = t.pending; delete t.pending; });
    addTile();
    if (gained) haptic("light");
    if (score > best) { best = score; save("2048-best", best); }
    if (!won && tiles.some(t => t.v >= 2048)) { won = true; haptic("ok"); }
    if (!canMove()) { over = true; haptic("error"); }
    busy = false;
    draw();
  }

  function draw() {
    const board = document.getElementById("g48");
    if (!board) return;
    const cell = board.clientWidth ? (board.clientWidth - 10 * 5) / 4 : 70;
    board.querySelector(".tiles").innerHTML = tiles.map(t => {
      const v = t.showV ?? t.v;
      const digits = String(v).length;
      const fs = cell * (digits <= 2 ? 0.46 : digits === 3 ? 0.38 : digits === 4 ? 0.3 : 0.24);
      return `<div class="tile v${Math.min(v, 4096)} ${t.isNew ? "new" : ""} ${t.pop ? "pop" : ""} ${t.dead ? "dead" : ""}"
        style="--r:${t.r};--c:${t.c};font-size:${fs}px">${v}</div>`;
    }).join("");
    document.getElementById("sc").textContent = score;
    document.getElementById("bs").textContent = best;
    const ov = document.getElementById("ov");
    ov.innerHTML = overlay();
    ov.querySelectorAll("[data-a]").forEach(b => b.onclick = () => action(b.dataset.a));
  }

  function overlay() {
    if (showHelp) return `<div class="overlay"><div class="card stack help">
      <h2>Qanday o'ynaladi?</h2>
      <div class="hrow"><span class="demo"><i class="tile v2">2</i><i class="tile v2">2</i></span><span>Barmoq bilan istalgan tomonga suring — hamma plitkalar o'sha tomonga siljiydi</span></div>
      <div class="hrow"><span class="demo"><i class="tile v4">4</i></span><span>Bir xil raqamlar to'qnashsa — qo'shilib bittaga aylanadi: 2+2=4, 4+4=8…</span></div>
      <div class="hrow"><span class="demo"><i class="tile v2048">2048</i></span><span>Maqsad — 2048 plitkasini yig'ish. Joy tugasa, o'yin tugaydi</span></div>
      <button class="btn green" data-a="help-ok">Tushundim, boshladik!</button></div></div>`;
    if (over || (won && !keepGoing)) return `<div class="overlay"><div class="card stack center">
      <h2>${won && !over ? "2048! 🎉" : "O'yin tugadi"}</h2>
      <p class="muted" style="margin:0">Hisob: <b>${score}</b>${score >= best && score ? " — yangi rekord!" : ""}</p>
      ${won && !over ? `<button class="btn green" data-a="keep">Davom etish</button>` : ""}
      <button class="btn" data-a="new">Qaytadan</button><button class="btn alt" data-a="menu">Menyuga</button></div></div>`;
    return "";
  }

  function action(a) {
    if (a === "help-ok") { showHelp = false; save("2048-help-seen", "1"); }
    if (a === "keep") keepGoing = true;
    if (a === "new") reset();
    if (a === "menu") return home();
    draw();
  }

  function render() {
    app().innerHTML = header("2048", `<button class="pill" data-help>?</button>`) + `
      <div class="scores">
        <div class="score"><span>Hisob</span><b id="sc">0</b></div>
        <div class="score"><span>Rekord</span><b id="bs">0</b></div>
        <button class="score newbtn" data-new>↻ Yangi</button>
      </div>
      <div class="g48" id="g48">
        <div class="cells">${"<i></i>".repeat(16)}</div>
        <div class="tiles"></div>
      </div>
      <p class="small muted" style="text-align:center;margin:14px 0 0">Suring ← → ↑ ↓ · bir xil raqamlar qo'shiladi</p>
      <div id="ov"></div>`;
    bindBack();
    app().querySelector("[data-new]").onclick = () => { reset(); draw(); };
    app().querySelector("[data-help]").onclick = () => { showHelp = true; draw(); };
    const el = document.getElementById("g48");
    let sx = 0, sy = 0, tracking = false;
    el.addEventListener("touchstart", e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; tracking = true; }, { passive: true });
    el.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
    el.addEventListener("touchend", e => {
      if (!tracking) return; tracking = false;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    });
    draw();
  }

  const onKey = e => {
    const d = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" }[e.key];
    if (d) { e.preventDefault(); move(d); }
  };
  const onResize = () => draw();

  reset();
  return {
    render() { render(); addEventListener("keydown", onKey); addEventListener("resize", onResize); },
    leave() { removeEventListener("keydown", onKey); removeEventListener("resize", onResize); },
  };
}
