// Bambuk: dojoda bambuk ustunini kesing. Chap yoki o'ng tomonni bosing — qoziqqa urilmang, kuch tugamasin.
import { app, header, bindBack, show, haptic, load, save, scoreCard, esc } from "./core.js";
import { LEFT, RIGHT, newGame, chop, drain } from "./bambuk-engine.js";

const SEG = 58, VIS = 8;
const best = () => +load("bambuk-best") || 0;

const HERO = `<svg viewBox="0 0 72 92" class="bb-svg" aria-hidden="true">
  <defs><linearGradient id="bbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfeaff"/><stop offset="1" stop-color="#3f8fe6"/></linearGradient></defs>
  <ellipse cx="36" cy="88" rx="20" ry="3.5" fill="#0003"/>
  <path d="M36 6C36 6 12 36 12 58a24 24 0 0 0 48 0C60 36 36 6 36 6Z" fill="url(#bbg)"/>
  <ellipse cx="26" cy="52" rx="5" ry="9" fill="#fff" opacity=".35" transform="rotate(18 26 52)"/>
  <path d="M13 42h46v8H13z" fill="#e5483f"/><path d="M58 44l10-5-2 10zM58 47l9 6-11 1z" fill="#c9372f"/>
  <circle cx="45" cy="58" r="3.2" fill="#10233f"/><circle cx="29" cy="58" r="3.2" fill="#10233f"/>
  <path d="M33 68q4 3 8 0" stroke="#10233f" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <circle class="bb-fist" cx="58" cy="70" r="7.5" fill="#f6c9a0" stroke="#d99a6c" stroke-width="1.5"/>
  <ellipse cx="26" cy="86" rx="8" ry="4" fill="#243a5e"/><ellipse cx="46" cy="86" rx="8" ry="4" fill="#243a5e"/>
</svg>`;

export function bambukMenu() {
  return {
    render() {
      app().innerHTML = header("Bambuk") + scoreCard() + `
        <div class="card soz-intro" style="margin-top:12px">
          <b>Qanday o'ynaladi:</b> dojoda baland bambuk ustuni turibdi. <b>Ekranning chap yoki o'ng yarmini bosing</b> — qahramon o'sha tomonga o'tib, ustunning pastki bo'lagini uradi.
          <p class="small muted" style="margin:8px 0 0">Yon tomonga chiqib turgan <b>qoziqqa</b> urilsangiz — o'yin tugaydi. Kuch chizig'i doim kamayadi: tez uring! Ketma-ket tez urishlar ballni <b>2×, 3×… 5×</b> qiladi.</p>
        </div>
        <div class="stack" style="margin-top:12px">
          <button class="bigbtn b-ai" data-act="solo"><span class="ic">🎋</span><span><b>Yolg'iz o'ynash</b><small>Rekord: ${best()} ball</small></span></button>
        </div>
        <p class="small muted center" style="margin-top:12px">Kompyuterda ← → tugmalari ham ishlaydi.</p>`;
      bindBack();
      app().querySelector('[data-act="solo"]').onclick = () => show(bambukGame());
    },
  };
}

