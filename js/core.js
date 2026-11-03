import { APP_VERSION } from "./version.js";
// Telegram Mini App yordamchilari, ekranlar, akkaunt va server
export const tg = window.Telegram?.WebApp;
export const app = () => document.getElementById("app");

const SB_URL = "https://ljilvblrbdhdizvgqtyc.supabase.co";
const SB_KEY = "sb_publishable_dtWXod3KZbYtDS2U5_z8fQ_dMBma7IV";

export function setupTelegram() {
  if (!tg) return;
  tg.ready();
  tg.expand();
  try { tg.disableVerticalSwipes?.(); } catch (e) {}
  const apply = () => document.documentElement.dataset.scheme = tg.colorScheme === "dark" ? "dark" : "light";
  apply();
  tg.onEvent?.("themeChanged", apply);
  try { tg.setHeaderColor?.("bg_color"); } catch (e) {}
}

export const inTelegram = () => !!tg?.initData;

// ---------- akkaunt ----------
export let profile = null;
export function setProfile(p) { profile = p; }
export function me() {
  return { id: profile?.id || "", h: profile?.h || "", name: profile?.name || "" };
}
// xonada o'yinchi Telegram ID o'rniga yashirin belgi (h) bilan saqlanadi; eski ko'rinish ham tushuniladi
export const isMe = x => !!x && (x === profile?.id || x === profile?.h);
export const score = () => profile?.stats?.all?.rating ?? 0;
export const rating = () => score();
// darajalar (0–1000 ball)
export const MAX_SCORE = 1000;
const LEVELS = [[0, "Yangi boshlovchi", "🌱"], [30, "Havaskor", "🎯"], [100, "Tajribali", "⚔️"], [250, "Usta", "🛡️"],
  [450, "Ustoz", "🎖️"], [700, "Afsona", "🔥"], [1000, "Chempion", "👑"]];
export function level(b = score()) {
  let cur = LEVELS[0], next = null;
  for (let i = 0; i < LEVELS.length; i++) if (b >= LEVELS[i][0]) { cur = LEVELS[i]; next = LEVELS[i + 1] || null; }
  return { name: cur[1], icon: cur[2], next: next ? { at: next[0], name: next[1], need: next[0] - b } : null };
}
export function scoreCard(b = score()) {
  const lv = level(b);
  const msg = b >= MAX_SCORE ? "Siz chempionsiz! Har g'alaba toj'ni himoya qiladi 👑"
    : b === 0 ? "G'alaba +3, durang +1, mag'lubiyat −1. Boshladik 💪"
    : `${lv.next.name} darajasigacha ${lv.next.need} ball — taxminan ${Math.ceil(lv.next.need / 3)} ta g'alaba 🔥`;
  return `<div class="scorecard"><div class="sc-top"><span class="lv">${lv.icon} ${lv.name}</span><b>${b}<small>/${MAX_SCORE}</small></b></div>
    <div class="bar"><i style="width:${Math.min(100, b / MAX_SCORE * 100)}%"></i></div><p>${msg}</p></div>`;
}

export async function api(action, payload = {}) {
  const r = await fetch("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, v: 2, ver: APP_VERSION, initData: tg?.initData || "", ...payload }),
  });
  if (r.status === 401) throw new Error("Telegram orqali kiring");
  if (!r.ok) throw new Error("Server xatosi");
  const j = await r.json();
  if (j?.update) { updateKick(); throw new Error("O'yin yangilandi"); }
  if (j?.error === "need_name") { nav.askName?.(); throw new Error("Avval ismingizni kiriting"); }
  return j;
}

// faqat o'qish (ochiq)
export async function read(fn, args) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error("Server xatosi " + r.status);
  return r.json();
}

export async function refreshProfile() {
  try { const p = await read("g_profile", { p_id: me().id }); if (p) profile = { ...profile, ...p }; } catch (e) {}
  return profile;
}

export function startParam() {
  const p = tg?.initDataUnsafe?.start_param || new URLSearchParams(location.search).get("room") || "";
  return p.replace(/^r_/, "");
}

export function load(k) { try { return localStorage.getItem("galtak:" + k); } catch (e) { return null; } }
export function save(k, v) { try { localStorage.setItem("galtak:" + k, v); } catch (e) {} }

export function haptic(kind = "light") {
  try {
    if (kind === "ok" || kind === "error" || kind === "warning") tg?.HapticFeedback?.notificationOccurred(kind === "ok" ? "success" : kind);
    else tg?.HapticFeedback?.impactOccurred(kind);
  } catch (e) {}
}

