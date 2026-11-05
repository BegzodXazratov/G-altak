// Profil, do'stlar va do'stlar chati
import { iqTab } from "./iq.js";
import { roomScreen, roomSeen, setRoomSeen } from "./room.js";
import { app, show, api, me, profile, setProfile, esc, toast, header, bindBack, haptic, nav, level, MAX_SCORE, refreshProfile, back, tabBadge, paintTabs, goTab, gameSeconds } from "./core.js";

export const AVATARS = ["😎", "🦁", "🐯", "🦊", "🐼", "🐸", "🦄", "🐲", "🦅", "🐺", "🤖", "👽", "🥷", "🧙", "👑", "🔥", "⚡", "🚀", "🎯", "🏆", "🦉", "🐻", "🐧", "🦈"];
export const avatar = (p, cls = "") => `<span class="avatar ${cls} ${p?.avatar ? "emo" : ""}">${esc(p?.avatar || (p?.name || "?")[0] || "?")}</span>`;

// ---------- ijtimoiy holat (har 6 soniyada ping beradi) ----------
export const social = { unread: 0, requests: [], friendsOnline: 0 };
export function applyPing(r) {
  const prevReq = social.requests.length, prevUnread = social.unread;
  social.unread = r.unread || 0; social.requests = r.requests || [];
  if (social.requests.length > prevReq) toast(`👋 ${social.requests[0]} sizga do'stlik so'rovi yubordi`);
  else if (social.unread > prevUnread && !document.querySelector(".chat")) toast("💬 Yangi xabar keldi");
  // O'yin chati: yangi xabarlar soni tab ustida
  if (r.room_last != null) {
    const seen = roomSeen(), onRoom = !!document.querySelector(".rchat");
    if (seen === null || onRoom) { if (seen === null) setRoomSeen(r.room_last); tabBadge.room = 0; }
    else { const n = r.room_n || 0; if (n > (tabBadge.room || 0) && n > 0) toast("🗨️ O'yin chatida yangi xabar"); tabBadge.room = n; }
  }
  paintBadge();
}
export const badgeCount = () => social.unread + social.requests.length;
export function paintBadge() {
  tabBadge.friends = social.requests.length; tabBadge.chats = social.unread;
  paintTabs();
  const el = document.querySelector("[data-friends] i");
  if (!el) return;
  const n = badgeCount();
  el.textContent = n ? `${n} yangi` : social.friendsOnline ? `${social.friendsOnline} onlayn` : "";
  el.classList.toggle("hot", !!n);
}

// ---------- profil ----------
export function profileScreen() {
  let av = profile?.avatar || "", nm = profile?.name || "";
  return {
    tab: "profile",
    render() {
      const st = profile?.stats?.all || {};
      const lv = level(st.rating ?? 0);
      app().innerHTML = header("👤 Profil") + `
        <div class="card stack center">
          <span class="avatar big ${av ? "emo" : ""}" id="pav">${esc(av || nm[0] || "?")}</span>
          <div class="muted small">${lv.icon} ${lv.name} · ${st.rating ?? 0}/${MAX_SCORE} ball</div>
          <div class="muted small">${st.wins || 0} g'alaba · ${st.losses || 0} mag'lubiyat · ${st.draws || 0} durang</div>
        </div>
        <div class="card stack" style="margin-top:12px">
          <label class="lbl" for="pn">Ismingiz</label>
          <input class="inp" id="pn" maxlength="24" value="${esc(nm)}" autocomplete="off">
          <label class="lbl">Stiker tanlang</label>
          <div class="avgrid">
            <button class="avopt ${!av ? "on" : ""}" data-av="" title="Harf">Aa</button>
            ${AVATARS.map(a => `<button class="avopt ${av === a ? "on" : ""}" data-av="${a}">${a}</button>`).join("")}
          </div>
          <button class="btn green" data-save>Saqlash</button>
          <p class="small muted" style="margin:0">Boshqa o'yinchilar faqat ism, stiker va ballingizni ko'radi.</p>
        </div>`;
      bindBack();
      const inp = app().querySelector("#pn");
      inp.oninput = () => { nm = inp.value; const p = app().querySelector("#pav"); if (!av) p.textContent = nm.trim()[0] || "?"; };
      app().querySelectorAll("[data-av]").forEach(b => b.onclick = () => {
        av = b.dataset.av; haptic("light");
        app().querySelectorAll("[data-av]").forEach(x => x.classList.toggle("on", x === b));
        const p = app().querySelector("#pav"); p.textContent = av || nm.trim()[0] || "?"; p.classList.toggle("emo", !!av);
      });
      app().querySelector("[data-save]").onclick = async () => {
        nm = inp.value.trim();
        if (nm.length < 2 || nm.toLowerCase() === "o'yinchi") return toast("Haqiqiy ismingizni yozing (kamida 2 harf)");
        try {
          const r = await api("profile_update", { name: nm, avatar: av });
          if (r.error === "bad_name") return toast("Bu ism to'g'ri emas — harflar bilan yozing");
          setProfile({ ...profile, ...r }); haptic("ok"); toast("Saqlandi ✅"); back();
        } catch (e) { toast(e.message); }
      };
    },
  };
}

