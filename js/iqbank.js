// Mantiq va So'z boyligi testlari uchun katta savol banki: shablonlar + so'zlar bazasi.
// Savollar har safar yangidan yaratiladi, foydalanuvchi ko'rganlari (sig) takrorlanmaydi.
import { shuffle, ri } from "./iqui.js";

const pick = (a) => a[ri(0, a.length - 1)];
const fmt = (x) => String(x).replace(".", ",");
const uniq = (a) => [...new Set(a)];

// 4 ta variant: to'g'ri javob + yaqin noto'g'rilar. [options, correctIndex]
function numOpts(ans, near, f = fmt) {
  const set = [ans];
  for (const d of shuffle(near)) { const v = ans + d; if (v >= 0 && !set.includes(v) && set.length < 4) set.push(v); }
  let k = 1; while (set.length < 4) { const v = ans + k * 7; if (v >= 0 && !set.includes(v)) set.push(v); k++; }
  const o = shuffle(set); return { o: o.map(f), c: o.indexOf(ans) };
}
function strOpts(ans, pool) {
  const o = shuffle([ans, ...shuffle(uniq(pool).filter(x => x !== ans)).slice(0, 3)]);
  return { o, c: o.indexOf(ans) };
}

/* ======================= MANTIQ ======================= */
const NAMES = ["Karim", "Salim", "Dilnoza", "Aziza", "Bobur", "Madina", "Jasur", "Nodira", "Sardor", "Zilola", "Otabek", "Malika"];
const DAYS = ["dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba", "yakshanba"];

const STATIC = [
  { q: "Qutida 3 ta olma bor. Siz 2 tasini oldingiz. Sizda nechta olma bor?", o: ["1", "2", "3", "5"], c: 1, e: "Siz olgan olmalar sizda: 2 ta. Qutida esa 1 ta qoldi." },
  { q: "Soat 3:15 da soat va daqiqa millari orasidagi burchak qancha?", o: ["0°", "7,5°", "15°", "22,5°"], c: 1, e: "Daqiqa mili 90° da, soat mili esa 3 dan 7,5° o'tgan (97,5°). Farqi 7,5°." },
  { q: "5 ta mushuk 5 ta sichqonni 5 daqiqada tutadi. 100 ta mushuk 100 ta sichqonni necha daqiqada tutadi?", o: ["5", "20", "50", "100"], c: 0, e: "Har bir mushuk 5 daqiqada 1 ta sichqon tutadi. 100 mushuk 100 sichqonni ham 5 daqiqada tutadi." },
  { q: "Barcha A lar B, barcha B lar C bo'lsa, quyidagilardan qaysi biri albatta to'g'ri?", o: ["Barcha C lar A", "Barcha A lar C", "Hech bir A C emas", "Barcha B lar A"], c: 1, e: "A ⊂ B ⊂ C, demak barcha A lar C ichida." },
  { q: "Qaysi biri boshqalardan farq qiladi?", o: ["Kvadrat", "Uchburchak", "Doira", "Kub"], c: 3, e: "Kvadrat, uchburchak, doira tekis (2D) shakllar. Kub esa hajmli (3D)." },
  { q: "Qaysi oylarda kamida 28 kun bor?", o: ["Faqat fevralda", "Hamma oylarda", "Faqat 31 kunlik oylarda", "Hech birida"], c: 1, e: "Har bir oyda kamida 28 kun bor, hatto fevralda ham." },
  { q: "Siz poygada ikkinchi o'rindagini quvib o'tdingiz. Endi nechanchi o'rindasiz?", o: ["1", "2", "3", "Aniqlab bo'lmaydi"], c: 1, e: "Ikkinchi o'rindagi o'rnini egallaysiz, demak siz ikkinchisiz." },
  { q: "G'isht 1 kg va yana yarim g'isht og'irligida. G'isht necha kg?", o: ["1,5", "2", "2,5", "3"], c: 1, e: "x = 1 + x/2 tenglamadan x/2 = 1, demak x = 2 kg." },
  { q: "Daftar va qalam birga 1100 so'm. Daftar qalamdan 1000 so'm qimmat. Qalam necha so'm?", o: ["50", "100", "150", "1000"], c: 0, e: "Qalam x bo'lsa, daftar x + 1000. x + x + 1000 = 1100, x = 50." },
  { q: "Ota o'g'lidan 24 yosh katta. 6 yildan keyin ota o'g'lidan 3 barobar katta bo'ladi. O'g'il hozir necha yoshda?", o: ["4", "6", "8", "9"], c: 1, e: "O'g'il 6 bo'lsa, ota 30. 6 yildan keyin 12 va 36: 36 = 3 × 12." },
];

