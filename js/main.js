import { app, setupTelegram, show, startParam, tg, inTelegram, api, setProfile, profile, me, rating, esc, toast,
  header, bindBack, read, refreshProfile, haptic, nav } from "./core.js";
import { shashkaMenu, joinRoom } from "./shashka.js";
import { game2048 } from "./g2048.js";
import { sozMenu } from "./soz.js";

setupTelegram();

// ---------- ro'yxatdan o'tish ----------
function registerScreen() {
  let name = profile?.name && profile.name !== "O'yinchi" ? profile.name : (tg?.initDataUnsafe?.user?.first_name || "");
  return {
    render() {
      app().innerHTML = `
        <section class="welcome">
          <img src="img/logo.png" alt="" class="wlogo">
          <h1>G'altak <span>o'yinlari</span></h1>
          <p class="muted">Do'stlar bilan o'ynang, reytingda yuqoriga chiqing. Boshlash uchun akkaunt yarataylik.</p>
        </section>
        <div class="card stack">
          <div><label class="lbl" for="nm">Ismingiz (reytingda ko'rinadi)</label>
            <input class="inp" id="nm" maxlength="24" value="${esc(name)}" placeholder="Masalan: Begzod"></div>
          <button class="btn" data-reg>📱 Raqamni ulashish va boshlash</button>
          <p class="small muted" style="margin:0">Telefon raqamingiz faqat akkauntni tasdiqlash uchun. U hech kimga ko'rsatilmaydi.</p>
        </div>`;
      const inp = app().querySelector("#nm");
      inp.oninput = () => name = inp.value;
      app().querySelector("[data-reg]").onclick = async () => {
        name = inp.value.trim();
        if (name.length < 2) { toast("Ismingizni yozing"); return inp.focus(); }
        if (!tg?.requestContact) return finish(null);
        tg.requestContact(async (shared, res) => {
          if (!shared) return toast("Davom etish uchun raqamni ulashing");
          finish(res?.responseUnsafe?.contact || null);
        });
      };
      async function finish(contact) {
        try {
          const p = await api("register", { name, contact });
          setProfile(p);
          haptic("ok");
          show(menu, false);
          openStartRoom();
        } catch (e) { toast(e.message); }
      }
    },
  };
}

// ---------- reyting ----------
function leaderboard(game = "shashka") {
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
    app().innerHTML = header("🏆 Reyting") + `
      <div class="seg" style="margin-bottom:14px">${[["shashka", "Shashka"], ["soz", "So'z jangi"]].map(([k, l]) =>
        `<button data-g="${k}" aria-pressed="${k === game}">${l}</button>`).join("")}</div>
      ${st ? `<div class="mecard"><div><b>${esc(profile.name)}</b><span class="muted small">${st.wins} g'alaba · ${st.losses} mag'lub · ${st.draws} durang</span></div>
        <div class="rt"><b>${st.rating}</b><span>${st.rank}-o'rin</span></div></div>` : ""}
      <div class="lb">${list === null ? `<p class="muted">Yuklanmoqda…</p>` : list.length ? list.map((p, i) => `
        <div class="lbrow ${p.id === me().id ? "me" : ""}"><span class="pos">${i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
          <span class="nm">${esc(p.name)}</span><span class="small muted">${p.wins}–${p.losses}</span><b>${p.rating}</b></div>`).join("")
        : `<p class="muted">Hali hech kim onlayn o'ynamagan. Birinchi bo'ling!</p>`}</div>`;
    bindBack();
    app().querySelectorAll("[data-g]").forEach(b => b.onclick = () => { game = b.dataset.g; list = null; show(leaderboard(game), false); });
  }
}

nav.leaderboard = leaderboard;

// ---------- menyu ----------
const menu = {
  render() {
    app().innerHTML = `
      <section class="hero">
        <div class="who"><span class="avatar">${esc((me().name || "?")[0])}</span>
          <div><b>${esc(me().name)}</b><span class="small muted">Shashka ${rating("shashka")} · So'z ${rating("soz")}</span></div>
          <button class="pill" data-lb>🏆 Reyting</button></div>
        <h1>Bugun nima <span>o'ynaymiz?</span></h1>
      </section>
      <div class="games">
        <button class="game g-shashka" data-go="shashka">
          <span class="tag">1 vs 1 · Kompyuter</span>
          <h2>Shashka</h2><p>Tasodifiy raqib, do'st yoki kompyuter bilan</p>
          <span class="art" aria-hidden="true">⚫</span>
        </button>
        <button class="game g-soz" data-go="soz">
          <span class="tag">1 vs 1 · 3 daqiqa</span>
          <h2>So'z jangi</h2><p>10×10 harflar ichidan o'zbekcha so'zlarni raqibdan oldin toping</p>
          <span class="art" aria-hidden="true">🔤</span>
        </button>
        <button class="game g-2048" data-go="2048">
          <span class="tag">Yolg'iz</span>
          <h2>2048</h2><p>Kataklarni surib, bir xil raqamlarni qo'shing</p>
          <span class="art" aria-hidden="true">🔢</span>
        </button>
      </div>`;
    app().querySelectorAll("[data-go]").forEach(b => b.onclick = () => {
      const g = b.dataset.go;
      if (g === "shashka") show(shashkaMenu());
      if (g === "2048") show(game2048());
      if (g === "soz") show(sozMenu());
    });
    app().querySelector("[data-lb]").onclick = () => show(leaderboard());
  },
};

function outside() {
  app().innerHTML = `<section class="welcome"><img src="img/logo.png" alt="" class="wlogo"><h1>G'altak <span>o'yinlari</span></h1>
    <p class="muted">O'yinlar Telegram ichida ishlaydi. Botni oching va «O'ynash» tugmasini bosing.</p></section>`;
}

function openStartRoom() {
  const room = startParam();
  if (room) joinRoom(room);
}

async function boot() {
  if (!inTelegram()) return outside();
  app().innerHTML = `<section class="welcome"><img src="img/logo.png" alt="" class="wlogo"><p class="muted">Yuklanmoqda…</p></section>`;
  try {
    const p = await api("me");
    setProfile(p);
    if (!p.has_phone) return show(registerScreen(), false);
    show(menu, false);
    openStartRoom();
  } catch (e) {
    app().innerHTML = `<section class="welcome"><img src="img/logo.png" alt="" class="wlogo"><p class="muted">${esc(e.message)}. Qayta oching.</p></section>`;
  }
}
boot();

export { menu };
