// Shaxmat qoidalari: yurishlar, shoh/mat/pat, rokirovka, o'tishda olish, piyoda almashishi, durang qoidalari + oddiy kompyuter
export const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const DG = [[-1, -1], [-1, 1], [1, -1], [1, 1]], OR = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const sq = (r, c) => (r < 0 || r > 7 || c < 0 || c > 7) ? -1 : r * 8 + c;
const sgn = v => v > 0 ? 1 : v < 0 ? -1 : 0;

export function initBoard() {
  const b = Array(64).fill(0), back = [R, N, B, Q, K, B, N, R];
  for (let c = 0; c < 8; c++) { b[c] = -back[c]; b[8 + c] = -P; b[48 + c] = P; b[56 + c] = back[c]; }
  return b;
}
const keyOf = (board, turn, cast, ep) => board.map(v => String.fromCharCode(77 + v)).join("") + turn + cast + ep;
export function initState() {
  const board = initBoard();
  return { board, turn: "w", cast: "KQkq", ep: -1, half: 0, full: 1, last: null, winner: null, reason: "", reps: { [keyOf(board, "w", "KQkq", -1)]: 1 } };
}

// sq maydonini `by` rangli (1 oq, -1 qora) dona urib turibdimi
export function attacked(b, s, by) {
  const r = s >> 3, c = s & 7;
  const pr = r + by; // oq piyoda pastdan (r+1) uradi
  for (const dc of [-1, 1]) { const x = sq(pr, c + dc); if (x >= 0 && b[x] === by * P) return true; }
  for (const [dr, dc] of KN) { const x = sq(r + dr, c + dc); if (x >= 0 && b[x] === by * N) return true; }
  for (const [dr, dc] of KG) { const x = sq(r + dr, c + dc); if (x >= 0 && b[x] === by * K) return true; }
  for (const [dr, dc] of DG) for (let k = 1; ; k++) { const x = sq(r + dr * k, c + dc * k); if (x < 0) break; const v = b[x]; if (v) { if (v === by * B || v === by * Q) return true; break; } }
  for (const [dr, dc] of OR) for (let k = 1; ; k++) { const x = sq(r + dr * k, c + dc * k); if (x < 0) break; const v = b[x]; if (v) { if (v === by * R || v === by * Q) return true; break; } }
  return false;
}
const kingOf = (b, color) => b.indexOf(color * K);
export const inCheck = (b, color) => attacked(b, kingOf(b, color), -color);

function pseudo(st) {
  const b = st.board, color = st.turn === "w" ? 1 : -1, out = [];
  for (let s = 0; s < 64; s++) {
    const v = b[s]; if (!v || sgn(v) !== color) continue;
    const t = Math.abs(v), r = s >> 3, c = s & 7;
    if (t === P) {
      const dir = -color, start = color === 1 ? 6 : 1, last = color === 1 ? 0 : 7;
      const one = sq(r + dir, c);
      if (one >= 0 && !b[one]) {
        if (r + dir === last) for (const p of [Q, R, B, N]) out.push({ f: s, t: one, p }); else out.push({ f: s, t: one });
        const two = sq(r + 2 * dir, c);
        if (r === start && !b[two]) out.push({ f: s, t: two });
      }
      for (const dc of [-1, 1]) {
        const x = sq(r + dir, c + dc); if (x < 0) continue;
        if (b[x] && sgn(b[x]) === -color) { if (r + dir === last) for (const p of [Q, R, B, N]) out.push({ f: s, t: x, p }); else out.push({ f: s, t: x }); }
        else if (x === st.ep) out.push({ f: s, t: x, e: 1 });
      }
    } else if (t === N || t === K) {
      for (const [dr, dc] of t === N ? KN : KG) { const x = sq(r + dr, c + dc); if (x >= 0 && sgn(b[x]) !== color) out.push({ f: s, t: x }); }
      if (t === K) {
        const home = color === 1 ? 60 : 4, ks = color === 1 ? "K" : "k", qs = color === 1 ? "Q" : "q";
        if (s === home && !attacked(b, s, -color)) {
          if (st.cast.includes(ks) && !b[s + 1] && !b[s + 2] && b[s + 3] === color * R && !attacked(b, s + 1, -color) && !attacked(b, s + 2, -color)) out.push({ f: s, t: s + 2, c: 1 });
          if (st.cast.includes(qs) && !b[s - 1] && !b[s - 2] && !b[s - 3] && b[s - 4] === color * R && !attacked(b, s - 1, -color) && !attacked(b, s - 2, -color)) out.push({ f: s, t: s - 2, c: 1 });
        }
      }
    } else {
      const dirs = t === B ? DG : t === R ? OR : DG.concat(OR);
      for (const [dr, dc] of dirs) for (let k = 1; ; k++) {
        const x = sq(r + dr * k, c + dc * k); if (x < 0) break;
        if (b[x]) { if (sgn(b[x]) === -color) out.push({ f: s, t: x }); break; }
        out.push({ f: s, t: x });
      }
    }
  }
  return out;
}

