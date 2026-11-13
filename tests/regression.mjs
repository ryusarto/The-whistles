// Integration regressions for the real game script, using a deterministic media clock.
// Run: node tests/regression.mjs (Node 20+). No dependencies or network needed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const html=fs.readFileSync(new URL('index.html',root),'utf8');
const source=fs.readFileSync(new URL('assets/js/game.js',root),'utf8');
function boot(){
 const elements=[],byId=new Map(),events={},storage=new Map();
 const drawing=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>{}});
 class Element{
  constructor(tag='div',attrs=''){this.tagName=tag.toUpperCase();this.style={};this.dataset={};this.attributes={};this.children=[];this.listeners={};this.value='';this.textContent='';this.currentTime=0;this.duration=184.666;this.paused=true;this.readyState=1;this.src='';
   for(const m of attrs.matchAll(/([\w-]+)(?:="([^"]*)")?/g)){this.attributes[m[1]]=m[2]??'';if(m[1]==='id')this.id=m[2];if(m[1]==='value')this.value=m[2];if(m[1].startsWith('data-'))this.dataset[m[1].slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=m[2]??'';}
   const classes=new Set((this.attributes.class||'').split(' '));this.classList={add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle:(c,on)=>{if(on??!classes.has(c))classes.add(c);else classes.delete(c)}};
  }
  matches(sel){return sel.split(',').some(s=>{s=s.trim();if(s.startsWith('.'))return this.classList.contains(s.slice(1));if(s.startsWith('[')){const m=s.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);return m&&m[1] in this.attributes&&(m[2]===undefined||this.attributes[m[1]]===m[2]);}return this.tagName===s.toUpperCase()});}
  querySelector(){return null} querySelectorAll(){return []} focus(){} setAttribute(k,v){this.attributes[k]=v} appendChild(el){this.children.push(el)}
  addEventListener(k,fn,opt){(this.listeners[k]??=[]).push({fn,once:opt?.once})}
  emit(k){const list=this.listeners[k]||[];this.listeners[k]=list.filter(l=>!l.once);for(const {fn} of list)fn({target:this})}
  click(){return this.onclick?.()} getContext(){return drawing} getBoundingClientRect(){return {left:0,top:0,width:1280,height:720}} setPointerCapture(){}
  pause(){this.paused=true} load(){this.readyState=1} play(){this.paused=false;return Promise.resolve()}
 }
 for(const m of html.matchAll(/<(\w+)\b([^>]*)>/g)){const el=new Element(m[1],m[2]);elements.push(el);if(el.id)byId.set(el.id,el)}
 for(const m of html.matchAll(/<script id="([^"]+)"[^>]*>([\s\S]*?)<\/script>/g))byId.get(m[1]).textContent=m[2];
 const document={baseURI:'https://example.test/The-whistles/',hidden:false,getElementById:id=>byId.get(id),querySelectorAll:sel=>elements.filter(el=>el.matches(sel)),querySelector:sel=>elements.find(el=>el.matches(sel)),createElement:tag=>new Element(tag),addEventListener:(k,fn)=>events[k]=fn};
 const window={addEventListener:(k,fn)=>events['window:'+k]=fn};
 const context=vm.createContext({document,window,Image:Element,URL,console,performance:{now:()=>1000},requestAnimationFrame(){},setTimeout(){},matchMedia:()=>({matches:false}),navigator:{getGamepads:()=>[]},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},indexedDB:{open(){throw Error('Disabled in test')}}});
 const hook=`window.test={startGame,restartSession,pauseGame,resumeGame,enterSetlist,seekPractice,finishGame,updateMechanics,hitLane,duoPress,duoRelease,updateDuoMechanics,registerHit,registerMiss,failShow,show,noteXY,duoNoteXY,travelTime,hitWindow,compileNotes,setGameMode,frame,clearInputs,state:()=>({screen,practice,sessionStart,sessionSpeed,score,crowd,maxHits,nextMiss,notes,duoPlayers,misses,keys,soloKeyboardHeld,activeHolds,perfect,good}),configure:(v)=>{if('track' in v)activeTrack=catalog.find(t=>t.id===v.track);if('artist'in v)chosen=v.artist;if('difficulty'in v)difficulty=v.difficulty;if('crowd'in v)crowd=v.crowd;if('holds'in v)activeHolds=v.holds;}};`;
 vm.runInContext(source.replace(/\}\)\(\);\s*$/,hook+'})();'),context,{filename:'game.js'});
 return {api:window.test,window,document,events,storage,song:byId.get('song'),el:id=>byId.get(id)};
}
const passed=[];
async function check(name,fn){await fn();passed.push(name)}
await check('All 30 instrument/difficulty charts compile with valid timing and lanes',()=>{
 const {api,window}=boot();const catalog=window.whistlesDebug.getCatalog();assert.equal(catalog.length,5);
 for(const track of catalog)for(const artist of ['franco','ryuchi'])for(const difficulty of ['easy','normal','expert']){
  api.configure({track:track.id,artist,difficulty});
  assert.ok(track.counts[artist][difficulty]>0);
 }
 for(const m of html.matchAll(/<script id="([^"]*chart-data)"[^>]*>([\s\S]*?)<\/script>/g)){
  const bank=JSON.parse(m[2]);for(const artist of Object.values(bank))for(const chart of Object.values(artist)){
   const notes=api.compileNotes(chart);for(let i=0;i<notes.length;i++){const n=notes[i];assert.ok(Number.isFinite(n.t)&&n.t>=0);assert.ok(n.lane>=0&&n.lane<4);assert.ok(n.hold>=0);if(i)assert.ok(notes[i-1].t<=n.t)}
  }
 }
});
await check('All five audio tracks start and regular shows restore full speed',async()=>{
 const t=boot();for(const id of ['nexus','summertime','ruthless','sem-tu','minha-fonte']){t.api.configure({track:id});await t.api.startGame(0);assert.equal(t.api.state().screen,'playing');assert.equal(t.api.state().practice,false);assert.ok(t.song.src.endsWith(id+'.mp3'));assert.equal(t.song.playbackRate,1)}
});
await check('Solo intro skip excludes old notes without counting misses or saving records',async()=>{
 const t=boot();await t.api.startGame();t.api.seekPractice(33.2);t.api.updateMechanics(.016);const s=t.api.state();assert.equal(s.practice,true);assert.equal(s.misses,0);assert.ok(s.notes.filter(n=>n.skipped).length>0);assert.equal(s.maxHits,s.notes.filter(n=>!n.skipped).length);t.api.finishGame();assert.equal(t.storage.size,0);
});
await check('Slow rehearsal uses the audio clock, real-time hit windows and no game over',async()=>{
 const t=boot();await t.api.startGame(40,true,.5);const s=t.api.state();assert.equal(s.sessionSpeed,.5);assert.equal(t.api.travelTime(),1.12);assert.equal(t.api.hitWindow(),.0875);assert.equal(t.api.noteXY({t:41,lane:0},41).y,605);t.api.configure({crowd:0});t.api.failShow();assert.equal(t.api.state().screen,'playing');await t.api.restartSession();assert.equal(t.song.currentTime,40);assert.equal(t.song.playbackRate,.5);await t.api.startGame(0);assert.equal(t.song.playbackRate,1);assert.equal(t.api.state().practice,false);
});
await check('Pause clears every input source and preserves an active sustain',async()=>{
 const t=boot();await t.api.startGame(40,true);const s=t.api.state();s.keys.add(0);s.soloKeyboardHeld.add(0);t.api.configure({holds:[{lane:0,end:42,note:{lane:0}}]});t.api.pauseGame();assert.equal(t.api.state().keys.size,0);assert.equal(t.api.state().soloKeyboardHeld.size,0);assert.equal(t.api.state().activeHolds.length,1);await t.api.resumeGame();assert.equal(t.api.state().screen,'playing');t.api.updateMechanics(.016);assert.equal(t.api.state().activeHolds.length,1);
});
await check('Duo keeps independent note judgments and excludes skipped notes for both players',async()=>{
 const t=boot();t.api.setGameMode('duo');await t.api.startGame(40,true,.75);let s=t.api.state();assert.equal(s.duoPlayers.length,2);const p=s.duoPlayers[0],q=s.duoPlayers[1],n=p.notes.find(n=>!n.skipped);t.song.currentTime=n.t;t.api.duoPress(p,n.lane,'test');assert.equal(p.perfect,1);assert.equal(q.perfect,0);t.api.seekPractice(80);t.api.updateMechanics(.016);s=t.api.state();assert.equal(s.maxHits,s.duoPlayers.reduce((sum,p)=>sum+p.notes.filter(n=>!n.skipped).length,0));t.api.configure({crowd:0});t.api.failShow();assert.equal(t.api.state().screen,'playing');t.api.finishGame();assert.equal(t.storage.size,0);
});
await check('Cancelling a pending audio load cannot re-enter gameplay',async()=>{
 const t=boot();let resolve;t.song.play=()=>new Promise(r=>resolve=r);const pending=t.api.startGame();assert.equal(t.api.state().screen,'loading');t.api.enterSetlist();resolve();await pending;assert.equal(t.api.state().screen,'setlist');assert.equal(t.song.paused,true);
});
await check('Metadata seek is reapplied; rejected playback has a recoverable error',async()=>{
 const t=boot();t.song.readyState=0;t.song.load=()=>{};await t.api.startGame(54.8,true);t.song.currentTime=0;t.song.emit('loadedmetadata');assert.equal(t.song.currentTime,54.8);t.song.play=()=>Promise.reject(Error('network unavailable'));await t.api.startGame();assert.equal(t.api.state().screen,'pause');assert.equal(t.el('audioError').style.display,'block');
});
await check('Solo clear saves record; rehearsal does not overwrite it',async()=>{
 const t=boot();await t.api.startGame();t.api.finishGame();const record=Array.from(t.storage.values())[0];assert.ok(record);await t.api.startGame(0,true,.5);t.api.finishGame();assert.equal(Array.from(t.storage.values())[0],record);
});
await check('Rendering runs in Solo and Duo without exceptions',async()=>{
 const t=boot();await t.api.startGame(40,true);t.api.frame(1000);t.api.setGameMode('duo');await t.api.startGame(40,true);t.api.frame(2000);
});
export const results=passed;
console.log(`${passed.length} integration checks passed:\n`+passed.map(x=>'✓ '+x).join('\n'));
