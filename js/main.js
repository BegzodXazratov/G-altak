// O'yin oqimi va boshqaruv: menyu → xarid → joylashtirish → jonli jang → natija.
import {U,SIEGE,LADDER,WT,COST,BUDGET,NEED,CAPT,TMAX,CAMP,newCastle,newArmy,costCastle,costArmy,countArmy,inside} from "./data.js";
import {makeSim,step,setOrder,splitSquad,startFight,alive,center,isOpen} from "./sim.js";
import {botDefense,botOffense,makeBot} from "./bot.js";
import {Gfx} from "./gfx.js";

const $=id=>document.getElementById(id),over=$("over"),panel=$("panel"),hud=$("hud"),phase=$("phase"),coin=$("coin"),labels=$("labels"),cv=$("stage");
const gfx=new Gfx(cv);
const G={stage:"load",side:"D",castle:null,army:null,foe:null,S:null,bot:null,sel:new Set(),speed:1,paused:false,tab:"q",wsel:0};
const SHORT={m:"Jangchi",s:"2-daraja",k:"3-daraja",c:"Otliq",a:"Kamonchi",ram:"Taran",cat:"Katapulta"};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const narrow=()=>innerWidth<760;
function fit(){const h=!panel.hidden&&narrow()?"48%":"100%";if(cv.style.height!==h){cv.style.height=h;gfx.resize()}}
function show(el,html){const st=el.scrollTop,c=el.querySelector(".chips"),sl=c?c.scrollLeft:0;el.innerHTML=html;el.hidden=false;fit();if(el===panel){el.scrollTop=st;const c2=el.querySelector(".chips");if(c2)c2.scrollLeft=sl}}
function hide(...els){for(const e of els)e.hidden=true;fit()}

/* ---------- menyu ---------- */
function menu(){G.stage="menu";G.S=null;G.sel.clear();hide(panel,hud,coin);labels.innerHTML="";phase.innerHTML="";gfx.cam.auto=true;gfx.cam.d=110;
  const c=newCastle(6);c.towers=[true,false,true,false,true,false];gfx.setCastle(c);gfx.setSim(null);
  show(over,`<div class="card"><h1>Qal'a jangi</h1><p>Angliya, 1150-yil. Bir tomon qal'ani quradi va himoya qiladi, ikkinchisi zaif nuqtani topib egallaydi. Har ikki tomonda <b>${BUDGET} tanga</b>. Jang jonli: otryadlarni istagan payt ko'chirasiz, bo'lasiz, tashqariga chiqarasiz.</p>
  <div class="mode"><button data-side="A">Men hujum qilaman<small>Bot qal'a quradi. Ichidagi qo'shin yaqinlashmaguncha ko'rinmaydi</small></button>
  <button data-side="D">Men himoya qilaman<small>Qal'ani o'zingiz qurasiz. Dushman qayerdan kelishi oldindan ma'lum emas</small></button>
  <button disabled>Ikki kishi, onlayn<small>Keyingi bosqichda qo'shiladi</small></button></div>
  <details><summary>Qoidalar</summary><ul>
  <li>Otryadni tanlash: pastdagi kartasini yoki ustidagi raqamli belgini bosing. Keyin devorni yoki yerni bosing, otryad o'sha yerga boradi.</li>
  <li>Hujumchi ichkariga uch yo'l bilan kiradi: narvon (devor ustidan), taran (darvoza), katapulta (devorni qulatadi). Otliq faqat ochilgan joydan kiradi.</li>
  <li>Himoyachi otryadlarni devordan devorga o'tkazadi, hovlida zaxira tutadi, darvozadan chiqib katapulta va kamonchilarga zarba beradi.</li>
  <li>G'alaba: hovlida kamida ${NEED} hujumchi himoyachilardan ko'p bo'lib ${CAPT} soniya tursa, qal'a egallanadi. Hujumchida ${NEED} tadan kam askar qolsa yoki ${TMAX/60} daqiqa o'tsa, himoyachi yutadi.</li></ul></details></div>`)}
over.addEventListener("click",e=>{const b=e.target.closest("button");if(!b||b.disabled)return;const D=b.dataset;
  if(D.side){G.side=D.side;G.army=newArmy();G.tab=D.side==="D"?"q":"a";G.wsel=0;if(G.side==="A"){G.foe=botDefense();G.castle=G.foe.castle}else{G.foe=null;G.castle=newCastle(5)}over.hidden=true;gfx.cam.auto=false;G.stage="shop";drawShop()}
  else if(D.go==="menu")menu();else if(D.go==="again"){over.hidden=true;toDeploy()}});

