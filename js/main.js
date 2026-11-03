import { app, setupTelegram, show, startParam, tg, inTelegram, api, setProfile, profile, me, score, esc, toast,
  header, bindBack, read, refreshProfile, haptic, nav, scoreCard, level, botUsername, back, gameSeconds, setGameSeconds, TIMES, isBusy, MAX_SCORE } from "./core.js";
import { shashkaMenu, joinRoom, createPrivate as newShashka } from "./shashka.js";
import { sozMenu, createPrivate as newSoz } from "./soz.js";
import { gugurtMenu, createPrivate as newGug } from "./gugurt.js";

setupTelegram();

// ---------- ro'yxatdan o'tish: ism + raqam bot chatida (odatiy "Raqamni yuborish" tugmasi) ----------
function registerScreen() {
  let name = profile?.needs_name === false ? profile.name : "";
  let asked = false, poll = null;
  return {
    render() {
      app().innerHTML = `
        <section class="welcome">
          <img src="img/logo.png" alt="" class="wlogo">
          <h1>G'altak <span>o'yinlari</span></h1>
          <p class="muted">Do'stlar bilan bellashing va 1000 ballik reytingda chempion bo'ling.</p>
        </section>
        <div class="card stack">
          <div><label class="lbl" for="nm">1. Ismingiz — majburiy (boshqa o'yinchilar faqat ism va balingizni ko'radi)</label>
            <input class="inp" id="nm" maxlength="24" value="${esc(name)}" placeholder="Masalan: Begzod" autocomplete="given-name"></div>
          ${profile?.has_phone ? `<button class="btn" data-reg>Davom etish →</button>` : `<div><label class="lbl">2. Telefon raqam</label>
            ${asked ? `<div class="hint">✅ Bot chatiga xabar yubordik. Chatdagi pastki <b>«📱 Raqamni yuborish»</b> tugmasini bosing — keyin shu yerga qayting.</div>
              <button class="btn" data-chat>💬 Bot chatini ochish</button>`
              : `<button class="btn" data-reg>📱 Raqamni bot orqali yuborish</button>`}</div>`}
          <p class="small muted" style="margin:0">Raqam Telegram'ning standart tugmasi orqali olinadi va hech kimga ko'rsatilmaydi.</p>
        </div>`;
      const inp = app().querySelector("#nm");
      inp.oninput = () => name = inp.value;
      const reg = app().querySelector("[data-reg]");
      if (reg) reg.onclick = async () => {
        name = inp.value.trim();
        if (name.length < 2 || name.toLowerCase() === "o'yinchi") { toast("Haqiqiy ismingizni yozing (kamida 2 harf)"); return inp.focus(); }
        try {
          const p = await api("register", { name });
          if (p.error === "bad_name") { toast("Bu ism to'g'ri emas — harflar bilan yozing"); return inp.focus(); }
          setProfile(p);
          if (p.has_phone) return enter();
          await api("askphone");
          asked = true; this.render(); haptic("ok");
          startPoll();
        } catch (e) { toast(e.message); }
      };
      const chat = app().querySelector("[data-chat]");
      if (chat) chat.onclick = async () => {
        const bot = await botUsername();
        if (bot && tg?.openTelegramLink) tg.openTelegramLink(`https://t.me/${bot}`);
        else tg?.close?.();
      };
    },
    leave() { clearInterval(poll); },
  };
  function startPoll() {
    clearInterval(poll);
    poll = setInterval(async () => {
      try {
        const p = await read("g_profile", { p_id: me().id });
        if (p?.has_phone) { clearInterval(poll); setProfile(p); haptic("ok"); enter(); }
      } catch (e) {}
    }, 2000);
  }
}

function enter() {
  show(menu, false);
  startPresence();
  const room = startParam();
  if (room) joinRoom(room);
}
nav.askName = () => show(registerScreen(), false);

