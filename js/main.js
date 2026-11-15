// Tashkent City 3D: o'yinchi, kamera, boshqaruv, to'qnashuv, xarita va interfeys.
import * as T from "three";
import {GLTFLoader} from "../lib/GLTFLoader.js";
import {RoomEnvironment} from "../lib/RoomEnvironment.js";
import {buildWorld,BOUNDS,SPAWN} from "./world.js";

const $=id=>document.getElementById(id);
const touch=matchMedia("(pointer:coarse)").matches||"ontouchstart" in window;if(touch)document.body.classList.add("touch");
const lq=/[?&]lq/.test(location.search);
const cv=$("c"),rd=new T.WebGLRenderer({canvas:cv,antialias:!lq,powerPreference:"high-performance"});
rd.setPixelRatio(Math.min(devicePixelRatio||1,lq?1:touch?1.5:2));rd.shadowMap.enabled=!lq;rd.shadowMap.type=T.PCFSoftShadowMap;rd.toneMapping=T.ACESFilmicToneMapping;rd.toneMappingExposure=1.05;
const scene=new T.Scene(),cam=new T.PerspectiveCamera(62,1,.1,3000);
const pm=new T.PMREMGenerator(rd),ENV=pm.fromScene(new RoomEnvironment(),.04).texture;scene.environment=ENV;
const skyTex=(top,mid,bot)=>{const c=document.createElement("canvas");c.width=2;c.height=256;const x=c.getContext("2d"),g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,top);g.addColorStop(.5,mid);g.addColorStop(.56,bot);g.addColorStop(1,bot);x.fillStyle=g;x.fillRect(0,0,2,256);const t=new T.CanvasTexture(c);t.mapping=T.EquirectangularReflectionMapping;t.colorSpace=T.SRGBColorSpace;return t};
const SKY={day:skyTex("#4f8fcf","#bcd8ea","#d9e4ea"),night:skyTex("#05070f","#1b2740","#22293a")};
scene.background=SKY.day;scene.fog=new T.Fog(0xcfdde6,250,1400);
const hemi=new T.HemisphereLight(0xdfefff,0x6b6650,1.1);scene.add(hemi);
const sun=new T.DirectionalLight(0xfff1dc,2.4);sun.castShadow=true;sun.shadow.mapSize.set(touch?1024:2048,touch?1024:2048);const sc=sun.shadow.camera;sc.left=sc.bottom=-90;sc.right=sc.top=90;sc.near=1;sc.far=600;sun.shadow.bias=-.0004;sun.shadow.normalBias=.04;scene.add(sun,sun.target);
const SUNDIR=new T.Vector3(-.55,1,.45).normalize();

let W=null,hero=null,mixer=null,acts={},cur=null;
const P={x:SPAWN.x,z:SPAWN.z,y:0,vy:0,face:Math.PI,speed:0},C={yaw:SPAWN.yaw,pitch:.32,dist:7,first:false};
const keys=new Set();let run=false,night=false,grid=null;

/* ---------- yuklash ---------- */
(async()=>{try{
  const data=await fetch("assets/city.json").then(r=>r.json());
  W=buildWorld(scene,data,rd);grid=makeGrid(W.segs);
  const g=await new GLTFLoader().loadAsync("assets/hero.glb");hero=g.scene;
  const box=new T.Box3().setFromObject(hero),h=box.max.y-box.min.y;hero.scale.setScalar(1.75/h);hero.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false}});scene.add(hero);
  mixer=new T.AnimationMixer(hero);for(const c of g.animations)acts[c.name]=mixer.clipAction(c);acts.Jump_Full_Short&&(acts.Jump_Full_Short.setLoop(T.LoopOnce),acts.Jump_Full_Short.clampWhenFinished=true);play("Idle");
  setupMinimap();setupPlaces(data);resize();
  $("lmsg").textContent="Tayyor. Park janubiy kirishidasiz.";const st=$("start");st.hidden=false;st.onclick=()=>{$("load").hidden=true;toast(touch?"Chap tomonda barmoq bilan yuring, o'ngda torting — atrofga qarang":"W A S D bilan yuring, sichqoncha bilan torting")};
  requestAnimationFrame(loop)}catch(e){console.error(e);$("lmsg").textContent="Yuklab bo'lmadi: "+e.message}})();

