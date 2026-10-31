import { app, header, bindBack, show, home, me, api, read, toast, haptic, esc, load, save, shareInvite, copy,
  rating, ratingLine, refreshProfile, nav } from "./core.js";

const N = 10;
const SECONDS = 180;
const WORD_COUNT = 10;

// Tutuq belgisisiz (o', g') o'zbekcha so'zlar — 3–8 harf
const WORDS = (`KITOB MAKTAB DAFTAR QALAM USTOZ BILIM DARS SAVOL JAVOB OTA ONA AKA UKA OPA SINGIL BOBO BUVI OILA ESHIK DERAZA
STOL STUL XONA OSHXONA NON SUV CHOY OSH SOMSA MANTI OLMA NOK UZUM ANOR BEHI QOVUN TARVUZ SHAFTOLI GILOS BODOM YONGOQ PISTA
SABZI PIYOZ POMIDOR BODRING SHAHAR QISHLOQ BOZOR MAYDON DARYO DENGIZ OSMON YULDUZ QUYOSH BULUT QOR SHAMOL BAHOR KUZ QISH
KUN TUN ERTA KECHA SOAT VAQT YIL HAFTA MASHINA POYEZD SAMOLYOT AVTOBUS MUSHUK SIGIR ECHKI TUYA ARSLON BURGUT QUSH BALIQ
ILON AYIQ TULKI QUYON KAPALAK CHUMOLI GUL LOLA RAYHON DARAXT CHINOR TERAK BARG ILDIZ MEVA SEVGI BAXT QUVONCH TINCHLIK
VATAN XALQ TIL MUSIQA RASM KINO TEATR SPORT FUTBOL KURASH SHASHKA SHAXMAT BAYRAM ERTAK QAHRAMON SHER KUCH AQL YURAK BOSH
QULOQ BURUN TISH SOCH OYOQ BARMOQ TIRNOQ KIYIM SHIM DOPPI CHOPON ETIK TELEFON RADIO GAZETA XABAR XAT POCHTA PUL NARX SAVDO
ISH MEHNAT DEHQON USTA SHIFOKOR DORI BOLA QIZ ODAM INSON DUNYO OLAM HAYOT OLTIN KUMUSH TEMIR TOSH QUM TUPROQ OLOV ISSIQ
SOVUQ YASHIL QIZIL SARIQ QORA PUSHTI KULRANG LIMON ASAL SHAKAR TUZ GURUCH SUT QAYMOQ PISHLOQ TUXUM KABOB PALOV TANDIR
QOZON PICHOQ KALIT SOAT RUCHKA KITOBXONA SAYOHAT POYTAXT TOSHKENT SAMARQAND BUXORO XIVA ANDIJON
NAMANGAN NUKUS TERMIZ QARSHI JIZZAX NAVOIY GULISTON`)
  .split(/\s+/).filter(w => w.length >= 3 && w.length <= 8);
const UNIQUE = [...new Set(WORDS)];
const FILL = "AAAAAAIIIIIOOOOOUUUEEELLLRRRNNNSSSTTTKKKMMMDDBBYYQQHHZZGGVXJPF";
const DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1]];

export function generate() {
  for (let attempt = 0; attempt < 50; attempt++) {
    const grid = new Array(N * N).fill("");
    const words = [];
    const pool = UNIQUE.slice().sort(() => Math.random() - 0.5);
    for (const w of pool) {
      if (words.length >= WORD_COUNT) break;
      let placed = false;
      for (let t = 0; t < 80 && !placed; t++) {
        const [dr, dc] = DIRS[(Math.random() * DIRS.length) | 0];
        const r0 = (Math.random() * N) | 0, c0 = (Math.random() * N) | 0;
        const cells = [];
        let ok = true;
        for (let k = 0; k < w.length; k++) {
          const r = r0 + dr * k, c = c0 + dc * k;
          if (r < 0 || r >= N || c < 0 || c >= N) { ok = false; break; }
          const i = r * N + c;
          if (grid[i] && grid[i] !== w[k]) { ok = false; break; }
          cells.push(i);
        }
        if (!ok) continue;
        cells.forEach((i, k) => grid[i] = w[k]);
        words.push({ w, cells });
        placed = true;
      }
    }
    if (words.length < WORD_COUNT) continue;
    for (let i = 0; i < grid.length; i++) if (!grid[i]) grid[i] = FILL[(Math.random() * FILL.length) | 0];
    return { grid, words, claimed: {}, seconds: SECONDS };
  }
  throw new Error("generate failed");
}