// ---------- onlayn holat va takliflar ----------
const GNAME = { shashka: "Shashka", soz: "Topqir", gugurt: "Gugurt" };
const GICON = { shashka: "⚫", soz: "🔤", gugurt: "🔥" };
let presence = null;
const seenInv = new Set();
function startPresence() {
  if (presence) return;
  const ping = async () => {
    if (document.hidden) return;
    try {
      const r = await api("ping");
      (r.declined || []).forEach(n => toast(`${n} taklifni rad etdi`));
      if (r.busy || isBusy()) return; // o'yin paytida takliflar xalaqit bermaydi
      const inv = (r.invites || []).find(i => !seenInv.has(i.id));
      if (inv) { seenInv.add(inv.id); invitePopup(inv); }
    } catch (e) {}
  };
  ping();
  presence = setInterval(ping, 6000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) ping(); });
}
function invitePopup(inv) {
  document.getElementById("invpop")?.remove();
  const el = document.createElement("div");
  el.id = "invpop"; el.className = "invpop";
  el.innerHTML = `<div class="card"><div class="invic">${GICON[inv.game] || "🎮"}</div>
    <p><b>${esc(inv.from_name)}</b> sizni <b>${GNAME[inv.game] || "o'yin"}</b>ga chaqirmoqda!</p>
    <div class="row"><button class="btn green" data-a="1">✅ Qabul qilish</button><button class="btn alt" data-a="0">Rad etish</button></div></div>`;
  document.body.appendChild(el);
  haptic("ok");
  const close = () => el.remove();
  const t = setTimeout(close, 60000);
  el.querySelectorAll("[data-a]").forEach(b => b.onclick = async () => {
    clearTimeout(t); close();
    const accept = b.dataset.a === "1";
    try {
      const r = await api("answer", { invite: inv.id, accept });
      if (accept) { if (r.room) joinRoom(r.room); else toast("Bu taklif eskirgan — do'stingiz boshqa o'yinga o'tgan"); }
    } catch (e) { toast(e.message); }
  });
}

nav.online = () => show(onlineScreen());
function onlineScreen() {
  let list = null, timer = null;
  return {
    render() { draw(); load(); timer = setInterval(load, 6000); },
    leave() { clearInterval(timer); },
  };
  async function load() { try { list = await api("online"); } catch (e) { list = list || []; } if (document.querySelector(".onl")) draw(); }
  function draw() {
    app().innerHTML = header("🟢 Onlayn o'yinchilar") + `
      <p class="small muted" style="margin:0 4px 12px">Hozir ilovada turganlar. Birini tanlang va o'yinga chaqiring — unga bot orqali ham xabar boradi.</p>
      <div class="onl">${list === null ? `<p class="muted">Yuklanmoqda…</p>` : list.length ? list.map(p => `
        <div class="onrow"><span class="avatar sm">${esc(p.name[0] || "?")}</span>
          <span class="nm">${esc(p.name)}<small>${level(p.rating).icon} ${p.rating} ball</small></span>
          ${p.busy ? `<span class="busy">o'yinda</span>` : `<button class="pill" data-h="${esc(p.h)}" data-n="${esc(p.name)}">Chaqirish</button>`}</div>`).join("")
        : `<div class="card center"><p style="margin:0">Hozir hech kim onlayn emas 😴</p><p class="small muted">Do'stlaringizni chaqiring — havola yuboring.</p>
           <button class="btn" data-share>📨 Do'stni chaqirish</button></div>`}</div>`;
    bindBack();
    app().querySelectorAll("[data-h]").forEach(b => b.onclick = () => pickGame(b.dataset.h, b.dataset.n));
    const sh = app().querySelector("[data-share]"); if (sh) sh.onclick = shareApp;
  }
}
function pickGame(h, name) {
  document.getElementById("ov2")?.remove();
  const el = document.createElement("div");
  el.id = "ov2"; el.className = "overlay";
  let secs = gameSeconds("soz");
  const draw = () => {
    el.innerHTML = `<div class="card stack center"><h2 style="margin:0">${esc(name)} bilan</h2><p class="muted" style="margin:0">Qaysi o'yin?</p>
      ${Object.keys(GNAME).map(g => `<button class="btn alt" data-g="${g}">${GICON[g]} ${GNAME[g]}</button>`).join("")}
      <p class="small muted" style="margin:4px 0 0">Topqir va Gugurt vaqti:</p>
      <div class="seg tpick">${TIMES.map(t => `<button data-t="${t}" aria-pressed="${secs === t}">${t / 60} daq</button>`).join("")}</div>
      <button class="btn alt" data-x style="opacity:.7">Bekor qilish</button></div>`;
    el.querySelectorAll("[data-t]").forEach(b => b.onclick = e => { e.stopPropagation(); secs = +b.dataset.t; draw(); });
    el.querySelectorAll("[data-g]").forEach(b => b.onclick = () => go(b.dataset.g));
    el.querySelector("[data-x]").onclick = () => el.remove();
  };
  el.onclick = e => { if (e.target === el) el.remove(); };
  async function go(game) {
    el.remove();
    if (game !== "shashka") setGameSeconds(game, secs);
    try {
      const room = await ({ shashka: newShashka, soz: newSoz, gugurt: newGug })[game](name);
      const r = await api("invite", { h, game, room: room.id, seconds: game === "shashka" ? 0 : secs });
      if (r.ok) { haptic("ok"); return; }
      toast(r.error === "offline" ? `${name} hozir onlayn emas` : r.error === "busy" ? `${name} hozir boshqa o'yinda — keyinroq chaqiring`
        : r.error === "wait" ? "Biroz kuting, keyin yana chaqiring" : "Taklif yuborilmadi");
      back(); // kutish xonasini yopamiz
    } catch (e) { toast(e.message); }
  }
  draw();
  document.body.appendChild(el);
}
async function shareApp() {
  const bot = await botUsername(), link = bot ? `https://t.me/${bot}` : location.origin;
  const text = "G'altak'da bellashamizmi? Shashka, Topqir va Gugurt — 1 vs 1 🎮";
  if (tg?.openTelegramLink) tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
  else if (navigator.share) navigator.share({ text: text + "\n" + link }).catch(() => {});
}

