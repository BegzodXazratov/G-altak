// Mafia: guruh o'yini (4–12 kishi). Bu fayl faqat serverda ishlaydi — rollar mijozga yuborilmaydi.
// Fazalar: lobby → night → day → vote → night … → end. Har fazaning vaqti bor; hamma harakat qilsa, faza erta tugaydi.

export const MIN_P = 4, MAX_P = 12;
export const T = { night: 45, day: 90, vote: 40 }; // soniya
export const ROLE = {
  don: { name: "Don", icon: "🎩", team: "mafia", about: "Mafia boshlig'i. Kechasi kimni o'ldirishni hal qiladi va bitta odamni komissarmi-yo'qmi tekshiradi." },
  mafia: { name: "Mafia", icon: "🔫", team: "mafia", about: "Kechasi sheriklaringiz bilan bitta odamni tanlaysiz. Kunduzi o'zingizni tinch aholi qilib ko'rsating." },
  doctor: { name: "Doktor", icon: "💉", team: "town", about: "Har kecha bitta odamni davolaysiz. Mafia o'sha odamni tanlasa — u tirik qoladi. Bir odamni ketma-ket ikki kecha davolab bo'lmaydi." },
  kom: { name: "Komissar", icon: "🕵️", team: "town", about: "Har kecha bitta odamni tekshirasiz: u mafiami yoki yo'qmi. Bilganingizni kunduzi ehtiyot bo'lib ayting." },
  civ: { name: "Tinch aholi", icon: "👨‍🌾", team: "town", about: "Kechasi uxlaysiz. Kunduzi muhokama qilib, mafiani topib ovoz bilan chiqaring." },
};
export const isMafia = r => r === "don" || r === "mafia";

const rnd = n => (Math.random() * n) | 0;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// o'yinchilar soniga qarab rollar
export function rolesFor(n) {
  const maf = n <= 5 ? 1 : n <= 8 ? 2 : 3;
  const r = ["don"];
  for (let i = 1; i < maf; i++) r.push("mafia");
  r.push("doctor");
  if (n >= 5) r.push("kom");
  while (r.length < n) r.push("civ");
  return r;
}
export const BOT_NAMES = ["Botir", "Sardor", "Malika", "Jasur", "Dilnoza", "Otabek", "Nodira", "Shoxrux", "Kamola", "Bekzod", "Zarina"];

export function newLobby(host, now) {
  return { host: host.id, players: [{ ...host, alive: true, role: null }], phase: "lobby", round: 0, deadline: 0,
    night: {}, votes: {}, ready: [], lastHeal: -1, log: [], chat: [], seq: 0, winner: null, at: now };
}

const alive = s => s.players.map((p, i) => i).filter(i => s.players[i].alive);
const say = (s, text, to = "all", now = Date.now()) => { s.log.push({ n: ++s.seq, text, to, at: now }); if (s.log.length > 80) s.log.shift(); };
const nm = (s, i) => s.players[i]?.name || "?";
const roleTag = r => `${ROLE[r].icon} ${ROLE[r].name}`;

export function winnerOf(s) {
  const al = alive(s), m = al.filter(i => isMafia(s.players[i].role)).length;
  if (m === 0) return "town";
  if (m >= al.length - m) return "mafia";
  return null;
}

// kim bu fazada harakat qilishi kerak
export function actorsOf(s) {
  const al = alive(s);
  if (s.phase === "night") return al.filter(i => isMafia(s.players[i].role) || ["doctor", "kom"].includes(s.players[i].role));
  if (s.phase === "vote") return al;
  return [];
}
function nightDone(s) {
  const n = s.night, al = alive(s);
  return al.every(i => {
    const r = s.players[i].role;
    if (isMafia(r) && n.kill?.[i] === undefined) return false;
    if (r === "don" && n.dcheck === undefined) return false;
    if (r === "doctor" && n.heal === undefined) return false;
    if (r === "kom" && n.check === undefined) return false;
    return true;
  });
}

