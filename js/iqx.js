// Qo'shimcha bepul testlar: xotira, reaksiya, diqqat, tez hisob, hissiy aql, shaxsiyat, so'z boyligi, mantiq.
// Hammasi telefonning o'zida ishlaydi. Natijalar o'yin-kulgi uchun, IQ ball emas.
import { app, show, header, bindBack, toast, esc, back } from "./core.js";
import { genLogic, genWords } from "./iqbank.js";
import { iqScreen, getBest, setBest, shareText, shuffle, ri, tickH, noteH } from "./iqui.js";

/* ---------- umumiy ko'rinishlar ---------- */
function intro(a, o) {
  a.innerHTML = `${header(o.title)}
    <section class="iqx-intro"><div class="ico">${o.ico}</div><h2>${esc(o.title)}</h2>
    ${o.lines.map(l => `<p>${l}</p>`).join("")}
    ${o.best != null ? `<span class="pill">Rekordingiz: ${esc(String(o.best))}</span>` : ""}
    <button class="btn" data-go style="margin-top:16px">Boshlash</button></section>`;
  bindBack(); a.querySelector("[data-go]").onclick = o.start;
}

// o: {id,title,ico,kicker,big,level,text,bars,again,share,note,newBest}
function result(a, o) {
  a.innerHTML = `${header(o.title)}
    <section class="iq-res card">
      <div style="font-size:44px">${o.ico}</div>
      ${o.kicker ? `<p class="small muted center" style="margin:6px 0 0">${esc(o.kicker)}</p>` : ""}
      <div class="iq-big iqx-big">${esc(String(o.big))}</div>
      <div class="center"><span class="iq-level">${esc(o.level)}</span></div>
      <p class="center" style="margin:12px 0 4px">${esc(o.text)}</p>
      ${o.newBest ? `<p class="center" style="margin:6px 0 0;font-weight:700;color:var(--green)">🎉 Yangi rekord!</p>` : ""}
    </section>
    ${o.bars ? `<div class="card">${o.bars.map(b => `<div class="iq-sbar"><div><span>${esc(b.n)}</span><b>${b.pct}%</b></div><div class="t"><i style="width:${b.pct}%"></i></div>${b.d ? `<small class="muted">${esc(b.d)}</small>` : ""}</div>`).join("")}</div>` : ""}
    <div class="hint" style="background:rgba(242,179,61,.14);color:var(--ink)">${esc(o.note || "Bu o'yin-kulgi uchun test. Rasmiy o'lchov yoki tashxis emas.")}</div>
    <div class="stack" style="margin-top:12px">
      <button class="btn" data-again>Qayta urinish</button>
      <button class="btn alt" data-share>📨 Do'stlarga yuborish</button>
      <button class="btn alt" data-more>Boshqa testlar</button>
    </div>`;
  bindBack();
  a.querySelector("[data-again]").onclick = o.again;
  a.querySelector("[data-share]").onclick = () => shareText(o.share);
  a.querySelector("[data-more]").onclick = () => back();
}

