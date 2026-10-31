// O'yin davomida hazil-mutoyiba: o'yinchining harakatiga qarab kichik "pufakcha" chiqadi.
const BANK = {
  // --- umumiy ---
  start: ["Qani, ko'raylik-chi 😏", "Bismillah! Omad 🍀", "Barmoqlarni qizdirdingizmi? 🔥", "Bugun kimning kuni ekan? 👀"],
  last10: ["10 soniya! Yurak dukillayapti 💓", "Tezroq, tezroq! ⏱", "Oxirgi zarba! 💥", "Hozir yoki hech qachon! 🏃"],
  idle: ["Uxlab qoldingizmi? 😴", "Choy damlab keldingizmi? ☕", "Hoy, o'yin shu yerda 👋", "Ekranga tikilib qoldingiz-ku 😄",
    "Miyani qizdiryapsizmi? 🧠🔥"],
  lead: ["Raqib terlayapti 😅", "Zo'r ketyapsiz, to'xtamang! 🚀", "Bu safar sizniki shekilli 😎", "Raqib hozir telefonini silkitayapti 🤣"],
  trail: ["Hali kech emas! 💪", "Raqib shoshyapti, siz ham bo'shashmang 😤", "Qaytarib olamiz! ⚔️", "Ha, bir oz orqadasiz… hozircha 😉"],
  oppScore: ["Raqib ham uxlamayapti 👀", "Ana, raqib ham topdi 😬", "Raqib bir qadam oldinda… hozircha", "Raqib ishga tushdi 🏎"],
  // --- Topqir ---
  word: ["Zo'r! 👏", "Ana bu boshqa gap!", "Bor-yo'g'i boshlanishi 😎", "Lug'at sizdan qo'rqyapti 📖", "Barakalla!"],
  longWord: ["Voy-bo'! Akademik! 🎓", "Bu so'zni hatto lug'at ham zo'rg'a bilardi 😮", "Shoir ekansiz-ku! ✍️", "Uzun so'z — katta ochko 💰"],
  streak: ["Seriya ketyapti! 🔥🔥🔥", "To'xtatib bo'lmaydi! 🚂", "Bugun sizning kuningiz ✨", "Kombo! 🎯"],
  badWord: ["Hmm, bunaqa so'z yo'q-ku 🤔", "Yangi so'z ixtiro qildingizmi? 😄", "Lug'at hayron 🤨", "Yaqin keldi, lekin yo'q 🙃",
    "Bu so'z qaysi tilda? 😅"],
  taken: ["Raqib bir lahza oldin! 😤", "Kechikdingiz, u allaqachon olib ketdi 🏃", "Bu so'z band 🙅"],
  // --- Gugurt ---
  solved: ["Muhandis! 🛠", "Gugurt ustasi 🔥", "Einstein ham maqtardi 🧠", "Aql — bu kuch! 💡", "Oson ekan-a? 😏"],
  fast: ["Chaqmoqdek! ⚡", "Buni qanchalik tez yechdingiz?! 😳", "Hali o'ylashga ham ulgurmadingiz-ku 🚀"],
  wrong: ["Gugurt boshqa joyni yoqtiradi 🙃", "Yaqin! Yana bir urinish 🤏", "Matematika o'qituvchingiz yig'layapti 😢",
    "Bu tenglama emas, rebus bo'ldi 😄", "Qaytadan, shoshilmang 🙂"],
  skip: ["Keyingisi osonroq bo'lar 🤞", "Mayli, buni raqibga qoldiramiz 😄", "Javobini ko'rib qo'ying 👇"],
  // --- Shashka ---
  capture: ["Hap! 😋", "Bitta kam! ✂️", "Mazali yurish 🍽", "Raqibning donasi uyiga ketdi 👋"],
  multi: ["Ikki qushni bir tosh bilan! 🪨🐦🐦", "Qirg'in! 💥", "Bu yurishni ramkaga solib qo'yish kerak 🖼"],
  lost: ["Voy, donangiz ketdi 😬", "Hech gap emas, urushda bo'ladi 🛡", "Raqib och ekan 😅", "Bu tuzoq edimi? 🤔"],
  king: ["Damka! Endi siz qirolsiz 👑", "Toj kiyildi! 👑", "Endi uni to'xtatib bo'lmaydi 😎"],
  oppKing: ["Raqib damka qildi… ehtiyot bo'ling 👑😬"],
};

let last = 0, lastKey = "", timer = null;
const recent = [];
function pick(key) {
  const arr = BANK[key] || [key];
  const fresh = arr.filter(t => !recent.includes(t));
  const t = (fresh.length ? fresh : arr)[(Math.random() * (fresh.length || arr.length)) | 0];
  recent.push(t); if (recent.length > 8) recent.shift();
  return t;
}

// key — BANK kaliti (yoki tayyor matn). force — throttle'ni chetlab o'tish.
export function quip(key, force = false) {
  const now = Date.now();
  if (!force && now - last < 2600) return;
  if (!force && key === lastKey && now - last < 9000) return;
  last = now; lastKey = key;
  let el = document.getElementById("quip");
  if (!el) { el = document.createElement("div"); el.id = "quip"; document.body.appendChild(el); }
  el.textContent = pick(key);
  el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove("on"), 2300);
}
export function quipClear() { document.getElementById("quip")?.classList.remove("on"); }

// Har bir o'yin uchun umumiy kuzatuvchi: bo'sh turish, oxirgi 10 soniya, peshqadamlik.
export function watcher() {
  let lastAct = Date.now(), said10 = false, lastLead = 0;
  return {
    act() { lastAct = Date.now(); },
    tick({ left, started, done, mine, theirs, online }) {
      if (done || !started) return;
      if (left <= 10 && left > 0 && !said10) { said10 = true; quip("last10", true); return; }
      if (Date.now() - lastAct > 12000) { lastAct = Date.now(); quip("idle"); return; }
      if (online && Date.now() - lastLead > 15000) {
        const d = mine - theirs;
        if (d >= 3) { lastLead = Date.now(); quip("lead"); } else if (d <= -3) { lastLead = Date.now(); quip("trail"); }
      }
    },
  };
}