let toastT;
export function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("on");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2400);
}

// ---------- ekranlar ----------
export const nav = {}; // boshqa modullar uchun: nav.leaderboard(game)
let current = null;
const stack = [];
export const isBusy = () => !!current?.busy; // o'yin yoki kutish ekrani — taklif oynalari chiqmaydi
export function show(screen, push = true) {
  document.getElementById("quip")?.classList.remove("on");
  if (screen.busy) document.getElementById("invpop")?.remove();
  if (current?.leave) current.leave();
  if (push && current) stack.push(current);
  current = screen;
  screen.render();
  paintTabs(screen);
  window.scrollTo(0, 0);
  if (tg?.BackButton) stack.length ? tg.BackButton.show() : tg.BackButton.hide();
}
// ---------- pastki menyu: O'yin · Do'stlar · Chatlar · Profil ----------
const TABS_UI = [["home", "🎮", "O'yin"], ["friends", "👥", "Do'stlar"], ["chats", "💬", "Chatlar"], ["profile", "👤", "Profil"]];
export const tabBadge = { friends: 0, chats: 0 };
export function paintTabs(screen = current) {
  let el = document.getElementById("tabbar");
  if (!screen?.tab) { el?.remove(); document.body.classList.remove("hastabs"); return; }
  if (!el) {
    el = document.createElement("nav"); el.id = "tabbar"; el.setAttribute("aria-label", "Asosiy menyu");
    el.innerHTML = TABS_UI.map(([k, ic, l]) => `<button data-tab="${k}"><span class="ti"><i class="ei">${ic}</i><b class="tb" hidden></b></span><span class="tl">${l}</span></button>`).join("");
    el.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { haptic("light"); goTab(b.dataset.tab); });
    document.body.appendChild(el);
  }
  document.body.classList.add("hastabs");
  el.querySelectorAll("[data-tab]").forEach(b => {
    const k = b.dataset.tab, on = k === screen.tab, n = tabBadge[k] || 0, bd = b.querySelector(".tb");
    b.classList.toggle("on", on); if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    bd.hidden = !n; bd.textContent = n > 9 ? "9+" : n;
  });
}
export function goTab(name) {
  if (current?.tab === name) return;
  if (name === "home") { if (stack.length) home(); return; }
  if (!stack.length && current?.tab === "home") stack.push(current);
  stack.length = Math.min(stack.length, 1);
  const make = nav.tabs?.[name]; if (make) show(make(), false);
}
export function back() {
  const prev = stack.pop();
  if (prev) show(prev, false);
}
export function home() {
  if (!stack.length) return;
  stack.length = 1;
  back();
}
tg?.BackButton?.onClick(back);

export function header(title, right = "") {
  return `<div class="top">${stack.length ? `<button class="back" data-back aria-label="Orqaga">←</button>` : ""}<h1>${title}</h1><span class="grow"></span>${right}</div>`;
}
export function bindBack(root = app()) {
  root.querySelectorAll("[data-back]").forEach(b => b.onclick = back);
}

let botName = null;
export async function botUsername() {
  if (botName !== null) return botName;
  try { botName = (await (await fetch("/api/config")).json()).bot || ""; } catch (e) { botName = ""; }
  return botName;
}

export async function shareInvite(roomId, text) {
  const bot = await botUsername();
  const link = bot ? `https://t.me/${bot}?start=r_${roomId}` : "";
  if (link && tg?.openTelegramLink) tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
  else if (navigator.share) navigator.share({ text: text + (link ? "\n" + link : "") }).catch(() => {});
  else copy(roomId);
}
export function copy(t) {
  navigator.clipboard?.writeText(t).then(() => toast("Nusxalandi: " + t), () => toast("Kod: " + t));
}

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const sleep = ms => new Promise(r => setTimeout(r, ms));

// natija oynasi (onlayn): ball o'zgarishi
export function ratingLine(room) {
  const res = room?.result;
  if (!res || res.cancelled) return "";
  const mine = isMe(room.p1) ? "p1" : "p2";
  const d = res[mine + "_delta"], r = res[mine + "_rating"];
  if (d === undefined) return "";
  if (profile?.stats?.all) profile.stats.all.rating = r;
  if (res[mine + "_champion"]) return `<div class="champ">👑<b>Siz chempionsiz!</b><span>1000 ball — eng yuqori cho'qqi</span></div>`;
  const txt = d >= 3 ? `+${d} ball 🔥` : d > 0 ? `+${d} ball` : d < 0 ? `${d} ball — keyingisida qaytarib olasiz!` : "Ball o'zgarmadi";
  return `<div class="delta ${d > 0 ? "up" : d < 0 ? "down" : ""}">${txt} · ${r}/${MAX_SCORE}</div>`;
}

