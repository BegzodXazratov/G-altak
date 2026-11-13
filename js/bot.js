// Bot: qal'a quradi, qo'shin oladi va jang paytida jonli buyruq beradi.
import {U,WT,BUDGET,CAMP,rnd,ri,pick,newCastle,newArmy,costCastle,costArmy} from "./data.js";
import {setOrder,alive,isOpen,center} from "./sim.js";

export function botDefense(){const n=pick([4,5,5,6]),c=newCastle(n);c.gate=ri(0,n-1);c.walls.forEach(w=>w.type=rnd()<.8?1:0);c.walls[c.gate].type=rnd()<.5?2:1;
  if(rnd()<.7){c.towers[c.gate]=true;if(rnd()<.6)c.towers[(c.gate+1)%n]=true}if(rnd()<.6)c.strong=true;if(rnd()<.6)c.walls[c.gate].oil=true;if(rnd()<.3)c.walls[ri(0,n-1)].moat=true;
  const a=newArmy();let g=0;while(g++<400){const left=BUDGET-costCastle(c)-costArmy(a);if(left<1)break;const t=pick(["m","m","m","s","s","s","k","k","a","a","a","c"]);if(U[t].c<=left)a[t]++}
  return{castle:c,army:a}}
export function botOffense(castle){const n=castle.n,a=newArmy();
  const weak=castle.walls.map((w,i)=>({i,v:WT[w.type].hp+(w.moat?60:0)+rnd()*60})).sort((x,y)=>x.v-y.v)[0].i;const r=rnd();let main,kind;
  if(r<.4){main=castle.gate;kind="ram";a.ram=1;a.lad=ri(2,3)}else if(r<.7){main=weak;kind="cat";a.cat=ri(1,2);a.lad=2}else{main=ri(0,n-1);kind="lad";a.lad=ri(5,7)}
  a.m=ri(4,8);let g=0;while(g++<400){const left=BUDGET-costArmy(a);if(left<1)break;const t=pick(["m","s","s","s","k","k","a","a",kind==="lad"?"s":"c"]);if(U[t].c<=left)a[t]++}
  let feint=(main+Math.floor(n/2))%n;if(feint===main)feint=(main+1)%n;return{army:a,plan:{main,feint,kind}}}

