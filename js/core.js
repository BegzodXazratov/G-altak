// Telegram Mini App yordamchilari, ekranlar, saqlash va server (Supabase RPC)
export const tg = window.Telegram?.WebApp;
export const $ = s => document.querySelector(s);
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

export function me() {
  const u = tg?.initDataUnsafe?.user;
  if (u) return { id: String(u.id), name: u.first_name || "O'yinchi" };
  let id = load("guest-id");
  if (!id) { id = "g" + Math.random().toString(36).slice(2, 10); save("guest-id", id); }
  return { id, name: "Mehmon" };
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
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2200);
}

// ekranlar: har biri {render, leave}
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
  stack.length = 1;
  back();
}
tg?.BackButton?.onClick(back);

export function header(title) {
  return `<div class="top">${stack.length ? `<button class="back" data-back aria-label="Orqaga">←</button>` : ""}<h1>${title}</h1></div>`;
}
export function bindBack(root = app()) {
  root.querySelectorAll("[data-back]").forEach(b => b.onclick = back);
}

export async function rpc(fn, args) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error("Server xatosi " + r.status);
  return r.json();
}

let botName = null;
export async function botUsername() {
  if (botName !== null) return botName;
  try { botName = (await (await fetch("/api/config")).json()).bot || ""; } catch (e) { botName = ""; }
  return botName;
}

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
