// World War 4 — chizish (canvas). Hamma narsa kod bilan chiziladi, tashqi rasm kerak emas.
import { W, BASE_X, MINE_X, U, BASE_HP } from "./ww4-engine.js";

export const VIEW_W = 500, ASPECT = 0.6;
const INK = "#15171c";
export const ACC = ["#4aa3ff", "#ff6a4d"];
const ACC_D = ["#1f5fb0", "#b03a24"];
const SCALE = { miner: 1.15, soldier: 1.2, archer: 1.17, officer: 1.34, giant: 2.5 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const camLimit = c => clamp(c, VIEW_W / 2 - 30, W - VIEW_W / 2 + 30);

function line(c, x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }

// ---------- orqa fon ----------
function sky(c, w, h, cam) {
  const g = c.createLinearGradient(0, 0, 0, h * 0.8);
  g.addColorStop(0, "#241c45"); g.addColorStop(0.55, "#b8506a"); g.addColorStop(1, "#f29a52");
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  const k = w / VIEW_W, sx = w * 0.62 - cam * 0.03 * k;
  c.fillStyle = "rgba(255,226,150,.25)"; c.beginPath(); c.arc(sx, h * 0.5, h * 0.3, 0, 7); c.fill();
  c.fillStyle = "#ffe9a8"; c.beginPath(); c.arc(sx, h * 0.5, h * 0.21, 0, 7); c.fill();
  // olis qumtepalar
  const dune = (par, base, amp, col, f) => {
    c.fillStyle = col; c.beginPath(); c.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) c.lineTo(x, h * base + Math.sin((x / k + cam * par) * f) * amp * h + Math.sin((x / k + cam * par) * f * 2.3) * amp * h * 0.4);
    c.lineTo(w, h); c.fill();
  };
  dune(0.12, 0.62, 0.05, "#9a4a4a", 0.011);
  dune(0.3, 0.7, 0.04, "#b8664a", 0.016);
}
function ground(c, w, h, cam) {
  const gy = h * 0.8, k = w / VIEW_W;
  const g = c.createLinearGradient(0, gy - 10, 0, h);
  g.addColorStop(0, "#d79a55"); g.addColorStop(1, "#8c5a2e");
  c.fillStyle = g; c.fillRect(0, gy - 6, w, h - gy + 6);
  c.strokeStyle = "rgba(60,30,10,.35)"; c.lineWidth = 1.5; line(c, 0, gy - 6, w, gy - 6);
  // quruq daraxtlar va kaktuslar (dunyoga mahkam)
  c.strokeStyle = "#3a2a1c"; c.lineWidth = 2 * k;
  const first = Math.floor((cam - VIEW_W / 2) / 170) - 1;
  for (let i = first; i < first + 6; i++) {
    const wx = i * 170 + ((i * 53) % 60), x = (wx - (cam - VIEW_W / 2)) * k, y = gy - 4 + ((i * 7) % 4) * k;
    if (i % 3 === 0) { line(c, x, y, x, y - 26 * k); line(c, x, y - 14 * k, x + 8 * k, y - 24 * k); line(c, x, y - 18 * k, x - 7 * k, y - 28 * k); }
    else if (i % 3 === 1) { c.strokeStyle = "#2f5a38"; line(c, x, y, x, y - 18 * k); line(c, x, y - 10 * k, x + 6 * k, y - 14 * k); line(c, x + 6 * k, y - 14 * k, x + 6 * k, y - 19 * k); c.strokeStyle = "#3a2a1c"; }
  }
}