/* ---------- xarid ---------- */
const left=()=>BUDGET-(G.side==="D"?costCastle(G.castle):0)-costArmy(G.army);
const stepper=(key,v,canAdd,min)=>`<span class="step"><button data-dec="${key}" ${v<=(min||0)?"disabled":""} aria-label="kamaytirish">−</button><output>${v}</output><button data-inc="${key}" ${canAdd?"":"disabled"} aria-label="qo'shish">+</button></span>`;
const price=c=>`<span class="gold">${c}◉</span>`;
function drawShop(){const cs=G.castle,a=G.army,L=left(),isD=G.side==="D";gfx.setCastle(cs,{labels:true,oil:isD});coin.hidden=false;coin.innerHTML=`<b>◉</b> ${L} / ${BUDGET}`;
  phase.innerHTML=isD?`<span class="tag-d">Himoya</span><small>Qal'ani quring, qo'shin oling</small>`:`<span class="tag-a">Hujum</span><small>Qal'ani aylantirib ko'ring, qo'shin oling</small>`;
  let chips="",body="";
  if(isD){chips=[["q","Qal'a"],["w","Devorlar"],["a","Qo'shin"]].map(([k,n])=>`<button class="chip" data-tab="${k}" aria-pressed="${G.tab===k}">${n}</button>`).join("");
    if(G.tab==="q"){const same=cs.walls.every(w=>w.type===cs.walls[0].type)?cs.walls[0].type:-1;
      body=`<div class="row"><span class="nm">Burchaklar soni<small>ko'p burchak: devorlar qisqa, bir-birini qoplaydi, lekin har biri pul turadi</small></span>${stepper("n",cs.n,cs.n<8&&L>=1,3)}</div>
      <div class="row"><span class="nm">Darvoza qaysi devorda<small>eng zaif joy, taran shu yerga keladi</small></span>${stepper("gate",cs.gate+1,true,-9)}</div>
      <div class="row"><span class="nm">Hamma devorlar</span><span class="seg">${WT.map((x,k)=>`<button data-allwt="${k}" aria-pressed="${same===k}">${x.n} ${x.c}◉</button>`).join("")}</span></div>
      <div class="row"><span class="nm">Mustahkam darvoza ${price(COST.strong)}<small>chidamliligi 60 → 130</small></span><span class="seg"><button data-tg="strong" aria-pressed="${cs.strong}" ${!cs.strong&&L<COST.strong?"disabled":""}>${cs.strong?"Bor":"Yo'q"}</button></span></div>`}
    else if(G.tab==="w"){const i=Math.min(G.wsel,cs.n-1),w=cs.walls[i],t2=(i+1)%cs.n;
      body=`<div class="chips">${cs.walls.map((x,k)=>`<button class="chip" data-wsel="${k}" aria-pressed="${k===i}">${k+1}-devor</button>`).join("")}</div>
      <div class="row"><span class="nm">Turi${cs.gate===i?" · darvoza shu yerda":""}<small>chidamlilik ${WT[w.type].hp}</small></span><span class="seg">${WT.map((x,k)=>`<button data-wt="${k}" aria-pressed="${w.type===k}" ${k>w.type&&L<x.c-WT[w.type].c?"disabled":""}>${x.n} ${x.c}◉</button>`).join("")}</span></div>
      <div class="row"><span class="nm">Qo'shimcha<small>xandaq narvonni sekinlatadi, moy pastdagilarni kuydiradi</small></span><span class="seg"><button data-tg="moat" aria-pressed="${w.moat}" ${!w.moat&&L<COST.moat?"disabled":""}>Xandaq ${COST.moat}◉</button><button data-tg="oil" aria-pressed="${w.oil}" ${!w.oil&&L<COST.oil?"disabled":""}>Moy ${COST.oil}◉</button></span></div>
      <div class="row"><span class="nm">Burchak minorasi ${price(COST.tower)}<small>kamonchilar uzoqroq ko'radi va otadi</small></span><span class="seg"><button data-tw="${i}" aria-pressed="${cs.towers[i]}" ${!cs.towers[i]&&L<COST.tower?"disabled":""}>Chap</button><button data-tw="${t2}" aria-pressed="${cs.towers[t2]}" ${!cs.towers[t2]&&L<COST.tower?"disabled":""}>O'ng</button></span></div>`}}
  if(!isD||G.tab==="a"){if(!isD){const seen=cs.walls.map((w,i)=>`${i+1}: ${WT[w.type].n.toLowerCase()}${cs.gate===i?", darvoza":""}${w.moat?", xandaq":""}`).join(" · ");body+=`<p class="hint">Qal'a: ${cs.n} burchak. ${seen}. Ichidagi qo'shin noma'lum.</p>`}
    body+=Object.keys(U).map(t=>`<div class="row"><span class="nm">${U[t].n} ${price(U[t].c)}<small>zarar ${U[t].d}% · jon ${U[t].hp} · ${U[t].note}</small></span>${stepper("u."+t,a[t],L>=U[t].c)}</div>`).join("");
    if(!isD)body+=`<div class="row"><span class="nm">${LADDER.n} ${price(LADDER.c)}<small>${LADDER.note}</small></span>${stepper("u.lad",a.lad,L>=LADDER.c&&a.lad<8)}</div>`+["ram","cat"].map(t=>`<div class="row"><span class="nm">${SIEGE[t].n} ${price(SIEGE[t].c)}<small>${SIEGE[t].note}</small></span>${stepper("u."+t,a[t],L>=SIEGE[t].c&&a[t]<3)}</div>`).join("")}
  show(panel,`${chips?`<div class="chips">${chips}</div>`:""}<div>${body}</div><div class="cta"><button class="btn alt" data-act="menu">Menyu</button><button class="btn go" data-act="deploy">Joylashtirishga (${L}◉ qoldi)</button></div>`);
  if(isD&&G.tab==="w")gfx.focusWall(Math.min(G.wsel,cs.n-1))}
