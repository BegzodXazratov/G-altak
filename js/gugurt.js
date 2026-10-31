import { app, header, bindBack, show, home, me, api, read, toast, haptic, esc, load, save, shareInvite, copy,
  scoreCard, ratingLine, refreshProfile, nav } from "./core.js";
import { makeSet, evaluate, SEG_BITS, OP_BITS } from "./gugurt-engine.js";

const SECONDS = 60;

// ---------------- chizish (SVG) ----------------
const DW = 64, OW = 54, EW = 54, H = 124, GAP = 10;
// raqam segmentlari: [x1,y1,x2,y2]
const SEG = { 1: [12, 6, 52, 6], 2: [58, 12, 58, 56], 4: [58, 68, 58, 112], 8: [12, 118, 52, 118], 16: [6, 68, 6, 112], 32: [6, 12, 6, 56], 64: [12, 62, 52, 62] };
const OPS = { 1: [7, 62, 47, 62], 2: [27, 42, 27, 82] };

function stick([x1, y1, x2, y2], cls, data) {
  const horiz = y1 === y2;
  const len = horiz ? x2 - x1 : y2 - y1;
  const x = horiz ? x1 : x1 - 4.5, y = horiz ? y1 - 4.5 : y1;
  const w = horiz ? len : 9, h = horiz ? 9 : len;
  const hx = horiz ? x2 - 4 : x1, hy = horiz ? y1 : y1 + 4; // boshcha
  return `<g class="st ${cls}" ${data}>
    <rect class="hit" x="${horiz ? x1 - 4 : x1 - 12}" y="${horiz ? y1 - 12 : y1 - 4}" width="${horiz ? len + 8 : 24}" height="${horiz ? 24 : len + 8}" rx="6"/>
    <rect class="wood" x="${x}" y="${y}" width="${w}" height="${h}" rx="4.5"/>
    <ellipse class="head" cx="${hx}" cy="${hy}" rx="${horiz ? 7 : 6.5}" ry="${horiz ? 6.5 : 7}"/></g>`;
}

function svgFor(st, picked) {
  let x = 0, out = "";
  st.slots.forEach((s, i) => {
    if (i === st.eq) { // "=" belgisi (qimirlamaydi)
      out += `<g transform="translate(${x},0)">${stick([7, 52, 47, 52], "fixed", "")}${stick([7, 74, 47, 74], "fixed", "")}</g>`;
      x += EW + GAP;
    }
    const geo = s.t === "d" ? SEG : OPS, B = s.t === "d" ? SEG_BITS : OP_BITS;
    let g = "";
    for (const b of B) {
      const on = s.m & b, isPicked = picked && picked[0] === i && picked[1] === b;
      g += stick(geo[b], on ? (isPicked ? "on picked" : "on") : (picked ? "slot armed" : "slot"), `data-s="${i}" data-b="${b}"`);
    }
    out += `<g transform="translate(${x},0)">${g}</g>`;
    x += (s.t === "d" ? DW : OW) + GAP;
  });
  return `<svg class="eqsvg" viewBox="-14 -14 ${x + 18} ${H + 28}" preserveAspectRatio="xMidYMid meet">${out}</svg>`;
}