/* ---------- 1. Xotira: raqamlar qatori ---------- */
function memoryTest() {
  let len = 3, lives = 2, best = 0, seq = [], typed = [], timer = 0, alive = true;
  const S = iqScreen({
    busy: true,
    render() {
      const a = app(); alive = true;
      intro(a, { ico: "🔢", title: "Xotira testi", best: getBest("memory"),
        lines: ["Ekranda raqamlar birin-ketin chiqadi. Ularni xuddi shu tartibda takrorlang.", "Har to'g'ri javobdan keyin qator 1 raqamga uzayadi. 2 marta xato qilsangiz test tugaydi."],
        start: () => round() });
      const hearts = () => "❤️".repeat(lives) + "🤍".repeat(2 - lives);
      const round = () => {
        seq = []; typed = [];
        for (let i = 0; i < len; i++) { let d; do d = ri(0, 9); while (i && d === seq[i - 1]); seq.push(d); }
        a.innerHTML = `${header("Xotira testi")}<div class="iqx-top"><span class="pill">${len} ta raqam</span><span>${hearts()}</span></div>
          <div class="iqx-digit" data-d><span style="font-size:22px;font-family:var(--text);color:var(--muted)">Tayyor bo'ling…</span></div><p class="center muted small" data-hint>Raqamlarni eslab qoling</p>`;
        bindBack();
        const d = a.querySelector("[data-d]");
        let i = 0;
        timer = setTimeout(function next() {
          if (!alive) return;
          if (i < seq.length) { d.textContent = seq[i++]; d.classList.add("pop"); timer = setTimeout(() => { d.textContent = ""; d.classList.remove("pop"); timer = setTimeout(next, 250); }, 650); }
          else input();
        }, 900);
      };
      const input = () => {
        a.innerHTML = `${header("Xotira testi")}<div class="iqx-top"><span class="pill">${len} ta raqam</span><span>${hearts()}</span></div>
          <div class="iqx-digit small" data-d>…</div><p class="center muted small">Raqamlarni xuddi shu tartibda kiriting</p>
          <div class="iqx-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-n="${n}">${n}</button>`).join("")}<button class="alt" data-del>⌫</button><button data-n="0">0</button><button class="ok" data-ok>OK</button></div>`;
        bindBack();
        const disp = a.querySelector("[data-d]"), paint = () => { disp.textContent = typed.join(" ") || "…"; }; paint();
        a.querySelectorAll("[data-n]").forEach(b => b.onclick = () => { if (typed.length < len) { typed.push(+b.dataset.n); tickH(); paint(); } });
        a.querySelector("[data-del]").onclick = () => { typed.pop(); paint(); };
        a.querySelector("[data-ok]").onclick = () => {
          if (typed.length < len) return toast(`Yana ${len - typed.length} ta raqam kiriting`);
          if (typed.join("") === seq.join("")) { best = len; len++; noteH("success"); disp.classList.add("good"); timer = setTimeout(() => alive && round(), 700); }
          else { lives--; noteH("error"); disp.classList.add("bad"); disp.textContent = seq.join(" "); timer = setTimeout(() => { if (!alive) return; if (lives <= 0) end(); else round(); }, 1400); }
        };
      };
      const end = () => {
        const nb = setBest("memory", best);
        const lv = best >= 10 ? ["Ajoyib xotira", "Juda kam odam shuncha raqamni eslab qola oladi."] : best >= 8 ? ["Juda yaxshi", "Bu o'rtachadan ancha yuqori natija."] : best >= 6 ? ["Yaxshi", "Katta yoshli odamlarning ko'pchiligi 6–7 raqam atrofida eslab qoladi."] : best >= 4 ? ["O'rtacha", "Diqqatni jamlab, qayta urinib ko'ring. Raqamlarni guruhlab eslash yordam beradi."] : ["Boshlang'ich", "Charchoq yoki chalg'ish ham ta'sir qiladi. Tinch joyda qayta sinab ko'ring."];
        result(a, { id: "memory", title: "Xotira testi", ico: "🔢", kicker: "Eng uzun qator", big: best, level: lv[0], text: lv[1], newBest: nb.better,
          again: () => show(memoryTest(), false), share: `Xotira testida ${best} ta raqamlik qatorni eslab qoldim. Sen nechtagacha eslaysan?` });
      };
    },
    leave() { alive = false; clearTimeout(timer); },
  });
  return S;
}

/* ---------- 2. Reaksiya tezligi ---------- */
function reactionTest() {
  let timer = 0, alive = true;
  return iqScreen({
    busy: true,
    render() {
      const a = app(); alive = true;
      intro(a, { ico: "⚡", title: "Reaksiya tezligi", best: getBest("react") ? getBest("react") + " ms" : null,
        lines: ["Ekran qizil bo'lganda kuting. Yashil bo'lishi bilan tezroq bosing.", "5 urinishning o'rtachasi hisoblanadi. Erta bossangiz urinish qaytariladi."],
        start: () => game() });
      const game = () => {
        const times = []; let state = "", t0 = 0;
        a.innerHTML = `${header("Reaksiya tezligi")}<div class="iqx-top"><span class="pill" data-c>1 / 5</span><span class="muted small">Bosing: yashil bo'lganda</span></div><button class="iqx-react wait" data-r><b>Kuting…</b><small>Yashil bo'lishini</small></button>`;
        bindBack();
        const box = a.querySelector("[data-r]"), cnt = a.querySelector("[data-c]");
        const set = (cls, t, s) => { box.className = "iqx-react " + cls; box.innerHTML = `<b>${t}</b><small>${s || ""}</small>`; };
        const start = () => { if (!alive) return; state = "wait"; set("wait", "Kuting…", "Yashil bo'lishini"); timer = setTimeout(() => { if (!alive) return; state = "go"; t0 = performance.now(); set("go", "BOSING!", ""); }, ri(1200, 3600)); };
        box.addEventListener("pointerdown", () => {
          if (state === "wait") { clearTimeout(timer); state = "x"; noteH("warning"); set("early", "Juda erta 😅", "Qaytadan boshlaymiz"); timer = setTimeout(start, 1100); }
          else if (state === "go") {
            const ms = Math.round(performance.now() - t0); times.push(ms); state = "x"; tickH();
            cnt.textContent = `${Math.min(5, times.length + 1)} / 5`;
            if (times.length >= 5) { timer = setTimeout(() => alive && end(times), 500); set("done", ms + " ms", "Tayyor!"); }
            else { set("done", ms + " ms", "Yaxshi, keyingisi…"); timer = setTimeout(start, 1000); }
          }
        });
        timer = setTimeout(start, 600);
      };
      const end = (times) => {
        const avg = Math.round(times.reduce((x, y) => x + y, 0) / times.length), minv = Math.min(...times);
        const nb = setBest("react", avg, false);
        const lv = avg < 220 ? ["Chaqmoq ⚡", "Juda tez reaksiya, bu o'rtachadan yaxshiroq."] : avg < 270 ? ["Tez", "Reaksiyangiz o'rtachadan tez."] : avg < 340 ? ["O'rtacha", "Katta yoshli odamlarda odatda 250–330 ms atrofida bo'ladi."] : ["Sekinroq", "Charchoq, qo'l holati va telefon ham ta'sir qiladi. Qayta sinab ko'ring."];
        result(a, { id: "react", title: "Reaksiya tezligi", ico: "⚡", kicker: `O'rtacha · eng tezi ${minv} ms`, big: avg + " ms", level: lv[0], text: lv[1], newBest: nb.better,
          note: "Telefon ekrani va internet ham bir necha o'n millisekund qo'shishi mumkin. O'yin-kulgi uchun.",
          again: () => show(reactionTest(), false), share: `Reaksiya testida o'rtacha ${avg} ms natija oldim. Sen tezroqmisan?` });
      };
    },
    leave() { alive = false; clearTimeout(timer); },
  });
}