export function bambukGame() {
  let st, raf = 0, lastT = 0, started = false, over = false, root, keyH, visH;

  const colHTML = () => {
    let h = "";
    for (let j = 0; j < VIS + 1; j++) {
      const o = st.track[st.i + j];
      h += `<div class="bb-seg" style="bottom:${j * SEG}px;height:${SEG}px">${o === LEFT ? `<i class="bb-stake l"></i>` : o === RIGHT ? `<i class="bb-stake r"></i>` : ""}</div>`;
    }
    return h;
  };
  const q = s => root.querySelector(s);

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
    q(".bb-en i").style.width = st.energy + "%";
    q(".bb-en").classList.toggle("low", st.energy < 25);
  }

  function fly(side) {
    const f = document.createElement("div");
    f.className = "bb-fly " + (side === LEFT ? "r" : "l"); // bo'lak qahramondan uzoqqa uchadi
    q(".bb-stage").appendChild(f);
    setTimeout(() => f.remove(), 380);
  }

  function hit(side) {
    if (over) return;
    if (!started) { started = true; lastT = performance.now(); q(".bb-hint").style.display = "none"; loop(); }
    const hero = q(".bb-hero");
    hero.classList.toggle("r", side === RIGHT); hero.classList.remove("hit"); void hero.offsetWidth; hero.classList.add("hit");
    fly(side);
    chop(st, side, performance.now());
    haptic("light");
    paint(true);
    if (st.dead) end();
  }

  function loop() {
    raf = requestAnimationFrame(t => {
      if (over) return;
      if (document.hidden) { lastT = t; return loop(); }
      drain(st, Math.min(0.1, (t - lastT) / 1000)); lastT = t;
      q(".bb-en i").style.width = st.energy + "%";
      q(".bb-en").classList.toggle("low", st.energy < 25);
      if (st.dead) return end();
      loop();
    });
  }

  function end() {
    if (over) return; over = true; cancelAnimationFrame(raf);
    haptic("error");
    q(".bb-hero").classList.add("ko");
    const prev = best(), isNew = st.score > prev;
    if (isNew) save("bambuk-best", st.score);
    setTimeout(() => {
      if (!root.isConnected) return;
      const ov = document.createElement("div"); ov.className = "bb-over";
      ov.innerHTML = `<div class="card center stack"><div style="font-size:34px">${st.dead === "qoziq" ? "🎋" : "😮‍💨"}</div>
        <h2 style="margin:0">${st.dead === "qoziq" ? "Qoziqqa urildingiz!" : "Kuch tugadi"}</h2>
        <div class="bb-big">${st.score}</div><p class="muted" style="margin:0">${isNew ? "🏆 Yangi rekord!" : `Rekord: ${prev}`}</p>
        <button class="btn green" data-again>Qayta o'ynash</button><button class="btn alt" data-menu>Menyu</button></div>`;
      q(".bb-stage").appendChild(ov);
      ov.querySelector("[data-again]").onclick = () => show(bambukGame(), false);
      ov.querySelector("[data-menu]").onclick = () => show(bambukMenu(), false);
    }, 650);
  }

  return {
    busy: true, act: "bambuk:solo",
    render() {
      st = newGame((Math.random() * 2 ** 31) | 0);
      app().innerHTML = header("Bambuk") + `<div class="bb-wrap"><div class="bb-stage">
        <div class="bb-moon"></div><div class="bb-hills"></div>
        <div class="bb-hud"><div class="bb-sc"><b class="bb-score">0</b><span class="bb-mult">1×</span></div><span class="bb-best">🏆 ${best()}</span></div>
        <div class="bb-en"><i></i></div>
        <div class="bb-trunk"><div class="bb-col"></div></div>
        <div class="bb-hero">${HERO}</div>
        <div class="bb-ground"></div>
        <div class="bb-hint">Boshlash uchun chap yoki o'ng tomonni bosing</div>
        <button class="bb-tap l" aria-label="Chapga urish"></button><button class="bb-tap r" aria-label="O'ngga urish"></button>
      </div></div>`;
      bindBack(); root = app();
      paint(false);
      const tap = side => e => { e.preventDefault(); hit(side); };
      q(".bb-tap.l").addEventListener("pointerdown", tap(LEFT));
      q(".bb-tap.r").addEventListener("pointerdown", tap(RIGHT));
      keyH = e => { if (e.key === "ArrowLeft" || e.key === "a") hit(LEFT); else if (e.key === "ArrowRight" || e.key === "d") hit(RIGHT); };
      document.addEventListener("keydown", keyH);
    },
    leave() { over = true; cancelAnimationFrame(raf); document.removeEventListener("keydown", keyH); },
  };
}
