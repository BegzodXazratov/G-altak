// Molekula: markazda 1 ta, atrofida 6 ta harf. So'z kamida 2 harfli, faqat shu 7 harfdan (takrorlash mumkin),
// markaziy harfni o'z ichiga olishi shart. O' va G' — bitta harf. Mijoz ham, server ham shu qoidani ishlatadi.

export const tokens = w => String(w).match(/[OG]'|[A-Z]/g) || [];
export const normWord = w => String(w || "").toUpperCase().replace(/[’‘ʻʼ`´]/g, "'").replace(/[^A-Z']/g, "");

// letters: { c: "A", o: ["B", ...6 ta] }  ->  to'g'ri so'z (token qatori) yoki null
export function molWord(letters, raw) {
  if (!letters || !letters.c || !Array.isArray(letters.o)) return null;
  const w = normWord(raw);
  if (w.length < 2 || w.length > 24) return null;
  const tk = tokens(w);
  if (tk.join("") !== w || tk.length < 2) return null;
  const set = new Set([letters.c, ...letters.o]);
  if (!tk.every(t => set.has(t)) || !tk.includes(letters.c)) return null;
  return w;
}

// butun lug'atdan shu to'plamga mos barcha so'zlar (faqat lug'atning o'zidagilar)
export function allWords(letters, dictWords) {
  const set = new Set([letters.c, ...letters.o]);
  return dictWords.filter(w => { const tk = tokens(w); return tk.length >= 2 && tk.join("") === w && tk.includes(letters.c) && tk.every(t => set.has(t)); });
}

export const isPangram = (letters, w) => {
  const need = new Set([letters.c, ...letters.o]);
  tokens(w).forEach(t => need.delete(t));
  return need.size === 0;
};
