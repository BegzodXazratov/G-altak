import { isMe, waitScreen, markJoining } from "./core.js";
import { app, header, bindBack, show, home, api, read, toast, haptic, esc, load, save, scoreCard, ratingLine, refreshProfile, nav, sleep } from "./core.js";
import { W, H, ROUNDS, GROUND, PW, BOW_Y, ANG_MIN, ANG_MAX, layout, rng, hazards, wallOn, HEART_SEC, initArch, norm, arrowsLeft, applyShot, aiShot } from "./arch-engine.js";

const PULL_MAX = 28, MIN_POWER = 15; // sahna birligida: shuncha tortilsa — 100% kuch
const COL = { p1: "#3aa0ff", p2: "#ff6a4d" };
const SVGNS = "http://www.w3.org/2000/svg";
const sy = y => +(H - y).toFixed(2);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

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
          <p class="small muted rules">Ikki kamonchi turli balandlikdagi minoralarda turadi, joylari har o'yinda o'zgaradi. Har kimda ${ROUNDS} ta o'q, navbat bilan otiladi. Tanaga tegsa 1, boshga tegsa 2 ball. Hamma o'qlar otilgach ko'p ball to'plagan yutadi (durang bo'lsa — qo'shimcha o'q). Ekranga barmog'ingizni qo'yib orqaga torting — kamon tortiladi, qo'yib yuborsangiz o'q uchadi. Mo'ljal chizig'i yo'q: burchak, kuch va shamolni o'zingiz hisoblang. Online o'yinda yurishga 1 daqiqa.</p>
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

/* ───────── tovush (oddiy sintez, fayl kerak emas) ───────── */
let actx = null;
const audioInit = () => { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume(); } catch (e) {} };
function tone(t, f0, f1, dur, vol, type = "triangle") {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(t, dur, vol, f0, f1) {
  const n = Math.floor(actx.sampleRate * dur), buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
  s.buffer = buf; f.type = "bandpass"; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(50, f1), t + dur); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(actx.destination); s.start(t);
}
function sfx(kind) {
  if (load("arch-snd") === "0" || !actx) return;
  try {
    const t = actx.currentTime;
    if (kind === "shoot") { tone(t, 380, 90, 0.14, 0.2); noise(t, 0.22, 0.2, 3000, 700); }
    else if (kind === "hit") { tone(t, 170, 45, 0.24, 0.45, "sine"); noise(t, 0.2, 0.35, 900, 200); }
    else if (kind === "stick") { tone(t, 240, 110, 0.07, 0.25, "square"); }
    else if (kind === "pull") { noise(t, 0.35, 0.05, 500, 1300); }
  } catch (e) {}
}

