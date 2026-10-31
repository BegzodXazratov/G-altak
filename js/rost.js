import { app, header, bindBack, show, haptic, toast, esc, load, save } from "./core.js";

const CARDS = {
  dostlar: {
    title: "Do'stlar",
    rost: [
      "Hayotingdagi eng uyatli voqeani aytib ber.",
      "Shu davradagilardan kimga ko'proq ishonasan va nega?",
      "Oxirgi marta qachon yig'lagansan?",
      "Ota-onangdan yashirgan eng katta siring nima edi?",
      "Eng ko'p qaysi narsadan qo'rqasan?",
      "Telefoningdagi eng oxirgi qidiruvni o'qib ber.",
      "Agar 1 kunga ko'rinmas bo'lib qolsang, nima qilarding?",
      "Shu yerdagilardan kim bilan orolda qolishni xohlarding?",
      "Eng yomon sovg'ani kimdan olgansan?",
      "Hech kimga aytmagan orzuing nima?",
      "Bolaligingdagi eng sho'x qilig'ing qaysi?",
      "Qaysi qo'shiqni yolg'iz qolganda baland ovozda kuylaysan?",
      "Shu davradagilardan kim haqida birinchi taassuroting noto'g'ri chiqqan?",
      "Eng uzoq qancha vaqt telefonsiz yurgansan?",
      "Agar 1 milliard so'm yutib olsang, birinchi nimaga sarflaysan?",
      "Kimga hali ham uzr so'rashing kerak deb o'ylaysan?",
      "Eng g'alati odating nima?",
      "Hayotingdagi eng to'g'ri qarorim deb nimani aytasan?",
      "Qaysi film yoki serialni yashirincha ko'p marta ko'rgansan?",
      "Shu davradan kimning qaysi odati seni jahlingni chiqaradi?",
    ],
    jurat: [
      "Chap tomoningdagi odamni 30 soniya maqtab ber.",
      "Biror hayvonning ovozini chiqar — qolganlar topsin.",
      "Telefoningdagi oxirgi rasmni hammaga ko'rsat.",
      "1 daqiqa davomida faqat she'r bilan gapir.",
      "Eng yaqin do'stingga \"Seni sog'indim\" deb yoz.",
      "Davradagi har kimga bitta kompliment ayt.",
      "15 soniya davomida musiqasiz raqs tushib ber.",
      "Kimningdir ovoziga taqlid qilib gapir.",
      "Ko'zingni yumib, qo'lingga berilgan narsani top.",
      "Navbatdagi 2 raund davomida faqat pichirlab gapir.",
      "O'ng tomoningdagi odamga yangi laqab o'ylab top.",
      "Eng sevimli qo'shig'ingning naqoratini kuylab ber.",
      "10 marta o'tirib-tur.",
      "Istalgan bir taomni reklama qilib 20 soniyalik video \"suratga ol\".",
      "Davradagilardan biri bilan joy almash.",
      "Tilingni chiqarib, 3 marta ismingni ayt.",
      "Eng kulgili selfi qilib, davraga ko'rsat.",
      "Ota-onangga qo'ng'iroq qilib, ularni sevishingni ayt.",
      "1 daqiqa davomida kulmasdan bir nuqtaga tikilib tur.",
      "Davradagi kimnidir ertak qahramoniga o'xshatib, sababini ayt.",
    ],
  },
  juftlik: {
    title: "Juftlik",
    rost: [
      "Meni birinchi ko'rganingda nimani o'ylagansan?",
      "Mendagi qaysi odat seni eng ko'p kuldiradi?",
      "Biz birga o'tkazgan eng yaxshi kun qaysi?",
      "Menga hali aytmagan bitta orzuing nima?",
      "Qachon meni eng ko'p sog'ingansan?",
      "Mendan nimani o'rganding?",
      "Bizning qaysi suratimiz senga eng yoqadi?",
      "Biror marta mendan rashk qilganmisan? Qachon?",
      "5 yildan keyin bizni qanday tasavvur qilasan?",
      "Mendagi qaysi xususiyatni hech qachon o'zgartirmasligimni xohlaysan?",
      "Men qilgan eng yoqimli syurpriz qaysi edi?",
      "Biz birga borishimiz kerak bo'lgan joy qaysi?",
      "Menga birinchi marta nima uchun yozgan/qo'ng'iroq qilgansan?",
      "Bizning \"qo'shig'imiz\" qaysi?",
      "Seni nima bilan eng tez xursand qila olaman?",
    ],
    jurat: [
      "Menga 3 ta sabab ayt: nega meni yaxshi ko'rasan.",
      "Mening eng sevimli taomimni top — topolmasang, keyingi safar o'zing pishirasan.",
      "Bizning birinchi uchrashuvimizni 30 soniyada qayta sahnalashtir.",
      "Menga atab 4 qatorli she'r o'ylab top.",
      "Ko'zimga 30 soniya kulmasdan qarab tur.",
      "Telefoningda menga qo'ygan ismni ko'rsat.",
      "Menga ertaga bajaradigan bitta yaxshilik va'da qil.",
      "Meni 1 daqiqa davomida faqat maqtab gapir.",
      "Bizning sevgi hikoyamizni ertak qilib aytib ber.",
      "Sevimli qo'shig'imizdan bir parcha kuylab ber.",
      "Keyingi uchrashuvimizni hozir rejalashtir: qayer, qachon, nima.",
      "Mening ovozimga taqlid qilib, odatiy gapimni ayt.",
      "Menga rasm chizib ber — 1 daqiqada.",
      "Biz haqimizda 3 ta qiziq faktni ayt.",
      "Shu daqiqada menga chiroyli xabar yozib yubor.",
    ],
  },
  oila: {
    title: "Oila",
    rost: [
      "Bolaligingdagi eng sevimli o'yining qaysi edi?",
      "Oiladagi eng kulgili voqea qaysi?",
      "Buvim yoki bobomdan qaysi gapni hech unutmaysan?",
      "Katta bo'lsang kim bo'lishni orzu qilgansan?",
      "Oilamizning qaysi an'anasini eng ko'p yoqtirasan?",
      "Eng mazali taomni kim pishiradi?",
      "Oiladan kimga ko'proq o'xshaysan?",
      "Eng esda qolarli bayramimiz qaysi edi?",
      "Oilada kim eng ko'p kuladi?",
      "Agar butun oila bilan sayohatga borsak, qayerga borarding?",
      "Ota-onangdan o'rgangan eng muhim narsa nima?",
      "Bolaligingda nimadan ko'p qo'rqarding?",
      "Bu yil o'zing bilan faxrlangan bitta ishing nima?",
      "Oiladagi kim seni eng yaxshi tushunadi?",
      "Qaysi oilaviy suratni eng ko'p yoqtirasan?",
    ],
    jurat: [
      "Oiladagi har kimga bitta kompliment ayt.",
      "Bolaligingdagi sevimli qo'shiqni kuylab ber.",
      "Oiladan birining yurishiga taqlid qil — qolganlar topsin.",
      "Eng yoshi kattaga choy quyib ber.",
      "Buving yoki bobongga qo'ng'iroq qilib, hol-ahvol so'ra.",
      "1 daqiqa davomida o'zbekcha maqollar ayt.",
      "Oilaviy shior o'ylab top.",
      "Eng kichik a'zoni 20 soniya kuldirib ber.",
      "Ertaga uy ishlaridan birini o'z zimmangga ol.",
      "Oiladagi biror kishining odatiy gapini ovozi bilan ayt.",
      "Hammani quchoqlab chiq.",
      "Sevimli taomingni reklama qilib ber.",
      "Ko'zingni yumib, kim qo'lingni ushlaganini top.",
      "Oilangiz haqida 3 ta qiziq fakt ayt.",
      "Navbatdagi raund uchun hakam bo'l.",
    ],
  },
};

