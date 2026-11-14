import { isMe, waitScreen, timePicker, bindTimePicker, gameSeconds } from "./core.js";
import { app, header, bindBack, show, home, api, read, toast, haptic, esc, load, save, scoreCard, ratingLine, refreshProfile, nav } from "./core.js";
import { molWord, allWords, isPangram, tokens } from "./mol-engine.js";
const tokensLen = w => tokens(w).length;

// Molekula: markazda 1 ta, atrofida 6 ta harf. Shu harflardan (takrorlab) kamida 2 harfli o'zbekcha so'zlar yasang —
// so'z markaziy harfni o'z ichiga olishi shart. Ikkala o'yinchi bir xil to'plamni oladi; bir xil so'zni ikkalasi topsa ham hisoblanadi.
// Kim ko'proq so'z topsa — g'olib. Raqib so'zlari o'yin tugaguncha ko'rinmaydi.
const SECONDS = 120;

let DICT = null, DICT_LIST = null, BANK = null;
async function dict() {
  if (!DICT) { DICT_LIST = await (await fetch("data/words.json")).json(); DICT = new Set(DICT_LIST); }
  return DICT;
}
async function bank() {
  if (!BANK) BANK = await (await fetch("data/molekula.json")).json();
  return BANK;
}
const isWord = w => !!DICT && DICT.has(w); // faqat lug'atning o'zi

// har safar yangi to'plam: oxirgi 400 tasi qaytarilmaydi (qurilmada eslab qolinadi)
export async function generate(secs = gameSeconds("mol")) {
  const B = await bank();
  let recent = []; try { recent = JSON.parse(load("mol-recent") || "[]"); } catch (e) {}
  const skip = new Set(recent);
  let i = 0;
  for (let t = 0; t < 60; t++) { i = (Math.random() * B.length) | 0; if (!skip.has(i)) break; }
  recent.push(i); save("mol-recent", JSON.stringify(recent.slice(-400)));
  const [c, o, n] = B[i];
  const oo = o.slice(); for (let k = oo.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0; [oo[k], oo[j]] = [oo[j], oo[k]]; }
  return { letters: { c, o: oo }, total: n, found: { p1: [], p2: [] }, seconds: secs };
}

// ---------------- lobby ----------------
export function molMenu() {
  dict().catch(() => {}); bank().catch(() => {});
  return {
    render() {
      app().innerHTML = header("Molekula") + `
        ${scoreCard()}
        <div class="card soz-intro">
          <b>Qanday o'ynaladi:</b> o'rtada bitta harf, atrofida 6 ta harf bor. Shu harflardan istalgan o'zbekcha so'z yasang —
          harflarni takrorlash mumkin, lekin <b>o'rtadagi harf albatta qatnashishi kerak</b>. Kamida 2 harfli so'z hisobga o'tadi.
          <br>Ikkalangiz bir xil harflarni olasiz. <b>Raqib ham shu so'zni topsa — ikkalangizga hisoblanadi.</b> Kim ko'proq so'z topsa, o'sha yutadi.
        </div>
        <p class="lbl" style="margin:14px 4px 6px">O'yin vaqti</p>${timePicker("mol")}
        <div class="stack" style="margin-top:12px">
          <button class="bigbtn b-fast" data-act="match"><span class="ic">⚡</span><span><b>Tezkor o'yin</b><small>Tasodifiy raqib · reyting uchun</small></span></button>
          <button class="bigbtn b-friend" data-act="create"><span class="ic">🔗</span><span><b>Do'stni chaqirish</b><small>Havola yuboring</small></span></button>
          <button class="bigbtn b-ai" data-act="solo"><span class="ic">🎯</span><span><b>Yolg'iz mashq</b><small>Nechta so'z topasiz? Rekord: ${load("mol-best") || 0}</small></span></button>
        </div>`;
      bindBack();
      bindTimePicker(app(), "mol", () => this.render());
      app().querySelector('[data-act="solo"]').onclick = async () => {
        try { await Promise.all([dict(), bank()]); const st = await generate(); show(molGame({ room: null, state: { ...st, ends_at: Date.now() + 3000 + st.seconds * 1000 } })); } catch (e) { toast("Yuklab bo'lmadi, qayta urinib ko'ring"); }
      };
      app().querySelector('[data-act="create"]').onclick = () => startOnline("create");
      app().querySelector('[data-act="match"]').onclick = () => startOnline("match");
    },
  };
}