function play(n,fade=.2){const a=acts[n];if(!a||cur===a)return;a.reset().setEffectiveWeight(1).fadeIn(fade).play();if(cur)cur.fadeOut(fade);cur=a}

/* ---------- to'qnashuv ---------- */
const CELL=8;
function makeGrid(segs){const g=new Map(),add=(cx,cz,s)=>{const k=cx+","+cz;let a=g.get(k);if(!a)g.set(k,a=[]);a.push(s)};
  for(const s of segs){if(s.c){add(Math.floor(s.x/CELL),Math.floor(s.z/CELL),s);continue}
    const x0=Math.floor(Math.min(s.ax,s.bx)/CELL),x1=Math.floor(Math.max(s.ax,s.bx)/CELL),z0=Math.floor(Math.min(s.az,s.bz)/CELL),z1=Math.floor(Math.max(s.az,s.bz)/CELL);
    for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++)add(x,z,s)}return g}
function near(x,z){const out=new Set(),cx=Math.floor(x/CELL),cz=Math.floor(z/CELL);for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const a=grid.get((cx+i)+","+(cz+j));if(a)for(const s of a)out.add(s)}return out}
function collide(x,z,r){for(let it=0;it<3;it++){let hit=false;for(const s of near(x,z)){let px,pz,rr=r;
      if(s.c){px=s.x;pz=s.z;rr=r+s.r}else{const dx=s.bx-s.ax,dz=s.bz-s.az,l2=dx*dx+dz*dz||1;let t=((x-s.ax)*dx+(z-s.az)*dz)/l2;t=Math.max(0,Math.min(1,t));px=s.ax+dx*t;pz=s.az+dz*t}
      const ex=x-px,ez=z-pz,d=Math.hypot(ex,ez);if(d<rr&&d>1e-6){x=px+ex/d*rr;z=pz+ez/d*rr;hit=true}}if(!hit)break}return[x,z]}
function freeSpot(x,z){for(let r=0;r<80;r+=3)for(let a=0;a<12;a++){const tx=x+Math.cos(a/12*6.283+1.57)*r,tz=z+Math.sin(a/12*6.283+1.57)*r;if(tx<BOUNDS.x0+2||tx>BOUNDS.x1-2||tz<BOUNDS.z0+2||tz>BOUNDS.z1-2)continue;
    const[cx,cz]=collide(tx,tz,1.2);if(Math.hypot(cx-tx,cz-tz)<.01&&!insideAny(tx,tz))return[tx,tz]}return[x,z]}
function insideAny(x,z){let c=0;for(const s of near(x,z)){if(s.c||s.k!=="b")continue;if((s.az>z)!==(s.bz>z)&&x<(s.bx-s.ax)*(z-s.az)/(s.bz-s.az)+s.ax)c++}return c%2===1&&false}