export function rostMenu() {
  let players = JSON.parse(load("rost-players") || "[]");
  let cat = load("rost-cat") || "dostlar";
  const persist = () => { save("rost-players", JSON.stringify(players)); save("rost-cat", cat); };
  return {
    render() {
      app().innerHTML = header("Rost yoki jur'at") + `
        <div class="stack">
          <div class="card stack">
            <label class="lbl">Davra turi</label>
            <div class="seg">${Object.entries(CARDS).map(([k, v]) => `<button data-cat="${k}" aria-pressed="${cat === k}">${v.title}</button>`).join("")}</div>
          </div>
          <div class="card stack">
            <label class="lbl">O'yinchilar (2–8)</label>
            <div class="players">${players.map((p, i) => `<span class="chip">${esc(p)} <button data-del="${i}" aria-label="O'chirish">✕</button></span>`).join("") || `<span class="muted small">Hali hech kim yo'q</span>`}</div>
            <form class="row" id="addp"><input class="inp" id="pname" placeholder="Ism" maxlength="20"><button class="btn alt" style="flex:0 0 auto;width:auto">Qo'shish</button></form>
          </div>
          <button class="btn" data-start ${players.length < 2 ? "disabled" : ""}>🎲 Boshlash</button>
        </div>`;
      bindBack();
      const root = app();
      root.querySelectorAll("[data-cat]").forEach(b => b.onclick = () => { cat = b.dataset.cat; persist(); this.render(); });
      root.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { players.splice(+b.dataset.del, 1); persist(); this.render(); });
      root.querySelector("#addp").onsubmit = e => {
        e.preventDefault();
        const v = root.querySelector("#pname").value.trim();
        if (!v) return;
        if (players.length >= 8) return toast("Ko'pi bilan 8 kishi");
        players.push(v); persist(); this.render();
        app().querySelector("#pname").focus();
      };
      root.querySelector("[data-start]").onclick = () => players.length >= 2 && show(rostPlay(players.slice(), cat));
    },
  };
}

function rostPlay(players, cat) {
  let turn = 0, card = null;
  const used = { rost: new Set(), jurat: new Set() };
  const pick = kind => {
    const list = CARDS[cat][kind];
    if (used[kind].size >= list.length) used[kind].clear();
    let i;
    do { i = (Math.random() * list.length) | 0; } while (used[kind].has(i));
    used[kind].add(i);
    return list[i];
  };
  function render() {
    const name = esc(players[turn % players.length]);
    app().innerHTML = header("Rost yoki jur'at") + (card ? `
      <div class="turn"><span>${name}</span></div>
      <div class="qcard ${card.kind}"><small>${card.kind === "rost" ? "Rost" : "Jur'at"}</small>${esc(card.text)}</div>
      <div class="stack" style="margin-top:16px">
        <button class="btn" data-next>Keyingi o'yinchi →</button>
        <button class="btn alt" data-other>Boshqa savol</button>
      </div>` : `
      <div class="turn">Navbat: <span>${name}</span></div>
      <div class="choice"><button class="t1" data-k="rost">Rost</button><button class="t2" data-k="jurat">Jur'at</button></div>
      <p class="small muted" style="text-align:center;margin-top:16px">${CARDS[cat].title} davrasi · ${players.length} kishi</p>`);
    bindBack();
    app().querySelectorAll("[data-k]").forEach(b => b.onclick = () => { card = { kind: b.dataset.k, text: pick(b.dataset.k) }; haptic("medium"); render(); });
    const n = app().querySelector("[data-next]"); if (n) n.onclick = () => { turn++; card = null; render(); };
    const o = app().querySelector("[data-other]"); if (o) o.onclick = () => { card = { kind: card.kind, text: pick(card.kind) }; render(); };
  }
  return { render };
}
