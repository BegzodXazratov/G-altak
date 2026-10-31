// Shashka (rus qoidalari): 8x8, oddiy dona orqaga ham ura oladi, urish majburiy,
// ketma-ket urish, damka (shoh) uzoqqa yuradi, urish paytida damkaga chiqsa — damka bo'lib davom etadi.
// Taxta: 64 katak, 0 bo'sh, 1 oq dona, 2 oq damka, -1 qora dona, -2 qora damka. Oq pastda (7-qator), yuqoriga yuradi.

export const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const inb = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
export const at = (r, c) => r * 8 + c;

export function initBoard() {
  const b = new Array(64).fill(0);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if ((r + c) % 2 === 0) continue;
    if (r < 3) b[at(r, c)] = -1;
    if (r > 4) b[at(r, c)] = 1;
  }
  return b;
}

const lastRow = side => (side === 1 ? 0 : 7);

function captureDfs(b, r, c, piece, side, path, caps, out) {
  let found = false;
  const king = Math.abs(piece) === 2;
  for (const [dr, dc] of DIRS) {
    if (!king) {
      const r1 = r + dr, c1 = c + dc, r2 = r1 + dr, c2 = c1 + dc;
      if (!inb(r2, c2)) continue;
      const v = b[at(r1, c1)];
      if (v * side < 0 && !caps.includes(at(r1, c1)) && b[at(r2, c2)] === 0) {
        found = true;
        const np = r2 === lastRow(side) ? 2 * side : piece;
        captureDfs(b, r2, c2, np, side, [...path, at(r2, c2)], [...caps, at(r1, c1)], out);
      }
    } else {
      let rr = r + dr, cc = c + dc;
      while (inb(rr, cc) && b[at(rr, cc)] === 0) { rr += dr; cc += dc; }
      if (!inb(rr, cc)) continue;
      const v = b[at(rr, cc)];
      if (v * side >= 0 || caps.includes(at(rr, cc))) continue;
      let lr = rr + dr, lc = cc + dc;
      while (inb(lr, lc) && b[at(lr, lc)] === 0) {
        found = true;
        captureDfs(b, lr, lc, piece, side, [...path, at(lr, lc)], [...caps, at(rr, cc)], out);
        lr += dr; lc += dc;
      }
    }
  }
  if (!found && caps.length) out.push({ path, caps, piece });
}

export function legalMoves(b, side) {
  const caps = [], simple = [];
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (p * side <= 0) continue;
    const r = (i / 8) | 0, c = i % 8;
    const bb = b.slice(); bb[i] = 0; // yuruvchi dona o'z joyini bo'shatadi
    captureDfs(bb, r, c, p, side, [i], [], caps);
    if (caps.length) continue;
    if (Math.abs(p) === 1) {
      for (const dc of [-1, 1]) {
        const r1 = r - side, c1 = c + dc;
        if (inb(r1, c1) && b[at(r1, c1)] === 0)
          simple.push({ path: [i, at(r1, c1)], caps: [], piece: r1 === lastRow(side) ? 2 * side : p });
      }
    } else {
      for (const [dr, dc] of DIRS) {
        let rr = r + dr, cc = c + dc;
        while (inb(rr, cc) && b[at(rr, cc)] === 0) {
          simple.push({ path: [i, at(rr, cc)], caps: [], piece: p });
          rr += dr; cc += dc;
        }
      }
    }
  }
  return caps.length ? caps : simple;
}

export function applyMove(b, m) {
  const nb = b.slice();
  nb[m.path[0]] = 0;
  for (const x of m.caps) nb[x] = 0;
  nb[m.path[m.path.length - 1]] = m.piece;
  return nb;
}

// ---------------- kompyuter (alpha-beta) ----------------
function evaluate(b) {
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (!p) continue;
    const r = (i / 8) | 0, c = i % 8;
    const center = (c >= 2 && c <= 5 && r >= 2 && r <= 5) ? 4 : 0;
    if (p === 1) s += 100 + (7 - r) * 4 + center;
    else if (p === -1) s -= 100 + r * 4 + center;
    else if (p === 2) s += 320;
    else s -= 320;
  }
  return s;
}

function negamax(b, side, depth, alpha, beta, stats) {
  stats.n++;
  const moves = legalMoves(b, side);
  if (!moves.length) return -100000 - depth;
  if (depth <= 0 && !moves[0].caps.length) return side * evaluate(b);
  if (depth <= -4) return side * evaluate(b); // urishlar zanjiri juda chuqurlashmasin
  let best = -Infinity;
  for (const m of moves) {
    const v = -negamax(applyMove(b, m), -side, depth - 1, -beta, -alpha, stats);
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

export function bestMove(b, side, depth) {
  const moves = legalMoves(b, side);
  if (!moves.length) return null;
  if (moves.length === 1) return moves[0];
  // ozgina tasodif — har o'yin bir xil bo'lmasin
  const shuffled = moves.map(m => [Math.random(), m]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
  let best = shuffled[0], bestV = -Infinity, alpha = -Infinity;
  const stats = { n: 0 };
  for (const m of shuffled) {
    const v = -negamax(applyMove(b, m), -side, depth - 1, -Infinity, -alpha, stats);
    if (v > bestV) { bestV = v; best = m; }
    if (v > alpha) alpha = v;
  }
  return best;
}

export function countPieces(b) {
  let w = 0, k = 0;
  for (const p of b) { if (p > 0) w++; else if (p < 0) k++; }
  return { w, b: k };
}
