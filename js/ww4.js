// World War 4 — ekranlar, boshqaruv va ikki o'yinchili ulanish.
// Xost (1-o'yinchi) telefonida o'yin hisoblanadi; mehmon buyruq yuboradi va ~3 marta/soniya holatni oladi.
import { isMe, waitScreen, markJoining } from "./core.js";
import { app, header, bindBack, show, home, api, read, toast, haptic, esc, load, save, scoreCard, ratingLine, refreshProfile, nav } from "./core.js";
import { newGame, step, command, snapshot, viewFromSnap, viewFromState, aiThink, DT, U, ARMY, POP_MAX, MINER_MAX, TIME_LIMIT, BASE_X, FLAG_MIN, FLAG_MAX } from "./ww4-engine.js";
import { drawScene, drawMini, VIEW_W, ASPECT, camLimit, ACC } from "./ww4-art.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const BUY = ["miner", "soldier", "archer", "officer", "giant"];
const PRESETS = [
  ["Klassik", { soldier: 0, officer: 0, giant: 0, archer: 2 }, "Askar, zobit va dev oldinda, kamonchilar orqada"],
  ["Dev oldinda", { giant: 0, officer: 1, soldier: 1, archer: 2 }, "Dev zarbani oladi, qolganlar ortidan"],
  ["Hammasi birga", { soldier: 0, officer: 0, giant: 0, archer: 0 }, "Hamma bir qatorda — kamonchilar birinchi o'ladi"],
];
const ROW_NAME = ["Oldi", "O'rta", "Orqa"];
const meters = x => `${Math.round(Math.abs(x - 130) / 8)} m`;
const fmtT = s => { s = Math.max(0, Math.ceil(s)); return `${(s / 60) | 0}:${String(s % 60).padStart(2, "0")}`; };

// ---------------- menyu ----------------
export function ww4Menu() {
  let level = load("ww4-level") || "orta", showAi = false;
  return {
    render() {
      app().innerHTML = header("World War 4") + `
        ${scoreCard()}
        <div class="stack">
          <button class="bigbtn b-fast" data-act="match"><span class="ic">⚡</span><span><b>Tezkor o'yin</b><small>Tasodifiy raqib · reytingga ta'sir qiladi</small></span></button>
          <button class="bigbtn b-friend" data-act="online"><span class="ic">🔗</span><span><b>Do'stni chaqirish</b><small>Havola yuboring — u bossa, jang boshlanadi</small></span></button>
          <button class="bigbtn b-ai" data-act="ai-toggle"><span class="ic">🤖</span><span><b>Kompyuter bilan</b><small>Mashq qilish uchun</small></span></button>
          ${showAi ? `<div class="card stack">
            <div class="seg">${[["oson", "Oson"], ["orta", "O'rta"], ["qiyin", "Qiyin"]].map(([k, l]) => `<button data-level="${k}" aria-pressed="${level === k}">${l}</button>`).join("")}</div>
            <button class="btn green" data-act="ai">Boshlash</button></div>` : ""}
          <div class="card ww-rules">
            <b>Qanday o'ynaladi</b>
            <p>⛏ <b>Konchi</b> oltin qazib keladi (${MINER_MAX} tagacha). Oltinga qo'shin yig'ing: 🗡 Askar, 🏹 Kamonchi, 🛡 Zobit, 🪓 Dev. Qo'shin ${POP_MAX} o'ringacha (Zobit 3, Dev 5 o'rin oladi).</p>
            <p><b>Maqsad:</b> raqibning bazasini (haykalini) buzing. ${fmtT(TIME_LIMIT)} ichida hech kim yutmasa, bazasi sog'lomi yutadi.</p>
            <p><b>Aql ishlating:</b> <u>Saf tartibi</u>da kamonchilarni orqaga, tanklarni oldinga qo'ying. <u>Chiziq</u>ni to'g'ri joyga qo'yib, qo'shin yig'ilgach <u>Hujum</u>ni bosing. Zobit kamonchiga chidamli va yonidagilarning zarbasini kuchaytiradi; Dev sekin, lekin zarbasi atrofdagilarga ham tegadi.</p>
          </div>
        </div>`;
      bindBack();
      const root = app();
      root.querySelectorAll("[data-level]").forEach(b => b.onclick = () => { level = b.dataset.level; save("ww4-level", level); this.render(); });
      root.querySelector('[data-act="ai-toggle"]').onclick = () => { showAi = !showAi; this.render(); };
      const ai = root.querySelector('[data-act="ai"]'); if (ai) ai.onclick = () => show(gameScreen({ mode: "ai", level, side: 0 }));
      root.querySelector('[data-act="online"]').onclick = () => startOnline("create");
      root.querySelector('[data-act="match"]').onclick = () => startOnline("match");
    },
  };
}
const sideOf = r => isMe(r.p1) ? 0 : 1;
async function startOnline(kind) {
  let room;
  try { room = await api(kind, { game: "ww4" }); } catch (e) { return toast(e.message); }
  if (room.status === "playing") return show(gameScreen({ mode: "online", room, side: sideOf(room) }));
  show(waitingScreen(room, kind === "match"));
}
export async function createPrivate(invited = "") {
  const room = await api("create", { game: "ww4" });
  if (!room?.id) throw new Error("Xona ochilmadi");
  show(waitingScreen(room, false, invited));
  return room;
}
function waitingScreen(room, matching, invited = "") {
  return waitScreen(room, { matching, invited, icon: "⚔️", shareText: "World War 4 da jang qilamizmi? ⚔️",
    onStart: r => show(gameScreen({ mode: "online", room: r, side: sideOf(r) }), false) });
}
export function openWw4Room(r) {
  if (isMe(r.p1) && r.status === "waiting") return show(waitingScreen(r, false));
  show(gameScreen({ mode: "online", room: r, side: sideOf(r) }));
}

