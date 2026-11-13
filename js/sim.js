// Jang simulyatsiyasi: otryadlar buyruq oladi, askarlar buyruqqa qarab o'zi harakat qiladi.
import {U,SIEGE,WT,R,H,NEED,CAPT,TMAX,SQMAX,CAMP,rnd,pick,geo,P,inside} from "./data.js";

export const isOpen=(S,i)=>S.wallHp[i]<=0||(S.castle.gate===i&&S.gateHp<=0);
export const alive=sq=>sq.units.filter(u=>!u.dead);
export function center(sq){let x=0,z=0,y=0,n=0;for(const u of sq.units)if(!u.dead){x+=u.x;z+=u.z;y+=u.y;n++}return n?{x:x/n,z:z/n,y:y/n,n}:null}

function addSquad(S,side,t,count){const sq={id:S.sid++,side,t,order:null,lad:0,units:[],row:S.sid%2};
  for(let j=0;j<count;j++){const hp=U[t]?U[t].hp:SIEGE[t].hp;sq.units.push({id:S.uid++,sq,side,t,hp,hp0:hp,x:0,z:0,y:0,loc:"out",wi:-1,cd:rnd(),dead:false,slot:j,n0:count,anim:"idle",ph:rnd(),face:0,seen:false,atkT:0,atBase:-1})}
  S.squads.push(sq);for(const u of sq.units)S.units.push(u);return sq}
function mkSquads(S,side,army){for(const t of Object.keys(U)){const n=army[t]||0;if(!n)continue;const k=Math.ceil(n/SQMAX);for(let j=0;j<k;j++)addSquad(S,side,t,Math.floor(n/k)+(j<n%k?1:0))}
  if(side==="A"){for(let j=0;j<(army.ram||0);j++)addSquad(S,"A","ram",1);for(let j=0;j<(army.cat||0);j++)addSquad(S,"A","cat",1)}}

export function makeSim(castle,armyD,armyA){const g=geo(castle.n),n=castle.n;
  const S={g,n,castle,wallHp:castle.walls.map(w=>WT[w.type].hp),gateHp:castle.strong?130:60,ladders:Array(n).fill(0),ladCd:Array.from({length:n},()=>[]),oilCd:Array(n).fill(2),
    squads:[],units:[],t:0,cap:0,over:false,win:null,why:"",ev:[],shots:[],phase:"deploy",uid:0,sid:0,sortie:-9,visT:0,campA:rnd()*6.283};
  mkSquads(S,"D",armyD);mkSquads(S,"A",armyA);
  const inf=S.squads.filter(q=>q.side==="A"&&"msk".includes(q.t)),carr=inf.length?inf:S.squads.filter(q=>q.side==="A"&&q.t==="a");
  for(let j=0;j<(armyA.lad||0)&&carr.length;j++)carr[j%carr.length].lad++;
  // boshlang'ich joylashuv
  const D=S.squads.filter(q=>q.side==="D");let wi=castle.gate;const used=new Set();
  for(const q of D.filter(q=>q.t==="a")){q.order={k:"wall",i:wi%n};wi++}
  wi=castle.gate;for(const q of D.filter(q=>"msk".includes(q.t))){if(used.size<n){q.order={k:"wall",i:wi%n};used.add(wi%n);wi++}else q.order={k:"yard"}}
  for(const q of D.filter(q=>q.t==="c"))q.order={k:"yard"};
  const A=S.squads.filter(q=>q.side==="A");A.forEach((q,j)=>{const a=S.campA+(j-(A.length-1)/2)*.2;q.order={k:"pt",x:(CAMP+5)*Math.cos(a),z:(CAMP+5)*Math.sin(a)}});
  for(const q of S.squads)place(S,q);
  S.d0=S.units.filter(u=>u.side==="D").length;S.a0=S.units.filter(u=>u.side==="A"&&U[u.t]).length;return S}

const frac=u=>(u.slot+.5)/u.n0-.5;
function slotPt(u,x,z){const cols=Math.ceil(Math.sqrt(u.n0*1.6)),col=u.slot%cols,row=Math.floor(u.slot/cols),sp=u.t==="c"?2.3:u.t==="cat"||u.t==="ram"?0:1.5;
  let r=Math.hypot(x,z),rx=r>.01?x/r:0,rz=r>.01?z/r:1;const ox=(col-(cols-1)/2)*sp,oz=row*sp;return{x:x-rz*ox+rx*oz,z:z+rx*ox+rz*oz}}
