// SH-chyot: maydondagi sonlarni yo'l bo'ylab qo'shib, o'zingizga berilgan sonlarni birinchi bo'lib toping
import { isMe, waitScreen, app, header, bindBack, show, home, api, read, toast, haptic, esc, load, save,
  scoreCard, ratingLine, refreshProfile, nav } from "./core.js";

const N = 9;
const COUNTS = [5, 7, 9];
const adj = (a, b) => a !== b && Math.abs(((a / N) | 0) - ((b / N) | 0)) <= 1 && Math.abs((a % N) - (b % N)) <= 1;
const count = () => { const v = +load("shch-n"); return COUNTS.includes(v) ? v : 7; };

export function shchMenu() {
  return {
    render() {
      const n = count();
      app().innerHTML = header("SH-chyot") + scoreCard() + `
        <div class="card soz-intro" style="margin-top:12px">
          <b>Qanday o'ynaladi:</b> maydonda 1 dan 15 gacha sonlar. Sizga <b>${n} ta maqsad son</b> beriladi (har biri 77 dan oshmaydi).
          Barmog'ingizni qo'shni kataklar bo'ylab yurgizing (diagonal ham mumkin) — sonlar yig'indisi maqsad songa teng bo'lsin.
          Hamma maqsad sonlarni birinchi topgan yutadi.
          <p class="small muted" style="margin:8px 0 0">Masalan: <b>7 + 3 + 5 = 15</b>. Har bir o'yinchining maqsadlari o'zinikidir, maydon umumiy.</p>
        </div>
        <p class="lbl" style="margin:14px 4px 6px">Nechta son topiladi</p>
        <div class="seg tpick">${COUNTS.map(c => `<button data-n="${c}" aria-pressed="${n === c}">${c} ta</button>`).join("")}</div>
        <div class="stack" style="margin-top:12px">
          <button class="bigbtn b-fast" data-act="match"><span class="ic">⚡</span><span><b>Tezkor o'yin</b><small>Tasodifiy raqib · reyting uchun</small></span></button>
          <button class="bigbtn b-friend" data-act="create"><span class="ic">👥</span><span><b>Do'stni chaqirish</b><small>Do'stlar yoki havola orqali</small></span></button>
        </div>`;
      bindBack();
      app().querySelectorAll("[data-n]").forEach(b => b.onclick = () => { save("shch-n", b.dataset.n); haptic("light"); this.render(); });
      app().querySelector('[data-act="create"]').onclick = () => startOnline("create");
      app().querySelector('[data-act="match"]').onclick = () => startOnline("match");
    },
  };
}

async function startOnline(kind) {
  let room;
  try { room = await api(kind, { game: "shch", count: count() }); } catch (e) { return toast(e.message); }
  openShchRoom(room, kind === "match");
}
export function openShchRoom(room, matching = false) {
  if (room.status === "playing" || room.status === "done") return show(shchGame({ room }));
  show(shchWaiting(room, matching));
}
export async function createPrivate(invited = "") {
  const room = await api("create", { game: "shch", count: count() });
  if (!room?.id) throw new Error("Xona ochilmadi");
  show(shchWaiting(room, false, invited));
  return room;
}
function shchWaiting(room, matching, invited = "") {
  return waitScreen(room, { matching, invited, icon: "🧮", shareText: "SH-chyotda bellashamizmi? 🧮",
    onStart: r => show(shchGame({ room: r }), false) });
}

