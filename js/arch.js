import { isMe, waitScreen, markJoining } from "./core.js";
import { app, header, bindBack, show, home, api, read, toast, haptic, esc, load, save, scoreCard, ratingLine, refreshProfile, nav, sleep } from "./core.js";
import { W, H, X, LIVES, terrain, initArch, simulate, applyShot, aiShot } from "./arch-engine.js";

const heart = (n, max = LIVES) => "❤️".repeat(n) + "🖤".repeat(Math.max(0, max - n));

export function archMenu() {
  let level = load("arch-level") || "orta", first = load("arch-first") || "p1", showAi = false;
  return {
    render() {
      app().innerHTML = header("Kamonchi") + `
        ${scoreCard()}
        <div class="stack">
          <button class="bigbtn b-fast" data-act="match"><span class="ic">⚡</span><span><b>Tezkor o'yin</b><small>Tasodifiy raqib · reytingga ta'sir qiladi</small></span></button>
          <button class="bigbtn b-friend" data-act="online"><span class="ic">🔗</span><span><b>Do'stni chaqirish</b><small>Havola yuboring — u bossa, o'yin boshlanadi</small></span></button>
          <button class="bigbtn b-ai" data-act="ai-toggle"><span class="ic">🤖</span><span><b>Kompyuter bilan</b><small>Mashq qilish uchun</small></span></button>
          ${showAi ? `<div class="card stack">
            <div class="seg">${[["oson", "Oson"], ["orta", "O'rta"], ["qiyin", "Qiyin"]].map(([k, l]) => `<button data-level="${k}" aria-pressed="${level === k}">${l}</button>`).join("")}</div>
            <div class="seg">${[["p1", "Birinchi otaman"], ["p2", "Ikkinchi otaman"]].map(([k, l]) => `<button data-first="${k}" aria-pressed="${first === k}">${l}</button>`).join("")}</div>
            <button class="btn green" data-act="ai">Boshlash</button></div>` : ""}
          <button class="bigbtn b-local" data-act="local"><span class="ic">📱</span><span><b>Bitta telefonda</b><small>Yonma-yon o'tirib, navbat bilan</small></span></button>
          <p class="small muted rules">Har kimda 5 ta jon. Burchak va kuchni tanlab otasiz, shamolni hisobga oling. Boshga tegsa — 2 jon ketadi. Online o'yinda yurishga 1 daqiqa.</p>
        </div>`;
      bindBack();
      const root = app();
      root.querySelectorAll("[data-level]").forEach(b => b.onclick = () => { level = b.dataset.level; save("arch-level", level); this.render(); });
      root.querySelectorAll("[data-first]").forEach(b => b.onclick = () => { first = b.dataset.first; save("arch-first", first); this.render(); });
      root.querySelector('[data-act="ai-toggle"]').onclick = () => { showAi = !showAi; this.render(); };
      const ai = root.querySelector('[data-act="ai"]');
      if (ai) ai.onclick = () => show(gameScreen({ mode: "ai", human: first, level }));
      root.querySelector('[data-act="local"]').onclick = () => show(gameScreen({ mode: "local" }));
      root.querySelector('[data-act="online"]').onclick = () => startOnline("create");
      root.querySelector('[data-act="match"]').onclick = () => startOnline("match");
    },
  };
}
const sideOf = r => isMe(r.p1) ? "p1" : "p2";
async function startOnline(kind) {
  let room;
  try { room = await api(kind, { game: "arch" }); } catch (e) { return toast(e.message); }
  if (room.status === "playing") return show(gameScreen({ mode: "online", room, mySide: sideOf(room) }));
  show(waitingScreen(room, kind === "match"));
}
export async function createPrivate(invited = "") {
  const room = await api("create", { game: "arch" });
  if (!room?.id) throw new Error("Xona ochilmadi");
  show(waitingScreen(room, false, invited));
  return room;
}
function waitingScreen(room, matching, invited = "") {
  return waitScreen(room, { matching, invited, icon: "🏹", shareText: "Kamonchi o'ynaymizmi? 🏹",
    onStart: r => show(gameScreen({ mode: "online", room: r, mySide: sideOf(r) }), false) });
}
export function openArchRoom(r) {
  if (isMe(r.p1) && r.status === "waiting") return show(waitingScreen(r, false));
  show(gameScreen({ mode: "online", room: r, mySide: sideOf(r) }));
}

