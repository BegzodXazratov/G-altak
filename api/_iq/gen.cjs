/* Original savollar generatori. Kitoblardan savol ko'chirilmagan: faqat usul (qoida -> masala -> distraktor) ishlatiladi. */
'use strict';
const crypto = require('crypto');

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function RNG(seed) {
  const r = mulberry32(seed);
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  return {
    f: r,
    int: (a, b) => a + Math.floor(r() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(r() * arr.length)],
    shuffle,
    sample: (arr, n) => shuffle(arr).slice(0, n),
  };
}

/* ---------- umumiy yordamchilar ---------- */
// variantlarni aralashtirib, to'g'ri javob indeksini qaytaradi. keyOf - dublikatni aniqlash uchun
function finalize(R, correct, wrongs, keyOf, count) {
  const seen = new Set([keyOf(correct)]);
  const w = [];
  for (const x of wrongs) { const k = keyOf(x); if (!seen.has(k)) { seen.add(k); w.push(x); } }
  const opts = R.shuffle([correct].concat(w.slice(0, count - 1)));
  const idx = opts.findIndex((o) => keyOf(o) === keyOf(correct));
  return { opts, a: idx, short: w.length < count - 1 };
}

/* ---------- A bo'lim: shakllar ---------- */
// cell: {s:0..2 (aylana, kvadrat, uchburchak), n:1..3, f:0..2 (oq, kulrang, qora), r:0..3 (burilish, 90° dan)}
const ck = (c) => `${c.s}${c.n}${c.f}${c.r}`;
function cellVariants(c, attrs) {
  const out = [];
  for (const a of attrs) {
    const doms = a === 's' ? [0, 1, 2] : a === 'n' ? [1, 2, 3] : a === 'f' ? [0, 1, 2] : [0, 1, 2, 3];
    for (const v of doms) if (v !== c[a]) out.push(Object.assign({}, c, { [a]: v }));
  }
  return out;
}

function genMatrix(R, diff) {
  const attrs = ['s', 'n', 'f'];
  const varying = R.shuffle(attrs).slice(0, diff);
  const base = { s: R.int(0, 2), n: R.int(1, 3), f: R.int(0, 2) };
  const rule = {};
  attrs.forEach((a) => {
    if (!varying.includes(a)) { rule[a] = { t: 'const' }; return; }
    const types = a === 's' ? ['latin', 'rowc'] : ['prog', 'latin', 'rowc'];
    rule[a] = { t: R.pick(types), perm: R.shuffle([0, 1, 2]), step: R.pick([1, 2]) };
  });
  // kamida bitta atributda "latin" yoki "prog" bo'lsin (faqat rowc bo'lsa ustunlar bir xil bo'lib qoladi)
  const val = (a, r, c) => {
    const ru = rule[a];
    if (ru.t === 'const') return a === 'n' ? base.n - 1 : base[a];
    if (ru.t === 'rowc') return ru.perm[r];
    if (ru.t === 'latin') return ru.perm[(r + c) % 3];
    return (ru.perm[r] + ru.step * c) % 3;
  };
  const cell = (r, c) => ({ s: val('s', r, c), n: val('n', r, c) + 1, f: val('f', r, c), r: 0 });
  const cells = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cells.push(cell(r, c));
  const ans = cells[8];
  const wr = [];
  [cells[7], cells[5], cells[6], cells[2]].forEach((c) => wr.push(c));
  wr.push(...R.shuffle(cellVariants(ans, attrs)));
  const fin = finalize(R, ans, wr, ck, 6);
  const shown = cells.slice(0, 8).concat([null]);
  return { kind: 'matrix', sec: 'A', tpl: 'mx' + diff, lvl: diff, prompt: 'Qaysi shakl bo\'sh joyga mos keladi?', spec: { cells: shown }, opts: fin.opts, a: fin.a, ex: 'Har qator va ustundagi shakllar o\'zgarishida qoida bor (soni, turi yoki rangi). Shu qoida bo\'yicha oxirgi katak topiladi.' };
}

function genSeries(R, diff) {
  let pool = ['s', 'n', 'f', 'r'];
  let attrs = R.shuffle(pool).slice(0, diff);
  const base = { s: R.int(0, 2), n: R.int(1, 3), f: R.int(0, 2), r: 0 };
  if (attrs.includes('r')) { base.s = 2; attrs = attrs.filter((a) => a !== 's'); if (attrs.length < diff) { const extra = ['n', 'f'].filter((x) => !attrs.includes(x)); attrs.push(R.pick(extra)); } }
  const rules = {};
  attrs.forEach((a) => {
    if (a === 'r') { rules.r = { p: 4, step: R.pick([1, 3]) }; return; }
    const p = R.pick([2, 3]);
    const dom = a === 'n' ? [1, 2, 3] : [0, 1, 2];
    rules[a] = { p, vals: R.shuffle(dom).slice(0, p) };
  });
  const at = (i) => {
    const c = Object.assign({}, base);
    attrs.forEach((a) => { const ru = rules[a]; c[a] = a === 'r' ? (i * ru.step) % 4 : ru.vals[i % ru.p]; });
    return c;
  };
  const shown = [0, 1, 2, 3, 4].map(at);
  const ans = at(5);
  const wr = [at(4), at(3)];
  wr.push(...R.shuffle(cellVariants(ans, attrs.concat(['r', 's', 'n', 'f'].filter((x) => !attrs.includes(x) && (x !== 'r' || base.s === 2))))));
  const fin = finalize(R, ans, wr, ck, 6);
  return { kind: 'series', sec: 'A', tpl: 'sr' + diff, lvl: diff, prompt: 'Qatorni davom ettiring: keyingi shakl qaysi?', spec: { cells: shown }, opts: fin.opts, a: fin.a, ex: 'Shakllar belgilangan tartibda takrorlanib boradi (soni, rangi yoki burilishi). Davrni topib, keyingisini aniqlang.' };
}