// botlar (sinov va bo'sh joylar uchun) tasodifiy harakat qiladi
function botsAct(s) {
  const al = alive(s);
  const pick = (arr) => arr.length ? arr[rnd(arr.length)] : -1;
  for (const i of al) {
    const p = s.players[i]; if (!p.bot) continue;
    if (s.phase === "night") {
      if (isMafia(p.role)) { s.night.kill = s.night.kill || {}; const t = Object.values(s.night.kill)[0]; s.night.kill[i] = t !== undefined ? t : pick(al.filter(j => !isMafia(s.players[j].role))); }
      if (p.role === "don") s.night.dcheck = pick(al.filter(j => !isMafia(s.players[j].role)));
      if (p.role === "doctor") s.night.heal = pick(al.filter(j => j !== s.lastHeal));
      if (p.role === "kom") s.night.check = pick(al.filter(j => j !== i));
    }
    if (s.phase === "vote") s.votes[i] = Math.random() < 0.25 ? -1 : pick(al.filter(j => j !== i));
  }
}

function enter(s, phase, now) {
  s.phase = phase;
  s.deadline = phase === "end" ? 0 : now + T[phase] * 1000;
  if (phase === "night") { s.round++; s.night = { kill: {} }; say(s, `🌙 ${s.round}-tun. Shahar uxlaydi. Mafia, doktor va komissar uyg'onadi…`, "all", now); }
  if (phase === "day") { s.ready = []; }
  if (phase === "vote") { s.votes = {}; say(s, "🗳 Ovoz berish boshlandi: kimni shahardan chiqaramiz?", "all", now); }
  botsAct(s);
}

function finish(s, w, now) {
  s.winner = w;
  s.chat.forEach(c => { if (c.voice) { c.voice = 0; c.gone = true; } }); // ovozlar o'chiriladi (serverda ham)
  say(s, w === "town" ? "🏆 Tinch aholi g'alaba qozondi! Barcha mafia topildi." : "🏆 Mafia g'alaba qozondi! Shahar ularning qo'lida.", "all", now);
  enter(s, "end", now);
}

function resolveNight(s, now) {
  const n = s.night, al = alive(s);
  // mafia nishoni: ko'pchilik ovozi; teng bo'lsa — Don tanlovi
  const cnt = {};
  Object.entries(n.kill || {}).forEach(([v, t]) => { if (t >= 0 && s.players[+v]?.alive) cnt[t] = (cnt[t] || 0) + 1; });
  let target = -1, best = 0;
  Object.entries(cnt).forEach(([t, c]) => { if (c > best) { best = c; target = +t; } else if (c === best) target = -2; });
  if (target === -2) { const don = al.find(i => s.players[i].role === "don"); const dv = don !== undefined ? n.kill[don] : undefined; target = dv !== undefined && dv >= 0 ? dv : +Object.keys(cnt)[0]; }
  // komissar va don tekshiruvlari (faqat o'ziga ko'rinadi)
  const kom = al.find(i => s.players[i].role === "kom");
  if (kom !== undefined && n.check >= 0 && s.players[n.check]) say(s, `🕵️ Tekshiruv: ${nm(s, n.check)} — ${isMafia(s.players[n.check].role) ? "MAFIA 🔫" : "tinch odam ✅"}`, kom, now);
  const don = al.find(i => s.players[i].role === "don");
  if (don !== undefined && n.dcheck >= 0 && s.players[n.dcheck]) say(s, `🎩 Tekshiruv: ${nm(s, n.dcheck)} ${s.players[n.dcheck].role === "kom" ? "— KOMISSAR! 🕵️" : "komissar emas"}`, don, now);
  s.lastHeal = n.heal ?? -1;
  if (target >= 0 && s.players[target]?.alive) {
    if (n.heal === target) say(s, "☀️ Tong otdi. Mafia hujum qildi, lekin doktor qutqarib qoldi — bu tun hech kim o'lmadi.", "all", now);
    else { s.players[target].alive = false; say(s, `☀️ Tong otdi. Tunda ${nm(s, target)} o'ldirildi. U ${roleTag(s.players[target].role)} edi.`, "all", now); }
  } else say(s, "☀️ Tong otdi. Bu tun tinch o'tdi.", "all", now);
  const w = winnerOf(s); if (w) return finish(s, w, now);
  say(s, "💬 Muhokama vaqti: kim mafiaga o'xshaydi?", "all", now);
  enter(s, "day", now);
}

