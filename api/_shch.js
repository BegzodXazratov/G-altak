// SH-chyot: 9x9 maydon (1–15) va har bir o'yinchiga maydondan haqiqatan yig'ib bo'ladigan maqsad sonlar (≤ 77)
const N = 9;
const rnd = n => (Math.random() * n) | 0;
const neighbors = i => {
  const r = (i / N) | 0, c = i % N, out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < N && cc >= 0 && cc < N) out.push(rr * N + cc);
  }
  return out;
};

function targetsFor(grid, lengths) {
  const used = new Set(), out = [];
  for (const len of lengths) {
    for (let tries = 0; tries < 400; tries++) {
      const path = [rnd(N * N)];
      while (path.length < len) {
        const nx = neighbors(path[path.length - 1]).filter(x => !path.includes(x));
        if (!nx.length) break;
        path.push(nx[rnd(nx.length)]);
      }
      if (path.length < len) continue;
      const sum = path.reduce((s, i) => s + grid[i], 0);
      if (sum <= 77 && !used.has(sum)) { used.add(sum); out.push(sum); break; }
    }
  }
  return out;
}

export const SECONDS = { 5: 180, 7: 240, 9: 300 };

export function makeShch(count) {
  count = [5, 7, 9].includes(+count) ? +count : 7;
  for (;;) {
    const grid = Array.from({ length: N * N }, () => 1 + rnd(15));
    // ikkala o'yinchiga bir xil murakkablikdagi (yo'l uzunligi) sonlar beriladi
    const lengths = Array.from({ length: count }, (_, i) => 2 + ((i * 2 + rnd(2)) % 5)); // 2..6
    const p1 = targetsFor(grid, lengths), p2 = targetsFor(grid, lengths);
    if (p1.length === count && p2.length === count) {
      return { count, seconds: SECONDS[count], grid, targets: { p1: p1.sort((a, b) => a - b), p2: p2.sort((a, b) => a - b) }, found: { p1: [], p2: [] } };
    }
  }
}

export const makeKim = () => ({ phase: "setup", ready: {}, pref: {}, guesses: { p1: [], p2: [] }, turn: null, max: 15 });