/* ---------- B bo'lim: raqamlar ---------- */
function numOptions(R, ans, extras) {
  const wr = extras.filter((x) => Number.isFinite(x) && x > 0 === ans > 0);
  const d = [1, -1, 2, -2, 3, -3, 4, -4, 5, 10, -10];
  R.shuffle(d).forEach((k) => wr.push(ans + k));
  return finalize(R, ans, wr, (x) => String(x), 5);
}
function numQ(R, tpl, lvl, prompt, ans, extras, ex) {
  const fin = numOptions(R, ans, extras);
  return { kind: 'text', sec: 'B', tpl, lvl, prompt, opts: fin.opts.map(String), a: fin.a, ex };
}
const seqText = (arr) => arr.join(', ') + ', ?';
const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79];
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

function nArith(R) {
  const down = R.f() < 0.35; const d = R.int(3, 19);
  const a = down ? R.int(60, 140) : R.int(2, 60);
  const s = [0, 1, 2, 3].map((i) => (down ? a - i * d : a + i * d)); const ans = down ? a - 4 * d : a + 4 * d;
  return numQ(R, 'n_arith', 1, 'Qatorni davom ettiring:\n' + seqText(s), ans, [down ? s[3] + d : ans + d, s[3] + (down ? -1 : 1)], `Har gal ${d} ga ${down ? 'kamayadi' : 'ortadi'}.`);
}
function nGeo(R) {
  const t = R.pick(['mul', 'mul', 'mul', 'mul', 'sq', 'cube', 'tri', 'prime']);
  if (t === 'mul') {
    const m = R.pick([2, 3, 4, 5]), a = R.int(1, 9);
    const s = [0, 1, 2, 3].map((i) => a * Math.pow(m, i)); const ans = a * Math.pow(m, 4);
    return numQ(R, 'n_geo', 1, 'Qatorni davom ettiring:\n' + seqText(s), ans, [s[3] + m, s[3] * (m + 1), s[3] + s[2]], `Har gal ${m} ga ko'paytiriladi.`);
  }
  if (t === 'sq') { const i = R.int(1, 14); const s = [0, 1, 2, 3].map((k) => (i + k) * (i + k)); const ans = (i + 4) * (i + 4); return numQ(R, 'n_sq', 2, 'Qatorni davom ettiring:\n' + seqText(s), ans, [s[3] + (2 * (i + 3) + 3), s[3] + s[3] - s[2], s[3] + (i + 4)], "Bu ketma-ket sonlarning kvadratlari."); }
  if (t === 'cube') { const i = R.int(1, 7); const s = [0, 1, 2, 3].map((k) => Math.pow(i + k, 3)); const ans = Math.pow(i + 4, 3); return numQ(R, 'n_cube', 2, 'Qatorni davom ettiring:\n' + seqText(s), ans, [s[3] + (s[3] - s[2]), Math.pow(i + 4, 2) * 3, s[3] * 2], "Bu ketma-ket sonlarning kublari."); }
  if (t === 'tri') { const i = R.int(2, 14); const T = (n) => (n * (n + 1)) / 2; const s = [0, 1, 2, 3].map((k) => T(i + k)); const ans = T(i + 4); return numQ(R, 'n_tri', 2, 'Qatorni davom ettiring:\n' + seqText(s), ans, [s[3] + (i + 3), s[3] + (i + 5), s[3] * 2 - s[2]], "Farqlar 1 tadan ortib boradi (uchburchak sonlar)."); }
  const i = R.int(0, 17); const s = PRIMES.slice(i, i + 4); const ans = PRIMES[i + 4];
  return numQ(R, 'n_prime', 2, 'Qatorni davom ettiring:\n' + seqText(s), ans, [s[3] + 2, s[3] + 4, s[3] + 6, s[3] + 1].filter((x) => x !== ans), "Bu tub sonlar ketma-ketligi (faqat 1 ga va o'ziga bo'linadi).");
}
function nPct(R) {
  const t = R.pick(['ud', 'disc', 'two']);
  if (t === 'ud') {
    const p = R.pick([10, 20, 25, 30, 40, 50, 60, 75]); const base = R.pick([100, 200, 400, 500, 600, 800, 1000, 1200, 1600, 2000, 2400, 4000]);
    const up = (base * (100 + p)) / 100, ans = (up * (100 - p)) / 100;
    if (!Number.isInteger(ans)) return nPct(R);
    return numQ(R, 'n_pct1', 2, `Mahsulot narxi ${fmt(base)} so'm edi. Avval ${p}% ga oshirildi, keyin yangi narxdan ${p}% arzonlashtirildi. Hozirgi narx necha so'm?`, ans, [base, up, (base * (100 - p)) / 100], `Oshgan narx: ${fmt(up)}. Undan ${p}% kamaysa: ${fmt(ans)}. Foizlar turli asosdan hisoblanadi, shuning uchun boshlang'ich narxga qaytmaydi.`);
  }
  if (t === 'disc') {
    const p = R.pick([10, 20, 25, 40, 50]); const b = R.pick([200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000]);
    const N = (b * (100 - p)) / 100;
    if (!Number.isInteger(N)) return nPct(R);
    return numQ(R, 'n_pct2', 3, `Kitob ${p}% arzonlashgach ${fmt(N)} so'm bo'ldi. Uning dastlabki narxi necha so'm edi?`, b, [N + (N * p) / 100, N + p, b - p, Math.round(N * (1 + p / 50))], `${100 - p}% = ${fmt(N)} so'm, demak 100% = ${fmt(b)} so'm.`);
  }
  const p = R.pick([10, 20, 30, 40, 50]), q = R.pick([10, 20, 30, 40, 50]); const base = R.pick([1000, 2000, 3000, 4000, 5000]);
  const ans = (base * (100 + p) * (100 + q)) / 10000;
  return numQ(R, 'n_pct3', 2, `Maosh avval ${p}% ga, keyin yangi maoshdan ${q}% ga oshirildi. Dastlabki maosh ${fmt(base)} so'm bo'lsa, oxirgi maosh necha so'm?`, ans, [base + ((p + q) * base) / 100, base * 2, ans + 50, ans - 50], `Birinchi oshishdan keyin ${fmt((base * (100 + p)) / 100)}; undan ${q}% ko'p: ${fmt(ans)}.`);
}
function nDiff(R) {
  const a = R.int(1, 20), d0 = R.int(1, 6), k = R.pick([1, 2, 3]);
  const s = [a]; let d = d0; for (let i = 0; i < 5; i++) { s.push(s[s.length - 1] + d); d += k; }
  const shown = s.slice(0, 5); const ans = s[5];
  return numQ(R, 'n_diff', 2, 'Qatorni davom ettiring:\n' + seqText(shown), ans, [shown[4] + (d0 + 3 * k), shown[4] + (d0 + 5 * k), shown[4] + (d0 + 3 * k) + k], `Ketma-ket farqlar ${d0}, ${d0 + k}, ${d0 + 2 * k}, ... bo'lib ${k} ga ortib boradi.`);
}
function nAlt(R) {
  const a = R.int(2, 9), da = R.int(2, 5), b = R.int(30, 60), db = R.int(2, 6);
  const s = []; for (let i = 0; i < 7; i++) s.push(i % 2 === 0 ? a + (i / 2) * da : b - ((i - 1) / 2) * db);
  const shown = s.slice(0, 6); const ans = s[6];
  return numQ(R, 'n_alt', 3, 'Qatorni davom ettiring (qator ikkita qatorning aralashmasi):\n' + seqText(shown), ans, [shown[5] + db, shown[4] + da * 2, shown[4] + da + 1, ans + da], `Toq o'rinlarda +${da} bilan o'sadi, juft o'rinlarda -${db} bilan kamayadi.`);
}
function nWord(R) {
  const t = R.pick(['work', 'work', 'meet', 'age', 'avg']);
  if (t === 'work') {
    const z = R.int(2, 24); const divs = []; for (let a = 1; a <= z; a++) if ((z * z) % a === 0) divs.push(a);
    const a = R.pick(divs); const x = z + a, y = z + (z * z) / a;
    if (x === y || x > 90 || y > 90) return nWord(R);
    const who = R.pick([['usta', 'ishni', 'tugatadi', 'kunda'], ['quvur', 'hovuzni', "to'ldiradi", 'soatda']]);
    const [w, o, v, u] = who;
    return numQ(R, 'n_work', 3, `Bitta ${w} ${o} ${Math.min(x, y)} ${u}, ikkinchisi ${Math.max(x, y)} ${u} ${v}. Ikkalasi birga ishlasa, ${o} necha ${u.replace('da', '')}da ${v}?`, z, [Math.round((x + y) / 2), x + y, Math.min(x, y), z + 1, z - 1].filter((q) => q > 0), `1 ${u.replace('da', '')}da birinchisi 1/${x} qismini, ikkinchisi 1/${y} qismini bajaradi. Birgalikda 1/${x}+1/${y}=1/${z}, ya'ni ${z}.`);
  }
  if (t === 'meet') {
    const a = R.pick([40, 45, 50, 55, 60, 65, 70]), b = R.pick([40, 50, 60, 70, 80, 90]); const tt = R.int(2, 6); const D = (a + b) * tt;
    return numQ(R, 'n_meet', 2, `Ikki shahar orasi ${D} km. Bir mashina soatiga ${a} km, ikkinchisi ${b} km tezlikda bir-biriga qarab yo'lga chiqdi. Necha soatdan keyin uchrashadi?`, tt, [Math.round(D / Math.max(a, b)), Math.round(D / Math.min(a, b)), tt + 1, tt - 1].filter((q) => q > 0), `Ular soatiga ${a + b} km yaqinlashadi. ${D} : ${a + b} = ${tt} soat.`);
  }
  if (t === 'age') {
    const x = R.int(5, 25), d = R.int(2, 9), k = R.int(2, 8); const S = 2 * x + d + 2 * k; const ans = x + d;
    const [n1, n2] = R.sample(NAMES, 2);
    return numQ(R, 'n_age', 3, `${n1} ${n2}dan ${d} yosh katta. ${k} yildan keyin ularning yoshlari yig'indisi ${S} bo'ladi. ${n1} hozir necha yoshda?`, ans, [x, ans + k, ans - k, S / 2 - k, Math.round((S - d) / 2)], `${k} yildan keyin ikkalasi ${2 * k} yosh ortiq: hozir yig'indi ${S - 2 * k}. ${n2} = (${S - 2 * k} - ${d}) / 2 = ${x}, demak ${n1} ${ans} yoshda.`);
  }
  const m = R.int(8, 30); const nums = [0, 1, 2, 3].map(() => R.int(Math.max(1, m - 8), m + 8)); const ans = 5 * m - nums.reduce((p, c) => p + c, 0);
  if (ans < 1 || ans > 80) return nWord(R);
  return numQ(R, 'n_avg', 3, `Beshta sonning o'rtachasi ${m}. Ulardan to'rttasi: ${nums.join(', ')}. Beshinchi son nechaga teng?`, ans, [m, Math.round(nums.reduce((p, c) => p + c, 0) / 4), ans + m - 5, 5 * m], `Beshta sonning yig'indisi ${5 * m}. To'rttasining yig'indisi ${nums.reduce((p, c) => p + c, 0)}. Farqi ${ans}.`);
}
function nRec(R) {
  const m = R.pick([2, 3, 4]), c = R.pick([-2, -1, 1, 2, 3, 4, 5]), a = R.int(2, 7);
  const s = [a]; for (let i = 0; i < 5; i++) s.push(s[s.length - 1] * m + c);
  if (s.some((v) => v < 1)) return nRec(R);
  const shown = s.slice(0, 5); const ans = s[5];
  return numQ(R, 'n_rec', 3, 'Qatorni davom ettiring:\n' + seqText(shown), ans, [shown[4] * m, shown[4] * m + c + 1, shown[4] + shown[3], shown[4] * (m + 1) + c], `Har bir son oldingisini ${m} ga ko'paytirib, ${c >= 0 ? c + ' qo\'shish' : -c + ' ayirish'} bilan hosil bo'ladi.`);
}
function nFib(R) {
  const a = R.int(1, 9), b = R.int(2, 9);
  const s = [a, b]; for (let i = 0; i < 5; i++) s.push(s[s.length - 1] + s[s.length - 2]);
  const shown = s.slice(0, 6); const ans = s[6];
  return numQ(R, 'n_fib', 3, 'Qatorni davom ettiring:\n' + seqText(shown), ans, [shown[5] * 2, shown[5] + shown[3], shown[5] + shown[4] + 1, shown[5] + shown[2]], "Har bir son oldingi ikkitasining yig'indisiga teng.");
}
const NUM_GEN = { arith: nArith, geo: nGeo, pct: nPct, diffs: nDiff, alt: nAlt, word: nWord, rec: nRec, fib: nFib };
function genNumber(R, which) { return NUM_GEN[which](R); }