// ---------- baza va oltin koni ----------
function baseArt(c, k, gy, x, team, hp) {
  const s = k; c.save(); c.translate(x, gy);
  c.fillStyle = "#7a6a5a"; c.fillRect(-26 * s, -14 * s, 52 * s, 14 * s);
  c.fillStyle = "#8f7e6c"; c.fillRect(-18 * s, -64 * s, 36 * s, 50 * s);
  c.fillStyle = "#a89684"; c.fillRect(-14 * s, -64 * s, 28 * s, 8 * s);
  c.fillStyle = ACC[team]; c.beginPath();
  const dir = team ? -1 : 1;
  c.moveTo(0, -64 * s); c.lineTo(0, -92 * s); c.lineTo(dir * 26 * s, -84 * s); c.lineTo(0, -76 * s); c.fill();
  c.strokeStyle = INK; c.lineWidth = 2 * s; line(c, 0, -64 * s, 0, -94 * s);
  c.restore();
  const bw = 70 * s, by = gy - 106 * s, f = clamp(hp / BASE_HP, 0, 1);
  c.fillStyle = "rgba(0,0,0,.5)"; c.fillRect(x - bw / 2, by, bw, 7 * s);
  c.fillStyle = f > 0.5 ? "#3fd07a" : f > 0.25 ? "#f2b632" : "#e5484d"; c.fillRect(x - bw / 2 + 1, by + 1, (bw - 2) * f, 5 * s);
}
function mineArt(c, k, gy, x) {
  c.save(); c.translate(x, gy); c.fillStyle = "#6e5a48";
  c.beginPath(); c.moveTo(-18 * k, 0); c.lineTo(-10 * k, -16 * k); c.lineTo(4 * k, -22 * k); c.lineTo(16 * k, -10 * k); c.lineTo(22 * k, 0); c.fill();
  c.fillStyle = "#ffd23f";
  for (const [dx, dy, r] of [[-6, -8, 3], [4, -14, 3.5], [11, -5, 2.6], [-1, -3, 2.4]]) { c.beginPath(); c.arc(dx * k, dy * k, r * k, 0, 7); c.fill(); }
  c.restore();
}

