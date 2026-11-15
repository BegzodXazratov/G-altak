// Bambuk: sof o'yin qoidalari (DOM yo'q). Keyinchalik 1 vs 1 uchun ham shu yadro ishlatiladi:
// bir xil "seed" bo'lsa, ikkala o'yinchiga bir xil ustun ketma-ketligi chiqadi.
export const LEFT = 1, RIGHT = 2;

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// track[i] — i-chi bo'lakda qoziq qaysi tomonda: 0 yo'q, 1 chapda, 2 o'ngda
export function makeTrack(seed, n = 600) {
  const r = rng(seed), t = [];
  for (let i = 0; i < n; i++) {
    if (i < 4) { t.push(0); continue; }
    const p = Math.min(0.62, 0.38 + i * 0.0015);
    t.push(r() < p ? (r() < 0.5 ? LEFT : RIGHT) : 0);
  }
  return t;
}

export const ENERGY_START = 60, ENERGY_ADD = 6.5, ENERGY_MAX = 100;
export const drainRate = chops => 14 + Math.min(22, chops / 6); // sekundiga

export const newGame = seed => ({ track: makeTrack(seed), i: 0, side: LEFT, energy: ENERGY_START, score: 0, combo: 0, mult: 1, last: -1e9, dead: null });

// urish: side — LEFT yoki RIGHT. Natija: o'yin holati yangilanadi, o'lsa st.dead = "qoziq" | "charchadi"
export function chop(st, side, now) {
  if (st.dead) return st;
  st.side = side;
  st.i++;
  st.combo = now - st.last < 450 ? st.combo + 1 : 0;
  st.last = now;
  st.mult = Math.min(5, 1 + Math.floor(st.combo / 8));
  st.score += st.mult;
  st.energy = Math.min(ENERGY_MAX, st.energy + ENERGY_ADD);
  if (st.track[st.i] === side) st.dead = "qoziq";
  return st;
}

export function drain(st, dt) {
  if (st.dead) return st;
  st.energy -= drainRate(st.i) * dt;
  if (st.energy <= 0) { st.energy = 0; st.dead = "charchadi"; }
  return st;
}

// Serverda tekshirish: o'yinchi yuborgan urishlar [[tomon, ms], ...] seed bo'yicha qayta o'ynaladi.
// Ball shu yerdan chiqadi — mijozning o'zi yozgan ballga ishonilmaydi.
export const MIN_GAP = 55; // millisekund: odam sekundiga ~18 martadan tez bosa olmaydi
export function replay(seed, taps, seconds) {
  if (!Array.isArray(taps) || taps.length > 1200) return null;
  const st = newGame(seed), limit = seconds * 1000;
  let prev = 0, lastT = -1e9;
  for (const tp of taps) {
    if (!Array.isArray(tp)) return null;
    const side = tp[0], t = tp[1];
    if ((side !== LEFT && side !== RIGHT) || !Number.isFinite(t) || t < 0 || t > limit + 300 || t - lastT < MIN_GAP) return null;
    if (t > limit) break;
    drain(st, (t - prev) / 1000);
    if (st.dead) break;
    chop(st, side, t);
    prev = lastT = t;
    if (st.dead) break;
  }
  return { score: st.score, chops: st.i, dead: st.dead || "vaqt" };
}