/* ---------- C bo'lim: so'zlar ---------- */
const CATS = {
  meva: ['olma', 'nok', 'uzum', 'shaftoli', 'gilos', "o'rik", 'anor', 'behi', 'anjir'],
  sabzavot: ['sabzi', 'piyoz', 'karam', 'turp', 'kartoshka', 'lavlagi', 'sarimsoq'],
  uyHayvon: ['sigir', "qo'y", 'echki', 'ot', 'eshak', 'tuya'],
  yirtqich: ["bo'ri", 'sher', "yo'lbars", 'ayiq', 'tulki', 'qoplon'],
  qush: ['kaptar', 'chumchuq', 'bulbul', "qarg'a", 'laylak', 'turna', "to'ti"],
  hasharot: ['chumoli', 'ari', 'pashsha', 'chivin', "qo'ng'iz", 'kapalak'],
  transport: ['avtobus', 'poyezd', 'samolyot', 'tramvay', 'kema', 'velosiped'],
  kasb: ['shifokor', "o'qituvchi", 'quruvchi', 'oshpaz', 'haydovchi', 'tikuvchi'],
  asbob: ['bolta', 'arra', "bolg'a", 'randa', 'qaychi', 'pichoq'],
  kiyim: ["ko'ylak", 'shim', 'kurtka', 'etik', 'qalpoq', 'paypoq'],
  mebel: ['stol', 'stul', 'shkaf', 'divan', 'karavot', 'javon'],
  rang: ['qizil', "ko'k", 'yashil', 'sariq', 'qora', 'oq'],
  shahar: ['Toshkent', 'Samarqand', 'Buxoro', 'Xiva', 'Andijon', 'Namangan', 'Qarshi'],
  azo: ["ko'z", 'quloq', 'burun', "og'iz", "qo'l", 'oyoq'],
  maktab: ['daftar', 'qalam', "o'chirg'ich", "chizg'ich", 'portfel', 'doska'],
  sport: ['futbol', 'tennis', 'suzish', 'boks', 'kurash', 'voleybol'],
  oila: ['ota', 'ona', 'aka', 'opa', 'uka', 'buvi'],
  ichimlik: ['choy', 'sut', 'sharbat', 'qatiq', 'suv', 'kompot'],
  taom: ['palov', "sho'rva", 'manti', 'somsa', "lag'mon", 'mastava'],
  metall: ['temir', 'mis', 'oltin', 'kumush', 'alyuminiy', "qo'rg'oshin"],
  sayyora: ['Mars', 'Venera', 'Yupiter', 'Saturn', 'Merkuriy', 'Neptun'],
  daryo: ['Amudaryo', 'Sirdaryo', 'Zarafshon', 'Qashqadaryo', 'Surxondaryo'],
  daraxt: ['terak', 'chinor', 'tol', 'archa', 'eman', "qayrag'och"],
  musiqa: ['nay', 'dutor', 'rubob', "g'ijjak", 'doira', 'surnay'],
  shakl: ['aylana', 'kvadrat', 'uchburchak', "to'rtburchak", 'romb', 'oval'],
};
const DOMAIN = {
  jonivor: ['uyHayvon', 'yirtqich', 'qush', 'hasharot'],
  oziq: ['meva', 'sabzavot', 'taom', 'ichimlik'],
  inson: ['kasb', 'oila', 'azo', 'kiyim', 'sport'],
  narsa: ['transport', 'asbob', 'mebel', 'maktab', 'musiqa', 'shakl', 'metall', 'rang'],
  tabiat: ['shahar', 'daryo', 'daraxt', 'sayyora'],
};
const domOf = {}; Object.keys(DOMAIN).forEach((d) => DOMAIN[d].forEach((c) => { domOf[c] = d; }));
function genOdd(R, level) {
  const keys = Object.keys(CATS); let ca, cb;
  for (let t = 0; t < 100; t++) {
    ca = R.pick(keys); cb = R.pick(keys);
    if (ca === cb) continue;
    if (level === 1 && domOf[ca] !== domOf[cb]) break;
    if (level === 2 && domOf[ca] === domOf[cb]) break;
  }
  const four = R.sample(CATS[ca], 4); const odd = R.pick(CATS[cb]);
  const fin = finalize(R, odd, four, (x) => x, 5);
  return { kind: 'text', sec: 'C', tpl: 'v_odd' + level, lvl: level === 1 ? 1 : 2, prompt: "Qaysi so'z qolganlariga mos kelmaydi?", opts: fin.opts, a: fin.a, ex: `Boshqa to'rttasi bir guruhga kiradi, "${odd}" esa boshqa guruhdan.`, sig: 'odd:' + fin.opts.slice().sort().join('|') };
}