function archer(side, st, aim, hurt) {
  const h = terrain(st.seed), x = X[side], y = H - h(x), dir = side === "p1" ? 1 : -1;
  const col = side === "p1" ? "#3aa0ff" : "#ff6a4d";
  return `<g class="arc ${hurt ? "hurt" : ""}" transform="translate(${x} ${y})">
    <line x1="0" y1="-3" x2="-1.4" y2="0" stroke="${col}" stroke-width="1" stroke-linecap="round"/><line x1="0" y1="-3" x2="1.4" y2="0" stroke="${col}" stroke-width="1" stroke-linecap="round"/>
    <line x1="0" y1="-3" x2="0" y2="-6.6" stroke="${col}" stroke-width="1.1" stroke-linecap="round"/>
    <circle cx="0" cy="-7.8" r="1.7" fill="${col}"/>
    <g transform="translate(0 -5.6) scale(${dir} 1) rotate(${-aim})"><path d="M2.4,-4 Q6.2,0 2.4,4" fill="none" stroke="#e8c27a" stroke-width=".9" stroke-linecap="round"/><line x1="2.4" y1="-4" x2="2.4" y2="4" stroke="#fff" stroke-width=".25"/><line x1="0" y1="0" x2="5.4" y2="0" stroke="#fff" stroke-width=".4"/></g></g>`;
}