// ---------- reyting ----------
const TABS = [["all", "Umumiy"], ["shashka", "Shashka"], ["soz", "Topqir"], ["gugurt", "Gugurt"]];
function leaderboard(game = "all") {
  let list = null;
  return {
    async render() {
      draw();
      try { list = await read("g_leaderboard", { p_game: game }); await refreshProfile(); } catch (e) { list = []; }
      draw();
    },
  };
  function draw() {
    const st = profile?.stats?.[game];
    app().innerHTML = header("🏆 Reyting") + scoreCard() + `
      <div class="seg tabs4" style="margin:14px 0">${TABS.map(([k, l]) => `<button data-g="${k}" aria-pressed="${k === game}">${l}</button>`).join("")}</div>
      ${st ? `<p class="small muted" style="margin:0 4px 10px">Siz${game === "all" ? "" : " bu o'yinda"}: ${st.wins} g'alaba · ${st.losses} mag'lubiyat · ${st.draws} durang${game === "all" ? ` · ${st.rank}-o'rin` : ""}</p>` : ""}
      <div class="lb">${list === null ? `<p class="muted">Yuklanmoqda…</p>` : list.length ? list.map((p, i) => lbRow(p, i)).join("")
        : `<p class="muted">Hali hech kim o'ynamagan. Birinchi bo'ling!</p>`}</div>`;
    bindBack();
    app().querySelectorAll("[data-g]").forEach(b => b.onclick = () => show(leaderboard(b.dataset.g), false));
  }
}
const lbRow = (p, i) => `<div class="lbrow ${p.h === me().h ? "me" : ""}"><span class="pos">${i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
  <span class="nm">${esc(p.name)}<small>${level(p.rating).icon} ${level(p.rating).name}</small></span><b>${p.rating}</b></div>`;
nav.leaderboard = leaderboard;