const LOGIC_GEN = {
  series() {
    const t = ri(0, 6); let seq, nxt, why;
    if (t === 0) { const s = ri(2, 30), d = ri(3, 12); seq = [0, 1, 2, 3, 4].map(i => s + d * i); nxt = s + d * 5; why = `Har son oldingisidan ${d} ga katta.`; }
    else if (t === 1) { const s = ri(1, 5), r = ri(2, 3); seq = [0, 1, 2, 3, 4].map(i => s * r ** i); nxt = s * r ** 5; why = `Har son oldingisidan ${r} marta katta.`; }
    else if (t === 2) { const a = ri(1, 9), d = ri(1, 4), e = ri(1, 3); seq = [a]; let st = d; for (let i = 0; i < 5; i++) { seq.push(seq[i] + st); st += e; } nxt = seq.pop(); why = `Farqlar ${d}, ${d + e}, ${d + 2 * e}, ... bo'lib ${e} tadan ortadi.`; }
    else if (t === 3) { const a = ri(2, 20), b = ri(2, 20), p = ri(2, 6), q = ri(2, 8); seq = [a, b, a + p, b + q, a + 2 * p, b + 2 * q]; nxt = a + 3 * p; why = `Qator ikkita: ${a}, ${a + p}, ${a + 2 * p}... va ${b}, ${b + q}, ${b + 2 * q}... almashib keladi.`; }
    else if (t === 4) { const c = ri(0, 9), n0 = ri(1, 4); seq = [0, 1, 2, 3, 4].map(i => (n0 + i) ** 2 + c); nxt = (n0 + 5) ** 2 + c; why = `Ketma-ket sonlar kvadrati${c ? ` ustiga ${c}` : ""}.`; }
    else if (t === 5) { const a = ri(1, 5), b = ri(2, 6); seq = [a, b]; while (seq.length < 6) seq.push(seq[seq.length - 1] + seq[seq.length - 2]); nxt = seq[5] + seq[4]; seq = seq.slice(0, 6); why = "Har son oldingi ikkitasining yig'indisi."; }
    else { const c = pick([-1, 1, 2]), s = ri(1, 4); seq = [s]; for (let i = 0; i < 4; i++) seq.push(seq[i] * 2 + c); nxt = seq[4] * 2 + c; why = `Har son oldingisini 2 ga ko'paytirib ${c > 0 ? "+" + c : c} qilinadi.`; }
    const r = numOpts(nxt, [-3, -2, -1, 1, 2, 3, 5, -5, 10]);
    return { q: `Qatorni davom ettiring:\n${seq.join(", ")}, ?`, ...r, e: why + ` Keyingi son: ${nxt}.`, sig: "ser:" + seq.join(",") };
  },
  age() {
    const x = ri(3, 14), k = ri(2, 9), m = ri(2, 4), d = (m - 1) * (x + k);
    const r = numOpts(x, [-3, -2, -1, 1, 2, 3, 4]);
    return { q: `Ota o'g'lidan ${d} yosh katta. ${k} yildan keyin ota o'g'lidan ${m} barobar katta bo'ladi. O'g'il hozir necha yoshda?`, ...r, e: `O'g'il ${x} bo'lsa, ota ${x + d}. ${k} yildan keyin ${x + k} va ${x + d + k}: ${x + d + k} = ${m} × ${x + k}.`, sig: `age:${x}:${k}:${m}` };
  },
  work() {
    const a = pick([2, 3, 4, 5, 6]), mult = ri(2, 4), c = a * mult, b = ri(2, 6) * mult, ans = a * b / c;
    const r = numOpts(ans, [-2, -1, 1, 2, 3, a, -a]);
    return { q: `${a} ta usta bir ishni ${b} kunda bitiradi. Xuddi shu ishni ${c} ta usta (bir xil tezlikda) necha kunda bitiradi?`, ...r, e: `Ustalar ${mult} barobar ko'paydi, vaqt ${mult} barobar kamayadi: ${b} / ${mult} = ${ans} kun.`, sig: `work:${a}:${b}:${c}` };
  },
  speed() {
    const v = pick([40, 45, 50, 60, 70, 80, 90]), t = ri(2, 6);
    if (ri(0, 1)) { const r = numOpts(v * t, [-v, v, -10, 10, 2 * v, -2 * v]); return { q: `Avtomobil soatiga ${v} km tezlikda ${t} soat yurdi. U necha km yo'l bosdi?`, ...r, e: `${v} × ${t} = ${v * t} km.`, sig: `sp1:${v}:${t}` }; }
    const r = numOpts(t, [-2, -1, 1, 2, 3]); return { q: `Avtomobil soatiga ${v} km tezlikda ${v * t} km yo'lni necha soatda bosib o'tadi?`, ...r, e: `${v * t} / ${v} = ${t} soat.`, sig: `sp2:${v}:${t}` };
  },
  percent() {
    for (;;) {
      const p = pick([10, 20, 25, 30, 40, 50, 60, 75]), X = ri(2, 40) * 20;
      if ((X * p) % 100) continue;
      if (ri(0, 1)) { const a = X * p / 100, r = numOpts(a, [-20, -10, -5, 5, 10, 20, X / 10]); return { q: `${X} ning ${p}% i nechaga teng?`, ...r, e: `${X} × ${p} / 100 = ${a}.`, sig: `pc1:${X}:${p}` }; }
      const a = X * (100 - p) / 100, r = numOpts(a, [-20, -10, 10, 20, X * p / 100, -X * p / 100]); return { q: `Mahsulot narxi ${X} ming so'm edi. U ${p}% arzonlashdi. Yangi narx necha ming so'm?`, ...r, e: `Arzonlashish: ${X * p / 100}. ${X} − ${X * p / 100} = ${a}.`, sig: `pc2:${X}:${p}` };
    }
  },
  avg() {
    const a = ri(6, 20), b = ri(6, 20), m = ri(8, 18), c = 3 * m - a - b;
    if (c < 1) return LOGIC_GEN.avg();
    const r = numOpts(c, [-3, -2, -1, 1, 2, 3, 6]);
    return { q: `Uchta sonning o'rtachasi ${m}. Ikkitasi ${a} va ${b}. Uchinchisi nechaga teng?`, ...r, e: `Yig'indi: 3 × ${m} = ${3 * m}. ${3 * m} − ${a} − ${b} = ${c}.`, sig: `avg:${a}:${b}:${m}` };
  },
  clock() {
    const h = ri(1, 12), m = pick([0, 10, 15, 20, 30, 40, 45, 50]);
    let ang = Math.abs(30 * (h % 12) + 0.5 * m - 6 * m); if (ang > 180) ang = 360 - ang;
    const r = numOpts(ang, [-15, 15, -7.5, 7.5, 30, -30, 5, -5]);
    return { q: `Soat ${h}:${String(m).padStart(2, "0")} da soat va daqiqa millari orasidagi kichik burchak necha gradus?`, ...r, e: `Soat mili ${30 * (h % 12) + 0.5 * m}°, daqiqa mili ${6 * m}° da. Farqi ${fmt(ang)}°.`, sig: `clk:${h}:${m}` };
  },
  order() {
    const n = ri(3, 4), nm = shuffle(NAMES).slice(0, n); // nm[0] eng baland ... nm[n-1] eng past
    const rel = nm.slice(0, -1).map((x, i) => `${x} ${nm[i + 1]}dan baland.`); const askLow = ri(0, 1);
    const ans = askLow ? nm[n - 1] : nm[0];
    const o = shuffle([...nm]);
    return { q: `${shuffle(rel).join(" ")}\nKim eng ${askLow ? "past" : "baland"}?`, o, c: o.indexOf(ans), e: `Tartib: ${nm.join(" > ")}. Eng ${askLow ? "past" : "baland"}: ${ans}.`, sig: `ord:${nm.join(",")}:${askLow}` };
  },
  day() {
    const i = ri(0, 6), k = ri(9, 60), back = ri(0, 1), j = ((i + (back ? -k : k)) % 7 + 7) % 7;
    const r = strOpts(DAYS[j], DAYS);
    return { q: `Bugun ${DAYS[i]}. ${k} kun ${back ? "oldin" : "keyin"} qaysi kun ${back ? "bo'lgan" : "bo'ladi"}?`, ...r, e: `${k} = ${Math.floor(k / 7)} hafta + ${k % 7} kun. Hafta aylanib qaytadi, ${k % 7} kun ${back ? "orqaga" : "oldinga"} suriladi: ${DAYS[j]}.`, sig: `day:${i}:${k}:${back}` };
  },
  time() {
    const H = ri(6, 20), M = pick([0, 10, 15, 20, 30, 40, 45]), dh = ri(1, 5), dm = pick([10, 15, 20, 30, 40, 45]);
    const tot = H * 60 + M + dh * 60 + dm, f = x => `${String(Math.floor(x / 60) % 24).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
    const o = uniq([f(tot), f(tot + 10), f(tot - 10), f(tot + 60), f(tot - 60), f(tot + 30)]); const four = shuffle([o[0], ...shuffle(o.slice(1)).slice(0, 3)]);
    return { q: `Poyezd ${f(H * 60 + M)} da yo'lga chiqdi. Yo'lda ${dh} soat ${dm} daqiqa bo'ldi. U soat nechada yetib keladi?`, o: four, c: four.indexOf(f(tot)), e: `${f(H * 60 + M)} + ${dh}:${String(dm).padStart(2, "0")} = ${f(tot)}.`, sig: `tm:${H}:${M}:${dh}:${dm}` };
  },
  pigeon() {
    const n = ri(2, 8), r = numOpts(n + 1, [-1, 1, 2, -2, n]);
    return { q: `Qopda ${n} xil rangdagi paypoqlar aralash. Ko'zingizni yumib olsangiz, albatta bir xil rangli ikkita paypoq chiqishi uchun kamida nechta olish kerak?`, ...r, e: `Eng yomon holda har rangdan bittadan olasiz (${n} ta). Keyingi (${n + 1}-) paypoq albatta juft hosil qiladi.`, sig: `pg:${n}` };
  },
  family() {
    const t = ri(0, 2); let three, odd, why;
    if (t === 0) { const P = shuffle([3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]); three = P.slice(0, 3); odd = pick([9, 15, 21, 25, 27, 33, 35, 39, 45, 49]); why = `${three.join(", ")} tub sonlar (faqat 1 ga va o'ziga bo'linadi). ${odd} esa tub emas.`; }
    else if (t === 1) { const S = shuffle([4, 9, 16, 25, 36, 49, 64, 81, 100, 121]); three = S.slice(0, 3); odd = pick([10, 15, 20, 30, 40, 50, 60, 70, 90, 110]); why = `${three.join(", ")} butun sonning kvadrati. ${odd} esa kvadrat emas.`; }
    else { const C = shuffle([8, 27, 64, 125, 216]); three = C.slice(0, 3); odd = pick([10, 30, 50, 100, 150, 200]); why = `${three.join(", ")} butun sonning kubi. ${odd} esa kub emas.`; }
    const o = shuffle([...three, odd]);
    return { q: "Qaysi son boshqalardan farq qiladi?", o: o.map(String), c: o.indexOf(odd), e: why, sig: `fam:${[...three].sort().join(",")}:${odd}` };
  },
  static() { const s = pick(STATIC); return { ...s, sig: "st:" + s.q.slice(0, 40) }; },
};