function place(S,sq){const g=S.g,o=sq.order;for(const u of sq.units){if(u.dead)continue;u.ex=u.ent=0;u.asc=0;u.atBase=-1;
    if(o.k==="wall"&&sq.side==="D"){if(u.t==="c"||S.wallHp[o.i]<=0){const p=P(g,o.i,frac(u)*8,-7);u.x=p.x;u.z=p.z;u.y=0;u.loc="in"}
      else{const p=P(g,o.i,frac(u)*g.L*.8,-.5-sq.row*.9);u.x=p.x;u.z=p.z;u.y=H;u.loc="top";u.wi=o.i}u.face=Math.atan2(g.w[o.i].nx,g.w[o.i].nz)}
    else if(o.k==="yard"){const a=u.id*2.4,r=6+(u.id%3)*1.6;u.x=r*Math.cos(a);u.z=r*Math.sin(a);u.y=0;u.loc="in"}
    else if(o.k==="pt"){const p=slotPt(u,o.x,o.z);u.x=p.x;u.z=p.z;u.y=0;u.loc="out";u.face=Math.atan2(-p.x,-p.z)}}}
// Buyruq berish. Qaytaradi: null (ok) yoki xato matni.
export function setOrder(S,sq,o){if(!alive(sq).length)return "Otryad yo'q";const g=S.g;
  if(sq.side==="D"){if(o.k==="out"){if(S.phase==="deploy")return "Tashqariga faqat jang boshlangach chiqiladi";if(sq.t==="a")return "Kamonchilar devorda foydaliroq, tashqariga chiqmaydi"}
    if(o.k==="wall"&&S.wallHp[o.i]<=0&&S.phase==="deploy")return "Devor yo'q"}
  else{if(o.k==="pt"){let r=Math.hypot(o.x,o.z);const min=S.phase==="deploy"?CAMP:R+7;if(r<min){const k=min/(r||1);o={k:"pt",x:(o.x||.01)*k,z:(o.z||min)*k}}}
    if(o.k==="wall"&&S.phase==="deploy"){const w=g.w[o.i];o={k:"pt",x:w.nx*(CAMP+3),z:w.nz*(CAMP+3)}}
    if(sq.t==="ram"&&o.k==="wall"&&S.castle.gate!==o.i&&S.wallHp[o.i]>0){/* ruxsat: devorni sekin buzadi */}}
  sq.order=o;if(S.phase==="deploy")place(S,sq);return null}
export function splitSquad(S,sq){const a=alive(sq);if(a.length<2||!U[sq.t])return null;const half=a.slice(Math.ceil(a.length/2));
  const nq={id:S.sid++,side:sq.side,t:sq.t,order:Object.assign({},sq.order),lad:Math.floor(sq.lad/2),units:half,row:S.sid%2};sq.lad-=nq.lad;sq.units=a.slice(0,Math.ceil(a.length/2));
  sq.units.forEach((u,j)=>{u.slot=j;u.n0=sq.units.length});half.forEach((u,j)=>{u.sq=nq;u.slot=j;u.n0=half.length});S.squads.push(nq);
  if(nq.order.k==="pt"||nq.order.k==="out"){const r=Math.hypot(nq.order.x,nq.order.z)||1;nq.order.x+=-nq.order.z/r*5;nq.order.z+=nq.order.x/r*5}
  if(S.phase==="deploy"){place(S,sq);place(S,nq)}return nq}
export function startFight(S){S.phase="fight";S.visT=0}

