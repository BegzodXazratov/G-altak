import { quip, watcher } from "./quip.js";
import { app, header, bindBack, show, home, me, api, read, toast, haptic, esc, load, save, shareInvite, copy,
  scoreCard, ratingLine, refreshProfile, nav } from "./core.js";

// Topqir: 9×9 harflar. So'zlar oldindan aytilmaydi — har qanday o'zbekcha so'zni
// qo'shni harflar bo'ylab (diagonal ham, istalgan tomonga burilib) chizasiz. 1 daqiqa. Kim ko'p ochko yig'sa — g'olib.
const N = 9;
const SECONDS = 60;
// harflar chastotasi (lug'atdan hisoblangan)
const FREQ = [["A", 19], ["I", 14], ["O", 13], ["R", 9], ["L", 8], ["S", 7], ["T", 7], ["M", 7], ["N", 6.5], ["H", 6], ["Q", 6],
  ["K", 5.7], ["U", 5], ["Y", 4], ["B", 3.8], ["D", 3.8], ["E", 3.4], ["Z", 3], ["V", 2.4], ["G", 2], ["O'", 2], ["P", 2],
  ["X", 1.4], ["G'", 1.3], ["F", 1.2], ["J", 1.2], ["C", 0.6]];
const FTOTAL = FREQ.reduce((s, [, w]) => s + w, 0);
const randLetter = () => { let x = Math.random() * FTOTAL; for (const [l, w] of FREQ) { x -= w; if (x <= 0) return l; } return "A"; };
const tokens = w => w.match(/[OG]'|[A-Z]/g) || [];
const pts = w => tokens(w).length;

let DICT = null;
async function dict() {
  if (!DICT) DICT = new Set(await (await fetch("data/words.json")).json());
  return DICT;
}
// keng tarqalgan, hamma biladigan so'zlar — taxtaga shulardan ko'proq joylanadi (topish oson bo'lsin)
const COMMON = ['OSH', 'NON', 'SUV', 'GUL', "KO'Z", "QO'L", 'BOSH', 'UY', "YO'L", 'TOSH', 'OY', 'KUN', 'YIL', 'OTA', 'ONA', 'AKA', 'UKA', 'OPA', 'BOLA', 'QIZ', "O'G'IL", 'ER', "DO'ST", 'ISH', 'PUL', 'VAQT', 'SOAT', 'DARS', 'KITOB', 'DALA', "TOG'", 'DARYO', "KO'L", "BOG'", 'OLMA', 'NOK', 'UZUM', 'ANOR', 'QOVUN', 'PIYOZ', 'SABZI', 'TUZ', 'SUT', 'QATIQ', 'CHOY', 'ASAL', 'MOY', 'TUXUM', 'BALIQ', 'OT', 'IT', 'MUSHUK', 'SIGIR', "QO'Y", 'ECHKI', 'TOVUQ', 'QUSH', 'ARI', 'ILON', 'SHER', "BO'RI", 'TULKI', 'AYIQ', 'FIL', 'TUYA', 'ESHAK', 'QUYOSH', 'OSMON', 'BULUT', 'QOR', 'SHAMOL', 'MUZ', 'OLOV', 'YER', 'QUM', 'TEMIR', 'OLTIN', 'MIS', 'ESHIK', 'DEVOR', 'TOM', 'STOL', 'STUL', 'GILAM', 'KIYIM', "TO'N", 'SHIM', 'ETIK', 'SOCH', 'BURUN', 'QULOQ', "OG'IZ", 'TISH', 'TIL', 'YUZ', 'YELKA', 'QORIN', 'OYOQ', 'BARMOQ', 'YURAK', 'QON', 'TER', 'MEHR', 'TINCH', 'BAXT', 'KULGI', 'ORZU', 'UMID', 'GAP', "SO'Z", 'SAVOL', 'JAVOB', 'ERTAK', 'KUY', 'RAQS', "O'YIN", "TO'P", 'KEMA', "KO'CHA", 'BOZOR', 'NARX', 'MEHMON', "TO'Y", 'BAYRAM', 'HAFTA', 'KECHA', 'TONG', 'KUZ', 'QISH', 'BAHOR', 'YOZ', 'ISSIQ', 'SOVUQ', 'KATTA', 'YAXSHI', 'YOMON', 'TEZ', 'SEKIN', 'OQ', 'QORA', 'QIZIL', 'SARIQ', "KO'K", 'OCH', 'YANGI', 'ESKI', 'UZUN', 'QISQA', 'PAST', 'KENG', 'TOR', 'SHIRIN', 'BIR', 'IKKI', 'UCH', "TO'RT", 'BESH', 'OLTI', 'YETTI', "O'N", 'MING', 'BOR', "YO'Q", 'HA', 'ROST', 'AQL', 'BILIM', 'ILM', 'FAN', 'DUNYO', 'XALQ', 'EL', 'VATAN', 'YURT', 'HARF', 'RAQAM', 'SON', 'HISOB', 'USTOZ', 'USTA', 'ARAVA', 'TAYOQ', 'ARQON', 'IGNA', 'PICHOQ', 'KOSA', 'LAGAN', 'QOZON', 'XONA', 'HOVLI', 'EKIN', 'ARPA', 'PAXTA', 'SHOLI', 'BEHI', 'LIMON', 'BODOM', 'PISTA', 'MAYIZ', 'HOLVA', 'SOMSA', 'MANTI', 'KABOB', 'PALOV', 'ON', 'UN', 'IZ', 'OL', 'AY', 'OR'];
const isWord = w => DICT && (DICT.has(w) || (w.endsWith("LAR") && w.length >= 5 && DICT.has(w.slice(0, -3))));
const adj = (a, b) => Math.max(Math.abs(((a / N) | 0) - ((b / N) | 0)), Math.abs((a % N) - (b % N))) === 1;

export async function generate() {
  const D = await dict();
  const pool = COMMON.filter(w => D.has(w));
  const grid = Array(N * N).fill(null);
  const seeds = [], used = new Set();
  // ~30 ta oddiy so'zni ilon-izi bo'ylab joylaymiz; bir-birini buzmaydi (katak bo'sh yoki xuddi shu harf bo'lsa)
  for (let t = 0; t < 3000 && seeds.length < 30; t++) {
    const w = pool[(Math.random() * pool.length) | 0];
    if (used.has(w)) continue;
    const tk = tokens(w);
    const fits = (i, k) => grid[i] === null || grid[i] === tk[k];
    let cur = (Math.random() * N * N) | 0;
    if (!fits(cur, 0)) continue;
    const path = [cur];
    for (let k = 1; k < tk.length; k++) {
      const nb = [];
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const r = ((cur / N) | 0) + dr, c = (cur % N) + dc, j = r * N + c;
        if ((dr || dc) && r >= 0 && r < N && c >= 0 && c < N && !path.includes(j) && fits(j, k)) nb.push(j);
      }
      if (!nb.length) break;
      // bo'sh kataklardan ko'ra mos harfli katakni afzal ko'ramiz — taxta zichroq bo'ladi
      const share = nb.filter(j => grid[j] !== null);
      const from = share.length && Math.random() < 0.5 ? share : nb;
      cur = from[(Math.random() * from.length) | 0];
      path.push(cur);
    }
    if (path.length !== tk.length) continue;
    path.forEach((i, k) => grid[i] = tk[k]);
    used.add(w); seeds.push({ w, path });
  }
  for (let i = 0; i < grid.length; i++) if (grid[i] === null) grid[i] = randLetter();
  return { grid, claimed: {}, seeds, seconds: SECONDS };
}

