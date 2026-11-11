// Mafia bo'limi: ochiq xonalar ro'yxati, lobbi, tun/kun/ovoz fazalari, chat. Barcha qoidalar serverda (api/mafia.js).
import { tg, app, header, bindBack, show, back, toast, haptic, esc, botUsername, load as lget, save as lset } from "./core.js";
import { APP_VERSION } from "./version.js";

const R = {
  don: ["🎩", "Don", "Mafia boshlig'i. Kechasi sheriklaringiz bilan qurbonni tanlaysiz (ovoz teng bo'lsa — sizning so'zingiz). Yana bitta odamni tekshirasiz: u komissarmi?"],
  mafia: ["🔫", "Mafia", "Kechasi sheriklaringiz bilan bitta odamni tanlaysiz. Kunduzi o'zingizni tinch aholi qilib ko'rsating."],
  doctor: ["💉", "Doktor", "Har kecha bitta odamni davolaysiz. Mafia o'shani tanlasa — u tirik qoladi. Bir odamni ketma-ket ikki kecha davolab bo'lmaydi."],
  kom: ["🕵️", "Komissar", "Har kecha bitta odamni tekshirasiz: mafiami yoki yo'q. Bilganingizni kunduzi ehtiyot bo'lib ayting — mafia sizni ovlaydi."],
  civ: ["👨‍🌾", "Tinch aholi", "Kechasi uxlaysiz. Kunduzi gaplarni tinglab, mafiani topib ovoz bilan chiqaring."],
};
const PH = { lobby: "Kutish xonasi", night: "🌙 Tun", day: "☀️ Muhokama", vote: "🗳 Ovoz berish", end: "🏁 O'yin tugadi" };
const isMaf = r => r === "don" || r === "mafia";
const ERRTXT = { dead: "Siz o'yindan chiqqansiz — faqat kuzatasiz", sleep: "Tunda faqat mafia yozishadi. Siz uxlayapsiz 😴", contact: "Raqam, username va havola yozib bo'lmaydi",
  wait: "Biroz sekinroq 🙂", same_heal: "Bir odamni ketma-ket ikki kecha davolab bo'lmaydi", bad_target: "Bu o'yinchini tanlab bo'lmaydi", no: "Hozir bunday qilib bo'lmaydi" };

async function mapi(action, payload = {}) {
  const r = await fetch("/api/mafia", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ver: APP_VERSION, initData: tg?.initData || "", ...payload }) });
  if (r.status === 401) throw new Error("Telegram orqali kiring");
  if (!r.ok) throw new Error("Server xatosi");
  const j = await r.json();
  if (j?.update) { location.reload(); throw new Error("O'yin yangilandi"); }
  return j;
}

const RULES = `<details class="mf-rules"><summary>📖 Qoidalar va rollar</summary>
  <p>Shaharda yashirin <b>mafia</b> bor. Har kim o'z rolini faqat o'zi ko'radi.</p>
  <p><b>🌙 Tun (45 s):</b> mafia qurbon tanlaydi va o'zaro yozishadi, doktor bir odamni davolaydi, komissar bir odamni tekshiradi.<br>
  <b>☀️ Kun (90 s):</b> kim o'lganini bilib olasiz va hamma muhokama qiladi. Ko'pchilik «Ovozga o'tamiz» desa — vaqt tugashini kutmaymiz.<br>
  <b>🗳 Ovoz (40 s):</b> eng ko'p ovoz olgan o'yinchi chiqariladi va roli ochiladi. Ovozlar teng bo'lsa — hech kim chiqmaydi.</p>
  <p><b>G'alaba:</b> barcha mafia chiqarilsa — tinch aholi yutadi. Mafia soni qolganlarga tenglashsa — mafia yutadi.</p>
  ${Object.values(R).map(([i, n, a]) => `<p><b>${i} ${n}</b> — ${a}</p>`).join("")}
  <p class="muted">4–12 kishi. 4–5 kishida 1 mafia, 6–8 da 2 ta, 9–12 da 3 ta. Xona egasi bo'sh joylarni 🤖 bot bilan to'ldirishi mumkin.</p></details>`;