function mv(u,tx,tz,sp,dt){const dx=tx-u.x,dz=tz-u.z,d=Math.hypot(dx,dz),s=sp*dt;if(d<.05)return true;u.face=Math.atan2(dx,dz);u.anim="walk";if(d<=s){u.x=tx;u.z=tz;return true}u.x+=dx/d*s;u.z+=dz/d*s;return false}
// qal'ani aylanib o'tadigan yurish (tashqarida)
function nav(u,tx,tz,sp,dt){const dx=tx-u.x,dz=tz-u.z,l2=dx*dx+dz*dz;if(l2<.01)return true;const RR=R+6;
  let t=-(u.x*dx+u.z*dz)/l2;t=Math.max(0,Math.min(1,t));const cx=u.x+dx*t,cz=u.z+dz*t;
  if(cx*cx+cz*cz>=RR*RR||t<=0||t>=1)return mv(u,tx,tz,sp,dt);
  let a=Math.atan2(u.z,u.x),r=Math.hypot(u.x,u.z);const ta=Math.atan2(tz,tx);let da=ta-a;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;
  const rr=R+10;r+=Math.max(-sp*dt,Math.min(sp*dt,rr-r));const sa=sp*dt/r,na=a+Math.sign(da)*Math.min(Math.abs(da),sa),nx=r*Math.cos(na),nz=r*Math.sin(na);
  u.face=Math.atan2(nx-u.x,nz-u.z);u.x=nx;u.z=nz;u.anim="walk";return false}

