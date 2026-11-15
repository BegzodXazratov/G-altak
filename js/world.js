// Shahar qurilishi: OpenStreetMap ma'lumotlaridan binolar, yo'llar, maysazorlar, suv va daraxtlar.
import * as T from "three";
import {mergeGeometries} from "../lib/utils/BufferGeometryUtils.js";

// O'yin maydoni (metrda, markaz: 41.3163 N, 69.2515 E; x — sharq, z — janub)
export const BOUNDS={x0:-575,x1:228,z0:-468,z1:500};
export const SPAWN={x:-248,z:150,yaw:0};

const dec=r=>{const o=[];let x=0,z=0;for(let i=0;i<r.length;i+=2){x+=r[i];z+=r[i+1];o.push([x/2,z/2])}if(o.length>2){const a=o[0],b=o[o.length-1];if(a[0]===b[0]&&a[1]===b[1])o.pop()}return o};
const area=p=>{let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return s/2};
const cen=p=>{let x=0,z=0;for(const q of p){x+=q[0];z+=q[1]}return[x/p.length,z/p.length]};
const hash=(x,z)=>{const s=Math.sin(x*12.9898+z*78.233)*43758.5453;return s-Math.floor(s)};

function canvasTex(w,h,draw,srgb=true){const c=document.createElement("canvas");c.width=w;c.height=h;draw(c.getContext("2d"),w,h);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;if(srgb)t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t}
function noise(x,w,h,cols,n,a){for(let i=0;i<n;i++){x.globalAlpha=a*(.4+Math.random()*.6);x.fillStyle=cols[i%cols.length];const s=1+Math.random()*2.5;x.fillRect(Math.random()*w,Math.random()*h,s,s)}x.globalAlpha=1}

// Fasad teksturalari: har biri 4 ustun × 4 qavat
function facadeTextures(){
  const glass=canvasTex(256,256,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,"#9fb8c8");g.addColorStop(1,"#5d7a8e");x.fillStyle=g;x.fillRect(0,0,w,h);
    for(let r=0;r<4;r++)for(let c=0;c<4;c++){const v=.75+Math.random()*.35;x.fillStyle=`rgba(${120*v|0},${150*v|0},${170*v|0},.55)`;x.fillRect(c*64+3,r*64+3,58,52);
      x.fillStyle="rgba(255,255,255,.18)";x.beginPath();x.moveTo(c*64+3,r*64+3);x.lineTo(c*64+30,r*64+3);x.lineTo(c*64+3,r*64+40);x.fill()}
    x.fillStyle="#d6dde2";for(let r=0;r<4;r++)x.fillRect(0,r*64+55,w,9);for(let c=0;c<4;c++)x.fillRect(c*64,0,3,h)});
  const office=canvasTex(256,256,(x,w,h)=>{x.fillStyle="#efebe3";x.fillRect(0,0,w,h);noise(x,w,h,["#d9d3c7","#fff"],900,.4);
    for(let r=0;r<4;r++)for(let c=0;c<4;c++){x.fillStyle="#3c4a57";x.fillRect(c*64+12,r*64+12,40,38);x.fillStyle="rgba(170,200,220,.45)";x.fillRect(c*64+14,r*64+14,17,16);x.fillStyle="#c9c2b4";x.fillRect(c*64+10,r*64+50,44,4);x.fillStyle="#e7e2d8";x.fillRect(c*64+31,r*64+12,2,38)}});
  const lit=(cols)=>canvasTex(256,256,(x,w,h)=>{x.fillStyle="#000";x.fillRect(0,0,w,h);for(let r=0;r<4;r++)for(let c=0;c<4;c++){if(Math.random()<.42){const k=Math.random();x.fillStyle=k<.6?"#ffd58a":k<.85?"#fff1c9":"#bfe3ff";x.globalAlpha=.55+Math.random()*.45;cols(x,r,c)}}x.globalAlpha=1});
  const glassE=lit((x,r,c)=>x.fillRect(c*64+3,r*64+3,58,52)),officeE=lit((x,r,c)=>x.fillRect(c*64+12,r*64+12,40,38));
  return{glass,office,glassE,officeE}}