/* ======================= SO'Z BOYLIGI ======================= */
// Ma'nodosh guruhlar
const SYN = [
  ["sabr", "toqat"], ["mashaqqat", "qiyinchilik"], ["hamiyatli", "saxovatli"], ["shijoat", "jasorat", "botirlik"], ["loqayd", "befarq"],
  ["zukko", "farosatli"], ["dono", "aqlli", "oqil"], ["ulkan", "bahaybat"], ["chaqqon", "epchil"], ["xursand", "shod", "quvnoq"],
  ["g'amgin", "mahzun"], ["go'zal", "chiroyli", "husnli"], ["tinch", "osoyishta", "sokin"], ["kuchli", "qudratli", "baquvvat"], ["boy", "davlatmand"],
  ["kambag'al", "qashshoq", "nochor"], ["yolg'on", "bo'hton"], ["do'st", "o'rtoq"], ["dushman", "g'anim"], ["mehnat", "zahmat"],
  ["maqsad", "niyat"], ["bilim", "ilm", "ma'rifat"], ["hayron", "lol"], ["g'azab", "jahl"], ["aniq", "ravshan"],
  ["yashirin", "maxfiy"], ["oshkora", "ochiq-oydin"], ["halol", "vijdonli", "insofli"], ["oson", "yengil"], ["murakkab", "mushkul"],
  ["qadimiy", "ko'hna"], ["yordam", "ko'mak", "madad"], ["xonadon", "uy-joy"], ["inson", "odam"], ["baxt", "saodat"],
  ["qalb", "dil"], ["mehribon", "rahmdil", "shafqatli"], ["sodiq", "vafodor"], ["ta'riflamoq", "maqtamoq"], ["urush", "jang"],
  ["xotirjam", "vazmin"], ["takabbur", "kibrli"], ["kamtar", "kamsuqum"], ["aziz", "qadrli"], ["dalil", "isbot"],
  ["g'ayrat", "shijoat-shavq"], ["sirli", "tilsimli"], ["shoshqaloq", "uchqur"], ["sinchkov", "ziyrak"], ["mohir", "usta"],
];
// Qarama-qarshi juftliklar
const ANT = [
  ["baland", "past"], ["katta", "kichik"], ["uzun", "qisqa"], ["keng", "tor"], ["og'ir", "yengil"], ["issiq", "sovuq"], ["yorug'", "qorong'i"],
  ["tez", "sekin"], ["kuchli", "zaif"], ["boy", "kambag'al"], ["quvnoq", "g'amgin"], ["yangi", "eski"], ["toza", "iflos"], ["to'g'ri", "egri"],
  ["shirin", "achchiq"], ["yumshoq", "qattiq"], ["ochiq", "yopiq"], ["to'la", "bo'sh"], ["semiz", "ozg'in"], ["yosh", "qari"], ["erta", "kech"],
  ["yaqin", "uzoq"], ["chuqur", "sayoz"], ["qalin", "yupqa"], ["quruq", "ho'l"], ["yaxshi", "yomon"], ["haqiqat", "yolg'on"], ["do'st", "dushman"],
  ["tinchlik", "urush"], ["kunduz", "tun"], ["kirmoq", "chiqmoq"], ["ko'tarilmoq", "tushmoq"], ["boshlamoq", "tugatmoq"], ["yig'lamoq", "kulmoq"],
  ["olmoq", "bermoq"], ["g'alaba", "mag'lubiyat"], ["ko'p", "oz"], ["mo'l", "kam"], ["ehtiyotkor", "beparvo"], ["mag'rur", "kamtar"],
  ["dono", "nodon"], ["jasur", "qo'rqoq"], ["mehnatkash", "dangasa"], ["saxiy", "xasis"], ["quvonch", "qayg'u"], ["sevgi", "nafrat"],
  ["oldin", "keyin"], ["ichki", "tashqi"], ["o'ng", "chap"], ["shimol", "janub"], ["sharq", "g'arb"], ["yuqori", "quyi"], ["birinchi", "oxirgi"],
  ["ishonch", "shubha"], ["foyda", "zarar"], ["mashhur", "nomalum"], ["sodda", "murakkab"], ["halol", "harom"], ["aniq", "noaniq"],
];
const CATS = {
  "mevalar": ["olma", "nok", "uzum", "shaftoli", "behi", "anor", "o'rik", "gilos", "anjir"],
  "sabzavotlar": ["sholg'om", "sabzi", "piyoz", "karam", "lavlagi", "kartoshka", "turp"],
  "uy hayvonlari": ["sigir", "qo'y", "echki", "ot", "eshak", "tuya"],
  "yovvoyi hayvonlar": ["bo'ri", "sher", "yo'lbars", "tulki", "ayiq", "qoplon"],
  "qushlar": ["chumchuq", "qaldirg'och", "burgut", "kaptar", "bulbul", "laylak"],
  "transport vositalari": ["poyezd", "samolyot", "avtobus", "velosiped", "kema", "tramvay"],
  "kasblar": ["shifokor", "o'qituvchi", "muhandis", "haydovchi", "oshpaz", "quruvchi", "tikuvchi"],
  "ranglar": ["qizil", "ko'k", "yashil", "sariq", "qora", "oq"],
  "shakllar": ["kvadrat", "uchburchak", "doira", "to'rtburchak", "romb", "oval"],
  "tana a'zolari": ["qo'l", "oyoq", "ko'z", "quloq", "burun", "tish"],
  "uy jihozlari": ["stol", "stul", "shkaf", "divan", "karavot"],
  "idish-tovoq": ["kosa", "likopcha", "piyola", "choynak", "qozon"],
  "cholg'u asboblari": ["nay", "dutor", "tanbur", "rubob", "g'ijjak", "surnay"],
  "O'zbekiston shaharlari": ["Toshkent", "Samarqand", "Buxoro", "Xiva", "Qarshi", "Namangan", "Andijon", "Farg'ona"],
  "fasllar": ["bahor", "yoz", "kuz", "qish"],
};
const CAT_PAIRS = [
  ["mevalar", "sabzavotlar"], ["mevalar", "kasblar"], ["sabzavotlar", "uy hayvonlari"], ["uy hayvonlari", "qushlar"], ["yovvoyi hayvonlar", "uy hayvonlari"],
  ["qushlar", "transport vositalari"], ["transport vositalari", "tana a'zolari"], ["kasblar", "ranglar"], ["ranglar", "shakllar"], ["shakllar", "tana a'zolari"],
  ["uy jihozlari", "idish-tovoq"], ["cholg'u asboblari", "uy jihozlari"], ["O'zbekiston shaharlari", "kasblar"], ["fasllar", "ranglar"], ["mevalar", "uy jihozlari"],
  ["kasblar", "O'zbekiston shaharlari"], ["tana a'zolari", "cholg'u asboblari"], ["yovvoyi hayvonlar", "qushlar"],
];
const REL = {
  "bajaradi": [["qalam", "yozmoq"], ["pichoq", "kesmoq"], ["ko'z", "ko'rmoq"], ["quloq", "eshitmoq"], ["oyoq", "yurmoq"], ["burun", "hidlamoq"], ["qush", "uchmoq"], ["baliq", "suzmoq"], ["oshpaz", "pishirmoq"], ["shifokor", "davolamoq"], ["o'qituvchi", "o'rgatmoq"], ["rassom", "chizmoq"], ["haydovchi", "haydamoq"], ["tikuvchi", "tikmoq"]],
  "qismi": [["g'ildirak", "mashina"], ["barg", "daraxt"], ["sahifa", "kitob"], ["parrak", "samolyot"], ["tugma", "ko'ylak"], ["g'isht", "devor"], ["klaviatura", "kompyuter"], ["shox", "daraxt"]],
  "poytaxti": [["O'zbekiston", "Toshkent"], ["Qozog'iston", "Ostona"], ["Turkiya", "Anqara"], ["Yaponiya", "Tokio"], ["Fransiya", "Parij"], ["Germaniya", "Berlin"], ["Italiya", "Rim"], ["Misr", "Qohira"], ["Rossiya", "Moskva"], ["Xitoy", "Pekin"], ["Ispaniya", "Madrid"]],
  "bolasi": [["sigir", "buzoq"], ["qo'y", "qo'zi"], ["ot", "toy"], ["tovuq", "jo'ja"], ["it", "kuchuk"], ["tuya", "bo'taloq"]],
  "ish joyi": [["shifokor", "kasalxona"], ["o'qituvchi", "maktab"], ["oshpaz", "oshxona"], ["dehqon", "dala"], ["sportchi", "stadion"], ["aktyor", "teatr"], ["sudya", "sud"]],
};
const WORD_REL = (() => { const m = new Map(); const link = (a, b) => { (m.get(a) || m.set(a, new Set()).get(a)).add(b); }; [...SYN, ...ANT].forEach(g => g.forEach(a => g.forEach(b => a !== b && link(a, b)))); return m; })();
const ALLW = uniq([...SYN.flat(), ...ANT.flat()]);
const related = (a, b) => a === b || WORD_REL.get(a)?.has(b);
function distract(correct, base, n = 3) {
  const ok = shuffle(ALLW).filter(w => !related(w, base) && !related(w, correct) && w !== correct && w !== base);
  return ok.slice(0, n);
}