const REL = {
  qarama: { name: "qarama-qarshi ma'no", pairs: [['issiq', 'sovuq'], ['baland', 'past'], ['katta', 'kichik'], ["yorug'", "qorong'i"], ['tez', 'sekin'], ['yangi', 'eski'], ["to'la", "bo'sh"], ['kuchli', 'zaif'], ["og'ir", 'yengil'], ['qalin', 'yupqa'], ['uzun', 'qisqa'], ['keng', 'tor'], ['chuqur', 'sayoz'], ['toza', 'iflos'], ['quruq', "ho'l"], ['shirin', 'achchiq'], ['yaqin', 'uzoq'], ['oson', 'qiyin'], ['semiz', "ozg'in"], ['kech', 'erta']] },
  bola: { name: 'bola', pairs: [['ot', 'toy'], ['sigir', 'buzoq'], ["qo'y", "qo'zi"], ['tovuq', "jo'ja"], ['it', 'kuchukcha'], ['mushuk', 'mushukcha'], ['tuya', "bo'taloq"]] },
  qism: { name: 'qism-butun', pairs: [["g'ildirak", 'mashina'], ['barg', 'daraxt'], ['sahifa', 'kitob'], ['qanot', 'qush'], ['tugma', "ko'ylak"], ["g'isht", 'devor'], ['tirnoq', 'barmoq'], ['barmoq_', "qo'l"]] },
  asbob: { name: 'asbob-vazifa', pairs: [['qalam', 'yozmoq'], ['pichoq', 'kesmoq'], ["bolg'a", 'urmoq'], ['kalit', 'ochmoq'], ['supurgi', 'tozalamoq'], ['ketmon', 'kovlamoq'], ['qaychi', 'qirqmoq'], ['igna', 'tikmoq'], ["cho'tka", "bo'yamoq"]] },
  joy: { name: 'kasb-joy', pairs: [['shifokor', 'kasalxona'], ["o'qituvchi", 'maktab'], ['oshpaz', 'oshxona'], ['dehqon', 'dala'], ['baliqchi', 'daryo'], ['imom', 'masjid']] },
  tur: { name: 'tur-guruh', pairs: [['olma', 'meva'], ['sigir', 'hayvon'], ['stol', 'mebel'], ['tikuvchi', 'kasb'], ['Toshkent', 'shahar'], ['qizil', 'rang'], ['choy', 'ichimlik'], ['velosiped', 'transport'], ['shim', 'kiyim']] },
};
// "barmoq_" kabi texnik belgi olib tashlanadi
Object.values(REL).forEach((r) => { r.pairs = r.pairs.map((p) => [p[0].replace(/_$/, ''), p[1]]); });
REL.qism.pairs = REL.qism.pairs.filter((p) => !(p[0] === 'barmoq')); // barmoq ikki rolda keladi, chalkashlik bo'lmasin