/* ---------- 3. Diqqat: boshqasini toping ---------- */
const PAIRS = [["O", "Q"], ["E", "F"], ["b", "d"], ["M", "N"], ["p", "q"], ["C", "G"], ["6", "9"], ["U", "V"]];
function attentionTest() {
  let iv = 0, alive = true;
  return iqScreen({
    busy: true,
    render() {
      const a = app(); alive = true;
      intro(a, { ico: "🔍", title: "Diqqat testi", best: getBest("focus"),
        lines: ["Harflar to'rida bittasi boshqalardan farq qiladi. Uni toping va bosing.", "Vaqt: 45 soniya. Noto'g'ri bossangiz 2 soniya yo'qotasiz. To'r har safar kattalashib boradi."],
        start: () => game() });
      const game = () => {
        let score = 0, wrong = 0, deadline = Date.now() + 45000;
        a.innerHTML = `${header("Diqqat testi")}<div class="iqx-top"><span class="pill" data-s>0 ta</span><span class="iq-timer" data-t>0:45</span></div><div class="iq-bar"><i data-bar></i></div><div data-grid></div>`;
        bindBack();
        const grid = a.querySelector("[data-grid]");
        const draw = () => {
          const g = Math.min(7, 4 + Math.floor(score / 3)), p = shuffle(PAIRS[ri(0, PAIRS.length - 1)]), odd = ri(0, g * g - 1);
          grid.innerHTML = `<div class="iqx-find" style="grid-template-columns:repeat(${g},1fr)">${Array.from({ length: g * g }, (_, i) => `<button data-i="${i}">${p[i === odd ? 1 : 0]}</button>`).join("")}</div>`;
          grid.querySelectorAll("button").forEach(b => b.onpointerdown = () => {
            if (+b.dataset.i === odd) { score++; tickH(); a.querySelector("[data-s]").textContent = score + " ta"; draw(); }
            else { wrong++; deadline -= 2000; noteH("error"); b.classList.add("bad"); }
          });
        };
        draw();
        iv = setInterval(() => {
          const left = Math.max(0, deadline - Date.now()), sec = Math.ceil(left / 1000);
          const t = a.querySelector("[data-t]"); if (!t) return clearInterval(iv);
          t.textContent = `0:${String(sec).padStart(2, "0")}`; t.classList.toggle("low", sec <= 10);
          a.querySelector("[data-bar]").style.width = (100 * (1 - left / 45000)) + "%";
          if (left <= 0) { clearInterval(iv); end(score, wrong); }
        }, 200);
      };
      const end = (score, wrong) => {
        const nb = setBest("focus", score);
        const lv = score >= 22 ? ["Lazer nigoh 🎯", "Diqqatingiz juda o'tkir."] : score >= 15 ? ["Yaxshi", "Mayda farqlarni tez ilg'aysiz."] : score >= 8 ? ["O'rtacha", "Mashq bilan yaxshilanadi."] : ["Boshlang'ich", "Shoshilmang: avval ko'z bilan skanerlang, keyin bosing."];
        result(a, { id: "focus", title: "Diqqat testi", ico: "🔍", kicker: `${wrong} ta xato`, big: score, level: lv[0], text: lv[1], newBest: nb.better,
          again: () => show(attentionTest(), false), share: `Diqqat testida 45 soniyada ${score} ta farqni topdim. Sen nechta topasan?` });
      };
    },
    leave() { alive = false; clearInterval(iv); },
  });
}