// ---------------- o'yin ekrani ----------------
function gameScreen(opt) {
  const online = opt.mode === "online", my = opt.side || 0, host = !online || my === 0, foe = 1 - my;
  let room = opt.room || null, S = host ? newGame() : null, view = S ? viewFromState(S) : null;
  const aiMem = {}; const level = opt.level || "orta";
  let alive = true, raf = 0, lastTs = 0, acc = 0, uiAt = 0, ended = false, finalRoom = null;
  let cam = BASE_X[my] + (my ? -1 : 1) * 260, camAuto = true;
  const ov = {}; // mehmon uchun lahzali (optimistik) o'zgarishlar
  // tarmoq holati
  let cmdN = 0, pushing = false, pulling = false, pushT = null, pullT = null, finalTries = 0, sendQ = [], sending = false;
  const buf = []; let simT = 0, simInit = false, pullN = 0, hostAge = 0, lastSnapAt = 0, resultTries = 0;
  let names = () => [online ? room?.p1_name || "1-o'yinchi" : "Siz", online ? room?.p2_name || "2-o'yinchi" : "Kompyuter"];

  // ---- buyruq yuborish ----
  function act(c) {
    if (ended) return;
    if (host) {
      const r = command(S, my, c);
      if (!r.ok && c.t === "buy") toast(r.why === "gold" ? "Oltin yetmaydi" : r.why === "pop" ? (c.u === "miner" ? `Konchilar ${MINER_MAX} tadan oshmaydi` : `Qo'shin ${POP_MAX} o'rindan oshmaydi`) : r.why === "queue" ? "Navbat to'ldi" : "");
      if (r.ok) haptic("light");
      return;
    }
    haptic("light");
    if (c.t === "stance") ov.stance = { v: c.s, at: Date.now() };
    if (c.t === "flag") ov.flag = { v: c.x, at: Date.now() };
    if (c.t === "row") (ov.rows = ov.rows || {})[c.u] = { v: c.r, at: Date.now() };
    if (c.t === "rows") for (const k of ARMY) (ov.rows = ov.rows || {})[k] = { v: c.r[k], at: Date.now() };
    if (["stance", "flag"].includes(c.t)) sendQ = sendQ.filter(x => x.t !== c.t);
    if (sendQ.length < 12) sendQ.push(c);
    flush();
  }
  async function flush() {
    if (sending) return; sending = true;
    try {
      while (sendQ.length && alive) {
        const c = sendQ[0];
        try { const r = await api("w4_cmd", { id: room.id, cmd: c }); if (r?.error && r.error !== "bad") toast("Buyruq yetib bormadi"); } catch (e) { toast("Aloqa uzilgan"); }
        sendQ.shift();
      }
    } finally { sending = false; }
  }

  // ---- xost: holatni yuborish ----
  async function push() {
    if (pushing || !alive || !online || !host) return; pushing = true;
    try {
      const r = await api("w4_push", { id: room.id, snap: snapshot(S), after: cmdN });
      if (r && !r.error) {
        for (const c of r.cmds || []) if (c.n > cmdN) { cmdN = c.n; if (!S.win) command(S, 1, c.c); }
        if (r.status === "done") {
          if (!S.win) { const w = r.result?.winner; S.win = w === "p1" || w === "p2" || w === "draw" ? w : "p1"; }
          if (r.result) finalRoom = { ...room, result: r.result };
          pushDone();
        }
      }
    } catch (e) { if (S.win) finalTries++; }
    pushing = false;
  }
  function pushDone() { clearInterval(pushT); pushT = null; }

  // ---- mehmon: holatni olish ----
  function addSnap(sn) {
    const v = viewFromSnap(sn);
    if (buf.length && sn.t < buf[buf.length - 1].t) return;
    buf.push({ t: sn.t, view: v }); if (buf.length > 14) buf.shift();
    lastSnapAt = Date.now();
  }
  async function pull() {
    if (pulling || !alive) return; pulling = true;
    try {
      const r = await read("g_ww4_pull", { p_id: room.id, p_after: pullN });
      if (r && !r.error) {
        if (r.snap) { pullN = r.n; addSnap(r.snap); }
        hostAge = r.age ?? 0;
        if (r.result && !finalRoom) finalRoom = { ...room, result: r.result };
        if (r.status === "done" && !ended && !(buf.length && buf[buf.length - 1].view.win)) {
          // taslim bo'ldi yoki vaqt tugadi — holatni o'zimiz yakunlaymiz
          const w = r.result?.winner;
          const last = buf.length ? buf[buf.length - 1].view : null;
          if (last) { last.win = w === "p1" || w === "p2" || w === "draw" ? w : "p1"; }
          else addSnap({ t: 1, g: [0, 0], b: [1, 1], u: [], q: [[], []], st: ["hold", "hold"], fl: [640, 1360], rw: [[0, 2, 0, 0], [0, 2, 0, 0]], pop: [0, 0], mc: [0, 0], w: w || "p1", fx: [] });
        }
      }
    } catch (e) {}
    pulling = false;
  }

  function guestView(dt) {
    if (!buf.length) return null;
    const latest = buf[buf.length - 1], target = latest.t - 0.55;
    if (!simInit) { simT = target; simInit = true; }
    simT += dt;
    const err = target - simT;
    if (Math.abs(err) > 1.3) simT = target; else simT += err * Math.min(1, dt * 1.6);
    simT = Math.min(simT, latest.t);
    let a = null, b = null;
    for (let i = buf.length - 1; i >= 0; i--) if (buf[i].t <= simT) { a = buf[i]; b = buf[i + 1] || null; break; }
    if (!a) return { ...buf[0].view, t: simT };
    if (!b) return { ...a.view, t: simT };
    const f = clamp((simT - a.t) / Math.max(0.001, b.t - a.t), 0, 1);
    const prev = new Map(a.view.units.map(u => [u.id, u]));
    const units = b.view.units.map(u => { const p = prev.get(u.id); return p ? { ...u, x: p.x + (u.x - p.x) * f } : u; });
    return { ...b.view, units, t: simT };
  }

  // ---- asosiy sikl ----
  function frame(ts) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.25, (ts - (lastTs || ts)) / 1000); lastTs = ts;
    if (host) {
      acc += dt;
      while (acc >= DT && !S.win) {
        acc -= DT;
        if (!online) aiThink(S, 1, level, aiMem);
        step(S, DT);
      }
      if (S.win) acc = 0;
      view = viewFromState(S);
      if (S.win && online && !ended && !pushT) { /* push() ishlaydi */ }
    } else {
      view = guestView(dt) || view;
    }
    if (!view) return;
    // ofitser/kamera
    if (camAuto) cam += (autoCam(view) - cam) * Math.min(1, dt * 3);
    cam = camLimit(cam);
    draw();
    if (ts - uiAt > 120) { uiAt = ts; paintUI(); }
    if (view.win && !ended) endGame();
  }
  function autoCam(v) {
    const dir = my ? -1 : 1;
    let mf = null, ef = null;
    for (const u of v.units) {
      if (u.type === "miner") continue;
      if (u.team === my) { if (!mf || dir * u.x > dir * mf.x) mf = u; }
      else if (!ef || dir * u.x < dir * ef.x) ef = u;
    }
    if (mf && ef) return (mf.x + ef.x) / 2;
    if (mf) return mf.x + dir * 110;
    if (ef) return (BASE_X[my] + ef.x) / 2;
    return BASE_X[my] + dir * 260;
  }

  // ---- chizish ----
  let cv, cx, mv, mx, cw = 0, ch = 0, mw = 0, mh = 0, dpr = 1;
  function fit() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth; if (!w) return;
    if (w !== cw) { cw = w; ch = Math.round(w * ASPECT); cv.width = cw * dpr; cv.height = ch * dpr; cv.style.height = ch + "px"; }
    const m = mv.clientWidth; if (m && m !== mw) { mw = m; mh = 34; mv.width = mw * dpr; mv.height = mh * dpr; mv.style.height = mh + "px"; }
  }
  function draw() {
    if (!cv) return; fit(); if (!cw) return;
    const v = viewOv();
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); drawScene(cx, cw, ch, v, cam, my);
    mx.setTransform(dpr, 0, 0, dpr, 0, 0); drawMini(mx, mw, mh, v, cam, my);
  }
  // mehmon uchun: yangi buyruqlar snapshot'da ko'rinmaguncha o'z tanlovini ko'rsatadi
  function viewOv() {
    if (host || !view) return view;
    const now = Date.now(), v = view;
    const st = v.stance.slice(), fl = v.flag.slice(), rows = v.rows.map(r => ({ ...r }));
    if (ov.stance) { if (v.stance[my] === ov.stance.v || now - ov.stance.at > 1800) delete ov.stance; else st[my] = ov.stance.v; }
    if (ov.flag) { if (Math.abs(v.flag[my] - ov.flag.v) < 3 || now - ov.flag.at > 1800) delete ov.flag; else fl[my] = clamp(ov.flag.v, FLAG_MIN, FLAG_MAX); }
    if (ov.rows) for (const k of Object.keys(ov.rows)) { if (v.rows[my][k] === ov.rows[k].v || now - ov.rows[k].at > 1800) delete ov.rows[k]; else rows[my][k] = ov.rows[k].v; }
    return { ...v, stance: st, flag: fl, rows };
  }

  // ---- ekran ----
  const q = id => document.getElementById(id);
  function build() {
    const nm = names();
    app().innerHTML = `
      <div class="ww">
        <div class="ww-bar">
          <div class="ww-p"><i style="background:${ACC[0]}"></i><div><b>${esc(nm[0])}${my === 0 ? " (siz)" : ""}</b><div class="hpb"><u id="hp0"></u></div></div></div>
          <div class="ww-tm" id="wtm">15:00</div>
          <div class="ww-p r"><div><b>${esc(nm[1])}${my === 1 ? " (siz)" : ""}</b><div class="hpb"><u id="hp1"></u></div></div><i style="background:${ACC[1]}"></i></div>
        </div>
        <div class="ww-cvw"><canvas id="wc" class="ww-cv"></canvas>
          <div class="ww-cam"><button data-cam="auto" aria-label="Jang tomon">🎯</button><button data-cam="home" aria-label="Bazam">🏠</button></div>
          <div class="ww-wait" id="wwait" hidden></div></div>
        <canvas id="wm" class="ww-mini"></canvas>
        <div class="ww-res"><span>💰 <b id="rg">0</b></span><span>👥 <b id="rp">0/${POP_MAX}</b></span><span>⛏ <b id="rm">0/${MINER_MAX}</b></span></div>
        <div class="ww-buy">${BUY.map(k => `<button data-buy="${k}"><i>${U[k].ic}</i><b>${U[k].name}</b><span>💰${U[k].cost}</span><small>${k === "miner" ? "" : U[k].pop + " o'rin"}</small></button>`).join("")}</div>
        <div class="ww-q" id="wq"></div>
        <div class="ww-lbl">Qo'shin buyrug'i</div>
        <div class="seg ww-st"><button data-st="attack">⚔️ Hujum</button><button data-st="hold">🚩 Chiziq</button><button data-st="defend">🛡 Mudofaa</button></div>
        <div class="ww-flag" id="wflag"><span>🚩 Chiziq joyi</span><input type="range" id="wfl" min="${FLAG_MIN}" max="${FLAG_MAX}" step="10"><small id="wfv"></small></div>
        <details class="ww-form" id="wform"><summary>🧭 Saf tartibi (kim oldinda, kim orqada)</summary>
          <div class="ww-presets">${PRESETS.map(([n, , d], i) => `<button class="pill" data-pre="${i}" title="${esc(d)}">${n}</button>`).join("")}</div>
          ${ARMY.map(k => `<div class="ww-row"><span>${U[k].ic} ${U[k].name}</span><div class="seg" data-row="${k}">${ROW_NAME.map((n, r) => `<button data-r="${r}">${n}</button>`).join("")}</div></div>`).join("")}
          <p class="small muted" style="margin:8px 2px 0">«Oldi» — birinchi bo'lib boradi. «O'rta» 55, «Orqa» 110 qadam ortda yuradi. Kamonchi orqada bo'lsa himoyalanadi, lekin juda orqada qolsa dushmanga yetmaydi.</p></details>
        <div class="ww-end"><button class="btn alt" data-quit>🏳 ${online ? "Taslim bo'lish" : "Chiqish"}</button></div>
      </div>
      <div id="wov"></div>`;
    cv = q("wc"); cx = cv.getContext("2d"); mv = q("wm"); mx = mv.getContext("2d");
    cw = 0; mw = 0;
    // buyruqlar
    app().querySelectorAll("[data-buy]").forEach(b => b.onclick = () => act({ t: "buy", u: b.dataset.buy }));
    app().querySelectorAll("[data-st]").forEach(b => b.onclick = () => act({ t: "stance", s: b.dataset.st }));
    app().querySelectorAll("[data-row]").forEach(g => g.querySelectorAll("[data-r]").forEach(b => b.onclick = () => act({ t: "row", u: g.dataset.row, r: +b.dataset.r })));
    app().querySelectorAll("[data-pre]").forEach(b => b.onclick = () => act({ t: "rows", r: PRESETS[+b.dataset.pre][1] }));
    const fl = q("wfl"); let flT = 0;
    fl.oninput = () => { q("wfv").textContent = meters(+fl.value); const x = +fl.value; flFresh = Date.now(); clearTimeout(flT); flT = setTimeout(() => act({ t: "flag", x }), host ? 0 : 140); };
    app().querySelector("[data-quit]").onclick = quit;
    app().querySelectorAll("[data-cam]").forEach(b => b.onclick = () => { if (b.dataset.cam === "auto") camAuto = true; else { camAuto = false; cam = BASE_X[my] + (my ? -1 : 1) * 260; } });
    bindCamDrag();
  }
  let flFresh = 0;
  function bindCamDrag() {
    let d = null;
    cv.onpointerdown = e => { d = { x: e.clientX, c: cam, moved: false }; try { cv.setPointerCapture(e.pointerId); } catch (_) {} };
    cv.onpointermove = e => { if (!d) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 4) { d.moved = true; camAuto = false; } if (d.moved) cam = camLimit(d.c - dx / (cw / VIEW_W)); };
    cv.onpointerup = cv.onpointercancel = () => { d = null; };
    let md = false;
    const mini = e => { const r = mv.getBoundingClientRect(); camAuto = false; cam = camLimit((e.clientX - r.left) / r.width * 2000); };
    mv.onpointerdown = e => { md = true; try { mv.setPointerCapture(e.pointerId); } catch (_) {} mini(e); };
    mv.onpointermove = e => { if (md) mini(e); };
    mv.onpointerup = mv.onpointercancel = () => { md = false; };
  }

  let sig = "";
  function paintUI() {
    const v = viewOv(); if (!v) return;
    const s = `${v.gold[my]}|${v.pop[my]}|${v.mc[my]}|${v.stance[my]}|${JSON.stringify(v.rows[my])}|${v.queue[my].map(i => i.type + Math.round(i.left * 2)).join()}|${v.base}|${Math.ceil(v.t)}|${hostAge > 5 ? 1 : 0}`;
    if (s === sig) return; sig = s;
    q("rg").textContent = v.gold[my]; q("rp").textContent = `${v.pop[my]}/${POP_MAX}`; q("rm").textContent = `${v.mc[my]}/${MINER_MAX}`;
    q("wtm").textContent = fmtT(TIME_LIMIT - v.t);
    for (let t = 0; t < 2; t++) { const e = q("hp" + t), f = clamp(v.base[t] / 6000, 0, 1); e.style.width = f * 100 + "%"; e.style.background = f > 0.5 ? "#3fd07a" : f > 0.25 ? "#f2b632" : "#e5484d"; }
    app().querySelectorAll("[data-buy]").forEach(b => {
      const k = b.dataset.buy, d = U[k];
      const full = k === "miner" ? v.mc[my] >= MINER_MAX : v.pop[my] + d.pop > POP_MAX;
      b.classList.toggle("off", v.gold[my] < d.cost || full);
      b.classList.toggle("full", full);
      if (k === "miner") b.querySelector("small").textContent = `${v.mc[my]}/${MINER_MAX}`;
    });
    app().querySelectorAll("[data-st]").forEach(b => b.setAttribute("aria-pressed", String(v.stance[my] === b.dataset.st)));
    q("wflag").style.display = v.stance[my] === "hold" ? "" : "none";
    const fl = q("wfl"); if (Date.now() - flFresh > 800) fl.value = v.flag[my]; q("wfv").textContent = meters(+fl.value);
    app().querySelectorAll("[data-row]").forEach(g => g.querySelectorAll("[data-r]").forEach(b => b.setAttribute("aria-pressed", String(v.rows[my][g.dataset.row] === +b.dataset.r))));
    const qq = v.queue[my];
    q("wq").innerHTML = qq.length ? qq.map((it, i) => {
      const tot = U[it.type].train, p = i === 0 ? clamp(1 - it.left / tot, 0, 1) : 0;
      return `<button class="qc" data-qi="${i}" title="Bekor qilish"><i>${U[it.type].ic}</i><u style="width:${p * 100}%"></u></button>`;
    }).join("") + `<small>bosib bekor qilish</small>` : `<small class="muted">Navbat bo'sh — yuqoridagi tugmalardan tanlang</small>`;
    q("wq").querySelectorAll("[data-qi]").forEach(b => b.onclick = () => act({ t: "cancel", i: +b.dataset.qi }));
    // aloqa holati (mehmon)
    const wt = q("wwait");
    if (!host && !ended) {
      if (!buf.length) { wt.hidden = false; wt.innerHTML = `Jang boshlanyapti…`; }
      else if (hostAge > 8) { wt.hidden = false; wt.innerHTML = `Raqib bilan aloqa uzildi… ${hostAge > 28 ? `<button class="btn green" data-claim>G'alabani olish</button>` : ""}`; const cl = wt.querySelector("[data-claim]"); if (cl) cl.onclick = claim; }
      else wt.hidden = true;
    }
  }
  async function claim() {
    try { const r = await api("w4_timeout", { id: room.id }); if (r?.status === "done") { finalRoom = { ...room, result: r.result }; const last = buf[buf.length - 1]; if (last) last.view.win = "p2"; } else toast("Raqib hali qaytishi mumkin"); } catch (e) { toast(e.message); }
  }

  // ---- yakun ----
  async function endGame() {
    ended = true; haptic("ok");
    const w = view.win, won = w === "draw" ? null : (w === "p1") === (my === 0);
    if (!online && won) api("aiwin", { game: "ww4" }).catch(() => {});
    renderEnd(won, w);
    if (online) {
      // natijani (ball) serverdan olamiz
      for (let i = 0; i < 6 && !(finalRoom?.result); i++) {
        try { const r = await read("g_room_get", { p_id: room.id }); if (r?.result) finalRoom = r; } catch (e) {}
        if (!finalRoom?.result) await new Promise(r => setTimeout(r, 900));
        if (!alive) return;
      }
      refreshProfile(); renderEnd(won, w);
    }
  }
  function renderEnd(won, w) {
    const o = q("wov"); if (!o) return;
    const t = view?.t || 0;
    const title = w === "draw" ? "Durang 🤝" : won ? "G'alaba! 🏆" : "Bu safar yutqazdingiz";
    const bothUp = view && view.base[0] > 0 && view.base[1] > 0;
    const sub = w === "draw" ? "Bazalar teng qoldi" : t >= TIME_LIMIT - 0.5 ? "Vaqt tugadi — baza sog'lomroq tomon yutdi"
      : bothUp ? (won ? "Raqib taslim bo'ldi" : "Siz taslim bo'ldingiz")
      : won ? "Raqib bazasi vayron bo'ldi" : "Sizning bazangiz vayron bo'ldi";
    const rl = online && finalRoom?.result ? ratingLine({ ...room, result: finalRoom.result }) : "";
    o.innerHTML = `<div class="overlay"><div class="card stack center"><h2>${title}</h2><p class="muted" style="margin:0">${sub} · ${fmtT(t)}</p>${rl}
      ${online ? `<button class="btn alt" data-end="lb">🏆 Reyting</button>` : `<button class="btn green" data-end="again">Yana o'ynash</button>`}
      <button class="btn alt" data-end="menu">Menyuga</button></div></div>`;
    o.querySelectorAll("[data-end]").forEach(b => b.onclick = () => {
      const a = b.dataset.end;
      if (a === "menu") home(); else if (a === "lb") show(nav.leaderboard("ww4"));
      else if (a === "again") show(gameScreen({ mode: "ai", level, side: 0 }), false);
    });
  }
  async function quit() {
    if (online && !ended) {
      if (!confirm("Taslim bo'lasizmi? Reytingdan ochko yo'qotasiz.")) return;
      try { const r = await api("resign", { id: room.id }); finalRoom = r; } catch (e) { return toast(e.message); }
      if (host) { if (!S.win) S.win = my === 0 ? "p2" : "p1"; } else { const last = buf[buf.length - 1]; if (last) last.view.win = "p1"; else addSnap({ t: 1, g: [0, 0], b: [1, 1], u: [], q: [[], []], st: ["hold", "hold"], fl: [640, 1360], rw: [[0, 2, 0, 0], [0, 2, 0, 0]], pop: [0, 0], mc: [0, 0], w: "p1", fx: [] }); }
      return;
    }
    if (!online && !ended && !confirm("O'yindan chiqasizmi?")) return;
    ended = true; home();
  }

  return {
    busy: true, act: `ww4:${opt.mode}`,
    render() {
      alive = true; build(); lastTs = 0;
      if (online) {
        if (host) { pushT = setInterval(push, 300); push(); } else { pullT = setInterval(pull, 300); pull(); }
      }
      raf = requestAnimationFrame(frame);
    },
    leave() {
      alive = false; cancelAnimationFrame(raf); clearInterval(pushT); clearInterval(pullT);
      if (online && !ended && room?.id) api("resign", { id: room.id }).catch(() => {});
    },
  };
}