let toastT=0;function toast(t){const el=G.stage==="shop"?phase:$("log");if(!el)return;const old=el.innerHTML;el.innerHTML=`<span>${esc(t)}</span>`;clearTimeout(toastT);if(G.stage==="shop")toastT=setTimeout(drawShop,1700)}
panel.addEventListener("click",e=>{const b=e.target.closest("button");if(!b||b.disabled)return;const D=b.dataset,cs=G.castle,a=G.army;
  if(D.tab)G.tab=D.tab;else if(D.wsel!=null)G.wsel=+D.wsel;
  else if(D.inc||D.dec){const key=D.inc||D.dec,dv=D.inc?1:-1;
    if(key==="n"){const n=Math.max(3,Math.min(8,cs.n+dv));if(n!==cs.n){const nc=newCastle(n);nc.strong=cs.strong;for(let i=0;i<n;i++){if(cs.walls[i])nc.walls[i]=cs.walls[i];nc.towers[i]=!!cs.towers[i]}nc.gate=Math.min(cs.gate,n-1);G.castle=nc;
        let guard=0;while(left()<0&&guard++<50){const w=nc.walls.find(x=>x.type>0);if(w)w.type--;else break}}}
    else if(key==="gate")cs.gate=(cs.gate+dv+cs.n)%cs.n;
    else{const t=key.slice(2);a[t]=Math.max(0,a[t]+dv)}}
  else if(D.allwt!=null){const k=+D.allwt,old=cs.walls.map(w=>w.type);cs.walls.forEach(w=>w.type=k);if(left()<0){cs.walls.forEach((w,i)=>w.type=old[i]);return toast("Tanga yetmaydi")}}
  else if(D.wt!=null)cs.walls[G.wsel].type=+D.wt;
  else if(D.tg==="strong")cs.strong=!cs.strong;
  else if(D.tg)cs.walls[G.wsel][D.tg]=!cs.walls[G.wsel][D.tg];
  else if(D.tw!=null)cs.towers[+D.tw]=!cs.towers[+D.tw];
  else if(D.act==="menu")return menu();
  else if(D.act==="deploy"){const n=countArmy(a);if(G.side==="A"&&n<NEED)return toast(`Qal'ani egallash uchun kamida ${NEED} askar kerak`);if(G.side==="D"&&n<1)return toast("Kamida bitta askar oling");return toDeploy()}
  drawShop()});

