// Bambuk: dojoda bambuk ustunini kesing. Chap yoki o'ng tomonni bosing — qoziqqa urilmang, kuch tugamasin.
// Yolg'iz rejim va 1 vs 1 poyga: ikkala o'yinchiga bir xil ustun, 45 soniya, kim ko'p ball yig'sa — yutadi.
import { app, header, bindBack, show, home, api, read, toast, haptic, load, save, scoreCard, ratingLine, refreshProfile, waitScreen, isMe, esc, nav } from "./core.js";
import { LEFT, RIGHT, newGame, chop, drain, MIN_GAP } from "./bambuk-engine.js";

const SEG = 58, VIS = 8;
const best = () => +load("bambuk-best") || 0;

const HERO = `<svg viewBox="0 0 72 92" class="bb-svg" aria-hidden="true">
  <ellipse cx="36" cy="88.5" rx="21" ry="3.5" fill="#0003"/>
  <ellipse cx="26" cy="84" rx="9" ry="5.5" fill="#20232b"/><ellipse cx="46" cy="84" rx="9" ry="5.5" fill="#20232b"/>
  <ellipse cx="36" cy="64" rx="21" ry="20" fill="#fbfbfd"/>
  <path d="M16 70h40v7a20 12 0 0 1-40 0z" fill="#fbfbfd"/>
  <rect x="15" y="66" width="42" height="7" rx="3.5" fill="#e5483f"/><path d="M33 72l-5 11 6-3zM39 72l5 11-6-3z" fill="#c9372f"/>
  <ellipse cx="15" cy="60" rx="6.5" ry="11" fill="#20232b" transform="rotate(14 15 60)"/>
  <rect x="48" y="56" width="13" height="11" rx="5.5" fill="#20232b"/>
  <circle class="bb-fist" cx="62" cy="62" r="8" fill="#20232b"/><circle cx="60" cy="59" r="2.2" fill="#fff" opacity=".25"/>
  <circle cx="17" cy="16" r="8.5" fill="#20232b"/><circle cx="55" cy="16" r="8.5" fill="#20232b"/>
  <circle cx="36" cy="33" r="22.5" fill="#fbfbfd"/>
  <ellipse cx="26.5" cy="34" rx="6" ry="7.6" fill="#20232b" transform="rotate(20 26.5 34)"/><ellipse cx="45.5" cy="34" rx="6" ry="7.6" fill="#20232b" transform="rotate(-20 45.5 34)"/>
  <circle cx="27.5" cy="34" r="2.3" fill="#fff"/><circle cx="44.5" cy="34" r="2.3" fill="#fff"/><circle cx="28" cy="33.4" r=".9" fill="#20232b"/><circle cx="44" cy="33.4" r=".9" fill="#20232b"/>
  <ellipse cx="36" cy="42.5" rx="3.6" ry="2.6" fill="#20232b"/>
  <path d="M32 47q4 3.2 8 0" stroke="#20232b" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <path d="M14 22q22-9 44 0l1 6q-23-8-46 0z" fill="#e5483f"/><path d="M58 22l11-3-2 8zM58 26l10 6-12-1z" fill="#c9372f"/>
</svg>`;


export function bambukMenu() {
  return {
    render() {
      app().innerHTML = header("Bambuk") + scoreCard() + `
        <div class="card soz-intro" style="margin-top:12px">
          <b>Qanday o'ynaladi:</b> dojoda baland bambuk ustuni turibdi. <b>Ekranning chap yoki o'ng yarmini bosing</b> — panda o'sha tomonga o'tib, ustunning pastki bo'lagini uradi.
          <p class="small muted" style="margin:8px 0 0">Yon tomonga chiqib turgan <b>qoziqqa</b> urilsangiz — o'yin tugaydi. Kuch chizig'i doim kamayadi: tez uring! Ketma-ket tez urishlar ballni <b>2×, 3×… 5×</b> qiladi.
          1 vs 1 da ikkalangizga <b>bir xil ustun</b> chiqadi, 45 soniyada kim ko'p ball yig'sa — yutadi.</p>
        </div>
        <div class="stack" style="margin-top:12px">
          <button class="bigbtn b-fast" data-act="match"><span class="ic">⚡</span><span><b>Tezkor o'yin</b><small>Tasodifiy raqib · reyting uchun</small></span></button>
          <button class="bigbtn b-friend" data-act="create"><span class="ic">👥</span><span><b>Do'stni chaqirish</b><small>Do'stlar yoki havola orqali</small></span></button>
          <button class="bigbtn b-ai" data-act="solo"><span class="ic">🎋</span><span><b>Yolg'iz o'ynash</b><small>Rekord: ${best()} ball</small></span></button>
        </div>
        <p class="small muted center" style="margin-top:12px">Kompyuterda ← → tugmalari ham ishlaydi.</p>`;
      bindBack();
      app().querySelector('[data-act="solo"]').onclick = () => show(bambukGame());
      app().querySelector('[data-act="create"]').onclick = () => startOnline("create");
      app().querySelector('[data-act="match"]').onclick = () => startOnline("match");
    },
  };
}