/* ---------- 4. Tez hisob ---------- */
function mathQ(L) {
  let q, ans;
  const t = L < 2 ? ri(0, 1) : L < 4 ? ri(0, 2) : ri(0, 3);
  if (t === 0) { const a = ri(L ? 10 : 2, 20 + L * 12), b = ri(2, 20 + L * 10); q = `${a} + ${b}`; ans = a + b; }
  else if (t === 1) { const a = ri(15, 40 + L * 12), b = ri(2, a - 1); q = `${a} − ${b}`; ans = a - b; }
  else if (t === 2) { const a = ri(3, 9 + Math.floor(L / 2)), b = ri(3, 9 + Math.floor(L / 2)); q = `${a} × ${b}`; ans = a * b; }
  else { const a = ri(5, 30), b = ri(2, 9), c = ri(2, 9); q = `${a} + ${b} × ${c}`; ans = a + b * c; }
  const set = new Set([ans]);
  const offs = shuffle([-10, -2, -1, 1, 2, 10, 3, -3]);
  for (const o of offs) { if (set.size >= 4) break; if (ans + o > 0) set.add(ans + o); }
  return { q, ans, opts: shuffle([...set]) };
}
function mathTest() {
  let iv = 0, alive = true;
  return iqScreen({
    busy: true,
    render() {
      const a = app(); alive = true;
      intro(a, { ico: "➕", title: "Tez hisob", best: getBest("math"),
        lines: ["60 soniyada iloji boricha ko'p misolni yeching. 4 ta variantdan to'g'risini tanlang.", "Har to'g'ri javob +1, xato javob −1 ball. Misollar asta-sekin qiyinlashadi."],
        start: () => game() });
      const game = () => {
        let ok = 0, bad = 0, deadline = Date.now() + 60000, cur;
        a.innerHTML = `${header("Tez hisob")}<div class="iqx-top"><span class="pill" data-s>0 ball</span><span class="iq-timer" data-t>1:00</span></div><div class="iq-bar"><i data-bar></i></div><div class="iqx-mq" data-q></div><div class="iqx-mopts" data-o></div>`;
        bindBack();
        const draw = () => {
          cur = mathQ(Math.floor(ok / 4));
          a.querySelector("[data-q]").textContent = cur.q + " = ?";
          const o = a.querySelector("[data-o]");
          o.innerHTML = cur.opts.map(v => `<button data-v="${v}">${v}</button>`).join("");
          o.querySelectorAll("button").forEach(b => b.onpointerdown = () => {
            if (+b.dataset.v === cur.ans) { ok++; tickH(); } else { bad++; noteH("error"); }
            a.querySelector("[data-s]").textContent = Math.max(0, ok - bad) + " ball"; draw();
          });
        };
        draw();
        iv = setInterval(() => {
          const left = Math.max(0, deadline - Date.now()), sec = Math.ceil(left / 1000);
          const t = a.querySelector("[data-t]"); if (!t) return clearInterval(iv);
          t.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; t.classList.toggle("low", sec <= 10);
          a.querySelector("[data-bar]").style.width = (100 * (1 - left / 60000)) + "%";
          if (left <= 0) { clearInterval(iv); end(ok, bad); }
        }, 200);
      };
      const end = (ok, bad) => {
        const sc = Math.max(0, ok - bad), nb = setBest("math", sc);
        const lv = sc >= 24 ? ["Jonli kalkulyator 🧮", "Hisoblash tezligingiz a'lo."] : sc >= 16 ? ["Yaxshi", "Tez va aniq hisoblaysiz."] : sc >= 8 ? ["O'rtacha", "Mashq bilan tezlik oshadi."] : ["Boshlang'ich", "Shoshilmay, aniqlikka e'tibor bering."];
        result(a, { id: "math", title: "Tez hisob", ico: "➕", kicker: `${ok} to'g'ri · ${bad} xato`, big: sc, level: lv[0], text: lv[1], newBest: nb.better,
          again: () => show(mathTest(), false), share: `Tez hisob testida 60 soniyada ${sc} ball oldim. Sen necha olasan?` });
      };
    },
    leave() { alive = false; clearInterval(iv); },
  });
}

/* ---------- viktorina dvigateli (EQ, so'z, mantiq) ---------- */
// mode "points": har variantda p ball bor, javob to'g'ri/noto'g'ri deb ko'rsatilmaydi
// mode "right":  bitta to'g'ri javob (c) va izoh (e) ko'rsatiladi
function quizScreen(cfg) {
  const items = typeof cfg.items === "function" ? cfg.items() : cfg.mode === "right" ? shuffle(cfg.items).slice(0, cfg.count || cfg.items.length) : cfg.items;
  let i = 0, total = 0, locked = false; const tags = {};
  return iqScreen({
    busy: true,
    render() {
      const a = app();
      const head = () => `${header(cfg.title)}<div class="iqx-top"><span class="pill">${i + 1} / ${items.length}</span><span class="muted small">${esc(cfg.sub || "")}</span></div><div class="iq-bar"><i style="width:${100 * i / items.length}%"></i></div>`;
      const draw = () => {
        const it = items[i]; locked = false;
        const opts = cfg.mode === "right" ? shuffle(it.o.map((t, k) => ({ t, p: k === it.c ? 1 : 0 }))) : it.o;
        a.innerHTML = `${head()}<div class="iq-q">${esc(it.q)}</div><div class="iq-opts">${opts.map((o, k) => `<button class="iq-opt" data-k="${k}"><i>${"ABCD"[k]}</i><span>${esc(o.t)}</span></button>`).join("")}</div><div data-fb></div>`;
        bindBack();
        a.querySelectorAll("[data-k]").forEach(b => b.onclick = () => {
          if (locked) return; locked = true; tickH();
          const o = opts[+b.dataset.k]; total += o.p;
          if (it.tag) { tags[it.tag] = tags[it.tag] || { p: 0, m: 0 }; tags[it.tag].p += o.p; tags[it.tag].m += 3; }
          const last = i === items.length - 1, nextBtn = () => { if (last) end(); else { i++; draw(); } };
          if (cfg.mode === "right") {
            a.querySelectorAll("[data-k]").forEach((x, j) => { if (opts[j].p) x.classList.add("good"); else if (j === +b.dataset.k) x.classList.add("bad"); });
            a.querySelector("[data-fb]").innerHTML = `<div class="card" style="margin-top:14px"><b>${o.p ? "To'g'ri ✅" : "Hechqisi yo'q ❌"}</b><p class="small muted" style="margin:6px 0 0">${esc(it.e || "")}</p></div><button class="btn" style="margin-top:12px" data-n>${last ? "Natijani ko'rish" : "Keyingisi →"}</button>`;
            a.querySelector("[data-n]").onclick = nextBtn;
          } else { b.classList.add("sel"); setTimeout(nextBtn, 280); }
        });
      };
      const end = () => cfg.finish(a, { total, tags, count: items.length, again: () => show(quizScreen(cfg), false) });
      if (cfg.intro) intro(a, { ico: cfg.ico, title: cfg.title, best: cfg.best ? cfg.best() : null, lines: cfg.intro, start: draw }); else draw();
    },
  });
}