// ---------------- lobby ----------------
export function sozMenu() {
  dict().catch(() => {});
  return {
    render() {
      app().innerHTML = header("Topqir") + `
        ${scoreCard()}
        <div class="card soz-intro">
          <b>Qanday o'ynaladi:</b> harflar ichidan istalgan o'zbekcha so'zni toping — barmoqni harfdan qo'shni harfga
          (yonga, tepaga, diagonalga) yurgizib chizing. So'zlar oldindan aytilmaydi. Har harf — 1 ochko.
          Raqib topgan so'z sizga qolmaydi. Vaqt — <b>1 daqiqa</b>.
          <br>Taxtada <b>oddiy so'zlar</b> ko'p: OSH, NON, GUL, KO'Z… Qiynalsangiz — <b>💡 Yordam</b> tugmasi (3 marta).
        </div>
        <div class="stack" style="margin-top:12px">
          <button class="bigbtn b-fast" data-act="match"><span class="ic">⚡</span><span><b>Tezkor o'yin</b><small>Tasodifiy raqib · reyting uchun</small></span></button>
          <button class="bigbtn b-friend" data-act="create"><span class="ic">🔗</span><span><b>Do'stni chaqirish</b><small>Havola yuboring</small></span></button>
          <button class="bigbtn b-ai" data-act="solo"><span class="ic">🎯</span><span><b>Yolg'iz mashq</b><small>1 daqiqada necha ochko? Rekord: ${load("soz-best2") || 0}</small></span></button>
        </div>`;
      bindBack();
      app().querySelector('[data-act="solo"]').onclick = async () => show(sozGame({ room: null, state: { ...(await generate()), ends_at: Date.now() + 3000 + SECONDS * 1000 } }));
      app().querySelector('[data-act="create"]').onclick = () => startOnline("create");
      app().querySelector('[data-act="match"]').onclick = () => startOnline("match");
    },
  };
}

