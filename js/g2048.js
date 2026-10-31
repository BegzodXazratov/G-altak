import { app, header, bindBack, home, load, save, haptic, tg } from "./core.js";

export function game2048() {
  let grid, score, best = +(load("2048-best") || 0), over = false, won = false, keepGoing = false, fresh = new Set();
  const empty = () => grid.flatMap((v, i) => (v ? [] : [i]));

  function addTile() {
    const e = empty();
    if (!e.length) return;
    const i = e[(Math.random() * e.length) | 0];
    grid[i] = Math.random() < 0.9 ? 2 : 4;
    fresh.add(i);
  }
  function reset() {
    grid = new Array(16).fill(0); score = 0; over = false; won = false; keepGoing = false; fresh = new Set();
    addTile(); addTile();
  }

  // bir qatorni chapga surish
  function slide(line) {
    const a = line.filter(Boolean), out = [];
    let gained = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] === a[i + 1]) { out.push(a[i] * 2); gained += a[i] * 2; i++; }
      else out.push(a[i]);
    }
    while (out.length < 4) out.push(0);
    return { out, gained };
  }

  function move(dir) {
    if (over || (won && !keepGoing)) return;
    const idx = (r, c) => r * 4 + c;
    let moved = false, gained = 0;
    const ng = grid.slice();
    for (let k = 0; k < 4; k++) {
      const cells = [0, 1, 2, 3].map(j =>
        dir === "left" ? idx(k, j) : dir === "right" ? idx(k, 3 - j) : dir === "up" ? idx(j, k) : idx(3 - j, k));
      const { out, gained: g } = slide(cells.map(i => grid[i]));
      cells.forEach((i, j) => { if (ng[i] !== out[j]) moved = true; ng[i] = out[j]; });
      gained += g;
    }
    if (!moved) return;
    grid = ng; score += gained; fresh = new Set();
    if (gained) haptic("light");
    addTile();
    if (score > best) { best = score; save("2048-best", best); }
    if (!won && grid.includes(2048)) { won = true; haptic("ok"); }
    if (!canMove()) { over = true; haptic("error"); }
    render();
  }

  function canMove() {
    if (empty().length) return true;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const v = grid[r * 4 + c];
      if ((c < 3 && v === grid[r * 4 + c + 1]) || (r < 3 && v === grid[(r + 1) * 4 + c])) return true;
    }
    return false;
  }

  function render() {
    app().innerHTML = header("2048") + `
      <div class="scores">
        <div class="score"><span>Hisob</span><b>${score}</b></div>
        <div class="score"><span>Rekord</span><b>${best}</b></div>
        <button class="score" data-new style="text-align:center;font-weight:700">↻ Yangi</button>
      </div>
      <div class="g48" id="g48">${grid.map((v, i) =>
        `<div class="t ${fresh.has(i) ? "pop" : ""} ${v > 2048 ? "big" : ""}" data-v="${v || ""}">${v || ""}</div>`).join("")}</div>
      <p class="small muted" style="text-align:center;margin:12px 0 0">Barmoq bilan suring: bir xil raqamlar qo'shiladi</p>
      ${over || (won && !keepGoing) ? `<div class="overlay"><div class="card stack">
        <h2>${won && !over ? "2048! 🎉" : "O'yin tugadi"}</h2><p class="muted" style="margin:0">Hisob: ${score}${score >= best && score ? " — yangi rekord!" : ""}</p>
        ${won && !over ? `<button class="btn green" data-keep>Davom etish</button>` : ""}
        <button class="btn" data-new>Qaytadan</button><button class="btn alt" data-menu>Menyuga</button></div></div>` : ""}`;
    bindBack();
    app().querySelectorAll("[data-new]").forEach(b => b.onclick = () => { reset(); render(); });
    const k = app().querySelector("[data-keep]"); if (k) k.onclick = () => { keepGoing = true; render(); };
    const m = app().querySelector("[data-menu]"); if (m) m.onclick = home;
    const el = document.getElementById("g48");
    let sx = 0, sy = 0;
    el.addEventListener("touchstart", e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    el.addEventListener("touchend", e => {
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    });
  }

  const onKey = e => {
    const d = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" }[e.key];
    if (d) { e.preventDefault(); move(d); }
  };

  reset();
  return {
    render() { render(); addEventListener("keydown", onKey); },
    leave() { removeEventListener("keydown", onKey); },
  };
}
