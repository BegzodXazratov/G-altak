// Kamonchi: navbat bilan otish. Fizika bitta joyda — server ham, mijoz ham shu kodni ishlatadi.
// Ikki kamonchi ochiq maydonda turli balandlikdagi minoralarda turadi; joy va balandlik har o'yinda (seed bo'yicha) tasodifiy.
export const W = 100, H = 76, LIVES = 5, ROUNDS = 6; // ROUNDS — har kimning o'qlari soni; eng ko'p ball to'plagan yutadi
export const GROUND = 5, PW = 4.2, BODY = 8.5, HEAD = 6.2, REACH = 2.4, BOW_Y = 6;
export const ANG_MIN = -50, ANG_MAX = 85;
const G = 70, DT = 0.02;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function rng(seed) { let s = (seed >>> 0) || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// seed -> kamonchilar joyi (x) va minora balandligi (top). Eski o'yinlar ham shu seeddan yangi joy oladi.
export function layout(seed) {
  const r = rng(seed * 7919 + 13);
  const x1 = 8 + r() * 22, x2 = 70 + r() * 22;
  let t1 = 16 + r() * 28, t2 = 16 + r() * 28;
  if (Math.abs(t1 - t2) < 7) { // balandlik farqi sezilib tursin
    const up = t2 >= t1 ? t1 + 7 : t1 - 7;
    t2 = up <= 44 && up >= 16 ? up : (t2 >= t1 ? t1 - 7 : t1 + 7);
  }
  return { x: { p1: Math.round(x1 * 10) / 10, p2: Math.round(x2 * 10) / 10 }, top: { p1: Math.round(t1 * 10) / 10, p2: Math.round(t2 * 10) / 10 } };
}
// Har yurishda maydon o'rtasida 2 ta muallaq devor paydo bo'lib yo'qolib turadi (o'q uchish vaqtiga qarab),
// va butun o'yinda 3 ta yurishda "jon" (❤️) HEART_SEC soniya davomida paydo bo'ladi: o'q tegsa +1 jon va +1 ball.
export const HEART_SEC = 12;
export function hazards(seed, seq) {
  const r = rng(seed * 104729 + (seq || 0) * 31 + 7), walls = [];
  for (let i = 0; i < 2; i++) {
    const per = 4 + r() * 1.6;
    walls.push({ x: Math.round((i ? 52 + r() * 8 : 36 + r() * 8) * 10) / 10, y: Math.round((22 + r() * 30) * 10) / 10, hw: 1.3, h: 9, per: Math.round(per * 10) / 10, on: Math.round(per * 5) / 10, ph: Math.round(r() * per * 10) / 10 });
  }
  const rr = rng(seed * 31337 + 5), turns = [];
  while (turns.length < 3) { const t = 1 + Math.floor(rr() * (ROUNDS * 2 - 2)); if (!turns.includes(t)) turns.push(t); }
  const heart = turns.includes(seq || 0) ? { x: Math.round((40 + r() * 20) * 10) / 10, y: Math.round((30 + r() * 24) * 10) / 10, r: 3.6 } : null;
  return { walls, heart };
}
export const wallOn = (w, t) => ((t + w.ph) % w.per) < w.on;
export const newWind = () => Math.round((Math.random() * 10 - 5) * 10) / 10;
export const initArch = () => ({ seed: Math.floor(Math.random() * 100000), turn: "p1", hp: { p1: ROUNDS * 2, p2: ROUNDS * 2 }, score: { p1: 0, p2: 0 }, shots: { p1: 0, p2: 0 }, wind: newWind(), seq: 0, last: null, winner: null, wounds: { p1: [], p2: [] } });
// eski (jon bilan) o'yinlarni yangi hisobga o'tkazadi
export function norm(st) {
  if (st.score) return st;
  const seq = st.seq || 0;
  return { ...st, score: { p1: Math.max(0, LIVES - (st.hp?.p2 ?? LIVES)), p2: Math.max(0, LIVES - (st.hp?.p1 ?? LIVES)) }, shots: { p1: Math.ceil(seq / 2), p2: Math.floor(seq / 2) } };
}

// bitta o'q: yo'l, kimga tegdi (qayerga), qancha jon ketdi, qayerga qadaldi, nishonga eng yaqin masofa
export function simulate(st, side, angle, power, el = 99) {
  const L = layout(st.seed), foe = side === "p1" ? "p2" : "p1", dir = side === "p1" ? 1 : -1;
  const a = clamp(+angle || 45, ANG_MIN, ANG_MAX) * Math.PI / 180, v = clamp(+power || 50, 10, 100) * 0.9;
  let x = L.x[side] + dir * 1.8, y = L.top[side] + BOW_Y, vx = Math.cos(a) * v * dir, vy = Math.sin(a) * v;
  const ax = (st.wind || 0) * 3, fy = L.top[foe], cx = L.x[foe], cy = fy + 4;
  const HZ = hazards(st.seed, st.seq || 0), heartOn = HZ.heart && el < HEART_SEC;
  const path = [[x, y]]; let hit = null, dmg = 0, near = 1e9, at = null, end = null, got = null, wall = false;
  for (let t = 0; t < 8; t += DT) {
    vx += ax * DT; vy -= G * DT; x += vx * DT; y += vy * DT;
    path.push([x, y]);
    near = Math.min(near, Math.hypot(x - cx, y - cy));
    if (heartOn && !got && Math.hypot(x - HZ.heart.x, y - HZ.heart.y) < HZ.heart.r) got = [HZ.heart.x, HZ.heart.y];
    if (HZ.walls.some(w => wallOn(w, t) && Math.abs(x - w.x) < w.hw + 0.3 && y >= w.y && y <= w.y + w.h)) { end = [x, y]; wall = true; break; }
    if (Math.abs(x - cx) < REACH && y >= fy && y <= fy + BODY) { hit = foe; dmg = y >= fy + HEAD ? 2 : 1; at = [x, y]; break; }
    if ((Math.abs(x - cx) < PW && y <= fy) || (Math.abs(x - L.x[side]) < PW && y <= L.top[side]) || y <= GROUND) { end = [x, Math.max(y, GROUND)]; break; }
    if (x < -8 || x > W + 8) break;
  }
  const last = path[path.length - 1], prev = path[path.length - 2] || last;
  const deg = Math.round(Math.atan2(last[1] - prev[1], last[0] - prev[0]) * 180 / Math.PI);
  const out = []; for (let i = 0; i < path.length; i++) if (i % 2 === 0 || i === path.length - 1) out.push([Math.round(path[i][0] * 10) / 10, Math.round(path[i][1] * 10) / 10]);
  const r1 = p => p && [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
  return { path: out, hit, dmg, near, at: r1(at), end: r1(end), deg, heart: r1(got), wall };
}

export function applyShot(st, side, angle, power, el = 99) {
  st = norm(st);
  const r = simulate(st, side, angle, power, el), hp = { ...st.hp }, L = layout(st.seed);
  const wounds = { p1: [...(st.wounds?.p1 || [])], p2: [...(st.wounds?.p2 || [])] };
  const score = { ...st.score }, shots = { ...st.shots }; shots[side]++;
  if (r.hit) {
    hp[r.hit] = Math.max(0, hp[r.hit] - r.dmg); score[side] += r.dmg;
    wounds[r.hit].push([Math.round((r.at[0] - L.x[r.hit]) * 10) / 10, Math.round((r.at[1] - L.top[r.hit]) * 10) / 10, r.dmg]);
  }
  if (r.heart) { score[side] += 1; hp[side] = Math.min(ROUNDS * 2, hp[side] + 1); }
  const foe = side === "p1" ? "p2" : "p1";
  return { ...st, hp, score, shots, wounds, turn: foe, wind: newWind(), seq: (st.seq || 0) + 1,
    last: { by: side, angle: Math.round(angle), power: Math.round(power), path: r.path, hit: r.hit, dmg: r.dmg, at: r.at, end: r.end, deg: r.deg, heart: r.heart, wall: r.wall },
    winner: decide(score, shots) };
}
// Ikkalasi teng miqdorda otgach, ko'p ball to'plagan yutadi (durang bo'lsa — qo'shimcha o'q). Raqib yetib ololmasa — oldinroq tugaydi.
export function decide(sc, sh) {
  const rem = s => Math.max(0, ROUNDS - sh[s]), lead = sc.p1 - sc.p2;
  if (sh.p1 === sh.p2 && sh.p1 >= ROUNDS) return lead > 0 ? "p1" : lead < 0 ? "p2" : null;
  if (rem("p2") > 0 && lead > 2 * rem("p2")) return "p1";
  if (rem("p1") > 0 && -lead > 2 * rem("p1")) return "p2";
  return null;
}
export const arrowsLeft = (st, side) => {
  const base = ROUNDS - (st.shots?.[side] ?? 0); if (base > 0) return base;
  const foe = side === "p1" ? "p2" : "p1"; return (st.shots?.[side] ?? 0) <= (st.shots?.[foe] ?? 0) && !st.winner ? 1 : 0;
};

// kompyuter: ko'p urinish orasidan eng yaqinini tanlab, darajaga qarab xato qo'shadi
export function aiShot(st, side, level) {
  let best = null;
  for (let ang = -40; ang <= 75; ang += 3) for (let pw = 30; pw <= 100; pw += 3) {
    const r = simulate(st, side, ang, pw), d = r.hit ? -r.dmg : r.near;
    if (!best || d < best.d) best = { ang, pw, d };
  }
  const s = { oson: 20, orta: 8, qiyin: 4.5 }[level] ?? 3.5;
  const n = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.4;
  return { angle: clamp(best.ang + n() * s, ANG_MIN, ANG_MAX), power: clamp(best.pw + n() * s * 1.6, 25, 100) };
}