/* ---------- 5. Hissiy aql (EQ) ---------- */
const EQ_AREAS = { A: "O'zini anglash", B: "O'zini boshqarish", C: "Hamdardlik", D: "Odamlar bilan muomala" };
const EQ = [
  { tag: "A", q: "Kun davomida kayfiyatingiz birdan tushib ketdi. Odatda nima qilasiz?", o: [{ t: "Sababini o'ylab ko'raman: charchoqmi, xafagarchilikmi, ochlikmi", p: 3 }, { t: "Sababini bilmayman, lekin dam olishga harakat qilaman", p: 2 }, { t: "Telefonga cho'mib, o'zimni chalg'itaman", p: 1 }, { t: "Kimdir aybdor deb o'ylayman", p: 0 }] },
  { tag: "B", q: "Sizni jamoa oldida qattiq tanqid qilishdi.", o: [{ t: "Darhol qarshi javob qaytaraman", p: 0 }, { t: "Nafasni rostlab, gapni oxirigacha eshitaman, keyin xotirjam javob beraman", p: 3 }, { t: "Jim turaman, lekin ichimda uzoq g'azablanib yuraman", p: 1 }, { t: "Keyinroq yakkama-yakka gaplashishni so'rayman", p: 2 }] },
  { tag: "C", q: "Do'stingiz xafa ko'rinadi, lekin “hammasi joyida” deydi.", o: [{ t: "“Yaxshi” degani bilan o'tib ketaman", p: 0 }, { t: "Nima bo'lganini qayta-qayta so'rayman", p: 1 }, { t: "Bosim qilmayman, “tinglashga tayyorman” deb yoniga o'tiraman", p: 3 }, { t: "Uni kuldirish uchun hazil qilaman", p: 2 }] },
  { tag: "D", q: "Jamoada ikki kishi o'rtasida kelishmovchilik chiqdi, siz o'rtadasiz.", o: [{ t: "Aralashmayman, o'zlari hal qilsin", p: 1 }, { t: "Eng ovozli odam tomoniga o'taman", p: 0 }, { t: "Ikkala tomonni alohida eshitib, umumiy yechim taklif qilaman", p: 3 }, { t: "Yarashtirishga harakat qilaman, lekin kimning haqligini aytmayman", p: 2 }] },
  { tag: "A", q: "Qaysi gap sizga ko'proq mos?", o: [{ t: "Nima his qilayotganimni ko'pincha ayta olmayman", p: 0 }, { t: "G'azablanayotganimni tanamdan sezaman: yurak urishi, qisilish", p: 3 }, { t: "Odatda sezaman, lekin ba'zan kech", p: 2 }, { t: "Faqat portlab bo'lgandan keyin tushunaman", p: 1 }] },
  { tag: "B", q: "Muhim ish oldida kuchli stress bosdi.", o: [{ t: "Boshqa narsalar bilan band bo'lib, ishni keyinga qoldiraman", p: 1 }, { t: "O'zimni ayblayman, baribir chiqmaydi", p: 0 }, { t: "Nafas mashqi yoki yurish bilan tinchlanib, keyin boshlayman", p: 2 }, { t: "Ishni mayda qadamlarga bo'lib, birinchisidan boshlayman", p: 3 }] },
  { tag: "C", q: "Yangi hamkasbingiz yig'ilishda deyarli gapirmayapti.", o: [{ t: "Bu uning muammosi", p: 0 }, { t: "Uyatchan ekan deb o'tkazib yuboraman", p: 1 }, { t: "Tanaffusda yoniga borib tanishaman", p: 2 }, { t: "Fikrini so'rayman va gapirishi uchun joy ochaman", p: 3 }] },
  { tag: "D", q: "Siz noto'g'ri bo'lib chiqdingiz.", o: [{ t: "Ochiq tan olaman va tuzataman", p: 3 }, { t: "Tan olaman, lekin ichimda uzoq qiynalaman", p: 2 }, { t: "Tan olaman, lekin bahona qo'shaman", p: 1 }, { t: "Mavzuni o'zgartirib yuboraman", p: 0 }] },
  { tag: "A", q: "Qaror qabul qilayotganda his-tuyg'ularingizga munosabatingiz qanday?", o: [{ t: "Hissiyotlar mantiqqa xalaqit, ularga e'tibor bermayman", p: 0 }, { t: "Ko'pincha his bilan qaror qilaman, keyin pushaymon bo'laman", p: 1 }, { t: "Avval mantiq, his-tuyg'uni keyin o'ylayman", p: 2 }, { t: "Hisni hisobga olaman, lekin faktlar bilan tekshiraman", p: 3 }] },
  { tag: "D", q: "Kimdir yordam so'radi, lekin siz band edingiz.", o: [{ t: "“Xo'p” deb qo'yaman-u, keyin bajarmayman", p: 0 }, { t: "Ishimni tashlab hammasini bajaraman, o'zim charchasam ham", p: 1 }, { t: "Qisqa rad etaman va yordam beradigan boshqa odamni aytaman", p: 2 }, { t: "Hozir bandligimni tushuntirib, qachon yordam bera olishimni aytaman", p: 3 }] },
];
const eqTest = () => quizScreen({
  mode: "points", items: EQ, title: "Hissiy aql (EQ)", ico: "💗", sub: "To'g'ri javob yo'q", best: () => getBest("eq") != null ? getBest("eq") + " / 30" : null,
  intro: ["Kundalik vaziyatlar berilgan. O'zingizga eng mos javobni tanlang.", "To'g'ri yoki noto'g'ri javob yo'q: o'zingizni halol baholang. 10 ta savol, taxminan 2 daqiqa."],
  finish(a, r) {
    const t = r.total, nb = setBest("eq", t);
    const lv = t >= 25 ? ["Yuqori", "O'z his-tuyg'ularingizni yaxshi anglaysiz va boshqalar bilan iliq, aniq muloqot qilasiz."] : t >= 19 ? ["Yaxshi", "Hissiy jihatdan pishiq odamsiz. Bir-ikki sohada yana rivojlanish mumkin."] : t >= 12 ? ["O'rtacha", "Ko'p holatda o'zingizni boshqarasiz, ba'zan his-tuyg'u ustun keladi. Bu normal va rivojlantiriladi."] : ["Rivojlanish uchun joy bor", "Hissiy ko'nikmalar mashq bilan o'sadi. Kichik odatdan boshlang: kun oxirida nima his qilganingizni yozib qo'ying."];
    result(a, { id: "eq", title: "Hissiy aql (EQ)", ico: "💗", kicker: "Umumiy ball", big: t + "/30", level: lv[0], text: lv[1], newBest: nb.better,
      bars: Object.keys(EQ_AREAS).map(k => ({ n: EQ_AREAS[k], pct: Math.round(100 * (r.tags[k]?.p || 0) / (r.tags[k]?.m || 1)) })),
      note: "Bu qisqa o'yin-testi, psixologik tashxis emas. Hissiy aql IQ bilan bir narsa emas.",
      again: r.again, share: `Hissiy aql (EQ) testida ${t}/30 oldim: ${lv[0]}. Sen ham sinab ko'r!` });
  },
});

