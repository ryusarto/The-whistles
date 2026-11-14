// Integration regressions for the real V15 game, using a deterministic media clock.
// Run: node tests/regression.mjs (Node 20+). No dependencies or network needed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const html=fs.readFileSync(new URL('index.html',root),'utf8');
const source=fs.readFileSync(new URL('assets/js/game.js',root),'utf8');
function boot(stored={}){
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
 const context=vm.createContext({document,window,Image:Element,URL,console,performance:{now:()=>1000},requestAnimationFrame(){},setTimeout(){},matchMedia:()=>({matches:false}),navigator:{getGamepads:()=>pads},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},indexedDB:{open(){throw Error('Disabled in test')}}});
 // Test-only lexical access; the shipped debug API remains read-only.
 const hook=`window.test={startGame,restartSession,pauseGame,resumeGame,enterSetlist,finishGame,updateMechanics,hitLane,soloPress,soloRelease,duoPress,duoRelease,updateDuoMechanics,registerHit,registerMiss,duoRegisterHit,duoRegisterMiss,failShow,compileNotes,setGameMode,frame,clearInputs,touchPress,releasePointer,beginHit,missEvent,makeHold,advanceHolds,pollGamepads,laneX,duoLaneX,state:()=>({screen,gameMode,score,combo,bestCombo,crowd,maxHits,nextMiss,notes,duoPlayers,misses,keys,soloKeyboardHeld,soloPadHeld,soloSources,pointerTouches,activeHolds,perfect,good,falsePresses}),configure:(v)=>{if('track'in v)activeTrack=catalog.find(t=>t.id===v.track);if('artist'in v)chosen=v.artist;if('difficulty'in v)difficulty=v.difficulty;if('crowd'in v)crowd=v.crowd;if('combo'in v)combo=v.combo;if('notes'in v){notes=v.notes;nextMiss=0;maxHits=notes.length;}if('maxHits'in v)maxHits=v.maxHits;}};`;
 const instrumented=source.replace(/\}\)\(\);\s*$/,hook+'})();');assert.notEqual(instrumented,source,'Test hook must attach to the game closure');
 vm.runInContext(instrumented,context,{filename:'game.js'});
 return {api:window.test,window,document,storage,pads,song:byId.get('song'),el:id=>byId.get(id),emit:(k,data={})=>{const e=event(byId.get('stage'),data);for(const fn of events[k]||[])fn(e);return e},touch:lane=>elements.find(el=>el.dataset.touchLane===String(lane))};
}
function chart(t,rows,player){const notes=t.api.compileNotes(rows);if(player){player.notes=notes;player.nextMiss=0;player.maxHits=notes.length;t.api.configure({maxHits:t.api.state().duoPlayers.reduce((sum,p)=>sum+p.maxHits,0)});}else t.api.configure({notes});return notes}
function emptyDuo(t){for(const p of t.api.state().duoPlayers)chart(t,[],p)}
function pad(index){return {index,id:'DualSense test '+index,mapping:'standard',connected:true,buttons:Array.from({length:18},()=>({pressed:false,value:0}))}}
function key(t,type,code,repeat=false){return t.emit(type,{code,repeat})}
const passed=[];
async function check(name,fn){await fn();passed.push(name)}
await check('All 30 instrument/difficulty charts compile valid notes and shared chord groups',()=>{
 const {api,window}=boot(),catalog=window.whistlesDebug.getCatalog();assert.equal(catalog.length,5);let charts=0,chords=0,holds=0;
 for(const m of html.matchAll(/<script id="([^"]*chart-data)"[^>]*>([\s\S]*?)<\/script>/g)){
  const bank=JSON.parse(m[2]);assert.deepEqual(Object.keys(bank).sort(),['franco','ryuchi']);
  for(const [artist,difficulties] of Object.entries(bank)){assert.deepEqual(Object.keys(difficulties).sort(),['easy','expert','normal']);for(const [difficulty,rows] of Object.entries(difficulties)){
   charts++;const notes=api.compileNotes(rows);assert.ok(notes.length>0);assert.equal(notes.length,rows.reduce((n,r)=>n+(r[2]===1?2:1),0));
   const groups=new Map();for(let i=0;i<notes.length;i++){const n=notes[i];assert.ok(Number.isFinite(n.t)&&n.t>=0);assert.ok(Number.isInteger(n.lane)&&n.lane>=0&&n.lane<4);assert.ok(Number.isFinite(n.hold)&&n.hold>=0);assert.equal(n.hit,false);assert.equal(n.miss,false);if(i)assert.ok(notes[i-1].t<=n.t);const members=groups.get(n.group)||[];members.push(n);groups.set(n.group,members);if(n.hold)holds++;}
   assert.equal(groups.size,rows.length);for(const [group,members] of groups){assert.equal(group.size,members.length);assert.equal(group.hits,0);assert.equal(group.missed,false);assert.equal(group.multiplier,0);if(group.size===2){chords++;assert.equal(members[0].t,members[1].t);assert.equal(Math.abs(members[0].lane-members[1].lane),2);}}
   assert.ok(catalog.some(track=>track.counts[artist][difficulty]===rows.length));
  }}
 }
 assert.equal(charts,30);assert.ok(chords>0);assert.ok(holds>0);
});
await check('Public game diagnostics expose read-only snapshots',()=>{
 const t=boot(),debug=t.window.whistlesDebug;assert.deepEqual(Object.keys(debug).sort(),['getCatalog','getDuoState','getState']);const copy=debug.getCatalog();copy[0].id='changed';copy[0].counts.franco.normal=0;assert.equal(debug.getCatalog()[0].id,'nexus');assert.ok(debug.getCatalog()[0].counts.franco.normal>0);
});
await check('All five local audio tracks start at zero and full speed; restart resets the show',async()=>{
 const t=boot();for(const id of ['nexus','summertime','ruthless','sem-tu','minha-fonte']){
  assert.ok(fs.statSync(new URL('assets/audio/'+id+'.mp3',root)).size>0);t.api.configure({track:id});t.song.currentTime=55;t.song.playbackRate=.5;await t.api.startGame(40,true,.5);assert.equal(t.api.state().screen,'playing');assert.ok(t.song.src.endsWith(id+'.mp3'));assert.equal(t.song.currentTime,0);assert.equal(t.song.playbackRate,1);assert.equal(t.song.preservesPitch,true);assert.equal(t.api.state().score,0);assert.equal(t.api.state().nextMiss,0);
 }t.song.currentTime=75;await t.api.restartSession();assert.equal(t.song.currentTime,0);assert.equal(t.song.playbackRate,1);
});
await check('Solo chords advance combo once and score every gem using the preceding multiplier',async()=>{
 const t=boot();await t.api.startGame();const n=chart(t,[[1,0,1,0],[2,1,0,0]]);t.api.configure({combo:9});t.song.currentTime=1;t.api.registerHit(n[0],0);assert.equal(t.api.state().score,50);assert.equal(t.api.state().combo,9);t.api.registerHit(n[1],.14);assert.equal(t.api.state().score,100);assert.equal(t.api.state().combo,10);assert.equal(n[0].group,n[1].group);assert.equal(n[0].group.multiplier,1);t.song.currentTime=2;t.api.registerHit(n[2],0);assert.equal(t.api.state().score,200);assert.equal(t.api.state().combo,11);assert.equal(t.api.state().perfect,2);assert.equal(t.api.state().good,1);
});
await check('Duo scoring matches Solo while each instrument keeps independent judgments',async()=>{
 const t=boot();t.api.setGameMode('duo');await t.api.startGame();const [p,q]=t.api.state().duoPlayers;for(const player of [p,q]){chart(t,[[1,0,1,0],[2,1,0,0]],player);player.combo=9;}t.song.currentTime=1;t.api.duoRegisterHit(p,p.notes[0],0);assert.equal(p.combo,9);assert.equal(q.perfect,0);assert.equal(q.score,0);t.api.duoRegisterHit(p,p.notes[1],.14);assert.equal(p.combo,10);assert.equal(p.score,100);t.song.currentTime=2;t.api.duoRegisterHit(p,p.notes[2],0);assert.equal(p.score,200);assert.equal(p.combo,11);for(const n of q.notes)t.api.duoRegisterHit(q,n,0);assert.equal(q.score,200);assert.equal(q.combo,11);assert.equal(t.api.state().score,400);
});
await check('Chord groups lock their multiplier and an incomplete chord cannot advance the streak',()=>{
 const t=boot(),n=t.api.compileNotes([[1,0,1,0]]);let hit=t.api.beginHit(n[0],2);assert.equal(hit.complete,false);hit=t.api.beginHit(n[1],8);assert.equal(hit.multiplier,2);assert.equal(hit.complete,true);const missed=t.api.compileNotes([[1,0,1,0]]);assert.equal(t.api.missEvent(missed[0]),true);assert.equal(t.api.missEvent(missed[1]),false);assert.equal(t.api.beginHit(missed[1],4).complete,false);
});
await check('Missing both chord gems counts both misses but applies one crowd penalty in Solo and Duo',async()=>{
 for(const mode of ['solo','duo']){const t=boot();t.api.setGameMode(mode);await t.api.startGame();t.api.configure({crowd:80,combo:7});const p=mode==='duo'?t.api.state().duoPlayers[0]:null;if(p)p.combo=7;const n=chart(t,[[1,0,1,0]],p),miss=note=>p?t.api.duoRegisterMiss(p,note):t.api.registerMiss(note);miss(n[0]);const after=t.api.state().crowd;assert.ok(after<80);miss(n[1]);assert.equal(t.api.state().crowd,after);assert.equal(p?p.misses:t.api.state().misses,2);assert.equal(p?p.combo:t.api.state().combo,0);miss(n[0]);assert.equal(p?p.misses:t.api.state().misses,2);}
});
async function sustain(mode,steps,releaseEarly=false){
 const t=boot();t.api.configure({track:'minha-fonte'});t.api.setGameMode(mode);await t.api.startGame();let p=null;if(mode==='duo'){emptyDuo(t);p=t.api.state().duoPlayers[0];}chart(t,[[1,0,2,3]],p);t.song.currentTime=1;if(p)t.api.duoPress(p,0,'test');else t.api.soloPress(0,'test');
 const end=releaseEarly?2.5:4;for(let i=1;i<=steps;i++){t.song.currentTime=1+(end-1)*i/steps;t.api.updateMechanics(i%2?.001:.07);}const earned=p?p.score:t.api.state().score;if(releaseEarly){if(p)t.api.duoRelease(p,0,'test');else t.api.soloRelease(0,'test');t.song.currentTime=2.6;t.api.updateMechanics(.016);assert.equal(p?p.holds.length:t.api.state().activeHolds.length,0);t.song.currentTime=4;t.api.updateMechanics(.016);assert.equal(p?p.score:t.api.state().score,earned);}else assert.equal(p?p.holds.length:t.api.state().activeHolds.length,0);return earned;
}
await check('Sustains award 25 points per beat from audio time at every tested frame rate in both modes',async()=>{
 for(const mode of ['solo','duo'])for(const steps of [1,90,180,432])assert.equal(await sustain(mode,steps),150,mode+' with '+steps+' updates');
});
await check('Early sustain release keeps earned points and grants no unplayed tail bonus',async()=>{
 for(const mode of ['solo','duo'])assert.equal(await sustain(mode,150,true),100);
});
await check('Fractional sustain points carry between updates and an unchanged audio clock scores nothing',async()=>{
 const t=boot();t.api.configure({track:'minha-fonte'});await t.api.startGame();t.song.currentTime=1;const h=t.api.makeHold({t:1,lane:0,hold:3}),holds=[h],pressed=new Set([0]);let points=0;const tick=time=>t.api.advanceHolds(holds,pressed,time,()=>1,n=>points+=n);tick(1.01);assert.equal(points,0);assert.ok(h.fraction>0);tick(1.04);assert.equal(points,1);tick(1.04);assert.equal(points,1);tick(1.75);assert.equal(points,25);assert.ok(Math.abs(h.fraction)<1e-6);
});
await check('Keyboard, gamepad and touch share one Solo press and release only their own source',async()=>{
 const t=boot();await t.api.startGame();chart(t,[[1,0,0,0],[1.1,0,0,0]]);t.song.currentTime=1;key(t,'keydown','KeyD');const p=pad(0);t.pads.push(p);p.buttons[6].pressed=true;t.api.pollGamepads(1000);const b=t.touch(0);b.emit('pointerdown',{pointerId:10});key(t,'keydown','KeyD',true);assert.equal(t.api.state().perfect,1);assert.equal(t.api.state().falsePresses,0);assert.equal(t.api.state().soloSources[0].size,3);key(t,'keyup','KeyD');assert.equal(t.api.state().keys.has(0),true);p.buttons[6].pressed=false;t.api.pollGamepads(1016);assert.equal(t.api.state().keys.has(0),true);b.emit('pointercancel',{pointerId:10});assert.equal(t.api.state().keys.has(0),false);assert.equal(b.classList.contains('is-held'),false);t.song.currentTime=1.1;key(t,'keydown','KeyD');assert.equal(t.api.state().perfect,2);assert.equal(t.api.state().score,100);
});
await check('Four visible touch lanes support simultaneous pointers, cancellation and lost capture',async()=>{
 const t=boot();await t.api.startGame();assert.ok(t.el('touchControls'));assert.equal(t.document.querySelectorAll('[data-touch-lane]').length,4);chart(t,[[1,0,1,0]]);t.song.currentTime=1;const a=t.touch(0),b=t.touch(2);const down=a.emit('pointerdown',{pointerId:21});assert.equal(down.defaultPrevented,true);assert.ok(a.captured.has(21));b.emit('pointerdown',{pointerId:21});assert.equal(t.api.state().perfect,1);b.emit('pointerdown',{pointerId:22});assert.equal(t.api.state().perfect,2);assert.equal(t.api.state().combo,1);a.emit('pointerdown',{pointerId:23});assert.equal(t.api.state().falsePresses,0);a.emit('pointercancel',{pointerId:21});assert.equal(a.classList.contains('is-held'),true);assert.equal(t.api.state().keys.has(0),true);a.emit('lostpointercapture',{pointerId:23});assert.equal(t.api.state().keys.has(0),false);assert.equal(a.classList.contains('is-held'),false);assert.equal(t.api.state().keys.has(2),true);b.emit('pointerup',{pointerId:22});assert.equal(t.api.state().keys.size,0);assert.equal(t.api.state().pointerTouches.size,0);
});
await check('Duo keyboard, two gamepads and captured touches retain independent player ownership',async()=>{
 const t=boot();t.api.setGameMode('duo');await t.api.startGame();const [p,q]=t.api.state().duoPlayers;for(const player of [p,q])chart(t,[[1,0,0,0]],player);t.song.currentTime=1;key(t,'keydown','KeyD');key(t,'keydown','KeyQ');for(let i=0;i<2;i++){const padState=pad(i);padState.buttons[6].pressed=true;t.pads.push(padState);}t.api.pollGamepads(1000);t.touch(0).emit('pointerdown',{pointerId:31});const canvas=t.el('stage');canvas.emit('pointerdown',{pointerId:32,clientX:t.api.duoLaneX(0,585,1),clientY:585});assert.equal(p.sources[0].size,3);assert.equal(q.sources[0].size,3);assert.equal(p.perfect,1);assert.equal(q.perfect,1);assert.equal(p.falsePresses+q.falsePresses,0);key(t,'keyup','KeyD');key(t,'keyup','KeyQ');for(const padState of t.pads)padState.buttons[6].pressed=false;t.api.pollGamepads(1016);t.touch(0).emit('pointercancel',{pointerId:31});assert.equal(p.keys.size,0);assert.equal(q.keys.has(0),true);canvas.emit('lostpointercapture',{pointerId:32});assert.equal(q.keys.size,0);assert.equal(t.api.state().pointerTouches.size,0);
});
await check('Pause clears every input source and held style while preserving an active sustain in both modes',async()=>{
 for(const mode of ['solo','duo']){const t=boot();t.api.setGameMode(mode);await t.api.startGame();let p=null;if(mode==='duo'){emptyDuo(t);p=t.api.state().duoPlayers[0];}chart(t,[[1,0,2,3]],p);t.song.currentTime=1;key(t,'keydown','KeyD');const padState=pad(0);padState.buttons[6].pressed=true;t.pads.push(padState);t.api.pollGamepads(1000);t.touch(0).emit('pointerdown',{pointerId:40});t.api.pauseGame();const s=t.api.state();assert.equal(s.screen,'pause');assert.equal(t.song.paused,true);assert.equal(s.keys.size+s.soloKeyboardHeld.size+s.soloPadHeld.size+s.pointerTouches.size,0);assert.ok(s.soloSources.every(s=>s.size===0));for(const player of s.duoPlayers){assert.equal(player.keys.size,0);assert.ok(player.sources.every(s=>s.size===0));}assert.equal(t.touch(0).classList.contains('is-held'),false);assert.equal(p?p.holds.length:s.activeHolds.length,1);await t.api.resumeGame();t.api.updateMechanics(.016);assert.equal(t.api.state().screen,'playing');assert.equal(p?p.holds.length:t.api.state().activeHolds.length,1);t.api.clearInputs();assert.equal(p?p.holds.length:t.api.state().activeHolds.length,0);}
});
await check('Blur, visibility change and orientation change pause active shows and clear touch input',async()=>{
 for(const signal of ['window:blur','visibilitychange','window:orientationchange']){const t=boot();await t.api.startGame();chart(t,[[1,0,0,0]]);t.song.currentTime=1;t.touch(0).emit('pointerdown',{pointerId:50});if(signal==='visibilitychange')t.document.hidden=true;t.emit(signal);assert.equal(t.api.state().screen,'pause');assert.equal(t.api.state().keys.size,0);assert.equal(t.api.state().pointerTouches.size,0);assert.equal(t.touch(0).classList.contains('is-held'),false);}
});
await check('Normal shows can fail in Solo and Duo, clearing every active input and sustain',async()=>{
 for(const mode of ['solo','duo']){const t=boot();t.api.setGameMode(mode);await t.api.startGame();let p=null;if(mode==='duo'){emptyDuo(t);p=t.api.state().duoPlayers[0];}chart(t,[[1,0,2,3]],p);t.song.currentTime=1;t.touch(0).emit('pointerdown',{pointerId:60});t.api.configure({crowd:0});t.api.failShow();assert.equal(t.api.state().screen,'failed');assert.equal(t.song.paused,true);assert.equal(t.api.state().pointerTouches.size,0);assert.equal(p?p.holds.length:t.api.state().activeHolds.length,0);assert.equal(t.storage.size,0);}
});
await check('Cancelling a pending audio load cannot re-enter gameplay',async()=>{
 const t=boot();let resolve;t.song.play=()=>new Promise(r=>resolve=r);const pending=t.api.startGame();assert.equal(t.api.state().screen,'loading');t.api.enterSetlist();resolve();await pending;assert.equal(t.api.state().screen,'setlist');assert.equal(t.song.paused,true);
});
await check('Metadata starts audio at zero; stale callbacks cannot seek a cancelled show',async()=>{
 const t=boot();t.song.readyState=0;t.song.load=()=>{};t.song.currentTime=54.8;await t.api.startGame(54.8,true);t.song.emit('loadedmetadata');assert.equal(t.song.currentTime,0);await t.api.startGame();t.api.enterSetlist();t.song.currentTime=12;t.song.emit('loadedmetadata');assert.equal(t.song.currentTime,12);assert.equal(t.api.state().screen,'setlist');
});
await check('Rejected playback shows an error and Resume recovers into gameplay',async()=>{
 const t=boot();t.song.play=()=>Promise.reject(Error('network unavailable'));await t.api.startGame();assert.equal(t.api.state().screen,'pause');assert.equal(t.el('audioError').style.display,'block');assert.equal(t.song.paused,true);t.song.play=()=>{t.song.paused=false;return Promise.resolve()};await t.api.resumeGame();assert.equal(t.api.state().screen,'playing');assert.equal(t.el('audioError').style.display,'none');
});
await check('Solo records use V15 keys, ignore old records and preserve personal bests across clears',async()=>{
 const oldKey='the-whistles-v14:record:nexus:franco:normal',old=JSON.stringify({bestScore:999999,bestAccuracy:100}),t=boot({[oldKey]:old});await t.api.startGame();const n=chart(t,[[1,0,1,0],[2,1,0,0]]);for(const note of n){t.song.currentTime=note.t;t.api.registerHit(note,0);}t.api.finishGame();const recordKey='the-whistles-v15:record:nexus:franco:normal';let r=JSON.parse(t.storage.get(recordKey));assert.equal(r.bestScore,150);assert.equal(r.bestAccuracy,100);assert.equal(r.bestCombo,2);assert.equal(r.stars,5);assert.equal(r.plays,1);assert.equal(r.clears,1);assert.match(t.el('recordLine').textContent,/NOVO RECORDE/);await t.api.startGame();chart(t,[[1,0,0,0]]);t.api.finishGame();r=JSON.parse(t.storage.get(recordKey));assert.equal(r.bestScore,150);assert.equal(r.bestAccuracy,100);assert.equal(r.plays,2);assert.equal(r.clears,2);assert.doesNotMatch(t.el('recordLine').textContent,/NOVO RECORDE/);assert.equal(t.storage.get(oldKey),old);t.api.configure({artist:'ryuchi',difficulty:'expert',track:'summertime'});await t.api.startGame();t.api.finishGame();assert.ok(t.storage.has('the-whistles-v15:record:summertime:ryuchi:expert'));assert.equal(t.storage.size,3);
});
await check('Duo records use separate V15 keys and save the combined score with per-player accuracy',async()=>{
 const oldKey='the-whistles-v14:duo:nexus:normal',old=JSON.stringify({bestScore:999999}),t=boot({[oldKey]:old});t.api.setGameMode('duo');await t.api.startGame();const [p,q]=t.api.state().duoPlayers;chart(t,[[1,0,1,0]],p);chart(t,[[1,1,0,0]],q);
 const expectedHits=p.maxHits+q.maxHits;assert.equal(expectedHits,3);for(const player of [p,q])for(const note of player.notes){t.song.currentTime=1;t.api.duoRegisterHit(player,note,0);}t.api.finishGame();const r=JSON.parse(t.storage.get('the-whistles-v15:duo:nexus:normal'));assert.equal(r.bestScore,150);assert.equal(r.bestAccuracy,100);assert.equal(r.stars,5);assert.equal(r.bestCombo,1);assert.equal(r.plays,1);assert.equal(r.clears,1);assert.match(t.el('duoResult0').innerHTML,/100%/);assert.match(t.el('duoResult1').innerHTML,/100%/);assert.match(t.el('recordLine').textContent,/NOVO RECORDE DA DUPLA/);assert.equal(t.storage.get(oldKey),old);assert.equal(t.storage.size,2);
});
await check('Rendering runs in Solo and Duo without exceptions',async()=>{
 const t=boot();await t.api.startGame();t.api.frame(1000);t.api.setGameMode('duo');await t.api.startGame();t.api.frame(2000);
});
export const results=passed;
console.log(`${passed.length} integration checks passed:\n`+passed.map(x=>'✓ '+x).join('\n'));