// ---------- bloklash / do'stlikdan chiqarish ----------
function personSheet(p, done) {
  document.getElementById("ov3")?.remove();
  const el = document.createElement("div");
  el.id = "ov3"; el.className = "overlay";
  el.innerHTML = `<div class="card stack center"><h2 style="margin:0">${esc(p.name)}</h2>
    <button class="btn alt" data-rm>Do'stlikdan chiqarish</button>
    <button class="btn danger" data-bl>🚫 Bloklash</button>
    <p class="small muted" style="margin:0">Bloklangan o'yinchi sizga yoza, o'yinga chaqira yoki do'stlik so'rovi yubora olmaydi va onlayn ro'yxatda ko'rinmaydi. Uni «Do'stlar» bo'limidan istalgan payt blokdan chiqarasiz.</p>
    <button class="btn alt" data-x style="opacity:.7">Bekor qilish</button></div>`;
  el.onclick = e => { if (e.target === el) el.remove(); };
  el.querySelector("[data-x]").onclick = () => el.remove();
  el.querySelector("[data-rm]").onclick = async () => {
    if (!confirm(`${p.name} ni do'stlardan chiqarasizmi?`)) return;
    el.remove();
    try { await api("friend_remove", { h: p.h }); toast("Do'stlardan chiqarildi"); done?.("removed"); } catch (e) { toast(e.message); }
  };
  el.querySelector("[data-bl]").onclick = async () => {
    if (!confirm(`${p.name} bloklansinmi?`)) return;
    el.remove();
    try { await api("block", { h: p.h }); haptic("ok"); toast("Bloklandi 🚫"); done?.("blocked"); } catch (e) { toast(e.message); }
  };
  document.body.appendChild(el);
}