function genAnalogy(R, relKey, lvl) {
  const rel = REL[relKey];
  const [p1, p2] = R.sample(rel.pairs, 2);
  const rev = R.f() < 0.3; // teskari yo'nalish: B : A = D : ?
  const A = rev ? p1[1] : p1[0], B = rev ? p1[0] : p1[1], C = rev ? p2[1] : p2[0], D = rev ? p2[0] : p2[1];
  const same = rel.pairs.filter((p) => p !== p1 && p !== p2).map((p) => (rev ? p[0] : p[1]));
  const other = []; Object.keys(REL).forEach((k) => { if (k !== relKey) REL[k].pairs.forEach((p) => other.push(rev ? p[0] : p[1])); });
  const wr = [B].concat(R.shuffle(same).slice(0, 3)).concat(R.shuffle(other).slice(0, 2)).concat(R.shuffle(same)).concat(R.shuffle(other));
  const fin = finalize(R, D, wr, (x) => x, 5);
  return { kind: 'text', sec: 'C', tpl: 'v_an_' + relKey, lvl, prompt: `${A} : ${B} = ${C} : ?`, opts: fin.opts, a: fin.a, ex: `${A} va ${B} orasidagi bog'lanish (${rel.name}) ${C} va ${D} orasida ham xuddi shunday.`, sig: `an:${A}:${B}:${C}` };
}