/* ---------- 6. So'z boyligi ---------- */
const WORDS = [
  { q: "“Sabr” so'zining ma'nodoshi qaysi?", o: ["Toqat", "G'azab", "Shoshilish", "Qo'rquv"], c: 0, e: "Sabr va toqat bir xil ma'noda: qiyinchilikka chidash." },
  { q: "“Mashaqqat” so'zining ma'nosi qaysi?", o: ["Quvonch", "Qiyinchilik", "Sovg'a", "Yo'l"], c: 1, e: "Mashaqqat: og'ir mehnat, qiyinchilik." },
  { q: "“Ehtiyotkor” so'ziga qarama-qarshi ma'noli so'z qaysi?", o: ["O'ychan", "Tejamkor", "Beparvo", "Sodiq"], c: 2, e: "Ehtiyotkor sinchkov bo'ladi, beparvo esa e'tiborsiz." },
  { q: "“Mo'l” so'ziga qarama-qarshi ma'noli so'z qaysi?", o: ["Katta", "Kam", "Tez", "Uzoq"], c: 1, e: "Mo'l-ko'l: ko'p. Zidi: kam." },
  { q: "“Hamiyatli” so'zining ma'nodoshi qaysi?", o: ["Xasis", "Kamtar", "Saxovatli", "Dangasa"], c: 2, e: "Hamiyatli odam boshqalarga yordam berishdan qaytmaydi, ya'ni saxovatli." },
  { q: "Qaysi biri boshqalardan farq qiladi?", o: ["Olma", "Nok", "Sholg'om", "Uzum"], c: 2, e: "Olma, nok, uzum mevalar. Sholg'om esa sabzavot." },
  { q: "muallif : kitob = rassom : ?", o: ["Bo'yoq", "Rasm", "Cho'tka", "Ko'rgazma"], c: 1, e: "Muallif kitob yaratadi, rassom esa rasm yaratadi." },
  { q: "“Shijoat” so'zining ma'nodoshi qaysi?", o: ["Tinchlik", "Jasorat", "Mehr", "Sovuq"], c: 1, e: "Shijoat: botirlik, jasorat." },
  { q: "“Loqayd” so'zining ma'nodoshi qaysi?", o: ["Quvnoq", "Chaqqon", "Befarq", "G'amgin"], c: 2, e: "Loqayd: hech narsaga qiziqmaydigan, befarq." },
  { q: "“Zukko” odam qanday bo'ladi?", o: ["O'tkir zehnli", "Juda kuchli", "Juda sekin", "Jim"], c: 0, e: "Zukko: tez fikrlaydigan, o'tkir zehnli." },
];
const wordTest = () => quizScreen({
  mode: "right", items: () => genWords(12), title: "So'z boyligi", ico: "📚", sub: "Ma'no va o'xshashlik", best: () => getBest("words") != null ? getBest("words") + " ball" : null,
  intro: ["12 ta savol: ma'nodosh, qarama-qarshi ma'no, toq so'z va o'xshashlik topshiriqlari.", "Har safar savollar yangi, ko'rganlaringiz takrorlanmaydi. Har javobdan keyin qisqa izoh chiqadi."],
  finish(a, r) {
    const t = r.total, n = r.count, nb = setBest("words", t), f = t / n;
    const lv = f >= .85 ? ["Ona tilining bilimdoni 📖", "So'z boyligingiz juda boy."] : f >= .65 ? ["Yaxshi", "So'z zaxirangiz yaxshi, ko'p kitob o'qiganga o'xshaysiz."] : f >= .4 ? ["O'rtacha", "Ko'proq o'qish so'z boyligini tez oshiradi."] : ["Boshlang'ich", "Kuniga 10 daqiqa kitob o'qish yaxshi boshlanish."];
    result(a, { id: "words", title: "So'z boyligi", ico: "📚", kicker: "To'g'ri javoblar", big: t + "/" + n, level: lv[0], text: lv[1], newBest: nb.better,
      again: r.again, share: `So'z boyligi testida ${t}/${n} oldim. Sen necha olasan?` });
  },
});

