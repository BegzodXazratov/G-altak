// X | O qoidalari: 3x3 (3 ta qatorda), 4x4 (4 ta), 5x5 (4 ta qatorda) + kompyuter raqib
export const WIN = { 3: 3, 4: 4, 5: 4 };

// barcha g'alaba chiziqlari (n x n maydonda k ta qator)
export function lines(n, k = WIN[n]) {
  const out = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const er = r + dr * (k - 1), ec = c + dc * (k - 1);
      if (er < 0 || er >= n || ec < 0 || ec >= n) continue;
      out.push(Array.from({ length: k }, (_, i) => (r + dr * i) * n + c + dc * i));
    }
  }
  return out;
}
const cache = {};
export const linesOf = n => cache[n] || (cache[n] = lines(n));

// board: uzunligi n*n massiv, 0 bo'sh, 1 = X, -1 = O. Natija: {w: 1|-1, line} | {w: 0} (durang) | null (davom etmoqda)
export function result(b, n) {
  for (const L of linesOf(n)) {
    const v = b[L[0]];
    if (v && L.every(i => b[i] === v)) return { w: v, line: L };
  }
  return b.includes(0) ? null : { w: 0, line: [] };
}

function evalBoard(b, n, me) {
  let s = 0;
  for (const L of linesOf(n)) {
    let x = 0, o = 0;
    for (const i of L) { if (b[i] === 1) x++; else if (b[i] === -1) o++; }
    if (x && o) continue;
    const c = x || o; if (!c) continue;
    const v = 10 ** c;
    s += (x ? v : -v) * (me === 1 ? 1 : -1);
  }
  return s;
}

function candidates(b, n) {
  const empty = [];
  let any = false;
  for (let i = 0; i < b.length; i++) if (b[i]) any = true; else empty.push(i);
  if (!any || n === 3) return empty;
  // katta maydonda faqat toshlar yonidagi kataklar ko'riladi
  const near = empty.filter(i => {
    const r = (i / n) | 0, c = i % n;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < n && cc >= 0 && cc < n && b[rr * n + cc]) return true;
    }
    return false;
  });
  return near.length ? near : empty;
}

function search(b, n, turn, me, depth, alpha, beta) {
  const r = result(b, n);
  if (r) return r.w === 0 ? 0 : r.w === me ? 1e6 + depth : -1e6 - depth;
  if (depth === 0) return evalBoard(b, n, me);
  const cs = candidates(b, n);
  const mid = (n - 1) / 2;
  cs.sort((p, q) => (Math.abs((p / n | 0) - mid) + Math.abs(p % n - mid)) - (Math.abs((q / n | 0) - mid) + Math.abs(q % n - mid)));
  let best = turn === me ? -Infinity : Infinity;
  for (const i of cs) {
    b[i] = turn;
    const v = search(b, n, -turn, me, depth - 1, alpha, beta);
    b[i] = 0;
    if (turn === me) { if (v > best) best = v; if (best > alpha) alpha = best; }
    else { if (v < best) best = v; if (best < beta) beta = best; }
    if (beta <= alpha) break;
  }
  return best;
}

// level: "oson" | "orta" | "qiyin"; turn: 1 (X) yoki -1 (O)
export function aiMove(b, n, turn, level) {
  const empty = []; b.forEach((v, i) => { if (!v) empty.push(i); });
  if (!empty.length) return -1;
  const rnd = () => empty[(Math.random() * empty.length) | 0];
  const tryWin = who => { for (const i of empty) { b[i] = who; const r = result(b, n); b[i] = 0; if (r && r.w === who) return i; } return -1; };
  if (level === "oson") {
    if (Math.random() < 0.45) { const w = tryWin(turn); if (w >= 0) return w; const k = tryWin(-turn); if (k >= 0) return k; }
    return rnd();
  }
  const w = tryWin(turn); if (w >= 0) return w;
  const k = tryWin(-turn); if (k >= 0) return k;
  if (level === "orta" && Math.random() < 0.3) return rnd();
  const depth = n === 3 ? 9 : n === 4 ? (level === "qiyin" ? 4 : 2) : (level === "qiyin" ? 3 : 2);
  let bestV = -Infinity, bestI = [];
  const cs = candidates(b, n);
  for (const i of cs) {
    b[i] = turn;
    const v = search(b, n, -turn, turn, depth - 1, -Infinity, Infinity);
    b[i] = 0;
    if (v > bestV) { bestV = v; bestI = [i]; } else if (v === bestV) bestI.push(i);
  }
  return bestI.length ? bestI[(Math.random() * bestI.length) | 0] : rnd();
}

// ---------- onlayn (serverda saqlanadigan holat) ----------
// side: "w" = X (1-o'yinchi), "b" = O (2-o'yinchi). Raund tugasa, taxta o'zi yangilanadi (last — oxirgi raund natijasi).
export const SIZES = [3, 4, 5], ROUNDS = [1, 3, 5];
export function xoInit(size, rounds) {
  const n = SIZES.includes(+size) ? +size : 3, r = ROUNDS.includes(+rounds) ? +rounds : 3;
  return { n, rounds: r, len: `${n}-${r}`, board: Array(n * n).fill(0), turn: "w", starter: "w", round: 1, score: { w: 0, b: 0, d: 0 }, last: null, winner: null, line: [] };
}
export function xoApply(st, i, side) {
  if (st.winner || st.turn !== side || !Number.isInteger(i) || i < 0 || i >= st.board.length || st.board[i]) return null;
  const n = st.n, board = st.board.slice(), score = { ...st.score };
  board[i] = side === "w" ? 1 : -1;
  const r = result(board, n);
  if (!r) return { ...st, board, turn: side === "w" ? "b" : "w", last: null };
  const rw = r.w === 0 ? "draw" : r.w === 1 ? "w" : "b";
  if (rw === "draw") score.d++; else score[rw]++;
  const left = st.rounds - st.round, need = Math.floor(st.rounds / 2) + 1;
  const over = score.w >= need || score.b >= need || left === 0 || Math.abs(score.w - score.b) > left;
  const last = { round: st.round, w: rw, board, line: r.line };
  if (over) return { ...st, board, score, last, line: r.line, winner: score.w === score.b ? "draw" : score.w > score.b ? "w" : "b" };
  const starter = st.starter === "w" ? "b" : "w";
  return { ...st, board: Array(n * n).fill(0), score, last, line: [], round: st.round + 1, starter, turn: starter };
}