/* ---------- joylashtirish va jang ---------- */
function toDeploy(){hide(panel,coin);G.sel.clear();G.speed=1;G.paused=false;let plan=null,armyD,armyA;
  if(G.side==="A"){armyD=G.foe.army;armyA=G.army}else{const o=botOffense(G.castle);armyD=G.army;armyA=o.army;plan=o.plan}
  const S=G.S=makeSim(G.castle,armyD,armyA);G.bot=makeBot(S,G.side==="A"?"D":"A",plan);G.bot.deploy();
  gfx.setCastle(G.castle,{labels:true,oil:G.side==="D"});gfx.setSim(S,G.side);G.stage="deploy";gfx.cam.auto=false;gfx.cam.d=G.side==="A"?170:105;gfx.cam.ph=G.side==="A"?.72:1;
  if(G.side==="A")gfx.focusAngle(Math.atan2(Math.cos(S.campA),Math.sin(S.campA)));
  phase.innerHTML=G.side==="D"?`<span class="tag-d">Joylashtirish</span><small>Otryadni tanlang, keyin devorni bosing</small>`:`<span class="tag-a">Qarorgoh</span><small>Otryadlarni qal'a atrofiga yashirin joylang</small>`;
  show(hud,`<div class="hrow"><div id="log">${G.side==="D"?"Dushman hali ko'rinmaydi. Qo'shinni devorlarga taqsimlang.":"Himoyachi sizni ko'rmaydi. Qaysi tomondan urishni tanlang."}</div><span class="seg" id="spd" hidden><button data-sp="0">❚❚</button><button data-sp="1" aria-pressed="true">1×</button><button data-sp="2">2×</button></span></div>
  <div class="bars" id="bars" hidden><span class="d" id="hd"></span><div class="cap" title="Egallash"><div id="hc"></div></div><span class="a" id="ha"></span><span id="ht"></span></div>
  <div id="acts" hidden></div><div class="strip" id="strip"></div><div class="cta" id="startRow"><button class="btn alt" data-act="back">Xaridga qaytish</button><button class="btn go" data-act="start">Jangni boshlash</button></div>`);
  drawStrip(true)}
const mySquads=()=>G.S.squads.filter(q=>q.side===G.side);
function place(q){const o=q.order,S=G.S;if(o.k==="wall")return `${o.i+1}-devor${q.side==="A"?"ga":""}`;if(o.k==="yard")return "Hovli";if(o.k==="out")return "Tashqarida";return S.phase==="deploy"?"Qarorgoh":"Maydonda"}
let stripSig="";
function drawStrip(force){const S=G.S;if(!S)return;const sq=mySquads(),sig=sq.map(q=>q.id+":"+alive(q).length+place(q)+q.lad+(G.sel.has(q.id)?"*":"")).join("|");if(sig===stripSig&&!force)return;stripSig=sig;
  const st=$("strip"),sl=st.scrollLeft;st.innerHTML=`<button class="sq" data-all="1" aria-pressed="${G.sel.size>0&&G.sel.size===sq.filter(q=>alive(q).length).length}">Hammasi<small>${sq.filter(q=>alive(q).length).length} otryad</small></button>`+
    sq.map(q=>{const n=alive(q).length;return `<button class="sq${n?"":" dead"}" data-sq="${q.id}" aria-pressed="${G.sel.has(q.id)}" ${n?"":"disabled"}>${SHORT[q.t]}${U[q.t]?" ×"+n:""}<small>${n?place(q)+(q.lad?" · "+q.lad+" narvon":""):"yo'q qilindi"}</small></button>`}).join("");st.scrollLeft=sl;drawActs()}
function drawActs(){const a=$("acts");if(!a)return;if(!G.sel.size){a.hidden=true;return}const isD=G.side==="D",dep=G.S.phase==="deploy";a.hidden=false;
  a.innerHTML=`<span class="hint">${isD?(dep?"Devorni yoki hovlini bosing":"Devorni, hovlini yoki tashqaridagi yerni bosing"):(dep?"Qal'a atrofidagi yerni bosing":"Devorni yoki yerni bosing")}</span>
  <button data-cmd="split">Bo'lish</button>${isD?`<button data-cmd="yard">Hovliga</button>`:dep?"":`<button data-cmd="back">Chekinish</button>`}<button data-cmd="none">✕</button>`}