function groundTextures(){
  const paving=canvasTex(256,256,(x,w,h)=>{x.fillStyle="#cfc8bb";x.fillRect(0,0,w,h);noise(x,w,h,["#bdb5a7","#ddd7cb","#c4bcae"],2500,.5);x.strokeStyle="rgba(120,110,95,.35)";x.lineWidth=2;for(let i=0;i<=4;i++){x.beginPath();x.moveTo(i*64,0);x.lineTo(i*64,h);x.stroke();x.beginPath();x.moveTo(0,i*64);x.lineTo(w,i*64);x.stroke()}});
  const grass=canvasTex(256,256,(x,w,h)=>{x.fillStyle="#5f8f3a";x.fillRect(0,0,w,h);noise(x,w,h,["#4f7d2e","#73a347","#6a9840","#557f33"],5000,.7)});
  const asphalt=canvasTex(256,256,(x,w,h)=>{x.fillStyle="#4a4c50";x.fillRect(0,0,w,h);noise(x,w,h,["#3c3e42","#5a5c60","#444"],4000,.6)});
  const stone=canvasTex(128,128,(x,w,h)=>{x.fillStyle="#d8cdb8";x.fillRect(0,0,w,h);noise(x,w,h,["#c7bba4","#e6dcc8"],900,.5);x.strokeStyle="rgba(110,95,75,.3)";for(let i=0;i<4;i++){x.beginPath();x.moveTo(0,i*32);x.lineTo(w,i*32);x.stroke()}});
  const roof=canvasTex(128,128,(x,w,h)=>{x.fillStyle="#9a9a96";x.fillRect(0,0,w,h);noise(x,w,h,["#8a8a86","#aaaaa6"],1200,.6)});
  return{paving,grass,asphalt,stone,roof}}

function triangulate(outer,holes,y,uvScale,flip){const c=outer.map(p=>new T.Vector2(p[0],p[1])),hs=holes.map(h=>h.map(p=>new T.Vector2(p[0],p[1])));
  const tris=T.ShapeUtils.triangulateShape(c,hs),pts=c.concat(...hs),pos=[],uv=[],idx=[];
  for(const p of pts){pos.push(p.x,y,p.y);uv.push(p.x/uvScale,p.y/uvScale)}
  for(const t of tris)flip?idx.push(t[0],t[1],t[2]):idx.push(t[0],t[2],t[1]);
  const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(pos,3));g.setAttribute("uv",new T.Float32BufferAttribute(uv,2));g.setIndex(idx);return g}
function orient(p,ccw){const a=area(p);return (a>0)===ccw?p:p.slice().reverse()}