// ---------------- lobby ----------------
export function gugurtMenu() {
  return {
    render() {
      app().innerHTML = header("Gugurt") + scoreCard() + `
        <div class="card soz-intro" style="margin-top:12px">
          <b>Qanday o'ynaladi:</b> tenglama noto'g'ri. <b>Bitta</b> gugurt cho'pini bosib oling va boshqa joyga qo'ying —
          tenglama to'g'ri bo'lsin. 1 daqiqada kim ko'p topshiriq yechsa, o'sha yutadi.
          <div class="gdemo">${svgFor({ eq: 3, slots: [{ t: "d", m: 125 }, { t: "o", m: 3 }, { t: "d", m: 102 }, { t: "d", m: 102 }] }, null)}</div>
          <p class="small muted" style="margin:0;text-align:center">Masalan: <b>6 + 4 = 4</b> noto'g'ri. 6 ning o'rtadagi cho'pini o'ng-tepaga ko'chirsangiz — <b>0 + 4 = 4</b> ✅</p>
        </div>
        <div class="stack" style="margin-top:12px">
          <button class="bigbtn b-fast" data-act="match"><span class="ic">⚡</span><span><b>Tezkor o'yin</b><small>Tasodifiy raqib · reyting uchun</small></span></button>
          <button class="bigbtn b-friend" data-act="create"><span class="ic">🔗</span><span><b>Do'stni chaqirish</b><small>Havola yuboring</small></span></button>
          <button class="bigbtn b-ai" data-act="solo"><span class="ic">🎯</span><span><b>Yolg'iz mashq</b><small>1 daqiqada nechta? Rekord: ${load("gug-best") || 0}</small></span></button>
        </div>`;
      bindBack();
      app().querySelector('[data-act="solo"]').onclick = () => show(gugGame({ room: null, state: newState(true) }));
      app().querySelector('[data-act="create"]').onclick = () => startOnline("create");
      app().querySelector('[data-act="match"]').onclick = () => startOnline("match");
    },
  };
}

const newState = solo => ({ puzzles: makeSet(40), seconds: SECONDS, score: {}, solved: {},
  ...(solo ? { ends_at: Date.now() + 3000 + SECONDS * 1000 } : {}) });

async function startOnline(kind) {
  let room;
  try { room = await api(kind, { game: "gugurt", state: newState(false) }); } catch (e) { return toast(e.message); }
  openGugRoom(room, kind === "match");
}

export function openGugRoom(room, matching = false) {
  if (room.status === "playing" || room.status === "done") return show(gugGame({ room }));
  show(gugWaiting(room, matching));
}