function rawApply(b, m) {
  const nb = b.slice(), v = nb[m.f];
  nb[m.t] = m.p ? sgn(v) * m.p : v; nb[m.f] = 0;
  if (m.e) nb[m.t + (v > 0 ? 8 : -8)] = 0;
  if (m.c) { if (m.t > m.f) { nb[m.f + 1] = nb[m.f + 3]; nb[m.f + 3] = 0; } else { nb[m.f - 1] = nb[m.f - 4]; nb[m.f - 4] = 0; } }
  return nb;
}

export function legalMoves(st) {
  const color = st.turn === "w" ? 1 : -1;
  return pseudo(st).filter(m => { const nb = rawApply(st.board, m); return !attacked(nb, kingOf(nb, color), -color); });
}

// natijasiz yurish (qidiruv uchun tez)
function step(st, m) {
  const b = st.board, v = b[m.f], t = Math.abs(v), color = sgn(v), cap = b[m.t];
  const nb = rawApply(b, m);
  let cast = st.cast;
  const drop = ch => { cast = cast.replace(ch, ""); };
  if (t === K) { if (color === 1) { drop("K"); drop("Q"); } else { drop("k"); drop("q"); } }
  for (const s of [m.f, m.t]) { if (s === 56) drop("Q"); else if (s === 63) drop("K"); else if (s === 0) drop("q"); else if (s === 7) drop("k"); }
  return { ...st, board: nb, turn: st.turn === "w" ? "b" : "w", cast, ep: t === P && Math.abs(m.t - m.f) === 16 ? (m.f + m.t) / 2 : -1,
    half: t === P || cap || m.e ? 0 : st.half + 1, full: st.full + (color === -1 ? 1 : 0), last: { from: m.f, to: m.t } };
}

function insufficient(b) {
  const rest = b.filter(v => v && Math.abs(v) !== K).map(Math.abs);
  return rest.length === 0 || (rest.length === 1 && (rest[0] === N || rest[0] === B));
}

// yurishni qo'llaydi va o'yin natijasini aniqlaydi (winner: 'w' | 'b' | 'draw')
export function applyMove(st, m) {
  const mover = st.turn, ns = step(st, m);
  const key = keyOf(ns.board, ns.turn, ns.cast, ns.ep);
  ns.reps = { ...st.reps, [key]: (st.reps[key] || 0) + 1 };
  const moves = legalMoves(ns);
  if (!moves.length) {
    if (inCheck(ns.board, ns.turn === "w" ? 1 : -1)) { ns.winner = mover; ns.reason = "mat"; } else { ns.winner = "draw"; ns.reason = "pat"; }
  } else if (ns.half >= 100) { ns.winner = "draw"; ns.reason = "50"; }
  else if (ns.reps[key] >= 3) { ns.winner = "draw"; ns.reason = "rep"; }
  else if (insufficient(ns.board)) { ns.winner = "draw"; ns.reason = "ins"; }
  return ns;
}
export const findMove = (st, from, to, promo = 0) => legalMoves(st).find(m => m.f === from && m.t === to && (m.p || 0) === (m.p ? promo || Q : 0));

// ---- kompyuter: material + markazga yaqinlik, alpha-beta ----
const VAL = [0, 100, 320, 330, 500, 900, 0];
const centre = s => { const r = s >> 3, c = s & 7; return 3 - Math.max(Math.abs(r - 3.5), Math.abs(c - 3.5)) * 0.8; };
function evaluate(st) { // oq nuqtai nazaridan
  let sc = 0;
  for (let s = 0; s < 64; s++) {
    const v = st.board[s]; if (!v) continue;
    const t = Math.abs(v), col = sgn(v);
    let x = VAL[t];
    if (t === P) x += centre(s) * 4 + (col === 1 ? (6 - (s >> 3)) : ((s >> 3) - 1)) * 6;
    else if (t === N || t === B) x += centre(s) * 8;
    else if (t === Q) x += centre(s) * 2;
    sc += col * x;
  }
  return sc;
}
function search(st, depth, alpha, beta, ply) {
  const moves = legalMoves(st);
  const color = st.turn === "w" ? 1 : -1;
  if (!moves.length) return inCheck(st.board, color) ? -100000 + ply : 0;
  if (depth === 0) return color * evaluate(st);
  moves.sort((a, b) => (Math.abs(st.board[b.t]) * 10 - Math.abs(st.board[b.f])) - (Math.abs(st.board[a.t]) * 10 - Math.abs(st.board[a.f])));
  let best = -Infinity;
  for (const m of moves) {
    const sc = -search(step(st, m), depth - 1, -beta, -alpha, ply + 1);
    if (sc > best) best = sc;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}
export function bestMove(st, depth = 2) {
  const moves = legalMoves(st); if (!moves.length) return null;
  const scored = moves.map(m => ({ m, sc: -search(step(st, m), depth - 1, -Infinity, Infinity, 1) + Math.random() * (depth === 1 ? 60 : 4) }));
  scored.sort((a, b) => b.sc - a.sc);
  return scored[0].m;
}