export function buildWorld(scene,data,renderer){
  const F=facadeTextures(),Gt=groundTextures(),out={segs:[],labels:[],mats:{},minimap:null,trees:[]};
  // --- yer
  const ground=new T.Mesh(new T.PlaneGeometry(4000,4000),new T.MeshStandardMaterial({map:Gt.paving,roughness:.95,color:0xc9c2b6}));ground.material.map=Gt.paving.clone();ground.material.map.repeat.set(4000/16,4000/16);ground.material.map.needsUpdate=true;
  ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  // --- maydonlar
  const AT={park:{y:.02,m:"pave",c:0xc8cdb6},grass:{y:.05,m:"grass",c:0xffffff},pitch:{y:.06,m:"grass",c:0xb8e0a0},play:{y:.06,m:"pave",c:0xe8b98a},parking:{y:.03,m:"asphalt",c:0xb0b0b0},constr:{y:.03,m:"pave",c:0xb8a58a},water:{y:.09,m:"water",c:0xffffff},fountain:{y:.12,m:"water",c:0xffffff}};
  const groups={};
  for(const[k,r]of data.A){const t=AT[k];if(!t)continue;let p=dec(r);if(p.length<3)continue;p=orient(p,true);
    let g;try{g=triangulate(p,[],t.y,t.m==="grass"?6:8,false)}catch(e){continue}if(!g.index||!g.index.count)continue;(groups[t.m+"|"+t.c]=groups[t.m+"|"+t.c]||[]).push(g);
    if(k==="water"||k==="fountain")addRing(out.segs,p,"water")}
  const water=new T.MeshStandardMaterial({color:0x3e7fa6,roughness:.08,metalness:.35,transparent:true,opacity:.92});out.mats.water=water;
  for(const key in groups){const[m,c]=key.split("|");const mat=m==="water"?water:new T.MeshStandardMaterial({map:m==="grass"?Gt.grass:m==="asphalt"?Gt.asphalt:Gt.paving,color:+c,roughness:.95,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
    const mesh=new T.Mesh(mergeGeometries(groups[key]),mat);mesh.geometry.computeVertexNormals();mesh.receiveShadow=true;scene.add(mesh)}
  // --- yo'llar
  const RW={primary:12,primary_link:7,secondary:10,tertiary:8,residential:7,unclassified:7,living_street:6,service:4.5,pedestrian:6,footway:2.6,cycleway:2.2,steps:2.6,path:2,track:3};
  const rg={car:[],walk:[]};
  for(const r of data.R){const[type,w0,,bridge,layer,tunnel,pts]=r;if(tunnel||layer<0)continue;const w=w0||RW[type]||3;const p=dec(pts);if(p.length<2)continue;
    const car=!["pedestrian","footway","cycleway","steps","path"].includes(type);(car?rg.car:rg.walk).push(ribbon(p,w,car?.07:.085+(type==="footway"?.005:0),car?10:4))}
  const asph=new T.MeshStandardMaterial({map:Gt.asphalt,roughness:.9,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const stoneM=new T.MeshStandardMaterial({map:Gt.stone,roughness:.9,color:0xf2ece0,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
  if(rg.car.length){const m=new T.Mesh(mergeGeometries(rg.car),asph);m.receiveShadow=true;scene.add(m)}
  if(rg.walk.length){const m=new T.Mesh(mergeGeometries(rg.walk),stoneM);m.receiveShadow=true;scene.add(m)}
  // --- binolar
  const geo={glass:[],office:[],roof:[]};const tint=new T.Color();
  const GT=[0x9fc3d6,0x8fb5c9,0xb9c9d4,0xa9b9a8,0xc9b79c,0x7fa2c2],OT=[0xffffff,0xf3e8d4,0xe6e2da,0xf0dcc0,0xdfe6ea,0xe9d6c4];
  for(const b of data.B){let[h,mh,,,name,isPart,lv]=b;const o=dec(b[9]);if(o.length<3)continue;const ar=Math.abs(area(o));
    if(h<0)h=lv?lv*3.3:(ar<60?4:ar<400?9:14);if(h<=mh)h=mh+3;
    const ccwO=orient(o,true),holes=(b[10]||[]).map(dec).filter(p=>p.length>2).map(p=>orient(p,false));
    const kind=h>=45?"glass":"office",[cx,cz]=cen(o),rnd=hash(cx,cz);tint.set(kind==="glass"?GT[(rnd*GT.length)|0]:OT[(rnd*OT.length)|0]);
    const wall=walls([ccwO,...holes],mh,h,kind==="glass"?7.2:12,kind==="glass"?14.4:13.2,tint);geo[kind].push(wall);
    try{const rf=triangulate(ccwO,holes,h,10,false);colorize(rf,new T.Color(0xaaaaaa).multiplyScalar(.85+rnd*.3));geo.roof.push(rf);
      if(mh>.5){const bt=triangulate(ccwO,holes,mh,10,true);colorize(bt,new T.Color(0x777777));geo.roof.push(bt)}}catch(e){}
    if(mh<2.5&&h>1.5){addRing(out.segs,ccwO,"b");for(const hh of holes)addRing(out.segs,hh,"b")}
    if(name&&!isPart)out.labels.push({name,x:cx,z:cz,y:Math.min(h,60)+4})}
  const mk=(k,o)=>new T.MeshStandardMaterial(Object.assign({vertexColors:true},o));
  out.mats.glass=mk("glass",{map:F.glass,emissiveMap:F.glassE,emissive:0x000000,roughness:.12,metalness:.3,envMapIntensity:1.4});
  out.mats.office=mk("office",{map:F.office,emissiveMap:F.officeE,emissive:0x000000,roughness:.75,metalness:0});
  out.mats.roof=mk("roof",{map:Gt.roof,roughness:.9});
  for(const k of ["glass","office","roof"]){if(!geo[k].length)continue;const g=mergeGeometries(geo[k]);g.computeVertexNormals();if(k!=="roof")g.computeVertexNormals();const m=new T.Mesh(g,out.mats[k]);m.castShadow=m.receiveShadow=true;scene.add(m)}
  // --- daraxtlar
  const tp=[];let x=0,z=0;for(let i=0;i<data.T.length;i+=2){x+=data.T[i];z+=data.T[i+1];tp.push([x/2,z/2])}
  const n=tp.length,trunk=new T.InstancedMesh(new T.CylinderGeometry(.14,.22,2.4,6).translate(0,1.2,0),new T.MeshStandardMaterial({color:0x6b4a2f,roughness:1}),n);
  const crownG=new T.IcosahedronGeometry(1.6,1);crownG.translate(0,3.6,0);const crown=new T.InstancedMesh(crownG,new T.MeshStandardMaterial({color:0xffffff,roughness:.9,flatShading:true}),n);
  const d=new T.Object3D(),cc=new T.Color();tp.forEach(([tx,tz],i)=>{const s=.8+hash(tx,tz)*.7;d.position.set(tx,0,tz);d.rotation.y=hash(tz,tx)*6.28;d.scale.set(s,s*(.9+hash(tx+1,tz)*.4),s);d.updateMatrix();trunk.setMatrixAt(i,d.matrix);crown.setMatrixAt(i,d.matrix);
    cc.setHSL(.22+hash(tx,tz+3)*.1,.45+hash(tx+2,tz)*.2,.28+hash(tx+5,tz)*.12);crown.setColorAt(i,cc);out.segs.push({c:1,x:tx,z:tz,r:.35*s})});
  trunk.castShadow=crown.castShadow=true;crown.receiveShadow=true;scene.add(trunk,crown);out.trees=tp;
  // --- chegara
  out.fence=boundary(scene);
  out.minimap=minimap(data);
  return out}

function colorize(g,c){const n=g.attributes.position.count,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b}g.setAttribute("color",new T.BufferAttribute(a,3))}
function walls(rings,y0,y1,uw,vh,tint){const pos=[],uv=[],col=[],idx=[];let v=0;
  for(const p of rings){let u=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<.05)continue;
      pos.push(a[0],y0,a[1],b[0],y0,b[1],b[0],y1,b[1],a[0],y1,a[1]);const u0=u/uw,u1=(u+L)/uw;uv.push(u0,y0/vh,u1,y0/vh,u1,y1/vh,u0,y1/vh);u+=L;
      for(let k=0;k<4;k++)col.push(tint.r,tint.g,tint.b);idx.push(v,v+2,v+1,v,v+3,v+2);v+=4}}
  const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(pos,3));g.setAttribute("uv",new T.Float32BufferAttribute(uv,2));g.setAttribute("color",new T.Float32BufferAttribute(col,3));g.setIndex(idx);return g}
function ribbon(p,w,y,us){const pos=[],uv=[],idx=[];let len=0;const h=w/2;
  for(let i=0;i<p.length;i++){const a=p[Math.max(0,i-1)],b=p[Math.min(p.length-1,i+1)];let dx=b[0]-a[0],dz=b[1]-a[1];const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
    if(i>0)len+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);const nx=-dz*h,nz=dx*h;pos.push(p[i][0]+nx,y,p[i][1]+nz,p[i][0]-nx,y,p[i][1]-nz);uv.push(0,len/us,w/us,len/us);
    if(i>0){const v=i*2;idx.push(v-2,v,v-1,v-1,v,v+1)}}
  const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(pos,3));g.setAttribute("uv",new T.Float32BufferAttribute(uv,2));g.setAttribute("normal",new T.Float32BufferAttribute(new Array(pos.length/3).fill(0).flatMap(()=>[0,1,0]),3));g.setIndex(idx);return g}
