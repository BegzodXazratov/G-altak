// Qoidalar va geometriya. Narx va zarar foizlari Begzod bergan qiymatlar.
export const U={
  m:{n:"Oddiy jangchi",c:1,d:5,hp:16,sp:5,note:"arzon, ko'pchilik bo'lib kuchli"},
  s:{n:"2-darajali jangchi",c:3,d:10,hp:60,sp:5,note:"mustahkam piyoda"},
  k:{n:"3-darajali askar",c:5,d:12,hp:130,sp:4.2,note:"og'ir zirh, o'qqa chidamli"},
  c:{n:"Otliq",c:5,d:14,hp:115,sp:10,note:"devorga chiqmaydi, ochiq joyda +30%"},
  a:{n:"Kamonchi",c:4,d:8,hp:24,sp:5,note:"uzoqdan otadi, yaqinda zaif"}};
export const SIEGE={ram:{n:"Taran",c:8,hp:120,sp:3,note:"darvozani buzadi"},cat:{n:"Katapulta",c:12,hp:70,sp:2.6,note:"devorni uzoqdan buzadi"}};
export const LADDER={n:"Narvon",c:2,note:"piyodalar devorga chiqadi"};
export const WT=[{n:"Yog'och",c:1,hp:70,cover:.6},{n:"Tosh",c:3,hp:160,cover:.45},{n:"Qalin tosh",c:5,hp:260,cover:.35}];
export const COST={tower:4,moat:2,oil:3,strong:3};
export const BUDGET=120,R=26,H=3.9,NEED=5,CAPT=15,TMAX=480,SQMAX=8,CAMP=54;
export const rnd=Math.random,ri=(a,b)=>a+Math.floor(rnd()*(b-a+1)),pick=a=>a[Math.floor(rnd()*a.length)];
export function geo(n){const v=[];for(let k=0;k<n;k++){const a=2*Math.PI*k/n+Math.PI/2-Math.PI/n;v.push({x:R*Math.cos(a),z:R*Math.sin(a)})}
  const w=[];for(let i=0;i<n;i++){const a=v[i],b=v[(i+1)%n],mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,L=Math.hypot(b.x-a.x,b.z-a.z),m=Math.hypot(mx,mz);
    w.push({mx,mz,ex:(b.x-a.x)/L,ez:(b.z-a.z)/L,nx:mx/m,nz:mz/m})}
  return{n,v,w,L:Math.hypot(v[1].x-v[0].x,v[1].z-v[0].z),ap:R*Math.cos(Math.PI/n)}}
export const P=(g,i,lat,out)=>{const w=g.w[i];return{x:w.mx+w.ex*lat+w.nx*out,z:w.mz+w.ez*lat+w.nz*out}};
export const inside=(g,x,z,m=0)=>{for(const w of g.w)if((x-w.mx)*w.nx+(z-w.mz)*w.nz>-m)return false;return true};
// qal'a konfiguratsiyasi va qo'shin (sotib olingan sonlar)
export const newCastle=n=>({n,gate:0,strong:false,walls:Array.from({length:n},()=>({type:1,moat:false,oil:false})),towers:Array(n).fill(false)});
export const newArmy=()=>({m:0,s:0,k:0,c:0,a:0,ram:0,cat:0,lad:0});
export const costCastle=c=>c.walls.reduce((s,w)=>s+WT[w.type].c+(w.moat?COST.moat:0)+(w.oil?COST.oil:0),0)+c.towers.filter(Boolean).length*COST.tower+(c.strong?COST.strong:0);
export const costArmy=a=>Object.keys(U).reduce((s,t)=>s+a[t]*U[t].c,0)+a.ram*SIEGE.ram.c+a.cat*SIEGE.cat.c+a.lad*LADDER.c;
export const countArmy=a=>Object.keys(U).reduce((s,t)=>s+a[t],0);