// ---------------- lobby ----------------
export function sozMenu() {
  return {
    render() {
      app().innerHTML = header("So'z jangi") + `
        <div class="lobby-top"><span>Reytingingiz</span><b>${rating("soz")}</b></div>
        <div class="card soz-intro">
          <b>Qoidasi oddiy:</b> 10×10 harflar ichida ${WORD_COUNT} ta o'zbekcha so'z yashiringan. So'zni topsangiz — barmoq bilan
          birinchi harfdan oxirgisigacha chizing. Kim 3 daqiqada ko'proq so'z topsa, o'sha yutadi. Raqib topgan so'z sizga qolmaydi!
        </div>
        <div class="stack" style="margin-top:12px">
          <button class="bigbtn b-fast" data-act="match"><span class="ic">⚡</span><span><b>Tezkor o'yin</b><small>Tasodifiy raqib · reyting uchun</small></span></button>
          <button class="bigbtn b-friend" data-act="create"><span class="ic">🔗</span><span><b>Do'stni chaqirish</b><small>Havola yuboring</small></span></button>
          <button class="bigbtn b-ai" data-act="solo"><span class="ic">🎯</span><span><b>Yolg'iz mashq</b><small>3 daqiqada nechta topasiz? Rekord: ${load("soz-best") || 0}</small></span></button>
        </div>`;
      bindBack();
      app().querySelector('[data-act="solo"]').onclick = () => show(sozGame({ mode: "solo" }));
      app().querySelector('[data-act="create"]').onclick = () => startOnline("create");
      app().querySelector('[data-act="match"]').onclick = () => startOnline("match");
    },
  };
}

async function startOnline(kind) {
  let room;
  try { room = await api(kind, { game: "soz", state: generate() }); } catch (e) { return toast(e.message); }
  openSozRoom(room, kind === "match");
}

export function openSozRoom(room, matching = false) {
  if (room.status === "playing" || room.status === "done") return show(sozGame({ mode: "online", room }));
  show(sozWaiting(room, matching));
}

function sozWaiting(room, matching) {
  let timer;
  return {
    render() {
      app().innerHTML = header(matching ? "Raqib qidirilmoqda" : "Do'stni kutyapmiz") + `
        <div class="card stack center">
          ${matching ? `<div class="radar"><span></span><span></span><span></span><b>🔤</b></div><p class="muted" style="margin:0">Raqib qidiryapmiz…</p>`
            : `<p class="muted" style="margin:0">Xona kodi</p><div class="code">${room.id}</div>
               <p class="small muted" style="margin:0">Do'stingiz kirishi bilan 3 daqiqalik jang boshlanadi.</p>`}
          <button class="btn" data-share>📨 Do'stga yuborish</button>
          ${matching ? "" : `<button class="btn alt" data-copy>Kodni nusxalash</button>`}
        </div>`;
      bindBack();
      app().querySelector("[data-share]").onclick = () => shareInvite(room.id, `So'z jangiga chiqasanmi? 🔤 Xona: ${room.id}`);
      const c = app().querySelector("[data-copy]"); if (c) c.onclick = () => copy(room.id);
      timer = setInterval(async () => {
        try {
          const r = await read("g_room_get", { p_id: room.id });
          if (r.status === "playing") { clearInterval(timer); haptic("ok"); show(sozGame({ mode: "online", room: r }), false); }
        } catch (e) {}
      }, 1200);
    },
    leave() { clearInterval(timer); },
  };
}

