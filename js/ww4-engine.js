// World War 4 — real vaqtli strategiya dvigateli. Sof JS: DOM yo'q, serverda ham, brauzerda ham ishlaydi.
// Dunyo — bitta chiziq (chapdan o'ngga). 0-jamoa chapda, 1-jamoa o'ngda turadi.

export const W = 2000;
export const BASE_X = [130, 1870];
export const MINE_X = [410, 1590];
export const DT = 0.05;
export const POP_MAX = 50, MINER_MAX = 12, QUEUE_MAX = 8, BASE_HP = 6000, TIME_LIMIT = 900;
export const ROW_GAP = 55;

export const TYPES = ["miner", "soldier", "archer", "officer", "giant"];
export const ARMY = ["soldier", "archer", "officer", "giant"];
export const TI = Object.fromEntries(TYPES.map((t, i) => [t, i]));

// narx, qo'shin o'rni (pop), tayyorlanish vaqti, jon, zarba, masofa, zarba oralig'i, tezlik,
// rd — masofadan (kamon) kelgan zarbani qancha o'tkazishi, slots — bitta nishonga bir vaqtda necha jangchi urishi mumkin
export const U = {
  miner:   { name: "Konchi",   ic: "⛏", cost: 100, pop: 0, train: 3.5, hp: 70,   dmg: 4,  range: 14,  cd: 1.2,  spd: 70, rd: 1,    slots: 2 },
  soldier: { name: "Askar",    ic: "🗡", cost: 125, pop: 1, train: 3,   hp: 110,  dmg: 13, range: 16,  cd: 0.85, spd: 66, rd: 1,    slots: 3 },
  archer:  { name: "Kamonchi", ic: "🏹", cost: 250, pop: 1, train: 4.5, hp: 65,   dmg: 18, range: 190, cd: 1.3,  spd: 58, rd: 1,    slots: 2 },
  officer: { name: "Zobit",    ic: "🛡", cost: 450, pop: 3, train: 7,   hp: 380,  dmg: 24, range: 18,  cd: 1.0,  spd: 52, rd: 0.5,  md: 0.75, slots: 4 },
  giant:   { name: "Dev",      ic: "🪓", cost: 900, pop: 5, train: 12,  hp: 800,  dmg: 60, range: 30,  cd: 1.5,  spd: 36, rd: 0.75, slots: 5, splash: 48, splashN: 3 },
};
const AURA = 130, AURA_MUL = 1.2, AGGRO = 110, MINER_FLEE = 150;
export const START_GOLD = 350;
export const FLAG_MIN = 300, FLAG_MAX = 1700;
const DEF_FLAG = [640, 1360];
const DEF_ROWS = { soldier: 0, archer: 2, officer: 0, giant: 0 };

export const popOf = (S, team) => {
  let n = 0;
  for (const u of S.units) if (u.team === team) n += U[u.type].pop;
  for (const q of S.queue[team]) n += U[q.type].pop;
  return n;
};
export const countOf = (S, team, type) => {
  let n = 0;
  for (const u of S.units) if (u.team === team && u.type === type) n++;
  for (const q of S.queue[team]) if (q.type === type) n++;
  return n;
};

export function newGame() {
  const S = {
    t: 0, tick: 0, nid: 1, win: null,
    gold: [START_GOLD, START_GOLD], base: [BASE_HP, BASE_HP], units: [], queue: [[], []],
    stance: ["hold", "hold"], flag: [...DEF_FLAG], rows: [{ ...DEF_ROWS }, { ...DEF_ROWS }], fx: [],
  };
  for (let t = 0; t < 2; t++) for (let i = 0; i < 2; i++) spawn(S, t, "miner");
  return S;
}

function spawn(S, team, type) {
  const dir = team ? -1 : 1;
  const u = { id: S.nid++, type, team, x: BASE_X[team] + dir * 34, hp: U[type].hp, cd: 0.3, atk: 0, mv: false, carry: 0, ph: "toMine", mt: 0, tg: 0 };
  S.units.push(u);
  return u;
}