// ---------- jangchilar ----------
function drawMan(c, u, view, k, sx, gy) {
  const t = u.type, d = U[t], dir = u.team ? -1 : 1, sc = SCALE[t] * k;
  const ph = u.x * 0.11 + u.id, walk = u.mv ? Math.sin(ph) : 0;
  const acc = ACC[u.team], accD = ACC_D[u.team];
  const sw = u.atk ? Math.sin(view.t * 32) : 0;
  c.save(); c.translate(sx, gy - (u.id % 5) * 1.2 * k + 3 * k); c.scale(dir * sc, sc);
  c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = INK; c.fillStyle = INK;
  c.lineWidth = t === "giant" ? 2.6 : 2.1;
  // soya
  c.fillStyle = "rgba(0,0,0,.22)"; c.beginPath(); c.ellipse(0, 0.5, 8, 2, 0, 0, 7); c.fill(); c.fillStyle = INK;
  // oyoqlar, tana
  const hipY = -13, lg = walk * 8;
  line(c, 0, hipY, lg, 0); line(c, 0, hipY, -lg, 0);
  line(c, 0, hipY, 0, -24);
  // bosh
  c.beginPath(); c.arc(0, -28.5, 4.4, 0, 7); c.fill();
  // belgi: jamoa bog'ichi
  c.strokeStyle = acc; c.lineWidth = 1.8; c.beginPath(); c.arc(0, -28.5, 4.8, Math.PI * 1.15, Math.PI * 1.9); c.stroke();
  c.strokeStyle = INK; c.lineWidth = t === "giant" ? 2.6 : 2.1;
  const shY = -22;
  if (t === "miner") {
    const a = u.mining ? -0.9 + (sw + 1) * 0.55 : -0.5;
    const hx = 8, hy = -18;
    line(c, 0, shY, hx, hy); line(c, 0, shY, -3, -16);
    const ex = hx + Math.cos(a) * 12, ey = hy + Math.sin(a) * 12;
    c.strokeStyle = "#6b4a2a"; line(c, hx, hy, ex, ey);
    c.strokeStyle = "#b9c2cc"; line(c, ex - Math.sin(a) * 5, ey + Math.cos(a) * 5, ex + Math.sin(a) * 5, ey - Math.cos(a) * 5);
    if (u.carry) { c.fillStyle = "#ffd23f"; c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.arc(-6, -21, 4, 0, 7); c.fill(); c.stroke(); }
  } else if (t === "soldier") {
    const ang = u.atk ? -0.6 + (sw + 1) * 0.9 : -0.35;
    line(c, 0, shY, 8, -19); line(c, 0, shY, -4, -17);
    const ex = 8 + Math.cos(ang) * 15, ey = -19 + Math.sin(ang) * 15;
    c.strokeStyle = "#cfd6de"; c.lineWidth = 2; line(c, 8, -19, ex, ey);
    c.strokeStyle = acc; line(c, 6, -19, 10, -19);
    // dubulg'a
    c.fillStyle = INK; c.beginPath(); c.arc(0, -29.5, 4.8, Math.PI, 0); c.fill();
  } else if (t === "archer") {
    const pull = u.atk ? 1 - Math.abs(sw) * 0.5 : 0;
    c.strokeStyle = "#6b4a2a"; c.lineWidth = 1.8; c.beginPath(); c.arc(9, -21, 10, -1.25, 1.25); c.stroke();
    c.strokeStyle = "#e7e0d0"; c.lineWidth = 0.9;
    const bx = 9 + Math.cos(1.25) * 10, by1 = -21 - Math.sin(1.25) * 10 * 1, by2 = -21 + Math.sin(1.25) * 10;
    c.beginPath(); c.moveTo(bx, by1); c.lineTo(bx - pull * 7, -21); c.lineTo(bx, by2); c.stroke();
    c.strokeStyle = INK; c.lineWidth = 2.1; line(c, 0, shY, 13, -21); line(c, 0, shY, 2 - pull * 5, -21);
    if (pull) { c.strokeStyle = "#cfd6de"; c.lineWidth = 1.2; line(c, bx - pull * 7, -21, bx + 8, -21); }
    c.fillStyle = acc; c.beginPath(); c.arc(0, -33.2, 1.8, 0, 7); c.fill();
  } else if (t === "officer") {
    // qalqon, nayza, shlem patlari
    const ang = u.atk ? -0.5 + (sw + 1) * 0.8 : -0.2;
    c.strokeStyle = INK; line(c, 0, shY, 9, -19); line(c, 0, shY, -3, -17);
    const ex = 9 + Math.cos(ang) * 19, ey = -19 + Math.sin(ang) * 19;
    c.strokeStyle = "#cfd6de"; c.lineWidth = 2; line(c, 9, -19, ex, ey);
    c.fillStyle = acc; c.strokeStyle = INK; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(7, -29); c.lineTo(15, -27); c.lineTo(15, -16); c.lineTo(11, -9); c.lineTo(7, -16); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = INK; c.beginPath(); c.arc(0, -29.5, 5, Math.PI, 0); c.fill();
    c.fillStyle = acc; c.beginPath(); c.moveTo(-2, -34.5); c.lineTo(2, -34.5); c.lineTo(0.5, -41); c.lineTo(-3, -38); c.closePath(); c.fill();
    c.strokeStyle = "rgba(255,230,140,.0)";
  } else if (t === "giant") {
    c.lineWidth = 3.2; line(c, 0, hipY, lg, 0); line(c, 0, hipY, -lg, 0); line(c, 0, hipY, 0, -24);
    const ang = u.atk ? -1.3 + (sw + 1) * 1.15 : -0.55;
    c.lineWidth = 2.8; line(c, 0, shY, 9, -18); line(c, 0, shY, -4, -17);
    const ex = 9 + Math.cos(ang) * 17, ey = -18 + Math.sin(ang) * 17;
    c.strokeStyle = "#6b4a2a"; c.lineWidth = 3.4; line(c, 9, -18, ex, ey);
    c.strokeStyle = "#8a8f98"; c.lineWidth = 5.2; line(c, ex, ey, ex + Math.cos(ang) * 5, ey + Math.sin(ang) * 5);
    c.fillStyle = INK; c.beginPath(); c.arc(0, -29.5, 5.2, Math.PI, 0); c.fill();
    c.strokeStyle = acc; c.lineWidth = 2; line(c, -4, -33, -7, -37); line(c, 4, -33, 7, -37);
  }
  c.restore();
  // jon chizig'i (zarar ko'rgan bo'lsa)
  const mh = d.hp;
  if (u.hp < mh - 0.5) {
    const bw = Math.max(20, 20 * SCALE[t]) * k * 0.62, bh = 3 * k, bx = sx - bw / 2, by = gy - 44 * k * SCALE[t] - 4 * k;
    c.fillStyle = "rgba(0,0,0,.55)"; c.fillRect(bx, by, bw, bh);
    const f = clamp(u.hp / mh, 0, 1);
    c.fillStyle = f > 0.5 ? "#3fd07a" : f > 0.25 ? "#f2b632" : "#e5484d"; c.fillRect(bx, by, bw * f, bh);
  }
}