const WORD_GEN = {
  syn() {
    const g = pick(SYN), w = pick(g), ans = pick(g.filter(x => x !== w));
    const o = shuffle([ans, ...distract(ans, w)]);
    return { q: `“${w}” so'zining ma'nodoshi qaysi?`, o, c: o.indexOf(ans), e: `${w} va ${ans} bir xil ma'noni bildiradi.`, sig: `syn:${w}:${ans}` };
  },
  ant() {
    const p = pick(ANT), f = ri(0, 1), w = p[f], ans = p[1 - f];
    const o = shuffle([ans, ...distract(ans, w)]);
    return { q: `“${w}” so'ziga qarama-qarshi ma'noli so'z qaysi?`, o, c: o.indexOf(ans), e: `${w} ↔ ${ans}: bir-biriga zid ma'noli juftlik.`, sig: `ant:${w}:${ans}` };
  },
  odd() {
    const [ca, cb] = pick(CAT_PAIRS), flip = ri(0, 1), A = flip ? cb : ca, B = flip ? ca : cb;
    const three = shuffle(CATS[A]).slice(0, 3), odd = pick(CATS[B]), o = shuffle([...three, odd]);
    return { q: "Qaysi so'z boshqalardan farq qiladi?", o, c: o.indexOf(odd), e: `${three.join(", ")} — ${A}. ${odd} esa ${B}ga kiradi.`, sig: `odd:${three.sort().join(",")}:${odd}` };
  },
  analogy() {
    const kind = pick(Object.keys(REL)), P = shuffle(REL[kind]), [a, b] = P[0], [c, d] = P[1];
    const o = shuffle([d, ...P.slice(2).map(p => p[1]), ...REL[kind].filter(p => p[1] !== d && p[1] !== b).map(p => p[1])].filter((x, i, arr) => arr.indexOf(x) === i && x !== b)).slice(0, 4);
    if (!o.includes(d)) o[ri(0, 3)] = d;
    const out = uniq(o); while (out.length < 4) { const x = pick(ALLW); if (!out.includes(x) && x !== b) out.push(x); }
    const oo = shuffle(out.slice(0, 4).includes(d) ? out.slice(0, 4) : [d, ...out.slice(0, 3)]);
    const rel = { bajaradi: "bajaradigan ish", qismi: "qismi va butun", poytaxti: "davlat va poytaxt", bolasi: "ona hayvon va bolasi", "ish joyi": "kasb va ish joyi" }[kind];
    return { q: `${a} : ${b} = ${c} : ?`, o: oo, c: oo.indexOf(d), e: `Munosabat: ${rel}. ${a} → ${b}, shuning uchun ${c} → ${d}.`, sig: `an:${a}:${c}` };
  },
};