/* ───────── sahna (fon, minoralar) ───────── */
const PAL = [
  { sky: ["#2b3a67", "#e58a5b"], sun: "#ffe3a3", far: "#4b4f86", near: "#3c5a66", stars: false },
  { sky: ["#3d8fd6", "#c4e6f7"], sun: "#fff6c9", far: "#86a9cc", near: "#5f9b78", stars: false },
  { sky: ["#141b3d", "#5b4f8f"], sun: "#e9ecff", far: "#2c3466", near: "#243e57", stars: true },
];
const sceneMemo = {};
function scenery(seed) {
  if (sceneMemo[seed]) return sceneMemo[seed];
  const L = layout(seed), r = rng(seed * 31 + 7), pal = PAL[seed % 3];
  let s = `<defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.sky[0]}"/><stop offset="1" stop-color="${pal.sky[1]}"/></linearGradient>
    <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5e9c4b"/><stop offset="1" stop-color="#2f5a2e"/></linearGradient>
    <linearGradient id="rock" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9a8a79"/><stop offset=".55" stop-color="#7a6c5e"/><stop offset="1" stop-color="#4d4339"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  if (pal.stars) for (let i = 0; i < 26; i++) s += `<circle cx="${(r() * W).toFixed(1)}" cy="${(r() * H * 0.5).toFixed(1)}" r="${(0.12 + r() * 0.25).toFixed(2)}" fill="#fff" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`;
  s += `<circle cx="${(15 + r() * 70).toFixed(1)}" cy="${(10 + r() * 12).toFixed(1)}" r="5.2" fill="${pal.sun}" opacity=".9"/>`;
  for (let i = 0; i < 4; i++) { const cx = r() * W, cy = 9 + r() * 22, k = 0.8 + r() * 0.9; s += `<g class="cloud" style="animation-delay:-${(r() * 30).toFixed(1)}s" opacity=".55" fill="#fff"><ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(7 * k).toFixed(1)}" ry="${(1.7 * k).toFixed(1)}"/><ellipse cx="${(cx + 3 * k).toFixed(1)}" cy="${(cy - 1.2 * k).toFixed(1)}" rx="${(4.5 * k).toFixed(1)}" ry="${(1.6 * k).toFixed(1)}"/></g>`; }
  let far = `0,${H - GROUND}`; for (let x = 0; x <= W; x += 8) far += ` ${x},${(H - GROUND - 12 - r() * 15).toFixed(1)}`; far += ` ${W},${H - GROUND}`;
  s += `<polygon points="${far}" fill="${pal.far}" opacity=".85"/>`;
  let near = `0,${H - GROUND}`; for (let x = 0; x <= W; x += 5) near += ` ${x},${(H - GROUND - 4 - 2.5 * Math.sin(x * 0.11 + seed) - r() * 3).toFixed(1)}`; near += ` ${W},${H - GROUND}`;
  s += `<polygon points="${near}" fill="${pal.near}"/>`;
  s += `<rect x="0" y="${H - GROUND}" width="${W}" height="${GROUND}" fill="url(#grass)"/>`;
  for (let i = 0; i < 7; i++) { // daraxtlar
    const x = 3 + r() * 94; if (Math.abs(x - L.x.p1) < 7 || Math.abs(x - L.x.p2) < 7) continue;
    const k = 0.8 + r() * 0.9;
    s += `<rect x="${(x - 0.35 * k).toFixed(1)}" y="${(H - GROUND - 3.2 * k).toFixed(1)}" width="${(0.7 * k).toFixed(1)}" height="${(3.4 * k).toFixed(1)}" fill="#4a3424"/><ellipse cx="${x.toFixed(1)}" cy="${(H - GROUND - 4.4 * k).toFixed(1)}" rx="${(2.4 * k).toFixed(1)}" ry="${(3.1 * k).toFixed(1)}" fill="#2f6b3a"/>`;
  }
  for (const side of ["p1", "p2"]) { // minoralar
    const x = L.x[side], top = L.top[side];
    s += `<ellipse cx="${x}" cy="${H - GROUND + 0.4}" rx="${PW + 3.5}" ry="1" fill="#000" opacity=".25"/>`;
    s += `<polygon points="${x - PW},${sy(top)} ${x + PW},${sy(top)} ${x + PW + 1.2},${sy(GROUND)} ${x - PW - 1.2},${sy(GROUND)}" fill="url(#rock)"/>`;
    for (let yy = top - 4 - r() * 3; yy > GROUND + 2; yy -= 4 + r() * 4) { const dx = (top - yy) / (top - GROUND) * 1.2; s += `<line x1="${(x - PW - dx).toFixed(1)}" y1="${sy(yy)}" x2="${(x + PW + dx).toFixed(1)}" y2="${sy(yy)}" stroke="#000" stroke-opacity=".16" stroke-width=".25"/>`; }
    for (let k = 0; k < 3; k++) { const cx = x + (r() - 0.5) * PW * 1.6, y1 = top - 1 - r() * 6; s += `<path d="M${cx.toFixed(1)},${sy(y1)} l${((r() - 0.5) * 1.4).toFixed(1)},${(1.5 + r() * 2.5).toFixed(1)}" stroke="#000" stroke-opacity=".22" stroke-width=".22" fill="none"/>`; }
    s += `<rect x="${x - PW - 0.5}" y="${sy(top) - 0.25}" width="${2 * PW + 1}" height="1.15" rx=".5" fill="#5e9c4b"/>`;
  }
  return (sceneMemo[seed] = s);
}