function gameScreen(opt) {
  let room = opt.room || null, st = room?.state?.hp ? room.state : initArch();
  let shown = null, anim = false, sending = false, alive = true, poll = null, clk = null, deadline = 0, seen = st.seq || 0;
  const aim = { p1: { a: 45, p: 70 }, p2: { a: 45, p: 70 } };
  const setClock = r => { deadline = r && r.turn_left != null && r.status === "playing" ? Date.now() + r.turn_left * 1000 : 0; };
  setClock(room);
  const names = () => opt.mode === "ai" ? (opt.human === "p1" ? ["Siz", "Kompyuter"] : ["Kompyuter", "Siz"]) : opt.mode === "local" ? ["1-o'yinchi", "2-o'yinchi"] : [room.p1_name || "O'yinchi 1", room.p2_name || "O'yinchi 2"];
  const myTurn = () => !st.winner && !anim && !sending && (opt.mode === "local" || (opt.mode === "ai" ? st.turn === opt.human : room?.status === "playing" && st.turn === opt.mySide));
  const tickClock = () => {
    const el = document.getElementById("tclk"); if (!el) return;
    if (!deadline || st.winner || room?.status !== "playing") { el.textContent = ""; return; }
    const t = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    el.textContent = `⏱ ${(t / 60) | 0}:${String(t % 60).padStart(2, "0")}`;
    el.className = "tclk" + (t <= 15 ? " low" : "") + (st.turn === opt.mySide ? " mine" : "");
  };

  async function fly(last) {
    const arrow = document.getElementById("arrow"); if (!arrow || !last?.path) return;
    const pts = last.path; anim = true;
    arrow.setAttribute("opacity", 1);
    const step = Math.max(1, Math.round(pts.length / 45));
    for (let i = 1; i < pts.length; i += step) {
      const [x0, y0] = pts[Math.max(0, i - 1)], [x1, y1] = pts[i];
      arrow.setAttribute("x1", x0); arrow.setAttribute("y1", H - y0); arrow.setAttribute("x2", x1 + (x1 - x0) * 0.8); arrow.setAttribute("y2", H - y1 - (y1 - y0) * 0.8);
      await sleep(28);
    }
    arrow.setAttribute("opacity", 0);
    anim = false;
  }
  async function showShot(prev, next) {
    shown = prev; render();
    await fly(next.last);
    if (next.last.hit) { haptic("medium"); toast(next.last.dmg === 2 ? "🎯 Boshga tegdi! −2 jon" : "🎯 Tegdi! −1 jon"); }
    else haptic("light");
    shown = null; st = next; render();
  }

  async function fire() {
    if (!myTurn()) return;
    const me = st.turn, { a, p } = aim[me];
    if (opt.mode === "online") {
      sending = true; render();
      try {
        const r = await api("ashot", { id: room.id, version: room.version, angle: a, power: p });
        sending = false;
        if (r.error === "stale") { room = r; setClock(r); if (r.state?.hp) { st = r.state; seen = st.seq; } toast("O'yin yangilandi"); render(); }
        else if (r.error) { toast("O'q otilmadi"); render(); }
        else { const prev = st; room = r; setClock(r); seen = r.state.seq; await showShot(prev, r.state); if (r.status === "done") refreshProfile(); }
      } catch (e) { sending = false; toast("Internet bilan muammo — o'q otilmadi"); render(); }
      return;
    }
    const prev = st, next = applyShot(st, me, a, p);
    if (opt.mode === "ai" && next.winner === opt.human) api("aiwin", { game: "arch" }).catch(() => {});
    await showShot(prev, next);
    aiTurn();
  }
  function aiTurn() {
    if (opt.mode !== "ai" || st.winner || st.turn === opt.human || anim) return;
    anim = true; render();
    setTimeout(async () => {
      if (!alive) return;
      const s = aiShot(st, st.turn, opt.level); anim = false;
      const prev = st, next = applyShot(st, st.turn, s.angle, s.power);
      aim[prev.turn] = { a: Math.round(s.angle), p: Math.round(s.power) };
      await showShot(prev, next); aiTurn();
    }, 700);
  }

  function render() {
    if (!alive) return;
    const v = shown || st, h = terrain(st.seed), [n1, n2] = names();
    let poly = `0,${H}`; for (let x = 0; x <= W; x += 2) poly += ` ${x},${(H - h(x)).toFixed(1)}`; poly += ` ${W},${H}`;
    const cur = st.turn, can = myTurn(), a = aim[cur];
    const hurt = side => !!shown && shown.hp[side] > st.hp[side];
    const wd = Math.abs(st.wind) < 0.3 ? "tinch" : `${st.wind > 0 ? "➡️" : "⬅️"} ${Math.abs(st.wind).toFixed(1)}`;
    let status;
    if (opt.mode === "online") status = st.turn === opt.mySide ? "Sizning navbatingiz" : "Raqib mo'ljallayapti…";
    else if (opt.mode === "ai") status = st.turn === opt.human ? "Sizning navbatingiz" : "Kompyuter mo'ljallayapti…";
    else status = (cur === "p1" ? "1-o'yinchi" : "2-o'yinchi") + " otadi";
    const right = opt.mode === "online" ? (room.status === "playing" ? `<button class="pill" data-resign>🏳️ Taslim</button>` : "") : `<button class="pill" data-restart>↻ Qaytadan</button>`;
    app().innerHTML = header("Kamonchi", right) + `
      <div class="status">${st.winner ? "O'yin tugadi" : status}${opt.mode === "online" && room?.status === "playing" && !st.winner ? ` <span id="tclk" class="tclk"></span>` : ""}</div>
      <div class="arch-hud"><div class="${cur === "p1" && !st.winner ? "on" : ""}"><b>${esc(n1)}</b><span>${heart(v.hp.p1)}</span></div><div class="wind">💨 ${wd}</div><div class="${cur === "p2" && !st.winner ? "on" : ""} r"><b>${esc(n2)}</b><span>${heart(v.hp.p2)}</span></div></div>
      <svg class="arch-scene" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-label="Kamonchi maydoni">
        <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3a67"/><stop offset="1" stop-color="#e58a5b"/></linearGradient></defs>
        <rect width="${W}" height="${H}" fill="url(#sky)"/><circle cx="82" cy="12" r="5" fill="#ffe3a3" opacity=".85"/>
        <polygon points="${poly}" fill="#3b6b3a"/><polyline points="${poly.split(" ").slice(1, -1).join(" ")}" fill="none" stroke="#5e9c4b" stroke-width="1"/>
        ${archer("p1", st, cur === "p1" ? a.a : aim.p1.a, hurt("p1"))}${archer("p2", st, cur === "p2" ? a.a : aim.p2.a, hurt("p2"))}
        <polyline id="prev" points="" fill="none" stroke="#fff" stroke-width=".5" stroke-dasharray="1.2 1.6" opacity=".8"/>
        <line id="arrow" x1="0" y1="0" x2="0" y2="0" stroke="#fff" stroke-width=".7" stroke-linecap="round" opacity="0"/>
      </svg>
      <div class="arch-ctl ${can ? "" : "off"}">
        <label><span>Burchak <b id="va">${a.a}°</b></span><input type="range" id="ra" min="10" max="80" value="${a.a}" ${can ? "" : "disabled"}></label>
        <label><span>Kuch <b id="vp">${a.p}%</b></span><input type="range" id="rp" min="20" max="100" value="${a.p}" ${can ? "" : "disabled"}></label>
        <button class="btn green" data-fire ${can ? "" : "disabled"}>🏹 Otish</button>
      </div>
      ${st.winner || room?.status === "done" ? endOverlay() : ""}`;
    bindBack();
    const ra = document.getElementById("ra"), rp = document.getElementById("rp");
    const preview = () => {
      const pv = document.getElementById("prev"); if (!pv) return;
      if (!can) { pv.setAttribute("points", ""); return; }
      const r = simulate({ ...st, wind: st.wind }, cur, aim[cur].a, aim[cur].p);
      pv.setAttribute("points", r.path.slice(0, 9).map(([x, y]) => `${x},${H - y}`).join(" "));
    };
    if (can) {
      const upd = () => {
        aim[cur] = { a: +ra.value, p: +rp.value };
        document.getElementById("va").textContent = ra.value + "°"; document.getElementById("vp").textContent = rp.value + "%";
        const bow = app().querySelector(`.arc:${cur === "p1" ? "first-of-type" : "last-of-type"} g[transform*="rotate"]`);
        if (bow) bow.setAttribute("transform", `translate(0 -5.6) scale(${cur === "p1" ? 1 : -1} 1) rotate(${-ra.value})`);
        preview();
      };
      ra.oninput = rp.oninput = upd; preview();
      app().querySelector("[data-fire]").onclick = fire;
    }
    const rs = app().querySelector("[data-restart]"); if (rs) rs.onclick = restart;
    const rg = app().querySelector("[data-resign]"); if (rg) rg.onclick = resign;
    app().querySelectorAll("[data-end]").forEach(b => b.onclick = () => endAction(b.dataset.end));
    tickClock();
  }

  function endOverlay() {
    let title, sub = "";
    const res = room?.result;
    let win = st.winner === "p1" ? 1 : st.winner === "p2" ? -1 : null;
    if (res && !res.cancelled) win = res.winner === "draw" ? 0 : res.winner === "p1" ? 1 : -1;
    const me = opt.mode === "ai" ? (opt.human === "p1" ? 1 : -1) : opt.mode === "online" ? (opt.mySide === "p1" ? 1 : -1) : null;
    if (win === 0) title = "Durang 🤝";
    else if (me === null) title = (win === 1 ? "1-o'yinchi" : "2-o'yinchi") + " yutdi! 🏆";
    else if (me === win) { title = "Siz yutdingiz! 🏆"; haptic("ok"); }
    else { title = "Bu safar yutqazdingiz"; sub = "Revansh olasizmi?"; }
    if (room?.state?.timeout) sub = isMe(room.state.resigned) ? "Yurish vaqti (1 daqiqa) tugadi" : "Raqib 1 daqiqada otmadi — g'alaba sizniki";
    else if (room?.state?.resigned) sub = isMe(room.state.resigned) ? "Siz taslim bo'ldingiz" : (room.state.left ? "Raqib o'yinni tashlab chiqib ketdi — g'alaba sizniki" : "Raqib taslim bo'ldi");
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
    if (a === "lb") return show(nav.leaderboard("arch"));
    if (a === "rematch") {
      try {
        const r = await api("rematch", { id: room.id, game: "arch" });
        if (r.error) return toast("Revansh ochilmadi");
        if (r.status === "playing") show(gameScreen({ mode: "online", room: r, mySide: sideOf(r) }), false); else show(waitingScreen(r, false), false);
      } catch (e) { toast(e.message); }
    }
  }
  async function resign() {
    if (!confirm("Taslim bo'lasizmi? Reytingdan ochko yo'qotasiz.")) return;
    try { room = await api("resign", { id: room.id }); st = { ...st, winner: opt.mySide === "p1" ? "p2" : "p1" }; render(); } catch (e) { toast(e.message); }
  }
  function restart() { if (opt.mode === "online") return; st = initArch(); shown = null; anim = false; render(); aiTurn(); }

  return {
    busy: true, act: `arch:${opt.mode}`,
    render() {
      alive = true; render(); aiTurn();
      if (opt.mode === "online") {
        clk = setInterval(tickClock, 250);
        poll = setInterval(async () => {
          if (sending || anim) return;
          try {
            const r = await read("g_room_get", { p_id: room.id });
            if (r.error || r.version <= room.version) return;
            const prev = st; room = r; setClock(r);
            if (r.state.seq !== seen && r.state.last) { seen = r.state.seq; await showShot(prev, r.state); }
            else { st = r.state; render(); }
            if (r.status === "done") { refreshProfile(); render(); }
          } catch (e) {}
        }, 1100);
      }
    },
    leave() { alive = false; clearInterval(poll); clearInterval(clk); },
  };
}