function addRing(segs,p,k){for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];segs.push({k,ax:a[0],az:a[1],bx:b[0],bz:b[1]})}}
function boundary(scene){const B=BOUNDS,g=new T.Group(),H=4;
  const tex=canvasTex(64,128,(x,w,h)=>{const gr=x.createLinearGradient(0,h,0,0);gr.addColorStop(0,"rgba(255,196,60,.55)");gr.addColorStop(1,"rgba(255,196,60,0)");x.fillStyle=gr;x.fillRect(0,0,w,h);x.fillStyle="rgba(255,220,120,.6)";x.fillRect(0,h-6,w,6)});
  const mat=new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:T.DoubleSide});
  const side=(x0,z0,x1,z1)=>{const L=Math.hypot(x1-x0,z1-z0),m=new T.Mesh(new T.PlaneGeometry(L,H),mat);m.position.set((x0+x1)/2,H/2,(z0+z1)/2);m.rotation.y=-Math.atan2(z1-z0,x1-x0);g.add(m)};
  side(B.x0,B.z0,B.x1,B.z0);side(B.x1,B.z0,B.x1,B.z1);side(B.x1,B.z1,B.x0,B.z1);side(B.x0,B.z1,B.x0,B.z0);
  const post=new T.CylinderGeometry(.12,.12,1.1,6).translate(0,.55,0),pm=new T.MeshStandardMaterial({color:0xe0a020,roughness:.5});const pts=[];
  const per=(x0,z0,x1,z1)=>{const L=Math.hypot(x1-x0,z1-z0),n=Math.floor(L/6);for(let i=0;i<=n;i++)pts.push([x0+(x1-x0)*i/n,z0+(z1-z0)*i/n])};
  per(B.x0,B.z0,B.x1,B.z0);per(B.x1,B.z0,B.x1,B.z1);per(B.x1,B.z1,B.x0,B.z1);per(B.x0,B.z1,B.x0,B.z0);
  const im=new T.InstancedMesh(post,pm,pts.length),d=new T.Object3D();pts.forEach(([x,z],i)=>{d.position.set(x,0,z);d.updateMatrix();im.setMatrixAt(i,d.matrix)});g.add(im);scene.add(g);return g}
