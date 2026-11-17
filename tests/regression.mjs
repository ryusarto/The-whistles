// Integration regressions for the real game module, using a deterministic media clock.
// Run: node tests/regression.mjs (Node 20+). No dependencies or network needed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const html=fs.readFileSync(new URL('index.html',root),'utf8');
const gameUrl=new URL('assets/js/game.js',root).href;
const songFiles=fs.readdirSync(new URL('assets/songs/',root)).filter(f=>f.endsWith('.json'));
const songs=Object.fromEntries(songFiles.map(f=>[f.replace(/\.json$/,''),JSON.parse(fs.readFileSync(new URL('assets/songs/'+f,root),'utf8'))]));
let boots=0;
function setGlobal(name,value){Object.defineProperty(globalThis,name,{value,configurable:true,writable:true})}
async function boot(stored={}){
 const elements=[],byId=new Map(),events={},storage=new Map(Object.entries(stored)),pads=[];
 const drawing=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>{}});
 const event=(target,data={})=>({target,preventDefault(){this.defaultPrevented=true},...data});
 class Element{
  constructor(tag='div',attrs=''){this.tagName=tag.toUpperCase();this.style={};this.dataset={};this.attributes={};this.children=[];this.listeners={};this.captured=new Set();this.value='';this.textContent='';this.currentTime=0;this.duration=184.666;this.paused=true;this.readyState=1;this.src='';
   for(const m of attrs.matchAll(/([\w-]+)(?:="([^"]*)")?/g)){this.attributes[m[1]]=m[2]??'';if(m[1]==='id')this.id=m[2];if(m[1]==='value')this.value=m[2];if(m[1].startsWith('data-'))this.dataset[m[1].slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=m[2]??'';}
   const classes=new Set((this.attributes.class||'').split(' '));this.classList={add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle:(c,on)=>{if(on??!classes.has(c))classes.add(c);else classes.delete(c)}};
  }
  matches(sel){return sel.split(',').some(s=>{s=s.trim();if(s.startsWith('#'))return this.id===s.slice(1);if(s.startsWith('.'))return this.classList.contains(s.slice(1));if(s.startsWith('[')){const m=s.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);return m&&m[1] in this.attributes&&(m[2]===undefined||this.attributes[m[1]]===m[2]);}return this.tagName===s.toUpperCase()});}
  querySelector(){return null} querySelectorAll(){return []} focus(){} setAttribute(k,v){this.attributes[k]=v} appendChild(el){this.children.push(el)}
  addEventListener(k,fn,opt){(this.listeners[k]??=[]).push({fn,once:opt?.once})}
  emit(k,data={}){const e=event(this,data),list=this.listeners[k]||[];this.listeners[k]=list.filter(l=>!l.once);for(const {fn} of list)fn(e);return e}
  click(){return this.onclick?.(event(this))} getContext(){return drawing} getBoundingClientRect(){return {left:0,top:0,width:1280,height:720}} setPointerCapture(id){this.captured.add(id)}
  pause(){this.paused=true} load(){this.readyState=1} play(){this.paused=false;return Promise.resolve()}
 }
 for(const m of html.matchAll(/<(\w+)\b([^>]*)>/g)){const el=new Element(m[1],m[2]);elements.push(el);if(el.id)byId.set(el.id,el)}
 for(const m of html.matchAll(/<script id="([^"]+)"[^>]*>([\s\S]*?)<\/script>/g))byId.get(m[1]).textContent=m[2];
 const listen=(k,fn)=>(events[k]??=[]).push(fn);
 const document={baseURI:'https://example.test/The-whistles/',hidden:false,getElementById:id=>byId.get(id),querySelectorAll:sel=>elements.filter(el=>el.matches(sel)),querySelector:sel=>elements.find(el=>el.matches(sel)),createElement:tag=>new Element(tag),addEventListener:listen};
 const window={addEventListener:(k,fn)=>listen('window:'+k,fn)};
 const base=document.baseURI;
 const fetchFile=async url=>{const rel=new URL(url).href.slice(base.length);const body=fs.readFileSync(new URL(rel,root),'utf8');return {ok:true,status:200,json:async()=>JSON.parse(body)}};
 const env={document,window,Image:Element,performance:{now:()=>1000},requestAnimationFrame(){},setTimeout(){},matchMedia:()=>({matches:false}),navigator:{getGamepads:()=>pads},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},indexedDB:{open(){throw Error('Disabled in test')}},fetch:fetchFile};
 for(const [name,value] of Object.entries(env))setGlobal(name,value);
 // A distinct URL gives every boot a fresh module instance; the pure modules it imports are shared.
 const game=await import(gameUrl+'?boot='+(++boots));
 window.test=game.__testApi();
 return {api:window.test,window,document,storage,pads,song:byId.get('song'),el:id=>byId.get(id),emit:(k,data={})=>{const e=event(byId.get('stage'),data);for(const fn of events[k]||[])fn(e);return e},touch:lane=>elements.find(el=>el.dataset.touchLane===String(lane))};
}
function chart(t,rows,player){const notes=t.api.compileNotes(rows);if(player){player.notes=notes;player.nextMiss=0;player.maxHits=notes.length;t.api.configure({maxHits:t.api.state().duoPlayers.reduce((sum,p)=>sum+p.maxHits,0)});}else t.api.configure({notes});return notes}
function emptyDuo(t){for(const p of t.api.state().duoPlayers)chart(t,[],p)}
function pad(index){return {index,id:'DualSense test '+index,mapping:'standard',connected:true,buttons:Array.from({length:18},()=>({pressed:false,value:0}))}}
function key(t,type,code,repeat=false){return t.emit(type,{code,repeat})}
const passed=[];
async function check(name,fn){await fn();passed.push(name)}
await check('All 30 instrument/difficulty charts load from format 2 files and compile valid notes and chord groups',async()=>{
 const {api,window}=await boot(),catalog=window.whistlesDebug.getCatalog();assert.equal(catalog.length,5);let charts=0,chords=0,holds=0;
 assert.deepEqual(Object.keys(songs).sort(),['minha-fonte','nexus','ruthless','sem-tu','summertime']);
 assert.ok(!/chart-data|rms-data/.test(html),'charts no longer live inside index.html');
 for(const song of Object.values(songs)){
  assert.equal(song.format,2);assert.ok(Array.isArray(song.envelope)&&song.envelope.length>0);assert.ok(Number.isFinite(song.beatAnchor));
  assert.deepEqual(Object.keys(song.charts).sort(),['franco','ryuchi']);
  for(const [artist,difficulties] of Object.entries(song.charts)){assert.deepEqual(Object.keys(difficulties).sort(),['easy','hard','medium']);for(const [difficulty,rows] of Object.entries(difficulties)){
   charts++;const notes=api.compileNotes(rows);assert.ok(notes.length>0);assert.equal(notes.length,rows.reduce((n,r)=>n+r.frets.length,0));
   const groups=new Map();for(let i=0;i<notes.length;i++){const n=notes[i];assert.ok(Number.isFinite(n.t)&&n.t>=0);assert.ok(Number.isInteger(n.lane)&&n.lane>=0&&n.lane<song.lanes[difficulty]);assert.ok(Number.isFinite(n.hold)&&n.hold>=0);assert.equal(n.hit,false);assert.equal(n.miss,false);if(i)assert.ok(notes[i-1].t<=n.t);const members=groups.get(n.group)||[];members.push(n);groups.set(n.group,members);if(n.hold)holds++;}
   assert.equal(groups.size,rows.length);for(const [group,members] of groups){assert.equal(group.size,members.length);assert.equal(group.hits,0);assert.equal(group.missed,false);assert.equal(group.multiplier,0);if(group.size===2){chords++;assert.equal(members[0].t,members[1].t);assert.equal(Math.abs(members[0].lane-members[1].lane),2);}}
   assert.ok(catalog.some(track=>track.id===song.id&&track.counts[artist][difficulty]===rows.length));
  }}
 }
 assert.equal(charts,30);assert.ok(chords>0);assert.ok(holds>0);
});
await check('Format 1 rows (V15 charts and imported tracks) compile exactly like format 2',async()=>{
 const {api}=await boot();const v1=[[1,0,1,0],[2,3,2,1.5],[3,1,0,0]],v2=[{t:1,frets:[0,2]},{t:2,frets:[3],len:1.5},{t:3,frets:[1]}];
 const strip=list=>list.map(({t,lane,hold})=>({t,lane,hold}));assert.deepEqual(strip(api.compileNotes(v1)),strip(api.compileNotes(v2)));
});
await check('Public game diagnostics expose read-only snapshots',async()=>{
 const t=await boot(),debug=t.window.whistlesDebug;assert.deepEqual(Object.keys(debug).sort(),['getCatalog','getDuoState','getState']);const copy=debug.getCatalog();copy[0].id='changed';copy[0].counts.franco.medium=0;assert.equal(debug.getCatalog()[0].id,'nexus');assert.ok(debug.getCatalog()[0].counts.franco.medium>0);
});
await check('All five local audio tracks start at zero and full speed; restart resets the show',async()=>{
 const t=await boot();for(const id of ['nexus','summertime','ruthless','sem-tu','minha-fonte']){
  assert.ok(fs.statSync(new URL('assets/audio/'+id+'.mp3',root)).size>0);t.api.configure({track:id});t.song.currentTime=55;t.song.playbackRate=.5;await t.api.startGame(40,true,.5);assert.equal(t.api.state().screen,'playing');assert.ok(t.song.src.endsWith(id+'.mp3'));assert.equal(t.song.currentTime,0);assert.equal(t.song.playbackRate,1);assert.equal(t.song.preservesPitch,true);assert.equal(t.api.state().score,0);assert.equal(t.api.state().nextMiss,0);
 }t.song.currentTime=75;await t.api.restartSession();assert.equal(t.song.currentTime,0);assert.equal(t.song.playbackRate,1);
});
await check('Solo chords advance combo once and score every gem using the preceding multiplier',async()=>{
 const t=await boot();await t.api.startGame();const n=chart(t,[[1,0,1,0],[2,1,0,0]]);t.api.configure({combo:9});t.song.currentTime=1;t.api.registerHit(n[0],0);assert.equal(t.api.state().score,50);assert.equal(t.api.state().combo,9);t.api.registerHit(n[1],.14);assert.equal(t.api.state().score,100);assert.equal(t.api.state().combo,10);assert.equal(n[0].group,n[1].group);assert.equal(n[0].group.multiplier,1);t.song.currentTime=2;t.api.registerHit(n[2],0);assert.equal(t.api.state().score,200);assert.equal(t.api.state().combo,11);assert.equal(t.api.state().perfect,2);assert.equal(t.api.state().good,1);
});
await check('Duo scoring matches Solo while each instrument keeps independent judgments',async()=>{
 const t=await boot();t.api.setGameMode('duo');await t.api.startGame();const [p,q]=t.api.state().duoPlayers;for(const player of [p,q]){chart(t,[[1,0,1,0],[2,1,0,0]],player);player.combo=9;}t.song.currentTime=1;t.api.duoRegisterHit(p,p.notes[0],0);assert.equal(p.combo,9);assert.equal(q.perfect,0);assert.equal(q.score,0);t.api.duoRegisterHit(p,p.notes[1],.14);assert.equal(p.combo,10);assert.equal(p.score,100);t.song.currentTime=2;t.api.duoRegisterHit(p,p.notes[2],0);assert.equal(p.score,200);assert.equal(p.combo,11);for(const n of q.notes)t.api.duoRegisterHit(q,n,0);assert.equal(q.score,200);assert.equal(q.combo,11);assert.equal(t.api.state().score,400);
});
await check('Chord groups lock their multiplier and an incomplete chord cannot advance the streak',async()=>{
 const t=await boot(),n=t.api.compileNotes([[1,0,1,0]]);let hit=t.api.beginHit(n[0],2);assert.equal(hit.complete,false);hit=t.api.beginHit(n[1],8);assert.equal(hit.multiplier,2);assert.equal(hit.complete,true);const missed=t.api.compileNotes([[1,0,1,0]]);assert.equal(t.api.missEvent(missed[0]),true);assert.equal(t.api.missEvent(missed[1]),false);assert.equal(t.api.beginHit(missed[1],4).complete,false);
});
await check('Missing both chord gems counts both misses but applies one crowd penalty in Solo and Duo',async()=>{
 for(const mode of ['solo','duo']){const t=await boot();t.api.setGameMode(mode);await t.api.startGame();t.api.configure({crowd:80,combo:7});const p=mode==='duo'?t.api.state().duoPlayers[0]:null;if(p)p.combo=7;const n=chart(t,[[1,0,1,0]],p),miss=note=>p?t.api.duoRegisterMiss(p,note):t.api.registerMiss(note);miss(n[0]);const after=t.api.state().crowd;assert.ok(after<80);miss(n[1]);assert.equal(t.api.state().crowd,after);assert.equal(p?p.misses:t.api.state().misses,2);assert.equal(p?p.combo:t.api.state().combo,0);miss(n[0]);assert.equal(p?p.misses:t.api.state().misses,2);}
});
async function sustain(mode,steps,releaseEarly=false){
 const t=await boot();t.api.configure({track:'minha-fonte'});t.api.setGameMode(mode);await t.api.startGame();let p=null;if(mode==='duo'){emptyDuo(t);p=t.api.state().duoPlayers[0];}chart(t,[[1,0,2,3]],p);t.song.currentTime=1;if(p)t.api.duoPress(p,0,'test');else t.api.soloPress(0,'test');
 const end=releaseEarly?2.5:4;for(let i=1;i<=steps;i++){t.song.currentTime=1+(end-1)*i/steps;t.api.updateMechanics(i%2?.001:.07);}const earned=p?p.score:t.api.state().score;if(releaseEarly){if(p)t.api.duoRelease(p,0,'test');else t.api.soloRelease(0,'test');t.song.currentTime=2.6;t.api.updateMechanics(.016);assert.equal(p?p.holds.length:t.api.state().activeHolds.length,0);t.song.currentTime=4;t.api.updateMechanics(.016);assert.equal(p?p.score:t.api.state().score,earned);}else assert.equal(p?p.holds.length:t.api.state().activeHolds.length,0);return earned;
}
await check('Sustains award 25 points per beat from audio time at every tested frame rate in both modes',async()=>{
 for(const mode of ['solo','duo'])for(const steps of [1,90,180,432])assert.equal(await sustain(mode,steps),150,mode+' with '+steps+' updates');
});
await check('Early sustain release keeps earned points and grants no unplayed tail bonus',async()=>{
 for(const mode of ['solo','duo'])assert.equal(await sustain(mode,150,true),100);
});
await check('Fractional sustain points carry between updates and an unchanged audio clock scores nothing',async()=>{
 const t=await boot();t.api.configure({track:'minha-fonte'});await t.api.startGame();t.song.currentTime=1;const h=t.api.makeHold({t:1,lane:0,hold:3}),holds=[h],pressed=new Set([0]);let points=0;const tick=time=>t.api.advanceHolds(holds,pressed,time,()=>1,n=>points+=n);tick(1.01);assert.equal(points,0);assert.ok(h.fraction>0);tick(1.04);assert.equal(points,1);tick(1.04);assert.equal(points,1);tick(1.75);assert.equal(points,25);assert.ok(Math.abs(h.fraction)<1e-6);
});
await check('Keyboard, gamepad and touch share one Solo press and release only their own source',async()=>{
 const t=await boot();await t.api.startGame();chart(t,[[1,0,0,0],[1.1,0,0,0]]);t.song.currentTime=1;key(t,'keydown','KeyD');const p=pad(0);t.pads.push(p);p.buttons[6].pressed=true;t.api.pollGamepads(1000);const b=t.touch(0);b.emit('pointerdown',{pointerId:10});key(t,'keydown','KeyD',true);assert.equal(t.api.state().perfect,1);assert.equal(t.api.state().falsePresses,0);assert.equal(t.api.state().soloSources[0].size,3);key(t,'keyup','KeyD');assert.equal(t.api.state().keys.has(0),true);p.buttons[6].pressed=false;t.api.pollGamepads(1016);assert.equal(t.api.state().keys.has(0),true);b.emit('pointercancel',{pointerId:10});assert.equal(t.api.state().keys.has(0),false);assert.equal(b.classList.contains('is-held'),false);t.song.currentTime=1.1;key(t,'keydown','KeyD');assert.equal(t.api.state().perfect,2);assert.equal(t.api.state().score,100);
});
await check('Four visible touch lanes support simultaneous pointers, cancellation and lost capture',async()=>{
 const t=await boot();await t.api.startGame();assert.ok(t.el('touchControls'));assert.equal(t.document.querySelectorAll('[data-touch-lane]').length,4);chart(t,[[1,0,1,0]]);t.song.currentTime=1;const a=t.touch(0),b=t.touch(2);const down=a.emit('pointerdown',{pointerId:21});assert.equal(down.defaultPrevented,true);assert.ok(a.captured.has(21));b.emit('pointerdown',{pointerId:21});assert.equal(t.api.state().perfect,1);b.emit('pointerdown',{pointerId:22});assert.equal(t.api.state().perfect,2);assert.equal(t.api.state().combo,1);a.emit('pointerdown',{pointerId:23});assert.equal(t.api.state().falsePresses,0);a.emit('pointercancel',{pointerId:21});assert.equal(a.classList.contains('is-held'),true);assert.equal(t.api.state().keys.has(0),true);a.emit('lostpointercapture',{pointerId:23});assert.equal(t.api.state().keys.has(0),false);assert.equal(a.classList.contains('is-held'),false);assert.equal(t.api.state().keys.has(2),true);b.emit('pointerup',{pointerId:22});assert.equal(t.api.state().keys.size,0);assert.equal(t.api.state().pointerTouches.size,0);
});
await check('Duo keyboard, two gamepads and captured touches retain independent player ownership',async()=>{
 const t=await boot();t.api.setGameMode('duo');await t.api.startGame();const [p,q]=t.api.state().duoPlayers;for(const player of [p,q])chart(t,[[1,0,0,0]],player);t.song.currentTime=1;key(t,'keydown','KeyD');key(t,'keydown','KeyQ');for(let i=0;i<2;i++){const padState=pad(i);padState.buttons[6].pressed=true;t.pads.push(padState);}t.api.pollGamepads(1000);t.touch(0).emit('pointerdown',{pointerId:31});const canvas=t.el('stage');canvas.emit('pointerdown',{pointerId:32,clientX:t.api.duoLaneX(0,585,1),clientY:585});assert.equal(p.sources[0].size,3);assert.equal(q.sources[0].size,3);assert.equal(p.perfect,1);assert.equal(q.perfect,1);assert.equal(p.falsePresses+q.falsePresses,0);key(t,'keyup','KeyD');key(t,'keyup','KeyQ');for(const padState of t.pads)padState.buttons[6].pressed=false;t.api.pollGamepads(1016);t.touch(0).emit('pointercancel',{pointerId:31});assert.equal(p.keys.size,0);assert.equal(q.keys.has(0),true);canvas.emit('lostpointercapture',{pointerId:32});assert.equal(q.keys.size,0);assert.equal(t.api.state().pointerTouches.size,0);
});
await check('Pause clears every input source and held style while preserving an active sustain in both modes',async()=>{
 for(const mode of ['solo','duo']){const t=await boot();t.api.setGameMode(mode);await t.api.startGame();let p=null;if(mode==='duo'){emptyDuo(t);p=t.api.state().duoPlayers[0];}chart(t,[[1,0,2,3]],p);t.song.currentTime=1;key(t,'keydown','KeyD');const padState=pad(0);padState.buttons[6].pressed=true;t.pads.push(padState);t.api.pollGamepads(1000);t.touch(0).emit('pointerdown',{pointerId:40});t.api.pauseGame();const s=t.api.state();assert.equal(s.screen,'pause');assert.equal(t.song.paused,true);assert.equal(s.keys.size+s.soloKeyboardHeld.size+s.soloPadHeld.size+s.pointerTouches.size,0);assert.ok(s.soloSources.every(s=>s.size===0));for(const player of s.duoPlayers){assert.equal(player.keys.size,0);assert.ok(player.sources.every(s=>s.size===0));}assert.equal(t.touch(0).classList.contains('is-held'),false);assert.equal(p?p.holds.length:s.activeHolds.length,1);await t.api.resumeGame();t.api.updateMechanics(.016);assert.equal(t.api.state().screen,'playing');assert.equal(p?p.holds.length:t.api.state().activeHolds.length,1);t.api.clearInputs();assert.equal(p?p.holds.length:t.api.state().activeHolds.length,0);}
});
await check('Blur, visibility change and orientation change pause active shows and clear touch input',async()=>{
 for(const signal of ['window:blur','visibilitychange','window:orientationchange']){const t=await boot();await t.api.startGame();chart(t,[[1,0,0,0]]);t.song.currentTime=1;t.touch(0).emit('pointerdown',{pointerId:50});if(signal==='visibilitychange')t.document.hidden=true;t.emit(signal);assert.equal(t.api.state().screen,'pause');assert.equal(t.api.state().keys.size,0);assert.equal(t.api.state().pointerTouches.size,0);assert.equal(t.touch(0).classList.contains('is-held'),false);}
});
await check('Normal shows can fail in Solo and Duo, clearing every active input and sustain',async()=>{
 for(const mode of ['solo','duo']){const t=await boot();t.api.setGameMode(mode);await t.api.startGame();let p=null;if(mode==='duo'){emptyDuo(t);p=t.api.state().duoPlayers[0];}chart(t,[[1,0,2,3]],p);t.song.currentTime=1;t.touch(0).emit('pointerdown',{pointerId:60});t.api.configure({crowd:0});t.api.failShow();assert.equal(t.api.state().screen,'failed');assert.equal(t.song.paused,true);assert.equal(t.api.state().pointerTouches.size,0);assert.equal(p?p.holds.length:t.api.state().activeHolds.length,0);assert.equal(t.storage.size,0);}
});
await check('Cancelling a pending audio load cannot re-enter gameplay',async()=>{
 const t=await boot();let resolve;t.song.play=()=>new Promise(r=>resolve=r);const pending=t.api.startGame();assert.equal(t.api.state().screen,'loading');t.api.enterSetlist();resolve();await pending;assert.equal(t.api.state().screen,'setlist');assert.equal(t.song.paused,true);
});
await check('Metadata starts audio at zero; stale callbacks cannot seek a cancelled show',async()=>{
 const t=await boot();t.song.readyState=0;t.song.load=()=>{};t.song.currentTime=54.8;await t.api.startGame(54.8,true);t.song.emit('loadedmetadata');assert.equal(t.song.currentTime,0);await t.api.startGame();t.api.enterSetlist();t.song.currentTime=12;t.song.emit('loadedmetadata');assert.equal(t.song.currentTime,12);assert.equal(t.api.state().screen,'setlist');
});
await check('Rejected playback shows an error and Resume recovers into gameplay',async()=>{
 const t=await boot();t.song.play=()=>Promise.reject(Error('network unavailable'));await t.api.startGame();assert.equal(t.api.state().screen,'pause');assert.equal(t.el('audioError').style.display,'block');assert.equal(t.song.paused,true);t.song.play=()=>{t.song.paused=false;return Promise.resolve()};await t.api.resumeGame();assert.equal(t.api.state().screen,'playing');assert.equal(t.el('audioError').style.display,'none');
});
await check('Solo records use V15 keys, ignore old records and preserve personal bests across clears',async()=>{
 const oldKey='the-whistles-v14:record:nexus:franco:normal',old=JSON.stringify({bestScore:999999,bestAccuracy:100}),t=await boot({[oldKey]:old});await t.api.startGame();const n=chart(t,[[1,0,1,0],[2,1,0,0]]);for(const note of n){t.song.currentTime=note.t;t.api.registerHit(note,0);}t.api.finishGame();const recordKey='the-whistles-v15:record:nexus:franco:normal';let r=JSON.parse(t.storage.get(recordKey));assert.equal(r.bestScore,150);assert.equal(r.bestAccuracy,100);assert.equal(r.bestCombo,2);assert.equal(r.stars,5);assert.equal(r.plays,1);assert.equal(r.clears,1);assert.match(t.el('recordLine').textContent,/NOVO RECORDE/);await t.api.startGame();chart(t,[[1,0,0,0]]);t.api.finishGame();r=JSON.parse(t.storage.get(recordKey));assert.equal(r.bestScore,150);assert.equal(r.bestAccuracy,100);assert.equal(r.plays,2);assert.equal(r.clears,2);assert.doesNotMatch(t.el('recordLine').textContent,/NOVO RECORDE/);assert.equal(t.storage.get(oldKey),old);t.api.configure({artist:'ryuchi',difficulty:'hard',track:'summertime'});await t.api.startGame();t.api.finishGame();assert.ok(t.storage.has('the-whistles-v15:record:summertime:ryuchi:expert'));assert.equal(t.storage.size,3);
});
await check('Duo records use separate V15 keys and save the combined score with per-player accuracy',async()=>{
 const oldKey='the-whistles-v14:duo:nexus:normal',old=JSON.stringify({bestScore:999999}),t=await boot({[oldKey]:old});t.api.setGameMode('duo');await t.api.startGame();const [p,q]=t.api.state().duoPlayers;chart(t,[[1,0,1,0]],p);chart(t,[[1,1,0,0]],q);
 const expectedHits=p.maxHits+q.maxHits;assert.equal(expectedHits,3);for(const player of [p,q])for(const note of player.notes){t.song.currentTime=1;t.api.duoRegisterHit(player,note,0);}t.api.finishGame();const r=JSON.parse(t.storage.get('the-whistles-v15:duo:nexus:normal'));assert.equal(r.bestScore,150);assert.equal(r.bestAccuracy,100);assert.equal(r.stars,5);assert.equal(r.bestCombo,1);assert.equal(r.plays,1);assert.equal(r.clears,1);assert.match(t.el('duoResult0').innerHTML,/100%/);assert.match(t.el('duoResult1').innerHTML,/100%/);assert.match(t.el('recordLine').textContent,/NOVO RECORDE DA DUPLA/);assert.equal(t.storage.get(oldKey),old);assert.equal(t.storage.size,2);
});
await check('Rendering runs in Solo and Duo without exceptions',async()=>{
 const t=await boot();await t.api.startGame();t.api.frame(1000);t.api.setGameMode('duo');await t.api.startGame();t.api.frame(2000);
});
await check('Song clock extrapolates between coarse media reports, stays monotonic and follows seeks',async()=>{
 const {createMediaClock}=await import(new URL('assets/js/core/clock.js',root).href);
 let perf=0;const media={currentTime:10,paused:false,playbackRate:1};const clock=createMediaClock(media,()=>0,()=>perf);
 assert.equal(clock.now(),10);perf=40;assert.ok(Math.abs(clock.now()-10.04)<1e-9,'advances with performance.now between reports');
 perf=400;assert.ok(Math.abs(clock.now()-10.25)<1e-9,'extrapolation is capped when the media stops reporting');
 media.currentTime=10.42;perf=420;assert.equal(clock.now(),10.42,'a new report is trusted');
 media.currentTime=10.40;perf=421;assert.equal(clock.now(),10.42,'small backward corrections do not move time backwards');
 media.currentTime=3;perf=430;assert.equal(clock.now(),3,'real seeks are followed immediately');
 media.paused=true;perf=900;assert.equal(clock.now(),3,'paused media does not extrapolate');
 media.paused=false;perf=1000;assert.ok(Math.abs(clock.at(950)-2.95)<1e-9,'event timestamps map back to song time');
 assert.equal(clock.at(500),clock.now(),'stale timestamps fall back to the current time');assert.equal(clock.at(undefined),clock.now());
 const offset=createMediaClock({currentTime:5,paused:true,playbackRate:1},()=>0.03,()=>0);assert.ok(Math.abs(offset.now()-5.03)<1e-9,'calibration offset applies');
});
await check('Presses are judged at the input event time, not at the next frame',async()=>{
 for(const mode of ['solo','duo']){const t=await boot();t.api.setGameMode(mode);await t.api.startGame();let p=null;if(mode==='duo'){emptyDuo(t);p=t.api.state().duoPlayers[0];}
  chart(t,[[1,0,0,0]],p);t.song.currentTime=1.07;
  // performance.now() is 1000 in tests: a key event stamped at 930 ms happened 70 ms ago, at song time 1.00.
  key(t,'keydown','KeyD');const before=p?p.perfect:t.api.state().perfect;assert.equal(before,0,mode+': a press judged at frame time is not PERFECT');
  const u=await boot();u.api.setGameMode(mode);await u.api.startGame();let q=null;if(mode==='duo'){emptyDuo(u);q=u.api.state().duoPlayers[0];}
  chart(u,[[1,0,0,0]],q);u.song.currentTime=1.07;u.emit('keydown',{code:'KeyD',repeat:false,timeStamp:930});
  assert.equal(q?q.perfect:u.api.state().perfect,1,mode+': the event timestamp makes the same press PERFECT');
 }
});
await check('Hit windows accept earlier presses than late ones at every difficulty',async()=>{
 const {HIT_WINDOWS}=await import(new URL('assets/js/rules/scoring.js',root).href);
 for(const [diff,win] of Object.entries(HIT_WINDOWS)){
  assert.ok(win.early>win.late,diff+': early side is wider');
  for(const [offset,expectHit] of [[-(win.early-.005),true],[win.late-.005,true],[-(win.early+.01),false],[win.late+.01,false]]){
   const t=await boot();t.api.configure({difficulty:diff});await t.api.startGame();chart(t,[[1,0,0,0]]);t.song.currentTime=1+offset;key(t,'keydown','KeyD');
   const s=t.api.state();assert.equal(s.perfect+s.good,expectHit?1:0,`${diff} press at ${offset.toFixed(3)} s`);assert.equal(s.falsePresses,expectHit?0:1);
  }
 }
 const easy=(await import(new URL('assets/js/rules/scoring.js',root).href)).HIT_WINDOWS;assert.ok(easy.easy.early>easy.medium.early&&easy.medium.early>easy.hard.early,'windows tighten with difficulty');
});
async function classicSolo(rows){const t=await boot();t.api.preferences.inputMode='classic';await t.api.startGame();const n=chart(t,rows);return {t,n};}
await check('Classic mode: frets alone do not play, a strum plays the held frets',async()=>{
 let {t}=await classicSolo([[1,0,0,0]]);t.song.currentTime=1;key(t,'keydown','KeyA');assert.equal(t.api.state().perfect,0);assert.equal(t.api.state().falsePresses,0);
 key(t,'keydown','ArrowDown');assert.equal(t.api.state().perfect,1);assert.equal(t.api.state().combo,1);
 ({t}=await classicSolo([[1,0,0,0]]));t.song.currentTime=1;key(t,'keydown','KeyD');assert.equal(t.api.state().perfect,0,'tap keys are not frets in Classic');
});
await check('Classic mode: single notes allow lower anchored frets, chords need exact frets',async()=>{
 let {t}=await classicSolo([[1,2,0,0]]);t.song.currentTime=1;key(t,'keydown','KeyA');key(t,'keydown','KeyD');key(t,'keydown','ArrowUp');assert.equal(t.api.state().perfect,1,'anchor below is fine');
 ({t}=await classicSolo([[1,2,0,0]]));t.song.currentTime=1;key(t,'keydown','KeyD');key(t,'keydown','KeyF');key(t,'keydown','ArrowUp');assert.equal(t.api.state().perfect,0,'a higher fret blocks the note');
 t.song.currentTime=1.1;t.api.updateMechanics(.016);assert.equal(t.api.state().falsePresses,1,'the unresolved strum becomes an empty strum');assert.equal(t.api.state().combo,0);
 ({t}=await classicSolo([[1,0,1,0]]));t.song.currentTime=1;key(t,'keydown','KeyA');key(t,'keydown','KeyD');key(t,'keydown','ArrowDown');assert.equal(t.api.state().perfect,2);assert.equal(t.api.state().combo,1,'a chord is one combo event');
 ({t}=await classicSolo([[1,0,1,0]]));t.song.currentTime=1;key(t,'keydown','KeyA');key(t,'keydown','KeyS');key(t,'keydown','KeyD');key(t,'keydown','ArrowDown');assert.equal(t.api.state().perfect,0,'an extra fret on a chord does not count');
});
await check('Classic mode: frets may settle just after the strum, not later',async()=>{
 let {t}=await classicSolo([[1,1,0,0]]);t.song.currentTime=1;key(t,'keydown','ArrowDown');assert.ok(t.api.state().soloPending);t.song.currentTime=1.03;key(t,'keydown','KeyS');assert.equal(t.api.state().perfect,1);assert.equal(t.api.state().soloPending,null);assert.equal(t.api.state().falsePresses,0);
 ({t}=await classicSolo([[1,1,0,0]]));t.song.currentTime=1;key(t,'keydown','ArrowDown');t.song.currentTime=1.07;t.api.updateMechanics(.016);key(t,'keydown','KeyS');assert.equal(t.api.state().perfect,0);assert.equal(t.api.state().falsePresses,1);
 ({t}=await classicSolo([[1,1,0,0],[3,1,0,0]]));t.song.currentTime=2;key(t,'keydown','KeyS');key(t,'keydown','ArrowDown');t.song.currentTime=2.1;t.api.updateMechanics(.016);assert.equal(t.api.state().falsePresses,1,'strumming with nothing in the window is an empty strum');
});
await check('Classic mode keeps touch and the Duo keyboard as tap input; Duo pads strum on the D-pad',async()=>{
 let {t}=await classicSolo([[1,0,0,0]]);t.song.currentTime=1;t.touch(0).emit('pointerdown',{pointerId:70});assert.equal(t.api.state().perfect,1,'touch still taps');
 t=await boot();t.api.preferences.inputMode='classic';t.api.setGameMode('duo');await t.api.startGame();const [p,q]=t.api.state().duoPlayers;chart(t,[[1,0,0,0]],p);chart(t,[[1,0,0,0]],q);t.song.currentTime=1;
 key(t,'keydown','KeyQ');assert.equal(q.perfect,1,'Duo keyboard taps');
 const pad0=pad(0);t.pads.push(pad0);pad0.buttons[6].pressed=true;t.api.pollGamepads(1000);assert.equal(p.perfect,0,'pad fret alone holds');
 pad0.buttons[13].pressed=true;t.api.pollGamepads(1016);assert.equal(p.perfect,1,'D-pad strums');
});
await check('Key caps go fully down on the press and only the release is animated',async()=>{
 const t=await boot();await t.api.startGame();chart(t,[[1,0,0,0]]);t.song.currentTime=1;key(t,'keydown','KeyD');assert.equal(t.api.state().fretDepth[0],1);t.api.updateMechanics(.016);assert.equal(t.api.state().fretDepth[0],1);
 key(t,'keyup','KeyD');t.api.updateMechanics(.05);const d=t.api.state().fretDepth[0];assert.ok(d<1&&d>0,'released key rises smoothly');
});
await check('Calibration measures the median tap delay and needs enough taps on the beat',async()=>{
 const {latencyFromTaps,CAL_PERIOD_MS}=await import(new URL('assets/js/ui/calibration.js',root).href);
 const beats=Array.from({length:16},(_,i)=>1000+i*CAL_PERIOD_MS);
 const taps=beats.map((b,i)=>b+[60,70,80,90,100][i%5]+(i===9?150:0));assert.equal(latencyFromTaps(beats,taps),80);
 assert.equal(latencyFromTaps(beats,beats.slice(0,8).map(b=>b+50)),null,'warm-up taps alone are not enough');
 assert.equal(latencyFromTaps(beats,beats.map(b=>b-25)),-25,'early tappers get a negative value');
});
await check('Audio latency shifts judgement, video latency only drawing; the V15 slider value migrates',async()=>{
 let t=await boot({'whistles-nexus-v4-sync':'40'});assert.equal(t.api.preferences.audioLatency,-40);t.song.currentTime=5;assert.ok(Math.abs(t.api.clock.now()-5.04)<1e-9);
 t=await boot({'the-whistles:preferences':JSON.stringify({audioLatency:100,videoLatency:30,inputMode:'classic'}),'whistles-nexus-v4-sync':'40'});
 assert.equal(t.api.preferences.audioLatency,100,'saved preferences win over the old slider');assert.equal(t.api.preferences.inputMode,'classic');
 await t.api.startGame();chart(t,[[1,0,0,0]]);t.song.currentTime=1.1;key(t,'keydown','KeyA');key(t,'keydown','ArrowDown');assert.equal(t.api.state().perfect,1,'a press 100 ms after the note sounds is on time');t.api.frame(1000);
});
export const results=passed;
console.log(`${passed.length} integration checks passed:\n`+passed.map(x=>'✓ '+x).join('\n'));