function resolveVote(s, now) {
  const cnt = {}; let skip = 0;
  Object.entries(s.votes).forEach(([v, t]) => { if (!s.players[+v]?.alive) return; if (t < 0) skip++; else cnt[t] = (cnt[t] || 0) + 1; });
  let target = -1, best = 0, tie = false;
  Object.entries(cnt).forEach(([t, c]) => { if (c > best) { best = c; target = +t; tie = false; } else if (c === best) tie = true; });
  if (target >= 0 && !tie && best > skip) {
    s.players[target].alive = false;
    say(s, `⚖️ Shahar qaror qildi: ${nm(s, target)} chiqarildi (${best} ovoz). U ${roleTag(s.players[target].role)} edi.`, "all", now);
  } else say(s, tie ? "⚖️ Ovozlar teng bo'ldi — hech kim chiqarilmadi." : "⚖️ Yetarli ovoz to'planmadi — hech kim chiqarilmadi.", "all", now);
  const w = winnerOf(s); if (w) return finish(s, w, now);
  enter(s, "night", now);
}

function dayReady(s) {
  const humans = alive(s).filter(i => !s.players[i].bot);
  return { ready: s.ready.filter(i => humans.includes(i)).length, need: Math.floor(humans.length / 2) + 1 - (humans.length ? 0 : 1) };
}

// vaqt tugagan yoki hamma harakat qilgan bo'lsa — keyingi fazaga o'tadi. O'zgarish bo'lsa true.
export function tick(s, now = Date.now()) {
  let changed = false;
  for (let k = 0; k < 4; k++) {
    if (s.phase === "night" && (now >= s.deadline || nightDone(s))) { resolveNight(s, now); changed = true; continue; }
    if (s.phase === "day") {
      // tirik odamlarning yarmidan ko'pi "Ovozga o'tamiz" desa — muhokama erta tugaydi (botlar muhokamada qatnashmaydi)
      const { ready, need } = dayReady(s);
      if (now >= s.deadline || ready >= need) { enter(s, "vote", now); changed = true; continue; }
    }
    if (s.phase === "vote" && (now >= s.deadline || alive(s).every(i => s.votes[i] !== undefined))) { resolveVote(s, now); changed = true; continue; }
    break;
  }
  return changed;
}

export function start(s, now = Date.now()) {
  const roles = shuffle(rolesFor(s.players.length));
  s.players.forEach((p, i) => { p.role = roles[i]; p.alive = true; });
  s.log = []; s.chat = []; s.round = 0; s.winner = null; s.lastHeal = -1;
  s.startedAt = now;
  say(s, `🎲 O'yin boshlandi! ${s.players.length} kishi: ${rolesFor(s.players.length).filter(isMafia).length} ta mafia shahar ichida yashirindi.`, "all", now);
  enter(s, "night", now);
}

// o'yinchining tungi/kunduzgi harakati. Xato bo'lsa matn qaytaradi.
export function act(s, i, kind, target, now = Date.now()) {
  const p = s.players[i];
  if (!p || !p.alive) return "dead";
  const t = Number(target), tp = s.players[t], valid = !!tp && tp.alive;
  if (kind === "kill") {
    if (s.phase !== "night" || !isMafia(p.role)) return "no";
    if (!valid || isMafia(tp.role)) return "bad_target";
    s.night.kill = s.night.kill || {}; s.night.kill[i] = t;
    return null;
  }
  if (kind === "heal") { if (s.phase !== "night" || p.role !== "doctor") return "no"; if (!valid) return "bad_target"; if (t === s.lastHeal) return "same_heal"; s.night.heal = t; return null; }
  if (kind === "check") { if (s.phase !== "night" || p.role !== "kom") return "no"; if (!valid || t === i) return "bad_target"; s.night.check = t; return null; }
  if (kind === "dcheck") { if (s.phase !== "night" || p.role !== "don") return "no"; if (!valid || t === i) return "bad_target"; s.night.dcheck = t; return null; }
  if (kind === "vote") { if (s.phase !== "vote") return "no"; if (t !== -1 && (!valid || t === i)) return "bad_target"; s.votes[i] = t; return null; }
  if (kind === "ready") { if (s.phase !== "day") return "no"; if (!s.ready.includes(i)) s.ready.push(i); return null; }
  return "no";
}