// ---------------- buyruqlar ----------------
export function command(S, team, c) {
  if (S.win || !c) return { ok: false, why: "end" };
  switch (c.t) {
    case "buy": {
      const d = U[c.u]; if (!d) return { ok: false, why: "bad" };
      const q = S.queue[team];
      if (q.length >= QUEUE_MAX) return { ok: false, why: "queue" };
      if (S.gold[team] < d.cost) return { ok: false, why: "gold" };
      if (c.u === "miner" ? countOf(S, team, "miner") >= MINER_MAX : popOf(S, team) + d.pop > POP_MAX) return { ok: false, why: "pop" };
      S.gold[team] -= d.cost;
      q.push({ type: c.u, left: d.train });
      return { ok: true };
    }
    case "cancel": {
      const q = S.queue[team], i = Number(c.i);
      if (!Number.isInteger(i) || i < 0 || i >= q.length) return { ok: false, why: "bad" };
      S.gold[team] += U[q[i].type].cost;
      q.splice(i, 1);
      return { ok: true };
    }
    case "stance":
      if (!["attack", "hold", "defend"].includes(c.s)) return { ok: false, why: "bad" };
      S.stance[team] = c.s; return { ok: true };
    case "flag": {
      const x = Number(c.x); if (!(x >= 0 && x <= W)) return { ok: false, why: "bad" };
      S.flag[team] = Math.max(FLAG_MIN, Math.min(FLAG_MAX, Math.round(x))); return { ok: true };
    }
    case "row": {
      const r = Number(c.r); if (!ARMY.includes(c.u) || ![0, 1, 2].includes(r)) return { ok: false, why: "bad" };
      S.rows[team][c.u] = r; return { ok: true };
    }
    case "rows": { // tayyor tartib
      for (const k of ARMY) if ([0, 1, 2].includes(Number(c.r?.[k]))) S.rows[team][k] = Number(c.r[k]);
      return { ok: true };
    }
  }
  return { ok: false, why: "bad" };
}

// ---------------- bir qadam ----------------
export function step(S, dt = DT) {
  if (S.win) return;
  S.t += dt; S.tick++;
  // tayyorlash navbati
  for (let t = 0; t < 2; t++) {
    const q = S.queue[t];
    if (q.length) { q[0].left -= dt; if (q[0].left <= 0) { spawn(S, t, q[0].type); q.shift(); } }
  }
  const alive = S.units;
  const byTeam = [[], []];
  for (const u of alive) byTeam[u.team].push(u);
  // jamoa chizig'i: eng oldingi jangchi va safdagi joy
  const plan = [0, 1].map(t => formation(S, t, byTeam[t]));
  // ofitser ruhlantirishi
  const officers = [byTeam[0].filter(u => u.type === "officer"), byTeam[1].filter(u => u.type === "officer")];
  const att = new Map();
  for (const u of alive) {
    u.atk = Math.max(0, u.atk - dt); u.cd = Math.max(0, u.cd - dt); u.mv = false;
    if (u.hp <= 0) continue;
    if (u.type === "miner") mine(S, u, byTeam[1 - u.team], dt);
    else fight(S, u, byTeam[1 - u.team], plan[u.team], officers[u.team], att, dt);
  }
  // o'lganlarni olib tashlash
  for (let i = alive.length - 1; i >= 0; i--) if (alive[i].hp <= 0) { S.fx.push({ k: "d", x: alive[i].x, ty: TI[alive[i].type], tm: alive[i].team, t0: S.t }); alive.splice(i, 1); }
  S.fx = S.fx.filter(f => S.t - f.t0 < 0.7).slice(-40);
  if (S.base[0] <= 0 || S.base[1] <= 0) S.win = S.base[0] <= 0 && S.base[1] <= 0 ? "draw" : S.base[0] <= 0 ? "p2" : "p1";
  else if (S.t >= TIME_LIMIT) S.win = S.base[0] === S.base[1] ? "draw" : S.base[0] > S.base[1] ? "p1" : "p2";
}