// ---------------- o'yin ----------------
function sozGame(opt) {
  let room = opt.room || null;
  let st = room ? room.state : { ...generate(), ends_at: Date.now() + 3000 + SECONDS * 1000 };
  const meKey = room ? (room.p1 === me().id ? "p1" : "p2") : "p1";
  let sel = [], startCell = null, poll = null, tick = null, finishing = false, alive = true, pending = new Set();

  const claimedBy = w => st.claimed?.[w];
  const score = who => Object.values(st.claimed || {}).filter(x => x === who).length;
  const left = () => Math.max(0, Math.ceil(((st.ends_at || 0) - Date.now()) / 1000));
  const started = () => Date.now() >= (st.ends_at || 0) - (st.seconds || SECONDS) * 1000;
  const done = () => room ? room.status === "done" : (left() === 0 || Object.keys(st.claimed).length >= st.words.length);

  function lineCells(a, b) {
    const [r1, c1] = [(a / N) | 0, a % N], [r2, c2] = [(b / N) | 0, b % N];
    const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
    const len = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));
    if (!(r1 === r2 || c1 === c2 || Math.abs(r2 - r1) === Math.abs(c2 - c1))) return [a];
    return Array.from({ length: len + 1 }, (_, k) => (r1 + dr * k) * N + (c1 + dc * k));
  }

  async function tryWord(cells) {
    const s = cells.map(i => st.grid[i]).join("");
    const rev = s.split("").reverse().join("");
    const hit = st.words.find(x => (x.w === s || x.w === rev) && x.cells.length === cells.length);
    if (!hit) { if (cells.length > 2) { haptic("error"); flash("bad"); } return; }
    if (claimedBy(hit.w)) { toast(claimedBy(hit.w) === meKey ? "Bu so'zni allaqachon topgansiz" : "Raqib oldinroq topdi 😅"); return; }
    haptic("ok");
    if (!room) { st.claimed[hit.w] = "p1"; draw(); if (done()) finishSolo(); return; }
    pending.add(hit.w); st.claimed = { ...st.claimed, [hit.w]: meKey }; draw();
    try {
      const r = await api("claim", { id: room.id, word: hit.w });
      pending.delete(hit.w);
      if (r.error === "taken") { room = r; st = r.state; toast("Raqib bir lahza oldin topdi 😅"); }
      else if (!r.error) { room = r; st = r.state; }
      else if (r.error === "time_up") { room = r; st = r.state; }
    } catch (e) { pending.delete(hit.w); toast("Internet bilan muammo"); }
    draw();
  }

  function flash(kind) {
    const g = document.querySelector(".wgrid"); if (!g) return;
    g.classList.add(kind); setTimeout(() => g.classList.remove(kind), 300);
  }

  function finishSolo() {
    const n = score("p1");
    if (n > +(load("soz-best") || 0)) save("soz-best", n);
  }

  function cellColor(i) {
    for (const w of st.words) {
      const who = claimedBy(w.w);
      if (who && w.cells.includes(i)) return who === meKey ? "mine" : "theirs";
    }
    return "";
  }

  function draw() {
    if (!alive) return;
    const grid = document.querySelector(".wgrid");
    if (!grid) return;
    const selSet = new Set(sel);
    grid.querySelectorAll(".lt").forEach(el => {
      const i = +el.dataset.i;
      el.className = `lt ${cellColor(i)} ${selSet.has(i) ? "sel" : ""}`;
    });
    document.querySelector(".wlist").innerHTML = st.words.map(x => {
      const who = claimedBy(x.w);
      return `<span class="wchip ${who ? (who === meKey ? "mine" : "theirs") : ""}">${x.w}</span>`;
    }).join("");
    const t = left();
    const sc1 = score(meKey), sc2 = score(meKey === "p1" ? "p2" : "p1");
    document.querySelector(".sbar").innerHTML = room ? `
      <div class="side mine"><b>${sc1}</b><span>Siz</span></div>
      <div class="timer ${t <= 20 ? "low" : ""}">${started() ? `${(t / 60) | 0}:${String(t % 60).padStart(2, "0")}` : "Tayyor…"}</div>
      <div class="side theirs"><b>${sc2}</b><span>${esc(meKey === "p1" ? room.p2_name || "Raqib" : room.p1_name || "Raqib")}</span></div>` : `
      <div class="side mine"><b>${sc1}</b><span>Topildi</span></div>
      <div class="timer ${t <= 20 ? "low" : ""}">${started() ? `${(t / 60) | 0}:${String(t % 60).padStart(2, "0")}` : "Tayyor…"}</div>
      <div class="side"><b>${st.words.length - sc1}</b><span>Qoldi</span></div>`;
    const cd = document.getElementById("cd");
    if (cd) cd.innerHTML = !started() && !done() ? `<div class="countdown">${Math.max(1, Math.ceil(((st.ends_at - st.seconds * 1000) - Date.now()) / 1000))}</div>` : "";
    document.getElementById("ov").innerHTML = done() ? endOverlay() : "";
    document.querySelectorAll("#ov [data-end]").forEach(b => b.onclick = () => endAction(b.dataset.end));
  }

  function endOverlay() {
    const a = score(meKey), b = score(meKey === "p1" ? "p2" : "p1");
    if (!room) return `<div class="overlay"><div class="card stack center"><h2>${a >= st.words.length ? "Hammasini topdingiz! 🎉" : "Vaqt tugadi"}</h2>
      <p class="muted" style="margin:0">${a} ta so'z topdingiz · rekord ${load("soz-best") || a}</p>
      <button class="btn green" data-end="again">Yana o'ynash</button><button class="btn alt" data-end="menu">Menyuga</button></div></div>`;
    const res = room.result || {};
    const title = res.winner === "draw" ? "Durang 🤝" : res.winner === meKey ? "Siz yutdingiz! 🏆" : res.winner ? "Raqib yutdi" : "Natija hisoblanmoqda…";
    const offer = room.state?.rematch && room.state.rematch_by !== me().id;
    return `<div class="overlay"><div class="card stack center"><h2>${title}</h2>
      <p class="muted" style="margin:0">Hisob: ${a} : ${b}</p>${ratingLine(room, "soz")}
      <button class="btn green" data-end="rematch">${offer ? "✅ Revanshni qabul qilish" : "🔁 Revansh"}</button>
      <button class="btn alt" data-end="lb">🏆 Reyting</button><button class="btn alt" data-end="menu">Menyuga</button></div></div>`;
  }

  async function endAction(a) {
    if (a === "menu") return home();
    if (a === "lb") return show(nav.leaderboard("soz"));
    if (a === "again") return show(sozGame({ mode: "solo" }), false);
    if (a === "rematch") {
      try {
        const r = await api("rematch", { id: room.id, state: generate() });
        if (r.error) return toast("Revansh ochilmadi");
        if (r.status === "playing") show(sozGame({ mode: "online", room: r }), false);
        else show(sozWaiting(r, false), false);
      } catch (e) { toast(e.message); }
    }
  }

  function render() {
    app().innerHTML = header("So'z jangi") + `
      <div class="sbar"></div>
      <div class="wwrap"><div class="wgrid">${st.grid.map((ch, i) => `<div class="lt" data-i="${i}">${ch}</div>`).join("")}</div><div id="cd"></div></div>
      <div class="wlist"></div>
      <div id="ov"></div>`;
    bindBack();
    const grid = document.querySelector(".wgrid");
    const cellAt = (x, y) => { const el = document.elementFromPoint(x, y)?.closest?.(".lt"); return el ? +el.dataset.i : null; };
    grid.addEventListener("pointerdown", e => {
      if (done() || !started()) return;
      const i = cellAt(e.clientX, e.clientY); if (i === null) return;
      startCell = i; sel = [i]; grid.setPointerCapture(e.pointerId); draw();
    });
    grid.addEventListener("pointermove", e => {
      if (startCell === null) return;
      const i = cellAt(e.clientX, e.clientY); if (i === null) return;
      const nl = lineCells(startCell, i);
      if (nl.length !== sel.length || nl[nl.length - 1] !== sel[sel.length - 1]) { sel = nl; haptic("light"); draw(); }
    });
    const end = () => { if (startCell === null) return; const cells = sel; startCell = null; sel = []; draw(); tryWord(cells); };
    grid.addEventListener("pointerup", end);
    grid.addEventListener("pointercancel", () => { startCell = null; sel = []; draw(); });
    grid.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
    draw();
  }

  return {
    render() {
      alive = true;
      render();
      tick = setInterval(async () => {
        draw();
        if (room && room.status === "playing" && left() === 0 && !finishing) {
          finishing = true;
          try { const r = await api("finish", { id: room.id }); if (!r.error) { room = r; st = r.state; } } catch (e) {}
          finishing = false;
          if (room.status === "done") refreshProfile();
          draw();
        }
        if (!room && left() === 0) finishSolo();
      }, 500);
      if (room && !poll) {
        poll = setInterval(async () => {
          if (pending.size) return;
          try {
            const r = await read("g_room_get", { p_id: room.id });
            if (!r.error && r.version > room.version) {
              const before = Object.keys(st.claimed || {}).length;
              room = r; st = r.state;
              if (Object.keys(st.claimed || {}).length > before) haptic("medium");
              if (r.status === "done") refreshProfile();
              draw();
            }
          } catch (e) {}
        }, 1000);
      }
    },
    leave() { alive = false; clearInterval(poll); clearInterval(tick); poll = null; },
  };
}
