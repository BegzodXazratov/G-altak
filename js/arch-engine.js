// Kamonchi: navbat bilan otish. Fizika bitta joyda — server ham, mijoz ham shu kodni ishlatadi.
export const W = 100, H = 56, X = { p1: 10, p2: 90 }, LIVES = 5;
const G = 70, DT = 0.02, REACH = 2.4;

export const terrain = seed => {
  const a = (seed % 97) / 15, b = (seed % 53) / 8, hill = ((seed >> 3) % 100) / 100 * 9;
  return x => 8 + 2.6 * Math.sin(x * 0.085 + a) + 1.8 * Math.sin(x * 0.2 + b) + hill * Math.exp(-(((x - 50) / 11) ** 2));
};
const rnd = (a, b) => Math.round((a + Math.random() * (b - a)) * 10) / 10;
export const newWind = () => Math.round((Math.random() * 10 - 5) * 10) / 10;
export const initArch = () => ({ seed: Math.floor(Math.random() * 100000), turn: "p1", hp: { p1: LIVES, p2: LIVES }, wind: newWind(), seq: 0, last: null, winner: null });
export const groundAt = (st, side) => terrain(st.seed)(X[side]);

// bitta o'q: yo'l, kimga tegdi, qancha jon ketdi, nishonga eng yaqin masofa
export function simulate(st, side, angle, power) {
  const h = terrain(st.seed), foe = side === "p1" ? "p2" : "p1", dir = side === "p1" ? 1 : -1;
  const a = Math.max(5, Math.min(85, +angle || 45)) * Math.PI / 180, v = Math.max(10, Math.min(100, +power || 50)) * 0.9;
  let x = X[side] + dir * 2, y = h(X[side]) + 7, vx = Math.cos(a) * v * dir, vy = Math.sin(a) * v;
  const ax = (st.wind || 0) * 3, fy = h(X[foe]), cx = X[foe], cy = fy + 4;
  const path = [[x, y]]; let hit = null, dmg = 0, near = 1e9;
  for (let t = 0; t < 7; t += DT) {
    vx += ax * DT; vy -= G * DT; x += vx * DT; y += vy * DT;
    path.push([x, y]);
    near = Math.min(near, Math.hypot(x - cx, y - cy));
    if (Math.abs(x - cx) < REACH && y >= fy && y <= fy + 8.5) { hit = foe; dmg = y >= fy + 6.2 ? 2 : 1; break; }
    if (y <= h(x) || x < -6 || x > W + 6) break;
  }
  const out = []; for (let i = 0; i < path.length; i++) if (i % 2 === 0 || i === path.length - 1) out.push([Math.round(path[i][0] * 10) / 10, Math.round(path[i][1] * 10) / 10]);
  return { path: out, hit, dmg, near };
}

export function applyShot(st, side, angle, power) {
  const r = simulate(st, side, angle, power), hp = { ...st.hp };
  if (r.hit) hp[r.hit] = Math.max(0, hp[r.hit] - r.dmg);
  const foe = side === "p1" ? "p2" : "p1";
  return { ...st, hp, turn: foe, wind: newWind(), seq: (st.seq || 0) + 1,
    last: { by: side, angle: Math.round(angle), power: Math.round(power), path: r.path, hit: r.hit, dmg: r.dmg },
    winner: hp.p1 <= 0 ? "p2" : hp.p2 <= 0 ? "p1" : null };
}

// kompyuter: ko'p urinish orasidan eng yaqinini tanlab, darajaga qarab xato qo'shadi
export function aiShot(st, side, level) {
  let best = null;
  for (let ang = 18; ang <= 72; ang += 3) for (let pw = 30; pw <= 100; pw += 3) {
    const r = simulate(st, side, ang, pw), d = r.hit ? -r.dmg : r.near;
    if (!best || d < best.d) best = { ang, pw, d };
  }
  const s = { oson: 20, orta: 8, qiyin: 4.5 }[level] ?? 3.5;
  const n = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.4;
  return { angle: Math.max(10, Math.min(80, best.ang + n() * s)), power: Math.max(25, Math.min(100, best.pw + n() * s * 1.6)) };
}
