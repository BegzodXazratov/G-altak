// IQ bo'limi uchun umumiy yordamchilar: yengil mavzu, rekordlar, ulashish.
import { tg, botUsername } from "./core.js";

// IQ ekranlari yengil ranglarda ochiladi; boshqa ekranga o'tilganda avtomatik o'chadi.
export function iqScreen(o) {
  const r = o.render, l = o.leave;
  return Object.assign({}, o, {
    render() { document.documentElement.dataset.iq = "1"; return r.call(this); },
    leave() { delete document.documentElement.dataset.iq; if (l) l.call(this); },
  });
}

export function getBest(id) { try { return JSON.parse(localStorage.getItem("iqx:" + id)); } catch (e) { return null; } }
export function setBest(id, v, higherIsBetter = true) {
  const old = getBest(id);
  const better = old == null || (higherIsBetter ? v > old : v < old);
  if (better) { try { localStorage.setItem("iqx:" + id, JSON.stringify(v)); } catch (e) {} }
  return { better: better && old != null, first: old == null, old };
}

export async function shareText(text) {
  const b = await botUsername();
  const link = b ? `https://t.me/${b}` : "";
  if (link && tg?.openTelegramLink) tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
  else navigator.share?.({ text: text + (link ? "\n" + link : "") }).catch(() => {});
}

export const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const tickH = () => { try { tg?.HapticFeedback?.selectionChanged(); } catch (e) {} };
export const noteH = (k) => { try { tg?.HapticFeedback?.notificationOccurred(k); } catch (e) {} };