// Umumiy kutish ekrani: xona kodi ko'rsatilmaydi. Chiqib ketilsa — xona yopiladi (eski taklifga hech kim tushib qolmaydi).
// taklifni qabul qilib boshqa xonaga o'tayotganda kutish ekrani "xona yopildi" deb menyuga otib yubormasin
let joiningUntil = 0;
export const markJoining = () => { joiningUntil = Date.now() + 10000; };
export function waitScreen(room, { matching = false, icon = "🎮", invited = "", shareText = "", onStart }) {
  let timer, started = false, dots = 0, alive = true;
  return {
    busy: true,
    render() {
      app().innerHTML = header(matching ? "Raqib qidirilmoqda" : invited ? "Javob kutilmoqda" : "Do'stni kutyapmiz") + `
        <div class="card stack center">
          <div class="radar"><span></span><span></span><span></span><b>${icon}</b></div>
          <p class="muted" id="wt" style="margin:0">${matching ? "Sizga mos raqib qidiryapmiz…" : invited ? `<b>${esc(invited)}</b> ga taklif yuborildi — qabul qilishi bilan o'yin boshlanadi`
            : "Do'stingiz havolani bosishi bilan o'yin boshlanadi"}</p>
          <button class="btn" data-online>👥 Do'stni chaqirish</button>
          <button class="btn alt" data-share>📨 Do'stga havola yuborish</button>
          <button class="btn alt" data-cancel style="opacity:.75">Bekor qilish</button>
        </div>`;
      bindBack();
      app().querySelector("[data-share]").onclick = () => shareInvite(room.id, shareText);
      app().querySelector("[data-online]").onclick = () => nav.friends?.({ game: room.game });
      app().querySelector("[data-cancel]").onclick = () => back();
      timer = setInterval(async () => {
        if (matching) { dots = (dots + 1) % 4; const wt = document.getElementById("wt"); if (wt) wt.textContent = "Sizga mos raqib qidiryapmiz" + ".".repeat(dots); }
        try {
          const r = await read("g_room_get", { p_id: room.id });
          if (!alive) return; // ekran allaqachon almashgan — eski javobni e'tiborsiz qoldiramiz
          if (r.status === "playing") { started = true; clearInterval(timer); haptic("ok"); onStart(r); }
          else if (r.status === "done" && Date.now() > joiningUntil) { started = true; clearInterval(timer); home(); }
        } catch (e) {}
      }, 1200);
    },
    leave() {
      alive = false;
      clearInterval(timer);
      if (!started) { started = true; api("cancel", { id: room.id }).catch(() => {}); }
    },
  };
}

// Topqir/Gugurt vaqti (soniya) — o'yinchi tanlaydi
export const TIMES = [60, 120, 180];
export const gameSeconds = game => { const v = +load(game + "-secs"); return TIMES.includes(v) ? v : 120; };
export const setGameSeconds = (game, s) => save(game + "-secs", String(s));
export const timePicker = game => `<div class="seg tpick" data-tp="${game}">${TIMES.map(s =>
  `<button data-secs="${s}" aria-pressed="${gameSeconds(game) === s}">⏱ ${s / 60} daqiqa</button>`).join("")}</div>`;
export function bindTimePicker(root, game, rerender) {
  root.querySelectorAll(`[data-tp="${game}"] [data-secs]`).forEach(b => b.onclick = () => { setGameSeconds(game, +b.dataset.secs); haptic("light"); rerender(); });
}

// Yangi versiya chiqdi — o'yinchini ilovadan chiqaramiz (qayta ochganda yangi versiya yuklanadi)
let kicked = false;
export function updateKick() {
  if (kicked) return; kicked = true;
  const el = document.createElement("div");
  el.className = "overlay"; el.style.zIndex = 99;
  el.innerHTML = `<div class="card stack center"><div style="font-size:44px">🎮</div><h2 style="margin:0">O'yin yangilandi!</h2>
    <p class="muted" style="margin:0">Yangi imkoniyatlar qo'shildi. Ilova qayta ochiladi…</p>
    <button class="btn green" data-re>🔄 Hozir qayta ochish</button></div>`;
  document.body.appendChild(el);
  el.querySelector("[data-re]").onclick = () => location.reload();
  haptic("ok");
  setTimeout(() => { if (tg?.close) tg.close(); else location.reload(); }, 4000);
}