// ---------- do'stlar ----------
export function friendsScreen(ctx = null) {
  let data = null, others = null, timer = null, alive = true;
  async function load() {
    try { data = await api("friends"); social.friendsOnline = (data.friends || []).filter(f => f.online).length; } catch (e) { data = data || { friends: [], incoming: [], outgoing: [], blocked: [] }; }
    if (ctx) { try { others = await api("online"); } catch (e) { others = others || []; } }
    if (alive && document.querySelector(".frs")) draw();
  }
  function drawCtx() {
    const GN = { shashka: "Shashka", soz: "Topqir", gugurt: "Gugurt", kim: "Kim topadi?", shch: "SH-chyot", chess: "Shaxmat", arch: "Kamonchi" };
    app().innerHTML = header("🎮 Kimni chaqiramiz?") + `<div class="frs">
      <p class="small muted" style="margin:0 4px 10px">${esc(GN[ctx.game] || "O'yin")} uchun hozir onlayn turganlardan tanlang. <b>🤝 do'st</b> belgisi — sizning do'stingiz.</p>
      <h2 class="sect">Hozir onlayn${others ? ` · ${others.length}` : ""}</h2>
      ${others === null ? `<p class="muted">Yuklanmoqda…</p>` : others.length ? others.map(p => `
        <div class="onrow">${avatar(p, "sm")}<span class="nm">${esc(p.name)}<small>${p.fs === "friend" ? `<em class="fchip on">🤝 do'st</em>` : `<em class="fchip">do'st emas</em>`}${p.busy ? "🎮 o'ynamoqda" : "🟢 onlayn"} · ${level(p.rating).icon} ${p.rating}</small></span>
          ${p.busy ? "" : `<button class="pill ok" data-oinv="${esc(p.h)}">🎮 Taklif</button>`}</div>`).join("")
        : `<div class="card center"><p style="margin:0">Hozir hech kim onlayn emas 😴</p><p class="small muted">Birozdan keyin qayta urinib ko'ring.</p></div>`}
    </div>`;
    bindBack();
    app().querySelectorAll("[data-oinv]").forEach(b => b.onclick = () => { const p = others.find(x => x.h === b.dataset.oinv); nav.inviteGame?.(p.h, p.name, ctx.game); });
  }
  function draw() {
    if (ctx) return drawCtx();
    const d = data;
    const GN = { shashka: "Shashka", soz: "Topqir", gugurt: "Gugurt", kim: "Kim topadi?", shch: "SH-chyot", chess: "Shaxmat", arch: "Kamonchi" };
    app().innerHTML = header(ctx ? "🎮 Kimni chaqiramiz?" : "👥 Do'stlar") + `<div class="frs">
      ${ctx ? `<p class="small muted" style="margin:0 4px 10px">${esc(GN[ctx.game] || "O'yin")} uchun o'yinchini tanlang — do'stingizni yoki onlayn turgan istalgan kishini.</p>` : `<button class="btn" data-find>➕ Do'st qo'shish — onlayn o'yinchilar</button>`}
      ${d === null ? `<p class="muted">Yuklanmoqda…</p>` : ""}
      ${!ctx && d?.incoming?.length ? `<h2 class="sect">Do'stlik so'rovlari</h2>${d.incoming.map(p => `
        <div class="onrow">${avatar(p, "sm")}<span class="nm">${esc(p.name)}<small>do'st bo'lishni xohlaydi</small></span>
          <button class="pill ok" data-acc="${esc(p.h)}">Qabul</button><button class="pill" data-dec="${esc(p.h)}">✕</button></div>`).join("")}` : ""}
      ${d ? `<h2 class="sect">Do'stlarim · ${d.friends.length}</h2>
        ${d.friends.length ? d.friends.map(f => `
          <div class="onrow">${avatar(f, "sm")}
            <span class="nm">${esc(f.name)}<small>${f.online ? (f.busy ? "🎮 o'ynamoqda" : "🟢 onlayn") : "oflayn"} · ${level(f.rating).icon} ${f.rating}</small></span>
            ${ctx ? "" : `<button class="pill chatb" data-chat="${esc(f.h)}">💬${f.unread ? `<b class="bdg">${f.unread}</b>` : ""}</button>`}
            ${f.online && !f.busy ? `<button class="pill ok" data-inv="${esc(f.h)}">🎮 Taklif</button>` : ""}
            ${ctx ? "" : `<button class="pill ghost" data-more="${esc(f.h)}" aria-label="Boshqa">⋯</button>`}</div>`).join("")
          : `<div class="card center"><p style="margin:0">Hali do'stingiz yo'q 🙂</p><p class="small muted">Do'st bo'lmasangiz ham onlayn o'yinchini o'yinga chaqirishingiz mumkin. Do'stlik esa yozishish (chat) uchun kerak: «Do'st qo'shish» orqali so'rov yuboring.</p></div>`}
        ${d.outgoing?.length ? `<p class="small muted" style="margin:10px 4px 0">Javob kutilmoqda: ${d.outgoing.map(p => esc(p.name)).join(", ")}</p>` : ""}
        ${ctx ? `<h2 class="sect">Onlayn o'yinchilar${others ? ` · ${others.length}` : ""}</h2>
          ${others === null ? `<p class="muted">Yuklanmoqda…</p>` : others.length ? others.map(p => `
            <div class="onrow">${avatar(p, "sm")}<span class="nm">${esc(p.name)}<small>${p.busy ? "🎮 o'ynamoqda" : "🟢 onlayn"} · ${level(p.rating).icon} ${p.rating}</small></span>
              ${p.busy ? "" : `<button class="pill ok" data-oinv="${esc(p.h)}">🎮 Taklif</button>`}</div>`).join("")
            : `<p class="small muted" style="margin:0 4px">Hozir boshqa onlayn o'yinchi yo'q.</p>`}` : ""}
        ${!ctx && d.blocked?.length ? `<h2 class="sect">Bloklanganlar · ${d.blocked.length}</h2>${d.blocked.map(p => `
          <div class="onrow">${avatar(p, "sm")}<span class="nm">${esc(p.name)}<small>🚫 bloklangan</small></span>
            <button class="pill ghost" data-unb="${esc(p.h)}">Blokdan chiqarish</button></div>`).join("")}` : ""}` : ""}
    </div>`;
    bindBack();
    const byH = h => d.friends.find(f => f.h === h);
    const fd = app().querySelector("[data-find]"); if (fd) fd.onclick = () => nav.online?.();
    app().querySelectorAll("[data-acc]").forEach(b => b.onclick = () => answer(b.dataset.acc, true));
    app().querySelectorAll("[data-dec]").forEach(b => b.onclick = () => answer(b.dataset.dec, false));
    app().querySelectorAll("[data-chat]").forEach(b => b.onclick = () => show(chatScreen(byH(b.dataset.chat))));
    app().querySelectorAll("[data-inv]").forEach(b => b.onclick = () => ctx ? nav.inviteGame?.(b.dataset.inv, byH(b.dataset.inv).name, ctx.game) : nav.pick?.(b.dataset.inv, byH(b.dataset.inv).name));
    app().querySelectorAll("[data-more]").forEach(b => b.onclick = () => personSheet(byH(b.dataset.more), load));
    app().querySelectorAll("[data-oinv]").forEach(b => b.onclick = () => { const p = others.find(x => x.h === b.dataset.oinv); nav.inviteGame?.(p.h, p.name, ctx.game); });
    app().querySelectorAll("[data-unb]").forEach(b => b.onclick = async () => {
      const p = d.blocked.find(x => x.h === b.dataset.unb);
      try { await api("unblock", { h: p.h }); haptic("ok"); toast(`${p.name} blokdan chiqarildi`); load(); } catch (e) { toast(e.message); }
    });
  }
  async function answer(h, accept) {
    try { await api("friend_answer", { h, accept }); haptic("ok"); toast(accept ? "Endi do'stsiz 🤝" : "Rad etildi"); load(); } catch (e) { toast(e.message); }
  }
  return {
    tab: ctx ? undefined : "friends",
    render() { alive = true; draw(); load(); timer = setInterval(load, 6000); },
    leave() { alive = false; clearInterval(timer); },
  };
}

// ---------- chatlar ro'yxati ----------
export function chatsScreen() {
  let list = null, timer = null, alive = true;
  const fmt = t => { const d = new Date(t), n = new Date(); return d.toDateString() === n.toDateString()
    ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`; };
  async function load() {
    try { list = await api("chat_list"); social.unread = list.reduce((a, c) => a + (c.unread || 0), 0); paintBadge(); } catch (e) { list = list || []; }
    if (alive && document.querySelector(".chl")) draw();
  }
  function draw() {
    app().innerHTML = header("💬 Chatlar") + `<div class="chl">
      ${list === null ? `<p class="muted">Yuklanmoqda…</p>` : list.length ? list.map(c => `
        <button class="onrow chrow" data-chat="${esc(c.h)}">${avatar(c, "sm")}
          <span class="nm">${esc(c.name)}${c.online ? ` <i class="ondot"></i>` : ""}<small>${c.mine ? "Siz: " : ""}${esc(c.last)}</small></span>
          <span class="chmeta"><time>${fmt(c.at)}</time>${c.unread ? `<b class="bdg">${c.unread}</b>` : ""}</span></button>`).join("")
        : `<div class="card center"><p style="margin:0">Hali yozishmalar yo'q 💬</p><p class="small muted">Do'stlaringiz bilan o'yin haqida maslahat va taassurotlarni ulashing.</p>
           <button class="btn" data-tofr>👥 Do'stlarga o'tish</button></div>`}</div>`;
    bindBack();
    app().querySelectorAll("[data-chat]").forEach(b => b.onclick = () => show(chatScreen(list.find(c => c.h === b.dataset.chat))));
    const t = app().querySelector("[data-tofr]"); if (t) t.onclick = () => goTab("friends");
  }
  return {
    tab: "chats",
    render() { alive = true; draw(); load(); timer = setInterval(load, 5000); },
    leave() { alive = false; clearInterval(timer); },
  };
}