// [so'z, ma'nodosh, qiyinlik]
const SYN = [['botir', 'jasur', 1], ['mohir', 'usta', 1], ['xafa', "g'amgin", 1], ["go'zal", 'chiroyli', 1], ['dono', 'aqlli', 1], ['tirishqoq', 'mehnatsevar', 1], ['tez', 'chaqqon', 1], ['ulkan', 'katta', 1], ['osoyishta', 'tinch', 1], ["g'azab", 'jahl', 1], ['mehribon', 'shafqatli', 2], ['dushman', "g'anim", 2], ["do'st", 'yor', 1], ['bino', 'imorat', 1], ["qo'rquv", "qo'rqinch", 2], ["sog'lik", 'salomatlik', 1], ['hurmat', 'izzat', 2], ['yordam', "ko'mak", 1], ['vatan', 'yurt', 1], ['orzu', 'istak', 2], ['boy', 'badavlat', 2], ["kambag'al", 'qashshoq', 2], ["qo'pol", "dag'al", 2], ['ogoh', 'hushyor', 2], ["yolg'iz", 'tanho', 2], ['kuchli', 'qudratli', 2], ['ayyor', 'makkor', 2], ['sodiq', 'vafodor', 2], ['musibat', 'kulfat', 2], ['tabassum', 'jilmayish', 2], ['ketmoq', "jo'namoq", 1], ['qidirmoq', 'izlamoq', 1], ['tushunmoq', 'anglamoq', 2], ['gapirmoq', "so'zlamoq", 1], ['sakramoq', "irg'imoq", 2], ['yugurmoq', 'chopmoq', 1], ['yashirmoq', 'berkitmoq', 2], ['xursand', 'shod', 2], ['tiniq', 'shaffof', 2], ['sekin', 'asta', 1], ['ozgina', 'biroz', 1]];
// [so'z, zid, qiyinlik]
const ANT = [['saxiy', 'xasis', 2], ['mard', "qo'rqoq", 1], ['ochiq', 'yopiq', 1], ["g'alaba", "mag'lubiyat", 1], ['dushman', "do'st", 1], ['boy', "kambag'al", 1], ['rost', "yolg'on", 1], ['kirmoq', 'chiqmoq', 1], ['issiq', 'sovuq', 1], ['baland', 'past', 1], ['katta', 'kichik', 1], ['tez', 'sekin', 1], ['yangi', 'eski', 1], ["to'la", "bo'sh", 1], ['kuchli', 'zaif', 1], ["og'ir", 'yengil', 1], ['qalin', 'yupqa', 1], ['uzun', 'qisqa', 1], ['keng', 'tor', 2], ['chuqur', 'sayoz', 2], ['toza', 'iflos', 1], ['quruq', "ho'l", 1], ['shirin', 'achchiq', 1], ['yaqin', 'uzoq', 1], ['oson', 'qiyin', 1], ['semiz', "ozg'in", 1], ['aqlli', 'ahmoq', 1], ['kech', 'erta', 1], ["ko'tarilmoq", 'tushmoq', 2], ['boshlamoq', 'tugatmoq', 2], ['yutmoq', 'yutqazmoq', 2], ['tirik', "o'lik", 2], ["to'g'ri", 'egri', 2], ['rahmdil', 'berahm', 2], ['mehnatkash', 'dangasa', 1]];
function genSyn(R, lvl) {
  const pool = SYN.filter((x) => x[2] === lvl); const e = R.pick(pool);
  const rev = R.f() < 0.4; const w = rev ? e[1] : e[0], s = rev ? e[0] : e[1];
  const wrongs = R.shuffle(SYN.filter((x) => x !== e).map((x) => (rev ? x[0] : x[1])));
  const fin = finalize(R, s, wrongs, (x) => x, 5);
  return { kind: 'text', sec: 'C', tpl: 'v_syn' + lvl, lvl, prompt: `"${w.toUpperCase()}" so'ziga eng yaqin ma'noli so'zni toping.`, opts: fin.opts, a: fin.a, ex: `"${w}" va "${s}" ma'nodosh so'zlar.`, sig: `syn:${w}` };
}
function genAnt(R) {
  const e = R.pick(ANT); const rev = R.f() < 0.4; const w = rev ? e[1] : e[0], s = rev ? e[0] : e[1];
  const wrongs = R.shuffle(ANT.filter((x) => x !== e).map((x) => (rev ? x[0] : x[1])));
  const fin = finalize(R, s, wrongs, (x) => x, 5);
  return { kind: 'text', sec: 'C', tpl: 'v_ant', lvl: 2, prompt: `"${w.toUpperCase()}" so'ziga eng qarama-qarshi ma'noli so'zni toping.`, opts: fin.opts, a: fin.a, ex: `"${w}" ning zidi "${s}".`, sig: `ant:${w}` };
}