/* ======================= umumiy: ko'rilganlarni eslab qolish ======================= */
const seenKey = k => "iqx:seen:" + k;
function loadSeen(k) { try { return new Set(JSON.parse(localStorage.getItem(seenKey(k))) || []); } catch (e) { return new Set(); } }
function saveSeen(k, set) { try { localStorage.setItem(seenKey(k), JSON.stringify([...set].slice(-2500))); } catch (e) {} }

function build(kind, GEN, n, order) {
  const seen = loadSeen(kind), used = new Set(), out = [];
  const names = order || Object.keys(GEN);
  const queue = []; while (queue.length < n) queue.push(...shuffle(names));
  for (const name of queue.slice(0, n)) {
    let q = null;
    for (let i = 0; i < 40; i++) { const c = GEN[name](); if (c && !seen.has(c.sig) && !used.has(c.sig) && new Set(c.o).size === c.o.length) { q = c; break; } }
    if (!q) { do q = GEN[name](); while (!q || used.has(q.sig)); }
    used.add(q.sig); seen.add(q.sig); out.push(q);
  }
  saveSeen(kind, seen);
  return out;
}
// 'static' mantiqda kamroq tushsin: u bir marta qo'shiladi, boshqa turlar ko'proq
export const genLogic = (n = 10) => build("logic", LOGIC_GEN, n, ["series", "age", "work", "speed", "percent", "avg", "clock", "order", "day", "time", "pigeon", "family", "static", "series", "order", "family"]);
export const genWords = (n = 12) => build("words", WORD_GEN, n, ["syn", "ant", "odd", "analogy", "syn", "ant"]);
export const bankSize = () => ({ syn: SYN.reduce((s, g) => s + g.length * (g.length - 1), 0), ant: ANT.length * 2 });