/* ---------- boshqaruv ---------- */
addEventListener("keydown",e=>{if(e.target.tagName==="INPUT")return;const k=e.key.toLowerCase();keys.add(k);if(k==="m")toggleMap();if(k==="n")toggleNight();if(k==="v")toggleCam();if(k===" "){jump();e.preventDefault()}if(k==="escape")$("places").hidden=true});
addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));addEventListener("blur",()=>keys.clear());
// sichqoncha/barmoq bilan qarash
const look=new Map();
cv.addEventListener("pointerdown",e=>{if(touch&&e.clientX<innerWidth*.5&&e.clientY>innerHeight*.45)return;look.set(e.pointerId,{x:e.clientX,y:e.clientY});try{cv.setPointerCapture(e.pointerId)}catch(_){}});
cv.addEventListener("pointermove",e=>{const p=look.get(e.pointerId);if(!p)return;const k=touch?.006:.0045;C.yaw-=(e.clientX-p.x)*k;C.pitch=Math.max(-.35,Math.min(1.3,C.pitch+(e.clientY-p.y)*k));p.x=e.clientX;p.y=e.clientY});
const lu=e=>look.delete(e.pointerId);cv.addEventListener("pointerup",lu);cv.addEventListener("pointercancel",lu);
cv.addEventListener("wheel",e=>{e.preventDefault();C.dist=Math.max(2.5,Math.min(60,C.dist*(1+Math.sign(e.deltaY)*.12)))},{passive:false});
// joystik
const joy=$("joy"),jb=$("joyBase"),jk=$("joyKnob"),J={id:null,x:0,y:0,dx:0,dy:0};
joy.addEventListener("pointerdown",e=>{J.id=e.pointerId;J.x=e.clientX;J.y=e.clientY;J.dx=J.dy=0;jb.style.left=J.x+"px";jb.style.top=J.y+"px";jb.hidden=false;jk.style.transform="";try{joy.setPointerCapture(e.pointerId)}catch(_){}});
joy.addEventListener("pointermove",e=>{if(e.pointerId!==J.id)return;let dx=e.clientX-J.x,dy=e.clientY-J.y;const d=Math.hypot(dx,dy),m=50;if(d>m){dx*=m/d;dy*=m/d}J.dx=dx/m;J.dy=dy/m;jk.style.transform=`translate(${dx}px,${dy}px)`});
const je=e=>{if(e.pointerId!==J.id)return;J.id=null;J.dx=J.dy=0;jb.hidden=true};joy.addEventListener("pointerup",je);joy.addEventListener("pointercancel",je);
$("bJump").onclick=jump;$("bRun").onclick=()=>{run=!run;$("bRun").setAttribute("aria-pressed",String(run))};
$("bNight").onclick=toggleNight;$("bCam").onclick=toggleCam;$("mm").onclick=toggleMap;$("bPlaces").onclick=()=>{$("places").hidden=!$("places").hidden};
function jump(){if(P.y<=.01){P.vy=5.2;if(acts.Jump_Full_Short){cur=null;play("Jump_Full_Short",.1)}}}
function toggleCam(){C.first=!C.first;$("bCam").textContent=C.first?"🎥 3-shaxs":"🎥 1-shaxs";if(hero)hero.visible=!C.first}
function toggleMap(){$("mm").classList.toggle("big")}
function toggleNight(){night=!night;$("bNight").textContent=night?"☀️ Kun":"🌙 Tun";scene.background=night?SKY.night:SKY.day;scene.fog.color.set(night?0x161d2b:0xcfdde6);
  hemi.intensity=night?.28:1.1;hemi.color.set(night?0x8aa0d0:0xdfefff);sun.intensity=night?.25:2.4;sun.color.set(night?0x9fb6ff:0xfff1dc);
  for(const k of ["glass","office"]){const m=W.mats[k];m.emissive.set(night?0xffffff:0x000000);m.emissiveIntensity=night?1.25:0;m.needsUpdate=true}rd.toneMappingExposure=night?1.2:1.05;scene.environment=night?null:ENV}
let toastT=0;function toast(t,ms=3200){const el=$("toast");el.textContent=t;el.hidden=false;el.style.opacity=1;clearTimeout(toastT);toastT=setTimeout(()=>{el.style.opacity=0;setTimeout(()=>el.hidden=true,300)},ms)}