async function startOnline(kind) {
  let room;
  try { room = await api(kind, { game: "soz", state: await generate() }); } catch (e) { return toast(e.message); }
  openSozRoom(room, kind === "match");
}

export async function openSozRoom(room, matching = false) {
  await dict().catch(() => {});
  if (room.status === "playing" || room.status === "done") return show(sozGame({ room }));
  show(sozWaiting(room, matching));
}

export async function createPrivate() {
  const room = await api("create", { game: "soz", state: await generate() });
  if (!room?.id) throw new Error("Xona ochilmadi");
  show(sozWaiting(room, false));
  return room;
}

function sozWaiting(room, matching) {
  let timer;
  return {
    render() {
      app().innerHTML = header(matching ? "Raqib qidirilmoqda" : "Do'stni kutyapmiz") + `
        <div class="card stack center">
          ${matching ? `<div class="radar"><span></span><span></span><span></span><b>🔤</b></div><p class="muted" style="margin:0">Raqib qidiryapmiz…</p>`
            : `<p class="muted" style="margin:0">Xona kodi</p><div class="code">${room.id}</div>
               <p class="small muted" style="margin:0">Do'stingiz kirishi bilan 1 daqiqalik jang boshlanadi.</p>`}
          <button class="btn" data-share>📨 Do'stga yuborish</button>
          ${matching ? "" : `<button class="btn alt" data-copy>Kodni nusxalash</button>`}
        </div>`;
      bindBack();
      app().querySelector("[data-share]").onclick = () => shareInvite(room.id, `Topqirda bellashamizmi? 🔤 Xona: ${room.id}`);
      const c = app().querySelector("[data-copy]"); if (c) c.onclick = () => copy(room.id);
      timer = setInterval(async () => {
        try {
          const r = await read("g_room_get", { p_id: room.id });
          if (r.status === "playing") { clearInterval(timer); haptic("ok"); show(sozGame({ room: r }), false); }
        } catch (e) {}
      }, 1200);
    },
    leave() { clearInterval(timer); },
  };
}

// ---------------- o'yin ----------------
function sozGame(opt) {
  let room = opt.room || null;
  let st = room ? room.state : opt.state;
  const meKey = room ? (room.p1 === me().id ? "p1" : "p2") : "p1";
  const themKey = meKey === "p1" ? "p2" : "p1";
  let path = [], dragging = false, poll = null, tick = null, finishing = false, alive = true, pending = 0;
  let hints = 3, streak = 0, lastFound = 0, bads = 0, saidStart = false;
  const W = watcher();

  const claimedBy = w => st.claimed?.[w];
  const wordsOf = who => Object.entries(st.claimed || {}).filter(([, v]) => v === who).map(([w]) => w);
  const score = who => wordsOf(who).reduce((s, w) => s + pts(w), 0);
  const left = () => Math.max(0, Math.ceil(((st.ends_at || 0) - Date.now()) / 1000));
  const started = () => Date.now() >= (st.ends_at || 0) - (st.seconds || SECONDS) * 1000;
  const done = () => room ? room.status === "done" : left() === 0;

  async function submit(cells) {
    if (cells.length < 2) return;
    const w = cells.map(i => st.grid[i]).join("");
    W.act();
    if (!isWord(w)) { haptic("error"); flash("bad"); bads++; streak = 0; showMsg(`${w} — lug'atda yo'q`); if (bads >= 2) { bads = 0; quip("badWord"); } return; }
    const by = claimedBy(w);
    if (by) { toast(by === meKey ? "Bu so'zni topgansiz" : "Raqib oldinroq topdi 😅"); flash("bad"); if (by !== meKey) quip("taken"); return; }
    haptic("ok"); flash("good", `+${pts(w)}`); bads = 0;
    streak = Date.now() - lastFound < 8000 ? streak + 1 : 1; lastFound = Date.now();
    quip(pts(w) >= 5 ? "longWord" : streak >= 3 ? "streak" : "word", pts(w) >= 5 || streak === 3);
    if (!room) { st.claimed[w] = "p1"; draw(); return; }
    pending++; st.claimed = { ...st.claimed, [w]: meKey }; draw();
    try {
      const r = await api("claim", { id: room.id, path: cells });
      if (r.error === "taken") { room = r; st = r.state; quip("taken", true); }
      else if (r.error === "no_word") { const c = { ...st.claimed }; delete c[w]; st.claimed = c; toast("Bu so'z lug'atda yo'q"); }
      else if (r.id) { room = r; st = r.state; }
    } catch (e) { toast("Internet bilan muammo"); }
    pending--;
    draw();
  }

  function showMsg(t) {
    const el = document.querySelector(".hinttxt"); if (!el) return;
    el.textContent = t; clearTimeout(showMsg.t); showMsg.t = setTimeout(() => { if (el.isConnected) el.textContent = ""; }, 2200);
  }

  // 💡 Yordam: hali topilmagan oddiy so'zning birinchi 2 harfini yoritadi va uzunligini aytadi
  function hint() {
    if (!hints || done() || !started()) return;
    const free = (st.seeds || []).filter(x => !claimedBy(x.w) && x.path.every((i, k) => st.grid[i] === tokens(x.w)[k]));
    if (!free.length) return toast("Yordam uchun so'z qolmadi 🙂");
    const x = free.sort((a, b) => a.path.length - b.path.length)[(Math.random() * Math.min(5, free.length)) | 0];
    hints--; W.act(); haptic("light");
    const cells = x.path.slice(0, x.path.length <= 3 ? 1 : 2);
    cells.forEach((i, k) => document.querySelector(`.lt[data-i="${i}"]`)?.classList.add("hl", "h" + k));
    showMsg(`💡 ${x.path.length} harfli so'z: ${cells.map(i => st.grid[i]).join("")}…`);
    setTimeout(() => cells.forEach(i => document.querySelector(`.lt[data-i="${i}"]`)?.classList.remove("hl", "h0", "h1")), 3200);
    const b = document.querySelector("[data-hint]"); if (b) { b.textContent = `💡 Yordam (${hints})`; b.disabled = !hints; }
  }

  function flash(kind, text) {
    const g = document.querySelector(".wgrid"); if (!g) return;
    g.classList.add(kind); setTimeout(() => g.classList.remove(kind), 320);
    if (text) {
      const f = document.createElement("div"); f.className = "plus"; f.textContent = text;
      document.querySelector(".wwrap")?.appendChild(f); setTimeout(() => f.remove(), 800);
    }
  }

  function draw() {
    if (!alive || !document.querySelector(".wgrid")) return;
    const sel = new Set(path);
    document.querySelectorAll(".lt").forEach(el => {
      const i = +el.dataset.i;
      el.classList.toggle("sel", sel.has(i)); el.classList.toggle("head", path[path.length - 1] === i);
    });
    const cur = path.map(i => st.grid[i]).join("");
    const pv = document.querySelector(".preview");
    pv.textContent = cur || (started() ? "Harfdan harfga chizing" : "Tayyorlaning…");
    pv.className = `preview ${cur ? (cur.length > 1 && isWord(cur) ? "ok" : "typing") : ""}`;
    const t = left();
    const clock = started() ? `${(t / 60) | 0}:${String(t % 60).padStart(2, "0")}` : "…";
    document.querySelector(".sbar").innerHTML = room ? `
      <div class="side mine"><b>${score(meKey)}</b><span>Siz</span></div>
      <div class="timer ${t <= 10 && started() ? "low" : ""}">${clock}</div>
      <div class="side theirs"><b>${score(themKey)}</b><span>${esc(meKey === "p1" ? room.p2_name || "Raqib" : room.p1_name || "Raqib")}</span></div>` : `
      <div class="side mine"><b>${score("p1")}</b><span>Ochko</span></div>
      <div class="timer ${t <= 10 && started() ? "low" : ""}">${clock}</div>
      <div class="side"><b>${wordsOf("p1").length}</b><span>So'z</span></div>`;
    const mine = wordsOf(meKey), theirs = room ? wordsOf(themKey) : [];
    document.querySelector(".found").innerHTML = `
      <div><span class="flabel">Siz topgan</span>${mine.map(w => `<span class="wchip mine">${w}<i>${pts(w)}</i></span>`).join("") || `<span class="muted small">hali yo'q</span>`}</div>
      ${room ? `<div><span class="flabel">Raqib</span>${theirs.map(w => `<span class="wchip theirs">${w}<i>${pts(w)}</i></span>`).join("") || `<span class="muted small">hali yo'q</span>`}</div>` : ""}`;
    if (started() && !done() && !saidStart) { saidStart = true; W.act(); quip("start", true); }
    W.tick({ left: t, started: started(), done: done(), mine: score(meKey), theirs: score(themKey), online: !!room });
    const cd = document.getElementById("cd");
    if (cd) cd.innerHTML = !started() && !done() ? `<div class="countdown">${Math.max(1, Math.ceil(((st.ends_at - (st.seconds || SECONDS) * 1000) - Date.now()) / 1000))}</div>` : "";
    const ov = document.getElementById("ov");
    const want = done() ? endOverlay() : "";
    if (ov.dataset.html !== want) { ov.innerHTML = want; ov.dataset.html = want; ov.querySelectorAll("[data-end]").forEach(b => b.onclick = () => endAction(b.dataset.end)); }
  }

  function endOverlay() {
    const a = score(meKey), b = score(themKey);
    if (!room) {
      const best = Math.max(a, +(load("soz-best2") || 0)); save("soz-best2", best);
      return `<div class="overlay"><div class="card stack center"><h2>Vaqt tugadi ⏱</h2>
        <p class="muted" style="margin:0"><b>${a}</b> ochko · ${wordsOf("p1").length} ta so'z · rekord ${best}</p>
        <button class="btn green" data-end="again">Yana o'ynash</button><button class="btn alt" data-end="menu">Menyuga</button></div></div>`;
    }
    const res = room.result || {};
    const title = res.winner === "draw" ? "Durang 🤝" : res.winner === meKey ? "Siz yutdingiz! 🏆" : res.winner ? "Raqib yutdi" : "Natija hisoblanmoqda…";
    const offer = room.state?.rematch && room.state.rematch_by !== me().id;
    return `<div class="overlay"><div class="card stack center"><h2>${title}</h2>
      <p class="muted" style="margin:0">Ochko: <b>${a}</b> : ${b}</p>${ratingLine(room)}
      <button class="btn green" data-end="rematch">${offer ? "✅ Revanshni qabul qilish" : "🔁 Revansh"}</button>
      <button class="btn alt" data-end="lb">🏆 Reyting</button><button class="btn alt" data-end="menu">Menyuga</button></div></div>`;
  }

  async function endAction(a) {
    if (a === "menu") return home();
    if (a === "lb") return show(nav.leaderboard("soz"));
    if (a === "again") return show(sozGame({ room: null, state: { ...(await generate()), ends_at: Date.now() + 3000 + SECONDS * 1000 } }), false);
    if (a === "rematch") {
      try {
        const r = await api("rematch", { id: room.id, state: await generate() });
        if (r.error) return toast("Revansh ochilmadi");
        if (r.status === "playing") show(sozGame({ room: r }), false);
        else show(sozWaiting(r, false), false);
      } catch (e) { toast(e.message); }
    }
  }

  function render() {
    app().innerHTML = header("Topqir") + `
      <div class="sbar"></div>
      <div class="preview"></div>
      <div class="wwrap"><div class="wgrid">${st.grid.map((ch, i) => `<div class="lt" data-i="${i}"><b>${ch}</b></div>`).join("")}</div><div id="cd"></div></div>
      <div class="hinttxt"></div>
      <div class="wtools"><button class="hintbtn" data-hint>💡 Yordam (${hints})</button></div>
      <div class="found"></div>
      <div id="ov"></div>`;
    bindBack();
    app().querySelector("[data-hint]").onclick = hint;
    const grid = document.querySelector(".wgrid");
    // barmoq katak markaziga yaqin bo'lsagina qo'shiladi — diagonal yurish oson bo'lsin
    const cellAt = (x, y) => {
      const el = document.elementFromPoint(x, y)?.closest?.(".lt");
      if (!el) return null;
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
      if (path.length > 1 && i === path[path.length - 2]) { path.pop(); draw(); return; } // orqaga qaytish
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
              const before = wordsOf(themKey).length;
              room = r; st = r.state;
              if (wordsOf(themKey).length > before) { haptic("medium"); quip("oppScore"); }
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