export function step(S,dt){
  if(S.over||S.phase!=="fight")return;S.t+=dt;const g=S.g,n=S.n,cs=S.castle;
  const open=i=>isOpen(S,i),opens=[];for(let i=0;i<n;i++)if(open(i))opens.push(i);
  const tower=i=>cs.towers[i]||cs.towers[(i+1)%n];
  const Af=[],Aall=[],Df=[],Ain=[],Din=[],Aout=[],Dout=[];
  const onTop=Array.from({length:n},()=>[]),dTop=Array.from({length:n},()=>[]),baseQ=Array.from({length:n},()=>[]),climbers=Array.from({length:n},()=>[]),dTopAll=[],aTopAll=[];
  for(const u of S.units){if(u.dead)continue;
    if(u.side==="D"){Df.push(u);if(u.loc==="top"){dTop[u.wi].push(u);dTopAll.push(u)}else if(u.loc==="in")Din.push(u);else Dout.push(u)}
    else{Aall.push(u);if(U[u.t])Af.push(u);if(u.loc==="in")Ain.push(u);else if(u.loc==="top"){onTop[u.wi].push(u);aTopAll.push(u)}else if(u.loc==="climb")climbers[u.wi].push(u);else{Aout.push(u);if(u.atBase>=0)baseQ[u.atBase].push(u)}}}
  const kill=u=>{if(!u.dead){u.dead=true;u.deadAt=S.t;u.anim="dead"}};
  const near=(u,list,max)=>{let b=null,bd=max*max;for(const o of list){if(o.dead)continue;const d=(o.x-u.x)**2+(o.z-u.z)**2;if(d<bd){bd=d;b=o}}return b?{o:b,d:Math.sqrt(bd)}:null};
  const strike=(u,tg,d,m)=>{m=m||1;if(u.t==="a"){if(tg.t==="k")m*=.5;if(tg.t==="s")m*=.8;if(tg.t==="ram")m*=.1;if(u.side==="A"&&tg.loc==="top")m*=WT[cs.walls[tg.wi].type].cover-(tower(tg.wi)?.08:0);
      if(u.side==="D"&&u.loc==="top"&&tower(u.wi))m*=1.15;if(d<2.5)m*=.5;else S.shots.push({k:"ar",a:u,b:tg})}else if(u.t==="c"&&u.loc!=="top")m*=1.3;
    tg.hp-=U[u.t].d*.45*m*(.8+.4*rnd());u.cd=u.t==="a"?2:1;u.atkT=.55;u.anim="atk";u.face=Math.atan2(tg.x-u.x,tg.z-u.z);if(tg.hp<=0)kill(tg)};
  const engage=(u,f,sp,dt2,go)=>{const big=f.o.t==="ram"||f.o.t==="cat",rg=u.t==="a"?15:big?2.8:1.8;
    if(f.d>rg){(go||mv)(u,f.o.x,f.o.z,sp,dt2)}else if(u.cd<=0)strike(u,f.o,f.d);else if(u.atkT>0)u.anim="atk"};
  const breach=i=>{S.ev.push({k:"breach",i});S.ladders[i]=0;S.ladCd[i]=[];for(const u of S.units){if(u.dead)continue;
      if(u.loc==="top"&&u.wi===i){u.loc="in";u.y=0;const p=P(g,i,frac(u)*6,-3.5);u.x=p.x;u.z=p.z}
      if(u.loc==="climb"&&u.wi===i){u.loc="out";u.y=0}}};
  // narvonlar
  for(let i=0;i<n;i++){const lc=S.ladCd[i];if(!lc.length||open(i))continue;
    for(let j=0;j<lc.length;j++){lc[j]-=dt;if(lc[j]>0)continue;const u=baseQ[i].find(x=>x.loc==="out");if(!u)continue;
      u.loc="climb";u.wi=i;u.ct0=u.ct=cs.walls[i].moat?4:2;u.lx=((j+.5)/lc.length-.5)*g.L*.6;const p=P(g,i,u.lx,2.2);u.x=p.x;u.z=p.z;u.atBase=-1;lc[j]=1;u.face=Math.atan2(-g.w[i].nx,-g.w[i].nz)}}
  // qaynoq moy
  for(let i=0;i<n;i++){if(!cs.walls[i].oil||!dTop[i].length||S.wallHp[i]<=0)continue;S.oilCd[i]-=dt;if(S.oilCd[i]>0)continue;
    const vict=baseQ[i].concat(climbers[i]),ram=Aall.find(r=>r.t==="ram"&&r.ramming===i);if(!vict.length&&!ram)continue;
    vict.slice(0,4).forEach(u=>{u.hp-=10;if(u.hp<=0)kill(u)});if(ram){ram.hp-=25;if(ram.hp<=0)kill(ram)}S.oilCd[i]=7;S.ev.push({k:"oil",i})}

  for(const u of S.units){if(u.dead)continue;u.cd-=dt;u.atkT-=dt;u.anim=u.atkT>0?"atk":"idle";const sq=u.sq,o=sq.order,f=frac(u);
    if(u.side==="A"){
      if(u.t==="ram"){u.ramming=-1;if(o.k==="pt"){nav(u,o.x,o.z,SIEGE.ram.sp,dt);continue}const i=o.i,p=P(g,i,0,3.4);
        if(nav(u,p.x,p.z,SIEGE.ram.sp,dt)&&!open(i)){u.ramming=i;u.anim="atk";u.face=Math.atan2(-g.w[i].nx,-g.w[i].nz);
          if(cs.gate===i){S.gateHp-=5*(cs.walls[i].moat?.6:1)*dt;if(S.gateHp<=0)S.ev.push({k:"gate",i})}else{S.wallHp[i]-=2.5*dt;if(S.wallHp[i]<=0)breach(i)}}continue}
      if(u.t==="cat"){if(o.k==="pt"){nav(u,o.x,o.z,SIEGE.cat.sp,dt);continue}const i=o.i,w=g.w[i],dist=(u.x-w.mx)*w.nx+(u.z-w.mz)*w.nz,lat=(u.x-w.mx)*w.ex+(u.z-w.mz)*w.ez;
        if(dist>31||dist<20||Math.abs(lat)>g.L*.6){const p=P(g,i,(u.id%3-1)*6,29);nav(u,p.x,p.z,SIEGE.cat.sp,dt);continue}
        u.face=Math.atan2(-w.nx,-w.nz);if(S.wallHp[i]>0&&u.cd<=0){u.cd=4;u.fire=S.t;const tp=P(g,i,(rnd()-.5)*g.L*.5,0);S.shots.push({k:"st",a:u,b:{x:tp.x,z:tp.z,y:H*.6}});
          S.wallHp[i]-=16*(cs.walls[i].type===0?1.6:1);if(rnd()<.3&&dTop[i].length){const tg=pick(dTop[i]);tg.hp-=12;if(tg.hp<=0)kill(tg)}if(S.wallHp[i]<=0)breach(i)}continue}
      const sp=U[u.t].sp;
      if(u.loc==="climb"){u.ct-=dt;u.y=H*(1-u.ct/u.ct0);u.anim="walk";if(u.ct<=0){u.loc="top";u.y=H;const p=P(g,u.wi,u.lx,-.9);u.x=p.x;u.z=p.z;u.desc=1;if(!S["up"+u.wi]){S["up"+u.wi]=1;S.ev.push({k:"up",i:u.wi})}}continue}
      if(u.loc==="top"){const fo=near(u,dTop[u.wi],99);if(fo){u.desc=1;engage(u,fo,sp,dt)}else{u.desc-=dt*1.2;u.y=H*Math.max(0,u.desc);u.anim="walk";if(u.desc<=0){u.loc="in";u.y=0;const p=P(g,u.wi,u.lx||0,-3.4);u.x=p.x;u.z=p.z;if(!S.inEv){S.inEv=1;S.ev.push({k:"in",i:u.wi})}}}continue}
      if(u.loc==="in"){let fo=near(u,Din,99);if(!fo&&u.t==="a")fo=near(u,dTopAll,15);
        if(fo)engage(u,fo,u.t==="c"?8:sp,dt);
        else if(o.k==="pt"&&opens.length){let b=opens[0],bd=1e9;for(const k of opens){const d=(g.w[k].mx-u.x)**2+(g.w[k].mz-u.z)**2;if(d<bd){bd=d;b=k}}
          if(!u.ex){const p=P(g,b,0,-3);if(mv(u,p.x,p.z,sp,dt))u.ex=1}else{const p=P(g,b,0,3.5);if(mv(u,p.x,p.z,sp,dt)){u.loc="out";u.ex=0}}}
        else{const r=Math.hypot(u.x,u.z);if(r>7.5)mv(u,u.x/r*6.5,u.z/r*6.5,sp,dt)}continue}
      // tashqarida
      const was=u.atBase;u.atBase=-1;const fo=near(u,Dout,u.t==="a"?15:8);if(fo){engage(u,fo,sp,dt,nav);continue}
      if(o.k==="pt"){const p=slotPt(u,o.x,o.z);nav(u,p.x,p.z,sp,dt);u.ent=0;if(u.t==="a"){const tg=near(u,dTopAll,15);if(tg&&u.cd<=0)strike(u,tg.o,tg.d)}continue}
      const i=o.i,w=g.w[i];
      if(open(i)){if(!u.ent){const p=P(g,i,f*3,2.6);if(nav(u,p.x,p.z,sp,dt))u.ent=1}else{const p=P(g,i,f*5,-3.6);if(mv(u,p.x,p.z,sp,dt)){u.loc="in";u.ent=0;if(!S.inEv){S.inEv=1;S.ev.push({k:"in",i})}}}continue}
      u.ent=0;const canClimb=u.t!=="c"&&(S.ladders[i]>0||sq.lad>0);
      if(u.t==="a"){const tg=near(u,dTopAll,15);if(tg){if(u.cd<=0)strike(u,tg.o,tg.d);continue}if(!canClimb||dTop[i].length){const p=P(g,i,f*g.L*.7,13);nav(u,p.x,p.z,sp,dt);continue}}
      if(canClimb){const p=P(g,i,f*g.L*.55,2.2+(u.slot%2)*1.1);if(nav(u,p.x,p.z,sp,dt)||was===i&&Math.hypot(p.x-u.x,p.z-u.z)<.3){if(sq.lad>0){for(let k=0;k<sq.lad;k++)S.ladCd[i].push(k*.4);S.ladders[i]+=sq.lad;sq.lad=0;S.ev.push({k:"lad",i})}u.atBase=i;u.face=Math.atan2(-w.nx,-w.nz)}continue}
      {const p=P(g,i,f*g.L*.6,u.t==="c"?13:7);nav(u,p.x,p.z,sp,dt)}
    }else{ // himoyachi
      const sp=U[u.t].sp;
      if(u.loc==="top"){const i=u.wi;
        if(o.k==="wall"&&o.i===i){u.desc=1;const fo=near(u,onTop[i],99);
          if(fo){engage(u,fo,sp,dt);continue}
          const p=P(g,i,f*g.L*.8,-.5-sq.row*.9);if(Math.hypot(p.x-u.x,p.z-u.z)>.3)mv(u,p.x,p.z,sp,dt);
          if(u.t==="a"){if(u.cd<=0){const rg=tower(i)?24:18;let tg=near(u,Aout,rg);const c2=near(u,climbers[i],rg),t3=near(u,Ain,rg),t4=near(u,aTopAll,rg);for(const c of [c2,t3,t4])if(c&&(!tg||c.d<tg.d))tg=c;
              if(tg)strike(u,tg.o,Math.max(3,tg.d));else u.cd=.3}}
          else if(u.cd<=0){const tg=climbers[i][0]||(baseQ[i].length?pick(baseQ[i]):null);if(tg){strike(u,tg,2,.4);u.cd=2.5}}
          if(u.anim!=="atk"&&u.anim!=="walk")u.face=Math.atan2(g.w[i].nx,g.w[i].nz)}
        else{u.desc=(u.desc==null?1:u.desc)-dt*1.3;u.y=H*Math.max(0,u.desc);u.anim="walk";if(u.desc<=0){u.loc="in";u.y=0;u.desc=1;const p=P(g,i,f*g.L*.7,-3);u.x=p.x;u.z=p.z}}
        continue}
      if(u.loc==="in"){let fo=near(u,Ain,o.k==="yard"?999:10);if(!fo&&u.t==="a")fo=near(u,aTopAll,15);
        if(fo){u.asc=0;u.y=0;engage(u,fo,u.t==="c"?9:sp,dt);continue}
        if(o.k==="wall"){const i=o.i;if(S.wallHp[i]<=0||u.t==="c"){const p=P(g,i,f*8,-6.5);mv(u,p.x,p.z,sp,dt)}
          else{const p=P(g,i,f*g.L*.8,-2.6);if(mv(u,p.x,p.z,sp,dt)){u.asc=(u.asc||0)+dt;u.y=H*Math.min(1,u.asc/.8);u.anim="walk";if(u.asc>=.8){u.loc="top";u.wi=i;u.asc=0;u.y=H;u.desc=1}}else{u.asc=0;u.y=0}}}
        else if(o.k==="yard"){const a=u.id*2.4,r=6+(u.id%3)*1.6;mv(u,r*Math.cos(a),r*Math.sin(a),sp,dt)}
        else{const gi=cs.gate;if(!u.ex){const p=P(g,gi,0,-3);if(mv(u,p.x,p.z,sp,dt))u.ex=1}else{const p=P(g,gi,f*2,3.6);S.sortie=S.t;if(mv(u,p.x,p.z,sp,dt)){u.loc="out";u.ex=0}}}
        continue}
      const fo=near(u,Aout,u.t==="a"?15:10);if(fo){engage(u,fo,sp,dt,nav);continue}
      if(o.k==="out"){const p=slotPt(u,o.x,o.z);nav(u,p.x,p.z,sp,dt);u.ex=0;continue}
      {const gi=cs.gate;S.sortie=S.t;if(!u.ex){const p=P(g,gi,0,3.6);if(nav(u,p.x,p.z,sp,dt))u.ex=1}else{const p=P(g,gi,0,-3);if(mv(u,p.x,p.z,sp,dt)){u.loc="in";u.ex=0}}}
    }}
  // ko'rinish (tuman)
  S.visT-=dt;if(S.visT<=0){S.visT=.3;const al=S.units.filter(u=>!u.dead);
    for(const e of al){let seen=false;if(e.side==="A"&&(e.loc==="in"||e.loc==="top"||e.loc==="climb"))seen=true;
      else for(const f2 of al){if(f2.side===e.side)continue;const d=Math.hypot(f2.x-e.x,f2.z-e.z);
        if(e.side==="A"){if(d<=(f2.loc==="top"?(tower(f2.wi)?46:36):24)){seen=true;break}}
        else{if(e.loc==="out"){if(d<=26){seen=true;break}}else if(e.loc==="top"){if(d<=22||f2.loc!=="out"){seen=true;break}}else if(f2.loc!=="out"){seen=true;break}}}
      e.seen=seen}}
  const aN=Af.filter(u=>!u.dead).length,dN=Df.filter(u=>!u.dead).length,ain=Ain.filter(u=>!u.dead&&U[u.t]).length,din=Din.filter(u=>!u.dead).length;
  if(ain>=NEED&&ain>din)S.cap+=dt;else S.cap=Math.max(0,S.cap-dt*.5);
  const end=(w,why)=>{S.over=true;S.win=w;S.why=why};
  if(dN===0&&aN>=NEED)end("A","Himoyachilar qolmadi, qal'a egallandi.");
  else if(S.cap>=CAPT)end("A","Hujumchilar qo'rg'onni egallab oldi.");
  else if(aN<NEED)end("D","Hujumchida qal'ani egallashga yetarli askar qolmadi (kamida "+NEED+" ta kerak).");
  else if(S.t>=TMAX)end("D","Qamal cho'zilib ketdi, qal'a taslim bo'lmadi.");
  S.aN=aN;S.dN=dN}