/* ---------- joylar va yozuvlar ---------- */
const PLACES=[];
function setupPlaces(data){const B=BOUNDS,inB=(x,z)=>x>B.x0&&x<B.x1&&z>B.z0&&z<B.z1;
  const extra=[{name:"Tashkent City Park, ko'l",x:-245,z:-55,y:6,hint:"Park markazi"},{name:"Nest One",x:37,z:468,y:60,hint:"266 m, O'zbekistondagi eng baland bino"},{name:"Bosh xiyobon",x:-248,z:150,y:4,hint:"Boshlanish nuqtasi"}];
  const seen=new Set();for(const l of extra.concat(W.labels)){if(!inB(l.x,l.z)||seen.has(l.name)||/^[A-Z]$/.test(l.name))continue;seen.add(l.name);PLACES.push(l)}
  const box=$("places");box.innerHTML=`<h2>Qayerga boramiz?</h2>`+PLACES.map((p,i)=>`<button class="pl" data-i="${i}">${esc(p.name)}<small>${p.hint||dist(p)}</small></button>`).join("")+`<button class="pl" data-close="1">Yopish</button>`;
  box.onclick=e=>{const b=e.target.closest("button");if(!b)return;if(b.dataset.i!=null){const p=PLACES[+b.dataset.i],[x,z]=freeSpot(p.x,p.z+16);P.x=x;P.z=z;P.y=0;C.yaw=Math.atan2(x-p.x,z-p.z);toast(p.name)}box.hidden=true};
  const lb=$("labels");for(const p of PLACES){p.el=document.createElement("div");p.el.className="lb";p.el.textContent=p.name;p.el.hidden=true;lb.appendChild(p.el)}}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const dist=p=>Math.round(Math.hypot(p.x-P.x,p.z-P.z))+" m";
const v3=new T.Vector3();
function drawLabels(){for(const p of PLACES){const d=Math.hypot(p.x-P.x,p.z-P.z);if(d>260||d<4){p.el.hidden=true;continue}v3.set(p.x,p.y,p.z).project(cam);if(v3.z>1||Math.abs(v3.x)>1.1||Math.abs(v3.y)>1.1){p.el.hidden=true;continue}
  p.el.hidden=false;p.el.style.left=((v3.x+1)/2*innerWidth)+"px";p.el.style.top=((1-v3.y)/2*innerHeight)+"px";p.el.style.opacity=Math.max(.35,1-d/300)}}
/* ---------- mini-xarita ---------- */
let mmc,mx;function setupMinimap(){mmc=$("mmc");mmc.width=W.minimap.W;mmc.height=W.minimap.H;mx=mmc.getContext("2d")}
function drawMinimap(){const M=W.minimap,B=BOUNDS;mx.drawImage(M.canvas,0,0);const x=(P.x-B.x0)*M.S,y=(P.z-B.z0)*M.S;
  mx.save();mx.translate(x,y);mx.rotate(-C.yaw);mx.fillStyle="rgba(242,179,61,.25)";mx.beginPath();mx.moveTo(0,0);mx.arc(0,0,40,-Math.PI/2-.5,-Math.PI/2+.5);mx.fill();mx.restore();
  mx.save();mx.translate(x,y);mx.rotate(Math.PI-P.face);mx.fillStyle="#e23b2e";mx.strokeStyle="#fff";mx.lineWidth=2;mx.beginPath();mx.moveTo(0,-9);mx.lineTo(6,7);mx.lineTo(0,3);mx.lineTo(-6,7);mx.closePath();mx.fill();mx.stroke();mx.restore()}

