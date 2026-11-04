// IQ testlar bo'limi (G'altak ichida). Savollar serverda yaratiladi, javoblar serverda tekshiriladi.
import { app, show as coreShow, header, bindBack, toast, esc, tg, haptic, botUsername, back } from "./core.js";
import { iqScreen, getBest } from "./iqui.js";
import { TESTS } from "./iqx.js";
const show = (s, p) => coreShow(iqScreen(s), p);

const S = { sid: null, sections: [], si: 0, qi: 0, answers: {}, ms: {}, qEnter: 0, deadline: 0, total: 0, timer: null, result: null, paid: false, detail: null, name: "", nextAt: null, price: 30 };
const dev = new URLSearchParams(location.search).get("dev");

async function iqApi(action, body = {}) {
  const r = await fetch("/api/iq", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, initData: tg?.initData || (dev ? `dev:${dev}:Dev` : ""), ...body }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || r.status), { code: r.status });
  return j;
}
const tick = () => { try { tg?.HapticFeedback?.selectionChanged(); } catch (e) {} };

/* ---------- SVG shakllar ---------- */
const FILL = ["#ffffff", "#b8c0e0", "#1B2140"], INK = "#1B2140";
function shapeSVG(s, x, y, r, f, rot) {
  const fill = FILL[f], st = `stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"`;
  const tr = rot ? ` transform="rotate(${rot * 90} ${x} ${y})"` : "";
  if (s === 0) return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${st}/>`;
  if (s === 1) { const a = r * .88; return `<rect x="${x - a}" y="${y - a}" width="${2 * a}" height="${2 * a}" rx="2" fill="${fill}" ${st}${tr}/>`; }
  return `<polygon points="${x},${y - r} ${x + r * 1.02},${y + r * .82} ${x - r * 1.02},${y + r * .82}" fill="${fill}" ${st}${tr}/>`;
}
const POS = { 1: [[30, 30, 17]], 2: [[19, 30, 11], [41, 30, 11]], 3: [[30, 18, 10], [18, 41, 10], [42, 41, 10]] };
function cellSVG(c) {
  let inner = "";
  if (c === null) inner = `<text x="30" y="40" text-anchor="middle" font-size="30" font-weight="800" fill="#5B5BF0">?</text>`;
  else POS[c.n].forEach(p => { inner += shapeSVG(c.s, p[0], p[1], p[2], c.f, c.r); });
  return `<svg viewBox="0 0 60 60"><rect x="1" y="1" width="58" height="58" rx="9" fill="#F1F3FF" stroke="${c === null ? "#5B5BF0" : "#cfd5ee"}" stroke-width="${c === null ? 2.5 : 1.5}"/>${inner}</svg>`;
}
function gridSVG(g) {
  const n = g.length, u = 60 / n; let s = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) s += `<rect x="${c * u + 1}" y="${r * u + 1}" width="${u - 2}" height="${u - 2}" rx="3" fill="${g[r][c] ? INK : "#fff"}" stroke="#c4cbe6" stroke-width="1"/>`;
  return `<svg viewBox="0 0 60 60"><rect x="0" y="0" width="60" height="60" rx="8" fill="#F1F3FF"/>${s}</svg>`;
}
const EX = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) EX.push({ s: 0, n: c + 1, f: r === 0 ? 0 : r === 1 ? 1 : 2, r: 0 });