function shchGame(opt) {
  let room = opt.room;
  let st = room.state;
  const meKey = isMe(room.p1) ? "p1" : "p2", themKey = meKey === "p1" ? "p2" : "p1";
  let path = [], dragging = false, poll = null, tick = null, finishing = false, alive = true, pending = 0;

  const mine = () => st.targets?.[meKey] || [];
  const foundBy = k => st.found?.[k] || [];
  const left = () => Math.max(0, Math.ceil(((st.ends_at || 0) - Date.now()) / 1000));
  const started = () => Date.now() >= (st.ends_at || 0) - (st.seconds || 240) * 1000;
  const done = () => room.status === "done";
  const sumOf = cells => cells.reduce((s, i) => s + st.grid[i], 0);

  async function submit(cells) {
    if (cells.length < 2) return;
    const sum = sumOf(cells);
    if (foundBy(meKey).includes(sum)) { toast(`${sum} ni allaqachon topgansiz`); flash("bad"); return; }
    if (!mine().includes(sum)) { haptic("error"); flash("bad"); showMsg(`${sum} — sizning sonlaringiz orasida yo'q`); return; }
    haptic("ok"); flash("good", `${sum} ✓`);
    pending++;
    st.found = { ...st.found, [meKey]: [...foundBy(meKey), sum] }; draw();
    try {
      const r = await api("shch_claim", { id: room.id, path: cells });
      if (r.id) { room = r; st = r.state; if (r.status === "done") refreshProfile(); }
      else if (r.error) { toast("Bu yo'l qabul qilinmadi"); const rr = await read("g_room_get", { p_id: room.id }); if (rr.id) { room = rr; st = rr.state; } }
    } catch (e) { toast("Internet bilan muammo"); }
    pending--; draw();
  }
  function showMsg(t) {
    const el = document.querySelector(".hinttxt"); if (!el) return;
    el.textContent = t; clearTimeout(showMsg.t); showMsg.t = setTimeout(() => { if (el.isConnected) el.textContent = ""; }, 2200);
  }
  function flash(kind, text) {
    const g = document.querySelector(".wgrid"); if (!g) return;
    g.classList.add(kind); setTimeout(() => g.classList.remove(kind), 320);
    if (text) { const f = document.createElement("div"); f.className = "plus"; f.textContent = text; document.querySelector(".wwrap")?.appendChild(f); setTimeout(() => f.remove(), 800); }
  }

  function draw() {
    if (!alive || !document.querySelector(".wgrid")) return;
    const sel = new Set(path);
    document.querySelectorAll(".lt").forEach(el => {
      const i = +el.dataset.i;
      el.classList.toggle("sel", sel.has(i)); el.classList.toggle("head", path[path.length - 1] === i);
    });
    const pv = document.querySelector(".preview");
    if (path.length) {
      const sum = sumOf(path), hit = path.length > 1 && mine().includes(sum) && !foundBy(meKey).includes(sum);
      pv.textContent = `${path.map(i => st.grid[i]).join(" + ")} = ${sum}`;
      pv.className = `preview ${hit ? "ok" : "typing"}`;
    } else { pv.textContent = started() ? "Kataklar bo'ylab chizing" : "Tayyorlaning…"; pv.className = "preview"; }
    const t = left(), total = mine().length;
    const clock = started() ? `${(t / 60) | 0}:${String(t % 60).padStart(2, "0")}` : "…";
    document.querySelector(".sbar").innerHTML = `
      <div class="side mine"><b>${foundBy(meKey).length}/${total}</b><span>Siz</span></div>
      <div class="timer ${t <= 10 && started() ? "low" : ""}">${clock}</div>
      <div class="side theirs"><b>${foundBy(themKey).length}/${total}</b><span>${esc(meKey === "p1" ? room.p2_name || "Raqib" : room.p1_name || "Raqib")}</span></div>`;
    const got = new Set(foundBy(meKey));
    document.querySelector(".tgts").innerHTML = mine().map(n => `<span class="tg ${got.has(n) ? "got" : ""}">${n}</span>`).join("");
    const cd = document.getElementById("cd");
    if (cd) cd.innerHTML = !started() && !done() ? `<div class="countdown">${Math.max(1, Math.ceil(((st.ends_at - (st.seconds || 240) * 1000) - Date.now()) / 1000))}</div>` : "";
    const ov = document.getElementById("ov"), want = done() ? endOverlay() : "";
    if (ov.dataset.html !== want) { ov.innerHTML = want; ov.dataset.html = want; ov.querySelectorAll("[data-end]").forEach(b => b.onclick = () => endAction(b.dataset.end)); }
  }

  function endOverlay() {
    const a = foundBy(meKey).length, b = foundBy(themKey).length, total = mine().length;
    const res = room.result || {};
    const title = res.winner === "draw" ? "Durang 🤝" : res.winner === meKey ? "Siz yutdingiz! 🏆" : res.winner ? "Raqib yutdi" : "Natija hisoblanmoqda…";
    const offer = room.state?.rematch && !isMe(room.state.rematch_by);
    const leftNote = room.state?.left ? `<p class="small muted" style="margin:0">${isMe(room.state.resigned) ? "Siz o'yindan chiqib ketgansiz" : "Raqib o'yinni tashlab chiqib ketdi"}</p>` : "";
    return `<div class="overlay"><div class="card stack center"><h2>${title}</h2>
      <p class="muted" style="margin:0">Topilgan sonlar: <b>${a}</b>/${total} : ${b}/${total}</p>${ratingLine(room)}${leftNote}
      <button class="btn green" data-end="rematch">${offer ? "✅ Revanshni qabul qilish" : "🔁 Revansh"}</button>
      <button class="btn alt" data-end="lb">🏆 Reyting</button><button class="btn alt" data-end="menu">Menyuga</button></div></div>`;
  }
  async function endAction(a) {
    if (a === "menu") return home();
    if (a === "lb") return show(nav.leaderboard("all"));
    if (a === "rematch") {
      try {
        const r = await api("rematch", { id: room.id, game: "shch", count: st.count });
        if (r.error) return toast("Revansh ochilmadi");
        if (r.status === "playing") show(shchGame({ room: r }), false); else show(shchWaiting(r, false), false);
      } catch (e) { toast(e.message); }
    }
  }

  function render() {
    app().innerHTML = header("SH-chyot") + `
      <div class="sbar"></div>
      <div class="tgts"></div>
      <div class="preview"></div>
      <div class="wwrap"><div class="wgrid nums">${st.grid.map((v, i) => `<div class="lt n${v}" data-i="${i}"><b>${v}</b></div>`).join("")}</div><div id="cd"></div></div>
      <div class="hinttxt"></div>
      <div id="ov"></div>`;
    bindBack();
    const grid = document.querySelector(".wgrid");
    const cellAt = (x, y) => {
      const el = document.elementFromPoint(x, y)?.closest?.(".lt"); if (!el) return null;
      const r = el.getBoundingClientRect();
      const dx = (x - (r.left + r.width / 2)) / r.width, dy = (y - (r.top + r.height / 2)) / r.height;
      return dx * dx + dy * dy < 0.2 ? +el.dataset.i : null;
    };
    grid.addEventListener("pointerdown", e => {
      if (done() || !started()) return;
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".lt"); if (!el) return;
      dragging = true; path = [+el.dataset.i]; grid.setPointerCapture(e.pointerId); haptic("light"); draw();
    });
    grid.addEventListener("pointermove", e => {
      if (!dragging) return;
      const i = cellAt(e.clientX, e.clientY);
      if (i === null || i === path[path.length - 1]) return;
      if (path.length > 1 && i === path[path.length - 2]) { path.pop(); draw(); return; }
      if (path.includes(i) || !adj(i, path[path.length - 1])) return;
      path.push(i); haptic("light"); draw();
    });
    const end = () => { if (!dragging) return; dragging = false; const cells = path; path = []; draw(); submit(cells); };
    grid.addEventListener("pointerup", end);
    grid.addEventListener("pointercancel", () => { dragging = false; path = []; draw(); });
    grid.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
    draw();
  }

  return {
    busy: true,
    render() {
      alive = true; render();
      tick = setInterval(async () => {
        draw();
        if (room.status === "playing" && left() === 0 && !finishing && started()) {
          finishing = true;
          try { const r = await api("finish", { id: room.id }); if (r.id) { room = r; st = r.state; } } catch (e) {}
          if (room.status === "done") refreshProfile(); else finishing = false;
          draw();
        }
      }, 400);
      poll = setInterval(async () => {
        if (pending) return;
        try {
          const r = await read("g_room_get", { p_id: room.id });
          if (!r.error && r.version > room.version) { room = r; st = r.state; if (r.status === "done") refreshProfile(); draw(); }
        } catch (e) {}
      }, 1000);
    },
    leave() { alive = false; clearInterval(poll); clearInterval(tick); poll = null; },
  };
}
