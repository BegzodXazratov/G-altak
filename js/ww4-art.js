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
let skyC = null, skyKey = '';
function sky(c, w, h, cam) {
  // fon (osmon + qumtepalar) har kadrda qayta chizilmaydi: kamera 3 birlik siljiganda yangilanadi
  const key = w + 'x' + h + ':' + Math.round(cam / 3);
  if (!skyC || skyKey !== key) {
    if (!skyC) skyC = document.createElement('canvas');
    if (skyC.width !== w || skyC.height !== h) { skyC.width = w; skyC.height = h; }
    skyC.getContext('2d').clearRect(0, 0, w, h); sky0(skyC.getContext('2d'), w, h, cam); skyKey = key;
  }
  c.drawImage(skyC, 0, 0);
}
function sky0(c, w, h, cam) {
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

// ---------- qurol rasmlari (PNG) ----------
const IMGS = {};
for (const n of ["sword", "bow", "arrow", "spear", "helmet", "pick"]) {
  const im = new Image(); im.src = new URL("../img/ww4/" + n + ".png", import.meta.url).href; IMGS[n] = im;
}
const ok = im => im && im.complete && im.naturalWidth > 0;
// len — rasmning uzunligi (dunyo birligida), pf — ushlash joyi (0..1), ang — burchak (soat mili bo'yicha, radian)
function wpn(c, name, px, py, len, ang, pf) {
  const im = IMGS[name]; if (!ok(im)) return;
  const h = len * im.naturalHeight / im.naturalWidth;
  c.save(); c.translate(px, py); c.rotate(ang); c.drawImage(im, -pf * len, -h / 2, len, h); c.restore();
}
function helmet(c, x, y, h, acc) {
  const im = IMGS.helmet; if (!ok(im)) return;
  const w = h * im.naturalWidth / im.naturalHeight;
  c.drawImage(im, x - w * 0.5, y - h, w, h);
  c.strokeStyle = acc; c.lineWidth = 1.8; c.lineCap = "round";
  c.beginPath(); c.moveTo(-1.5, -23); c.lineTo(-8, -20.5); c.stroke(); // jamoa belgisi: bo'yinbog'
}

// ---------- jangchilar ----------
function drawMan(c, u, view, k, sx, gy) {
  const t = u.type, d = U[t], dir = u.team ? -1 : 1, lane = (u.id * 7) % 6, sc = SCALE[t] * k * (0.93 + lane * 0.025);
  const ph = u.x * 0.11 + u.id, walk = u.mv ? Math.sin(ph) : 0;
  const acc = ACC[u.team];
  // hujum fazasi: s = 0 -> -1 (qurol ko'tarish) -> +1 (zarba) -> 0 (qaytish); va = harakat turi
  const per = { miner: 1.2, soldier: 0.85, archer: 1.3, officer: 1.0, giant: 1.5 }[t];
  let s = 0, va = 0, ph2 = 0;
  if (u.atk) {
    const q = view.t / per + u.id * 0.37; ph2 = q - Math.floor(q); va = (Math.floor(q) + u.id) % 3;
    const e = x => x * x * (3 - 2 * x);
    s = ph2 < 0.45 ? -e(ph2 / 0.45) : ph2 < 0.58 ? -1 + 2 * ((ph2 - 0.45) / 0.13) : 1 - e((ph2 - 0.58) / 0.42);
  }
  const melee = t !== "archer", lunge = melee ? Math.max(0, s) * (t === "giant" ? 4 : 3.2) - Math.max(0, -s) * 1.2 : -Math.max(0, s) * 1.5;
  c.save(); c.translate(sx, gy + (lane * 4.6 - 9) * k); c.scale(dir * sc, sc);
  c.translate(lunge, 0); c.rotate(s * (t === "giant" ? 0.16 : 0.1) * (va === 1 ? 0.4 : 1));
  c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = INK; c.fillStyle = INK;
  c.lineWidth = t === "giant" ? 2.6 : 2.1;
  c.fillStyle = "rgba(0,0,0,.22)"; c.beginPath(); c.ellipse(0, 0.5, 8, 2, 0, 0, 7); c.fill(); c.fillStyle = INK;
  const hipY = -13, lg = walk * 8;
  line(c, 0, hipY, lg, 0); line(c, 0, hipY, -lg, 0);
  line(c, 0, hipY, 0, -24);
  const helmed = t === "soldier" || t === "officer" || t === "giant";
  if (!helmed) {
    c.beginPath(); c.arc(0, -28.5, 4.4, 0, 7); c.fill();
    c.strokeStyle = acc; c.lineWidth = 1.8; c.beginPath(); c.arc(0, -28.5, 4.8, Math.PI * 1.15, Math.PI * 1.9); c.stroke();
    c.strokeStyle = INK; c.lineWidth = 2.1;
  } else { c.beginPath(); c.arc(0, -28.5, 3.9, 0, 7); c.fill(); }
  const shY = -22;
  if (t === "miner") {
    const a = u.mining ? -0.9 + s * 1.5 : -0.7, hy = -18 - (u.mining ? Math.max(0, -s) * 4 : 0);
    line(c, 0, shY, 8, hy); line(c, 0, shY, -3, -16);
    wpn(c, "pick", 8, hy, 18, a, 0.16);
    if (u.carry) { c.fillStyle = "#ffd23f"; c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.arc(-6, -21, 4, 0, 7); c.fill(); c.stroke(); }
  } else if (t === "soldier") {
    let a = -0.85, hx = 8, hy = -19;
    if (u.atk) {
      if (va === 0) a = -0.9 + s * 1.5;                       // tepadan chopish
      else if (va === 1) { a = -0.2 + s * 0.8; hy = -17 + s * 2; } // yon tomondan kesish
      else { a = -0.12 - Math.max(0, -s) * 0.5; hx = 8 + s * 6; hy = -18; } // sanchish
    }
    line(c, 0, shY, hx, hy); line(c, 0, shY, -4 - s * 2, -17);
    wpn(c, "sword", hx, hy, 25, a, 0.16);
    helmet(c, 1.5, -24.5, 15, acc);
  } else if (t === "archer") {
    const pull = u.atk ? (ph2 < 0.6 ? Math.min(1, ph2 / 0.5) : 0) : 0;
    line(c, 0, shY, 11, -21); line(c, 0, shY, 3 - pull * 3, -21);
    const im = IMGS.bow;
    if (ok(im)) { const H = 27, w = H * im.naturalWidth / im.naturalHeight; c.drawImage(im, 9.5, -21 - H / 2, w, H); }
    if (pull) wpn(c, "arrow", 3 - pull * 3, -21, 15, 0, 0);
  } else if (t === "officer") {
    let hx = 9, hy = -19, a = -0.4;
    if (u.atk) {
      if (va === 0) { hx = 9 + s * 6; a = -0.1; }                    // sanchish
      else if (va === 1) { a = -0.55 + s * 1.0; hy = -21 + s * 2; }  // tepadan sanchish
      else { a = -0.2 + s * 0.7; hx = 9 + s * 2; hy = -17; }         // supurish
    }
    line(c, 0, shY, hx, hy); line(c, 0, shY, -3, -17);
    wpn(c, "spear", hx, hy, 46, a, 0.34);
    c.fillStyle = acc; c.strokeStyle = INK; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(5, -27); c.lineTo(13, -25); c.lineTo(13, -15); c.lineTo(9, -8); c.lineTo(5, -15); c.closePath(); c.fill(); c.stroke();
    helmet(c, 1.5, -24.5, 17.5, acc);
  } else if (t === "giant") {
    c.lineWidth = 3.2; line(c, 0, hipY, lg, 0); line(c, 0, hipY, -lg, 0); line(c, 0, hipY, 0, -24);
    let a = -0.8, hy = -18;
    if (u.atk) { a = va === 1 ? -0.3 + s * 1.0 : -1.0 + s * 1.9; hy = -18 - Math.max(0, -s) * (va === 1 ? 0 : 3); }
    c.lineWidth = 2.8; line(c, 0, shY, 9, hy); line(c, 0, shY, -4, -17);
    wpn(c, "sword", 9, hy, 34, a, 0.16);
    helmet(c, 1.5, -24.5, 16, acc);
  }
  c.restore();
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
      const arc = Math.min(1, Math.abs(f.x - f.x2) / 160), pos = p => ({ x: f.x2 + (f.x - f.x2) * p, y: -22 - Math.sin(p * Math.PI) * 22 * arc });
      const p = age / dur, a = pos(p), b = pos(Math.min(1, p + 0.04)), dir = Math.sign(f.x - f.x2) || 1;
      const sx = (a.x - left) * k, sy = gy + a.y * k;
      const ang = Math.atan2((b.y - a.y), (b.x - a.x) || dir * 0.001);
      if (ok(IMGS.arrow)) { c.save(); c.translate(sx, sy); c.rotate(ang + (dir < 0 ? 0 : 0)); const L = 17 * k, H = L * IMGS.arrow.naturalHeight / IMGS.arrow.naturalWidth; c.drawImage(IMGS.arrow, -L / 2, -H / 2, L, H); c.restore(); }
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
  const us = view.units.slice().sort((a, b) => ((a.id * 7) % 6) - ((b.id * 7) % 6));
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
