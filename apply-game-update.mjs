import { readFile, writeFile } from 'node:fs/promises';

const marker = 'duo-enhancements-v1';
function swap(source, before, after, label) {
  const at = source.indexOf(before);
  if (at < 0 || source.indexOf(before, at + before.length) >= 0) throw new Error(`Update anchor missing or repeated: ${label}`);
  return source.slice(0, at) + after + source.slice(at + before.length);
}

let server = await readFile(new URL('./server.mjs', import.meta.url), 'utf8');
let client = await readFile(new URL('./index.html', import.meta.url), 'utf8');
if (!server.includes(marker)) {
  server = swap(server, 'const clients=new Map(),players=new Map();let mode=', 'const clients=new Map(),players=new Map();\n// duo-enhancements-v1\nlet pigeons=[],train=null,pigeonSpawnAt=4;let mode=', 'server globals');
  server = swap(server, 'function clearRound(){enemies=[];bullets=[];pickups=[];hazards=[];movers=[];fx=[];bossMade=false;mission=null}', 'function clearRound(){enemies=[];bullets=[];pickups=[];hazards=[];movers=[];fx=[];pigeons=[];train=null;pigeonSpawnAt=4;bossMade=false;mission=null}', 'reset');
  server = swap(server, 'function beginThreat(m){', `function updatePigeons(dt){
 if(!mission?.threat)return;
 pigeonSpawnAt-=dt;
 if(pigeonSpawnAt<=0){
  pigeonSpawnAt=7+rnd(0,4);
  if(pigeons.length<4){
   const candidates=live();
   for(let i=0;i<40&&candidates.length;i++){
    const target=candidates[Math.floor(Math.random()*candidates.length)],a=rnd(0,Math.PI*2),r=rnd(4,11);
    const x=target.x+Math.cos(a)*r,z=target.z+Math.sin(a)*r;
    if(collision(x,z,1.1)||candidates.some(p=>Math.hypot(p.x-x,p.z-z)<3.5)||pigeons.some(q=>Math.hypot(q.x-x,q.z-z)<3))continue;
    pigeons.push({id:++sequence,x,z,age:0,style:Math.floor(Math.random()*6)});
    break;
   }
  }
 }
 for(let i=pigeons.length-1;i>=0;i--){
  const bird=pigeons[i];bird.age+=dt;
  if(bird.age<5&&!live().some(p=>dist(p,bird)<1.6))continue;
  pigeons.splice(i,1);burst(bird.x,bird.z,'pigeon',1.15);
  for(const p of live())if(dist(p,bird)<3)hurt(p,32,0,true);
  note('Взрыв голубя! Отойдите от танцующих птиц.',1.4);
 }
}
function updateTrain(dt){
 if(!train)return;
 train.age+=dt;train.x=-34+17*train.age;
 if(train.age>4.3)train=null;
}
function beginThreat(m){`, 'pigeon and train logic');
  server = swap(server, "if(mode==='zombie'){const m=mission;updateWorld(dt);if(phase!=='playing')return;", "if(mode==='zombie'){const m=mission;updateWorld(dt);if(phase!=='playing')return;updatePigeons(dt);if(phase!=='playing')return;", 'pigeon tick');
  server = swap(server, "burst(0,0,'trainhit',1.5);note('Поезд прибыл · быстрые зомби прорвались!',3)", "train={x:-34,z:14,age:0};burst(-25,14,'trainhit',1.5);note('Поезд прибыл · быстрые зомби прорвались!',3)", 'train event');
  server = swap(server, 'if(m.trap){m.trap.cooldown=Math.max(0,m.trap.cooldown-dt);', 'updateTrain(dt);if(m.trap){m.trap.cooldown=Math.max(0,m.trap.cooldown-dt);', 'train tick');
  server = swap(server, 'movers:movers.map(q=>({id:q.id,x:q.x,z:q.z,w:q.w,d:q.d,lethal:q.lethal,warning:q.warning})),fx:', 'movers:movers.map(q=>({id:q.id,x:q.x,z:q.z,w:q.w,d:q.d,lethal:q.lethal,warning:q.warning})),pigeons:pigeons.map(q=>({id:q.id,x:q.x,z:q.z,age:q.age,style:q.style})),train,fx:', 'network state');
}
if (!client.includes(marker)) {
  client = swap(client, '</style></head>', '/* duo-enhancements-v1 */@media(pointer:coarse){#me,#missionHud{font-size:9px;padding:4px 6px;max-width:46vw}#tip{font-size:10px;padding:5px 7px;bottom:calc(112px + env(safe-area-inset-bottom))}#notice{font-size:12px;top:68px}}</style></head>', 'mobile HUD');
  client = swap(client, 'let marks=new THREE.Group();scene.add(marks);', `let marks=new THREE.Group();scene.add(marks);
const trainVisual=new THREE.Group(),trainPaint=mat(0x4788b2),trainDark=mat(0x23394e),trainGlass=mat(0x85e9ff,true);
for(const offset of [-6,0,6]){box(trainVisual,offset,1.15,0,5.5,1.7,2.25,trainPaint);box(trainVisual,offset,2.1,0,5.65,.25,2.4,trainDark);for(const side of [-1,1]){box(trainVisual,offset,1.45,side*1.15,3.8,.65,.06,trainGlass);for(const wheel of [-1.75,1.75])box(trainVisual,offset+wheel,.25,side*.9,.7,.5,.45,trainDark)}}
trainVisual.visible=false;scene.add(trainVisual);`, 'train mesh');
  client = swap(client, 'processFx(state.fx||[]);clearMarks();', 'processFx(state.fx||[]);trainVisual.visible=!!state.train;if(state.train)trainVisual.position.set(state.train.x,0,state.train.z);clearMarks();', 'train state');
  const from=client.indexOf('const danceBirds=[];let nextDance=');
  const to=client.indexOf('\nconst FX_KINDS=',from);
  if(from<0||to<0)throw new Error('Dancer block not found');
  client=client.slice(0,from)+`const danceBirds=new Map();
function removeDancer(p){scene.remove(p.root);const geo=new Set(),materials=new Set();p.root.traverse(o=>{if(o.isMesh){if(o.geometry)geo.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m)}});for(const x of geo)x.dispose();for(const x of materials)x.dispose()}
function clearDancers(){for(const p of danceBirds.values())removeDancer(p);danceBirds.clear()}
function updateDancers(now){
 const active=state?.mode==='zombie'&&state.phase==='playing'?state.pigeons||[]:[];
 const ids=new Set(active.map(q=>q.id));
 for(const [id,p] of danceBirds)if(!ids.has(id)){removeDancer(p);danceBirds.delete(id)}
 for(const q of active){
  let p=danceBirds.get(q.id);
  if(!p){p=createPigeon(PALETTES[q.style%PALETTES.length]);p.root.position.set(q.x,.03,q.z);p.baseRotY=Math.random()*Math.PI*2;p.size=.75+Math.random()*.2;p.beat=2*Math.PI*(128/60)*(q.age+q.age*q.age/5);p.lastDanceNow=now;scene.add(p.root);danceBirds.set(q.id,p)}
  const dt=Math.min(.1,Math.max(0,(now-p.lastDanceNow)/1000));p.lastDanceNow=now;
  p.beat+=dt*2*Math.PI*(128/60)*(1+2*Math.min(1,q.age/5));
  animatePigeon(p,now/1000,p.beat);p.root.scale.setScalar(p.size*Math.min(1,Math.max(0,(5-q.age)/.3)));
 }
}
`+client.slice(to);
  client = swap(client, 'p.baseRotY + s3 * 1.25 + t * p.spin', 'p.baseRotY + s3 * 1.25 + b * p.spin * 0.35', 'dance spin');
  client = swap(client, 'const FX_KINDS={\n explosion:', 'const FX_KINDS={\n pigeon:{color:0xffb65c,count:32,speed:7,life:.8,gravity:9,size:.3,light:true,lightIntensity:9,lightLife:.35},\n explosion:', 'pigeon burst');
  client = swap(client, 'following?20:46,camFocus.z+(following?13:30)', 'following?16:46,camFocus.z+(following?10:30)', 'mobile camera');
}
await writeFile(new URL('./server.mjs',import.meta.url),server);
await writeFile(new URL('./index.html',import.meta.url),client);