/* ---------- D bo'lim: fazo va mantiq ---------- */
function rot90(g) { const n = g.length; const o = []; for (let r = 0; r < n; r++) { o.push([]); for (let c = 0; c < n; c++) o[r].push(g[n - 1 - c][r]); } return o; }
function mirrorH(g) { return g.map((row) => row.slice().reverse()); }
function mirrorV(g) { return g.slice().reverse().map((row) => row.slice()); }
const gk = (g) => g.map((r) => r.join('')).join('/');
function randGrid(R, n, k) {
  for (let t = 0; t < 300; t++) {
    const g = Array.from({ length: n }, () => Array(n).fill(0));
    let c = 0; while (c < k) { const r = R.int(0, n - 1), cc = R.int(0, n - 1); if (!g[r][cc]) { g[r][cc] = 1; c++; } }
    const forms = new Set(); let x = g; for (let i = 0; i < 4; i++) { forms.add(gk(x)); forms.add(gk(mirrorH(x))); x = rot90(x); }
    if (forms.size === 8) return g;
  }
  return null;
}
function genGrid(R, mode) {
  let g = null; let n = 4;
  if (mode === 'rot') { n = R.pick([3, 3, 4]); const k = n === 3 ? R.pick([4, 5]) : R.pick([5, 6, 7]); for (let t = 0; t < 50 && !g; t++) g = randGrid(R, n, k); }
  else { n = 4; for (let t = 0; t < 50 && !g; t++) g = randGrid(R, 4, R.pick([5, 6, 7])); }
  const cw = rot90(g);
  const vert = mode === 'mirror' && R.f() < 0.5;
  const ans = mode === 'rot' ? cw : (vert ? mirrorV(g) : mirrorH(g));
  const wr = mode === 'rot'
    ? [mirrorH(g), rot90(rot90(rot90(g))), rot90(rot90(g)), mirrorH(cw), g]
    : [g, mirrorH(rot90(g)), rot90(g), rot90(rot90(g)), vert ? mirrorH(g) : mirrorV(g)];
  for (let i = 0; i < 8; i++) { const m = ans.map((r) => r.slice()); const r = R.int(0, n - 1), c = R.int(0, n - 1); m[r][c] ^= 1; wr.push(m); }
  const fin = finalize(R, ans, wr, gk, 5);
  const prompt = mode === 'rot' ? "Chapdagi shaklni soat mili yo'nalishida 90° aylantirsangiz, qaysi shakl chiqadi?" : (vert ? "Chapdagi shaklning ko'zgudagi aksini (yuqori va pastki tomoni almashgan) toping." : "Chapdagi shaklning ko'zgudagi aksini (chap va o'ng tomoni almashgan) toping.");
  return { kind: 'grid', sec: 'D', tpl: 'd_' + mode + (vert ? 'v' : ''), lvl: mode === 'rot' ? 2 : 3, prompt, spec: { grid: g }, opts: fin.opts, a: fin.a, ex: mode === 'rot' ? "Shaklning yuqori qatori o'ng ustunga aylanadi." : "Ko'zgudagi aksda qatorlar (yoki ustunlar) teskari tartibda o'qiladi." };
}

function genSwitch(R, lvl) {
  const L = 4;
  const sw = { A: R.sample([1, 2, 3, 4], 2), B: R.sample([1, 2, 3, 4], 2), C: R.sample([1, 2, 3, 4], 2) };
  const steps = lvl === 1 ? R.sample(['A', 'B', 'C'], 2) : [R.pick(['A', 'B', 'C']), R.pick(['A', 'B', 'C']), R.pick(['A', 'B', 'C']), R.pick(['A', 'B', 'C'])];
  const st = [0, 0, 0, 0, 0];
  steps.forEach((s) => sw[s].forEach((l) => { st[l] ^= 1; }));
  const on = []; for (let l = 1; l <= L; l++) if (st[l]) on.push(l);
  const label = (arr) => (arr.length ? arr.join(' va ') + '-chiroq' : 'hech biri yonmaydi');
  const ansArr = on;
  const subsets = []; for (let m = 0; m < 16; m++) { const a = []; for (let l = 0; l < 4; l++) if (m & (1 << l)) a.push(l + 1); subsets.push(a); }
  const wr = R.shuffle(subsets).filter((a) => label(a) !== label(ansArr));
  const fin = finalize(R, ansArr, wr, label, 5);
  const desc = (k) => `${k} tugmasi ${sw[k].slice().sort((a, b) => a - b).map((x) => x + '-chiroq').join(' va ')} holatini almashtiradi (yonig'i o'chadi, o'chig'i yonadi)`;
  return { kind: 'text', sec: 'D', tpl: 'd_sw' + lvl, lvl: lvl + 1, prompt: `Boshida 4 ta chiroqning hammasi o'chiq.\n${desc('A')}.\n${desc('B')}.\n${desc('C')}.\nTugmalar ketma-ket bosildi: ${steps.join(', ')}.\nQaysi chiroqlar yonib turibdi?`, opts: fin.opts.map(label), a: fin.a, ex: `Har bosishda tegishli chiroqlar holati almashadi. Ketma-ketlik natijasida yonib qolgani: ${label(ansArr)}.` };
}