/* ---------- sikl ---------- */
function resize(){const w=innerWidth,h=innerHeight;rd.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}addEventListener("resize",resize);
let last=0,mmT=0,whereT=0,edgeT=0;const fwd=new T.Vector3();
function loop(ts){requestAnimationFrame(loop);const dt=Math.min(.1,(ts-last)/1000||0);last=ts;
  let ix=0,iz=0;if(keys.has("w")||keys.has("arrowup")||keys.has("ц"))iz+=1;if(keys.has("s")||keys.has("arrowdown")||keys.has("ы"))iz-=1;if(keys.has("a")||keys.has("arrowleft")||keys.has("ф"))ix-=1;if(keys.has("d")||keys.has("arrowright")||keys.has("в"))ix+=1;
  if(J.id!=null){ix+=J.dx;iz-=J.dy}const mag=Math.min(1,Math.hypot(ix,iz));const running=(run||keys.has("shift"))&&mag>.2||(J.id!=null&&Math.hypot(J.dx,J.dy)>.95&&run);
  const target=mag<.08?0:(running?6.2:2.4*Math.max(.5,mag)),acc=Math.min(1,dt*10);P.speed+=(target-P.speed)*acc;
  if(mag>.08){const s=Math.sin(C.yaw),c=Math.cos(C.yaw),fx=-s,fz=-c,rx=c,rz=-s;let dx=fx*iz+rx*ix,dz=fz*iz+rz*ix;const l=Math.hypot(dx,dz);dx/=l;dz/=l;
    const tf=Math.atan2(dx,dz);let df=tf-P.face;while(df>Math.PI)df-=2*Math.PI;while(df<-Math.PI)df+=2*Math.PI;P.face+=df*Math.min(1,dt*12);
    let nx=P.x+dx*P.speed*dt,nz=P.z+dz*P.speed*dt;[nx,nz]=collide(nx,nz,.38);
    const B=BOUNDS,cx=Math.max(B.x0+.6,Math.min(B.x1-.6,nx)),cz=Math.max(B.z0+.6,Math.min(B.z1-.6,nz));if((cx!==nx||cz!==nz)&&ts-edgeT>4000){edgeT=ts;toast("Tashkent City chegarasi: bu yerdan nariga chiqib bo'lmaydi")}P.x=cx;P.z=cz}
  else P.speed*=.8;
  P.vy-=14*dt;P.y=Math.max(0,P.y+P.vy*dt);if(P.y===0)P.vy=0;
  if(hero){hero.position.set(P.x,P.y,P.z);hero.rotation.y=P.face;
    if(P.y>.05){}else if(P.speed>4.2)play("Running_A");else if(P.speed>.4)play("Walking_A");else play("Idle");
    if(cur===acts.Walking_A)cur.timeScale=P.speed/2.2;if(cur===acts.Running_A)cur.timeScale=P.speed/6;mixer.update(dt)}
  // kamera
  if(C.first){cam.position.set(P.x,P.y+1.62,P.z);fwd.set(-Math.sin(C.yaw)*Math.cos(C.pitch-.3),-Math.sin(C.pitch-.3),-Math.cos(C.yaw)*Math.cos(C.pitch-.3));cam.lookAt(cam.position.x+fwd.x,cam.position.y+fwd.y,cam.position.z+fwd.z)}
  else{const d=C.dist,cp=Math.cos(C.pitch),tx=P.x,ty=P.y+1.5,tz=P.z;cam.position.set(tx+Math.sin(C.yaw)*cp*d,ty+Math.sin(C.pitch)*d,tz+Math.cos(C.yaw)*cp*d);if(cam.position.y<.4)cam.position.y=.4;cam.lookAt(tx,ty,tz)}
  sun.position.set(P.x+SUNDIR.x*250,SUNDIR.y*250,P.z+SUNDIR.z*250);sun.target.position.set(P.x,0,P.z);
  rd.render(scene,cam);drawLabels();
  mmT-=dt;if(mmT<=0){mmT=.1;drawMinimap()}
  whereT-=dt;if(whereT<=0){whereT=1;let best=null,bd=1e9;for(const p of PLACES){const d=Math.hypot(p.x-P.x,p.z-P.z);if(d<bd){bd=d;best=p}}$("where").textContent=best?(bd<60?best.name:best.name+" — "+Math.round(bd)+" m"):""}}
window.__city={P,C,W:()=>W};
