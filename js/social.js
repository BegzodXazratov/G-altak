// Profil, do'stlar va do'stlar chati
import { app, show, api, me, profile, setProfile, esc, toast, header, bindBack, haptic, nav, level, MAX_SCORE, refreshProfile, back } from "./core.js";

export const AVATARS = ["😎", "🦁", "🐯", "🦊", "🐼", "🐸", "🦄", "🐲", "🦅", "🐺", "🤖", "👽", "🥷", "🧙", "👑", "🔥", "⚡", "🚀", "🎯", "🏆", "🦉", "🐻", "🐧", "🦈"];
export const avatar = (p, cls = "") => `<span class="avatar ${cls} ${p?.avatar ? "emo" : ""}">${esc(p?.avatar || (p?.name || "?")[0] || "?")}</span>`;

// ---------- ijtimoiy holat (har 6 soniyada ping beradi) ----------
export const social = { unread: 0, requests: [], friendsOnline: 0 };
export function applyPing(r) {
  const prevReq = social.requests.length, prevUnread = social.unread;
  social.unread = r.unread || 0; social.requests = r.requests || [];
  if (social.requests.length > prevReq) toast(`👋 ${social.requests[0]} sizga do'stlik so'rovi yubordi`);
  else if (social.unread > prevUnread && !document.querySelector(".chat")) toast("💬 Yangi xabar keldi");
  paintBadge();
}
export const badgeCount = () => social.unread + social.requests.length;
export function paintBadge() {
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

// ---------- do'stlar ----------
export function friendsScreen() {
  let data = null, timer = null, alive = true;
  async function load() {
    try { data = await api("friends"); social.friendsOnline = (data.friends || []).filter(f => f.online).length; } catch (e) { data = data || { friends: [], incoming: [], outgoing: [] }; }
    if (alive && document.querySelector(".frs")) draw();
  }
  function draw() {
    const d = data;
    app().innerHTML = header("👥 Do'stlar") + `<div class="frs">
      <button class="btn" data-find>➕ Do'st qo'shish — onlayn o'yinchilar</button>
      ${d === null ? `<p class="muted">Yuklanmoqda…</p>` : ""}
      ${d?.incoming?.length ? `<h2 class="sect">Do'stlik so'rovlari</h2>${d.incoming.map(p => `
        <div class="onrow">${avatar(p, "sm")}<span class="nm">${esc(p.name)}<small>do'st bo'lishni xohlaydi</small></span>
          <button class="pill ok" data-acc="${esc(p.h)}">Qabul</button><button class="pill" data-dec="${esc(p.h)}">✕</button></div>`).join("")}` : ""}
      ${d ? `<h2 class="sect">Do'stlarim · ${d.friends.length}</h2>
        ${d.friends.length ? d.friends.map(f => `
          <div class="onrow">${avatar(f, "sm")}
            <span class="nm">${esc(f.name)}<small>${f.online ? (f.busy ? "🎮 o'ynamoqda" : "🟢 onlayn") : "oflayn"} · ${level(f.rating).icon} ${f.rating}</small></span>
            <button class="pill chatb" data-chat="${esc(f.h)}">💬${f.unread ? `<b class="bdg">${f.unread}</b>` : ""}</button>
            ${f.online && !f.busy ? `<button class="pill ok" data-inv="${esc(f.h)}">🎮 Taklif</button>` : ""}
            <button class="pill" data-more="${esc(f.h)}" aria-label="Boshqa">⋯</button></div>`).join("")
          : `<div class="card center"><p style="margin:0">Hali do'stingiz yo'q 🙂</p><p class="small muted">«Do'st qo'shish» orqali onlayn o'yinchilarga so'rov yuboring yoki reytingdan toping.</p></div>`}
        ${d.outgoing?.length ? `<p class="small muted" style="margin:10px 4px 0">Javob kutilmoqda: ${d.outgoing.map(p => esc(p.name)).join(", ")}</p>` : ""}` : ""}
    </div>`;
    bindBack();
    const byH = h => d.friends.find(f => f.h === h);
    app().querySelector("[data-find]").onclick = () => nav.online?.();
    app().querySelectorAll("[data-acc]").forEach(b => b.onclick = () => answer(b.dataset.acc, true));
    app().querySelectorAll("[data-dec]").forEach(b => b.onclick = () => answer(b.dataset.dec, false));
    app().querySelectorAll("[data-chat]").forEach(b => b.onclick = () => show(chatScreen(byH(b.dataset.chat))));
    app().querySelectorAll("[data-inv]").forEach(b => b.onclick = () => nav.pick?.(b.dataset.inv, byH(b.dataset.inv).name));
    app().querySelectorAll("[data-more]").forEach(b => b.onclick = async () => {
      const f = byH(b.dataset.more);
      if (!confirm(`${f.name} ni do'stlardan chiqarasizmi?`)) return;
      try { await api("friend_remove", { h: f.h }); toast("Do'stlardan chiqarildi"); load(); } catch (e) { toast(e.message); }
    });
  }
  async function answer(h, accept) {
    try { await api("friend_answer", { h, accept }); haptic("ok"); toast(accept ? "Endi do'stsiz 🤝" : "Rad etildi"); load(); } catch (e) { toast(e.message); }
  }
  return {
    render() { alive = true; draw(); load(); timer = setInterval(load, 6000); },
    leave() { alive = false; clearInterval(timer); },
  };
}

// do'stlik so'rovi yuborish (onlayn ro'yxat va reytingdan)
export async function addFriend(h) {
  try {
    const r = await api("friend_add", { h });
    if (r.error === "already") toast("Siz allaqachon do'stsiz 🙂");
    else if (r.error === "wait") toast("Bugun juda ko'p so'rov yubordingiz — ertaga davom eting");
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
      else if (r.error === "not_friend") toast("Bu o'yinchi endi do'stingiz emas");
      else if (r.error) toast("Xabar yuborilmadi");
      else { inp.value = ""; await pull(); haptic("light"); }
    } catch (e) { toast(e.message); }
    sending = false; inp.focus();
  }
  return {
    render() {
      alive = true;
      app().innerHTML = header(`${esc(friend.avatar || "")} ${esc(friend.name)}`) + `
        <div class="chat"><div class="msgs"></div>
          <div class="cbar"><input class="inp" id="cmsg" maxlength="300" placeholder="Xabar yozing…" autocomplete="off"><button class="btn" data-send aria-label="Yuborish">➤</button></div>
          <p class="small muted" style="margin:6px 4px 0">Faqat o'yin haqida gaplashing. Raqam, username va havola yuborib bo'lmaydi.</p></div>`;
      bindBack();
      app().querySelector("[data-send]").onclick = send;
      app().querySelector("#cmsg").onkeydown = e => { if (e.key === "Enter") send(); };
      draw(); pull(true);
      timer = setInterval(pull, 2500);
    },
    leave() { alive = false; clearInterval(timer); refreshProfile(); },
  };
}

nav.friends = () => show(friendsScreen());
nav.profile = () => show(profileScreen());
