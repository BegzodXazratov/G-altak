// So'z jangi: so'zni server tomonda tekshirish (lug'at + katakchalar yo'li)
import fs from "node:fs";

let DICT = null;
function dict() {
  if (!DICT) DICT = new Set(JSON.parse(fs.readFileSync(new URL("./_words.json", import.meta.url), "utf8")));
  return DICT;
}
export function isWord(w) {
  const d = dict();
  if (d.has(w)) return true;
  return w.endsWith("LAR") && w.length >= 5 && d.has(w.slice(0, -3)); // ko'plik: KITOBLAR
}
// path: katak indekslari (10x10); har biri oldingisiga qo'shni (diagonal ham), takrorlanmaydi
export function pathWord(grid, path, n = 10) {
  if (!Array.isArray(path) || path.length < 2 || path.length > 20) return null;
  const seen = new Set();
  for (let k = 0; k < path.length; k++) {
    const i = path[k];
    if (!Number.isInteger(i) || i < 0 || i >= n * n || seen.has(i)) return null;
    if (k) {
      const p = path[k - 1];
      if (Math.max(Math.abs(((i / n) | 0) - ((p / n) | 0)), Math.abs((i % n) - (p % n))) !== 1) return null;
    }
    seen.add(i);
  }
  return path.map(i => grid[i]).join("");
}