// ---------- bo'lim: ochiq xonalar ----------
export function mafiaMenu() {
  let rooms = null, timer = null;
  const load = async () => { try { rooms = (await mapi("open")).rooms || []; } catch (e) { rooms = rooms || []; } if (document.querySelector(".mf-list")) draw(); };
  function draw() {
    app().innerHTML = header("🎭 Mafia") + `
      <div class="mf-hero"><b>Mafia</b><span>4–12 kishilik guruh o'yini · tun, kun va ovoz berish</span></div>
      <div class="stack" style="margin-top:12px">
        ${lget("mafia-room") ? `<button class="bigbtn" data-cont><span class="ic mf-ic">↩️</span><span><b>Xonaga qaytish</b><small>Kod ${esc(lget("mafia-room"))} — o'yin davom etayotgan bo'lsa</small></span></button>` : ""}
        <button class="bigbtn" data-new="1"><span class="ic mf-ic">➕</span><span><b>Ochiq xona ochish</b><small>Hamma ko'radi va qo'shila oladi</small></span></button>
        <button class="bigbtn" data-new="0"><span class="ic mf-ic">🔒</span><span><b>Yopiq xona</b><small>Faqat havola bilan — do'stlar uchun</small></span></button>
      </div>
      ${RULES}
      <h2 class="sect">Ochiq xonalar</h2>
      <div class="mf-list">${rooms === null ? `<p class="muted">Yuklanmoqda…</p>` : rooms.length ? rooms.map(r => `
        <div class="onrow"><span class="avatar sm emo">🎭</span><span class="nm">${esc(r.host || "Xona")} xonasi<small>${r.n}/12 kishi · kod ${esc(r.id)}</small></span>
          <button class="pill ok" data-join="${esc(r.id)}">Kirish</button></div>`).join("")
        : `<div class="card center"><p style="margin:0">Hozir ochiq xona yo'q</p><p class="small muted" style="margin:6px 0 0">Birinchi bo'lib xona oching va do'stlaringizni chaqiring.</p></div>`}</div>
      <div class="cbar" style="margin-top:12px"><input class="inp" id="mfcode" maxlength="5" placeholder="Xona kodi (masalan K7QX2)" autocapitalize="characters"><button class="btn" data-code style="width:auto">Kirish</button></div>`;
    bindBack();
    app().querySelectorAll("[data-new]").forEach(b => b.onclick = async () => {
      try { const r = await mapi("create", { public: b.dataset.new === "1" }); if (r.error) return toast(r.msg || "Xona ochilmadi"); haptic("ok"); show(mafiaRoom(r.id, r)); } catch (e) { toast(e.message); }
    });
    const cont = app().querySelector("[data-cont]"); if (cont) cont.onclick = () => show(mafiaRoom(lget("mafia-room")));
    app().querySelectorAll("[data-join]").forEach(b => b.onclick = () => show(mafiaRoom(b.dataset.join)));
    app().querySelector("[data-code]").onclick = () => { const c = app().querySelector("#mfcode").value.trim().toUpperCase(); if (c.length === 5) show(mafiaRoom(c)); else toast("Kod 5 belgidan iborat"); };
  }
  return {
    render() { draw(); load(); timer = setInterval(() => { if (!document.hidden) load(); }, 5000); },
    leave() { clearInterval(timer); },
  };
}

// ---------- xona ----------
export function mafiaRoom(id, first = null) {
  let v = first, timer = null, clock = null, alive = true, left = 0, sig = "", mode = "kill", showRole = false, joined = !!first, sending = false, ended = false;
  let rec = null, recTimer = null, audio = null, playing = 0; const vcache = new Map();
  const P = () => v?.players?.[v.me];
  const MAXREC = 20; // ovozli xabar eng ko'pi 20 soniya
  const mmss = n => `0:${String(Math.max(0, Math.round(n))).padStart(2, "0")}`;

  // ---------- ovozli xabar: yozish ----------
  async function recStart() {
    if (rec || !window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) return toast("Bu qurilmada ovoz yozib bo'lmaydi");
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch (e) { return toast("Mikrofonga ruxsat bering 🎤"); }
    const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"].find(t => MediaRecorder.isTypeSupported?.(t)) || "";
    let mr; try { mr = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 24000 } : {}); } catch (e) { stream.getTracks().forEach(t => t.stop()); return toast("Ovoz yozib bo'lmadi"); }
    rec = { mr, stream, chunks: [], t0: Date.now(), mime };
    mr.ondataavailable = e => { if (e.data?.size) rec?.chunks.push(e.data); };
    mr.start(250); haptic("light"); draw(true);
    recTimer = setInterval(() => {
      if (!rec) return; const sec = (Date.now() - rec.t0) / 1000, el = document.getElementById("mfrec");
      if (el) el.textContent = mmss(sec);
      if (sec >= MAXREC) recStop(true);
    }, 250);
  }
  function recStop(sendIt) {
    if (!rec) return; const r = rec; rec = null; clearInterval(recTimer);
    const dur = (Date.now() - r.t0) / 1000;
    r.mr.onstop = async () => {
      r.stream.getTracks().forEach(t => t.stop());
      if (!sendIt) return draw(true);
      if (dur < 1) { toast("Juda qisqa — gapirib, keyin yuboring"); return draw(true); }
      const blob = new Blob(r.chunks, { type: r.mr.mimeType || r.mime || "audio/webm" });
      draw(true);
      try {
        const data = await new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(",")[1] || ""); fr.onerror = no; fr.readAsDataURL(blob); });
        const res = await mapi("voice_send", { id, data, mime: blob.type || "audio/webm", dur });
        if (res.error) return toast(ERRTXT[res.error] || res.msg || "Ovoz yuborilmadi");
        haptic("ok"); v = res; draw(true);
      } catch (e) { toast(e.message); }
    };
    try { r.mr.stop(); } catch (e) { r.stream.getTracks().forEach(t => t.stop()); }
    draw(true);
  }
  // ---------- ovozli xabar: eshitish ----------
  async function play(vid) {
    if (audio && playing === vid) { audio.pause(); audio = null; playing = 0; return draw(true); }
    if (audio) { audio.pause(); audio = null; }
    try {
      let url = vcache.get(vid);
      if (!url) {
        const r = await mapi("voice_get", { id, vid });
        if (r.error || !r.data) return toast("Bu ovozli xabar endi mavjud emas");
        const bin = atob(r.data), u8 = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k);
        url = URL.createObjectURL(new Blob([u8], { type: r.mime })); vcache.set(vid, url);
      }
      audio = new Audio(url); playing = vid;
      audio.onended = () => { playing = 0; audio = null; draw(true); };
      await audio.play().catch(() => { playing = 0; audio = null; toast("Ovozni ochib bo'lmadi — bu telefon formatni qo'llamasligi mumkin"); });
      draw(true);
    } catch (e) { toast(e.message); }
  }

  async function pull() {
    try {
      const r = joined ? await mapi("state", { id }) : await mapi("join", { id });
      if (!alive) return;
      if (r.error) {
        if (r.error === "not_in") { joined = false; return; }
        if (lget("mafia-room") === id) lset("mafia-room", "");
        toast(r.msg || "Xona topilmadi"); stop(); return back();
      }
      joined = true; lset("mafia-room", id);
      const prev = v?.phase; v = r; left = r.left;
      if (prev && prev !== r.phase) { haptic(r.phase === "end" ? "ok" : "warning"); if (r.phase !== "lobby") showRole = false; }
      draw();
    } catch (e) {}
  }
  function stop() {
    alive = false; clearInterval(timer); clearInterval(clock);
    if (rec) recStop(false);
    if (audio) { audio.pause(); audio = null; }
    vcache.forEach(u => URL.revokeObjectURL(u)); vcache.clear();
  }

  async function doAct(kind, target) {
    try { const r = await mapi("act", { id, kind, target }); if (r.error) return toast(ERRTXT[r.error] || r.msg || "Bo'lmadi"); haptic("light"); v = r; left = r.left; draw(true); } catch (e) { toast(e.message); }
  }
  async function host(action, extra = {}) {
    try { const r = await mapi(action, { id, ...extra }); if (r.error) return toast(r.msg || ERRTXT[r.error] || "Bo'lmadi"); haptic("ok"); v = r; left = r.left; draw(true); } catch (e) { toast(e.message); }
  }
  async function sendMsg() {
    const inp = document.querySelector("#mfmsg"); if (!inp || sending) return;
    const text = inp.value.trim(); if (!text) return;
    sending = true; inp.value = "";
    try { const r = await mapi("chat", { id, text }); if (r.error) { inp.value = text; toast(ERRTXT[r.error] || "Yuborilmadi"); } else { v = r; draw(true); } } catch (e) { inp.value = text; toast(e.message); }
    sending = false;
  }
  async function invite() {
    const bot = await botUsername(), link = bot ? `https://t.me/${bot}?start=m_${id}` : "";
    const text = `🎭 Mafia o'ynaymizmi? G'altak'da xona ochdim — kod: ${id}`;
    if (link && tg?.openTelegramLink) tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
    else if (navigator.share) navigator.share({ text: text + (link ? "\n" + link : "") }).catch(() => {});
    else navigator.clipboard?.writeText(id).then(() => toast("Kod nusxalandi: " + id));
  }

  // tanlov tugmasi: kim kimni nishonga olishi mumkin
  function actionFor(p, j) {
    const me = P(); if (!me?.alive || !p.alive || v.phase === "end" || v.phase === "lobby") return "";
    const sel = v.mine === j;
    if (v.phase === "night") {
      if (isMaf(me.role)) {
        if (mode === "dcheck" && me.role === "don") return j === v.me || isMaf(p.role) ? "" : `<button class="pill ${v.dcheck === j ? "ok" : ""}" data-a="dcheck" data-t="${j}">🔍</button>`;
        return isMaf(p.role) ? "" : `<button class="pill ${sel ? "ok" : ""}" data-a="kill" data-t="${j}">🔫</button>`;
      }
      if (me.role === "doctor") return j === v.lastHeal ? `<span class="busy">kecha davolangan</span>` : `<button class="pill ${sel ? "ok" : ""}" data-a="heal" data-t="${j}">💉</button>`;
      if (me.role === "kom") return j === v.me ? "" : `<button class="pill ${sel ? "ok" : ""}" data-a="check" data-t="${j}">🔍</button>`;
    }
    if (v.phase === "vote" && j !== v.me) return `<button class="pill ${sel ? "ok" : ""}" data-a="vote" data-t="${j}">🗳</button>`;
    return "";
  }
  function voteCount(j) {
    const src = v.phase === "vote" ? v.votes : v.phase === "night" ? v.mafiaVotes : null;
    if (!src) return 0; return Object.values(src).filter(t => +t === j).length;
  }
  function hintText() {
    const me = P(); if (!me) return "";
    if (v.phase === "lobby") return v.host ? `Kamida 4 kishi bo'lgach «Boshlash»ni bosing. Do'stlarni chaqiring yoki 🤖 bot qo'shing.` : "Xona egasi o'yinni boshlashini kuting…";
    if (v.phase === "end") return "";
    if (!me.alive) return "👻 Siz o'yindan chiqdingiz. O'yinni oxirigacha kuzatishingiz mumkin, lekin yoza olmaysiz.";
    if (v.phase === "night") {
      if (isMaf(me.role)) return me.role === "don" && mode === "dcheck" ? "🔍 Kimni tekshirasiz? Komissarni topsangiz — ertaga uni nishonga oling." : "🔫 Sheriklaringiz bilan qurbonni tanlang. Pastda faqat mafia ko'radigan chat ochiq.";
      if (me.role === "doctor") return "💉 Kimni davolaysiz? (o'zingizni ham davolashingiz mumkin)";
      if (me.role === "kom") return "🔍 Kimni tekshirasiz? Natija ertalab faqat sizga ko'rinadi.";
      return "😴 Siz uxlayapsiz. Tong otishini kuting…";
    }
    if (v.phase === "day") return `💬 Muhokama qiling. Mafia kim bo'lishi mumkin?`;
    if (v.phase === "vote") return v.mine === undefined ? "🗳 Kimni chiqaramiz? Tanlang yoki o'tkazib yuboring." : v.mine === -1 ? "Siz ovoz bermadingiz (o'tkazib yubordingiz). O'zgartirish mumkin." : "Ovozingiz qabul qilindi. Vaqt tugaguncha o'zgartirish mumkin.";
    return "";
  }

  function draw(force) {
    if (!v || !alive) return;
    const s = JSON.stringify([v.phase, v.round, v.players, v.log.length, v.chat.length, v.mine, v.dcheck, v.votes, v.mafiaVotes, v.ready, v.iReady, mode, showRole, v.host, !!rec, playing]);
    if (!force && s === sig) { tickClock(); return; }
    sig = s;
    const me = P(), role = me?.role, box0 = document.querySelector(".mf-feed");
    const typed = document.querySelector("#mfmsg"), keep = typed ? { val: typed.value, focus: document.activeElement === typed } : null; // yozilayotgan matn yo'qolmasin
    const atEnd = !box0 || box0.scrollHeight - box0.scrollTop - box0.clientHeight < 80;
    const canChat = v.phase === "lobby" || v.phase === "end" || (me?.alive && (v.phase === "day" || v.phase === "vote" || (v.phase === "night" && isMaf(role))));
    const feed = [...v.log.map(l => ({ n: l.n, sys: l.text })), ...v.chat.map(c => ({ ...c }))].sort((a, b) => a.n - b.n).slice(-80);
    const won = v.winner && role ? (isMaf(role) ? v.winner === "mafia" : v.winner === "town") : null;
    app().innerHTML = header(`🎭 Mafia <small class="mf-code">${esc(id)}</small>`, v.phase !== "lobby" && v.phase !== "end" ? `<span class="mf-clock" id="mfclock">${left}s</span>` : "") + `
      <div class="mf-phase ph-${v.phase}"><b>${PH[v.phase]}${v.round && v.phase !== "end" ? ` · ${v.round}-${v.phase === "night" ? "tun" : "kun"}` : ""}</b>
        ${v.phase === "end" ? `<span>${v.winner === "town" ? "Tinch aholi yutdi 🏆" : "Mafia yutdi 🏆"}${won === null ? "" : won ? " — siz g'olibsiz!" : " — siz yutqazdingiz"}</span>` : `<span>${v.players.filter(p => p.alive).length} tirik · ${v.players.length} kishi</span>`}</div>
      ${role ? `<button class="mf-role ${showRole || v.phase === "end" ? "on" : ""} ${isMaf(role) ? "maf" : ""}" data-role>
        ${showRole || v.phase === "end" ? `<span class="ri">${R[role][0]}</span><span><b>Sizning rolingiz: ${R[role][1]}</b><small>${R[role][2]}</small></span>` : `<span class="ri">🂠</span><span><b>Rolingizni ko'rish uchun bosing</b><small>Atrofingizdagilar ko'rmasin 🤫</small></span>`}</button>` : ""}
      ${role === "don" && v.phase === "night" && me.alive ? `<div class="seg" style="margin-top:10px"><button data-mode="kill" aria-pressed="${mode === "kill"}">🔫 Qurbon</button><button data-mode="dcheck" aria-pressed="${mode === "dcheck"}">🔍 Tekshirish</button></div>` : ""}
      ${hintText() ? `<p class="small muted mf-hint">${hintText()}</p>` : ""}
      <div class="mf-players">${v.players.map((p, j) => {
        const n = voteCount(j);
        return `<div class="mf-p ${p.alive ? "" : "dead"} ${j === v.me ? "me" : ""} ${p.role && isMaf(p.role) && j !== v.me && v.phase !== "end" && isMaf(role) ? "mate" : ""}">
          <span class="avatar sm ${p.av ? "emo" : ""}">${esc(p.av || (p.name || "?")[0])}</span>
          <span class="nm">${esc(p.name)}${j === v.me ? " (siz)" : ""}<small>${!p.alive ? (p.left ? "🚪 chiqib ketdi" : "💀 o'ldi") : "tirik"}${p.role && (j !== v.me || v.phase === "end") ? ` · ${R[p.role][0]} ${R[p.role][1]}` : ""}</small></span>
          ${n ? `<b class="mf-n">${n}</b>` : ""}${actionFor(p, j)}</div>`;
      }).join("")}</div>
      ${v.phase === "vote" && me?.alive ? `<button class="btn alt" data-skip style="margin-top:10px">${v.mine === -1 ? "✓ " : ""}Hech kimni chiqarmaslik</button>` : ""}
      ${v.phase === "day" && me?.alive ? `<button class="btn ${v.iReady ? "alt" : ""}" data-ready style="margin-top:10px" ${v.iReady ? "disabled" : ""}>✋ Ovozga o'tamiz · ${v.ready}/${v.need}</button>` : ""}
      ${v.phase === "lobby" ? `<div class="stack" style="margin-top:12px">
          <button class="btn" data-inv>📨 Do'stlarni chaqirish</button>
          ${v.host ? `<div class="row" style="gap:8px;display:flex"><button class="btn alt" data-bot>🤖 Bot qo'shish</button><button class="btn alt" data-unbot>➖ Botni olish</button></div>
            <button class="btn green" data-start ${v.players.length < 4 ? "disabled" : ""}>▶️ Boshlash (${v.players.length}/12)</button>` : ""}</div>` : ""}
      ${v.phase === "end" ? `<div class="stack" style="margin-top:12px">${v.host ? `<button class="btn green" data-again>🔁 Yana o'ynash</button>` : `<p class="small muted center" style="margin:0">Xona egasi yangi o'yin boshlashi mumkin</p>`}<button class="btn alt" data-exit>Chiqish</button></div>` : ""}
      ${["night", "day", "vote"].includes(v.phase) ? `<button class="linkbtn" data-quit style="margin-top:8px">🚪 O'yindan butunlay chiqish</button>` : ""}
      <h2 class="sect">${v.phase === "night" && isMaf(role) ? "🔫 Mafia chati (faqat sheriklar)" : "Voqealar va chat"}</h2>
      <div class="mf-feed">${feed.length ? feed.map(f => f.sys ? `<div class="mf-sys">${esc(f.sys)}</div>`
        : `<div class="mf-msg ${f.i === v.me ? "mine" : ""} ${f.ch === "mafia" ? "maf" : ""}"><b>${esc(v.players[f.i]?.name || "?")}${f.ch === "mafia" ? " 🔫" : ""}</b>${f.voice ? `<button class="mf-voice ${playing === f.voice ? "on" : ""}" data-play="${f.voice}"><i>${playing === f.voice ? "⏸" : "▶️"}</i><span class="wave"></span><small>${mmss(f.dur)}</small></button>`
          : f.gone ? `<span class="muted small">🎤 ovozli xabar (o'yin tugagach o'chirildi)</span>` : ""}${esc(f.text)}</div>`).join("")
        : `<p class="muted small center">Hali hech narsa yo'q</p>`}</div>
      ${rec ? `<div class="cbar mf-recbar" style="margin-top:8px"><span class="mf-dot"></span><b id="mfrec">${mmss((Date.now() - rec.t0) / 1000)}</b><span class="grow small muted">Yozilmoqda… (${MAXREC} s gacha)</span>
          <button class="btn alt" data-rx style="width:auto">✕</button><button class="btn" data-rsend style="width:auto">➤</button></div>`
      : `<div class="cbar" style="margin-top:8px"><input class="inp" id="mfmsg" maxlength="200" autocomplete="off" ${canChat ? "" : "disabled"}
        placeholder="${canChat ? (v.phase === "night" ? "Sheriklarga yozing…" : "Xabar yozing…") : !me?.alive ? "Siz kuzatuvchisiz" : "Tunda faqat mafia yozadi 😴"}">
        <button class="btn alt mf-mic" data-mic style="width:auto" ${canChat ? "" : "disabled"} aria-label="Ovozli xabar">🎤</button><button class="btn" data-send style="width:auto" ${canChat ? "" : "disabled"}>➤</button></div>`}`;
    bindBack();
    const box = document.querySelector(".mf-feed"); if (atEnd || force) box.scrollTop = box.scrollHeight;
    const q = s => app().querySelector(s), on = (s, f) => { const e = q(s); if (e) e.onclick = f; };
    on("[data-role]", () => { showRole = !showRole; haptic("light"); draw(true); });
    app().querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { mode = b.dataset.mode; draw(true); });
    app().querySelectorAll("[data-a]").forEach(b => b.onclick = () => doAct(b.dataset.a, +b.dataset.t));
    on("[data-skip]", () => doAct("vote", -1));
    on("[data-ready]", () => doAct("ready", 0));
    on("[data-inv]", invite);
    on("[data-bot]", () => host("bot"));
    on("[data-unbot]", () => host("bot", { remove: true }));
    on("[data-start]", () => host("start"));
    on("[data-again]", () => host("again"));
    on("[data-exit]", quit);
    on("[data-quit]", () => { if (!P()?.alive || confirm("O'yindan chiqasizmi? Siz o'yindan chetlatilasiz va rolingiz hammaga ochiladi.")) quit(); });
    on("[data-send]", sendMsg);
    on("[data-mic]", recStart);
    on("[data-rx]", () => recStop(false));
    on("[data-rsend]", () => recStop(true));
    app().querySelectorAll("[data-play]").forEach(b => b.onclick = () => play(+b.dataset.play));
    if (keep) { const ni = q("#mfmsg"); if (ni && !ni.disabled) { ni.value = keep.val; if (keep.focus) ni.focus(); } }
    const inp = q("#mfmsg"); if (inp) inp.onkeydown = e => { if (e.key === "Enter") sendMsg(); };
  }
  function quit() { ended = true; lset("mafia-room", ""); mapi("leave", { id }).catch(() => {}); back(); }
  function tickClock() { const c = document.getElementById("mfclock"); if (c) { c.textContent = left + "s"; c.classList.toggle("low", left <= 10); } }

  return {
    busy: true, act: "mafia",
    render() {
      alive = true; sig = "";
      if (v) draw(true); else app().innerHTML = header("🎭 Mafia") + `<p class="muted center">Xonaga ulanmoqda…</p>`;
      pull();
      timer = setInterval(() => { if (!document.hidden) pull(); }, 1500);
      clock = setInterval(() => { if (left > 0) { left--; tickClock(); } }, 1000);
    },
    // orqaga qaytilsa: kutish xonasidan chiqamiz; o'yin ketayotgan bo'lsa — o'yinda qolasiz (bo'limdan «Xonaga qaytish»)
    leave() {
      stop();
      if (!ended && v?.phase === "lobby") { ended = true; lset("mafia-room", ""); mapi("leave", { id }).catch(() => {}); }
    },
  };
}