function gugWaiting(room, matching) {
  let timer;
  return {
    render() {
      app().innerHTML = header(matching ? "Raqib qidirilmoqda" : "Do'stni kutyapmiz") + `
        <div class="card stack center">
          ${matching ? `<div class="radar"><span></span><span></span><span></span><b>🔥</b></div><p class="muted" style="margin:0">Raqib qidiryapmiz…</p>`
            : `<p class="muted" style="margin:0">Xona kodi</p><div class="code">${room.id}</div>
               <p class="small muted" style="margin:0">Do'stingiz kirishi bilan 1 daqiqalik bellashuv boshlanadi.</p>`}
          <button class="btn" data-share>📨 Do'stga yuborish</button>
          ${matching ? "" : `<button class="btn alt" data-copy>Kodni nusxalash</button>`}
        </div>`;
      bindBack();
      app().querySelector("[data-share]").onclick = () => shareInvite(room.id, `Gugurt jumboqlarida bellashamizmi? 🔥 Xona: ${room.id}`);
      const c = app().querySelector("[data-copy]"); if (c) c.onclick = () => copy(room.id);
      timer = setInterval(async () => {
        try {
          const r = await read("g_room_get", { p_id: room.id });
          if (r.status === "playing") { clearInterval(timer); haptic("ok"); show(gugGame({ room: r }), false); }
        } catch (e) {}
      }, 1200);
    },
    leave() { clearInterval(timer); },
  };
}

// ---------------- o'yin ----------------
function gugGame(opt) {
  let room = opt.room || null;
  let st = room ? room.state : opt.state;
  const meKey = room ? (room.p1 === me().id ? "p1" : "p2") : "p1";
  const themKey = meKey === "p1" ? "p2" : "p1";
  let idx = 0, work = null, picked = null, locked = false, poll = null, tick = null, finishing = false, alive = true, local = 0;

  const myScore = () => room ? Math.max(st.score?.[meKey] || 0, local) : local;
  const theirScore = () => st.score?.[themKey] || 0;
  const left = () => Math.max(0, Math.ceil(((st.ends_at || 0) - Date.now()) / 1000));
  const started = () => Date.now() >= (st.ends_at || 0) - (st.seconds || SECONDS) * 1000;
  const done = () => room ? room.status === "done" : left() === 0;
  const loadPuzzle = () => { work = JSON.parse(JSON.stringify(st.puzzles[idx % st.puzzles.length])); picked = null; };

  async function tapStick(s, b) {
    if (locked || done() || !started()) return;
    const on = work.slots[s].m & b;
    if (on) {
      picked = picked && picked[0] === s && picked[1] === b ? null : [s, b];
      haptic("light"); drawEq(); return;
    }
    if (!picked) { haptic("light"); toast("Avval bitta cho'pni bosib oling"); return; }
    // ko'chirish
    const start = st.puzzles[idx % st.puzzles.length];
    work.slots[picked[0]].m &= ~picked[1];
    work.slots[s].m |= b;
    const placed = [s, b];
    picked = null;
    drawEq(placed);
    const ev = evaluate(work);
    locked = true;
    if (ev.ok) {
      haptic("ok"); flash("good");
      local++;
      const answer = JSON.parse(JSON.stringify(work)), myIdx = idx;
      if (room) api("gsolve", { id: room.id, idx: myIdx, answer }).then(r => { if (r?.id) { room = r; st = r.state; drawBar(); } }).catch(() => {});
      setTimeout(() => { idx++; loadPuzzle(); locked = false; drawEq(); drawBar(); }, 650);
    } else {
      haptic("error"); flash("bad");
      setTimeout(() => { work = JSON.parse(JSON.stringify(start)); locked = false; drawEq(); }, 750);
    }
  }

  function skip() {
    if (locked || done() || !started()) return;
    idx++; loadPuzzle(); drawEq(); haptic("light");
  }
  function reset() { if (locked) return; loadPuzzle(); drawEq(); }

  function flash(kind) {
    const el = document.querySelector(".eqbox"); if (!el) return;
    el.classList.remove("good", "bad"); void el.offsetWidth; el.classList.add(kind);
  }

  function drawEq(placed) {
    const box = document.querySelector(".eqbox"); if (!box) return;
    box.innerHTML = svgFor(work, picked);
    if (placed) box.querySelector(`.st[data-s="${placed[0]}"][data-b="${placed[1]}"]`)?.classList.add("drop");
    box.querySelectorAll(".st[data-s]").forEach(g => g.onclick = () => tapStick(+g.dataset.s, +g.dataset.b));
    document.querySelector(".gnum").textContent = `${idx + 1}-topshiriq`;
    document.querySelector(".ghint").textContent = picked ? "Endi bo'sh joyga qo'ying 👆" : "Bitta cho'pni bosing";
  }

  function drawBar() {
    if (!alive) return;
    const t = left(), clock = started() ? `${(t / 60) | 0}:${String(t % 60).padStart(2, "0")}` : "…";
    const bar = document.querySelector(".sbar"); if (!bar) return;
    bar.innerHTML = room ? `
      <div class="side mine"><b>${myScore()}</b><span>Siz</span></div>
      <div class="timer ${t <= 10 && started() ? "low" : ""}">${clock}</div>
      <div class="side theirs"><b>${theirScore()}</b><span>${esc(meKey === "p1" ? room.p2_name || "Raqib" : room.p1_name || "Raqib")}</span></div>` : `
      <div class="side mine"><b>${local}</b><span>Yechildi</span></div>
      <div class="timer ${t <= 10 && started() ? "low" : ""}">${clock}</div>
      <div class="side"><b>${load("gug-best") || 0}</b><span>Rekord</span></div>`;
    const cd = document.getElementById("cd");
    if (cd) cd.innerHTML = !started() && !done() ? `<div class="countdown">${Math.max(1, Math.ceil(((st.ends_at - (st.seconds || SECONDS) * 1000) - Date.now()) / 1000))}</div>` : "";
    const ov = document.getElementById("ov");
    const want = done() ? endOverlay() : "";
    if (ov.dataset.html !== want) { ov.innerHTML = want; ov.dataset.html = want; ov.querySelectorAll("[data-end]").forEach(b => b.onclick = () => endAction(b.dataset.end)); }
  }

  function endOverlay() {
    if (!room) {
      const best = Math.max(local, +(load("gug-best") || 0)); save("gug-best", best);
      return `<div class="overlay"><div class="card stack center"><h2>Vaqt tugadi ⏱</h2>
        <p class="muted" style="margin:0"><b>${local}</b> ta topshiriq yechildi · rekord ${best}</p>
        <button class="btn green" data-end="again">Yana o'ynash</button><button class="btn alt" data-end="menu">Menyuga</button></div></div>`;
    }
    const res = room.result || {};
    const title = res.winner === "draw" ? "Durang 🤝" : res.winner === meKey ? "Siz yutdingiz! 🏆" : res.winner ? "Raqib yutdi" : "Natija hisoblanmoqda…";
    const offer = room.state?.rematch && room.state.rematch_by !== me().id;
    return `<div class="overlay"><div class="card stack center"><h2>${title}</h2>
      <p class="muted" style="margin:0">Yechildi: <b>${st.score?.[meKey] || 0}</b> : ${theirScore()}</p>${ratingLine(room)}
      <button class="btn green" data-end="rematch">${offer ? "✅ Revanshni qabul qilish" : "🔁 Revansh"}</button>
      <button class="btn alt" data-end="lb">🏆 Reyting</button><button class="btn alt" data-end="menu">Menyuga</button></div></div>`;
  }

  async function endAction(a) {
    if (a === "menu") return home();
    if (a === "lb") return show(nav.leaderboard("gugurt"));
    if (a === "again") return show(gugGame({ room: null, state: newState(true) }), false);
    if (a === "rematch") {
      try {
        const r = await api("rematch", { id: room.id, state: newState(false) });
        if (r.error) return toast("Revansh ochilmadi");
        if (r.status === "playing") show(gugGame({ room: r }), false);
        else show(gugWaiting(r, false), false);
      } catch (e) { toast(e.message); }
    }
  }

  function render() {
    app().innerHTML = header("Gugurt") + `
      <div class="sbar"></div>
      <div class="gtop"><span class="gnum"></span><span class="ghint"></span></div>
      <div class="gwrap"><div class="eqbox"></div><div id="cd"></div></div>
      <div class="gbtns"><button class="btn alt" data-reset>↺ Qaytarish</button><button class="btn alt" data-skip>O'tkazib yuborish →</button></div>
      <div id="ov"></div>`;
    bindBack();
    app().querySelector("[data-reset]").onclick = reset;
    app().querySelector("[data-skip]").onclick = skip;
    loadPuzzle(); drawEq(); drawBar();
  }

  return {
    render() {
      alive = true;
      render();
      tick = setInterval(async () => {
        drawBar();
        if (room && room.status === "playing" && left() === 0 && !finishing) {
          finishing = true;
          try { const r = await api("finish", { id: room.id }); if (r.id) { room = r; st = r.state; } } catch (e) {}
          if (room.status === "done") refreshProfile(); else setTimeout(() => finishing = false, 1500);
          drawBar();
        }
      }, 400);
      if (room && !poll) {
        poll = setInterval(async () => {
          try {
            const r = await read("g_room_get", { p_id: room.id });
            if (!r.error && r.version > room.version) {
              const before = theirScore();
              room = r; st = r.state;
              if (theirScore() > before) haptic("medium");
              if (r.status === "done") refreshProfile();
              drawBar();
            }
          } catch (e) {}
        }, 1000);
      }
    },
    leave() { alive = false; clearInterval(poll); clearInterval(tick); poll = null; },
  };
}