function formation(S, team, units) {
  const dir = team ? -1 : 1, army = units.filter(u => u.type !== "miner");
  const target = S.stance[team] === "attack" ? BASE_X[1 - team] - dir * 40 : S.stance[team] === "hold" ? S.flag[team] : BASE_X[team] + dir * 210;
  if (!army.length) return { dir, target, rowMin: 0, fx: BASE_X[team], has: false };
  const rows = S.rows[team];
  let rowMin = 9;
  for (const u of army) rowMin = Math.min(rowMin, rows[u.type]);
  let fx = -1e9;
  for (const u of army) if (rows[u.type] === rowMin) fx = Math.max(fx, dir * u.x);
  return { dir, target, rowMin, fx: dir * fx, has: true };
}

function dmgOf(u, officers) {
  let d = U[u.type].dmg;
  for (const o of officers) if (o !== u && Math.abs(o.x - u.x) <= AURA) { d *= AURA_MUL; break; }
  return d;
}

function hit(S, from, to, officers, ranged) {
  const dm = dmgOf(from, officers) * (ranged ? U[to.type].rd : (U[to.type].md || 1));
  to.hp -= dm;
  S.fx.push({ k: ranged ? "a" : "h", x: to.x, x2: from.x, tm: from.team, t0: S.t });
}

function fight(S, u, foes, pl, officers, att, dt) {
  const d = U[u.type], dir = pl.dir, ranged = d.range > 60;
  // nishon tanlash
  let best = null, bd = 1e9;
  const reach = ranged ? d.range : AGGRO;
  for (const e of foes) {
    if (e.hp <= 0) continue;
    const dist = Math.abs(e.x - u.x) + (e.type === "miner" ? 40 : 0);
    if (dist >= reach || dist >= bd) continue;
    if (!ranged) { const a = att.get(e.id) || 0; if (a >= U[e.type].slots) continue; }
    best = e; bd = dist;
  }
  if (best) {
    att.set(best.id, (att.get(best.id) || 0) + 1);
    const dx = best.x - u.x, dist = Math.abs(dx);
    if (dist <= d.range) {
      if (u.cd <= 0) {
        hit(S, u, best, officers, ranged); u.cd = d.cd; u.atk = 0.28;
        if (d.splash) {
          let n = 0;
          for (const e of foes) if (e !== best && e.hp > 0 && Math.abs(e.x - best.x) <= d.splash && n++ < d.splashN) e.hp -= dmgOf(u, officers) * 0.5 * (U[e.type].md || 1);
        }
      }
    } else if (!ranged) { u.x += Math.sign(dx) * Math.min(dist - d.range + 1, d.spd * dt); u.mv = true; }
    return;
  }
  // dushman bazasi
  const bx = BASE_X[1 - u.team];
  if (Math.abs(bx - u.x) <= d.range + 26) {
    const alt = att.get("b" + u.team) || 0;
    if (ranged || alt < 14) {
      if (!ranged) att.set("b" + u.team, alt + 1);
      if (u.cd <= 0) {
        S.base[1 - u.team] -= dmgOf(u, officers) * (u.type === "giant" ? 1.6 : 1);
        S.fx.push({ k: ranged ? "a" : "h", x: bx, x2: u.x, tm: u.team, t0: S.t }); u.cd = d.cd; u.atk = 0.28;
      }
      return;
    }
  }
  // safga qarab yurish
  const row = S.rows[u.team][u.type];
  const jit = ((u.id * 37) % 23) - 11;
  let want;
  if (!pl.has || row === pl.rowMin) want = pl.target + jit;
  else {
    const anchor = pl.dir > 0 ? Math.min(pl.fx, pl.target) : Math.max(pl.fx, pl.target);
    want = anchor - pl.dir * (row - pl.rowMin) * ROW_GAP + jit;
    if (pl.dir * want > pl.dir * pl.target) want = pl.target + jit;
  }
  const dx = want - u.x;
  if (Math.abs(dx) > 4) { u.x += Math.sign(dx) * Math.min(Math.abs(dx), d.spd * dt); u.mv = true; }
}

