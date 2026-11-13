// 3D sahna: modellar (KayKit, CC0) oldindan "pishirilgan" kadrlar sifatida yuklanadi va instanslar bilan chiziladi.
import * as T from "../lib/three.module.min.js";
import {U,R,H,CAPT,geo,P} from "./data.js";
import {isOpen} from "./sim.js";

const TEAM={D:[.16,.36,.78],A:[.72,.13,.1]};
const FR={idle:0,walk:1,atk:9,dead:15};
const lin=c=>c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);

export class Gfx{
  constructor(canvas){this.cv=canvas;this.M={};this.S=null;this.side="D";this.cam={th:.6,ph:1.0,d:110,tth:null,auto:true};this.siege=new Map();this.fx=[];this.labels=[];
    const rd=this.rd=new T.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});const lq=/[?&]lq/.test(location.search);rd.setPixelRatio(lq?1:Math.min(devicePixelRatio||1,2));
    rd.shadowMap.enabled=!lq;rd.shadowMap.type=T.PCFSoftShadowMap;
    const sc=this.scene=new T.Scene();sc.background=new T.Color(0x9fc4dd);sc.fog=new T.Fog(0xb9d3e0,170,420);
    this.camera=new T.PerspectiveCamera(46,1,1,700);
    sc.add(new T.HemisphereLight(0xdfeeff,0x4d5a38,1.5));
    const sun=this.sun=new T.DirectionalLight(0xfff0d0,2.3);sun.position.set(60,90,35);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
    const c=sun.shadow.camera;c.left=-85;c.right=85;c.top=85;c.bottom=-85;c.near=10;c.far=260;sun.shadow.bias=-.0006;sun.shadow.normalBias=.05;sc.add(sun);
    this.world=new T.Group();this.castleG=new T.Group();this.unitG=new T.Group();this.fxG=new T.Group();sc.add(this.world,this.castleG,this.unitG,this.fxG);
    this.mat=new T.MeshLambertMaterial({vertexColors:true});
    this._controls();this.resize();addEventListener("resize",()=>this.resize())}

  async load(onProgress){const bin=async()=>{if(typeof DecompressionStream!=="undefined"){try{const r=await fetch("assets/models.gz");if(r.ok)return await new Response(r.body.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer()}catch(e){}}return (await fetch("assets/models.bin")).arrayBuffer()};
    const [meta,buf]=await Promise.all([fetch("assets/models.json").then(r=>r.json()),bin()]);
    for(const m of meta){const col=new Uint8Array(buf,m.col,m.nv*3),mask=new Uint8Array(buf,m.mask,m.nv),idx=m.nv<65536?new Uint16Array(buf,m.idx,m.ni):new Uint32Array(buf,m.idx,m.ni);
      const base=new Float32Array(m.nv*3);for(let i=0;i<base.length;i++)base[i]=lin(col[i]/255);
      const colors={N:new T.BufferAttribute(base,3)};
      if(m.name.startsWith("u_"))for(const s of ["D","A"]){const c=new Float32Array(base);const tc=TEAM[s];for(let i=0;i<m.nv;i++)if(mask[i]){const l=.45+.9*Math.cbrt((base[i*3]+base[i*3+1]+base[i*3+2])/3);c[i*3]=lin(tc[0])*l*2.2;c[i*3+1]=lin(tc[1])*l*2.2;c[i*3+2]=lin(tc[2])*l*2.2}colors[s]=new T.BufferAttribute(c,3)}
      const index=new T.BufferAttribute(idx,1);
      const frames=m.pos.map(o=>{const q=new Int16Array(buf,o,m.nv*3),f=new Float32Array(q.length);for(let i=0;i<q.length;i++)f[i]=q[i]*m.scale;
        const g=new T.BufferGeometry();g.setAttribute("position",new T.BufferAttribute(f,3));g.setIndex(index);g.computeVertexNormals();return g});
      this.M[m.name]={m,frames,colors,index,bb:m.bb};if(onProgress)onProgress()}
    for(const k in this.M){const mo=this.M[k];if(!k.startsWith("u_"))mo.frames[0].setAttribute("color",mo.colors.N)}
    this._world();this._units()}
  geoOf(name,frame,side){const mo=this.M[name];if(!side)return mo.frames[frame||0];const key=side+frame;mo.v=mo.v||{};if(!mo.v[key]){const s=mo.frames[frame],g=new T.BufferGeometry();g.setAttribute("position",s.attributes.position);g.setAttribute("normal",s.attributes.normal);g.setAttribute("color",mo.colors[side]);g.setIndex(mo.index);mo.v[key]=g}return mo.v[key]}
  mesh(name,mat){const m=new T.Mesh(this.geoOf(name),mat||this.mat);m.castShadow=m.receiveShadow=true;return m}

  _tex(base,spots,rep){const c=document.createElement("canvas");c.width=c.height=256;const x=c.getContext("2d");x.fillStyle=base;x.fillRect(0,0,256,256);
    for(let i=0;i<2600;i++){x.fillStyle=spots[i%spots.length];x.globalAlpha=.25+Math.random()*.35;const s=1+Math.random()*3;x.fillRect(Math.random()*256,Math.random()*256,s,s*(1+Math.random()*2))}
    const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rep,rep);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t}
  _world(){const g=new T.Mesh(new T.CircleGeometry(420,64),new T.MeshLambertMaterial({map:this._tex("#6f9547",["#5b8038","#82a655","#668d40","#7a9c4c"],70)}));g.rotation.x=-Math.PI/2;g.receiveShadow=true;this.world.add(g);
    const d=new T.Object3D(),put=(name,n,rmin,rmax,smin,smax)=>{const im=new T.InstancedMesh(this.geoOf(name),this.mat,n);im.castShadow=true;
      for(let i=0;i<n;i++){const a=Math.random()*6.283,r=rmin+Math.random()*(rmax-rmin),s=smin+Math.random()*(smax-smin);d.position.set(r*Math.cos(a),0,r*Math.sin(a));d.rotation.y=Math.random()*6.283;d.scale.setScalar(s);d.updateMatrix();im.setMatrixAt(i,d.matrix)}this.world.add(im)};
    put("treeA",150,70,300,9,15);put("treeB",150,66,300,8,13);put("rock",40,36,150,7,16)}
  _units(){this.layers={};const CAP=124;for(const t of Object.keys(U)){this.layers[t]={};for(const s of ["D","A"]){const arr=[];for(let f=0;f<16;f++){const im=new T.InstancedMesh(this.geoOf("u_"+t,f,s),this.mat,CAP);im.count=0;im.frustumCulled=false;im.castShadow=true;this.unitG.add(im);arr.push(im)}this.layers[t][s]=arr}}
    const ring=new T.RingGeometry(.75,1.02,20);ring.rotateX(-Math.PI/2);this.rings=new T.InstancedMesh(ring,new T.MeshBasicMaterial({color:0xffd24a,transparent:true,opacity:.95,depthWrite:false}),260);this.rings.count=0;this.rings.frustumCulled=false;this.unitG.add(this.rings);
    const ar=new T.BoxGeometry(.07,.07,1.1);this.arrows=new T.InstancedMesh(ar,new T.MeshBasicMaterial({color:0x3b2a1a}),80);this.arrows.count=0;this.arrows.frustumCulled=false;this.fxG.add(this.arrows);this.arrowList=[];
    this.marks=[];for(let i=0;i<14;i++){const m=new T.Mesh(new T.ConeGeometry(.9,2.4,8),new T.MeshBasicMaterial({color:0xffd24a}));m.rotation.x=Math.PI;m.visible=false;this.fxG.add(m);this.marks.push(m)}}

  _label(txt){const c=document.createElement("canvas");c.width=c.height=96;const x=c.getContext("2d");x.fillStyle="rgba(28,30,24,.85)";x.beginPath();x.arc(48,48,40,0,7);x.fill();x.fillStyle="#f1ecd7";x.font="bold 50px sans-serif";x.textAlign="center";x.textBaseline="middle";x.fillText(txt,48,52);
    const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;const s=new T.Sprite(new T.SpriteMaterial({map:t,depthTest:false,sizeAttenuation:false,transparent:true,opacity:.9}));s.scale.set(.055,.055,1);s.renderOrder=5;return s}
  // Qal'ani qurish. opts: {labels, oil}
  setCastle(cs,opts){opts=opts||{};const G=this.castleG;while(G.children.length)G.remove(G.children[0]);const g=this.g=geo(cs.n);this.cs=cs;this.wallP=[];this.ladG=[];this.oilM=[];this.gateD=null;
    const sh=new T.Shape();g.v.forEach((p,i)=>i?sh.lineTo(p.x,-p.z):sh.moveTo(p.x,-p.z));
    const yard=new T.Mesh(new T.ShapeGeometry(sh),new T.MeshLambertMaterial({map:this._yardTex||(this._yardTex=this._tex("#a08a5c",["#8f7a4f","#b09a6a","#96825a"],.12))}));yard.rotation.x=-Math.PI/2;yard.position.y=.06;yard.receiveShadow=true;G.add(yard);
    const mats=this._wm||(this._wm=[new T.MeshLambertMaterial({vertexColors:true,color:0xb98a55}),this.mat,new T.MeshLambertMaterial({vertexColors:true,color:0xb9bcc6})]);
    cs.walls.forEach((w,i)=>{const ww=g.w[i],rot=Math.atan2(ww.nx,ww.nz);let k=Math.max(1,Math.round(g.L/9));if(cs.gate===i&&k%2===0)k++;const pw=g.L/k,zs=w.type===2?6.2:w.type===0?3:4.5,pieces=[];
      for(let j=0;j<k;j++){const lat=(j+.5)*pw-g.L/2,p=P(g,i,lat,0),isG=cs.gate===i&&j===(k-1)/2;const m=this.mesh(isG?"gatef":"wall",mats[w.type]);m.position.set(p.x,0,p.z);m.rotation.y=rot;m.scale.set(pw/2,4.5,zs);G.add(m);pieces.push(m);
        if(isG){const d=this.mesh("gated",cs.strong?mats[2]:this.mat);d.position.copy(m.position);d.rotation.y=rot;d.scale.copy(m.scale);G.add(d);this.gateD=d}}
      this.wallP.push(pieces);
      if(w.moat){const mo=new T.Mesh(new T.BoxGeometry(g.L+3,.14,4),new T.MeshLambertMaterial({color:0x3f7fa8,transparent:true,opacity:.85}));const p=P(g,i,0,5);mo.position.set(p.x,.1,p.z);mo.rotation.y=rot;G.add(mo)}
      const oil=this.mesh("barrel");const po=P(g,i,g.L*.22,-.3);oil.position.set(po.x,H,po.z);oil.scale.setScalar(5);oil.visible=!!(w.oil&&opts.oil);G.add(oil);this.oilM.push(oil);
      if(opts.labels){const s=this._label(String(i+1)),p=P(g,i,0,1);s.position.set(p.x,H+6.5,p.z);G.add(s)}
      const lg=new T.Group();lg.userData={rot,n:0};G.add(lg);this.ladG.push(lg)});
    g.v.forEach((p,k)=>{const tw=cs.towers[k],m=this.mesh(tw?"tower":"post");m.position.set(p.x,0,p.z);m.rotation.y=Math.atan2(p.x,p.z);m.scale.setScalar(tw?4.7:3.5);G.add(m)});
    this.keep=this.mesh("keep");this.keep.scale.setScalar(2.4);G.add(this.keep);this.keepR=this.mesh("keepr");this.keepR.scale.setScalar(2.4);this.keepR.visible=false;G.add(this.keepR);
    const gw=g.w[cs.gate],path=new T.Mesh(new T.PlaneGeometry(5,70),new T.MeshLambertMaterial({map:this._yardTex,color:0xddccaa}));path.rotation.x=-Math.PI/2;path.rotation.z=-Math.atan2(gw.nx,gw.nz);path.position.set(gw.mx+gw.nx*36,.04,gw.mz+gw.nz*36);path.receiveShadow=true;G.add(path)}
  setSim(S,side){this.S=S;this.side=side;for(const m of this.siege.values())this.unitG.remove(m);this.siege.clear();for(const u of S?S.units:[]){u.rx=u.x;u.rz=u.z;u.ry=u.y;u.rf=u.face}
    if(this.tents)this.world.remove(this.tents);if(S){this.tents=new T.Group();for(let i=0;i<5;i++){const a=S.campA+(i-2)*.16,r=68+(i%2)*6,t=this.mesh("tent");t.position.set(r*Math.cos(a),0,r*Math.sin(a));t.rotation.y=-a;t.scale.setScalar(9);this.tents.add(t)}this.tents.visible=side==="A";this.world.add(this.tents)}}
  _siegeMesh(u){const g=new T.Group();
    if(u.t==="cat"){const b=this.mesh("cat");b.position.y=-1.4*4.2;b.scale.setScalar(4.2);g.add(b);const piv=new T.Group();piv.position.set(0,(1.76-1.4)*4.2,0);const a=this.mesh("catarm");a.scale.setScalar(4.2);a.position.set(0,-1.76*4.2,0);piv.add(a);g.add(piv);g.userData.arm=piv}
    else{const wood=new T.MeshLambertMaterial({color:0x7a5230}),dark=new T.MeshLambertMaterial({color:0x3f2a18}),iron=new T.MeshLambertMaterial({color:0x555a60});const add=(geo2,mat,x,y,z,rx,rz)=>{const m=new T.Mesh(geo2,mat);m.position.set(x,y,z);if(rx)m.rotation.x=rx;if(rz)m.rotation.z=rz;m.castShadow=true;g.add(m);return m};
      add(new T.CylinderGeometry(.42,.42,6.4,10),wood,0,1.5,.3,Math.PI/2);add(new T.CylinderGeometry(.5,.38,.9,10),iron,0,1.5,3.7,Math.PI/2);add(new T.BoxGeometry(2.6,.3,5),dark,0,.75,0);
      add(new T.BoxGeometry(1.9,.16,5.2),wood,-.75,2.75,0,0,.75);add(new T.BoxGeometry(1.9,.16,5.2),wood,.75,2.75,0,0,-.75);
      for(const[x,z]of[[-1.4,1.7],[1.4,1.7],[-1.4,-1.7],[1.4,-1.7]]){add(new T.CylinderGeometry(.62,.62,.28,12),dark,x,.62,z,0,Math.PI/2);add(new T.BoxGeometry(.16,2.2,.16),dark,x*.86,1.7,z)}}
    this.unitG.add(g);this.siege.set(u.id,g);return g}

  resize(){const w=this.cv.clientWidth||innerWidth,h=this.cv.clientHeight||innerHeight;this.rd.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix()}
  _controls(){const cv=this.cv,cam=this.cam,pts=new Map();let pd=0,moved=0,down=null;
    cv.addEventListener("pointerdown",e=>{pts.set(e.pointerId,{x:e.clientX,y:e.clientY});try{cv.setPointerCapture(e.pointerId)}catch(_){}moved=0;down={x:e.clientX,y:e.clientY,t:performance.now()}});
    cv.addEventListener("pointermove",e=>{const p=pts.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;moved+=Math.abs(dx)+Math.abs(dy);
      if(pts.size===1&&moved>8){cam.auto=false;cam.tth=null;cam.th-=dx*.006;cam.ph=Math.max(.2,Math.min(1.42,cam.ph-dy*.005))}p.x=e.clientX;p.y=e.clientY;
      if(pts.size===2){const [a,b]=[...pts.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pd)cam.d=Math.max(30,Math.min(200,cam.d*pd/d));pd=d;moved=99}});
    const up=e=>{const had=pts.delete(e.pointerId);pd=0;if(had&&e.type==="pointerup"&&moved<=8&&down&&performance.now()-down.t<600&&this.onTap)this.onTap(e.clientX,e.clientY)};
    cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",up);
    cv.addEventListener("wheel",e=>{e.preventDefault();cam.d=Math.max(30,Math.min(200,cam.d*(1+Math.sign(e.deltaY)*.08)))},{passive:false})}
  focusWall(i){const w=this.g&&this.g.w[i];if(!w)return;this.cam.tth=Math.atan2(w.nx,w.nz);this.cam.auto=false}
  focusAngle(a){this.cam.tth=a;this.cam.auto=false}
  // Ekran nuqtasidan: devor yoki yer nuqtasi
  pick(cx,cy){const r=this.cv.getBoundingClientRect(),nd=new T.Vector2((cx-r.left)/r.width*2-1,-((cy-r.top)/r.height)*2+1),rc=new T.Raycaster();rc.setFromCamera(nd,this.camera);const o=rc.ray.origin,d=rc.ray.direction;
    let best=null;const g=this.g;if(g)for(let i=0;i<g.n;i++){const w=g.w[i],den=d.x*w.nx+d.z*w.nz;if(Math.abs(den)<1e-4)continue;const t=((w.mx-o.x)*w.nx+(w.mz-o.z)*w.nz)/den;if(t<=0)continue;
      const px=o.x+d.x*t,py=o.y+d.y*t,pz=o.z+d.z*t,lat=(px-w.mx)*w.ex+(pz-w.mz)*w.ez;if(py>=-.5&&py<=H+2.5&&Math.abs(lat)<=g.L/2&&(!best||t<best.t))best={t,wall:i}}
    if(d.y<-1e-4){const t=-o.y/d.y,x=o.x+d.x*t,z=o.z+d.z*t;if(!best||t<best.t-.01){if(g)for(let i=0;i<g.n;i++){const w=g.w[i],dist=(x-w.mx)*w.nx+(z-w.mz)*w.nz,lat=(x-w.mx)*w.ex+(z-w.mz)*w.ez;if(Math.abs(dist)<3.2&&Math.abs(lat)<=g.L/2)return{wall:i,x,z}}return{x,z}}}
    return best?{wall:best.wall}:null}
  project(x,y,z){const v=new T.Vector3(x,y,z).project(this.camera),r=this.cv.getBoundingClientRect();return{x:(v.x+1)/2*r.width+r.left,y:(1-v.y)/2*r.height+r.top,ok:v.z<1}}

  frame(dt,sel,simDt){const cam=this.cam;if(cam.auto)cam.th+=dt*.06;else if(cam.tth!=null){let d=cam.tth-cam.th;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;cam.th+=d*Math.min(1,dt*4);if(Math.abs(d)<.01)cam.tth=null}
    const sp=Math.sin(cam.ph);this.camera.position.set(cam.d*sp*Math.sin(cam.th),cam.d*Math.cos(cam.ph)+3,cam.d*sp*Math.cos(cam.th));this.camera.lookAt(0,3,0);
    const S=this.S;if(S&&this.layers)this._sync(S,dt,sel||new Set(),simDt||0);this.rd.render(this.scene,this.camera)}
  _sync(S,dt,sel,simDt){const L=this.layers,d=this._d||(this._d=new T.Object3D()),k=Math.min(1,dt*12),reveal=S.over;
    for(const t in L)for(const s in L[t])for(const im of L[t][s])im._n=0;let rn=0;
    for(const u of S.units){const mine=u.side===this.side,vis=mine||reveal||(S.phase==="fight"&&u.seen);
      if(u.rx==null){u.rx=u.x;u.rz=u.z;u.ry=u.y;u.rf=u.face}
      if(Math.abs(u.x-u.rx)+Math.abs(u.z-u.rz)>12){u.rx=u.x;u.rz=u.z;u.ry=u.y}
      u.rx+=(u.x-u.rx)*k;u.rz+=(u.z-u.rz)*k;u.ry+=(u.y-u.ry)*k;let df=u.face-u.rf;while(df>Math.PI)df-=2*Math.PI;while(df<-Math.PI)df+=2*Math.PI;u.rf+=df*Math.min(1,dt*10);
      if(!U[u.t]){let m=this.siege.get(u.id);if(!m)m=this._siegeMesh(u);m.visible=vis&&!(u.dead&&S.t-u.deadAt>3);m.position.set(u.rx,0,u.rz);m.rotation.y=u.rf;if(u.dead)m.rotation.z=Math.min(.5,(S.t-u.deadAt)*.6);
        if(m.userData.arm){const e=S.t-(u.fire||-9);m.userData.arm.rotation.x=e<.25?-e*5:e<1.2?-1.25*(1-(e-.25)/.95):0}else if(u.anim==="atk")m.position.z+=0;
        if(vis&&!u.dead&&sel.has(u.sq.id)&&rn<260){d.position.set(u.rx,.25,u.rz);d.rotation.set(0,0,0);d.scale.setScalar(3);d.updateMatrix();this.rings.setMatrixAt(rn++,d.matrix)}continue}
      if(!vis||(u.dead&&S.t-u.deadAt>9))continue;
      let f;if(u.dead)f=FR.dead;else if(u.anim==="atk")f=FR.atk+Math.max(0,Math.min(5,Math.floor((1-u.atkT/.55)*6)));else if(u.anim==="walk"){u.ph+=simDt*(u.t==="c"?2.4:1.9);f=FR.walk+Math.floor(u.ph*8)%8}else f=FR.idle;
      const im=L[u.t][u.side][f];if(im._n>=124)continue;d.position.set(u.rx,u.ry+(u.loc==="in"||u.loc==="out"?.05:0),u.rz);d.rotation.set(0,u.rf,0);d.scale.setScalar(1.3);d.updateMatrix();im.setMatrixAt(im._n++,d.matrix);
      if(!u.dead&&mine&&sel.has(u.sq.id)&&rn<260){d.position.y=u.ry+.22;d.rotation.set(0,0,0);d.scale.setScalar(u.t==="c"?1.8:1.25);d.updateMatrix();this.rings.setMatrixAt(rn++,d.matrix)}}
    for(const t in L)for(const s in L[t])for(const im of L[t][s]){if(im._n||im.count){im.count=im._n;im.instanceMatrix.needsUpdate=true}}
    this.rings.count=rn;this.rings.instanceMatrix.needsUpdate=true;this.rings.material.opacity=.7+.3*Math.sin(performance.now()/180);
    // devorlar holati
    const g=S.g,cs=S.castle;for(let i=0;i<S.n;i++){const br=S.wallHp[i]<=0;for(const m of this.wallP[i]){if(br&&!m.userData.br){m.userData.br=1;m.scale.y=.9;m.rotation.z=(Math.random()-.5)*.12}}
      const lg=this.ladG[i],n=br?0:S.ladders[i];if(lg.userData.n!==n){while(lg.children.length)lg.remove(lg.children[0]);for(let j=0;j<n;j++){const lat=((j+.5)/n-.5)*g.L*.6,p=P(g,i,lat,cs.walls[i].type===2?4.2:3.2),l=this.mesh("ladder");l.position.set(p.x,0,p.z);l.rotation.y=lg.userData.rot+Math.PI;l.rotateX(-.28);l.scale.set(5,6.4,5);lg.add(l)}lg.userData.n=n}
      if(S.oilShown&&S.oilShown[i])this.oilM[i].visible=true}
    if(this.gateD)this.gateD.visible=S.gateHp>0&&!(S.t-S.sortie<1.2&&S.phase==="fight");
    const capd=S.win==="A"||S.cap>CAPT*.6;this.keep.visible=!capd;this.keepR.visible=capd;
    // o'q va toshlar
    for(const s of S.shots){if(s.k==="ar"){const vis=s.a.side===this.side||s.a.seen||s.b.side===this.side||reveal;if(vis)this.arrowList.push({ax:s.a.x,ay:s.a.y+1.5,az:s.a.z,bx:s.b.x,by:(s.b.y||0)+1.1,bz:s.b.z,t:0})}
      else{const b=new T.Mesh(new T.SphereGeometry(.75,8,6),new T.MeshLambertMaterial({color:0x55524c}));b.castShadow=true;this.fxG.add(b);this.fx.push({o:b,life:1,a:{x:s.a.x,z:s.a.z},b:s.b})}}
    S.shots.length=0;let an=0;for(let i=this.arrowList.length-1;i>=0;i--){const a=this.arrowList[i];a.t+=simDt/.32;if(a.t>=1){this.arrowList.splice(i,1);continue}if(an>=80)continue;
      const x=a.ax+(a.bx-a.ax)*a.t,z=a.az+(a.bz-a.az)*a.t,y=a.ay+(a.by-a.ay)*a.t+Math.sin(a.t*Math.PI)*1.6;d.position.set(x,y,z);d.scale.setScalar(1);d.lookAt(a.bx,a.by+(1-2*a.t)*1.6,a.bz);d.updateMatrix();this.arrows.setMatrixAt(an++,d.matrix)}
    this.arrows.count=an;this.arrows.instanceMatrix.needsUpdate=true;
    for(let i=this.fx.length-1;i>=0;i--){const f=this.fx[i];f.life-=simDt;const p=1-Math.max(0,f.life);f.o.position.set(f.a.x+(f.b.x-f.a.x)*p,3+Math.sin(p*Math.PI)*15+(f.b.y-3)*p,f.a.z+(f.b.z-f.a.z)*p);if(f.life<=0){this.fxG.remove(f.o);this.fx.splice(i,1)}}
    // buyruq belgilari
    let mi=0;for(const q of S.squads){if(!sel.has(q.id)||mi>=this.marks.length)continue;const o=q.order;let x,z,y=3;if(o.k==="wall"){x=g.w[o.i].mx;z=g.w[o.i].mz;y=H+4}else if(o.k==="yard"){x=0;z=0;y=13}else{x=o.x;z=o.z}
      const m=this.marks[mi++];m.visible=true;m.position.set(x,y+Math.sin(performance.now()/250)*.4,z)}
    for(;mi<this.marks.length;mi++)this.marks[mi].visible=false}
}