const BAD = /(https?:\/\/|t\.me\/|www\.|@[a-z0-9_]{4,}|\d[\d\s\-()]{6,}\d)/i;
// voice = { vid, dur } — ovozli xabar (fayl alohida jadvalda saqlanadi)
export function chat(s, i, text, now = Date.now(), voice = null) {
  const p = s.players[i]; if (!p) return "no";
  const body = String(text || "").replace(/\s+/g, " ").trim().slice(0, 200);
  if (!body && !voice) return "empty";
  if (body && BAD.test(body)) return "contact";
  if (p.lastMsg && now - p.lastMsg < 1200) return "wait";
  let ch;
  if (s.phase === "lobby" || s.phase === "end") ch = "all";
  else if (!p.alive) return "dead";
  else if (s.phase === "night") { if (!isMafia(p.role)) return "sleep"; ch = "mafia"; }
  else ch = "all";
  p.lastMsg = now;
  const m = { n: ++s.seq, i, text: body, ch, at: now };
  if (voice) { m.voice = voice.vid; m.dur = Math.max(1, Math.min(30, Math.round(voice.dur) || 1)); }
  s.chat.push(m);
  if (s.chat.length > 150) s.chat.shift();
  return null;
}

export function leave(s, i, now = Date.now()) {
  const p = s.players[i]; if (!p) return;
  if (s.phase === "lobby") {
    s.players.splice(i, 1);
    if (s.host === p.id) s.host = s.players.find(q => !q.bot)?.id || null;
    return;
  }
  if (p.alive && s.phase !== "end") {
    p.alive = false; say(s, `🚪 ${p.name} o'yinni tark etdi. U ${roleTag(p.role)} edi.`, "all", now);
    const w = winnerOf(s); if (w) finish(s, w, now);
  }
  p.left = true;
}

// o'yinchiga ko'rinadigan holat (begona rollar va maxfiy ma'lumotlar yashiriladi)
export function view(s, meId, now = Date.now()) {
  const me = s.players.findIndex(p => p.id === meId);
  const mp = s.players[me], myMaf = mp && isMafia(mp.role), over = s.phase === "end";
  const see = (p, j) => j === me || over || !p.alive || (myMaf && isMafia(p.role));
  const v = {
    phase: s.phase, round: s.round, left: s.deadline ? Math.max(0, Math.round((s.deadline - now) / 1000)) : 0,
    me, host: mp ? s.host === mp.id : false, winner: s.winner,
    players: s.players.map((p, j) => ({ name: p.name, av: p.av || "", alive: p.alive, bot: !!p.bot, left: !!p.left,
      role: see(p, j) && p.role ? p.role : null })),
    log: s.log.filter(l => l.to === "all" || l.to === me),
    chat: s.chat.filter(c => c.ch === "all" || (c.ch === "mafia" && (myMaf || over))).map(c => ({ n: c.n, i: c.i, text: c.text, ch: c.ch, at: c.at, voice: c.voice, dur: c.dur, gone: !!c.gone })),
    lastHeal: mp?.role === "doctor" ? s.lastHeal : -1,
  };
  if (mp && s.phase === "night") {
    const n = s.night;
    v.mine = mp.role === "doctor" ? n.heal : mp.role === "kom" ? n.check : isMafia(mp.role) ? n.kill?.[me] : undefined;
    if (mp.role === "don") v.dcheck = n.dcheck;
    if (myMaf) v.mafiaVotes = Object.fromEntries(Object.entries(n.kill || {}).filter(([k]) => s.players[+k]?.alive));
  }
  if (s.phase === "vote") { v.votes = s.votes; v.mine = s.votes[me]; }
  if (s.phase === "day") { const d = dayReady(s); v.ready = d.ready; v.need = d.need; v.iReady = s.ready.includes(me); }
  return v;
}
