'use strict';
function erf(x) { // Abramowitz-Stegun
  const s = x < 0 ? -1 : 1; x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
const cdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

const LEVELS = [
  [130, "Ajoyib", "Juda yuqori mantiqiy qobiliyat"],
  [120, 'Yuqori', "Mantiqiy fikrlashingiz yuqori"],
  [110, "O'rtadan yuqori", "O'rtachadan yaxshiroq natija"],
  [90, "O'rta", "Ko'pchilik odamlar shu oraliqda"],
  [80, "O'rtadan past", "O'rtachadan biroz past, mashq bilan oshadi"],
  [-999, 'Boshlang\'ich', "Bu o'yin natijasi, mashq qilib qayta urinib ko'ring"],
];

// norm: {mean, sd, n, provisional, version}; reliability: o'yin uchun taxminiy 0.80
function score(raw, norm, rel) {
  rel = rel || 0.8;
  const z = (raw - Number(norm.mean)) / Number(norm.sd);
  let iq = Math.round(100 + 15 * z);
  const sem = 15 * Math.sqrt(1 - rel);
  const w = Math.round(1.28 * sem);
  iq = Math.max(55, Math.min(160, iq));
  const lo = Math.max(50, iq - w), hi = Math.min(165, iq + w);
  const lv = LEVELS.find((l) => iq >= l[0]);
  const pct = Math.max(1, Math.min(99, Math.round(cdf((iq - 100) / 15) * 100)));
  return { iq, lo, hi, level: lv[1], levelText: lv[2], pct, provisional: !!norm.provisional || Number(norm.n) < 300 };
}
function levelOf(iq) { const lv = LEVELS.find((l) => iq >= l[0]); return { level: lv[1], levelText: lv[2], pct: Math.max(1, Math.min(99, Math.round(cdf((iq - 100) / 15) * 100))) }; }
module.exports = { score, cdf, levelOf };