function minimap(data){const B=BOUNDS,S=.36,W=Math.round((B.x1-B.x0)*S),H=Math.round((B.z1-B.z0)*S),c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
  const P=(p)=>[(p[0]-B.x0)*S,(p[1]-B.z0)*S];x.fillStyle="#e4ddd0";x.fillRect(0,0,W,H);
  const fill=(p,col)=>{x.fillStyle=col;x.beginPath();p.forEach((q,i)=>{const[a,b]=P(q);i?x.lineTo(a,b):x.moveTo(a,b)});x.closePath();x.fill()};
  for(const[k,r]of data.A){const col={park:"#d7e3c0",grass:"#9cc779",pitch:"#9cc779",water:"#5aa5d6",fountain:"#5aa5d6",parking:"#c9c9c9",play:"#e9c79d"}[k];if(col)fill(dec(r),col)}
  for(const r of data.R){if(r[5]||r[4]<0)continue;const p=dec(r[6]),car=!["pedestrian","footway","cycleway","steps","path"].includes(r[0]);x.strokeStyle=car?"#6b6b6b":"#fff";x.lineWidth=car?(r[0]==="primary"?3.5:2):1;x.beginPath();p.forEach((q,i)=>{const[a,b]=P(q);i?x.lineTo(a,b):x.moveTo(a,b)});x.stroke()}
  for(const b of data.B){const o=dec(b[9]),h=b[0]<0?10:b[0];fill(o,h>=45?"#5b7f9e":"#9a8f80")}
  x.strokeStyle="#e0a020";x.lineWidth=3;x.strokeRect(1.5,1.5,W-3,H-3);return{canvas:c,S,W,H}}
