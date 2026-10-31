import { app, setupTelegram, show, startParam, tg, inTelegram, api, setProfile, profile, me, score, esc, toast,
  header, bindBack, read, refreshProfile, haptic, nav, scoreCard, level, botUsername } from "./core.js";
import { shashkaMenu, joinRoom } from "./shashka.js";
import { sozMenu } from "./soz.js";
import { gugurtMenu } from "./gugurt.js";

setupTelegram();

// ---------- ro'yxatdan o'tish: ism + raqam bot chatida (odatiy "Raqamni yuborish" tugmasi) ----------
function registerScreen() {
  let name = profile?.name && profile.name !== "O'yinchi" ? profile.name : (tg?.initDataUnsafe?.user?.first_name || "");
  let asked = false, poll = null;
  return {
    render() {
      app().innerHTML = `
        <section class="welcome">
          <img src="img/logo.png" alt="" class="wlogo">
          <h1>G'altak <span>o'yinlari</span></h1>
          <p class="muted">Do'stlar bilan bellashing va 100 ballik reytingda chempion bo'ling.</p>
        </section>
        <div class="card stack">
          <div><label class="lbl" for="nm">1. Ismingiz (reytingda ko'rinadi)</label>
            <input class="inp" id="nm" maxlength="24" value="${esc(name)}" placeholder="Masalan: Begzod"></div>
          <div><label class="lbl">2. Telefon raqam</label>
            ${asked ? `<div class="hint">✅ Bot chatiga xabar yubordik. Chatdagi pastki <b>«📱 Raqamni yuborish»</b> tugmasini bosing — keyin shu yerga qayting.</div>
              <button class="btn" data-chat>💬 Bot chatini ochish</button>`
              : `<button class="btn" data-reg>📱 Raqamni bot orqali yuborish</button>`}</div>
          <p class="small muted" style="margin:0">Raqam Telegram'ning standart tugmasi orqali olinadi va hech kimga ko'rsatilmaydi.</p>
        </div>`;
      const inp = app().querySelector("#nm");
      inp.oninput = () => name = inp.value;
      const reg = app().querySelector("[data-reg]");
      if (reg) reg.onclick = async () => {
        name = inp.value.trim();
        if (name.length < 2) { toast("Ismingizni yozing"); return inp.focus(); }
        try {
          const p = await api("register", { name });
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
  const room = startParam();
  if (room) joinRoom(room);
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
const lbRow = (p, i) => `<div class="lbrow ${p.id === me().id ? "me" : ""}"><span class="pos">${i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
  <span class="nm">${esc(p.name)}<small>${level(p.rating).icon} ${level(p.rating).name}</small></span><span class="small muted">${p.wins}–${p.losses}</span><b>${p.rating}</b></div>`;
nav.leaderboard = leaderboard;

// ---------- menyu ----------
const menu = {
  async render() {
    let top = null;
    const draw = () => {
      app().innerHTML = `
        <section class="hero">
          <div class="who"><span class="avatar">${esc((me().name || "?")[0])}</span>
            <div><b>${esc(me().name)}</b><span class="small muted">${level().icon} ${level().name}</span></div>
            <button class="pill" data-lb>🏆 Reyting</button></div>
          ${scoreCard()}
        </section>
        <div class="topstrip" data-lb>
          <div class="ts-head"><b>Top o'yinchilar</b><span>hammasi →</span></div>
          ${top === null ? `<p class="small muted" style="margin:6px 0 0">Yuklanmoqda…</p>` : top.length ? `<div class="ts-list">${top.slice(0, 5).map((p, i) => `
            <div class="ts ${p.id === me().id ? "me" : ""}"><span>${["🥇", "🥈", "🥉", "4", "5"][i]}</span><b>${esc(p.name)}</b><i>${p.rating}</i></div>`).join("")}</div>`
            : `<p class="small muted" style="margin:6px 0 0">Hali hech kim yo'q — birinchi bo'ling!</p>`}
        </div>
        <h2 class="sect">O'yinlar · hammasi 1 vs 1</h2>
        <div class="games">
          <button class="game g-shashka" data-go="shashka">
            <span class="tag">Strategiya</span>
            <h2>Shashka</h2><p>Tasodifiy raqib, do'st yoki kompyuter bilan</p>
            <span class="art" aria-hidden="true">⚫</span>
          </button>
          <button class="game g-soz" data-go="soz">
            <span class="tag">So'z · 1 daqiqa</span>
            <h2>Topqir</h2><p>Harflardan o'zbekcha so'zlarni raqibdan tezroq toping</p>
            <span class="art" aria-hidden="true">🔤</span>
          </button>
          <button class="game g-gug" data-go="gugurt">
            <span class="tag">Mantiq · 1 daqiqa</span>
            <h2>Gugurt</h2><p>Bitta cho'pni ko'chirib, tenglamani to'g'rilang</p>
            <span class="art" aria-hidden="true">🔥</span>
          </button>
        </div>`;
      app().querySelectorAll("[data-go]").forEach(b => b.onclick = () => {
        const g = b.dataset.go;
        if (g === "shashka") show(shashkaMenu());
        if (g === "soz") show(sozMenu());
        if (g === "gugurt") show(gugurtMenu());
      });
      app().querySelectorAll("[data-lb]").forEach(b => b.onclick = () => show(leaderboard()));
    };
    draw();
    try { [top] = await Promise.all([read("g_leaderboard", { p_game: "all" }), refreshProfile()]); } catch (e) { top = []; }
    if (document.querySelector(".topstrip")) draw();
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
    if (!p.has_phone) return show(registerScreen(), false);
    enter();
  } catch (e) {
    app().innerHTML = `<section class="welcome"><img src="img/logo.png" alt="" class="wlogo"><p class="muted">${esc(e.message)}. Qayta oching.</p></section>`;
  }
}
boot();