/* ---------- asosiy tab ---------- */
export function iqTab() {
  return iqScreen({
    tab: "iq",
    async render() {
      const draw = (st) => {
        const h = st?.history || [];
        const best = h.length ? Math.max(...h.map(x => x.iq)) : null;
        const FAQ = [
          ["Test qancha vaqt oladi?", "Asosiy test taxminan 20 daqiqa: 4 bo'lim, 31 savol. Har bo'limning o'z vaqti bor. Qolgan testlar 1–3 daqiqa."],
          ["IQ natijasi qanchalik aniq?", "Bu rasmiy ilmiy test emas. Natija aniq son emas, taxminiy oraliq sifatida beriladi. Normalar foydalanuvchilar natijalari bilan asta-sekin aniqlashtiriladi."],
          ["Bepul nima, pullik nima?", "IQ oralig'i, daraja va foiz (100 kishidan nechtasidan yuqori ekaningiz) bepul. Batafsil tahlil (bo'limlar bo'yicha ball, kuchli va zaif tomonlar, xatolar izohi) " + S.price + " ⭐."],
          ["Testni qayta topshirsam bo'ladimi?", "Ha, 7 kundan keyin va boshqa savollar bilan. Mashq natijani biroz oshiradi, lekin aqlning o'sishi degani emas."],
          ["Qolgan testlar IQ beradimi?", "Yo'q. Xotira, mantiq topishmoqlari, tezlik va boshqalar o'yin-kulgi uchun va faqat qiziqarli profil beradi. IQ oralig'ini faqat asosiy test beradi."],
        ];
        app().innerHTML = `
          <section class="iqh">
            <span class="tag">🧠 Mantiq · bepul boshlang</span>
            <h1>O'zingizni <em>sinab</em> ko'ring</h1>
            <p>IQ testi va yana 6 ta qiziqarli test. Natija bir zumda, hammasi o'zbek tilida.</p>
            <button class="btn" data-start>${st?.last ? "📊 Oxirgi natijani ko'rish" : "🧠 IQ testini boshlash"}</button>
            ${st?.last && st.next_at ? `<small>Qayta topshirish: ${new Date(st.next_at).toLocaleDateString("uz-UZ")} dan keyin</small>` : `<small>4 bo'lim · 31 savol · ~20 daqiqa</small>`}
            <span class="art" aria-hidden="true">🧠</span>
          </section>
          <div class="iq-stats">
            <div><b>${best ?? "—"}</b><small>Eng yuqori IQ</small></div>
            <div><b>${h.length ? h[0].iq : "—"}</b><small>Oxirgi IQ</small></div>
            <div><b>${h.length}</b><small>Testlar</small></div>
          </div>

          <h2 class="iqs">Asosiy test</h2>
          <div class="iqmain">
            <div><b>Mantiq darajasi (IQ)</b><p>Shakllar, sonlar, so'zlar va fazoviy fikrlash. Savollar osondan qiyinga, har safar yangi.</p>
              <div class="chips"><span>🧩 Shakllar</span><span>🔢 Sonlar</span><span>📚 So'zlar</span><span>🎲 Fazo</span></div></div>
            <div class="cta"><button class="btn" data-start2>${st?.last ? "Natija" : "Boshlash"}</button><button class="btn alt" data-demo>⚡ 3 savolda sinab ko'rish</button></div>
          </div>

          <h2 class="iqs">Boshqa testlar <small>bepul, 1–3 daqiqa</small></h2>
          <div class="iqgrid">${TESTS.map(t => { const bv = getBest(t.id); return `<button class="iqt" data-t="${t.id}" style="--c:${t.c}"><span class="e">${t.ico}</span><b>${t.name}</b><small>${t.sub} · ${t.t}</small>${bv != null ? `<i>Rekord: ${esc(String(t.fmt(bv)))}</i>` : `<i class="new">Yangi</i>`}</button>`; }).join("")}</div>

          <h2 class="iqs">Qanday ishlaydi</h2>
          <div class="iqsteps">
            <div><span>1</span><b>Testni tanlang</b><p>Asosiy IQ testi yoki tezkor testlardan istalgani.</p></div>
            <div><span>2</span><b>Savollarga javob bering</b><p>Har bo'limda vaqt bor. Hammasiga ulgurmaslik normal.</p></div>
            <div><span>3</span><b>Natijani oling</b><p>IQ oralig'i, daraja va o'rningiz bir zumda chiqadi.</p></div>
          </div>

          <h2 class="iqs">Natijada nima olasiz</h2>
          <div class="iqwhat">
            <div class="free"><b>Bepul</b><ul><li>IQ oralig'i</li><li>Daraja nomi</li><li>100 kishidan nechtasidan yuqoriligingiz</li><li>Do'stlarga yuborish</li></ul></div>
            <div class="paid"><b>${S.price} ⭐</b><ul><li>4 bo'lim bo'yicha ball</li><li>Kuchli va zaif tomonlar</li><li>Xatolaringiz izohi</li><li>Savolga sarflangan vaqt</li></ul></div>
          </div>

          <h2 class="iqs">Bilib oling</h2>
          <div class="iqlinks">
            <button class="iql" data-facts><span>📊</span><div><b>IQ nima?</b><small>Grafika va qiziqarli faktlar</small></div></button>
            <button class="iql" data-top><span>🏆</span><div><b>IQ reytingi</b><small>Eng yuqori natijalar</small></div></button>
          </div>

          ${h.length > 1 ? `<h2 class="iqs">Natijalaringiz tarixi</h2><div class="card iq-hist">${h.slice(0, 8).map(x => `<div><span>${new Date(x.at).toLocaleDateString("uz-UZ")}</span><i style="width:${Math.max(8, Math.min(100, (x.iq - 55) / 90 * 100))}%"></i><b>${x.iq}</b></div>`).join("")}<p class="small muted" style="margin:10px 0 0">Mashq natijani biroz oshiradi, bu aqlning o'sishi degani emas.</p></div>` : ""}

          <h2 class="iqs">Ko'p so'raladigan savollar</h2>
          <div class="iqfaq">${FAQ.map(f => `<details><summary>${esc(f[0])}</summary><p>${esc(f[1])}</p></details>`).join("")}</div>

          <details class="iqfaq1"><summary>Test haqida (nimaga asoslangan)</summary>
            <p>Tuzilishi mashhur aql testlari (Raven matritsalari, Cattell CFIT, Wechsler) tamoyillariga o'xshatib qurilgan: savollar osondan qiyinga, har bo'limga alohida vaqt, natija 100 o'rtacha va 15 og'ish shkalasida hisoblanadi. Savollar har safar yangidan yaratiladi.</p>
            <p><b>Halol ogohlantirish:</b> bu rasmiy, ilmiy tekshirilgan IQ testi emas. Normalar hozircha taxminiy. Natija tibbiy yoki psixologik tashxis emas.</p></details>`;
        const q = s => app().querySelector(s);
        const go = async () => { if (st?.last) { S.sid = st.last.id; S.nextAt = st.next_at; await openResult(true); } else show(practiceScreen()); };
        q("[data-start]").onclick = go; q("[data-start2]").onclick = go;
        q("[data-demo]").onclick = () => show(demoScreen());
        q("[data-top]").onclick = () => show(topScreen());
        q("[data-facts]").onclick = () => show(factsScreen());
        app().querySelectorAll("[data-t]").forEach(b => b.onclick = () => show(TESTS.find(t => t.id === b.dataset.t).make()));
      };
      draw(null);
      try { const st = await iqApi("status"); S.price = st.price || 30; S.bot = st.bot; draw(st); } catch (e) { /* tashqarida yoki xato: asosiy ekran qoladi */ }
    },
  });
}

/* ---------- mashq ---------- */
function practiceScreen() {
  return {
    render() {
      app().innerHTML = `${header("Mashq savoli")}
        <span class="pill">Ballga kirmaydi</span>
        <div class="iq-q" style="margin-top:12px">Qaysi shakl bo'sh joyga mos keladi?</div>
        <div class="iq-fig"><div class="iq-mgrid">${EX.map((c, i) => `<div>${cellSVG(i === 8 ? null : c)}</div>`).join("")}</div></div>
        <button class="btn alt" data-show>Javobni ko'rish</button>
        <div class="card" data-ans hidden style="margin-top:12px"><b>To'g'ri javob</b><p class="small muted" style="margin:8px 0 10px">Har qatorda rang bir xil (oq, kulrang, qora), ustunlarda esa shakllar soni 1, 2, 3 bo'lib ortadi. Bo'sh katakda <b>3 ta qora aylana</b> bo'ladi.</p><div style="width:90px">${cellSVG(EX[8])}</div></div>
        <p class="small muted" style="margin:14px 0">Savollar shunga o'xshash, ba'zilari qiyinroq. Vaqt bo'lim bo'yicha hisoblanadi, hammasiga ulgurmasligingiz mumkin, bu normal.</p>
        <button class="btn" data-go>Tayyorman</button>`;
      bindBack();
      const a = app();
      a.querySelector("[data-show]").onclick = e => { a.querySelector("[data-ans]").hidden = false; e.target.hidden = true; };
      a.querySelector("[data-go]").onclick = startTest;
    },
  };
}
async function startTest() {
  app().innerHTML = `<div class="iq-wait"><div class="spin"></div><p>Savollar tayyorlanmoqda…</p></div>`;
  try {
    const j = await iqApi("start");
    if (j.existing) { S.sid = j.session_id; S.nextAt = j.next_at; return openResult(true); }
    Object.assign(S, { sid: j.session_id, sections: j.sections, si: 0, answers: {}, ms: {} });
    try { tg?.enableClosingConfirmation(); } catch (e) {}
    show(introScreen(), false);
  } catch (e) { toast(e.code === 401 ? "Telegram ichida oching" : "Xatolik. Birozdan keyin qayta urining"); back(); }
}

/* ---------- bo'lim kirishi ---------- */
function introScreen() {
  return {
    busy: true,
    render() {
      const sec = S.sections[S.si], m = Math.floor(sec.time / 60), s = sec.time % 60;
      app().innerHTML = `<section class="iq-intro">
        <span class="pill">${S.si + 1} / ${S.sections.length} bo'lim</span>
        <h1>${esc(sec.name)}</h1>
        <p><b>${sec.questions.length} ta savol</b> · vaqt: <b>${m} daqiqa${s ? ` ${s} soniya` : ""}</b></p>
        <p class="small muted">Tayyor bo'lganingizda tugmani bosing. Vaqt shundan boshlanadi.</p>
        <button class="btn" data-sec>${S.si === S.sections.length - 1 ? "Oxirgi bo'limni boshlash" : "Bo'limni boshlash"}</button></section>`;
      app().querySelector("[data-sec]").onclick = () => show(questionScreen(), false);
    },
  };
}

/* ---------- savollar ---------- */
function questionScreen() {
  const $ = s => app().querySelector(s);
  const leaveQ = () => {
    const q = S.sections[S.si].questions[S.qi];
    if (q && S.qEnter) { S.ms[q.id] = (S.ms[q.id] || 0) + (Date.now() - S.qEnter); if (S.answers[q.id]) S.answers[q.id].ms = S.ms[q.id]; }
    S.qEnter = 0;
  };
  const nextSection = () => { clearInterval(S.timer); if (S.si < S.sections.length - 1) { S.si++; show(introScreen(), false); } else finishTest(); };
  const timeTick = () => {
    const left = Math.max(0, S.deadline - Date.now()), sec = Math.ceil(left / 1000);
    const t = $("[data-time]"); if (!t) return;
    t.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; t.classList.toggle("low", sec <= 30);
    $("[data-bar]").style.width = (100 * (1 - left / S.total)) + "%";
    if (left <= 0) { clearInterval(S.timer); leaveQ(); toast("Vaqt tugadi"); nextSection(); }
  };
  const renderQ = () => {
    const sec = S.sections[S.si], q = sec.questions[S.qi], n = sec.questions.length;
    S.qEnter = Date.now();
    $("[data-pos]").textContent = `${S.qi + 1} / ${n}`;
    const cur = S.answers[q.id] ? S.answers[q.id].c : null;
    const gopts = f => `<div class="iq-gopts">${q.opts.map((o, i) => `<div class="iq-gopt${cur === i ? " sel" : ""}" data-i="${i}"><b>${"ABCDEF"[i]}</b>${f(o)}</div>`).join("")}</div>`;
    let h = `<div class="iq-q">${esc(q.prompt)}</div>`;
    if (q.kind === "matrix") h += `<div class="iq-fig"><div class="iq-mgrid">${q.spec.cells.map(c => `<div>${cellSVG(c)}</div>`).join("")}</div></div>` + gopts(cellSVG);
    else if (q.kind === "series") h += `<div class="iq-fig"><div class="iq-srow">${q.spec.cells.concat([null]).map(c => `<div>${cellSVG(c)}</div>`).join("")}</div></div>` + gopts(cellSVG);
    else if (q.kind === "grid") h += `<div class="iq-fig" style="max-width:150px;margin:0 auto 14px">${gridSVG(q.spec.grid)}</div>` + gopts(gridSVG);
    else h += `<div class="iq-opts">${q.opts.map((o, i) => `<button class="iq-opt${cur === i ? " sel" : ""}" data-i="${i}"><i>${"ABCDE"[i]}</i><span>${esc(o)}</span></button>`).join("")}</div>`;
    $("[data-body]").innerHTML = h;
    $("[data-body]").querySelectorAll("[data-i]").forEach(el => el.onclick = () => {
      const i = Number(el.dataset.i); S.answers[q.id] = { c: i, ms: (S.ms[q.id] || 0) + (Date.now() - S.qEnter) }; tick();
      $("[data-body]").querySelectorAll("[data-i]").forEach(x => x.classList.toggle("sel", Number(x.dataset.i) === i)); dots();
    });
    $("[data-prev]").style.visibility = S.qi === 0 ? "hidden" : "visible";
    $("[data-next]").textContent = S.qi === n - 1 ? (S.si === S.sections.length - 1 ? "Yakunlash ✓" : "Bo'limni yakunlash ✓") : "Keyingi →";
    dots();
  };
  const dots = () => {
    const sec = S.sections[S.si];
    $("[data-dots]").innerHTML = sec.questions.map((q, i) => `<span class="${S.answers[q.id] ? "done" : ""} ${i === S.qi ? "cur" : ""}" data-j="${i}">${i + 1}</span>`).join("");
    $("[data-dots]").querySelectorAll("span").forEach(el => el.onclick = () => { leaveQ(); S.qi = Number(el.dataset.j); renderQ(); });
  };
  return {
    busy: true,
    render() {
      const sec = S.sections[S.si];
      S.qi = 0; S.deadline = Date.now() + sec.time * 1000; S.total = sec.time * 1000;
      app().innerHTML = `<div class="iq-top"><span class="pill" data-pos></span><span class="iq-timer" data-time>0:00</span></div>
        <div class="iq-bar"><i data-bar></i></div><div data-body></div>
        <div class="iq-nav"><button class="btn alt" data-prev>← Oldingi</button><button class="btn" data-next>Keyingi →</button></div>
        <div class="iq-dots" data-dots></div>`;
      $("[data-prev]").onclick = () => { leaveQ(); S.qi = Math.max(0, S.qi - 1); renderQ(); };
      $("[data-next]").onclick = e => {
        const n = sec.questions.length;
        if (S.qi < n - 1) { leaveQ(); S.qi++; renderQ(); return; }
        const un = sec.questions.filter(q => !S.answers[q.id]).length, b = e.currentTarget;
        if (un && Date.now() < S.deadline - 1000 && !b.dataset.warned) { toast(`${un} ta savol javobsiz. Yana bosing: davom etish uchun`); b.dataset.warned = "1"; return; }
        leaveQ(); nextSection();
      };
      clearInterval(S.timer); S.timer = setInterval(timeTick, 250); timeTick(); renderQ();
    },
    leave() { clearInterval(S.timer); },
  };
}
async function finishTest() {
  try { tg?.disableClosingConfirmation(); } catch (e) {}
  app().innerHTML = `<div class="iq-wait"><div class="spin"></div><p>Natija hisoblanmoqda…</p></div>`;
  try { await iqApi("finish", { session_id: S.sid, answers: S.answers }); await openResult(false); }
  catch (e) { toast("Natijani saqlashda xatolik. Qayta urinib ko'ring"); show(iqTab(), false); }
}

/* ---------- natija ---------- */
async function openResult(existing) {
  const j = await iqApi("result", { session_id: S.sid });
  Object.assign(S, { result: j.result, paid: j.paid, detail: j.detail, name: j.name || "", bot: j.bot || S.bot });
  show(resultScreen(existing), false);
}
function resultScreen(existing) {
  return {
    render() {
      const r = S.result;
      app().innerHTML = `${header("Natija")}
        <section class="iq-res card">
          <p class="small muted center" style="margin:0">${esc(S.name ? S.name + ", sizning natijangiz" : "Sizning natijangiz")}</p>
          <div class="iq-big" data-iq>0</div>
          <p class="center muted" style="margin:0">taxminan ${r.lo}–${r.hi} oralig'ida</p>
          <div class="center"><span class="iq-level">${esc(r.level)}</span></div>
          <p class="center" style="margin:10px 0 14px">${esc(r.levelText)}</p>
          <div class="iq-meter"><i data-meter></i></div>
          <p class="small muted center" style="margin:8px 0 0">Siz 100 kishidan taxminan ${r.pct} tasidan yuqorisiz · ${r.raw}/${r.total} to'g'ri</p>
        </section>
        <div class="hint" style="background:rgba(242,179,61,.14);color:var(--ink)">${r.provisional ? "Natija taxminiy: test hali yangi, normalar birinchi foydalanuvchilar natijalari bilan aniqlashtirilmoqda. " : ""}Bu o'yin-kulgi uchun mantiq testi. Rasmiy IQ testi yoki tibbiy/psixologik tashxis emas.</div>
        <div class="stack" data-pay></div>
        <p class="small muted center" style="margin-top:10px">${existing && S.nextAt ? `Siz testni yaqinda topshirgansiz. Qayta urinish: ${new Date(S.nextAt).toLocaleDateString("uz-UZ")} dan keyin.` : "Qayta topshirish 7 kundan keyin mumkin."}</p>`;
      bindBack();
      const a = app();
      const t0 = performance.now(), el = a.querySelector("[data-iq]");
      (function f(t) { const p = Math.min(1, (t - t0) / 1100); el.textContent = Math.round(r.iq * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); })(t0);
      setTimeout(() => { const m = a.querySelector("[data-meter]"); if (m) m.style.width = r.pct + "%"; }, 60);
      const pay = a.querySelector("[data-pay]");
      const link = S.bot ? `https://t.me/${S.bot}` : "";
      const share = `<button class="btn alt" data-share>📨 Do'stlarga yuborish</button>`;
      if (S.paid) { pay.innerHTML = `<button class="btn" data-det>Batafsil tahlilni ko'rish</button>${share}`; pay.querySelector("[data-det]").onclick = () => show(detailScreen()); }
      else {
        pay.innerHTML = `<button class="btn" data-pay-btn style="background:var(--gold);color:#2a1d00">Batafsil natija · ${S.price} ⭐</button>
          <p class="small muted center" style="margin:0">4 bo'lim bo'yicha tahlil, kuchli va zaif tomonlar, xatolaringiz izohi</p>
          <p class="small muted center" style="margin:0">⭐ yetmasa, rasmiy hamkorimiz <a href="https://t.me/starpaybot" data-spb style="color:var(--accent)">@starpaybot</a> orqali xarid qilishingiz mumkin</p>${share}`;
        pay.querySelector("[data-pay-btn]").onclick = payFlow;
        pay.querySelector("[data-spb]").onclick = e => { e.preventDefault(); tg?.openTelegramLink ? tg.openTelegramLink("https://t.me/starpaybot") : window.open("https://t.me/starpaybot"); };
      }
      pay.querySelector("[data-share]").onclick = async () => {
        const bot = link || (await botUsername().then(b => b ? `https://t.me/${b}` : ""));
        const text = `Men mantiq testida "${r.level}" daraja oldim (IQ taxminan ${r.lo}–${r.hi}). Sen ham sinab ko'r!`;
        if (bot && tg?.openTelegramLink) tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(bot)}&text=${encodeURIComponent(text)}`);
        else navigator.share?.({ text: text + "\n" + bot }).catch(() => {});
      };
    },
  };
}
async function payFlow() {
  try {
    const j = await iqApi("invoice", { session_id: S.sid });
    if (j.paid) { await openResult(false); return; }
    if (!tg?.openInvoice) return toast("To'lov faqat Telegram ichida ishlaydi");
    tg.openInvoice(j.link, async st => {
      if (st === "paid") {
        toast("To'lov qabul qilindi ✅");
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 1500));
          try { const k = await iqApi("result", { session_id: S.sid }); if (k.paid) { Object.assign(S, { paid: true, detail: k.detail }); show(detailScreen(), false); return; } } catch (e) {}
        }
        toast("To'lov tekshirilmoqda, birozdan keyin qayta oching");
      } else if (st === "failed" || st === "cancelled") starsHelp(st === "failed");
    });
  } catch (e) { starsHelp(true); }
}
// To'lov bekor bo'lsa yoki yulduz yetmasa: @starpaybot'ga o'tish taklifi
function starsHelp(failed) {
  document.getElementById("iq-sheet")?.remove();
  const d = document.createElement("div"); d.id = "iq-sheet"; d.className = "iq-sheet";
  d.innerHTML = `<div class="iq-sheet-box"><h3>${failed ? "To'lov amalga oshmadi" : "To'lov bekor qilindi"}</h3>
    <p>Yulduzchangiz (⭐) yetarli bo'lmagan bo'lishi mumkin. Rasmiy hamkorimiz <b>@starpaybot</b> orqali ${S.price} ⭐ xarid qiling, keyin shu yerga qaytib, “Batafsil natija” tugmasini yana bosing.</p>
    <button class="btn" data-spb>⭐ @starpaybot ga o'tish</button>
    <button class="btn alt" data-retry>Qayta urinib ko'rish</button>
    <button class="btn alt" data-x>Yopish</button></div>`;
  document.body.appendChild(d);
  d.querySelector("[data-spb]").onclick = () => { d.remove(); tg?.openTelegramLink ? tg.openTelegramLink("https://t.me/starpaybot") : window.open("https://t.me/starpaybot"); };
  d.querySelector("[data-retry]").onclick = () => { d.remove(); payFlow(); };
  d.querySelector("[data-x]").onclick = () => d.remove();
  d.onclick = e => { if (e.target === d) d.remove(); };
}
function detailScreen() {
  return {
    render() {
      const d = S.detail || { sections: [], wrong: [] };
      const nm = id => (d.sections.find(s => s.id === id) || {}).name;
      app().innerHTML = `${header("Batafsil tahlil")}
        <div class="card"><h2 style="font-size:17px;margin-bottom:10px">Bo'limlar bo'yicha</h2>${d.sections.map(s => `<div class="iq-sbar ${s.id === d.best ? "best" : s.id === d.worst && s.id !== d.best ? "worst" : ""}"><div><span>${esc(s.name)}</span><b>${s.c}/${s.t}</b></div><div class="t"><i style="width:${s.pct}%"></i></div></div>`).join("")}</div>
        <div class="card"><p style="margin:0 0 8px">💪 Eng kuchli tomoningiz: <b>${esc(nm(d.best))}</b></p><p style="margin:0 0 8px">🌱 Rivojlantirish mumkin: <b>${esc(nm(d.worst))}</b></p>${d.avgSec ? `<p style="margin:0">⏱ Bitta savolga o'rtacha ${d.avgSec} soniya sarfladingiz.</p>` : ""}</div>
        <div class="card"><h2 style="font-size:17px;margin-bottom:6px">Xato qilingan savollar</h2>${d.wrong.length ? d.wrong.map(w => `<div class="iq-wr"><div class="q">${esc(w.q)}</div>${w.yours ? `<div class="a">Sizning javobingiz: ${esc(w.yours)}</div>` : (w.yours === null && w.right ? '<div class="a">Javob berilmagan</div>' : "")}${w.right ? `<div class="r">To'g'ri javob: ${esc(w.right)}</div>` : ""}<div class="e">${esc(w.ex)}</div></div>`).join("") : "<p>Ajoyib! Barcha savollarga to'g'ri javob berdingiz 🎉</p>"}</div>`;
      bindBack();
    },
  };
}

/* ---------- tezkor sinov (ballsiz) ---------- */
const DEMO = [
  { q: "Qatorni davom ettiring:\n3, 6, 11, 18, ?", o: ["24", "25", "27", "29"], a: 2, ex: "Farqlar 3, 5, 7, ... bo'lib 2 tadan ortadi. Keyingi farq 9: 18 + 9 = 27." },
  { q: "qush : uchish = baliq : ?", o: ["suv", "suzish", "tuxum", "to'r"], a: 1, ex: "Qush uchadi, baliq esa suzadi. Ikkala juftlikda hayvon va uning harakati turibdi." },
  { q: "Karim Salimdan baland. Salim Dilnozadan baland.\nKim eng past?", o: ["Karim", "Salim", "Dilnoza", "Aniqlab bo'lmaydi"], a: 2, ex: "Tartib: Karim > Salim > Dilnoza. Eng past Dilnoza." },
];
function demoScreen() {
  let i = 0, ok = 0, locked = false;
  return {
    render() {
      const a = app();
      const draw = () => {
        const d = DEMO[i]; locked = false;
        a.innerHTML = `${header("Tezkor sinov")}<span class="pill">${i + 1} / ${DEMO.length} · ballsiz</span>
          <div class="iq-q" style="margin-top:12px">${esc(d.q)}</div>
          <div class="iq-opts">${d.o.map((o, k) => `<button class="iq-opt" data-i="${k}"><i>${"ABCD"[k]}</i><span>${esc(o)}</span></button>`).join("")}</div><div data-fb></div>`;
        bindBack();
        a.querySelectorAll("[data-i]").forEach(b => b.onclick = () => {
          if (locked) return; locked = true; const k = Number(b.dataset.i), good = k === d.a; if (good) ok++;
          a.querySelectorAll("[data-i]").forEach((x, j) => { if (j === d.a) x.classList.add("good"); else if (j === k) x.classList.add("bad"); });
          const last = i === DEMO.length - 1;
          a.querySelector("[data-fb]").innerHTML = `<div class="card" style="margin-top:14px"><b>${good ? "To'g'ri! ✅" : "Hechqisi yo'q ❌"}</b><p class="small muted" style="margin:6px 0 0">${esc(d.ex)}</p></div><button class="btn" style="margin-top:12px" data-n>${last ? "Natijani ko'rish" : "Keyingisi →"}</button>`;
          a.querySelector("[data-n]").onclick = () => { if (last) end(); else { i++; draw(); } };
        });
      };
      const end = () => {
        const t = ok === 3 ? ["Zo'r start! 🔥", "3 tadan 3 ta to'g'ri. To'liq testda savollar qiyinlashib boradi."] : ok === 2 ? ["Yaxshi natija 👏", "3 tadan 2 ta to'g'ri. To'liq testda 31 ta savol bor, natija aniqroq chiqadi."] : ["Qiziq boshlanish 😄", `3 tadan ${ok} ta to'g'ri. Bu faqat isinish edi, to'liq testda natija bir savolga bog'liq emas.`];
        a.innerHTML = `${header("Tezkor sinov")}<div class="center" style="font-size:56px;margin-top:8px">🧠</div><h2 class="center" style="margin:8px 0">${t[0]}</h2><p class="center muted">${t[1]}</p>
          <div class="card"><p class="small muted" style="margin:0">To'liq test: 4 bo'lim, 31 savol, taxminan 20 daqiqa. IQ oralig'i, daraja va 100 kishidan nechtasidan yuqori ekaningiz bepul. Tezkor sinov ball bermaydi, faqat qiziqish uchun.</p></div>
          <button class="btn" style="margin-top:12px" data-full>To'liq testni boshlash</button>`;
        bindBack(); a.querySelector("[data-full]").onclick = () => show(practiceScreen(), false);
      };
      draw();
    },
  };
}

/* ---------- reyting ---------- */
function topScreen() {
  return {
    async render() {
      app().innerHTML = `${header("IQ reytingi")}<div class="iq-wait"><div class="spin"></div></div>`; bindBack();
      try {
        const j = await iqApi("top");
        const medal = i => ["🥇", "🥈", "🥉"][i] || `#${i + 1}`;
        app().innerHTML = `${header("IQ reytingi")}<p class="small muted">Eng yuqori natijalar (o'yin-kulgi uchun test, tez va bir xil javobli urinishlar hisobga olinmaydi).</p>
          ${j.top.length ? j.top.map((p, i) => `<div class="iq-rank${p.id === j.me ? " me" : ""}"><span class="n">${medal(i)}</span><span class="nm">${esc(p.name)}<small>${p.tests} ta test</small></span><b>${p.iq}</b></div>`).join("") : `<div class="card center muted">Hozircha natija yo'q. Birinchi bo'ling! 🏆</div>`}`;
        bindBack();
      } catch (e) { toast("Reytingni yuklab bo'lmadi"); }
    },
  };
}

/* ---------- IQ haqida ---------- */
function factsScreen() {
  return {
    render() {
      const W = 320, B = 160, T = 14, lo = 55, hi = 145, L = 10, R = 310;
      const X = v => L + (v - lo) / (hi - lo) * (R - L), pdf = v => Math.exp(-0.5 * Math.pow((v - 100) / 15, 2)), Y = v => B - pdf(v) * (B - T);
      const bands = [[lo, 70, "#E5484D", "70 dan past", "2%"], [70, 85, "#F2B33D", "70–85", "14%"], [85, 115, "#5B3FA8", "85–115", "68%"], [115, 130, "#1F6F4E", "115–130", "14%"], [130, hi, "#E8572A", "130+", "2%"]];
      let svg = "";
      bands.forEach(b => { let d = `M${X(b[0])} ${B}`; for (let v = b[0]; v <= b[1]; v++) d += ` L${X(v).toFixed(1)} ${Y(v).toFixed(1)}`; d += ` L${X(b[1])} ${B} Z`; svg += `<path d="${d}" fill="${b[2]}" fill-opacity=".85"/>`; });
      let line = ""; for (let v = lo; v <= hi; v++) line += (v === lo ? "M" : "L") + X(v).toFixed(1) + " " + Y(v).toFixed(1) + " ";
      svg += `<path d="${line}" fill="none" stroke="#1F1A16" stroke-width="1.6" stroke-opacity=".6"/>`;
      [70, 85, 100, 115, 130].forEach(v => { svg += `<text x="${X(v)}" y="${B + 16}" text-anchor="middle" fill="#7A6F63" font-size="11">${v}</text>`; });
      svg += `<text x="${X(100)}" y="${T - 2}" text-anchor="middle" fill="#1F1A16" font-size="11" font-weight="700">68% shu yerda</text>`;
      const F = [["Oddiy odam (o'rtacha)", 100, "norma"], ["Stephen Hawking", 160, "o'zi aytgan taxminiy ball"], ["Albert Einstein", 160, "hech qachon test topshirmagan, taxmin"], ["Terens Tao", 225, "bolalikdagi baho, bahsli"], ["Marilyn vos Savant", 228, "bolalikdagi eski usul, bahsli"]];
      const facts = [["📜", "Hammasi maktabdan boshlangan", "1905-yilda fransuz Alfred Bine maktabda yordam kerak bolalarni topish uchun birinchi testni tuzgan. \"IQ\" so'zini nemis olimi Vilgelm Shtern 1912-yilda kiritgan."], ["📈", "Flinn effekti", "20-asr davomida dunyoda test ballari o'n yilda o'rtacha taxminan 3 ball ko'tarilgan. Shuning uchun testlarning normasi yangilab turiladi."], ["🏋️", "Mashq natijani oshiradi", "Bir xil turdagi savollarni ko'p yechsangiz ball ko'tariladi, lekin bu aqlning o'zi o'sganini anglatmaydi. Shuning uchun qayta topshirish 7 kundan keyin."], ["🎨", "IQ hamma narsani o'lchamaydi", "Ijodkorlik, hissiy aql, mehnatsevarlik, odamlar bilan til topishish testda ko'rinmaydi, muvaffaqiyatda esa ular ham katta rol o'ynaydi."], ["👥", "Mensa klubi", "Dunyodagi eng ommabop yuqori IQ klubiga qabul talabi: aholining eng yuqori 2 foizi ichida bo'lish."], ["🎲", "Tavakkal bosish ham ~75 beradi", "Javoblar 4–6 variantli, taxmin bilan bir qismini topish mumkin. Shuning uchun bu test 80 dan pastni aniq ajratmaydi."]];
      app().innerHTML = `${header("IQ nima?")}
        <p class="muted">Intellekt koeffitsienti: mantiqiy fikrlash darajangizni boshqalar bilan solishtiradigan ball. 100 o'rtacha, odamlarning ko'pchiligi shu atrofda.</p>
        <div class="card"><h2 style="font-size:16px;margin-bottom:8px">Odamlar IQ bo'yicha qanday taqsimlangan</h2><svg viewBox="0 0 320 190" style="width:100%;height:auto">${svg}</svg>
          <div class="iq-legend">${bands.map(b => `<span><i style="background:${b[2]}"></i>${b[3]}: ${b[4]}</span>`).join("")}</div>
          <p class="small muted" style="margin:10px 0 0">Har 100 kishidan taxminan 68 tasining IQ'i 85 va 115 orasida. 130 dan yuqori ball har 50 kishida taxminan bittada uchraydi.</p></div>
        <div class="card"><h2 style="font-size:16px;margin-bottom:4px">Mashhur odamlar</h2><p class="small muted">Diqqat: bular rasmiy natija emas. Ko'pchiligi taxminiy baho yoki bolalikdagi eski usulda o'lchangan, bahsli raqamlar.</p>
          ${F.map(f => `<div class="iq-fbar"><div><span>${f[0]}</span><b>~${f[1]}</b></div><div class="t"><i data-w="${Math.round((f[1] - 55) / 175 * 100)}"></i></div><small class="muted">${f[2]}</small></div>`).join("")}</div>
        <div class="card"><h2 style="font-size:16px;margin-bottom:4px">Bilib qo'ying</h2>${facts.map(f => `<div class="iq-fact"><span>${f[0]}</span><div><b>${f[1]}</b><p class="small muted" style="margin:2px 0 0">${f[2]}</p></div></div>`).join("")}</div>
        <p class="small muted center">Ma'lumotlar umumiy ilmiy bilimlar asosida soddalashtirib berilgan. Tibbiy yoki psixologik maslahat emas.</p>`;
      bindBack();
      setTimeout(() => app().querySelectorAll(".iq-fbar i").forEach(e => { e.style.width = e.dataset.w + "%"; }), 80);
    },
  };
}