/* ---------- 7. Mantiq topishmoqlari ---------- */
const LOGIC = [
  { q: "Qutida 3 ta olma bor. Siz 2 tasini oldingiz. Sizda nechta olma bor?", o: ["1", "2", "3", "5"], c: 1, e: "Siz olgan olmalar sizda: 2 ta. Qutida esa 1 ta qoldi." },
  { q: "Qaysi son ortiqcha? 2, 3, 5, 9, 11", o: ["2", "5", "9", "11"], c: 2, e: "Qolganlari tub son (faqat 1 ga va o'ziga bo'linadi). 9 esa 3 ga bo'linadi." },
  { q: "Soat 3:15 da soat va daqiqa millari orasidagi burchak qancha?", o: ["0°", "7,5°", "15°", "22,5°"], c: 1, e: "Daqiqa mili 90° da, soat mili esa 3 dan 7,5° o'tgan (97,5°). Farqi 7,5°." },
  { q: "5 ta mushuk 5 ta sichqonni 5 daqiqada tutadi. 100 ta mushuk 100 ta sichqonni necha daqiqada tutadi?", o: ["5", "20", "50", "100"], c: 0, e: "Har bir mushuk 5 daqiqada 1 ta sichqon tutadi. 100 mushuk 100 sichqonni ham 5 daqiqada tutadi." },
  { q: "Barcha A lar B, barcha B lar C bo'lsa, quyidagilardan qaysi biri albatta to'g'ri?", o: ["Barcha C lar A", "Barcha A lar C", "Hech bir A C emas", "Ba'zi B lar A emas, degani noto'g'ri"], c: 1, e: "A ⊂ B ⊂ C, demak barcha A lar C ichida." },
  { q: "Qatorni davom ettiring: 1, 1, 2, 3, 5, 8, ?", o: ["11", "12", "13", "15"], c: 2, e: "Har son oldingi ikkitasining yig'indisi: 5 + 8 = 13." },
  { q: "Ota o'g'lidan 24 yosh katta. 6 yildan keyin ota o'g'lidan 3 barobar katta bo'ladi. O'g'il hozir necha yoshda?", o: ["4", "6", "8", "9"], c: 1, e: "O'g'il 6 bo'lsa, ota 30. 6 yildan keyin 12 va 36: 36 = 3 × 12." },
  { q: "Qaysi biri boshqalardan farq qiladi?", o: ["Kvadrat", "Uchburchak", "Doira", "Kub"], c: 3, e: "Kvadrat, uchburchak, doira tekis (2D) shakllar. Kub esa hajmli (3D)." },
  { q: "Bir ishni 2 usta 6 kunda bitiradi. Xuddi shu ishni 4 usta (bir xil tezlikda) necha kunda bitiradi?", o: ["2", "3", "4", "12"], c: 1, e: "Ustalar soni 2 barobar ko'paysa, vaqt 2 barobar kamayadi: 6 / 2 = 3 kun." },
];
const logicTest = () => quizScreen({
  mode: "right", items: () => genLogic(10), title: "Mantiq topishmoqlari", ico: "🧩", sub: "Fikrlab ko'ring", best: () => getBest("logic") != null ? getBest("logic") + " ball" : null,
  intro: ["10 ta savol: sonlar qatori, yosh va ish masalalari, soat, kunlar, mantiq va hiyla savollar.", "Har safar savollar yangi. Javobdan keyin yechim izohi chiqadi."],
  finish(a, r) {
    const t = r.total, n = r.count, nb = setBest("logic", t), f = t / n;
    const lv = f >= .8 ? ["Mantiq ustasi 🧠", "Topishmoqlarni tez va aniq yechasiz."] : f >= .6 ? ["Yaxshi", "Mantiqiy fikrlashingiz yaxshi."] : f >= .35 ? ["O'rtacha", "Qiyin savollarda izohlarni o'qib chiqing, keyingi safar osonlashadi."] : ["Boshlang'ich", "Bunday savollar mashq bilan oson bo'ladi. Qayta urinib ko'ring."];
    result(a, { id: "logic", title: "Mantiq topishmoqlari", ico: "🧩", kicker: "To'g'ri javoblar", big: t + "/" + n, level: lv[0], text: lv[1], newBest: nb.better,
      note: "Bu qisqa o'yin, IQ ball emas. IQ oralig'i uchun asosiy testni topshiring.",
      again: r.again, share: `Mantiq topishmoqlarida ${t}/${n} oldim. Sen necha olasan?` });
  },
});