function order(o){const S=G.S;let err=null,n=0;for(const q of mySquads()){if(!G.sel.has(q.id)||!alive(q).length)continue;const oo=Object.assign({},o);if(o.k==="pt"||o.k==="out"){const r=Math.hypot(o.x,o.z)||1;oo.x+=-o.z/r*n*4.5*(n%2?1:-1);oo.z+=o.x/r*n*4.5*(n%2?1:-1)}const e=setOrder(S,q,oo);if(e)err=e;else n++}
  if(err&&!n)toast(err);drawStrip(true)}
gfx.onTap=(x,y)=>{const S=G.S;if(!S||(G.stage!=="deploy"&&G.stage!=="fight"))return;const p=gfx.pick(x,y);if(!p)return;
  if(!G.sel.size){let best=null,bd=9;for(const q of mySquads()){const c=center(q);if(!c)continue;const px=p.x!=null?p.x:S.g.w[p.wall].mx,pz=p.z!=null?p.z:S.g.w[p.wall].mz,d=Math.hypot(c.x-px,c.z-pz);if(d<bd){bd=d;best=q}}if(best){G.sel.add(best.id);drawStrip(true)}return}
  if(p.wall!=null)return order({k:"wall",i:p.wall});
  if(inside(S.g,p.x,p.z)){if(G.side==="D")return order({k:"yard"});const opens=[];for(let i=0;i<S.n;i++)if(isOpen(S,i))opens.push(i);if(!opens.length)return toast("Ichkariga yo'l yo'q: narvon, taran yoki katapulta kerak");
    let b=opens[0],bd=1e9;for(const o of opens){const d=(S.g.w[o].mx-p.x)**2+(S.g.w[o].mz-p.z)**2;if(d<bd){bd=d;b=o}}return order({k:"wall",i:b})}
  order(G.side==="D"?{k:"out",x:p.x,z:p.z}:{k:"pt",x:p.x,z:p.z})};
