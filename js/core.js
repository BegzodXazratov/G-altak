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
// darajalar (0–100 ball)
const LEVELS = [[0, "Yangi boshlovchi", "🌱"], [10, "Havaskor", "🎯"], [30, "Tajribali", "⚔️"], [50, "Usta", "🛡️"],
  [70, "Ustoz", "🎖️"], [90, "Afsona", "🔥"], [100, "Chempion", "👑"]];
export function level(b = score()) {
  let cur = LEVELS[0], next = null;
  for (let i = 0; i < LEVELS.length; i++) if (b >= LEVELS[i][0]) { cur = LEVELS[i]; next = LEVELS[i + 1] || null; }
  return { name: cur[1], icon: cur[2], next: next ? { at: next[0], name: next[1], need: next[0] - b } : null };
}
export function scoreCard(b = score()) {
  const lv = level(b);
  const msg = b >= 100 ? "Cho'qqidasiz! Yana yutsangiz — chempionlik tasdiqlanadi 👑"
    : b === 0 ? "Birinchi g'alabangiz — birinchi ball! Boshladik 💪"
    : `${lv.next.name} darajasigacha yana ${lv.next.need} ta g'alaba`;
  return `<div class="scorecard"><div class="sc-top"><span class="lv">${lv.icon} ${lv.name}</span><b>${b}<small>/100</small></b></div>
    <div class="bar"><i style="width:${b}%"></i></div><p>${msg}</p></div>`;
}

export async function api(action, payload = {}) {
  const r = await fetch("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, v: 2, initData: tg?.initData || "", ...payload }),
  });
  if (r.status === 401) throw new Error("Telegram orqali kiring");
  if (!r.ok) throw new Error("Server xatosi");
  const j = await r.json();
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
export function show(screen, push = true) {
  if (current?.leave) current.leave();
  if (push && current) stack.push(current);
  current = screen;
  screen.render();
  window.scrollTo(0, 0);
  if (tg?.BackButton) stack.length ? tg.BackButton.show() : tg.BackButton.hide();
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
  if (res[mine + "_champion"]) return `<div class="champ">👑<b>Siz chempionsiz!</b><span>100 ballni himoya qildingiz</span></div>`;
  const txt = d > 0 ? `+${d} ball` : d < 0 ? `${d} ball` : "Ball o'zgarmadi";
  return `<div class="delta ${d > 0 ? "up" : d < 0 ? "down" : ""}">${txt} · ${r}/100</div>`;
}
