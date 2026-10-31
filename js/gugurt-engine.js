// Gugurt: noto'g'ri tenglamada bitta gugurt cho'pini ko'chirib, uni to'g'ri qilish.
// Raqam — 7 segment (bitlar: a=1 tepa, b=2 o'ng-tepa, c=4 o'ng-past, d=8 past, e=16 chap-past, f=32 chap-tepa, g=64 o'rta).
// Amal — 2 cho'p: h=1 (gorizontal), v=2 (vertikal). "+" = 3, "−" = 1. "=" belgisi qimirlamaydi.
// Holat: { slots: [{t:"d"|"o", m:mask}], eq: "=" belgisidan oldingi slotlar soni }.

export const DIGITS = [63, 6, 91, 79, 102, 109, 125, 7, 127, 111];
const DIGIT_OF = new Map(DIGITS.map((m, d) => [m, d]));
export const SEG_BITS = [1, 2, 4, 8, 16, 32, 64];
export const OP_BITS = [1, 2];

const bits = m => { let n = 0; while (m) { n += m & 1; m >>= 1; } return n; };
export const sticks = st => st.slots.reduce((s, x) => s + bits(x.m), 0);

function numberOf(slots) {
  if (!slots.length) return null;
  const ds = slots.map(s => DIGIT_OF.get(s.m));
  if (ds.some(d => d === undefined)) return null;
  if (ds.length > 1 && ds[0] === 0) return null; // 07 kabi bo'lmaydi
  return Number(ds.join(""));
}

// slotlar: [chap son...][amal][o'ng son...] = [natija...]
export function evaluate(st) {
  const opIdx = st.slots.findIndex(s => s.t === "o");
  const left = st.slots.slice(0, opIdx), op = st.slots[opIdx], right = st.slots.slice(opIdx + 1, st.eq), res = st.slots.slice(st.eq);
  const a = numberOf(left), b = numberOf(right), c = numberOf(res);
  if (a === null || b === null || c === null) return { valid: false, ok: false };
  if (op.m !== 3 && op.m !== 1) return { valid: false, ok: false };
  const v = op.m === 3 ? a + b : a - b;
  return { valid: true, ok: v === c, text: `${a} ${op.m === 3 ? "+" : "−"} ${b} = ${c}` };
}

const clone = st => ({ eq: st.eq, slots: st.slots.map(s => ({ ...s })) });
const key = st => st.slots.map(s => s.t + s.m).join(",") + "|" + st.eq;

function fromNumbers(a, op, b, c) {
  const d = n => String(n).split("").map(x => ({ t: "d", m: DIGITS[+x] }));
  const slots = [...d(a), { t: "o", m: op === "+" ? 3 : 1 }, ...d(b)];
  return { eq: slots.length, slots: [...slots, ...d(c)] };
}

// bitta cho'p ko'chirishdan hosil bo'ladigan barcha holatlar
export function oneMoves(st) {
  const out = [];
  st.slots.forEach((s, i) => {
    const B = s.t === "d" ? SEG_BITS : OP_BITS;
    for (const bit of B) {
      if (!(s.m & bit)) continue;
      st.slots.forEach((t, j) => {
        const TB = t.t === "d" ? SEG_BITS : OP_BITS;
        for (const tb of TB) {
          if (i === j && tb === bit) continue;
          const tm = i === j ? s.m & ~bit : t.m;
          if (tm & tb) continue;
          const n = clone(st);
          n.slots[i].m &= ~bit;
          n.slots[j].m |= tb;
          out.push({ from: [i, bit], to: [j, tb], st: n });
        }
      });
    }
  });
  return out;
}

// ikki holat orasida aynan bitta cho'p ko'chganmi
export function isOneMove(a, b) {
  if (a.eq !== b.eq || a.slots.length !== b.slots.length) return false;
  let removed = 0, added = 0;
  for (let i = 0; i < a.slots.length; i++) {
    if (a.slots[i].t !== b.slots[i].t) return false;
    const x = a.slots[i].m, y = b.slots[i].m;
    removed += bits(x & ~y); added += bits(y & ~x);
  }
  return removed === 1 && added === 1;
}

let PUZZLES = null;
export function allPuzzles() {
  if (PUZZLES) return PUZZLES;
  const seen = new Map();
  for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) for (const op of ["+", "-"]) {
    const c = op === "+" ? a + b : a - b;
    if (c < 0) continue;
    const good = fromNumbers(a, op, b, c);
    for (const mv of oneMoves(good)) {
      const ev = evaluate(mv.st);
      if (!ev.valid || ev.ok) continue; // jumboq: haqiqiy ko'rinadigan, lekin noto'g'ri tenglama
      const k = key(mv.st);
      if (!seen.has(k)) seen.set(k, mv.st);
    }
  }
  PUZZLES = [...seen.values()];
  return PUZZLES;
}

// o'yin uchun tasodifiy ketma-ketlik
export function makeSet(n = 40) {
  const all = allPuzzles().slice();
  for (let i = all.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [all[i], all[j]] = [all[j], all[i]]; }
  return all.slice(0, n).map(clone);
}

// yechim to'g'rimi: boshlang'ich holatdan bitta ko'chirish va tenglama to'g'ri
export function checkSolution(start, answer) {
  return !!answer && isOneMove(start, answer) && evaluate(answer).ok;
}