hud.addEventListener("click",e=>{const b=e.target.closest("button");if(!b||b.disabled)return;const D=b.dataset,S=G.S;
  if(D.sq!=null){const id=+D.sq;G.sel.has(id)?G.sel.delete(id):G.sel.add(id);const q=S.squads.find(x=>x.id===id),c=q&&center(q);if(c&&G.sel.has(id)&&Math.hypot(c.x,c.z)>30)gfx.focusAngle(Math.atan2(c.x,c.z));drawStrip(true)}
  else if(D.all){const ids=mySquads().filter(q=>alive(q).length).map(q=>q.id);if(G.sel.size===ids.length)G.sel.clear();else ids.forEach(i=>G.sel.add(i));drawStrip(true)}
  else if(D.cmd==="none"){G.sel.clear();drawStrip(true)}
  else if(D.cmd==="yard")order({k:"yard"});
  else if(D.cmd==="back"){const a=S.campA;order({k:"pt",x:(CAMP+4)*Math.cos(a),z:(CAMP+4)*Math.sin(a)})}
  else if(D.cmd==="split"){let n=0;for(const q of mySquads())if(G.sel.has(q.id)){const nq=splitSquad(S,q);if(nq){n++;G.sel.delete(q.id);G.sel.add(nq.id)}}if(!n)toast("Bo'lish uchun otryadda kamida 2 askar bo'lishi kerak");else toast("Bo'lindi. Tanlangan yarmiga yangi joy ko'rsating");drawStrip(true)}
  else if(D.sp!=null){const v=+D.sp;G.paused=v===0;if(v)G.speed=v;hud.querySelectorAll("[data-sp]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));if(G.paused)toast("Pauza. Buyruq berishingiz mumkin")}
  else if(D.act==="back"){hide(hud);labels.innerHTML="";G.S=null;gfx.setSim(null);G.stage="shop";drawShop()}
  else if(D.act==="start"){startFight(S);G.stage="fight";$("startRow").hidden=true;$("spd").hidden=false;$("bars").hidden=false;
    phase.innerHTML=`Jang<small>${G.side==="D"?"Qal'ani ushlab turing":"Qal'ani egallang"}</small>`;$("log").textContent=G.side==="D"?"Qorovullar ufqni kuzatmoqda…":"Buyruq bering: otryadni tanlab, devorni bosing";drawStrip(true)}});
labels.addEventListener("click",e=>{const el=e.target.closest(".lb.me");if(!el)return;const id=+el.dataset.id;G.sel.has(id)?G.sel.delete(id):G.sel.add(id);drawStrip(true)});
const EVT={breach:i=>`${i+1}-devor qulab tushdi!`,gate:()=>"Darvoza sindi!",up:i=>`Hujumchilar ${i+1}-devorga chiqdi!`,in:()=>"Dushman qal'a ichida!",oil:i=>`${i+1}-devordan qaynoq moy quyildi`,lad:i=>`${i+1}-devorga narvon qo'yildi`};
function finish(){const S=G.S,won=S.win===G.side;hide(hud);labels.innerHTML="";G.stage="end";
  show(over,`<div class="card"><h2 class="${S.win==="A"?"tag-a":"tag-d"}">${won?"G'alaba!":"Mag'lubiyat"} ${S.win==="A"?"Qal'a egallandi":"Qal'a bardosh berdi"}</h2><p>${S.why}</p>
  <div class="stat"><span></span><b>Himoya</b><b>Hujum</b><span>Boshida</span><b>${S.d0}</b><b>${S.a0}</b><span>Yo'qotish</span><b>${S.d0-S.dN}</b><b>${S.a0-S.aN}</b><span>Omon qoldi</span><b>${S.dN}</b><b>${S.aN}</b></div>
  <p class="hint">Jang ${Math.round(S.t)} soniya davom etdi.</p><div class="cta"><button class="btn alt" data-go="again">Shu qo'shin bilan yana</button><button class="btn" data-go="menu">Yangi o'yin</button></div></div>`)}
/* ---------- otryad belgilari ---------- */
const lbEls=new Map();
function drawLabels(){const S=G.S;if(!S||(G.stage!=="deploy"&&G.stage!=="fight")){if(lbEls.size){labels.innerHTML="";lbEls.clear()}return}const used=new Set();
  for(const q of S.squads){const mine=q.side===G.side;const us=q.units.filter(u=>!u.dead&&(mine||(S.phase==="fight"&&u.seen)));if(!us.length)continue;let x=0,y=0,z=0;for(const u of us){x+=u.rx??u.x;y+=u.ry??u.y;z+=u.rz??u.z}x/=us.length;y/=us.length;z/=us.length;
    const p=gfx.project(x,y+(U[q.t]?3.4:5),z);if(!p.ok)continue;let el=lbEls.get(q.id);if(!el){el=document.createElement("div");el.dataset.id=q.id;labels.appendChild(el);lbEls.set(q.id,el)}
    const cls="lb "+q.side+(mine?" me":"")+(G.sel.has(q.id)?" on":""),txt=(U[q.t]?SHORT[q.t]+" "+us.length:SHORT[q.t]);if(el.className!==cls)el.className=cls;if(el.textContent!==txt)el.textContent=txt;
    el.style.left=p.x+"px";el.style.top=p.y+"px";used.add(q.id)}
  for(const[id,el]of lbEls)if(!used.has(id)){el.remove();lbEls.delete(id)}}
/* ---------- asosiy sikl ---------- */
let last=0,acc=0,uiT=0;
function frame(ts){requestAnimationFrame(frame);const dt=Math.min(.05,(ts-last)/1000||0);last=ts;const S=G.S;let simDt=0;
  if(G.stage==="fight"&&S&&!G.paused){simDt=dt*G.speed;acc+=simDt;let k=0;while(acc>=.1&&k++<6){G.bot.tick(.1);step(S,.1);acc-=.1}
    for(const e of S.ev){if(e.k==="oil")gfx.oilM[e.i].visible=true;$("log").textContent=EVT[e.k](e.i)}S.ev.length=0;
    uiT-=dt;if(uiT<=0){uiT=.25;$("hd").textContent="Himoya "+(G.side==="D"?S.dN:"?");$("ha").textContent=(G.side==="A"?S.aN:"?")+" Hujum";$("hc").style.width=Math.min(100,S.cap/CAPT*100)+"%";$("ht").textContent=Math.floor(S.t/60)+":"+String(Math.floor(S.t%60)).padStart(2,"0");drawStrip()}
    if(S.over){G.stage="ending";G.sel.clear();setTimeout(finish,2200)}}
  else if(G.stage==="ending")simDt=dt;
  gfx.frame(dt,G.sel,simDt);drawLabels()}
window.__g={G,gfx};
gfx.load().then(()=>{menu();requestAnimationFrame(frame)}).catch(e=>{$("loadmsg").textContent="Yuklab bo'lmadi: "+e.message+". Sahifani qayta oching."});