/* ───────── kamonchi chizmasi ───────── */
function arrowShape(len = 7, shaft = "#e0d2b0") {
  return `<line x1="${-len}" y1="0" x2="0" y2="0" stroke="${shaft}" stroke-width=".34" stroke-linecap="round"/><polygon points="-1.15,-.5 0,0 -1.15,.5" fill="#d3d8de"/>
    <path d="M${-len},0 l-1,-.75 M${-len + 0.8},0 l-1,-.75 M${-len},0 l-1,.75 M${-len + 0.8},0 l-1,.75" stroke="#e8453c" stroke-width=".28" fill="none" stroke-linecap="round"/>`;
}
function bowShape(pull, armed, arms = true) {
  const nx = 1.6 - pull * 4.6;
  return `${arms ? `<path d="M0,.2 L3.5,0" stroke="#e6c19a" stroke-width=".85" stroke-linecap="round"/><path d="M0,.3 Q${(nx / 2).toFixed(2)},1.7 ${nx.toFixed(2)},.15" stroke="#e6c19a" stroke-width=".8" fill="none" stroke-linecap="round"/>` : ""}
    <path d="M1.6,-5.2 Q5.6,0 1.6,5.2" fill="none" stroke="#b9792f" stroke-width=".95" stroke-linecap="round"/><rect x="3.2" y="-.7" width=".9" height="1.4" rx=".3" fill="#4a2f17"/>
    <path d="M1.6,-5.2 L${nx.toFixed(2)},0 L1.6,5.2" fill="none" stroke="#f3efe0" stroke-width=".2"/>
    ${armed ? `<g transform="translate(${(nx + 7.3).toFixed(2)} 0)">${arrowShape(7.3)}</g>` : ""}
    ${arms ? `<circle cx="${nx.toFixed(2)}" cy=".1" r=".5" fill="#e6c19a"/>` : ""}`;
}
// p: { hp, aim, pull, armed, dead, hit, wounds:[[dx,dy,dmg]], stuck:{dx,dy,deg}|null }
function archerInner(side, p) {
  const col = COL[side], dir = side === "p1" ? 1 : -1, lost = (p.wounds || []).length, skin = "#f0c8a0";
  let s = lost > 0 ? `<ellipse cx="0" cy=".15" rx="${Math.min(5, 0.9 + lost * 0.6).toFixed(2)}" ry=".38" fill="#7a0c12" opacity=".88"/>` : "";
  s += `<g class="${p.dead ? "fall" + (dir > 0 ? 1 : 2) : p.hit ? "jerk" + (dir > 0 ? 1 : 2) : ""}"><g transform="scale(${dir} 1)">
    <path d="M-.2,-3.4 L-1.4,-.2 M.2,-3.4 L1.3,-.2" stroke="#2a2f45" stroke-width="1.05" stroke-linecap="round"/><path d="M-2,0 h1.3 M.7,0 h1.4" stroke="#1b1e2e" stroke-width=".7" stroke-linecap="round"/>
    <g transform="translate(-1.3 -5.2) rotate(14)"><rect x="-.55" y="-1.6" width="1.1" height="3.2" rx=".3" fill="#6b4a2b"/><path d="M-.25,-1.6 v-1 M0,-1.6 v-1.2 M.25,-1.6 v-1" stroke="#e8453c" stroke-width=".25"/></g>
    <polygon points="-1.05,-3.3 1.05,-3.3 .85,-6.55 -.85,-6.55" fill="${col}"/><path d="M-1.05,-3.6 h2.1" stroke="#2b2118" stroke-width=".3"/>
    <circle cx="0" cy="-7.7" r="1.65" fill="${skin}"/><path d="M-1.65,-7.9 A1.65,1.65 0 0 1 1.65,-7.9 Z" fill="#3b2a20"/><path d="M-1.65,-7.9 h3.3" stroke="${col}" stroke-width=".38"/><circle cx=".75" cy="-7.45" r=".17" fill="${p.dead ? "none" : "#2b2118"}"/>
    ${p.dead ? `<path d="M.4,-7.7 l.7,.5 M1.1,-7.7 l-.7,.5" stroke="#2b2118" stroke-width=".18"/>` : ""}
    ${p.dead ? `<g transform="translate(2.2 -.7) rotate(-8)">${bowShape(0, false, false)}</g>` : `<g transform="translate(0 ${-BOW_Y}) rotate(${-p.aim})">${bowShape(p.pull, p.armed)}</g>`}
  </g>`;
  for (const [dx, dy, d] of p.wounds || []) {
    const x = clamp(dx, -0.9, 0.9), y = -dy;
    s += `<circle cx="${x}" cy="${y}" r="${d === 2 ? 0.95 : 0.65}" fill="#a50f18"/><circle cx="${x}" cy="${y}" r="${d === 2 ? 0.45 : 0.3}" fill="#6d0910"/><path class="drip" d="M${x},${y} v${(2 + d).toFixed(1)}" stroke="#a50f18" stroke-width=".32" stroke-linecap="round" fill="none"/>`;
  }
  if (p.stuck) s += `<g transform="translate(${clamp(p.stuck.dx, -1.2, 1.2)} ${-p.stuck.dy}) rotate(${-p.stuck.deg})">${arrowShape(6.4)}</g>`;
  return s + `</g>`;
}