function mine(S, u, foes, dt) {
  const d = U.miner, team = u.team, dir = team ? -1 : 1, home = BASE_X[team] + dir * 28;
  let danger = false;
  for (const e of foes) if (e.type !== "miner" && e.hp > 0 && Math.abs(e.x - u.x) < MINER_FLEE) { danger = true; break; }
  if (danger) u.ph = "flee";
  else if (u.ph === "flee") { u.ph = u.carry ? "toBase" : "toMine"; }
  const goTo = x => { const dx = x - u.x; if (Math.abs(dx) <= 3) return true; u.x += Math.sign(dx) * Math.min(Math.abs(dx), d.spd * dt); u.mv = true; return false; };
  const spot = MINE_X[team] + (((u.id * 29) % 31) - 15);
  if (u.ph === "flee") goTo(home);
  else if (u.ph === "toMine") { if (goTo(spot)) { u.ph = "mining"; u.mt = 1.5; } }
  else if (u.ph === "mining") { u.mt -= dt; u.atk = 0.1; if (u.mt <= 0) { u.carry = 20; u.ph = "toBase"; } }
  else if (u.ph === "toBase") { if (goTo(home)) { S.gold[team] += u.carry; u.carry = 0; u.ph = "toMine"; } }
}

// ---------------- snapshot (tarmoq uchun ixcham ko'rinish) ----------------
export function snapshot(S) {
  return {
    t: +S.t.toFixed(2),
    g: [Math.floor(S.gold[0]), Math.floor(S.gold[1])],
    b: [Math.max(0, Math.ceil(S.base[0])), Math.max(0, Math.ceil(S.base[1]))],
    u: S.units.map(u => [u.id, TI[u.type], u.team, Math.round(u.x * 10) / 10, Math.max(1, Math.ceil(u.hp)), (u.atk > 0 ? 1 : 0) | (u.mv ? 2 : 0) | (u.ph === "mining" ? 4 : 0) | (u.carry ? 8 : 0)]),
    q: S.queue.map(q => q.map(i => [TI[i.type], +i.left.toFixed(1)])),
    st: S.stance.slice(), fl: S.flag.slice(),
    rw: S.rows.map(r => ARMY.map(k => r[k])),
    pop: [popOf(S, 0), popOf(S, 1)],
    mc: [countOf(S, 0, "miner"), countOf(S, 1, "miner")],
    w: S.win,
    fx: S.fx.map(f => [f.k, Math.round(f.x), Math.round(f.x2 ?? f.x), f.tm ?? 0, f.ty ?? 0, +f.t0.toFixed(2)]),
  };
}

// snapshot'ni chizish uchun "ko'rinish"ga aylantirish (xost ham, mehmon ham bir xil kod bilan chizadi)
export function viewFromSnap(s) {
  return {
    t: s.t, gold: s.g, base: s.b, win: s.w, stance: s.st, flag: s.fl, pop: s.pop, mc: s.mc,
    rows: s.rw.map(r => Object.fromEntries(ARMY.map((k, i) => [k, r[i]]))),
    queue: s.q.map(q => q.map(([ty, left]) => ({ type: TYPES[ty], left }))),
    units: s.u.map(([id, ty, team, x, hp, fl]) => ({ id, type: TYPES[ty], team, x, hp, atk: fl & 1, mv: !!(fl & 2), mining: !!(fl & 4), carry: !!(fl & 8) })),
    fx: s.fx.map(([k, x, x2, tm, ty, t0]) => ({ k, x, x2, tm, ty, t0 })),
  };
}
export function viewFromState(S) {
  return {
    t: S.t, gold: [Math.floor(S.gold[0]), Math.floor(S.gold[1])], base: S.base.map(b => Math.max(0, Math.ceil(b))), win: S.win,
    stance: S.stance, flag: S.flag, pop: [popOf(S, 0), popOf(S, 1)], mc: [countOf(S, 0, "miner"), countOf(S, 1, "miner")],
    rows: S.rows, queue: S.queue,
    units: S.units.map(u => ({ id: u.id, type: u.type, team: u.team, x: u.x, hp: u.hp, atk: u.atk > 0 ? 1 : 0, mv: u.mv, mining: u.ph === "mining", carry: !!u.carry })),
    fx: S.fx,
  };
}

