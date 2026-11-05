// Ommaviy "O'yin chati": hamma yozadi, admin (Rahnamo) savollarga javob beradi
import { app, api, esc, toast, header, haptic, tabBadge, paintTabs } from "./core.js";

// oxirgi ko'rilgan xabar raqami (qurilmada saqlanadi); null = hali hech qachon ochilmagan
export const roomSeen = () => { try { const v = localStorage.getItem("galtak-room-seen"); return v === null ? null : Number(v) || 0; } catch (e) { return null; } };
export const setRoomSeen = n => { try { localStorage.setItem("galtak-room-seen", String(n)); } catch (e) {} tabBadge.room = 0; paintTabs(); };

const av = m => `<span class="avatar sm ${m.avatar ? "emo" : ""}">${esc(m.avatar || (m.name || "?")[0] || "?")}</span>`;
const fmt = t => { const d = new Date(t); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

export function roomScreen() {
  let msgs = [], timer = null, alive = true, sending = false, blocked = false, reply = null, sig = "";
  function bar() {
    const el = document.querySelector("#rrep"); if (!el) return;
    el.hidden = !reply;
    el.innerHTML = reply ? `<span>↩ <b>${esc(reply.name)}</b>: ${esc(reply.body.slice(0, 60))}</span><button data-rx aria-label="Bekor">✕</button>` : "";
    const x = el.querySelector("[data-rx]"); if (x) x.onclick = () => { reply = null; bar(); };
  }
  function draw(force) {
    const box = document.querySelector(".rmsgs"); if (!box) return;
    const s = msgs.map(m => m.id).join(",") + "|" + blocked;
    if (!force && s === sig) return; sig = s;
    const atEnd = box.scrollHeight - box.scrollTop - box.clientHeight < 90;
    box.innerHTML = msgs.length ? msgs.map(m => `<div class="rmsg ${m.mine ? "mine" : ""} ${m.admin ? "adm" : ""}" data-id="${m.id}">
        ${m.mine ? "" : av(m)}
        <div class="rb"><div class="rn">${esc(m.name)}${m.admin ? ` <i class="rbadge">rahnamo</i>` : ""}</div>
          ${m.reply ? `<div class="rq"><b>${esc(m.reply.name)}</b> ${esc(m.reply.body)}</div>` : ""}
          <div class="rt">${esc(m.body)}</div>
          <div class="rf"><time>${fmt(m.at)}</time><button data-rep="${m.id}">↩ Javob</button></div></div></div>`).join("")
      : `<p class="muted center" style="margin:24px 0">Hali xabar yo'q. Birinchi bo'lib yozing 🙂</p>`;
    box.querySelectorAll("[data-rep]").forEach(b => b.onclick = () => {
      const m = msgs.find(x => x.id === Number(b.dataset.rep)); if (!m) return;
      reply = { id: m.id, name: m.name, body: m.body }; bar(); haptic("light"); document.querySelector("#rmsg")?.focus();
    });
    if (atEnd || msgs.length < 12 || force === "end") box.scrollTop = box.scrollHeight;
    const inp = document.querySelector("#rmsg"), bt = document.querySelector("[data-rsend]");
    if (inp) { inp.disabled = blocked; inp.placeholder = blocked ? "Siz guruhda yozishdan chetlatilgansiz" : "Xabar yozing…"; }
    if (bt) bt.disabled = blocked;
  }
  async function pull() {
    try {
      const r = await api("room_get");
      if (!alive) return;
      msgs = r.messages || []; blocked = !!r.blocked; draw();
      if (msgs.length) setRoomSeen(Math.max(...msgs.map(m => m.id)));
    } catch (e) {}
  }
  async function send() {
    const inp = document.querySelector("#rmsg"); const text = inp.value.trim();
    if (!text || sending || blocked) return;
    sending = true;
    // maydonni darrov tozalaymiz (telefonda avto-tuzatish matnni qaytarib qo'ymasligi uchun keyingi kadrda yana tekshiramiz)
    inp.value = "";
    requestAnimationFrame(() => { if (inp.value.trim() === text) inp.value = ""; });
    const restore = () => { if (!inp.value) inp.value = text; };
    try {
      const r = await api("room_send", { text, reply: reply?.id || 0 });
      if (r.error === "contact") { restore(); toast("Telefon raqam, username yoki havola yozish mumkin emas"); }
      else if (r.error === "wait") { restore(); toast("Biroz sekinroq yozing 🙂"); }
      else if (r.error === "dup") { toast("Bu xabarni yaqinda yuborgansiz"); }
      else if (r.error === "blocked") { blocked = true; draw(true); toast("Siz guruhda yozishdan chetlatilgansiz"); }
      else if (r.error) { restore(); toast("Xabar yuborilmadi"); }
      else { inp.value = ""; reply = null; bar(); haptic("light"); await pull(); draw("end"); }
    } catch (e) { restore(); toast(e.message); }
    sending = false; if (!blocked) inp.focus();
  }
  return {
    tab: "room",
    render() {
      alive = true; sig = "";
      app().innerHTML = header("🗨️ O'yin chati") + `
        <div class="rchat"><div class="rmsgs"></div>
          <div class="rrep" id="rrep" hidden></div>
          <div class="cbar"><input class="inp" id="rmsg" maxlength="300" placeholder="Xabar yozing…" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="send"><button class="btn" data-rsend aria-label="Yuborish">➤</button></div>
          <p class="small muted" style="margin:6px 4px 0">Hamma o'yinchilar ko'radi. Savolingizni yozing, rahnamo javob beradi. Haqorat, raqam, username va havola yo'q. Qoidani buzganlar chetlatiladi.</p></div>`;
      app().querySelector("[data-rsend]").onclick = send;
      app().querySelector("#rmsg").onkeydown = e => { if (e.key === "Enter") send(); };
      draw(true); pull().then(() => draw("end"));
      timer = setInterval(() => { if (!document.hidden) pull(); }, 3000);
    },
    leave() { alive = false; clearInterval(timer); },
  };
}