const NAMES = ['Ali', 'Vali', 'Salim', 'Karim', 'Dilnoza', 'Madina', 'Sardor', 'Aziz', 'Nodira', 'Jasur', 'Bobur', 'Laylo', 'Otabek', 'Zilola', 'Rustam', 'Malika'];
function genOrder(R, people, askTop) {
  const P = R.sample(NAMES, people); // P[0] eng baland ... P[last] eng past
  const st = [];
  for (let i = 0; i < people - 1; i++) {
    const a = P[i], b = P[i + 1];
    st.push(R.f() < 0.5 ? `${a} ${b}dan baland.` : `${b} ${a}dan past.`);
  }
  const text = R.shuffle(st).join(' ');
  const ans = askTop ? P[0] : P[people - 1];
  const fin = finalize(R, ans, P.filter((x) => x !== ans).concat(["aniqlab bo'lmaydi"]), (x) => x, people === 3 ? 4 : 5);
  return { kind: 'text', sec: 'D', tpl: 'd_ord' + people, lvl: people === 3 ? 1 : 3, prompt: `${text}\nKim eng ${askTop ? 'baland' : 'past'}?`, opts: fin.opts, a: fin.a, ex: `Gaplarni zanjirga ulasak tartib chiqadi: ${P.join(' > ')} (balandlik bo'yicha).` };
}

/* ---------- test yig'ish ---------- */
const SECTIONS = [
  { id: 'A', name: 'Shakllar va qonuniyat', time: 420 },
  { id: 'B', name: 'Raqamlar', time: 360 },
  { id: 'C', name: "So'zlar", time: 240 },
  { id: 'D', name: 'Fazo va mantiq', time: 300 },
];
const sigOf = (it) => it.sig || crypto.createHash('sha1').update(JSON.stringify([it.tpl, it.prompt, it.spec || null, it.opts[it.a]])).digest('hex').slice(0, 16);

// seen: foydalanuvchi oldin ko'rgan savollar belgilari (Set yoki massiv). Takrorlanmaslikka urinadi.
function buildTest(seed, seen) {
  const S = seen instanceof Set ? seen : new Set(seen || []);
  const R = RNG(seed);
  const used = new Set();
  const mk = (fn) => {
    let it = null;
    for (let t = 0; t < 25; t++) {
      it = fn(RNG(Math.floor(R.f() * 1e9)));
      const sg = sigOf(it); it.sig = sg;
      if (!S.has(sg) && !used.has(sg)) break;
    }
    used.add(it.sig);
    return it;
  };
  const items = [];
  [['m', 1], ['m', 1], ['s', 1], ['m', 2], ['s', 2], ['m', 2], ['m', 3], ['s', 3], ['m', 3]].forEach(([t, d]) => items.push(mk((r) => (t === 'm' ? genMatrix(r, d) : genSeries(r, d)))));
  ['arith', 'geo', 'pct', 'diffs', 'alt', 'word', 'rec', 'fib'].forEach((w) => items.push(mk((r) => genNumber(r, w))));
  items.push(mk((r) => genOdd(r, 1)));
  items.push(mk((r) => genAnalogy(r, 'qarama', 1)));
  items.push(mk((r) => genSyn(r, 1)));
  items.push(mk((r) => genAnalogy(r, r.pick(['bola', 'qism', 'tur']), 2)));
  items.push(mk((r) => genOdd(r, 2)));
  items.push(mk((r) => genAnt(r)));
  items.push(mk((r) => genAnalogy(r, r.pick(['asbob', 'joy']), 3)));
  items.push(mk((r) => genSyn(r, 2)));
  items.push(mk((r) => genOrder(r, 3, r.f() < 0.5)));
  items.push(mk((r) => genSwitch(r, 1)));
  items.push(mk((r) => genGrid(r, 'rot')));
  items.push(mk((r) => genSwitch(r, 2)));
  items.push(mk((r) => genOrder(r, 4, r.f() < 0.5)));
  items.push(mk((r) => genGrid(r, 'mirror')));

  const counters = {};
  const questions = []; const key = {};
  items.forEach((it) => {
    counters[it.sec] = (counters[it.sec] || 0) + 1;
    const id = it.sec + counters[it.sec];
    const { a, ex, tpl, lvl, sig, ...pub } = it;
    questions.push(Object.assign({ id }, pub));
    const k = { a, ex, tpl, lvl, sec: it.sec, sig, q: it.prompt };
    if (it.kind === 'text') k.o = it.opts; // faqat matnli savollar uchun (batafsil tahlilda ko'rsatiladi)
    key[id] = k;
  });
  return {
    sections: SECTIONS.map((s) => ({ ...s, questions: questions.filter((q) => q.sec === s.id) })),
    key,
  };
}

module.exports = { buildTest, SECTIONS, RNG, genMatrix, genSeries, genNumber, genGrid, genSwitch, genOrder, genOdd, genAnalogy, genSyn, genAnt, CATS, REL, SYN, ANT, NAMES };