/* ---------- 8. Shaxsiyat (Big Five'dan ilhomlangan) ---------- */
const BIG = [
  ["E", "Men ijtimoiy, gapga chechan odamman", 0], ["E", "Men tortinchoq, ko'proq jim turadigan odamman", 1],
  ["A", "Men mehribon, boshqalarga iliq munosabatdaman", 0], ["A", "Men ba'zan qattiqqo'l va janjalga moyilman", 1],
  ["C", "Men mas'uliyatli va tartibliman", 0], ["C", "Men tartibsiz, ishni keyinga qoldirishga moyilman", 1],
  ["S", "Men xotirjam bo'lib, kam xavotirlanaman", 0], ["S", "Men tez xavotirga tushaman", 1],
  ["O", "Men yangi g'oya va tajribalarga ochiqman", 0], ["O", "Men odatiy, tanish narsalarni afzal ko'raman", 1],
];
const TRAITS = {
  E: ["Ijtimoiylik", "Odamlar orasida quvvat olasiz", "Yolg'izlikda quvvat olasiz"],
  A: ["Mehribonlik", "Hamkorlik va iliqlik sizga xos", "To'g'ri va to'g'ridan-to'g'ri gapirasiz"],
  C: ["Mas'uliyat", "Rejali va ishonchli odamsiz", "Erkin, moslashuvchan uslubdasiz"],
  S: ["Xotirjamlik", "Stressda ham tinch qolasiz", "His-tuyg'ularni chuqur his qilasiz"],
  O: ["Yangilikka ochiqlik", "Qiziquvchan va ijodkorsiz", "Barqaror va amaliysiz"],
};
const TYPES = { E: ["Ijtimoiy yulduz ✨", "Siz davra markazisiz: odamlar bilan til topishish sizga oson."], A: ["Iliq yurak 💛", "Atrofingizdagilar siz bilan o'zini xavfsiz his qiladi."], C: ["Rejali usta 📋", "Aytgan ishingizni oxiriga yetkazasiz, bunga ishonsa bo'ladi."], S: ["Sovuqqon 🧊", "Bosim ostida ham boshni sovuq tutasiz."], O: ["Kashfiyotchi 🧭", "Yangi g'oya va yo'llar sizni o'ziga tortadi."] };
function bigTest() {
  let i = 0; const ans = [];
  return iqScreen({
    busy: true,
    render() {
      const a = app();
      const draw = () => {
        const it = BIG[i], L = ["Umuman mos emas", "Ko'pincha mos emas", "Aniq emas", "Ko'pincha mos", "To'liq mos"];
        a.innerHTML = `${header("Shaxsiyat testi")}<div class="iqx-top"><span class="pill">${i + 1} / ${BIG.length}</span></div><div class="iq-bar"><i style="width:${100 * i / BIG.length}%"></i></div>
          <p class="muted small" style="margin:6px 0 0">Bu gap sizga qanchalik mos?</p><div class="iq-q">${esc(it[1])}</div>
          <div class="iq-opts">${L.map((l, k) => `<button class="iq-opt" data-k="${k + 1}"><i>${k + 1}</i><span>${l}</span></button>`).join("")}</div>`;
        bindBack();
        a.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { ans[i] = +b.dataset.k; tickH(); b.classList.add("sel"); setTimeout(() => { if (i < BIG.length - 1) { i++; draw(); } else end(); }, 220); });
      };
      const end = () => {
        const sc = {}; BIG.forEach((b, k) => { const v = b[2] ? 6 - ans[k] : ans[k]; (sc[b[0]] = sc[b[0]] || []).push(v); });
        const pct = {}; Object.keys(sc).forEach(k => { pct[k] = Math.round(100 * ((sc[k].reduce((x, y) => x + y, 0) / sc[k].length) - 1) / 4); });
        const top = Object.keys(pct).sort((x, y) => pct[y] - pct[x])[0], ty = TYPES[top];
        result(a, { id: "big", title: "Shaxsiyat testi", ico: "🪞", kicker: "Sizning uslubingiz", big: ty[0].split(" ").pop(), level: ty[0].replace(/ \S+$/, ""), text: ty[1],
          bars: Object.keys(TRAITS).map(k => ({ n: TRAITS[k][0], pct: pct[k], d: pct[k] >= 50 ? TRAITS[k][1] : TRAITS[k][2] })),
          note: "Mashhur “Katta beshlik” (Big Five) modelidan ilhomlangan qisqa o'yin. Aniq psixologik baho emas.",
          again: () => show(bigTest(), false), share: `Shaxsiyat testida mening uslubim: ${ty[0]}. Sen kimsan?` });
      };
      intro(a, { ico: "🪞", title: "Shaxsiyat testi", lines: ["10 ta gap. Har biri sizga qanchalik mosligini belgilang.", "To'g'ri javob yo'q: o'zingizni halol baholang. 5 ta jihat bo'yicha profil chiqadi."], start: draw });
    },
  });
}

/* ---------- katalog ---------- */
export const TESTS = [
  { id: "memory", ico: "🔢", name: "Xotira", sub: "Raqamlar qatori", t: "2 daq", c: "#E8572A", make: memoryTest, fmt: v => v },
  { id: "logic", ico: "🧩", name: "Mantiq topishmoqlari", sub: "10 ta savol", t: "3 daq", c: "#1F6F4E", make: logicTest, fmt: v => v + " ball" },
  { id: "words", ico: "📚", name: "So'z boyligi", sub: "12 ta savol", t: "2 daq", c: "#C98410", make: wordTest, fmt: v => v + " ball" },
  { id: "math", ico: "➕", name: "Tez hisob", sub: "60 soniya", t: "1 daq", c: "#2A7FB8", make: mathTest, fmt: v => v },
  { id: "focus", ico: "🔍", name: "Diqqat", sub: "Farqni toping", t: "1 daq", c: "#5B3FA8", make: attentionTest, fmt: v => v },
  { id: "react", ico: "⚡", name: "Reaksiya", sub: "Qancha tezsiz?", t: "1 daq", c: "#F2B33D", make: reactionTest, fmt: v => v + " ms" },
];