function svgEl(tag, attrs, parent) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

function gameScreen(opt) {
  let room = opt.room || null, st = room?.state?.hp ? norm(room.state) : initArch();
  let shown = null, anim = false, sending = false, alive = true, poll = null, clk = null, deadline = 0, seen = st.seq || 0;
  const aimMem = { p1: { a: 35, p: 0 }, p2: { a: 35, p: 0 } };
  let drag = null, dragFx = null, pullNow = null, hitSide = null, snd = load("arch-snd") !== "0";
  const setClock = r => { deadline = r && r.turn_left != null && r.status === "playing" ? Date.now() + r.turn_left * 1000 : 0; };
  setClock(room);
  const names = () => opt.mode === "ai" ? (opt.human === "p1" ? ["Siz", "Kompyuter"] : ["Kompyuter", "Siz"]) : opt.mode === "local" ? ["1-o'yinchi", "2-o'yinchi"] : [room.p1_name || "O'yinchi 1", room.p2_name || "O'yinchi 2"];
  const myTurn = () => !st.winner && !anim && !sending && !shown && (opt.mode === "local" || (opt.mode === "ai" ? st.turn === opt.human : room?.status === "playing" && st.turn === opt.mySide));
  const ownShot = side => opt.mode === "local" || (opt.mode === "ai" ? side === opt.human : side === opt.mySide);
  const tickClock = () => {
    const el = document.getElementById("tclk"); if (!el) return;
    if (!deadline || st.winner || room?.status !== "playing") { el.textContent = ""; return; }
    const t = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    el.textContent = `⏱ ${(t / 60) | 0}:${String(t % 60).padStart(2, "0")}`;
    el.className = "tclk" + (t <= 15 ? " low" : "") + (st.turn === opt.mySide ? " mine" : "");
  };
  const el = id => document.getElementById(id);
  let tSeq = -1, tStart = Date.now(), heartTm = null, forceHeart = false;
  const elapsed = () => { if (st.seq !== tSeq) { tSeq = st.seq; tStart = Date.now(); } return (Date.now() - tStart) / 1000; };
  const hazSvg = () => {
    const H0 = hazards(st.seed, st.seq || 0), e = elapsed();
    const walls = H0.walls.map((w, i) => `<rect class="wall" data-w="${i}" x="${w.x - w.hw}" y="${sy(w.y + w.h)}" width="${w.hw * 2}" height="${w.h}" rx=".5" style="animation-duration:${w.per}s;animation-delay:-${w.ph}s"/>`).join("");
    const heart = H0.heart && (forceHeart || e < HEART_SEC) ? `<g id="heart" class="heart" transform="translate(${H0.heart.x} ${sy(H0.heart.y)})"><circle r="${H0.heart.r}" fill="#ff4d6d" opacity=".18"/><text text-anchor="middle" y="1.9" font-size="6">❤️</text></g>` : "";
    return `<g id="haz">${walls}${heart}</g>`;
  };
  const armHeart = () => {
    clearTimeout(heartTm); const H0 = hazards(st.seed, st.seq || 0); if (!H0.heart || forceHeart) return;
    const left = HEART_SEC - elapsed(); if (left <= 0) return;
    heartTm = setTimeout(() => { const h = el("heart"); if (h && !forceHeart) h.remove(); }, left * 1000);
  };

  /* — kamonchi holati — */
  function poseOf(side) {
    const v = shown || st, dead = !!v.winner && v.winner !== side;
    let aim = aimMem[side].a, pull = 0, armed = false;
    if (pullNow && pullNow.side === side) { aim = pullNow.a; pull = pullNow.p / 100; armed = true; }
    else if (!dead && !anim && !sending && !st.winner && !shown && side === st.turn) armed = true;
    const lastHit = !shown && st.last && st.last.hit === side;
    const L = layout(st.seed);
    return { aim, pull, armed, dead, hit: hitSide === side, wounds: v.wounds?.[side] || [],
      stuck: lastHit && st.last.at ? { dx: st.last.at[0] - L.x[side], dy: st.last.at[1] - L.top[side], deg: st.last.deg || 0 } : null };
  }
  const drawActor = side => { const g = el("act-" + side); if (g) g.innerHTML = archerInner(side, poseOf(side)); };
  const drawActors = () => { drawActor("p1"); drawActor("p2"); };
  const hudTxt = (v, side) => `🎯 ${v.score[side]} · 🏹 ${arrowsLeft(v, side)}`;
  const updateHud = () => { const v = shown || st; const a = el("hp1"), b = el("hp2"); if (a) a.textContent = hudTxt(v, "p1"); if (b) b.textContent = hudTxt(v, "p2"); };

  /* — o'q parvozi va effektlar — */
  const frame = () => new Promise(r => requestAnimationFrame(r));
  async function drawBack(side, angle, power) {
    aimMem[side].a = angle;
    if (ownShot(side)) { pullNow = { side, a: angle, p: power }; drawActor(side); await sleep(120); return; }
    sfx("pull"); const t0 = performance.now(), D = 520;
    for (;;) {
      if (!alive) return;
      const f = Math.min(1, (performance.now() - t0) / D);
      pullNow = { side, a: angle, p: power * (1 - (1 - f) ** 2) }; drawActor(side);
      if (f >= 1) break; await frame();
    }
    await sleep(160);
  }
  async function fly(last) {
    const arrow = el("arrow"), trail = el("trail"); if (!arrow || !last?.path) return;
    const pts = last.path, total = pts.length - 1, MS = 26, HZ = hazards(st.seed, st.seq || 0), wEls = HZ.walls.map((_, i) => document.querySelector(`[data-w="${i}"]`));
    wEls.forEach(w => { if (w) { w.style.animation = 'none'; } });
    arrow.setAttribute("opacity", 1); sfx("shoot");
    const t0 = performance.now(), tr = [];
    for (;;) {
      if (!alive) return;
      const f = Math.min(total, (performance.now() - t0) / MS), i = Math.min(total - 1, Math.floor(f)), k = f - i;
      const [x0, y0] = pts[i], [x1, y1] = pts[Math.min(total, i + 1)];
      const x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k, th = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI;
      arrow.setAttribute("transform", `translate(${x.toFixed(2)} ${sy(y)}) rotate(${(-th).toFixed(1)})`);
      HZ.walls.forEach((w, i) => { if (wEls[i]) wEls[i].setAttribute('opacity', wallOn(w, f * 0.04) ? 0.95 : 0.12); });
      tr.push(`${x.toFixed(1)},${sy(y)}`); if (tr.length > 60) tr.shift();
      trail.setAttribute("points", tr.join(" "));
      if (f >= total) break; await frame();
    }
    arrow.setAttribute("opacity", 0); trail.setAttribute("points", "");
    if (last.heart) { const h = el("heart"); if (h) h.remove(); sfx("hit"); toast("❤️ Jon topdingiz! +1 jon, +1 ball"); }
  }
  async function bloodBurst(x, y0, deg, dmg, floorY, feetX) {
    const fx = el("fx"); if (!fx) return;
    const y = sy(y0), n = dmg === 2 ? 48 : 28, base = -deg * Math.PI / 180, reds = ["#b3121b", "#8d0c14", "#d6202b", "#6d0910"], ps = [];
    const mist = svgEl("circle", { cx: x, cy: y, r: 1, fill: "#b3121b", opacity: 0.55 }, fx);
    for (let i = 0; i < n; i++) {
      const fwd = Math.random() < 0.65, ang = fwd ? base + (Math.random() - 0.5) * 1.1 : -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
      const sp = (fwd ? 14 + Math.random() * 34 : 6 + Math.random() * 16) * (dmg === 2 ? 1.25 : 1), r = 0.25 + Math.random() * (dmg === 2 ? 0.85 : 0.6);
      ps.push({ e: svgEl("circle", { cx: x, cy: y, r, fill: reds[i % 4] }, fx), x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r, life: 0.45 + Math.random() * 0.6, t: 0, rest: false });
    }
    const txt = svgEl("text", { x, y: y - 2, class: "pop", "text-anchor": "middle" }, fx); txt.textContent = dmg === 2 ? "BOSHGA! −2" : "−1";
    let last = performance.now();
    for (;;) {
      if (!alive) return;
      await frame(); const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
      let live = 0;
      for (const p of ps) {
        p.t += dt; if (p.t >= p.life + 0.35) { p.e.setAttribute("opacity", 0); continue; } live++;
        if (!p.rest) {
          p.vy += 95 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.y >= floorY && Math.abs(p.x - feetX) < PW) { p.y = floorY; p.rest = true; p.e.setAttribute("ry", p.r * 0.35); p.e.setAttribute("rx", p.r * 1.5); }
          p.e.setAttribute("cx", p.x.toFixed(2)); p.e.setAttribute("cy", p.y.toFixed(2));
        }
        if (p.t > p.life) p.e.setAttribute("opacity", Math.max(0, 1 - (p.t - p.life) / 0.35));
      }
      mist.setAttribute("r", (parseFloat(mist.getAttribute("r")) + dt * 9).toFixed(2)); mist.setAttribute("opacity", Math.max(0, parseFloat(mist.getAttribute("opacity")) - dt * 0.9).toFixed(2));
      if (!live) break;
    }
    fx.innerHTML = "";
  }
  async function showShot(prev, next) {
    const last = next.last, L = layout(st.seed); anim = true;
    shown = prev; forceHeart = !!last.heart; render(); forceHeart = false;
    await drawBack(last.by, last.angle, last.power);
    pullNow = null; drawActor(last.by);
    await fly(last);
    if (last.hit) {
      const v = last.hit, dmg = last.dmg, sc = el("scene");
      sfx("hit"); haptic(dmg === 2 ? "heavy" : "medium");
      shown = { ...prev, hp: next.hp, wounds: next.wounds, score: next.score, shots: next.shots, winner: next.winner }; hitSide = v; drawActors(); updateHud();
      if (sc) { sc.classList.remove("shake"); void sc.getBoundingClientRect(); sc.classList.add("shake"); }
      const fl = el("flash"); if (fl) { fl.setAttribute("class", ""); void fl.getBoundingClientRect(); fl.setAttribute("class", "flash" + dmg); }
      toast(dmg === 2 ? "🎯 Boshga tegdi! +2 ball" : "🎯 Tegdi! +1 ball");
      await bloodBurst(last.at[0], last.at[1], last.deg || 0, dmg, sy(L.top[v]), L.x[v]);
      hitSide = null;
      if (next.winner) await sleep(650);
    } else {
      sfx("stick"); haptic("light"); shown = { ...prev, score: next.score, shots: next.shots, winner: next.winner }; drawActors(); updateHud();
      await sleep(next.winner ? 900 : 280);
    }
    shown = null; st = next; anim = false; render();
  }

  /* — otish — */
  async function fire(a, p) {
    if (!myTurn()) return;
    const me = st.turn;
    if (opt.mode === "online") {
      sending = true; render();
      try {
        const r = await api("ashot", { id: room.id, version: room.version, angle: a, power: p, el: Math.round(elapsed() * 10) / 10 });
        sending = false;
        if (r.error === "stale") { pullNow = null; room = r; setClock(r); if (r.state?.hp) { st = norm(r.state); seen = st.seq; } toast("O'yin yangilandi"); render(); }
        else if (r.error) { pullNow = null; toast("O'q otilmadi"); render(); }
        else { const prev = st; room = r; setClock(r); seen = r.state.seq; await showShot(prev, r.state); if (r.status === "done") refreshProfile(); }
      } catch (e) { sending = false; pullNow = null; toast("Internet bilan muammo — o'q otilmadi"); render(); }
      return;
    }
    const prev = st, next = applyShot(st, me, a, p, elapsed());
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
      await showShot(prev, next); aiTurn();
    }, 700);
  }

  /* — sensor bilan tortish — */
  function toWorld(e) { const svg = el("scene"), m = svg.getScreenCTM().inverse(), p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m); return [p.x, p.y]; }
  function aimFrom(d) {
    const dx = d.a[0] - d.cur[0], dy = d.cur[1] - d.a[1], dist = Math.hypot(dx, dy), side = st.turn, dir = side === "p1" ? 1 : -1;
    const deg = dist < 1.5 ? aimMem[side].a : clamp(Math.atan2(dy, dx * dir) * 180 / Math.PI, ANG_MIN, ANG_MAX);
    return { a: Math.round(deg), p: Math.round(clamp(dist / PULL_MAX, 0, 1) * 100) };
  }
  function dragUpdate() {
    const side = st.turn, { a, p } = aimFrom(drag);
    pullNow = { side, a, p }; drawActor(side);
    el("va").textContent = a + "°"; el("vp").textContent = p + "%"; el("pw").style.width = p + "%";
    el("pw").className = p < MIN_POWER ? "weak" : "";
    if (dragFx) { dragFx.d0.setAttribute("cx", drag.cx0); dragFx.d0.setAttribute("cy", drag.cy0); dragFx.d1.setAttribute("cx", drag.cx); dragFx.d1.setAttribute("cy", drag.cy); dragFx.ln.setAttribute("x1", drag.cx0); dragFx.ln.setAttribute("y1", drag.cy0); dragFx.ln.setAttribute("x2", drag.cx); dragFx.ln.setAttribute("y2", drag.cy); }
  }
  function dragEnd() {
    if (dragFx) { dragFx.root.remove(); dragFx = null; }
    drag = null;
  }
  function bindDrag() {
    const play = el("play"); if (!play) return;
    play.onpointerdown = e => {
      if (!myTurn() || drag) return;
      e.preventDefault(); audioInit();
      try { play.setPointerCapture(e.pointerId); } catch (_) {}
      drag = { id: e.pointerId, a: toWorld(e), cur: toWorld(e), cx0: e.clientX, cy0: e.clientY, cx: e.clientX, cy: e.clientY };
      const root = svgEl("svg", { class: "dragfx" }); document.body.appendChild(root);
      dragFx = { root, ln: svgEl("line", { stroke: "#fff", "stroke-opacity": ".55", "stroke-width": 2, "stroke-dasharray": "5 5" }, root), d0: svgEl("circle", { r: 15, fill: "none", stroke: "#fff", "stroke-opacity": ".6", "stroke-width": 2 }, root), d1: svgEl("circle", { r: 9, fill: "#fff", "fill-opacity": ".35" }, root) };
      haptic("light"); dragUpdate();
    };
    play.onpointermove = e => {
      if (!drag || e.pointerId !== drag.id) return;
      drag.cur = toWorld(e); drag.cx = e.clientX; drag.cy = e.clientY; dragUpdate();
    };
    const up = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const { a, p } = aimFrom(drag), side = st.turn; dragEnd();
      if (e.type === "pointercancel" || p < MIN_POWER) {
        pullNow = null; drawActor(side); el("pw").style.width = "0%";
        if (e.type !== "pointercancel") toast("Kuchliroq torting 💪");
        return;
      }
      aimMem[side] = { a, p };
      fire(a, p);
    };
    play.onpointerup = up; play.onpointercancel = up;
  }

  function render() {
    if (!alive) return;
    dragEnd();
    const v = shown || st, L = layout(st.seed), [n1, n2] = names();
    const cur = st.turn, can = myTurn();
    const wd = Math.abs(st.wind) < 0.3 ? "tinch" : `${st.wind > 0 ? "➡️" : "⬅️"} ${Math.abs(st.wind).toFixed(1)}`;
    let status;
    if (opt.mode === "online") status = st.turn === opt.mySide ? "Sizning navbatingiz" : "Raqib mo'ljallayapti…";
    else if (opt.mode === "ai") status = st.turn === opt.human ? "Sizning navbatingiz" : "Kompyuter mo'ljallayapti…";
    else status = (cur === "p1" ? "1-o'yinchi" : "2-o'yinchi") + " otadi";
    const sndBtn = `<button class="pill" data-snd aria-label="Tovush">${snd ? "🔊" : "🔇"}</button>`;
    const right = sndBtn + (opt.mode === "online" ? (room.status === "playing" ? `<button class="pill" data-resign>🏳️ Taslim</button>` : "") : `<button class="pill" data-restart>↻ Qaytadan</button>`);
    const flag = side => { const x = L.x[side] + (side === "p1" ? -3.2 : 3.2), t = L.top[side], len = 2 + Math.min(4, Math.abs(st.wind)) * 0.8, d = st.wind >= 0 ? 1 : -1;
      return `<line x1="${x}" y1="${sy(t)}" x2="${x}" y2="${sy(t + 10.5)}" stroke="#d9d2c3" stroke-width=".35"/><polygon class="flagp" points="${x},${sy(t + 10.5)} ${x + d * len},${sy(t + 9.7)} ${x},${sy(t + 8.8)}" fill="${COL[side]}"/>`; };
    const miss = !shown && st.last && !st.last.hit && st.last.end ? `<g transform="translate(${st.last.end[0]} ${sy(st.last.end[1])}) rotate(${-(st.last.deg || 0)})">${arrowShape(6.4)}</g>` : "";
    const hint = can ? "👆 Ekranga barmog'ingizni qo'ying va <b>orqaga torting</b> — qo'yib yuborsangiz o'q uchadi" : shown || sending ? "🏹 O'q uchmoqda…" : st.winner ? "O'yin tugadi" : "⏳ " + status;
    app().innerHTML = header("Kamonchi", right) + `
      <div class="status">${st.winner ? "O'yin tugadi" : status}${opt.mode === "online" && room?.status === "playing" && !st.winner ? ` <span id="tclk" class="tclk"></span>` : ""}</div>
      <div class="arch-hud"><div class="${cur === "p1" && !st.winner ? "on" : ""}"><b>${esc(n1)}</b><span id="hp1">${hudTxt(v, "p1")}</span></div><div class="wind">💨 ${wd}</div><div class="${cur === "p2" && !st.winner ? "on" : ""} r"><b>${esc(n2)}</b><span id="hp2">${hudTxt(v, "p2")}</span></div></div>
      <div id="play" class="arch-play">
      <svg id="scene" class="arch-scene" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-label="Kamonchi maydoni">
        ${scenery(st.seed)}${flag("p1")}${flag("p2")}${hazSvg()}${miss}
        <g id="act-p1" transform="translate(${L.x.p1} ${sy(L.top.p1)})"></g><g id="act-p2" transform="translate(${L.x.p2} ${sy(L.top.p2)})"></g>
        <polyline id="trail" points="" fill="none" stroke="#fff" stroke-width=".22" opacity=".4"/>
        <g id="arrow" opacity="0">${arrowShape(7)}</g>
        <g id="fx"></g><rect id="flash" width="${W}" height="${H}" fill="#c1121f" opacity="0" pointer-events="none"/>
      </svg>
      <div class="arch-pad ${can ? "" : "off"}"><div class="pad-t">${hint}</div>
        <div class="pad-r"><span>Burchak <b id="va">—</b></span><div class="pwr"><i id="pw" style="width:0%"></i></div><span>Kuch <b id="vp">—</b></span></div></div>
      </div>
      ${st.winner && !shown && !anim || room?.status === "done" && !anim ? endOverlay() : ""}`;
    bindBack(); drawActors(); armHeart();
    if (can) bindDrag();
    const sb = app().querySelector("[data-snd]"); if (sb) sb.onclick = () => { snd = !snd; save("arch-snd", snd ? "1" : "0"); sb.textContent = snd ? "🔊" : "🔇"; if (snd) audioInit(); };
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
    const sc = st.score ? `<p class="muted" style="margin:0;font-weight:700;font-size:20px">${st.score.p1} : ${st.score.p2}</p>` : "";
    return `<div class="overlay"><div class="card stack center"><h2>${title}</h2>${sc}${sub ? `<p class="muted" style="margin:0">${sub}</p>` : ""}
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
  function restart() { if (opt.mode === "online") return; st = initArch(); shown = null; anim = false; pullNow = null; render(); aiTurn(); }

  return {
    busy: true, act: `arch:${opt.mode}`,
    render() {
      alive = true; render(); aiTurn();
      if (opt.mode === "online") {
        clk = setInterval(tickClock, 250);
        const pollFn = async () => {
          if (sending || anim || drag) return;
          try {
            const r = await read("g_room_get", { p_id: room.id });
            if (r.error || r.version <= room.version) return;
            const prev = st; room = r; setClock(r);
            if (r.state.seq !== seen && r.state.last) { seen = r.state.seq; await showShot(prev, norm(r.state)); }
            else { st = norm(r.state); render(); }
            if (r.status === "done") { refreshProfile(); render(); }
          } catch (e) {}
        };
        const loop = () => { if (!alive) return; pollFn().finally(() => { poll = setTimeout(loop, st.turn === opt.mySide ? 1100 : 450); }); };
        loop();
      }
    },
    leave() { alive = false; dragEnd(); clearTimeout(poll); clearInterval(clk); clearTimeout(heartTm); },
  };
}