function drawFx(c, view, k, left, gy) {
  for (const f of view.fx) {
    const age = view.t - f.t0; if (age < 0 || age > 0.6) continue;
    if (f.k === "a") {
      const dur = 0.28; if (age > dur) continue;
      const p = age / dur, x = f.x2 + (f.x - f.x2) * p, y = -22 - Math.sin(p * Math.PI) * 22 * Math.min(1, Math.abs(f.x - f.x2) / 160);
      const sx = (x - left) * k, sy = gy + y * k, dir = Math.sign(f.x - f.x2) || 1;
      c.strokeStyle = "#f5efe0"; c.lineWidth = 1.5 * k; line(c, sx, sy, sx - dir * 9 * k, sy + (p < 0.5 ? 1 : -1) * 1.5 * k);
    } else if (f.k === "h") {
      if (age > 0.18) continue; const sx = (f.x - left) * k, sy = gy - 20 * k, r = (4 + age * 60) * k;
      c.strokeStyle = `rgba(255,${200 - age * 400 | 0},80,${1 - age / 0.18})`; c.lineWidth = 1.6 * k;
      for (let i = 0; i < 5; i++) { const a = i * 1.26 + 0.4; line(c, sx + Math.cos(a) * r * 0.4, sy + Math.sin(a) * r * 0.4, sx + Math.cos(a) * r, sy + Math.sin(a) * r); }
    } else if (f.k === "d") {
      if (age > 0.6) continue; const sx = (f.x - left) * k, p = age / 0.6, big = f.ty === 4 ? 2.2 : 1;
      c.fillStyle = `rgba(90,70,50,${0.5 * (1 - p)})`;
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(sx + i * 7 * k * big, gy - (4 + p * 14) * k * big, (3 + p * 6) * k * big, 0, 7); c.fill(); }
    }
  }
}

// ---------- asosiy sahna ----------
export function drawScene(c, w, h, view, cam, my) {
  const k = w / VIEW_W, left = cam - VIEW_W / 2, gy = h * 0.8;
  c.clearRect(0, 0, w, h);
  sky(c, w, h, cam); ground(c, w, h, cam);
  for (let t = 0; t < 2; t++) {
    mineArt(c, k, gy, (MINE_X[t] - left) * k + (t ? 30 * k : -30 * k));
    baseArt(c, k, gy, (BASE_X[t] - left) * k, t, view.base[t]);
  }
  // o'z chizig'i bayrog'i (faqat o'zim uchun)
  if (view.stance[my] === "hold") {
    const fx = (view.flag[my] - left) * k;
    c.strokeStyle = INK; c.lineWidth = 2 * k; line(c, fx, gy, fx, gy - 46 * k);
    c.fillStyle = ACC[my]; c.beginPath(); c.moveTo(fx, gy - 46 * k); c.lineTo(fx + (my ? -18 : 18) * k, gy - 40 * k); c.lineTo(fx, gy - 33 * k); c.fill();
    c.strokeStyle = "rgba(255,255,255,.28)"; c.setLineDash([4 * k, 5 * k]); line(c, fx, gy - 4 * k, fx, 0); c.setLineDash([]);
  }
  const us = view.units.slice().sort((a, b) => (a.id % 5) - (b.id % 5));
  for (const u of us) {
    const sx = (u.x - left) * k; if (sx < -50 * k || sx > w + 50 * k) continue;
    drawMan(c, u, view, k, sx, gy);
  }
  drawFx(c, view, k, left, gy);
  // ofitser ruhlantirish halqasi (yengil)
  // g'alaba / mag'lubiyat tuman
  if (view.win) { c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(0, 0, w, h); }
}

// ---------- kichik xarita ----------
export function drawMini(c, w, h, view, cam, my) {
  c.clearRect(0, 0, w, h);
  c.fillStyle = "rgba(20,22,30,.85)"; c.fillRect(0, 0, w, h);
  const kx = w / W, y0 = h * 0.62;
  c.fillStyle = "#6a5236"; c.fillRect(0, y0 + 4, w, h - y0 - 4);
  for (let t = 0; t < 2; t++) { c.fillStyle = ACC[t]; c.fillRect(BASE_X[t] * kx - 4, y0 - 12, 8, 16); }
  if (view.stance[my] === "hold") { c.fillStyle = "#fff"; c.fillRect(view.flag[my] * kx - 1, 2, 2, h - 4); }
  for (const u of view.units) {
    const r = u.type === "giant" ? 3.4 : u.type === "miner" ? 1.4 : 2.1;
    c.fillStyle = ACC[u.team]; c.beginPath(); c.arc(u.x * kx, y0 - (u.id % 4) * 2.6, r, 0, 7); c.fill();
  }
  c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = 1.5;
  c.strokeRect((cam - VIEW_W / 2) * kx, 1, VIEW_W * kx, h - 2);
}