async function startOnline(kind) {
  let room;
  try { await Promise.all([dict(), bank()]); room = await api(kind, { game: "mol", state: await generate() }); } catch (e) { return toast(e.message); }
  openMolRoom(room, kind === "match");
}

export async function openMolRoom(room, matching = false) {
  await dict().catch(() => {});
  if (room.status === "playing" || room.status === "done") return show(molGame({ room }));
  show(molWaiting(room, matching));
}

export async function createPrivate(invited = "") {
  await Promise.all([dict(), bank()]);
  const room = await api("create", { game: "mol", state: await generate() });
  if (!room?.id) throw new Error("Xona ochilmadi");
  show(molWaiting(room, false, invited));
  return room;
}

function molWaiting(room, matching, invited = "") {
  return waitScreen(room, { matching, invited, icon: "⬡", shareText: "Molekulada bellashamizmi? ⬡",
    onStart: r => show(molGame({ room: r }), false) });
}

// ---------------- o'yin ----------------
function molGame(opt) {
  let room = opt.room || null;
  let st = room ? room.state : opt.state;
  const meKey = room ? (isMe(room.p1) ? "p1" : "p2") : "p1";
  const themKey = meKey === "p1" ? "p2" : "p1";
  let cur = [], poll = null, tick = null, finishing = false, alive = true, pending = 0, reveal = false, all = null, order = null, flashT = null;

  const L = () => st.letters;
  const mineWords = () => (st.found?.[meKey] || []);
  const themWords = () => (st.found?.[themKey] || []);
  const left = () => Math.max(0, Math.ceil(((st.ends_at || 0) - Date.now()) / 1000));
  const started = () => Date.now() >= (st.ends_at || 0) - (st.seconds || SECONDS) * 1000;
  const done = () => room ? room.status === "done" : left() === 0;
  const word = () => cur.join("");
  const outer = () => order || L().o;

  function say(t, kind = "") {
    const el = document.querySelector(".molmsg"); if (!el) return;
    el.textContent = t; el.className = "molmsg " + kind; clearTimeout(flashT);
    flashT = setTimeout(() => { if (el.isConnected) { el.textContent = ""; el.className = "molmsg"; } }, 1800);
  }

  function shuffle() {
    const o = outer().slice();
    for (let k = o.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0; [o[k], o[j]] = [o[j], o[k]]; }
    order = o; cur = []; haptic("light"); drawBoard(); draw();
  }

  async function submit() {
    if (done() || !started()) return;
    const raw = word();
    if (raw.length < 2) return say("Kamida 2 harf kerak", "bad");
    const w = molWord(L(), raw);
    if (!w) { haptic("error"); return say("O'rtadagi harf qatnashishi kerak", "bad"); }
    if (mineWords().includes(w)) { haptic("error"); cur = []; draw(); return say("Bu so'zni topgansiz", "bad"); }
    if (!isWord(w)) { haptic("error"); return say(`${w} — lug'atda yo'q`, "bad"); }
    haptic("ok"); cur = [];
    const add = list => ({ ...st.found, [meKey]: [...list, w] });
    st.found = add(mineWords());
    say(isPangram(L(), w) ? `⭐ ${w} — barcha harflar! +1` : `${w} +1`, "good");
    draw();
    if (!room) return;
    pending++;
    try {
      const r = await api("mclaim", { id: room.id, word: w });
      if (r.error === "no_word") { st.found = { ...st.found, [meKey]: mineWords().filter(x => x !== w) }; toast("Bu so'z qabul qilinmadi"); }
      else if (r.id) { room = r; st = r.state; }
    } catch (e) { toast("Internet bilan muammo"); }
    pending--;
    draw();
  }

  const NS = "http://www.w3.org/2000/svg";
  const R = 100, C = 150;
  function drawBoard() {
    const b = document.querySelector(".molboard"); if (!b) return;
    const o = outer();
    const pts = [{ ch: L().c, x: C, y: C, r: 40, mid: true }, ...o.map((ch, k) => { const a = (-90 + 60 * k) * Math.PI / 180; return { ch, x: C + R * Math.cos(a), y: C + R * Math.sin(a), r: 33 }; })];
    const bonds = [];
    for (let k = 1; k <= 6; k++) { bonds.push([0, k]); bonds.push([k, k % 6 + 1]); }
    b.innerHTML = `<svg viewBox="0 0 300 300">
      <defs>
        <filter id="goo" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b"/><feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8"/></filter>
        <radialGradient id="gO" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fffdf7"/><stop offset=".6" stop-color="#f4e6cf"/><stop offset="1" stop-color="#e0c9a3"/></radialGradient>
        <radialGradient id="gM" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#ffb35c"/><stop offset=".6" stop-color="#f07a24"/><stop offset="1" stop-color="#cf4f16"/></radialGradient>
        <radialGradient id="gS" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#6fe6d3"/><stop offset=".6" stop-color="#1fb3a0"/><stop offset="1" stop-color="#0e7f78"/></radialGradient>
      </defs>
      ${bonds.map(([i, j]) => `<line class="bond" x1="${pts[i].x.toFixed(1)}" y1="${pts[i].y.toFixed(1)}" x2="${pts[j].x.toFixed(1)}" y2="${pts[j].y.toFixed(1)}"/>`).join("")}
      <g class="goo"><path class="trail" d="" stroke-width="7"/><g class="blobs"></g></g>
      <g class="drops"></g>
      ${pts.map((p, i) => `<g class="atom${p.mid ? " mid" : ""}" data-i="${i}" style="animation-delay:${(-i * .55).toFixed(2)}s">
        <circle class="sph" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.r}" fill="url(#${p.mid ? "gM" : "gO"})"/>
        <circle class="dw" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.r + 5}" stroke-dasharray="0 400" transform="rotate(-90 ${p.x.toFixed(1)} ${p.y.toFixed(1)})"/>
        <text x="${p.x.toFixed(1)}" y="${(p.y + (p.mid ? 11 : 9)).toFixed(1)}" text-anchor="middle" font-size="${p.mid ? 34 : 28}">${esc(p.ch)}</text></g>`).join("")}
    </svg>`;
    bindBoard(b, pts);
  }

  function bindBoard(b, pts) {
    const svg = b.querySelector("svg"), trail = svg.querySelector(".trail"), blobs = svg.querySelector(".blobs"), drops = svg.querySelector(".drops");
    const atoms = [...svg.querySelectorAll(".atom")];
    let sel = [], down = false, ptr = null, dwell = null, dwellAnim = null, dwelled = false;
    const toSvg = e => { const m = svg.getScreenCTM().inverse(); const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m); return { x: p.x, y: p.y }; };
    const hit = p => { let best = -1, bd = 1e9; pts.forEach((a, i) => { const d = Math.hypot(a.x - p.x, a.y - p.y); if (d < a.r * 1.12 && d < bd) { bd = d; best = i; } }); return best; };

    function drip(i) {
      const a = pts[i];
      for (let k = 0; k < 5; k++) {
        const c = document.createElementNS(NS, "circle");
        const ang = Math.random() * Math.PI * 2, d = a.r + 14 + Math.random() * 20, r0 = 2.5 + Math.random() * 3.5;
        c.setAttribute("class", "drop"); c.setAttribute("cx", a.x); c.setAttribute("cy", a.y); c.setAttribute("r", r0);
        drops.appendChild(c);
        const an = c.animate([{ transform: "translate(0,0) scale(1)", opacity: .95 }, { transform: `translate(${Math.cos(ang) * d}px,${Math.sin(ang) * d}px) scale(.2)`, opacity: 0 }], { duration: 520 + Math.random() * 200, easing: "cubic-bezier(.2,.7,.3,1)" });
        an.onfinish = () => c.remove();
      }
      const ag = atoms[i];
      ag.animate([{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }], { duration: 320, easing: "cubic-bezier(.3,1.6,.5,1)" });
    }
    function paint(extra) {
      const d = sel.map((i, k) => `${k ? "L" : "M"}${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`).join(" ") + (extra && sel.length ? ` L${extra.x.toFixed(1)} ${extra.y.toFixed(1)}` : "");
      trail.setAttribute("d", d);
      blobs.innerHTML = "";
      atoms.forEach((g, i) => { const on = sel.includes(i); g.classList.toggle("on", on); g.querySelector(".sph").setAttribute("fill", on ? "url(#gS)" : `url(#${pts[i].mid ? "gM" : "gO"})`); });
    }
    function stopDwell() { clearTimeout(dwell); dwell = null; if (dwellAnim) { dwellAnim.cancel(); dwellAnim = null; } atoms.forEach(g => g.querySelector(".dw").setAttribute("stroke-dasharray", "0 400")); }
    function startDwell() {
      stopDwell(); if (!sel.length || dwelled) return;
      const i = sel[sel.length - 1], ring = atoms[i].querySelector(".dw"), len = 2 * Math.PI * (pts[i].r + 5);
      ring.setAttribute("stroke-dasharray", `${len} ${len}`);
      dwellAnim = ring.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 800, easing: "linear" });
      dwell = setTimeout(() => { if (down && sel.length < 20) { dwelled = true; add(i); } }, 800);
    }
    function add(i) {
      if (sel.length >= 20) return;
      if (sel[sel.length - 1] !== i) dwelled = false; sel.push(i); cur = sel.map(k => pts[k].ch); haptic("light"); drip(i); paint(ptr); draw(); startDwell();
    }
    function finish(commit) {
      const w = sel.length;
      stopDwell(); down = false;
      const far = ptr ? Math.hypot(ptr.x - C, ptr.y - C) > R * 1.45 : false;
      if (commit && w >= 2 && !far) submit(); cur = []; draw();
      sel = []; paint(null);
    }
    svg.addEventListener("pointerdown", e => {
      if (done() || !started()) return;
      const p = toSvg(e), i = hit(p); if (i < 0) return;
      e.preventDefault(); try { svg.setPointerCapture(e.pointerId); } catch (_) {}
      down = true; ptr = p; sel = []; cur = []; add(i);
    });
    svg.addEventListener("pointermove", e => {
      if (!down) return;
      e.preventDefault(); ptr = toSvg(e);
      const i = hit(ptr);
      if (i >= 0 && i !== sel[sel.length - 1]) add(i);
      else if (i < 0 && dwell) stopDwell();
      else if (i >= 0 && i === sel[sel.length - 1] && !dwell) startDwell();
      paint(ptr);
    });
    svg.addEventListener("pointerup", e => { if (down) { ptr = toSvg(e); finish(true); } });
    svg.addEventListener("pointercancel", () => { if (down) finish(false); });
    svg.addEventListener("contextmenu", e => e.preventDefault());
  }

  function chips(list, cls) {
    return [...list].sort((a, b) => a.length - b.length || a.localeCompare(b))
      .map(w => `<span class="wchip ${cls}">${isPangram(L(), w) ? "⭐ " : ""}${w}</span>`).join("");
  }

  function draw() {
    if (!alive || !document.querySelector(".molboard")) return;
    const t = left();
    const clock = started() ? `${(t / 60) | 0}:${String(t % 60).padStart(2, "0")}` : "…";
    const mc = mineWords().length, tc = themWords().length;
    document.querySelector(".sbar").innerHTML = room ? `
      <div class="side mine"><b>${mc}</b><span>Siz</span></div>
      <div class="timer ${t <= 10 && started() ? "low" : ""}">${clock}</div>
      <div class="side theirs"><b>${tc}</b><span>${esc(meKey === "p1" ? room.p2_name || "Raqib" : room.p1_name || "Raqib")}</span></div>` : `
      <div class="side mine"><b>${mc}</b><span>So'z</span></div>
      <div class="timer ${t <= 10 && started() ? "low" : ""}">${clock}</div>
      <div class="side"><b>${st.total || "?"}</b><span>jami mumkin</span></div>`;
    const tt = document.querySelector(".moltotal"); if (tt) tt.textContent = room && st.total ? `Jami ${st.total} ta so'z bor · topildi: ${mc}` : "";
    const pv = document.querySelector(".preview");
    const w = word();
    pv.textContent = w || (started() ? "Harflarni barmoq bilan ulang" : "Tayyorlaning…");
    pv.className = `preview ${w ? "typing" : ""}`;
    const bd = document.querySelector(".molboard"); if (bd) bd.classList.toggle("off", done() || !started());
    const fnd = document.querySelector(".found");
    if (done()) {
      const A = new Set(mineWords()), B = new Set(themWords());
      const both = [...A].filter(x => B.has(x));
      fnd.innerHTML = `
        <div><span class="flabel">Siz topgan · ${A.size}</span>${chips([...A].filter(x => !B.has(x)), "mine") || ""}${chips(both, "both")}${A.size ? "" : `<span class="muted small">hali yo'q</span>`}</div>
        ${room ? `<div><span class="flabel">Raqib topgan · ${B.size}${both.length ? ` · ikkalangiz: ${both.length}` : ""}</span>${chips([...B].filter(x => !A.has(x)), "theirs")}${chips(both, "both")}${B.size ? "" : `<span class="muted small">hali yo'q</span>`}</div>` : ""}
        ${reveal ? missedHtml() : ""}`;
    } else {
      fnd.innerHTML = `<div><span class="flabel">Siz topgan · ${mc}</span>${chips(mineWords(), "mine") || `<span class="muted small">hali yo'q</span>`}</div>`;
    }
    const tools = document.querySelector(".moltools"); if (tools) tools.style.display = done() ? "none" : "";
    const cd = document.getElementById("cd");
    if (cd) cd.innerHTML = !started() && !done() ? `<div class="countdown">${Math.max(1, Math.ceil(((st.ends_at - (st.seconds || SECONDS) * 1000) - Date.now()) / 1000))}</div>` : "";
    const ov = document.getElementById("ov");
    const want = done() ? (reveal ? revBar() : endOverlay()) : "";
    if (ov.dataset.html !== want) { ov.innerHTML = want; ov.dataset.html = want; ov.querySelectorAll("[data-end]").forEach(b => b.onclick = () => endAction(b.dataset.end)); }
  }

  function missedHtml() {
    if (!all) all = allWords(L(), DICT_LIST || []);
    const got = new Set([...mineWords(), ...themWords()]);
    const miss = all.filter(w => !got.has(w)).sort((a, b) => b.length - a.length || a.localeCompare(b));
    const groups = {};
    miss.forEach(w => (groups[tokensLen(w)] = groups[tokensLen(w)] || []).push(w));
    const lens = Object.keys(groups).map(Number).sort((a, b) => b - a);
    return `<div><span class="flabel">Hech kim topmagan · ${miss.length} ta (jami ${all.length} ta so'z bor edi)</span></div>` +
      lens.map(n => `<div><span class="flabel">${n} harfli · ${groups[n].length}</span>${groups[n].map(w => `<span class="wchip miss">${isPangram(L(), w) ? "⭐ " : ""}${w}</span>`).join("")}</div>`).join("");
  }
  const revBar = () => `<div class="revbar"><button class="btn alt" data-end="result">📋 Natija</button><button class="btn" data-end="menu">Menyuga</button></div>`;

  function endOverlay() {
    const a = mineWords().length, b = themWords().length;
    if (!room) {
      const best = Math.max(a, +(load("mol-best") || 0)); save("mol-best", best);
      return `<div class="overlay"><div class="card stack center"><h2>Vaqt tugadi ⏱</h2>
        <p class="muted" style="margin:0"><b>${a}</b> ta so'z topdingiz${st.total ? ` (jami ${st.total} tadan)` : ""} · rekord ${best}</p>
        <button class="btn green" data-end="again">Yana o'ynash</button><button class="btn alt" data-end="reveal">👀 Topilmagan so'zlar</button><button class="btn alt" data-end="menu">Menyuga</button></div></div>`;
    }
    const res = room.result || {};
    const title = res.winner === "draw" ? "Durang 🤝" : res.winner === meKey ? "Siz yutdingiz! 🏆" : res.winner ? "Raqib yutdi" : "Natija hisoblanmoqda…";
    const offer = room.state?.rematch && !isMe(room.state.rematch_by);
    const leftNote = room.state?.left ? `<p class="small muted" style="margin:0">${isMe(room.state.resigned) ? "Siz o'yindan chiqib ketgansiz" : "Raqib o'yinni tashlab chiqib ketdi"}</p>` : "";
    return `<div class="overlay"><div class="card stack center"><h2>${title}</h2>
      <p class="muted" style="margin:0">So'zlar: <b>${a}</b> : ${b}</p>${ratingLine(room)}${leftNote}
      <button class="btn green" data-end="rematch">${offer ? "✅ Revanshni qabul qilish" : "🔁 Revansh"}</button>
      <button class="btn alt" data-end="reveal">👀 So'zlarni ko'rish</button>
      <button class="btn alt" data-end="lb">🏆 Reyting</button><button class="btn alt" data-end="menu">Menyuga</button></div></div>`;
  }

  async function endAction(a) {
    if (a === "menu") return home();
    if (a === "reveal") { reveal = true; draw(); return window.scrollTo({ top: 0, behavior: "smooth" }); }
    if (a === "result") { reveal = false; return draw(); }
    if (a === "lb") return show(nav.leaderboard("all"));
    if (a === "again") { const ns = await generate(st.seconds || SECONDS); return show(molGame({ room: null, state: { ...ns, ends_at: Date.now() + 3000 + ns.seconds * 1000 } }), false); }
    if (a === "rematch") {
      try {
        const r = await api("rematch", { id: room.id, state: await generate(st.seconds || SECONDS) });
        if (r.error) return toast("Revansh ochilmadi");
        if (r.status === "playing") show(molGame({ room: r }), false);
        else show(molWaiting(r, false), false);
      } catch (e) { toast(e.message); }
    }
  }

  function render() {
    app().innerHTML = header("Molekula") + `
      <div class="sbar"></div>
      <div class="moltotal"></div>
      <div class="preview"></div>
      <div class="molmsg"></div>
      <div class="wwrap"><div class="molboard"></div><div id="cd"></div></div>
      <div class="moltools"><button class="btn alt" data-shuf aria-label="Aralashtirish">↻ Aralashtirish</button></div>
      <div class="found"></div>
      <div id="ov"></div>`;
    bindBack();
    drawBoard();
    app().querySelector("[data-shuf]").onclick = shuffle;
    draw();
  }

  return {
    async render() {
      alive = true;
      await dict().catch(() => {});
      render();
      tick = setInterval(async () => {
        draw();
        if (room && room.status === "playing" && left() === 0 && !finishing) {
          finishing = true;
          try { const r = await api("finish", { id: room.id }); if (r.id) { room = r; st = r.state; } } catch (e) {}
          if (room.status === "done") refreshProfile(); else finishing = false;
          draw();
        }
      }, 400);
      if (room && !poll) {
        poll = setInterval(async () => {
          if (pending) return;
          try {
            const r = await read("g_room_get", { p_id: room.id });
            if (!r.error && r.version > room.version) {
              const before = themWords().length;
              const mine = mineWords();
              room = r; st = r.state;
              // serverga hali yetib bormagan o'z so'zlarimiz yo'qolib qolmasin
              const srv = new Set(st.found?.[meKey] || []);
              const extra = mine.filter(w => !srv.has(w));
              if (extra.length && room.status === "playing") st.found = { ...st.found, [meKey]: [...(st.found?.[meKey] || []), ...extra] };
              if (themWords().length > before) haptic("medium");
              if (r.status === "done") refreshProfile();
              draw();
            }
          } catch (e) {}
        }, 1000);
      }
    },
    busy: true, act: `mol:${opt.room ? "online" : "solo"}`,
    leave() { alive = false; clearInterval(poll); clearInterval(tick); poll = null; },
  };
}