// do'stlik so'rovi yuborish (onlayn ro'yxat va reytingdan)
export async function addFriend(h) {
  try {
    const r = await api("friend_add", { h });
    if (r.error === "already") toast("Siz allaqachon do'stsiz 🙂");
    else if (r.error === "wait") toast("Bugun juda ko'p so'rov yubordingiz — ertaga davom eting");
    else if (r.error === "blocked_by_me") toast("Bu o'yinchi bloklangan — «Do'stlar» bo'limidan blokdan chiqaring");
    else if (r.error) toast("So'rov yuborilmadi");
    else if (r.accepted) { toast("Endi do'stsiz 🤝"); haptic("ok"); }
    else { toast("So'rov yuborildi ✅"); haptic("ok"); }
    return r;
  } catch (e) { toast(e.message); return {}; }
}

// ---------- chat ----------
export function chatScreen(friend) {
  let msgs = [], last = 0, timer = null, alive = true, sending = false;
  const fmt = t => { const d = new Date(t); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  async function pull(first) {
    try {
      const r = await api("chat_get", { h: friend.h, after: last });
      if (r.error) { if (first) { toast("Bu o'yinchi endi do'stingiz emas"); back(); } return; }
      if (r.messages?.length) {
        const have = new Set(msgs.map(m => m.id));
        msgs = msgs.concat(r.messages.filter(m => !have.has(m.id)));
        last = Math.max(...msgs.map(m => m.id));
        if (alive) draw(true);
      } else if (first && alive) draw(true);
      social.unread = Math.max(0, social.unread - (friend.unread || 0)); friend.unread = 0;
    } catch (e) {}
  }
  function draw(scroll) {
    const box = document.querySelector(".msgs"); if (!box) return;
    const atEnd = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    box.innerHTML = msgs.length ? msgs.map(m => `<div class="msg ${m.mine ? "mine" : ""}"><span>${esc(m.body)}</span><small>${fmt(m.at)}</small></div>`).join("")
      : `<p class="muted center" style="margin:24px 0">Hali xabar yo'q. O'yin haqida maslahat yoki taassurotingizni yozing 🙂</p>`;
    if (scroll && (atEnd || msgs.length < 12)) box.scrollTop = box.scrollHeight;
  }
  async function send() {
    const inp = document.querySelector("#cmsg"); const text = inp.value.trim();
    if (!text || sending) return;
    sending = true;
    try {
      const r = await api("chat_send", { h: friend.h, text });
      if (r.error === "contact") toast("Telefon raqam, username yoki havola yozish mumkin emas");
      else if (r.error === "wait") toast("Biroz sekinroq yozing 🙂");
      else if (r.error === "not_friend") toast("Bu o'yinchi bilan chat yopilgan");
      else if (r.error) toast("Xabar yuborilmadi");
      else { inp.value = ""; await pull(); haptic("light"); }
    } catch (e) { toast(e.message); }
    sending = false; inp.focus();
  }
  return {
    render() {
      alive = true;
      app().innerHTML = header(`${esc(friend.avatar || "")} ${esc(friend.name)}`, `<button class="pill ghost" data-cmore aria-label="Boshqa">⋯</button>`) + `
        <div class="chat"><div class="msgs"></div>
          <div class="cbar"><input class="inp" id="cmsg" maxlength="300" placeholder="Xabar yozing…" autocomplete="off"><button class="btn" data-send aria-label="Yuborish">➤</button></div>
          <p class="small muted" style="margin:6px 4px 0">Faqat o'yin haqida gaplashing. Raqam, username va havola yuborib bo'lmaydi. Noo'rin yozgan odamni ⋯ orqali bloklang.</p></div>`;
      bindBack();
      app().querySelector("[data-cmore]").onclick = () => personSheet(friend, () => back());
      app().querySelector("[data-send]").onclick = send;
      app().querySelector("#cmsg").onkeydown = e => { if (e.key === "Enter") send(); };
      draw(); pull(true);
      timer = setInterval(pull, 2500);
    },
    leave() { alive = false; clearInterval(timer); refreshProfile(); },
  };
}

nav.tabs = { iq: () => iqTab(), friends: () => friendsScreen(), chats: () => chatsScreen(), room: () => roomScreen(), profile: () => profileScreen() };
nav.friends = ctx => ctx ? show(friendsScreen(ctx), false) : goTab("friends");
nav.profile = () => goTab("profile");