// ---------- menyu ----------
const menu = {
  async render() {
    let top = null, online = null;
    const draw = () => {
      app().innerHTML = `
        <section class="mini">
          <span class="avatar">${esc((me().name || "?")[0])}</span>
          <div class="mi"><b>${esc(me().name)}</b><span>${level().icon} ${level().name}</span>
            <div class="mbar"><i style="width:${Math.min(100, (profile?.stats?.all?.rating ?? 0) / MAX_SCORE * 100)}%"></i></div></div>
          <div class="mscore"><b>${profile?.stats?.all?.rating ?? 0}</b><small>/${MAX_SCORE}</small></div>
        </section>
        <div class="qrow">
          <button class="qbtn" data-lb><span>🏆</span><b>Reyting</b><i>${profile?.stats?.all?.rank && profile.stats.all.wins + profile.stats.all.losses + profile.stats.all.draws > 0 ? profile.stats.all.rank + "-o'rin" : top?.length ? "top " + Math.min(top.length, 30) : ""}</i></button>
          <button class="qbtn" data-online><span class="dot"></span><b>Onlayn</b><i>${online === null ? "…" : online.length}</i></button>
        </div>
        <h2 class="sect">O'yinlar · hammasi 1 vs 1</h2>
        <div class="games">
          <button class="game g-shashka" data-go="shashka">
            <span class="tag">Strategiya</span>
            <h2>Shashka</h2><p>Tasodifiy raqib, do'st yoki kompyuter bilan</p>
            <span class="art" aria-hidden="true">⚫</span>
          </button>
          <button class="game g-soz" data-go="soz">
            <span class="tag">So'z · 1–3 daqiqa</span>
            <h2>Topqir</h2><p>Harflardan o'zbekcha so'zlarni raqibdan tezroq toping</p>
            <span class="art" aria-hidden="true">🔤</span>
          </button>
          <button class="game g-gug" data-go="gugurt">
            <span class="tag">Mantiq · 1–3 daqiqa</span>
            <h2>Gugurt</h2><p>Bitta cho'pni ko'chirib, tenglamani to'g'rilang</p>
            <span class="art" aria-hidden="true">🔥</span>
          </button>
        </div>
        <button class="invite" data-invite><span>📨</span><span><b>Do'stlarni chaqiring</b><small>Birga o'ynash qiziqroq — havolani yuboring</small></span><i>→</i></button>
        <footer class="foot">G'altak · o'ynang, yuting, chempion bo'ling 👑</footer>`;
      app().querySelectorAll("[data-go]").forEach(b => b.onclick = () => {
        const g = b.dataset.go;
        if (g === "shashka") show(shashkaMenu());
        if (g === "soz") show(sozMenu());
        if (g === "gugurt") show(gugurtMenu());
      });
      app().querySelectorAll("[data-lb]").forEach(b => b.onclick = () => show(leaderboard()));
      app().querySelector("[data-invite]").onclick = shareApp;
      app().querySelector("[data-online]").onclick = () => show(onlineScreen());
    };
    draw();
    const [a, b] = await Promise.allSettled([read("g_leaderboard", { p_game: "all" }), api("online"), refreshProfile()]);
    top = a.status === "fulfilled" && Array.isArray(a.value) ? a.value : [];
    online = b.status === "fulfilled" && Array.isArray(b.value) ? b.value : [];
    if (document.querySelector(".qrow")) draw();
  },
};

function outside() {
  app().innerHTML = `<section class="welcome"><img src="img/logo.png" alt="" class="wlogo"><h1>G'altak <span>o'yinlari</span></h1>
    <p class="muted">O'yinlar Telegram ichida ishlaydi. Botni oching va «O'ynash» tugmasini bosing.</p></section>`;
}

async function boot() {
  if (!inTelegram()) return outside();
  app().innerHTML = `<section class="welcome"><img src="img/logo.png" alt="" class="wlogo"><p class="muted">Yuklanmoqda…</p></section>`;
  try {
    const p = await api("me");
    setProfile(p);
    if (!p.has_phone || p.needs_name) return show(registerScreen(), false);
    enter();
  } catch (e) {
    app().innerHTML = `<section class="welcome"><img src="img/logo.png" alt="" class="wlogo"><p class="muted">${esc(e.message)}. Qayta oching.</p></section>`;
  }
}
boot();