// ---------------- kompyuter o'yinchi ----------------
export const AI_LEVELS = {
  oson:  { miners: 5,  think: 3.0, attackPop: 34, ratio: 1.3 },
  orta:  { miners: 8,  think: 1.6, attackPop: 26, ratio: 1.15 },
  qiyin: { miners: 10, think: 0.9, attackPop: 20, ratio: 1.0 },
};
const power = (S, team) => {
  let p = 0;
  for (const u of S.units) if (u.team === team && u.type !== "miner") { const d = U[u.type]; p += (u.hp * (d.dmg / d.cd)) / 100 * (d.range > 60 ? 0.9 : 1); }
  return p;
};
export function aiThink(S, team, level = "orta", mem = {}) {
  const L = AI_LEVELS[level] || AI_LEVELS.orta, me = team, en = 1 - team;
  if (S.t < (mem.next || 0)) return;
  mem.next = S.t + L.think;
  const q = S.queue[me];
  const miners = countOf(S, me, "miner");
  const want = Math.min(L.miners, MINER_MAX);
  // qator
  const rows = { soldier: 0, officer: 0, giant: 0, archer: level === "oson" ? 1 : 2 };
  if (S.rows[me].archer !== rows.archer || S.rows[me].soldier !== 0) command(S, me, { t: "rows", r: rows });
  // dushman tarkibi
  const cnt = {}; for (const k of ARMY) cnt[k] = 0;
  for (const u of S.units) if (u.team === en && cnt[u.type] !== undefined) cnt[u.type]++;
  const mine = {}; for (const k of ARMY) mine[k] = countOf(S, me, k);
  // nima olish
  if (miners < want && q.length < 3 && (S.t < 20 || miners < 4 || S.gold[me] > 220)) command(S, me, { t: "buy", u: "miner" });
  else if (q.length < 3) {
    const arc = cnt.archer, sol = cnt.soldier, gia = cnt.giant, off = cnt.officer;
    const w = {
      soldier: 3 + gia * 1.2 + arc * 0.8,
      archer: 2.2 + gia * 2.2 + off * 0.2,
      officer: 0.8 + arc * 1.6 + sol * 0.3,
      giant: 0.6 + sol * 0.5 + off * 0.2 + (S.t > 150 ? 1 : 0),
    };
    // o'z tarkibini ham muvozanatlash
    for (const k of ARMY) w[k] = w[k] / (1 + mine[k] * (k === "giant" ? 0.9 : 0.25));
    if (level === "oson") { w.officer *= 0.3; w.giant *= 0.3; }
    const order = ARMY.slice().sort((a, b) => w[b] - w[a]);
    const pick = order[0];
    if (S.gold[me] >= U[pick].cost) command(S, me, { t: "buy", u: pick });
    else if (S.gold[me] >= U.soldier.cost && U[pick].cost <= S.gold[me] + 130 && pick !== "giant") { /* kichik tejash */ }
    else if (q.length === 0 && S.gold[me] >= U.soldier.cost && U[pick].cost > S.gold[me] + 250) command(S, me, { t: "buy", u: "soldier" });
  }
  // qanday turish: hujum / ushlash / mudofaa
  const mp = power(S, me), ep = power(S, en), pop = popOf(S, me);
  const near = S.units.some(u => u.team === en && u.type !== "miner" && Math.abs(u.x - BASE_X[me]) < 700);
  let st = S.stance[me];
  if (mp > ep * L.ratio + 3 && pop >= L.attackPop * 0.6 || pop >= POP_MAX - 2 && mp > ep * 0.9) st = "attack";
  else if (S.stance[me] === "attack" && mp < ep * 0.65) st = "defend";
  else if (S.stance[me] !== "attack" && (near || mp < ep * 0.8)) st = near ? "defend" : "hold";
  else if (S.stance[me] === "defend" && !near && mp >= ep * 0.8) st = "hold";
  if (st !== S.stance[me]) command(S, me, { t: "stance", s: st });
  const fx = me === 0 ? 700 : 1300;
  if (S.flag[me] !== fx) command(S, me, { t: "flag", x: fx });
}