export function makeBot(S,side,plan){const g=S.g,n=S.n,mine=()=>S.squads.filter(q=>q.side===side&&alive(q).length);let acc=0,fe=null,went=false;
  const camp=(i,k)=>{const w=g.w[i];return{k:"pt",x:w.nx*(CAMP+4)-w.nz*k*4,z:w.nz*(CAMP+4)+w.nx*k*4}};
  function deploy(){const sq=mine();
    if(side==="A"){const ms=sq.filter(q=>q.t==="m");fe=ms.length?ms[0]:null;const carr=sq.filter(q=>"msk".includes(q.t));let lad=carr.reduce((s,q)=>s+q.lad,0)+sq.filter(q=>q.t==="a").reduce((s,q)=>s+q.lad,0);
      sq.forEach(q=>q.lad=0);if(fe&&lad>1){fe.lad=1;lad--}const mainC=carr.filter(q=>q!==fe);for(let j=0;j<lad&&mainC.length;j++)mainC[j%mainC.length].lad++;if(!mainC.length&&fe)fe.lad+=lad;
      let k=0;for(const q of sq)setOrder(S,q,q===fe?camp(plan.feint,0):camp(plan.main,(k++)-(sq.length-1)/2))}
    else{const wt=S.castle.walls.map((w,i)=>(.5+rnd())*(i===S.castle.gate?1.7:1)*(w.type===0?1.4:1)),ws=wt.reduce((a,b)=>a+b,0);
      for(const q of sq){if(q.t==="c"||(q.t!=="a"&&rnd()<.3)){setOrder(S,q,{k:"yard"});continue}let r=rnd()*ws,i=0;while(r>wt[i]&&i<n-1){r-=wt[i];i++}setOrder(S,q,{k:"wall",i})}}}
  function tick(dt){acc+=dt;if(acc<1.2)return;acc=0;const sq=mine();
    if(side==="A"){const opens=[];for(let i=0;i<n;i++)if(isOpen(S,i))opens.push(i);
      if(opens.length){for(const q of sq){const c=center(q);let b=opens[0],bd=1e9;for(const o of opens){const d=(g.w[o].mx-c.x)**2+(g.w[o].mz-c.z)**2;if(d<bd){bd=d;b=o}}if(q.order.k!=="wall"||q.order.i!==b)setOrder(S,q,{k:"wall",i:b})}return}
      const t=S.t;for(const q of sq){let w=-1;
        if(q===fe){if(t>1)w=plan.feint}else if(q.t==="cat"){if(t>1)w=plan.main}else if(q.t==="ram"){if(t>4)w=plan.main}else if(q.t==="a"){if(t>(plan.kind==="lad"?6:16))w=plan.main}else if(t>(plan.kind==="ram"?26:plan.kind==="cat"?40:12))w=plan.main;
        if(w>=0&&(q.order.k!=="wall"||q.order.i!==w))setOrder(S,q,{k:"wall",i:w})}
      // asosiy yo'nalish yopilib qolsa (narvon ham, qurol ham yo'q), narvon bor devorga o'tadi
      if(t>60&&!went){const hope=S.ladders[plan.main]>0||sq.some(q=>(q.t==="ram"||q.t==="cat")||q.lad>0);if(!hope){const alt=S.ladders.findIndex(x=>x>0);if(alt>=0){plan.main=alt;went=true}}}
      return}
    // himoyachi
    const threat=Array(n).fill(0),str=Array(n).fill(0);let ain=0;const targets=[];
    for(const u of S.units){if(u.dead)continue;
      if(u.side==="D"){const o=u.sq.order;if(o.k==="wall")str[o.i]+=U[u.t].c;continue}
      if(u.loc==="in"){if(U[u.t])ain++;continue}if(!u.seen)continue;
      if(u.loc==="top"||u.loc==="climb"){threat[u.wi]+=(U[u.t]?U[u.t].c:5)*2;continue}
      let b=0,bd=-1e9;for(let i=0;i<n;i++){const w=g.w[i],d=u.x*w.nx+u.z*w.nz;if(d>bd){bd=d;b=i}}const dist=(u.x-g.w[b].mx)*g.w[b].nx+(u.z-g.w[b].mz)*g.w[b].nz;
      if(dist<=28)threat[b]+=U[u.t]?U[u.t].c:u.t==="ram"?10:4;if(u.t==="cat"||u.t==="a"||u.t==="ram")targets.push(u)}
    if(ain>0)for(const q of sq)if(q.order.k==="wall"&&q.t!=="a"&&(threat[q.order.i]===0||S.cap>2.5||ain>=4))setOrder(S,q,{k:"yard"});
    if(S.cap>6)for(const q of sq)if(q.order.k!=="yard")setOrder(S,q,{k:"yard"});
    let hot=-1,hv=3;for(let i=0;i<n;i++){const v=threat[i]-str[i]*1.1;if(v>hv&&S.wallHp[i]>0){hv=v;hot=i}}
    if(hot>=0&&!(ain>=4)){let c=ain===0?sq.find(q=>q.order.k==="yard"&&q.t!=="c"):null;
      if(!c){let best=0;for(const q of sq){if(q.order.k!=="wall"||threat[q.order.i]>0||q.order.i===hot)continue;const v=alive(q).length*U[q.t].c;if(v>best){best=v;c=q}}}
      if(c)setOrder(S,c,{k:"wall",i:hot})}
    for(const q of sq){if(q.t!=="c")continue;if(q.order.k==="yard"&&ain===0&&targets.length&&rnd()<.5){const tg=pick(targets);
        let guard=0;for(const u of S.units)if(!u.dead&&u.side==="A"&&u.seen&&"skm".includes(u.t)&&Math.hypot(u.x-tg.x,u.z-tg.z)<9)guard++;if(guard<4)setOrder(S,q,{k:"out",x:tg.x,z:tg.z})}
      else if(q.order.k==="out"&&(ain>0||!targets.length))setOrder(S,q,{k:"yard"});
      else if(q.order.k==="out"&&targets.length){const c=center(q),tg=targets.reduce((b,u)=>Math.hypot(u.x-c.x,u.z-c.z)<Math.hypot(b.x-c.x,b.z-c.z)?u:b);q.order={k:"out",x:tg.x,z:tg.z}}}}
  return{deploy,tick}}
