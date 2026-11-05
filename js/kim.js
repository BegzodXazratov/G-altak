// Kim topadi?: ikkala o'yinchi son (5/6 xonali) yoki so'z (5/6 harfli, lotin) o'ylaydi, navbat bilan raqibnikini topishga urinadi
import { isMe, waitScreen, app, header, bindBack, show, home, api, read, toast, haptic, esc, load, save,
  scoreCard, ratingLine, refreshProfile, nav } from "./core.js";

const cfg = { mode: load("kim-mode") === "abc" ? "abc" : "num", len: Number(load("kim-len")) === 6 ? 6 : 5 };
const isAbc = () => cfg.mode === "abc";
export function kimMenu() {
  return {
    render() {
      app().innerHTML = header("Kim topadi?") + scoreCard() + `
        <div class="card soz-intro" style="margin-top:12px">
          <p class="small muted" style="margin:0 0 6px">Nima o'ylaysiz?</p>
          <div class="seg tpick" id="kmode"><button data-mode="num" aria-pressed="${cfg.mode === "num"}">🔢 Raqamlar</button><button data-mode="abc" aria-pressed="${cfg.mode === "abc"}">🔤 Harflar</button></div>
          <p class="small muted" style="margin:8px 0 6px">Nechta katak?</p>
          <div class="seg tpick" id="klen"><button data-len="5" aria-pressed="${cfg.len === 5}">5 katak</button><button data-len="6" aria-pressed="${cfg.len === 6}">6 katak</button></div>
          <div id="kinfo" style="margin-top:10px"></div>
        </div>
        <div class="stack" style="margin-top:12px">
          <button class="bigbtn b-fast" data-act="match"><span class="ic">⚡</span><span><b>Tezkor o'yin</b><small>Tasodifiy raqib · reyting uchun</small></span></button>
          <button class="bigbtn b-friend" data-act="create"><span class="ic">👥</span><span><b>Do'stni chaqirish</b><small>Do'stlar yoki havola orqali</small></span></button>
        </div>`;
      bindBack();
      const info = () => {
        const L = cfg.len, abc = isAbc(), demo = abc ? ["T", "O", "L", "M", "A", "Z"] : ["4", "8", "2", "9", "1", "7"], fb = ["G", "Y", "X", "X", "G", "X"];
        app().querySelector("#kinfo").innerHTML = `<b>Qanday o'ynaladi:</b> ikkalangiz ham ko'z oldingizda <b>${L} ${abc ? "harfli so'z (istalgan lotin harflari)" : "xonali son"}</b> o'ylaysiz (raqib ko'rmaydi). Keyin navbat bilan raqibnikini taxmin qilasiz.
          <div class="kt-demo">${demo.slice(0, L).map((d, i) => `<span class="kt-t ${fb[i]}">${d}</span>`).join("")}</div>
          <p class="small muted" style="margin:0"><b style="color:#2FBF5B">Yashil</b> — ${abc ? "harf" : "raqam"} ham, joyi ham to'g'ri. <b style="color:#d9a21f">Sariq</b> — ${abc ? "harf" : "raqam"} bor, lekin boshqa joyda. Kulrang — bunday ${abc ? "harf" : "raqam"} yo'q. Raqibnikini birinchi topgan yutadi. Har yurishga 1,5 daqiqa.</p>`;
      };
      info();
      const pick = () => { app().querySelectorAll("[data-mode]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === cfg.mode))); app().querySelectorAll("[data-len]").forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.len) === cfg.len))); save("kim-mode", cfg.mode); save("kim-len", String(cfg.len)); info(); };
      app().querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { cfg.mode = b.dataset.mode; pick(); });
      app().querySelectorAll("[data-len]").forEach(b => b.onclick = () => { cfg.len = Number(b.dataset.len); pick(); });
      app().querySelector('[data-act="create"]').onclick = () => startOnline("create");
      app().querySelector('[data-act="match"]').onclick = () => startOnline("match");
    },
  };
}
async function startOnline(kind) {
  let room;
  try { room = await api(kind, { game: "kim", mode: cfg.mode, len: cfg.len }); } catch (e) { return toast(e.message); }
  openKimRoom(room, kind === "match");
}
export function openKimRoom(room, matching = false) {
  if (room.status === "playing" || room.status === "done") return show(kimGame({ room }));
  show(kimWaiting(room, matching));
}
export async function createPrivate(invited = "") {
  const room = await api("create", { game: "kim", mode: cfg.mode, len: cfg.len });
  if (!room?.id) throw new Error("Xona ochilmadi");
  show(kimWaiting(room, false, invited));
  return room;
}
function kimWaiting(room, matching, invited = "") {
  return waitScreen(room, { matching, invited, icon: "🔢", shareText: "Kim topadi? o'ynaymizmi? 🔢", onStart: r => show(kimGame({ room: r }), false) });
}

const tiles = (g, f, cls = "") => `<div class="kt-row ${cls}">${[...g].map((d, i) => `<span class="kt-t ${f?.[i] || ""}">${d}</span>`).join("")}</div>`;
const mmss = t => `${(t / 60) | 0}:${String(t % 60).padStart(2, "0")}`;

function kimGame(opt) {
  let room = opt.room;
  const meKey = isMe(room.p1) ? "p1" : "p2", themKey = meKey === "p1" ? "p2" : "p1";
  let input = "", pref = "first", poll = null, clk = null, alive = true, sending = false, deadline = 0;
  const secretKey = () => "kim-" + room.id;
  const mySecret = () => load(secretKey()) || "";
  const st = () => room.state || {};
  const setClock = () => { deadline = room.turn_left != null && room.status === "playing" ? Date.now() + room.turn_left * 1000 : 0; };
  const done = () => room.status === "done";
  const myGuesses = () => st().guesses?.[meKey] || [];
  const theirGuesses = () => st().guesses?.[themKey] || [];
  const myTurn = () => st().phase === "play" && st().turn === meKey && !done();
  const MAX = () => st().max || 15;
  const LEN = () => (st().len === 6 ? 6 : 5), ABC = () => st().mode === "abc";
  setClock();

  function known() { // yashil topilgan joylar
    const k = Array(LEN()).fill("");
    for (const x of myGuesses()) for (let i = 0; i < LEN(); i++) if (x.f[i] === "G") k[i] = x.g[i];
    return k;
  }

  async function ready() {
    if (input.length !== LEN() || (!ABC() && input[0] === "0") || sending) return;
    sending = true;
    try {
      save(secretKey(), input);
      const r = await api("kt_setup", { id: room.id, secret: input, pref });
      if (r.id) { room = r; setClock(); input = ""; } else toast("Son qabul qilinmadi");
    } catch (e) { toast(e.message); }
    sending = false; render();
  }
  async function guess() {
    if (input.length !== LEN() || !myTurn() || sending) return;
    sending = true;
    try {
      const r = await api("kt_guess", { id: room.id, guess: input });
      if (r.id) { room = r; setClock(); input = ""; haptic(r.state.guesses[meKey].at(-1).f === "G".repeat(LEN()) ? "ok" : "light"); }
      else if (r.error === "not_your_turn") { if (r.id) room = r; toast("Hozir raqib navbati"); }
      else toast("Taxmin qabul qilinmadi");
    } catch (e) { toast(e.message); }
    sending = false; render();
  }
  async function resign() {
    if (!confirm("Taslim bo'lasizmi? Reytingdan ochko yo'qotasiz.")) return;
    try { const r = await api("resign", { id: room.id }); if (r.id) room = r; } catch (e) { toast(e.message); }
    render();
  }

  const keypad = (enabled, label, ready) => ABC() ? `<div class="kb ${enabled ? "" : "off"}">${["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"].map((r, i) => `<div class="r">${[...r].map(c => `<button data-k="${c}">${c}</button>`).join("")}${i === 2 ? `<button data-k="del" class="alt">⌫</button>` : ""}</div>`).join("")}<div class="r"><button data-k="go" class="go" ${ready ? "" : "disabled"}>${label}</button></div></div>` : `<div class="kpad ${enabled ? "" : "off"}">
    ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-k="${n}">${n}</button>`).join("")}
    <button data-k="del" class="alt">⌫</button><button data-k="0">0</button><button data-k="go" class="go" ${ready ? "" : "disabled"}>${label}</button></div>`;
  const inputRow = () => `<div class="kt-row big">${Array.from({ length: LEN() }, (_, i) => i).map(i => `<span class="kt-t in ${input[i] ? "fill" : ""}">${input[i] || ""}</span>`).join("")}</div>`;

  function render() {
    if (!alive) return;
    const s = st();
    let body = "";
    if (done()) body = playView() + endOverlay();
    else if (s.phase === "setup") body = setupView();
    else body = playView();
    app().innerHTML = header("Kim topadi?", !done() && s.phase === "play" ? `<button class="pill" data-resign>🏳️ Taslim</button>` : "") + body;
    bindBack();
    app().querySelector("[data-resign]")?.addEventListener("click", resign);
    app().querySelectorAll("[data-k]").forEach(b => b.onclick = () => key(b.dataset.k));
    app().querySelectorAll("[data-pref]").forEach(b => b.onclick = () => { pref = b.dataset.pref; render(); });
    app().querySelectorAll("[data-end]").forEach(b => b.onclick = () => endAction(b.dataset.end));
    tickClock();
  }
  function key(k) {
    const setup = st().phase === "setup";
    if (k === "go") return setup ? ready() : guess();
    if (k === "del") input = input.slice(0, -1);
    else if (input.length < LEN()) { if (ABC() !== /^[A-Z]$/.test(k)) return; if (!ABC() && setup && !input.length && k === "0") return; input += k; }
    haptic("light");
    // faqat kiritish qatori va "tayyor" tugmasi yangilanadi
    const row = document.querySelector(".kt-row.big"); if (row) row.outerHTML = inputRow();
    const go = document.querySelector('[data-k="go"]'); if (go) go.disabled = input.length !== LEN();
  }

  function setupView() {
    const s = st();
    if (s.ready?.[meKey]) return `<div class="card stack center"><p class="muted" style="margin:0">${ABC() ? "Sizning so'zingiz" : "Sizning sonningiz"}</p>${tiles(mySecret(), null, "big")}
      <div class="radar"><span></span><span></span><span></span><b>${ABC() ? "🔤" : "🔢"}</b></div><p class="muted" style="margin:0">Raqib ${ABC() ? "so'z" : "son"} o'ylayapti… <span id="ktclk" class="tclk"></span></p></div>`;
    return `<div class="card stack center"><h2 style="margin:0">${ABC() ? "So'z o'ylang" : "Son o'ylang"} <span id="ktclk" class="tclk"></span></h2>
      <p class="muted small" style="margin:0">${ABC() ? `${LEN()} harfli so'z (istalgan lotin harflari, A–Z). Raqib uni topishga urinadi.` : `${LEN()} xonali son (birinchi raqam 0 bo'lmasin). Raqib uni topishga urinadi.`}</p>${inputRow()}
      <p class="small muted" style="margin:6px 0 0">Kim birinchi yursin?</p>
      <div class="seg tpick"><button data-pref="first" aria-pressed="${pref === "first"}">Men birinchi</button><button data-pref="second" aria-pressed="${pref === "second"}">Raqib birinchi</button></div>
      <p class="small muted" style="margin:0">Ikkalangiz bir xil tanlasangiz — qur'a tashlanadi.</p>${keypad(true, "✅ Tayyor", input.length === LEN())}</div>`;
  }

  function playView() {
    const s = st(), mine = myGuesses(), theirs = theirGuesses(), k = known();
    const turnTxt = done() ? "O'yin tugadi" : myTurn() ? "Sizning navbatingiz" : "Raqib o'ylayapti…";
    const coin = s.coin && mine.length + theirs.length === 0 ? `<p class="small muted center" style="margin:0">🪙 Qur'a: ${s.first === meKey ? "siz birinchi yurasiz" : "raqib birinchi yuradi"}</p>` : "";
    return `<div class="status ${myTurn() ? "mine" : ""}">${turnTxt} <span id="ktclk" class="tclk ${myTurn() ? "mine" : ""}"></span></div>${coin}
      <div class="card kt-panel"><div class="kt-h"><b>Siz raqib ${ABC() ? "so'zini" : "sonini"} topyapsiz</b><span>${mine.length}/${MAX()}</span></div>
        <div class="kt-known">${k.map(d => `<span class="kt-t ${d ? "G" : "in"}">${d || "?"}</span>`).join("")}</div>
        <div class="kt-hist">${mine.map(x => tiles(x.g, x.f)).join("") || `<p class="small muted center" style="margin:6px 0">Hali taxmin yo'q</p>`}</div>
        ${!done() ? `${inputRow()}${keypad(myTurn(), "Yuborish", input.length === LEN() && myTurn())}` : ""}</div>
      <div class="card kt-panel"><div class="kt-h"><b>Raqib sizning ${ABC() ? "so'zingizni" : "sonni"} topyapti</b><span>${theirs.length}/${MAX()}</span></div>
        <div class="kt-mine">Sizning ${ABC() ? "so'zingiz" : "sonningiz"}: <b>${esc(mySecret().split("").join(" ") || "—")}</b></div>
        <div class="kt-hist sm">${theirs.map(x => tiles(x.g, x.f, "sm")).join("") || `<p class="small muted center" style="margin:6px 0">Hali taxmin yo'q</p>`}</div></div>`;
  }

  function endOverlay() {
    const res = room.result || {}, sec = room.secrets || {};
    const title = res.winner === "draw" ? "Durang 🤝" : res.winner === meKey ? "Siz yutdingiz! 🏆" : res.winner ? "Raqib yutdi" : "Natija hisoblanmoqda…";
    const offer = st().rematch && !isMe(st().rematch_by);
    let note = "";
    if (st().timeout) note = isMe(st().resigned) ? "Vaqt tugadi — yurish qilmadingiz" : "Raqib vaqtida yurmadi — g'alaba sizniki";
    else if (st().left) note = isMe(st().resigned) ? "Siz o'yindan chiqib ketgansiz" : "Raqib o'yinni tashlab chiqib ketdi";
    else if (st().resigned) note = isMe(st().resigned) ? "Siz taslim bo'ldingiz" : "Raqib taslim bo'ldi";
    return `<div class="overlay"><div class="card stack center"><h2>${title}</h2>${note ? `<p class="muted small" style="margin:0">${note}</p>` : ""}
      ${sec[themKey] ? `<p class="small muted" style="margin:0">Raqib ${ABC() ? "so'zi" : "soni"}: <b>${sec[themKey]}</b> · Sizniki: <b>${sec[meKey] || mySecret()}</b></p>` : ""}
      ${ratingLine(room)}
      <button class="btn green" data-end="rematch">${offer ? "✅ Revanshni qabul qilish" : "🔁 Revansh"}</button>
      <button class="btn alt" data-end="lb">🏆 Reyting</button><button class="btn alt" data-end="menu">Menyuga</button></div></div>`;
  }
  async function endAction(a) {
    if (a === "menu") return home();
    if (a === "lb") return show(nav.leaderboard("all"));
    if (a === "rematch") {
      try {
        const r = await api("rematch", { id: room.id, game: "kim", mode: st().mode || "num", len: st().len || 5 });
        if (r.error) return toast("Revansh ochilmadi");
        if (r.status === "playing") show(kimGame({ room: r }), false); else show(kimWaiting(r, false), false);
      } catch (e) { toast(e.message); }
    }
  }
  function tickClock() {
    const el = document.getElementById("ktclk"); if (!el) return;
    if (!deadline || done()) { el.textContent = ""; return; }
    const t = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    el.textContent = `⏱ ${mmss(t)}`; el.classList.toggle("low", t <= 15);
  }

  return {
    busy: true, act: "kim:online",
    render() {
      alive = true; render();
      clk = setInterval(tickClock, 300);
      poll = setInterval(async () => {
        if (sending) return;
        try {
          const r = await read("g_room_get", { p_id: room.id });
          if (!r.error && r.version > room.version) {
            const wasMyTurn = myTurn(); room = r; setClock();
            if (r.status === "done") refreshProfile();
            if (!wasMyTurn && myTurn()) haptic("medium");
            render();
          }
        } catch (e) {}
      }, 1000);
    },
    leave() { alive = false; clearInterval(poll); clearInterval(clk); },
  };
}