async function startOnline(kind) {
  let room;
  try { room = await api(kind, { game: "bambuk" }); } catch (e) { return toast(e.message); }
  openBambukRoom(room, kind === "match");
}
export function openBambukRoom(room, matching = false) {
  if (room.status === "playing" || room.status === "done") return show(bambukGame({ room }));
  show(bambukWaiting(room, matching));
}
export async function createPrivate(invited = "") {
  const room = await api("create", { game: "bambuk" });
  if (!room?.id) throw new Error("Xona ochilmadi");
  show(bambukWaiting(room, false, invited));
  return room;
}
function bambukWaiting(room, matching, invited = "") {
  return waitScreen(room, { matching, invited, icon: "🐼", shareText: "Bambukda bellashamizmi? 🐼", onStart: r => show(bambukGame({ room: r }), false) });
}

export function bambukGame(opt = {}) {
  let room = opt.room || null;
  const online = !!room;
  const meKey = online && !isMe(room.p1) ? "p2" : "p1", themKey = meKey === "p1" ? "p2" : "p1";
  const seconds = online ? Number(room.state?.seconds) || 45 : 0, limit = seconds * 1000;
  let st, raf = 0, started = false, running = false, over = false, root, keyH, cdT, pollT;
  let t0 = 0, prevT = 0, lastTap = -1e9, taps = [], submitted = false, finishing = false;
  const q = s => root.querySelector(s);

  const colHTML = () => {
    let h = "";
    for (let j = 0; j < VIS + 1; j++) {
      const o = st.track[st.i + j];
      h += `<div class="bb-seg" style="bottom:${j * SEG}px;height:${SEG}px">${o === LEFT ? `<i class="bb-stake l"></i>` : o === RIGHT ? `<i class="bb-stake r"></i>` : ""}</div>`;
    }
    return h;
  };
  function paint(animate) {
    const col = q(".bb-col");
    col.innerHTML = colHTML();
    if (animate) {
      col.style.transition = "none"; col.style.transform = `translateY(${-SEG}px)`;
      void col.offsetWidth;
      col.style.transition = "transform .07s linear"; col.style.transform = "translateY(0)";
    }
    q(".bb-score").textContent = st.score;
    const m = q(".bb-mult"); m.textContent = st.mult + "×"; m.classList.toggle("on", st.mult > 1);
    energyUI();
  }
  function energyUI() { q(".bb-en i").style.width = st.energy + "%"; q(".bb-en").classList.toggle("low", st.energy < 25); }
  function fly(side) {
    const f = document.createElement("div");
    f.className = "bb-fly " + (side === LEFT ? "r" : "l");
    q(".bb-stage").appendChild(f);
    setTimeout(() => f.remove(), 380);
  }
  const clockTxt = t => { const left = Math.max(0, Math.ceil((limit - t) / 1000)); return `0:${String(left).padStart(2, "0")}`; };

  // vaqt bo'yicha holatni yangilaymiz (kuch kamayishi): urishlar orasidagi vaqt bir xil hisoblanadi — server ham shunday qayta o'ynaydi
  function advance(t) { if (t > prevT) { drain(st, (t - prevT) / 1000); prevT = t; } }

  function begin() {
    started = running = true;
    t0 = performance.now(); prevT = 0;
    const h = q(".bb-hint"); if (h) h.style.display = "none";
    loop();
  }

  function hit(side) {
    if (over) return;
    if (online && !running) return;
    if (!online && !started) { begin(); }
    const hero = q(".bb-hero");
    hero.classList.toggle("r", side === RIGHT); hero.classList.remove("hit"); void hero.offsetWidth; hero.classList.add("hit");
    if (online) {
      const t = Math.round(performance.now() - t0);
      if (t - lastTap < MIN_GAP) return;
      if (t >= limit) return end("vaqt");
      advance(t);
      if (st.dead) return end();
      lastTap = t;
      fly(side); chop(st, side, t); taps.push([side, t]);
    } else {
      fly(side); chop(st, side, performance.now());
    }
    haptic("light");
    paint(true);
    if (st.dead) end();
  }

  function loop() {
    raf = requestAnimationFrame(tm => {
      if (over) return;
      if (online) {
        const t = Math.min(limit, Math.round(performance.now() - t0));
        advance(t); energyUI();
        q(".bb-time").textContent = clockTxt(t);
        if (st.dead) return end();
        if (t >= limit) return end("vaqt");
      } else {
        if (document.hidden) { prevT = tm; return loop(); }
        drain(st, Math.min(0.1, (tm - (prevT || tm)) / 1000)); prevT = tm;
        energyUI();
        if (st.dead) return end();
      }
      loop();
    });
  }

  function end(reason) {
    if (over) return; over = true; cancelAnimationFrame(raf);
    if (reason && !st.dead) st.dead = reason;
    haptic(st.dead === "vaqt" ? "ok" : "error");
    if (st.dead !== "vaqt") q(".bb-hero").classList.add("ko");
    if (online) return setTimeout(finishOnline, 500);
    const prev = best(), isNew = st.score > prev;
    if (isNew) save("bambuk-best", st.score);
    setTimeout(() => {
      if (!root.isConnected) return;
      overlay(`<div class="card center stack"><div style="font-size:34px">${st.dead === "qoziq" ? "🎋" : "😮‍💨"}</div>
        <h2 style="margin:0">${st.dead === "qoziq" ? "Qoziqqa urildingiz!" : "Kuch tugadi"}</h2>
        <div class="bb-big">${st.score}</div><p class="muted" style="margin:0">${isNew ? "🏆 Yangi rekord!" : `Rekord: ${prev}`}</p>
        <button class="btn green" data-again>Qayta o'ynash</button><button class="btn alt" data-menu>Menyu</button></div>`);
      q("[data-again]").onclick = () => show(bambukGame(), false);
      q("[data-menu]").onclick = () => show(bambukMenu(), false);
    }, 650);
  }

  function overlay(html) {
    q(".bb-over")?.remove();
    const ov = document.createElement("div"); ov.className = "bb-over"; ov.innerHTML = html;
    q(".bb-stage").appendChild(ov);
  }

  // ---- 1 vs 1: natijani yuborish va raqibni kutish ----
  async function finishOnline() {
    if (!root?.isConnected) return;
    renderResult();
    for (let k = 0; k < 4 && !submitted; k++) {
      try {
        const r = await api("bam_submit", { id: room.id, taps });
        if (r?.id) { room = r; submitted = true; if (r.status === "done") refreshProfile(); }
        else if (r?.error === "bad_taps") { submitted = true; toast("Natija qabul qilinmadi"); }
      } catch (e) { await new Promise(r => setTimeout(r, 800)); }
    }
    renderResult();
    pollT = setInterval(async () => {
      if (!root?.isConnected) return clearInterval(pollT);
      try {
        const r = await read("g_room_get", { p_id: room.id });
        if (!r.error && r.version >= room.version) { const was = room.status; room = r; if (r.status === "done" && was !== "done") { refreshProfile(); haptic("ok"); } renderResult(); }
        if (room.status === "playing" && !finishing && Date.now() > (room.state?.ends_at || 0) + 20000) {
          finishing = true;
          const rr = await api("bam_finish", { id: room.id }); if (rr?.id) { room = rr; if (rr.status === "done") refreshProfile(); renderResult(); }
          finishing = false;
        }
      } catch (e) {}
      if (room.status === "done") clearInterval(pollT);
    }, 1000);
  }
  function renderResult() {
    if (!root?.isConnected) return;
    const mine = room.state?.res?.[meKey], their = room.state?.res?.[themKey];
    const myScore = mine ? mine.score : st.score, name = (meKey === "p1" ? room.p2_name : room.p1_name) || "Raqib";
    if (room.status !== "done") {
      overlay(`<div class="card center stack"><div class="radar sm"><span></span><span></span><b>🐼</b></div><h2 style="margin:0">Ball: ${myScore}</h2>
        <p class="muted" style="margin:0">${their ? "Natija hisoblanmoqda…" : `<b>${esc(name)}</b> tugatishini kutyapmiz…`}</p></div>`);
      return;
    }
    const res = room.result || {};
    const title = res.winner === "draw" ? "Durang 🤝" : res.winner === meKey ? "Siz yutdingiz! 🏆" : "Raqib yutdi";
    const offer = room.state?.rematch && !isMe(room.state.rematch_by);
    overlay(`<div class="card center stack"><h2 style="margin:0">${title}</h2>
      <div class="bb-vs"><div><b>${myScore}</b><small>Siz</small></div><span>:</span><div><b>${their ? their.score : "—"}</b><small>${esc(name)}</small></div></div>
      ${ratingLine(room)}
      <button class="btn green" data-end="rematch">${offer ? "✅ Revanshni qabul qilish" : "🔁 Revansh"}</button>
      <button class="btn alt" data-end="lb">🏆 Reyting</button><button class="btn alt" data-end="menu">Menyuga</button></div>`);
    root.querySelectorAll("[data-end]").forEach(b => b.onclick = async () => {
      const a = b.dataset.end;
      if (a === "menu") return home();
      if (a === "lb") return show(nav.leaderboard("all"));
      try {
        const r = await api("rematch", { id: room.id, game: "bambuk" });
        if (r.error) return toast("Revansh ochilmadi");
        if (r.status === "playing") show(bambukGame({ room: r }), false); else show(bambukWaiting(r, false), false);
      } catch (e) { toast(e.message); }
    });
  }

  return {
    busy: true, act: online ? "bambuk:online" : "bambuk:solo",
    render() {
      const seed = online ? Number(room.state?.seed) : (Math.random() * 2 ** 31) | 0;
      st = newGame(seed);
      const vs = online ? esc((meKey === "p1" ? room.p2_name : room.p1_name) || "Raqib") : "";
      app().innerHTML = header("Bambuk") + `<div class="bb-wrap"><div class="bb-stage">
        <div class="bb-moon"></div><div class="bb-hills"></div>
        <div class="bb-hud"><div class="bb-sc"><b class="bb-score">0</b><span class="bb-mult">1×</span></div>${online ? `<span class="bb-best bb-time">0:${String(seconds).padStart(2, "0")}</span>` : `<span class="bb-best">🏆 ${best()}</span>`}</div>
        <div class="bb-en"><i></i></div>
        ${online ? `<div class="bb-vsn">🐼 ${vs} bilan</div>` : ""}
        <div class="bb-trunk"><div class="bb-col"></div></div>
        <div class="bb-hero">${HERO}</div>
        <div class="bb-ground"></div>
        <div class="bb-hint">${online ? "" : "Boshlash uchun chap yoki o'ng tomonni bosing"}</div>
        <div class="bb-cd"></div>
        <button class="bb-tap l" aria-label="Chapga urish"></button><button class="bb-tap r" aria-label="O'ngga urish"></button>
      </div></div>`;
      bindBack(); root = app();
      paint(false);
      const tap = side => e => { e.preventDefault(); hit(side); };
      q(".bb-tap.l").addEventListener("pointerdown", tap(LEFT));
      q(".bb-tap.r").addEventListener("pointerdown", tap(RIGHT));
      keyH = e => { if (e.key === "ArrowLeft" || e.key === "a") hit(LEFT); else if (e.key === "ArrowRight" || e.key === "d") hit(RIGHT); };
      document.addEventListener("keydown", keyH);
      if (online) {
        const startsAt = Number(room.state?.starts_at) || Date.now();
        cdT = setInterval(() => {
          const cd = q(".bb-cd"); if (!cd) return clearInterval(cdT);
          const left = startsAt - Date.now();
          if (left <= 0) { clearInterval(cdT); cd.textContent = "Boshlang!"; setTimeout(() => cd.remove(), 500); if (!started && !over) begin(); }
          else cd.textContent = Math.ceil(left / 1000);
        }, 100);
      }
    },
    leave() { over = true; cancelAnimationFrame(raf); clearInterval(cdT); clearInterval(pollT); document.removeEventListener("keydown", keyH); },
  };
}
