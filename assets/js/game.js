(()=>{
'use strict';
const $=id=>document.getElementById(id), canvas=$('stage'),song=$('song');
let ctx=canvas.getContext('2d');
const colors=['#e34a49','#ffc05e','#55b7f3','#f5efdf'];
const chartBank=JSON.parse($('chart-data').textContent), summerChartBank=JSON.parse($('summer-chart-data').textContent), ruthlessChartBank=JSON.parse($('ruthless-chart-data').textContent), semTuChartBank=JSON.parse($('sem-tu-chart-data').textContent), minhaFonteChartBank=JSON.parse($('minha-fonte-chart-data').textContent), envelope=JSON.parse($('rms-data').textContent), summerEnvelope=JSON.parse($('summer-rms-data').textContent), ruthlessEnvelope=JSON.parse($('ruthless-rms-data').textContent), semTuEnvelope=JSON.parse($('sem-tu-rms-data').textContent), minhaFonteEnvelope=JSON.parse($('minha-fonte-rms-data').textContent);
const charSprites={};
function imFrom(tag){const im=new Image();im.src=tag==='franco-image'?'./assets/images/franco.webp':'./assets/images/ryuchi.webp';return im}
charSprites.franco=imFrom('franco-image');charSprites.ryuchi=imFrom('ryuchi-image');
$('francoCard').src=charSprites.franco.src; $('ryuchiCard').src=charSprites.ryuchi.src;
$('coverArt').src='./assets/images/capa.jpg';
let screen='boot', chosen='franco', difficulty='normal', practice=false, notes=[], nextMiss=0, running=false, offset=0;
let score=0,combo=0,bestCombo=0,perfect=0,good=0,misses=0,falsePresses=0, maxHits=0,crowd=76,power=0,powerEnd=0,activeHolds=[],particles=[],keys=new Set(),flash={text:'',until:0,color:'#fff'},streakNoticeUntil=0,streakNoticeValue=0,songReady=false,record=false;
let lastHud=0, lastTime=0, pausePending=false, lastRendered=0;
let sessionStart=0, sessionTraining=false, sessionSpeed=1, startRequest=0, overlayReturn='boot', resumeGraceUntil=0;
const preferences={volume:.8,effects:matchMedia('(prefers-reduced-motion: reduce)').matches?'reduced':'full'};
const fretGlow=new Float32Array(4), fretImpact=new Float32Array(4), fretPress=new Float32Array(4), fretDepth=new Float32Array(4);
let impactCount=0;
// The original solo game is preserved. The two-player engine runs parallel charts on one song clock.
let gameMode='solo', duoPlayers=[], lastGamepadStatus=-1, controllersReturnScreen='setlist', pairSlot=0, manualPairing=false;
const gamepadPrevious=new Map();
const soloPadHeld=new Set();
let gamepadAssigned=[null,null];
const dualSenseFrets=[6,4,5,7]; // esquerda → direita: L2, L1, R1, R2 (Gamepad API standard)
const coopKeyboard=[{KeyD:0,KeyF:1,KeyJ:2,KeyK:3},{KeyQ:0,KeyW:1,KeyO:2,KeyP:3}];
const soloKeyboardHeld=new Set();
let nexusAudioUrl=null,summertimeAudioUrl=null,ruthlessAudioUrl=null,semTuAudioUrl=null,minhaFonteAudioUrl=null;
const catalog=[{id:'nexus',title:'NEXUS',duration:184.666,bpm:118,builtIn:true,provisional:false,charts:chartBank},{id:'summertime',title:'SUMMERTIME',duration:154.2,bpm:115,builtIn:true,provisional:false,charts:summerChartBank},{id:'ruthless',title:'RUTHLESS',duration:159.817,bpm:190,builtIn:true,provisional:false,charts:ruthlessChartBank},{id:'sem-tu',title:'SEM TU',duration:165.53,bpm:70,builtIn:true,provisional:false,charts:semTuChartBank},{id:'minha-fonte',title:'MINHA FONTE',duration:126.04,bpm:80,builtIn:true,provisional:false,charts:minhaFonteChartBank}];
let activeTrack=catalog[0];
let selectedTrack=catalog[0];
const fmtNum=n=>Number(n||0).toLocaleString('pt-BR');
const recordCache=new Map();
function safeText(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function recordKey(track,artist,diff){return 'the-whistles-v5:record:'+track.id+':'+artist+':'+diff}
function duoRecordKey(track,diff){return 'the-whistles-v11:duo:'+track.id+':'+diff}
function loadDuoRecord(track,diff){try{return JSON.parse(localStorage.getItem(duoRecordKey(track,diff))||'null')}catch(e){return null}}
function saveDuoRecord(track,diff,rec){try{localStorage.setItem(duoRecordKey(track,diff),JSON.stringify(rec))}catch(e){console.warn('Recorde duo não pôde ser salvo',e)}}
function setGameMode(mode){
 if(mode!=='duo'&&mode!=='solo')return;
 gameMode=mode;
 if(gameMode==='duo')chosen='franco';
 $('game').classList.toggle('duo-mode',gameMode==='duo');
 document.querySelectorAll('[data-game-mode]').forEach(b=>{const selected=b.dataset.gameMode===mode;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected))});
 document.querySelectorAll('[data-select-character]').forEach(b=>b.disabled=gameMode==='duo');
 document.querySelectorAll('.charcard').forEach(el=>{const selected=gameMode==='duo'||el.dataset.character===chosen;el.classList.toggle('selected',selected);el.setAttribute('aria-pressed',String(selected))});
 $('setupHeading').textContent=gameMode==='duo'?'BAND CO-OP · 2 PLAYERS':'CHOOSE YOUR ROCKSTAR';
 $('setupControlsHint').textContent=gameMode==='duo'?'P1 D F J K + ESPAÇO · P2 Q W O P + ENTER · PS5: L2 L1 R1 R2 + ✕':'D F J K / PS5 L2 L1 R1 R2 · ESPAÇO / ✕ = ESPECIAL';
 updateSelection();renderSetlist();refreshControllerStatus(true);
}
document.querySelectorAll('[data-game-mode]').forEach(b=>b.onclick=()=>setGameMode(b.dataset.gameMode));
function loadRecord(track,artist,diff){const key=recordKey(track,artist,diff);try{return JSON.parse(localStorage.getItem(key)||'null')||recordCache.get(key)||null}catch(e){return recordCache.get(key)||null}}
function saveRecord(track,artist,diff,rec){const key=recordKey(track,artist,diff);recordCache.set(key,rec);try{localStorage.setItem(key,JSON.stringify(rec))}catch(e){}}
function allTrackRecords(track,artist){return ['easy','normal','expert'].map(d=>({diff:d,record:loadRecord(track,artist,d)}))}
function chooseTrack(track){selectedTrack=track;renderSetlist()}
function renderSetlist(){
 const items=$('setlistItems');items.innerHTML='';
 for(let i=0;i<catalog.length;i++){
  const track=catalog[i], records=['franco','ryuchi'].flatMap(c=>allTrackRecords(track,c).map(r=>r.record)).filter(Boolean);
  const modeRecords=gameMode==='duo'?['easy','normal','expert'].map(d=>loadDuoRecord(track,d)).filter(Boolean):records;
  const best=modeRecords.reduce((b,r)=>Math.max(b,r.bestAccuracy||0),0);
  const card=document.createElement('button');card.className='track-item'+(selectedTrack.id===track.id?' selected':'');
  card.innerHTML='<span class="track-index">'+String(i+1).padStart(2,'0')+'</span><span><span class="track-name">'+safeText(track.title)+'</span><span class="track-info">'+(track.provisional?'MAPA AUTOMÁTICO • RASCUNHO':'THE WHISTLES • STEM CHART')+' &nbsp;·&nbsp; '+fmtTime(track.duration)+'</span><span class="progress-rail"><span class="progress-bar" style="display:block;width:'+best+'%"></span></span></span><span class="track-pct">'+best+'%<small>BEST ACC.</small></span>';
  card.setAttribute('aria-pressed',String(selectedTrack.id===track.id));card.onclick=()=>chooseTrack(track);items.appendChild(card);
 }
 $('trackCount').textContent=String(catalog.length).padStart(2,'0');
 $('setlistTitle').textContent=selectedTrack.title;
 $('setlistMeta').textContent='THE WHISTLES • '+fmtTime(selectedTrack.duration)+' • '+(selectedTrack.bpm?selectedTrack.bpm+' BPM':'BPM NÃO ANALISADO');
 document.querySelectorAll('[data-select-character]').forEach(b=>b.classList.toggle('active',b.dataset.selectCharacter===chosen));
 const rows=gameMode==='duo'?['easy','normal','expert'].map(diff=>({diff,record:loadDuoRecord(selectedTrack,diff)})):allTrackRecords(selectedTrack,chosen);
 const best=rows.filter(r=>r.record).sort((a,b)=>(b.record.bestAccuracy||0)-(a.record.bestAccuracy||0));
 $('bestRecordBadge').textContent=best.length?(gameMode==='duo'?'DUO: ':'RECORDE: ')+best[0].record.bestAccuracy+'% • '+best[0].diff.toUpperCase():'NÃO JOGADO';
 $('setlistRecords').innerHTML=rows.map(({diff,record:r})=>'<div class="record-diff '+(diff===difficulty?'current':'')+'"><h4>'+diff.toUpperCase()+'</h4><b>'+(r?r.bestAccuracy+'%':'—')+'</b><div class="record-score">'+(r?fmtNum(r.bestScore)+' PTS':'SEM RECORDE')+'</div><div class="record-stars">'+(r?'★'.repeat(r.stars||0)+'☆'.repeat(5-(r.stars||0)):'☆☆☆☆☆')+'</div></div>').join('');
 $('recordNote').textContent=(gameMode==='duo'?'DUO LOCAL: Franco na guitarra à esquerda e Ryuchi no baixo à direita, com mapas diferentes tocados ao mesmo tempo. Conecte dois controles PS5 (primeiro = P1; segundo = P2) ou use teclados D F J K / Q W O P. L2 L1 R1 R2 tocam as notas. ✕ ativa o especial. ':'')+(selectedTrack.id==='minha-fonte'?'Minha Fonte: 80 BPM confirmado pelo metrônomo. Ryuchi acompanha a stem isolada de baixo; Franco acompanha as frases instrumentais da stem OTHER, sem usar a bateria como mapa. A stem OTHER não isola apenas a guitarra.':selectedTrack.id==='sem-tu'?'Sem Tu: 70 BPM confirmado pelo metrônomo. O baixo de Ryuchi foi mapeado pela stem isolada; a guitarra do Franco é uma interpretação da stem OTHER (contém outros timbres).':selectedTrack.id==='ruthless'?'Ruthless: baixo mapeado pela stem isolada; guitarra estimada na stem OTHER, que contém outros instrumentos. Recordes separados por dificuldade e personagem.':selectedTrack.provisional?'O mapa desta música foi criado automaticamente e precisa de revisão com stems. Os recordes são separados por instrumento e dificuldade.':'A guitarra e o baixo têm mapas diferentes. Recordes salvos separadamente por música, dificuldade e personagem neste navegador.');
}
function enterSetlist(){startRequest++;song.pause();running=false;clearInputs();show('setlist');renderSetlist()}
$('setlistBack').onclick=()=>show('boot');
$('chooseSetlistTrack').onclick=()=>{activeTrack=selectedTrack;enterSelection()};
$('backToSetlist').onclick=enterSetlist;
document.querySelectorAll('[data-select-character]').forEach(b=>b.onclick=()=>{if(gameMode==='duo')return;chosen=b.dataset.selectCharacter;renderSetlist()});

const sections=[[0,'NEXUS // TRANSMISSÃO'],[26.4,'01 / THE ROAD'],[62,'02 / THE RIFF'],[90,'03 / SEARCHING'],[127,'04 / SOLO'],[171,'OUTRO']];
let seed=7314;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
const stars=Array.from({length:60},()=>({x:rand()*1280,y:rand()*460,s:1+rand()*2.5,a:rand()*.45}));
function audioBlob(){if(songReady)return;
  nexusAudioUrl='./assets/audio/nexus.mp3';
  summertimeAudioUrl='./assets/audio/summertime.mp3';
  ruthlessAudioUrl='./assets/audio/ruthless.mp3';
  semTuAudioUrl='./assets/audio/sem-tu.mp3';
  minhaFonteAudioUrl='./assets/audio/minha-fonte.mp3';
  songReady=true;
}
// Prepare the real uploaded MP3 ahead of interaction; audio playback still starts only after click.
setTimeout(()=>{try{audioBlob()}catch(e){console.error('Could not prepare embedded Nexus audio',e)}},100);
function show(name){screen=name;document.querySelectorAll('.screen').forEach(e=>e.classList.toggle('active',e.id===name));$('playhud').style.display=(name==='playing'||name==='pause')?'block':'none';$('skipBtn').style.display=(name==='playing'&&(gameMode==='duo'?(activeTrack.id==='nexus'&&song.currentTime<24):((activeTrack.id==='nexus'&&song.currentTime<24)||(activeTrack.id==='ruthless'&&chosen==='franco'&&song.currentTime<32)||(activeTrack.id==='sem-tu'&&chosen==='ryuchi'&&song.currentTime<25))))?'block':'none';
 $('sessionBadge').style.display=name==='playing'?'block':'none';
 $('touchPower2').style.display=gameMode==='duo'?'block':'none';
 $('sessionBadge').textContent=practice?'ENSAIO · '+Math.round(sessionSpeed*100)+'% · SEM GAME OVER':'';
 const focusTarget=name==='playing'?canvas:$(name)?.querySelector('button, input, select');
 if(focusTarget)focusTarget.focus({preventScroll:true});
}

function fmtTime(t){t=Math.max(0,Math.floor(t||0));return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')}
function songChart(){return activeTrack.charts[chosen][difficulty]}
function updateSelection(){
 const a=songChart();const count=a.reduce((n,x)=>n+(x[2]===1?2:1),0);
 const instrument=chosen==='franco'?'GUITARRA • GUITAR':'BAIXO • BASS';
 $('noteCount').textContent=gameMode==='duo'?('FRANCO: '+count+' notas · RYUCHI: '+activeTrack.charts.ryuchi[difficulty].reduce((n,x)=>n+(x[2]===1?2:1),0)+' notas · '+(activeTrack.bpm||'AUTO')+' BPM'):(count+' notas • '+instrument+' • '+(activeTrack.bpm||'AUTO')+' BPM');
 $('setupSongTitle').textContent=activeTrack.title+' ♪';$('setupSongMeta').textContent=activeTrack.provisional?'MAPA AUTOMÁTICO • EXPERIMENTAL':'THE WHISTLES • STEM CHART';
 $('playNow').textContent='PLAY '+activeTrack.title+' ►';
 $('soloPracticeBtn').style.display=(gameMode==='solo'&&activeTrack.id==='nexus'&&chosen==='franco')?'inline-block':'none';
}
function compileNotes(chart){
 const all=[];
 for(const n of chart){all.push({t:n[0],lane:n[1],hold:n[2]===2?n[3]:0,hit:false,miss:false});if(n[2]===1)all.push({t:n[0],lane:(n[1]+2)%4,hold:0,hit:false,miss:false})}
 return all.sort((a,b)=>a.t-b.t||a.lane-b.lane);
}
function makeDuoPlayer(artist,index){
 const all=compileNotes(activeTrack.charts[artist][difficulty]);
 return {artist,index,name:artist==='franco'?'FRANCO':'RYUCHI',notes:all,nextMiss:0,maxHits:all.length,score:0,combo:0,bestCombo:0,perfect:0,good:0,misses:0,falsePresses:0,power:0,powerEnd:0,keys:new Set(),sources:Array.from({length:4},()=>new Set()),holds:[],glow:new Float32Array(4),impact:new Float32Array(4),depth:new Float32Array(4),particles:[],flashText:'',flashColor:'#fff',flashUntil:0};
}
function initDuoChart(){
 duoPlayers=[makeDuoPlayer('franco',0),makeDuoPlayer('ryuchi',1)];
 maxHits=duoPlayers[0].maxHits+duoPlayers[1].maxHits;
}
function duoMultiplier(p){return Math.min(4,Math.floor(p.combo/10)+1)*(p.powerEnd>now()?2:1)}
function duoPress(p,lane,source){
 if(!p||screen!=='playing'||song.paused||p.sources[lane].has(source))return;
 const held=p.sources[lane].size>0;
 p.sources[lane].add(source);p.keys.add(lane);p.depth[lane]=Math.max(p.depth[lane],.2);
 if(!held)duoHitLane(p,lane);
}
function duoRelease(p,lane,source){
 if(!p)return;
 p.sources[lane].delete(source);
 if(p.sources[lane].size===0)p.keys.delete(lane);
}
function clearDuoInputs(preserveHolds=false){for(const p of duoPlayers){p.keys.clear();for(const s of p.sources)s.clear();if(!preserveHolds)p.holds=[];p.depth.fill(0)}}
function clearInputs(preserveHolds=false){soloKeyboardHeld.clear();soloPadHeld.clear();pointerTouches.clear();keys.clear();fretPress.fill(0);clearDuoInputs(preserveHolds);if(!preserveHolds)activeHolds=[];}
function duoFlash(p,text,color){p.flashText=text;p.flashColor=color;p.flashUntil=performance.now()+500}
function duoRegisterHit(p,n,delta){
 n.hit=true;const a=Math.abs(delta)/sessionSpeed,tier=a<.06?'PERFECT':a<.118?'GREAT':'GOOD';
 if(tier==='PERFECT')p.perfect++;else p.good++;
 p.combo++;p.bestCombo=Math.max(p.bestCombo,p.combo);
 crowd=Math.min(100,crowd+(tier==='PERFECT'?.55:.40));
 p.power=Math.min(100,p.power+(tier==='PERFECT'?2.3:1.5));
 const gain=Math.round((tier==='PERFECT'?100:tier==='GREAT'?75:50)*duoMultiplier(p));
 p.score+=gain;score=duoPlayers[0].score+duoPlayers[1].score;
 p.glow[n.lane]=1;p.impact[n.lane]=1;
 if(p.particles.length>=12)p.particles.shift();p.particles.push({x:duoLaneX(n.lane,585,p.index),y:585,col:colors[n.lane],birth:performance.now(),tier,score:gain});
 if(n.hold>0)p.holds.push({note:n,end:n.t+n.hold,lane:n.lane});
 duoFlash(p,tier,tier==='PERFECT'?'#ffdf86':'#f3e9dc');
 updateHud(true);
}
function duoRegisterMiss(p,n){
 n.miss=true;p.misses++;p.combo=0;crowd=Math.max(0,crowd-(difficulty==='easy'?1.5:difficulty==='expert'?2.25:1.95));
 if(p.misses%2===0)duoFlash(p,'MISS','#fb6464');
 if(crowd<=0)failShow();
}
function duoHitLane(p,lane){
 const t=now();let closest=null,best=hitWindow();
 p.glow[lane]=Math.max(p.glow[lane],.32);
 for(let i=p.nextMiss;i<p.notes.length;i++){
  const n=p.notes[i];if(n.t>t+hitWindow())break;
  if(n.hit||n.miss||n.skipped||n.lane!==lane)continue;
  const delta=Math.abs(n.t-t);if(delta<best){best=delta;closest=n}
 }
 if(closest)duoRegisterHit(p,closest,t-closest.t);
 else{p.falsePresses++;p.combo=0;crowd=Math.max(0,crowd-(difficulty==='easy'?1.4:difficulty==='expert'?3.0:2.3));p.impact[lane]=.3;if(p.particles.length>=12)p.particles.shift();p.particles.push({x:duoLaneX(lane,585,p.index),y:585,col:'#f66',birth:performance.now(),tier:'EMPTY',score:0});duoFlash(p,'APERTO VAZIO','#f66');if(crowd<=0)failShow();}
}
function duoActivatePower(p){if(!p||screen!=='playing'||p.power<100||p.powerEnd>now())return;p.power=0;p.powerEnd=now()+12;duoFlash(p,'WHISTLE MODE ×2','#dfb9ff');updateHud(true)}
function updateDuoMechanics(dt){
 for(const p of duoPlayers){for(let q=0;q<4;q++){p.glow[q]=Math.max(0,p.glow[q]-dt*2.5);p.impact[q]=Math.max(0,p.impact[q]-dt*4);const down=p.keys.has(q);p.depth[q]+=(Number(down)-p.depth[q])*(1-Math.exp(-(down?35:18)*dt))}}
 if(screen!=='playing'||song.paused)return;
 const t=now();if(song.currentTime>=Math.max(0,(song.duration||activeTrack.duration)-.08)){song.pause();finishGame();return;}
 for(const p of duoPlayers){
  while(p.nextMiss<p.notes.length){const n=p.notes[p.nextMiss];if(n.t>t-.19*sessionSpeed)break;if(!n.hit&&!n.miss&&!n.skipped)duoRegisterMiss(p,n);p.nextMiss++;if(screen!=='playing')return}
  for(let i=p.holds.length-1;i>=0;i--){const h=p.holds[i];if(!p.keys.has(h.lane)&&t<h.end-.12&&t>resumeGraceUntil)p.holds.splice(i,1);else if(t>=h.end){p.score+=75*duoMultiplier(p);p.power=Math.min(100,p.power+3);p.holds.splice(i,1)}}
 }
 score=duoPlayers.reduce((v,p)=>v+p.score,0);
 if(Math.floor(t*5)!==Math.floor(lastHud*5))updateHud();lastHud=t;
}
function updateDuoHud(){
 for(const p of duoPlayers){
  $('duoScore'+p.index).textContent=String(p.score).padStart(6,'0');
  $('duoCombo'+p.index).textContent=p.combo+' COMBO · ×'+duoMultiplier(p);
  $('duoPower'+p.index).textContent=p.powerEnd>now()?'WHISTLE MODE ATIVO '+Math.ceil(p.powerEnd-now())+'s':p.power>=100?'WHISTLE MODE PRONTO ✕':'WHISTLE MODE '+Math.floor(p.power)+'%';
 }
 $('duoCrowdFill').style.width=crowd.toFixed(1)+'%';
 $('duoCrowdFill').style.background=crowd<=25?'#e4453d':'linear-gradient(90deg,#bb382c,#f1c66b,#80bf84)';
 $('duoTeamStatus').textContent=(crowd<=25?'PERIGO • ':crowd>=75?'SHOW EM ALTA • ':'SHOW ESTÁVEL • ')+fmtNum(score)+' PTS';
 $('progress').style.width=(Math.min(100,song.currentTime/(song.duration||activeTrack.duration)*100)).toFixed(2)+'%';
 $('timeNow').textContent=fmtTime(song.currentTime);$('timeTotal').textContent=fmtTime(song.duration||activeTrack.duration);
 $('skipBtn').style.display=gameMode==='duo'&&activeTrack.id==='nexus'&&song.currentTime<24?'block':'none';
}
function finishDuo(){
 if(screen!=='playing')return;
 running=false;
 const hits=duoPlayers.reduce((x,p)=>x+p.perfect+p.good,0);
 const empties=duoPlayers.reduce((x,p)=>x+p.falsePresses,0);
 const accuracy=maxHits+empties?Math.round(hits/(maxHits+empties)*100):0;
 const starCount=accuracy>=96?5:accuracy>=85?4:accuracy>=70?3:accuracy>=50?2:accuracy>=25?1:0;
 score=duoPlayers.reduce((v,p)=>v+p.score,0);
 $('stars').textContent='★'.repeat(starCount)+'☆'.repeat(5-starCount);
 $('finalScore').textContent=fmtNum(score);$('finalAcc').textContent=accuracy+'%';
 $('finalCombo').textContent=Math.max(...duoPlayers.map(p=>p.bestCombo));
 $('resultsSongTitle').textContent=activeTrack.title+' · DUO!';
 let improved=false;
 if(!practice){
  const prev=loadDuoRecord(activeTrack,difficulty)||{};
  improved=accuracy>(prev.bestAccuracy||0)||score>(prev.bestScore||0);
  saveDuoRecord(activeTrack,difficulty,{bestAccuracy:Math.max(accuracy,prev.bestAccuracy||0),bestScore:Math.max(score,prev.bestScore||0),bestCombo:Math.max(...duoPlayers.map(p=>p.bestCombo),prev.bestCombo||0),stars:Math.max(starCount,prev.stars||0),plays:(prev.plays||0)+1,clears:(prev.clears||0)+1,lastPlayed:new Date().toISOString()});
 }
 for(const p of duoPlayers){const hit=p.perfect+p.good;const acc=p.maxHits+p.falsePresses?Math.round(hit/(p.maxHits+p.falsePresses)*100):0;
  $('duoResult'+p.index).innerHTML=p.name+' · '+(p.index===0?'GUITARRA':'BAIXO')+'<div><b>'+acc+'% · '+fmtNum(p.score)+' PTS</b></div><div>COMBO '+p.bestCombo+' · MISS '+p.misses+' · VAZIOS '+p.falsePresses+'</div>';
 }
 $('recordLine').textContent=practice?'TREINO / PULO DE INTRO — RECORDE NÃO SALVO':(improved?'NOVO RECORDE DA DUPLA! • ':'')+'Dois instrumentos · uma música · medidor da banda compartilhado.';
 show('results');
}
function seekPractice(target){
 if(screen!=='playing')return;
 const t=Math.max(0,Math.min(target,(song.duration||activeTrack.duration)-.25));
 song.currentTime=t;practice=true;sessionTraining=true;sessionStart=t;
 clearInputs();
 if(gameMode==='duo'){
  for(const p of duoPlayers){for(const n of p.notes)if(!n.hit&&!n.miss&&!n.skipped&&n.t<t-.175)n.skipped=true;while(p.nextMiss<p.notes.length&&(p.notes[p.nextMiss].hit||p.notes[p.nextMiss].miss||p.notes[p.nextMiss].skipped))p.nextMiss++;p.maxHits=p.notes.filter(n=>!n.skipped).length;}
  maxHits=duoPlayers.reduce((n,p)=>n+p.maxHits,0);
 }else{for(const n of notes)if(!n.hit&&!n.miss&&!n.skipped&&n.t<t-.175)n.skipped=true;while(nextMiss<notes.length&&(notes[nextMiss].hit||notes[nextMiss].miss||notes[nextMiss].skipped))nextMiss++;maxHits=notes.filter(n=>!n.skipped).length;}
 show('playing');updateHud(true);
}
function skipDuoIntro(){if(activeTrack.id==='nexus')seekPractice(24.2)}
function initChart(){notes=compileNotes(songChart());nextMiss=0;maxHits=notes.length;}
function resetStats(){soloKeyboardHeld.clear();soloPadHeld.clear();pointerTouches.clear();score=0;combo=0;bestCombo=0;perfect=0;good=0;misses=0;falsePresses=0;crowd=76;power=0;powerEnd=0;streakNoticeUntil=0;streakNoticeValue=0;particles=[];keys.clear();fretGlow.fill(0);fretImpact.fill(0);fretPress.fill(0);fretDepth.fill(0);activeHolds=[];flash.until=0;lastHud=0;lastTime=0;}
function enterSelection(){if(!song.paused)song.pause();show('setup');updateSelection()}
$('startMenu').onclick=enterSetlist;
document.querySelectorAll('.charcard').forEach(el=>el.onclick=()=>{
 if(gameMode==='duo')return;
 chosen=el.dataset.character;
 document.querySelectorAll('.charcard').forEach(a=>{a.classList.toggle('selected',a===el);a.setAttribute('aria-pressed',a===el?'true':'false')});
 updateSelection();
});
document.querySelectorAll('.diff').forEach(el=>el.onclick=()=>{
 difficulty=el.dataset.diff;
 document.querySelectorAll('.diff').forEach(a=>{a.classList.toggle('selected',a===el);a.setAttribute('aria-pressed',String(a===el))});
 updateSelection();
});
async function startGame(startAt=0,training=false,speed=1){
 const request=++startRequest;
 try{
  sessionStart=Math.max(0,Math.min(Number(startAt)||0,activeTrack.duration-.25));sessionTraining=training||sessionStart>0;sessionSpeed=sessionTraining?Math.max(.5,Math.min(1,Number(speed)||1)):1;
  $('audioError').style.display='none';show('loading');$('loadingMessage').textContent='Carregando '+activeTrack.title+'…';
  audioBlob();song.pause();
  const url=activeTrack.builtIn?(activeTrack.id==='minha-fonte'?minhaFonteAudioUrl:activeTrack.id==='sem-tu'?semTuAudioUrl:activeTrack.id==='ruthless'?ruthlessAudioUrl:activeTrack.id==='summertime'?summertimeAudioUrl:nexusAudioUrl):activeTrack.audioUrl;
  if(!url)throw new Error('Arquivo de áudio indisponível; importe a faixa novamente.');
  if(song.src!==new URL(url,document.baseURI).href){song.src=url;song.load()}
  startAt=sessionStart;song.playbackRate=sessionSpeed;song.preservesPitch=true;
  if('webkitPreservesPitch' in song)song.webkitPreservesPitch=true;
  // Browsers may ignore a seek made before metadata arrives. Repeat it before playback.
  if(song.readyState>=1)song.currentTime=startAt;
  else song.addEventListener('loadedmetadata',()=>{if(request===startRequest)song.currentTime=startAt},{once:true});
  resetStats();resumeGraceUntil=0;practice=sessionTraining;
  if(gameMode==='duo'){
   initDuoChart();
   if(practice){for(const p of duoPlayers){while(p.nextMiss<p.notes.length&&p.notes[p.nextMiss].t<startAt-.17){p.notes[p.nextMiss].skipped=true;p.nextMiss++}p.maxHits=p.notes.length-p.nextMiss}maxHits=duoPlayers.reduce((n,p)=>n+p.maxHits,0)}
  }else{
   initChart();
   if(practice){while(nextMiss<notes.length&&notes[nextMiss].t<startAt-.17){notes[nextMiss].skipped=true;nextMiss++}maxHits=notes.length-nextMiss}
  }
  $('streakBanner').classList.remove('show');$('specialActive').classList.remove('show');
  $('hudTrack').textContent='THE WHISTLES / '+activeTrack.title;
  $('pauseTrackName').textContent=activeTrack.title;
  $('hudCharacter').textContent=chosen==='franco'?'FRANCO, THE SIR!':'RYUCHI';
  $('instrumentHud').textContent=chosen==='franco'?'GUITARRA // GUITAR':'BAIXO // BASS';
  const playPromise=song.play();if(playPromise&&playPromise.then)await playPromise;
  if(request!==startRequest)return;
  if(document.hidden){song.pause();show('pause');return;}
  show('playing');running=true;updateHud(true);
 }catch(e){if(request!==startRequest)return;running=false;song.pause();show('pause');$('audioError').style.display='block';$('audioError').textContent='Não foi possível carregar ou reproduzir o áudio. Verifique a conexão e clique em RESUME. '+e.message;}
}
function restartSession(){return startGame(sessionStart,sessionTraining,sessionSpeed)}
$('playNow').onclick=()=>startGame(0);$('againBtn').onclick=restartSession;$('selectBtn').onclick=enterSetlist;$('soloPracticeBtn').onclick=()=>startGame(54.8,true);
function pauseGame(){if(screen!=='playing')return;song.pause();running=false;clearInputs(true);show('pause')}
async function resumeGame(){if(screen!=='pause')return;const request=++startRequest;show('loading');try{if(song.readyState<1)song.addEventListener('loadedmetadata',()=>{if(request===startRequest)song.currentTime=sessionStart},{once:true});const p=song.play();if(p&&p.then)await p;if(request!==startRequest)return;if(document.hidden){song.pause();show('pause');return;}resumeGraceUntil=now()+.3;running=true;$('audioError').style.display='none';show('playing')}catch(e){if(request!==startRequest)return;show('pause');$('audioError').style.display='block';$('audioError').textContent='Não foi possível reproduzir o áudio: '+e.message}}
$('pauseBtn').onclick=pauseGame;$('resumeBtn').onclick=resumeGame;$('restartBtn').onclick=restartSession;$('menuBtn').onclick=enterSetlist;
$('skipBtn').onclick=()=>{if(gameMode==='duo'){skipDuoIntro();return;}if(activeTrack.id==='nexus')seekPractice(24.2);else if(activeTrack.id==='ruthless'&&chosen==='franco')seekPractice(33.2);else if(activeTrack.id==='sem-tu'&&chosen==='ryuchi')seekPractice(25);};
try { const savedOffset=Number(localStorage.getItem('whistles-nexus-v4-sync')||0);offset=Number.isFinite(savedOffset)?Math.max(-200,Math.min(200,savedOffset)):0; } catch(e) { offset=0; }
$('offset').value=String(offset); $('offsetValue').textContent=(offset>0?'+':'')+offset+' ms';
$('offset').oninput=()=>{offset=Number($('offset').value);$('offsetValue').textContent=(offset>0?'+':'')+offset+' ms';try{localStorage.setItem('whistles-nexus-v4-sync',String(offset))}catch(e){}};
function now(){return song.currentTime+offset/1000}
function comboMultiplier(){return Math.min(4,Math.floor(combo/10)+1)}
function isSpecial(){return powerEnd>0 && now()<powerEnd}
function totalMultiplier(){return comboMultiplier()*(isSpecial()?2:1)}
function noticeStreak(value){streakNoticeValue=value;streakNoticeUntil=performance.now()+2400;$('streakValue').textContent=String(value);$('streakBanner').classList.add('show')}
function failShow(){
 if(screen!=='playing'||practice)return;
 song.pause();running=false;keys.clear();activeHolds=[];clearDuoInputs();
 $('failScore').textContent=score.toLocaleString('pt-BR');$('failMaxCombo').textContent=gameMode==='duo'?Math.max(...duoPlayers.map(p=>p.bestCombo)):bestCombo;
 $('streakBanner').classList.remove('show');$('specialActive').classList.remove('show');show('failed');
}
$('retryFailed').onclick=restartSession;$('menuFailed').onclick=enterSetlist;
function showFlash(text,color){flash={text,color,until:performance.now()+520}}
function registerHit(note,delta){
 note.hit=true;const a=Math.abs(delta)/sessionSpeed;const tier=a<.06?'PERFECT':a<.118?'GREAT':'GOOD';
 if(tier==='PERFECT')perfect++;else good++;
 combo++;bestCombo=Math.max(bestCombo,combo);crowd=Math.min(100,crowd+(tier==='PERFECT'?1.05:tier==='GREAT'?.82:.62));
 if(combo===50||combo===100||combo>=200&&combo%100===0)noticeStreak(combo);
 power=Math.min(100,power+(tier==='PERFECT'?2.3:1.5));
 const mul=totalMultiplier();
 score+=Math.round((tier==='PERFECT'?100:tier==='GREAT'?75:50)*mul);
 showFlash(tier,tier==='PERFECT'?'#ffdf86':'#f2eee2');
 const t=performance.now();const x=laneX(note.lane,607);
 if(particles.length>=18)particles.shift();particles.push({x,y:607,col:colors[note.lane],birth:t,tier,score: Math.round((tier==='PERFECT'?100:tier==='GREAT'?75:50)*mul)});
 fretGlow[note.lane]=1;fretImpact[note.lane]=1;impactCount++;
 if(note.hold>0)activeHolds.push({note,end:note.t+note.hold,lane:note.lane});
 updateHud(true)
}
function registerMiss(note){note.miss=true;misses++;combo=0;crowd=Math.max(0,crowd-(difficulty==='easy'?2.7:difficulty==='expert'?4.0:3.5));if(misses%2===0)showFlash('MISS','#e44a4a');if(crowd<=0)failShow()}
function hitLane(lane){
 if(screen!=='playing'||song.paused)return;
 const t=now();let closest=null,best=hitWindow();
 fretGlow[lane]=Math.max(fretGlow[lane],.32);fretPress[lane]=1;
 for(let i=nextMiss;i<notes.length;i++){
  const n=notes[i];if(n.t>t+hitWindow())break;
  if(n.hit||n.miss||n.skipped||n.lane!==lane)continue;
  const diff=Math.abs(n.t-t);if(diff<best){best=diff;closest=n}
 }
 if(closest){registerHit(closest,t-closest.t)}
 else{falsePresses++;combo=0;crowd=Math.max(0,crowd-(difficulty==='easy'?2.6:difficulty==='expert'?5.4:4.1));if(particles.length>=18)particles.shift();particles.push({x:laneX(lane,607),y:607,col:'#ed4949',birth:performance.now(),tier:'EMPTY'});fretImpact[lane]=.18;showFlash('APERTO VAZIO!','#fa6565');updateHud(true);if(crowd<=0)failShow()}
}
function activatePower(){if(screen!=='playing'||power<100||isSpecial())return;power=0;powerEnd=now()+12.0;showFlash('WHISTLE MODE ×2!', '#f2d2ff');updateHud(true)}
const keyLanes={KeyD:0,KeyF:1,KeyJ:2,KeyK:3};
const pointerTouches=new Map();
function pressSoloPad(lane,index){if(screen!=='playing'||song.paused)return;soloPadHeld.add(lane);keys.add(lane);fretPress[lane]=1;fretDepth[lane]=Math.max(.22,fretDepth[lane]);hitLane(lane)}
function releaseSoloPad(lane){soloPadHeld.delete(lane);if(!soloKeyboardHeld.has(lane)&&![...pointerTouches.values()].some(info=>!info.p&&info.lane===lane)){keys.delete(lane);fretPress[lane]=0}}
function getPads(){try{return navigator.getGamepads?Array.from(navigator.getGamepads()).filter(p=>p&&p.connected):[]}catch(e){return []}}
function padPressed(p,button){const b=p.buttons&&p.buttons[button];return !!(b&&(b.pressed||b.value>.55))}
function connectedPadForSlot(slot,pads=getPads()){return pads.find(p=>p.index===gamepadAssigned[slot])||null}
function padShortName(p){if(!p)return 'Aguardando controle...';return (p.id||'Gamepad '+(p.index+1)).slice(0,68)+(p.mapping&&p.mapping!=='standard'?' · MAPEAMENTO NÃO PADRÃO':'')}
function showPairTarget(slot){pairSlot=slot;manualPairing=true;
 for(let i=0;i<2;i++){
  $('padCard'+i).classList.toggle('active',i===slot);
  const b=document.querySelector('[data-pair-slot="'+i+'"]');if(b)b.classList.toggle('active',i===slot);
 }
 $('padPrompt').textContent='VINCULAR P'+(slot+1)+': pressione ✕ no controle desejado.';
}
function assignPad(index,slot){
 const oldSlot=gamepadAssigned.indexOf(index);
 if(oldSlot===slot){$('padPrompt').textContent='CONTROLE '+(index+1)+' CONFIRMADO NO JOGADOR '+(slot+1)+' ✓';return;}
 if(oldSlot>=0){for(let lane=0;lane<4;lane++)duoRelease(duoPlayers[oldSlot],lane,'pad:'+index);gamepadAssigned[oldSlot]=null}
 const replaced=gamepadAssigned[slot];
 if(replaced!==null){for(let lane=0;lane<4;lane++){duoRelease(duoPlayers[slot],lane,'pad:'+replaced);if(slot===0)releaseSoloPad(lane)}}
 gamepadAssigned[slot]=index;
 $('padPrompt').textContent='CONTROLE '+(index+1)+' VINCULADO AO JOGADOR '+(slot+1)+' ✓';
 refreshControllerStatus(true);
}
function autoAssignPads(pads){
 if(manualPairing&&screen==='controllers')return;
 const used=new Set(gamepadAssigned.filter(i=>i!==null));
 for(const p of pads){if(used.has(p.index))continue;const empty=gamepadAssigned.indexOf(null);if(empty<0)break;gamepadAssigned[empty]=p.index;used.add(p.index)}
}
function refreshControllerStatus(force=false){
 const pads=getPads(),a=connectedPadForSlot(0,pads),b=connectedPadForSlot(1,pads);
 const status=(p,i)=>p?'P'+i+' ✓ '+(p.id||'CONTROLE').slice(0,22):'P'+i+' —';
 const msg='🎮 '+(pads.length?status(a,1)+' · '+status(b,2):'NENHUM CONTROLE · pressione um botão no DualSense')+' · L2 L1 R1 R2';
 for(const id of ['controllerStatus','setupControllerStatus']){const el=$(id);if(el&&(el.textContent!==msg||force))el.textContent=msg}
 if(screen==='controllers')renderControllerPanel(pads);
}
function renderControllerPanel(pads=getPads()){
 for(let slot=0;slot<2;slot++){
  const p=connectedPadForSlot(slot,pads),card=$('padCard'+slot);
  card.classList.toggle('connected',!!p);
  $('padName'+slot).textContent=padShortName(p);
  $('padReady'+slot).textContent=p?'● CONECTADO · CONTROLE '+(p.index+1):'● SEM CONTROLE · PRESSIONE ✕ PARA VINCULAR';
  const tests=$('padTest'+slot).children;
  for(let lane=0;lane<4;lane++)tests[lane].classList.toggle('on',!!p&&padPressed(p,dualSenseFrets[lane]));
 }
}
function openControllerPanel(){
 if(screen==='playing')return; // never interrupt timing by opening a settings modal mid-song
 controllersReturnScreen=screen;
 show('controllers');manualPairing=false;
 showPairTarget(gamepadAssigned[0]===null?0:gamepadAssigned[1]===null?1:0);
 refreshControllerStatus(true);
}
function closeControllerPanel(){
 if(screen!=='controllers')return;
 manualPairing=false;show(controllersReturnScreen);refreshControllerStatus(true);
}
document.querySelectorAll('[data-open-controllers]').forEach(b=>b.onclick=openControllerPanel);
document.querySelectorAll('[data-pair-slot]').forEach(b=>b.onclick=()=>showPairTarget(Number(b.dataset.pairSlot)));
$('closeControllers').onclick=closeControllerPanel;
$('resetPadLinks').onclick=()=>{
 for(let slot=0;slot<2;slot++)for(let lane=0;lane<4;lane++)duoRelease(duoPlayers[slot],lane,'pad:'+gamepadAssigned[slot]);
 gamepadAssigned=[null,null];soloPadHeld.clear();showPairTarget(0);refreshControllerStatus(true)
};
window.addEventListener('gamepadconnected',()=>{refreshControllerStatus(true)});
window.addEventListener('gamepaddisconnected',e=>{
 const index=e.gamepad.index;
 for(let slot=0;slot<2;slot++)if(gamepadAssigned[slot]===index){
  for(let lane=0;lane<4;lane++){duoRelease(duoPlayers[slot],lane,'pad:'+index);if(slot===0)releaseSoloPad(lane)}
  gamepadAssigned[slot]=null;
  if(screen==='playing'&&(gameMode==='duo'||slot===0)){
   pauseGame();$('audioError').textContent='Controle P'+(slot+1)+' desconectado. Reconecte e pressione RESUME.';$('audioError').style.display='block';
  }
 }
 gamepadPrevious.delete(index);refreshControllerStatus(true);
});
function menuGamepadAction(button){
 if(button===0){ // Cross / X
  if(screen==='boot')enterSetlist();
  else if(screen==='setlist'){activeTrack=selectedTrack;enterSelection()}
  else if(screen==='setup')startGame(0);else if(screen==='results'||screen==='failed')restartSession();else if(screen==='help'||screen==='settings')closeOverlay();else if(screen==='rehearsal')$('startRehearsal').click();
  else if(screen==='pause')resumeGame();
 }else if(button===1){ // Circle / O = back
  if(screen==='help'||screen==='settings')closeOverlay();else if(screen==='rehearsal')show('setup');else if(screen==='loading')enterSetlist();else if(screen==='setlist'){$('setlistBack').click()}
  else if(screen==='setup')enterSetlist();
  else if(screen==='pause')enterSetlist();
 }else if(button===12||button===13){ // D-pad up/down
  if(screen==='setlist'){
   const n=catalog.indexOf(selectedTrack),next=(n+(button===12?-1:1)+catalog.length)%catalog.length;
   chooseTrack(catalog[next]);
  }else if(screen==='setup'){
   const options=['easy','normal','expert'],idx=options.indexOf(difficulty);
   document.querySelector('[data-diff="'+options[(idx+(button===12?-1:1)+3)%3]+'"]').click();
  }
 }else if(button===14||button===15){ // D-pad left/right
  if(screen==='setlist')setGameMode(button===14?'solo':'duo');
  else if(screen==='setup'&&gameMode==='solo')document.querySelector('[data-character="'+(button===14?'franco':'ryuchi')+'"]').click();
 }
}
function pollGamepads(ms){
 const pads=getPads(),live=new Map(pads.map(p=>[p.index,p]));
 // Do not silently swap the bassist into the guitarist slot when P1 disconnects.
 for(let slot=0;slot<2;slot++){
  const idx=gamepadAssigned[slot];
  if(idx!==null&&!live.has(idx)){
   for(let lane=0;lane<4;lane++){duoRelease(duoPlayers[slot],lane,'pad:'+idx);if(slot===0)releaseSoloPad(lane)}
   gamepadAssigned[slot]=null;
   if(screen==='playing'&&(gameMode==='duo'||slot===0)){
    pauseGame();$('audioError').textContent='Controle P'+(slot+1)+' desconectado. Reconecte e pressione RESUME.';$('audioError').style.display='block';
   }
  }
 }
 autoAssignPads(pads);
 // Scan every pad, including unassigned pads, so users can bind via Cross in setup.
 for(const p of pads){
  const source='pad:'+p.index,prev=gamepadPrevious.get(p.index)||new Array(18).fill(false);
  const next=Array.from({length:18},(_,i)=>padPressed(p,i));
  const slot=gamepadAssigned.indexOf(p.index);
  if(screen==='controllers'){
   if(next[0]&&!prev[0]){
    assignPad(p.index,pairSlot);
    // advance to the next missing slot after a successful pair
    const free=gamepadAssigned.indexOf(null);
    if(free>=0)showPairTarget(free);
    else manualPairing=true;
   }
  }else if(slot>=0){
   if(screen==='playing'){
    for(let lane=0;lane<4;lane++){
     const b=dualSenseFrets[lane];
     if(next[b]&&!prev[b]){
      if(gameMode==='duo')duoPress(duoPlayers[slot],lane,source);
      else if(slot===0)pressSoloPad(lane,p.index);
     }else if(!next[b]&&prev[b]){
      if(gameMode==='duo')duoRelease(duoPlayers[slot],lane,source);
      else if(slot===0)releaseSoloPad(lane);
     }
    }
    if(next[0]&&!prev[0]){
     if(gameMode==='duo')duoActivatePower(duoPlayers[slot]);else if(slot===0)activatePower();
    }
   }else{
    for(let lane=0;lane<4;lane++){
     if(gameMode==='duo')duoRelease(duoPlayers[slot],lane,source);
     else if(slot===0)releaseSoloPad(lane);
    }
    // Only player 1 controls menu navigation.
    if(slot===0){
     for(const b of [0,1,12,13,14,15])if(next[b]&&!prev[b])menuGamepadAction(b);
    }
   }
   if(next[9]&&!prev[9]&&screen!=='controllers'){
    if(screen==='playing')pauseGame();else if(screen==='pause')resumeGame();
   }
  }
  gamepadPrevious.set(p.index,next);
 }
 for(const index of gamepadPrevious.keys())if(!live.has(index))gamepadPrevious.delete(index);
 if(screen==='controllers')renderControllerPanel(pads);
 if(ms-lastGamepadStatus>650){lastGamepadStatus=ms;refreshControllerStatus()}
}
document.addEventListener('keydown',e=>{
 if(e.target?.matches('input,select,textarea,button')&&screen!=='playing'&&e.code!=='Escape')return;
 const k1=keyLanes[e.code],k2=coopKeyboard[1][e.code];
 if(['Space','ArrowUp','ArrowDown','Escape'].includes(e.code)||k1!==undefined||gameMode==='duo'&&k2!==undefined)e.preventDefault();
 if(e.repeat)return;
 if(e.code==='Escape'||(gameMode==='solo'&&e.code==='KeyP')){if(['help','settings'].includes(screen)){closeOverlay();return;}if(screen==='rehearsal'){show('setup');return;}if(screen==='loading'){enterSetlist();return;}if(screen==='controllers')closeControllerPanel();else if(screen==='playing')pauseGame();else if(screen==='pause')resumeGame();return}
 if(screen==='boot'&&e.code==='Enter'){enterSetlist();return}
 if(screen==='setup'&&e.code==='Enter'){startGame();return}
 if(screen==='results'&&e.code==='Enter'){restartSession();return}
 if(screen!=='playing')return;
 if(gameMode==='duo'){
  if(e.code==='Space'){duoActivatePower(duoPlayers[0]);return}
  if(e.code==='Enter'){duoActivatePower(duoPlayers[1]);return}
  if(k1!==undefined)duoPress(duoPlayers[0],k1,'key:'+e.code);
  if(k2!==undefined)duoPress(duoPlayers[1],k2,'key:'+e.code);
 }else{
  if(e.code==='Space'){activatePower();return}
  if(k1!==undefined){soloKeyboardHeld.add(k1);keys.add(k1);fretPress[k1]=1;fretDepth[k1]=Math.max(.22,fretDepth[k1]);hitLane(k1)}
 }
});
document.addEventListener('keyup',e=>{
 const k1=keyLanes[e.code],k2=coopKeyboard[1][e.code];
 if(gameMode==='duo'){
  if(k1!==undefined)duoRelease(duoPlayers[0],k1,'key:'+e.code);
  if(k2!==undefined)duoRelease(duoPlayers[1],k2,'key:'+e.code);
 }else if(k1!==undefined){soloKeyboardHeld.delete(k1);if(!soloPadHeld.has(k1)&&![...pointerTouches.values()].some(info=>!info.p&&info.lane===k1)){keys.delete(k1);fretPress[k1]=0}}
});
canvas.addEventListener('pointerdown',e=>{
 if(screen!=='playing')return;
 const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*1280,y=(e.clientY-r.top)/r.height*720;
 if(y<460)return;
 if(gameMode==='duo'){
  const slot=x<640?0:1,p=duoPlayers[slot];if(!p)return;
  const cx=slot===0?320:960,w=duoHW(y),lane=Math.floor((x-(cx-w/2))/(w/4));
  if(lane>=0&&lane<4){const source='pointer:'+e.pointerId;duoPress(p,lane,source);pointerTouches.set(e.pointerId,{p,lane,source});try{canvas.setPointerCapture(e.pointerId)}catch(err){}}
 }else{
  const w=hw(y),lane=Math.floor((x-(640-w/2))/(w/4));
  if(lane>=0&&lane<4){keys.add(lane);fretPress[lane]=1;fretDepth[lane]=Math.max(.22,fretDepth[lane]);hitLane(lane);pointerTouches.set(e.pointerId,{lane});try{canvas.setPointerCapture(e.pointerId)}catch(err){}}
 }
},{passive:true});
function releasePointer(e){const info=pointerTouches.get(e.pointerId);if(!info)return;pointerTouches.delete(e.pointerId);
 if(info.p)duoRelease(info.p,info.lane,info.source);
 else if(!soloKeyboardHeld.has(info.lane)&&!soloPadHeld.has(info.lane)&&![...pointerTouches.values()].some(p=>!p.p&&p.lane===info.lane)){keys.delete(info.lane);fretPress[info.lane]=0}
}
canvas.addEventListener('pointerup',releasePointer);canvas.addEventListener('pointercancel',releasePointer);canvas.addEventListener('lostpointercapture',releasePointer);
song.addEventListener('ended',finishGame);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&screen==='playing')pauseGame()});
window.addEventListener('blur',()=>{if(screen==='playing')pauseGame()});
song.addEventListener('error',()=>{if(screen==='playing'){pauseGame();$('audioError').style.display='block';$('audioError').textContent='A reprodução foi interrompida. Verifique sua conexão e retome o show.'}});
function finishGame(){
 if(gameMode==='duo'){finishDuo();return}
 if(screen!=='playing')return;
 running=false;const hit=perfect+good;
 const accuracy=(maxHits+falsePresses)?Math.round(hit/(maxHits+falsePresses)*100):0;
 const starCount=accuracy>=96?5:accuracy>=85?4:accuracy>=70?3:accuracy>=50?2:accuracy>=25?1:0;
 $('stars').textContent='★'.repeat(starCount)+'☆'.repeat(5-starCount);
 $('finalScore').textContent=fmtNum(score);$('finalAcc').textContent=accuracy+'%';$('finalCombo').textContent=bestCombo;
 $('resultsSongTitle').textContent=activeTrack.title+' FINISHED!';
 let newRecord=false;
 if(!practice){const prev=loadRecord(activeTrack,chosen,difficulty)||{};
   newRecord=accuracy>(prev.bestAccuracy||0)||score>(prev.bestScore||0);
   const data={bestAccuracy:Math.max(accuracy,prev.bestAccuracy||0),bestScore:Math.max(score,prev.bestScore||0),bestCombo:Math.max(bestCombo,prev.bestCombo||0),stars:Math.max(starCount,prev.stars||0),plays:(prev.plays||0)+1,clears:(prev.clears||0)+1,lastDifficulty:difficulty,lastPlayed:new Date().toISOString()};
   saveRecord(activeTrack,chosen,difficulty,data);
 }
 $('recordLine').textContent=practice?'MODO TREINO — resultado não foi salvo.':(newRecord?'NOVO RECORDE! • ':'')+'Perfect: '+perfect+' • Great/Good: '+good+' • Miss: '+misses+' • Apertos vazios: '+falsePresses;
 show('results');
}
function updateMechanics(dt){
 if(gameMode==='duo'){updateDuoMechanics(dt);return}
 for(let q=0;q<4;q++){fretGlow[q]=Math.max(0,fretGlow[q]-dt*2.5);fretImpact[q]=Math.max(0,fretImpact[q]-dt*4.0);const target=keys.has(q)?1:0;const speed=keys.has(q)?35:18;fretDepth[q]+= (target-fretDepth[q])*(1-Math.exp(-speed*dt));}
 if(screen!=='playing'||song.paused)return;const t=now();if(song.currentTime>=Math.max(0,(song.duration||activeTrack.duration)-.08)){song.pause();finishGame();return;}while(nextMiss<notes.length){const n=notes[nextMiss];if(n.t>t-.19*sessionSpeed)break;if(!n.hit&&!n.miss&&!n.skipped)registerMiss(n);nextMiss++;if(screen!=='playing')return;}for(let i=activeHolds.length-1;i>=0;i--){const h=activeHolds[i];if(!keys.has(h.lane)&&t<h.end-.12&&t>resumeGraceUntil){activeHolds.splice(i,1)}else if(t>=h.end){score+=75*totalMultiplier();power=Math.min(100,power+3);activeHolds.splice(i,1)}}if(t>=powerEnd&&powerEnd!==0){powerEnd=0}if(Math.floor(t*5)!==Math.floor(lastHud*5))updateHud();lastHud=t}
let hudDirty=true,lastHudPaint=-Infinity;
function updateHud(force=false){
 hudDirty=true;
 if(screen!=='playing'){paintHud();hudDirty=false}
}
function paintHud(){
 $('touchPower1').disabled=gameMode==='duo'?(!duoPlayers[0]||duoPlayers[0].power<100||duoPlayers[0].powerEnd>now()):power<100||isSpecial();
 $('touchPower2').disabled=!duoPlayers[1]||duoPlayers[1].power<100||duoPlayers[1].powerEnd>now();
 if(gameMode==='duo'){updateDuoHud();return}
 $('score').textContent=String(score).padStart(6,'0');
 $('combo').textContent=combo+' COMBO';
 $('multiplier').textContent='×'+totalMultiplier()+' MULTIPLIER'+(isSpecial()?' • SPECIAL':'');
 $('crowdfill').style.width=crowd.toFixed(1)+'%';
 const danger=crowd<=25;
 $('crowdfill').classList.toggle('danger',danger);$('showStatus').classList.toggle('danger',danger);
 $('showStatus').textContent=crowd<=25?'PERIGO':crowd>=75?'EM ALTA':'ESTÁVEL';
 $('powerfill').style.width=power.toFixed(1)+'%';
 $('powerNumber').textContent=isSpecial()?'ATIVO':power>=100?'PRONTO!':Math.floor(power)+'%';
 $('progress').style.width=(Math.min(100,song.currentTime/(song.duration||activeTrack.duration)*100)).toFixed(2)+'%';
 $('timeNow').textContent=fmtTime(song.currentTime);$('timeTotal').textContent=fmtTime(song.duration||activeTrack.duration);
 $('skipBtn').style.display=((activeTrack.id==='nexus'&&song.currentTime<24)||(activeTrack.id==='ruthless'&&chosen==='franco'&&song.currentTime<32)||(activeTrack.id==='sem-tu'&&chosen==='ryuchi'&&song.currentTime<25))?'block':'none';
 const f=performance.now();$('toast').classList.toggle('show',f<flash.until);
 $('toast').textContent=flash.text;$('toast').style.color=flash.color;
 $('streakBanner').classList.toggle('show',f<streakNoticeUntil);
 $('specialActive').classList.toggle('show',isSpecial());
 $('specialSeconds').textContent=isSpecial()?Math.ceil(powerEnd-now())+'s':'';
}
// RENDERING: entirely local Canvas 2D stage, perspective highway and stylised 2006-era show lights.
function poly(points,fill,stroke,lineWidth=1){ctx.beginPath();ctx.moveTo(...points[0]);for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke()}}
function rect(x,y,w,h,fill){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h)}
function circle(x,y,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
function text(s,x,y,size,color,align='left',font='Impact'){ctx.fillStyle=color;ctx.font=`${size}px ${font}`;ctx.textAlign=align;ctx.fillText(s,x,y)}
function drawAmp(x,y,w,h){rect(x+8,y+9,w,h,'#08080a');rect(x,y,w,h,'#383039');rect(x+9,y+10,w-18,h-18,'#121215');for(let j=0;j<3;j++)rect(x+9,y+14+j*(h-30)/3,w-18,1,'#57464a');rect(x+5,y+4,w-10,11,'#554844');text('W',x+w/2,y+15,11,'#d3c6b2','center');for(let k=0;k<2;k++)circle(x+17+k*(w-34),y+h-14,9,'#292629')}
function drawCrowd(ms){for(let j=0;j<40;j++){const side=j<20?0:1;const i=j%20;const x=(side?1000:20)+i*14;const base=688+Math.sin(i*32.3)*20;circle(x,base-55,15,'#08080d');poly([[x-12,base-44],[x+12,base-44],[x+20,730],[x-22,730]],'#07080c');if(i%6===0){const a=Math.sin(ms*.002+i)*23;ctx.strokeStyle='#08080d';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(x,base-42);ctx.lineTo(x+a,base-95);ctx.stroke()}}}
// Offscreen frame buffer: the animated stage needs 30fps, but note highways update every RAF.
// This halves expensive background gradients, characters, and crowd effects.
const stageBuffer=document.createElement('canvas');stageBuffer.width=1280;stageBuffer.height=720;
const stageCtx=stageBuffer.getContext('2d',{alpha:false});
let stageBufferTime=-Infinity,stageBufferKey='';
function renderStageCached(ms,t){
 const key=preferences.effects+'|'+activeTrack.id+'|'+gameMode+'|'+chosen+'|'+(gameMode==='duo'?duoPlayers.length:0);
 if(key!==stageBufferKey||ms-stageBufferTime>=(preferences.effects==='reduced'?100:33)){
  const target=ctx;
  try{ctx=stageCtx;renderStage(preferences.effects==='reduced'?0:ms,preferences.effects==='reduced'?0:t)}finally{ctx=target}
  stageBufferTime=ms;stageBufferKey=key;
 }
 ctx.drawImage(stageBuffer,0,0);
}
function renderStage(ms,t){
 const W=1280,H=720;let g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,activeTrack.id==='minha-fonte'?'#111526':activeTrack.id==='sem-tu'?'#121729':'#0e1119');g.addColorStop(.5,activeTrack.id==='minha-fonte'?'#24253e':activeTrack.id==='sem-tu'?'#30203b':'#30171c');g.addColorStop(.82,activeTrack.id==='minha-fonte'?'#403454':activeTrack.id==='sem-tu'?'#573152':'#6f2628');g.addColorStop(1,'#120b10');rect(0,0,W,H,g);
 let env=activeTrack.id==='minha-fonte'?minhaFonteEnvelope:activeTrack.id==='sem-tu'?semTuEnvelope:activeTrack.id==='ruthless'?ruthlessEnvelope:activeTrack.id==='summertime'?summerEnvelope:envelope;let rms=env[Math.min(env.length-1,Math.floor(Math.max(0,t)))]||.1; const pulse=.45+Math.min(.9,rms*3.1)+.18*Math.sin(t*2*Math.PI*(activeTrack.bpm||118)/60);
 // crude club walls, poster rectangles, wires and speaker stacks
 for(let i=0;i<18;i++){rect(i*79,0,2,440,'#1f1b23');rect(i*79+35,8,1,380,'#241b25')}
 for(const s of stars){rect(s.x,s.y,s.s,s.s,'rgba(255,213,184,'+(s.a*.35)+')')}
 for(let i=0;i<5;i++){const x=120+i*247+Math.sin(ms*.00014+i)*30;poly([[x,0],[x+34,0],[x+140+Math.sin(ms*.0015+i)*65,585],[x-90+Math.sin(ms*.0015+i)*65,585]],`rgba(${i%2?'238,192,102':'220,51,48'},${.034+pulse*.042})`)}
 rect(0,438,1280,25,'#120e13');poly([[0,468],[1280,468],[1280,720],[0,720]],'#2a161a');
 for(let i=0;i<16;i++){poly([[640,460],[i*110-300,720],[i*110-284,720]],'#5b3432');}
 for(let i=0;i<7;i++){const yy=468+i*i*6;rect(0,yy,1280,1,'#653532')}
 // props placed behind character silhouettes
 drawAmp(48,320,170,228);drawAmp(1070,300,172,252);drawAmp(229,381,104,170);drawAmp(953,370,110,175);
 rect(542,283,200,15,'#222227');circle(643,385,89,'#191a23');circle(643,385,77,'#34313a');circle(643,385,67,'#8a3134');circle(643,385,58,'#252129');text('W',643,409,84,'#e5c5a7','center');
 circle(547,298,50,'#2f262b');circle(736,298,50,'#2f262b');rect(517,270,254,12,'#cbb087');
 for(let i=0;i<4;i++){rect(540+i*51,224,3,59,'#92939a');}
 // animated players: use the PS2 character art cropped from approved concept sheet
 const beat=Math.sin(t*2*Math.PI*(activeTrack.bpm||118)/60), bob=beat*5;
 const leftImg=gameMode==='duo'||chosen==='franco'?charSprites.franco:charSprites.ryuchi;const rightImg=gameMode==='duo'||chosen==='franco'?charSprites.ryuchi:charSprites.franco;
 function musician(im,x,y,scale,phase){if(!im.complete||!im.naturalWidth)return;ctx.save();ctx.translate(x,y+Math.sin(t*4+phase)*5);ctx.rotate(.018*Math.sin(t*4+phase));const w=im.naturalWidth*scale,h=im.naturalHeight*scale;ctx.shadowColor='#000';ctx.shadowBlur=24;ctx.shadowOffsetY=5;ctx.drawImage(im,-w/2,-h,w,h);ctx.restore()}
 musician(leftImg,380,577,1.13,0);musician(rightImg,904,573,1.09,2.1);
 // screens/poster / overexposed CRT projector
 ctx.globalAlpha=.6;rect(388,75,504,120,'#160f16');ctx.globalAlpha=1; text(activeTrack.id==='minha-fonte'?'THE WHISTLES · MINHA FONTE':activeTrack.id==='summertime'?'THE WHISTLES · SUMMERTIME':activeTrack.id==='ruthless'?'THE WHISTLES · RUTHLESS':'THE WHISTLES',640,157,activeTrack.id==='nexus'?71:activeTrack.id==='minha-fonte'?41:51,'#dec2a9','center');rect(482,172,320,4,'#b63530');
 drawCrowd(ms);
 ctx.save();ctx.globalAlpha=.9;rect(58,235,218,35,'#140e13aa');rect(1008,235,210,35,'#140e13aa');
 text(gameMode==='duo'||chosen==='franco'?'FRANCO / GUITAR':'RYUCHI / BASS',166,259,18,'#f1d8c0','center');
 text(gameMode==='duo'||chosen==='franco'?'RYUCHI / BASS':'FRANCO / GUITAR',1108,259,18,'#e6c7ab','center');ctx.restore();
 if(isSpecial()){ctx.fillStyle='rgba(224,188,255,.055)';ctx.fillRect(0,0,1280,720)}
}
function hw(y){let p=(y-166)/(720-166);return 165+p*670}
function laneX(lane,y){return 640+(lane-1.5)*hw(y)/4}
// Rhythm highway V4 — all positions are computed from the AUDIO clock; no frame-step drift.
// V3: raised, metal-rimmed fret keys, physical press animation, and instrumental note discs.
const travelSeconds=2.24;
function travelTime(){return travelSeconds*sessionSpeed}
function hitWindow(){return .175*sessionSpeed}
function noteXY(n,t){
 const top=154,hit=605,p=1-(n.t-t)/travelTime();
 if(p<-.04||p>1.12)return null;
 const y=top+Math.pow(Math.max(0,p),1.50)*(hit-top);
 return {x:laneX(n.lane,y),y,p,rx:Math.max(9.5,hw(y)/4*.315)};
}
function ell(x,y,rx,ry,fill,stroke=null,width=1){
 ctx.beginPath();ctx.ellipse(x,y,Math.max(1,rx),Math.max(1,ry),0,0,Math.PI*2);
 if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}
}
function gradientVertical(y,half,stops){const g=ctx.createLinearGradient(0,y-half,0,y+half);stops.forEach(([p,col])=>g.addColorStop(p,col));return g}
const noteDiscSprites=new Map();
function drawCachedSprite(cache,key,rx,halfHeight,margin,painter){
 let tile=cache.get(key);
 if(!tile){
  tile=document.createElement('canvas');
  tile.width=Math.ceil((rx+margin)*2);tile.height=Math.ceil((halfHeight+margin)*2);
  const old=ctx;
  try{ctx=tile.getContext('2d');painter(tile.width/2,tile.height/2)}finally{ctx=old}
  cache.set(key,tile);
 }
 return tile;
}
function drawNoteDisc(x,y,rx,col,glow=0){
 const r=Math.max(9,Math.round(rx/2)*2),hasGlow=glow>.05;
 const key=col+'|'+r+'|'+(hasGlow?1:0);
 const tile=drawCachedSprite(noteDiscSprites,key,r,r*.39,40,(tx,ty)=>drawNoteDiscRaw(tx,ty,r,col,hasGlow?.3:0));
 const scale=rx/r;
 ctx.drawImage(tile,x-tile.width*scale/2,y-tile.height*scale/2,tile.width*scale,tile.height*scale);
}
function drawNoteDiscRaw(x,y,rx,col,glow=0){
 // PS2-inspired low-polygon 3D piece: layered extruded front wall and chromed bezel.
 const ry=rx*.39;
 ctx.save();ctx.shadowBlur=5+8*glow;ctx.shadowColor='#000';
 ell(x+1,y+6,rx+3,ry+4,'#050609');ctx.shadowBlur=0;
 const metalWall=gradientVertical(y+2,ry+9,[[0,'#b7b3ad'],[.25,'#67666d'],[.7,'#29272e'],[1,'#0a0a0e']]);
 for(let d=8;d>=3;d-=1.6)ell(x,y+d,rx,ry,metalWall);
 ell(x,y+1,rx+2,ry+3,gradientVertical(y,ry+3,[[0,'#fff8ed'],[.18,'#afaaa7'],[.5,'#77727a'],[.8,'#27252e'],[1,'#0b0a10']]));
 // dark ring between polished steel and inset colored enamel
 ell(x,y-1,rx-3,Math.max(4,ry-2),'#0e0e12');
 const cap=gradientVertical(y-3,ry-3,[[0,'#ffffff'],[.13,col],[.48,col],[.76,'#27202a'],[1,'#090b11']]);
 ell(x,y-3,rx-5,Math.max(3,ry-5),cap,'#d2d0c8',1.1);
 ctx.globalAlpha=.58;
 ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(1,rx*.045);ctx.beginPath();ctx.ellipse(x,y-5,rx*.67,ry*.47,0,3.4,5.9);ctx.stroke();
 ctx.globalAlpha=.24;ell(x-rx*.28,y-ry*.28,rx*.22,Math.max(2,ry*.16),'#fff');
 if(glow>.01){ctx.globalAlpha=Math.min(.7,glow*.7);ctx.shadowColor=col;ctx.shadowBlur=26*glow;ell(x,y-3,rx-5,ry-5,null,'#fff8d8',1.5+2*glow)}
 ctx.restore();
}
const fretPadSprites=new Map();
function drawFretPad(x,y,rx,col,depth,pulse){
 const r=Math.max(8,Math.round(rx)),step=Math.round(Math.max(0,Math.min(1,depth))*6)/6;
 const key=col+'|'+r+'|'+step;
 const tile=drawCachedSprite(fretPadSprites,key,r,r*.37,62,(tx,ty)=>drawFretPadRaw(tx,ty,r,col,step,0));
 const scale=rx/r;
 ctx.drawImage(tile,x-tile.width*scale/2,y-tile.height*scale/2,tile.width*scale,tile.height*scale);
 // The fast animated impact glow is drawn separately over the cached 3D key.
 if(pulse>.05){
  ctx.save();ctx.globalAlpha=Math.min(.8,pulse);
  ctx.shadowColor=col;ctx.shadowBlur=12+12*pulse;
  const topY=y-16+17*depth;
  ell(x,topY,rx+3+pulse*3,rx*.37+2+pulse*2,null,'#fff7e5',1.2+pulse);
  ctx.restore();
 }
}
function drawFretPadRaw(x,y,rx,col,depth,pulse){
 const ry=rx*.37;
 ctx.save();
 // fixed opening / inset black socket and steel mount, not moving with key cap
 ell(x,y+12,rx+13,ry+12,'#05050a');
 ell(x,y+9,rx+9,ry+8,gradientVertical(y+8,ry+10,[[0,'#ece5dc'],[.2,'#77747a'],[.65,'#29252d'],[1,'#111017']]));
 ell(x,y+7,rx+5,ry+5,'#090b12');
 if(pulse>.05){ctx.globalAlpha=Math.min(.62,pulse*.5);ctx.shadowColor=col;ctx.shadowBlur=26;ell(x,y+7,rx+4,ry+4,col);ctx.shadowBlur=0;ctx.globalAlpha=1}
 // key cap moves DOWN inside its permanent bezel: raised -16, fully depressed +2.
 const topY=y-16+17*depth;
 const travel=8*(1-depth)+4;
 // revealed side wall is thick when released and almost disappears when held down
 for(let z=travel;z>0;z-=1.55){
  const g=gradientVertical(topY+z,ry,[[0,'#bab8b0'],[.18,'#6d6d73'],[.52,'#39333a'],[1,'#17151d']]);
  ell(x,topY+z,rx+1,ry,g)
 }
 // retaining metallic rim / chrome
 ell(x,topY,rx+2,ry+2,gradientVertical(topY,ry+4,[[0,'#f5f0e6'],[.17,'#aca5a1'],[.43,'#605960'],[.73,'#24222c'],[1,'#111118']]));
 ell(x,topY-1,rx-3,ry-3,'#1a171e');
 const face=gradientVertical(topY-3,ry-3,[[0,depth>.70?'#f6f0e8':'#ffffff'],[.13,col],[.48,col],[.74,'#2f2931'],[1,'#101015']]);
 ell(x,topY-3,rx-6,ry-6,face,'#bcb9b1',1.6);
 ctx.save();ctx.beginPath();ctx.ellipse(x,topY-3,rx-7,Math.max(2,ry-7),0,0,Math.PI*2);ctx.clip();
 const glint=ctx.createLinearGradient(x-rx,topY-ry,x+rx,topY+ry);
 glint.addColorStop(0,'#ffffffa5');glint.addColorStop(.22,'#ffffff20');glint.addColorStop(.5,'#ffffff00');glint.addColorStop(.84,'#00000030');
 ctx.fillStyle=glint;ctx.fillRect(x-rx,topY-ry,rx*2,ry*2);ctx.restore();
 // a small white reflection arc gives these pieces the appearance of dense polished hardware
 ctx.globalAlpha=.62;ctx.strokeStyle='#fff4db';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,topY-4,rx*.72,Math.max(3,ry*.50),0,Math.PI*1.05,Math.PI*1.88);ctx.stroke();ctx.globalAlpha=1;
 if(pulse>.03){ctx.globalAlpha=Math.min(.85,pulse);ctx.shadowBlur=15+22*pulse;ctx.shadowColor=col;
 ell(x,topY,rx+4+pulse*6,ry+2+pulse*3,null,'#fff7e5',1.4+2*pulse);ctx.shadowBlur=0;ctx.globalAlpha=1}
 ctx.restore();
}
function drawSustain(n,shape,t){
 if(!(n.hold>0))return;
 const tail=noteXY({t:n.t+n.hold,lane:n.lane},t);
 const y0=Math.max(154,tail?Math.min(tail.y,605):154),y1=Math.min(605,shape.y);
 if(y1<=y0)return;
 const x0=laneX(n.lane,y0),r0=Math.max(4,hw(y0)/4*.11),r1=Math.max(8,hw(y1)/4*.11);
 const grad=ctx.createLinearGradient(x0,y0,shape.x,y1);
 grad.addColorStop(0,colors[n.lane]+'21');grad.addColorStop(.55,colors[n.lane]+'82');grad.addColorStop(1,colors[n.lane]+'e5');
 poly([[x0-r0,y0],[x0+r0,y0],[shape.x+r1,y1],[shape.x-r1,y1]],grad);
 ctx.strokeStyle='#f6eee478';ctx.lineWidth=1.6;
 ctx.beginPath();ctx.moveTo(x0-r0*.8,y0);ctx.lineTo(shape.x-r1*.8,y1);ctx.moveTo(x0+r0*.8,y0);ctx.lineTo(shape.x+r1*.8,y1);ctx.stroke();
}
// DUO: two complete, independent four-fret highways, sharing an audio clock.
function duoHW(y){return 112+(y-170)/(720-170)*382}
function duoLaneX(lane,y,index){return (index===0?320:960)+(lane-1.5)*duoHW(y)/4}
function duoNoteXY(n,t,index){
 const top=170,hit=585,v=1-(n.t-t)/travelTime();
 if(v<-.04||v>1.15)return null;
 const y=top+Math.pow(Math.max(0,v),1.5)*(hit-top);
 return {x:duoLaneX(n.lane,y,index),y,rx:Math.max(8,duoHW(y)/4*.31)};
}
function duoSustain(n,shape,t,index){
 if(n.hold<=0)return;
 const tail=duoNoteXY({t:n.t+n.hold,lane:n.lane},t,index);
 const y0=Math.max(170,tail?Math.min(tail.y,585):170),y1=Math.min(585,shape.y);
 if(y1<=y0)return;
 const x0=duoLaneX(n.lane,y0,index),r0=Math.max(4,duoHW(y0)/4*.11),r1=Math.max(6,duoHW(y1)/4*.11);
 const grd=ctx.createLinearGradient(x0,y0,shape.x,y1);
 grd.addColorStop(0,colors[n.lane]+'24');grd.addColorStop(.5,colors[n.lane]+'9a');grd.addColorStop(1,colors[n.lane]+'e9');
 poly([[x0-r0,y0],[x0+r0,y0],[shape.x+r1,y1],[shape.x-r1,y1]],grd);
}
function renderDuoHighway(p,t,ms){
 const cx=p.index===0?320:960,top=170,bottom=733,hitY=585,powerOn=p.powerEnd>t;
 const accent=p.index===0?'#d98372':'#80bbec';
 ctx.save();ctx.beginPath();ctx.rect(cx-308,140,616,575);ctx.clip();
 ctx.shadowColor='#000';ctx.shadowBlur=26;
 poly([[cx-duoHW(top)/2-9,top],[cx+duoHW(top)/2+9,top],[cx+duoHW(bottom)/2+10,bottom],[cx-duoHW(bottom)/2-10,bottom]],'#0b0b11',accent,5);
 ctx.shadowBlur=0;
 for(let lane=0;lane<4;lane++){
  const xl=cx-duoHW(top)/2+lane*duoHW(top)/4,xr=cx-duoHW(top)/2+(lane+1)*duoHW(top)/4;
  const bl=cx-duoHW(bottom)/2+lane*duoHW(bottom)/4,br=cx-duoHW(bottom)/2+(lane+1)*duoHW(bottom)/4;
  let fill=ctx.createLinearGradient(bl,0,br,0);
  fill.addColorStop(0,'#0a0b11');fill.addColorStop(.5,lane%2?'#1c1c25':'#252027');fill.addColorStop(1,'#0a0b11');
  poly([[xl,top],[xr,top],[br,bottom],[bl,bottom]],fill);
  if(p.keys.has(lane)||p.glow[lane]>.06){ctx.globalAlpha=.10+.13*p.glow[lane];poly([[xl,top],[xr,top],[br,bottom],[bl,bottom]],colors[lane]);ctx.globalAlpha=1}
 }
 const beatLength=60/(activeTrack.bpm||118);
 for(let n=-1;n<16;n++){
  const tick=Math.floor(t/beatLength)+n,dt=tick*beatLength-t,v=1-dt/travelTime();
  if(v<=0||v>=1.25)continue;
  const y=top+Math.pow(v,1.5)*(hitY-top);
  rect(cx-duoHW(y)/2,y,duoHW(y),tick%4===0?2.6:1.4,tick%4===0?'#eac8a57d':'#a9a5a052');
 }
 for(let lane=0;lane<=4;lane++){
  const xx=cx-duoHW(top)/2+lane*duoHW(top)/4,xx2=cx-duoHW(bottom)/2+lane*duoHW(bottom)/4;
  ctx.strokeStyle=lane===0||lane===4?accent:'#77717b';ctx.lineWidth=lane===0||lane===4?2.6:1.3;
  ctx.beginPath();ctx.moveTo(xx,top);ctx.lineTo(xx2,bottom);ctx.stroke();
 }
 rect(cx-duoHW(hitY)/2,hitY-8,duoHW(hitY),13,'#0b0b11');
 ctx.shadowColor=powerOn?'#da95ff':'#f4d7b8';ctx.shadowBlur=14;
 rect(cx-duoHW(hitY)/2,hitY-8,duoHW(hitY),3,powerOn?'#e1bbff':'#efdbc5');ctx.shadowBlur=0;
 const visible=[];
 for(let i=p.nextMiss;i<p.notes.length;i++){
  const n=p.notes[i],dt=n.t-t;
  if(dt>travelTime()+.06)break;
  if(dt<-.23||n.hit||n.miss||n.skipped)continue;
  visible.push(n);
 }
 for(let i=visible.length-1;i>=0;i--){
  const n=visible[i],shape=duoNoteXY(n,t,p.index);if(!shape)continue;
  duoSustain(n,shape,t,p.index);
  drawNoteDisc(shape.x,shape.y,shape.rx,colors[n.lane],powerOn?.3:0);
 }
 for(const hold of p.holds){if(hold.end<t||hold.note.miss)continue;
  duoSustain({t,hold:hold.end-t,lane:hold.lane},{x:duoLaneX(hold.lane,hitY,p.index),y:hitY,rx:duoHW(hitY)/4*.31},t,p.index);
 }
 for(let lane=0;lane<4;lane++){
  const x=duoLaneX(lane,hitY,p.index),rx=duoHW(hitY)/4*.31;
  drawFretPad(x,hitY+14,rx,colors[lane],p.depth[lane],Math.max(p.glow[lane],p.impact[lane]));
  text(['L2','L1','R1','R2'][lane],x,hitY+77,17,'#f2e6d9','center');
 }
 for(let i=p.particles.length-1;i>=0;i--){
  const particle=p.particles[i],age=(ms-particle.birth)/1000,limit=particle.tier==='EMPTY'?.2:.44;
  if(age>limit){p.particles.splice(i,1);continue}
  const fade=1-age/limit;
  ctx.save();ctx.globalAlpha=fade*.8;ctx.strokeStyle=particle.col;ctx.shadowColor=particle.col;ctx.shadowBlur=15;
  ctx.lineWidth=2.5+fade*2;ctx.beginPath();ctx.ellipse(particle.x,particle.y,23+(1-fade)*80,9+(1-fade)*40,0,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 if(ms<p.flashUntil){ctx.save();ctx.shadowColor='#000';ctx.shadowBlur=10;text(p.flashText,cx,290,29,p.flashColor,'center');ctx.restore();}
 ctx.restore();
}
function renderDuo(t,ms){
 for(const p of duoPlayers)renderDuoHighway(p,t,ms);
 // One shared show, two independent instruments and lane sets.
 ctx.save();rect(633,151,14,562,'#080910dc');rect(638,160,4,540,'#dd9d8a66');ctx.restore();
}
function renderHighway(t,ms){
 const top=154,bottom=748,hitY=605,powerOn=t<powerEnd;
 ctx.save();ctx.shadowBlur=25;ctx.shadowColor='#000';
 poly([[640-hw(top)/2-11,top],[640+hw(top)/2+11,top],[640+hw(bottom)/2+15,bottom],[640-hw(bottom)/2-15,bottom]],'#0c0b10','#ac9790',7);ctx.restore();
 for(let lane=0;lane<4;lane++){
  const xl=640-hw(top)/2+lane*hw(top)/4,xr=640-hw(top)/2+(lane+1)*hw(top)/4;
  const bl=640-hw(bottom)/2+lane*hw(bottom)/4,br=640-hw(bottom)/2+(lane+1)*hw(bottom)/4;
  const lit=keys.has(lane)||fretGlow[lane]>.06;
  let stripe=ctx.createLinearGradient(bl,0,br,0);
  stripe.addColorStop(0,'#0a0b11');stripe.addColorStop(.20,lane%2?'#1f2229':'#242228');stripe.addColorStop(.78,lane%2?'#24272e':'#2a2529');stripe.addColorStop(1,'#08090e');
  poly([[xl,top],[xr,top],[br,bottom],[bl,bottom]],stripe);
  if(lit){ctx.globalAlpha=.09+.12*fretGlow[lane];poly([[xl,top],[xr,top],[br,bottom],[bl,bottom]],colors[lane]);ctx.globalAlpha=1}
 }
 // frets anchored to the same BPM timebase as the music
 const beatLength=60/(activeTrack.bpm||118),anchor=activeTrack.id==='minha-fonte'?0:activeTrack.id==='sem-tu'?0:activeTrack.id==='ruthless'?0.01:activeTrack.id==='summertime'?6.211:29.9918;
 for(let n=-1;n<20;n++){
  const ix=Math.floor((t-anchor)/beatLength)+n;
  const dt=anchor+ix*beatLength-t,p=1-dt/travelTime();
  if(p<=0||p>=1.24)continue;
  const yy=top+Math.pow(p,1.5)*(hitY-top);
  rect(640-hw(yy)/2,yy,hw(yy),ix%4===0?3:1.5,ix%4===0?'#e5c8aa7a':'#d7bca64f');
 }
 for(let lane=0;lane<=4;lane++){
  ctx.strokeStyle=lane===0||lane===4?'#c6a8a1':'#69626b';ctx.lineWidth=lane===0||lane===4?3:2;
  ctx.beginPath();ctx.moveTo(640-hw(top)/2+lane*hw(top)/4,top);ctx.lineTo(640-hw(bottom)/2+lane*hw(bottom)/4,bottom);ctx.stroke();
 }
 rect(640-hw(hitY)/2,hitY-8,hw(hitY),15,'#090a0f');
 ctx.save();ctx.shadowColor=powerOn?'#e4c5fc':'#d5bfa4';ctx.shadowBlur=17;
 rect(640-hw(hitY)/2,hitY-8,hw(hitY),3,powerOn?'#e8cbff':'#f3dcc2');ctx.restore();
 // accurate audio-clock projection; draw distant notes first
 const visible=[];
 for(let i=nextMiss;i<notes.length;i++){
  const n=notes[i],dt=n.t-t;if(dt>travelTime()+.06)break;
  if(dt<-.25||n.hit||n.miss||n.skipped)continue;visible.push(n);
 }
 for(let i=visible.length-1;i>=0;i--){
  const n=visible[i],shape=noteXY(n,t);if(!shape)continue;
  drawSustain(n,shape,t);drawNoteDisc(shape.x,shape.y,shape.rx,colors[n.lane],powerOn?.3:0);
 }
 // sustain stays anchored to the fret until held note ends
 for(const h of activeHolds){
  if(h.end<t||h.note.miss)continue;
  const shape={x:laneX(h.lane,hitY),y:hitY,rx:hw(hitY)/4*.32};
  drawSustain({t,hold:h.end-t,lane:h.lane},shape,t);
 }
 // Real moving keycap. Keyboard and touch both update keys Set.
 for(let lane=0;lane<4;lane++){
  const x=laneX(lane,hitY),rx=hw(hitY)/4*.32,depth=fretDepth[lane];
  const pulse=Math.max(fretGlow[lane],fretImpact[lane]);
  drawFretPad(x,hitY+17,rx,colors[lane],depth,pulse);
  ctx.save();ctx.shadowColor='#060709';ctx.shadowBlur=4;
  text(['D','F','J','K'][lane],x,hitY+83,20,'#eee4d9','center');ctx.restore();
 }
 // physical hit shockwaves disappear with time, not frame count
 for(let i=particles.length-1;i>=0;i--){
  const p=particles[i],age=(ms-p.birth)/1000,max=p.tier==='EMPTY'?.18:.48;
  if(age>max){particles.splice(i,1);continue}
  const u=Math.max(0,age/max),fade=1-u;
  ctx.save();
  if(p.tier==='EMPTY'){
   ctx.globalAlpha=.20*fade;ctx.strokeStyle='#bcb2a8';ctx.lineWidth=2;
   ctx.beginPath();ctx.ellipse(p.x,p.y+10,25+40*u,11+15*u,0,0,Math.PI*2);ctx.stroke();
  }else{
   ctx.globalAlpha=.8*fade;ctx.strokeStyle='#fff4dc';ctx.lineWidth=2.5+3*fade;
   ctx.shadowColor=p.col;ctx.shadowBlur=18;
   ctx.beginPath();ctx.ellipse(p.x,p.y+10,28+110*u,12+44*u,0,0,Math.PI*2);ctx.stroke();
   const count=p.tier==='PERFECT'?19:12;
   for(let j=0;j<count;j++){
    const ang=(j*2.39996+p.birth*.001)%6.283185;
    const speed=38+(j%6)*11;
    const px=p.x+Math.cos(ang)*(18+u*speed),py=p.y+Math.sin(ang)*(15+u*speed*.55);
    ctx.fillStyle=j%4?'#ffecd5':p.col;ctx.fillRect(px,py,Math.max(1,4*fade),Math.max(1,4*fade));
   }
   ctx.shadowBlur=0;ctx.globalAlpha=fade; text('+'+p.score,p.x,p.y-40-63*u,18+4*fade,'#fff3d9','center');
  }
  ctx.restore();
 }
}

function renderMenuScene(ms){let t=ms/1000;renderStageCached(ms,t);ctx.fillStyle='rgba(17,8,14,.48)';ctx.fillRect(0,0,1280,720)}
function frame(ms){
 const dt=Math.min(.07,(ms-lastRendered)/1000||.016);lastRendered=ms;
 pollGamepads(ms);
 if(screen==='playing')updateMechanics(dt);
 const t=(screen==='playing'||screen==='pause'||screen==='results')?now():ms/1000;
 ctx.clearRect(0,0,1280,720);
 if(screen==='playing'||screen==='pause'){
  renderStageCached(ms,Math.max(0,t));
  if(gameMode==='duo')renderDuo(Math.max(0,t),ms);else renderHighway(Math.max(0,t),ms);
  if(screen==='playing'&&(hudDirty||ms-lastHudPaint>180)&&ms-lastHudPaint>=85){
   paintHud();hudDirty=false;lastHudPaint=ms;
  }
 }else renderMenuScene(ms);
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Local music imports. Automated onset charts are explicitly drafts, not instrument transcriptions.
function makeProvisionalCharts(audioBuffer){
 const sr=audioBuffer.sampleRate,ch=audioBuffer.getChannelData(0),hop=2048,n=Math.ceil(ch.length/hop),energy=new Float32Array(n);
 for(let k=0;k<n;k++){let sum=0;const a=k*hop,b=Math.min(ch.length,a+hop);for(let i=a;i<b;i+=3)sum+=ch[i]*ch[i];energy[k]=Math.sqrt(sum/Math.max(1,(b-a)/3))}
 const peaks=[],minimum=Math.max(.005,energy.reduce((max,value)=>Math.max(max,value),0)*.035);
 for(let k=4;k<n-4;k++){const e=energy[k],prev=(energy[k-1]+energy[k-2]+energy[k-3])/3;
  if(k*hop/sr<2||k*hop/sr>audioBuffer.duration-2||e<minimum||e<prev*1.20||e<=energy[k-1]||e<energy[k+1])continue;
  const t=k*hop/sr;if(peaks.length&&t-peaks[peaks.length-1].t<.105)continue;
  peaks.push({t,amp:e});
 }
 const out={franco:{},ryuchi:{}};
 for(const character of ['franco','ryuchi'])for(const [diff,minGap,maxPerBar] of [['easy',.36,4],['normal',.22,6],['expert',.14,9]]){
  const result=[],bars=new Map();for(const p of peaks){const bar=Math.floor(p.t/2.1);let b=bars.get(bar);if(!b){b=[];bars.set(bar,b)}if(b.length>=maxPerBar)continue;
   if(result.length&&p.t-result[result.length-1][0]<minGap)continue;
   const lane=(result.length*3+Math.floor(p.t*1.6))%4;result.push([Math.round(p.t*1000)/1000,lane,0,0]);b.push(p)
  }out[character][diff]=result;
 }
 return out;
}
let musicDB=null;
function openMusicDB(){return new Promise((resolve,reject)=>{try{const req=indexedDB.open('the-whistles-songs-v5',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('songs'))req.result.createObjectStore('songs',{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)}catch(e){reject(e)}})}
async function persistTrack(track,file){try{if(!musicDB)musicDB=await openMusicDB();await new Promise((resolve,reject)=>{const tx=musicDB.transaction('songs','readwrite');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Armazenamento cancelado'));tx.objectStore('songs').put({id:track.id,title:track.title,bpm:track.bpm,duration:track.duration,charts:track.charts,audio:file});});return true}catch(e){return false}}
async function restoreTracks(){try{musicDB=await openMusicDB();const tx=musicDB.transaction('songs','readonly'),req=tx.objectStore('songs').getAll();req.onsuccess=()=>{for(const v of req.result||[]){if(catalog.some(t=>t.id===v.id))continue;catalog.push({id:v.id,title:v.title,bpm:v.bpm,duration:v.duration,charts:v.charts,audioUrl:URL.createObjectURL(v.audio),provisional:true})}if(screen==='setlist')renderSetlist()}}catch(e){}}
restoreTracks();
$('importAudio').onchange=async e=>{
 const file=e.target.files&&e.target.files[0];if(!file)return;
 const label=document.querySelector('.import-btn'),orig=label.textContent;label.textContent='ANALISANDO ÁUDIO...';
 try{
  if(file.size>55*1024*1024)throw Error('Arquivo acima de 55 MB. Envie um MP3 mais leve.');
  const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)throw Error('Navegador sem decodificação de áudio.');
  const ctxAudio=new Ctx();const array=await file.arrayBuffer();const buffer=await ctxAudio.decodeAudioData(array.slice(0));const charts=makeProvisionalCharts(buffer);await ctxAudio.close();
  const title=file.name.replace(/\.[^.]+$/,'').trim().slice(0,45)||'NOVA FAIXA';
  const id='import-'+Array.from(new Uint8Array(array.slice(0,80))).reduce((a,b)=>(a*31+b)>>>0,7).toString(16)+'-'+file.size;
  const existing=catalog.find(x=>x.id===id);if(existing){chooseTrack(existing);label.textContent='FAIXA JÁ ADICIONADA';setTimeout(()=>label.textContent=orig,2500);return}
  const track={id,title,bpm:null,duration:buffer.duration,charts,audioUrl:URL.createObjectURL(file),provisional:true};catalog.push(track);selectedTrack=track;
  const saved=await persistTrack(track,file);label.textContent=saved?'MÚSICA ADICIONADA ✓':'MÚSICA ADICIONADA (NESTA SESSÃO) ✓';renderSetlist();
 }catch(err){label.textContent='ERRO: '+err.message;console.error(err)}
 setTimeout(()=>{label.textContent=orig},3200);e.target.value='';
};


function savePreferences(){try{localStorage.setItem('the-whistles:preferences',JSON.stringify(preferences))}catch(e){}}
function applyPreferences(){song.volume=preferences.volume;$('game').classList.toggle('reduced-effects',preferences.effects==='reduced');$('volume').value=String(Math.round(preferences.volume*100));$('volumeValue').textContent=Math.round(preferences.volume*100)+'%';$('visualEffects').value=preferences.effects;}
try{const saved=JSON.parse(localStorage.getItem('the-whistles:preferences')||'null');if(saved){if(Number.isFinite(saved.volume))preferences.volume=Math.max(0,Math.min(1,saved.volume));if(['full','reduced'].includes(saved.effects))preferences.effects=saved.effects;}}catch(e){}
applyPreferences();
function openOverlay(name){if(screen==='playing')pauseGame();overlayReturn=screen;show(name)}
function closeOverlay(){show(overlayReturn)}
document.querySelectorAll('[data-open-help]').forEach(b=>b.onclick=()=>openOverlay('help'));
document.querySelectorAll('[data-open-settings]').forEach(b=>b.onclick=()=>openOverlay('settings'));
$('closeHelp').onclick=closeOverlay;$('closeSettings').onclick=closeOverlay;
$('volume').oninput=()=>{preferences.volume=Number($('volume').value)/100;applyPreferences();savePreferences()};
$('visualEffects').onchange=()=>{preferences.effects=$('visualEffects').value;applyPreferences();savePreferences()};
$('openRehearsal').onclick=()=>{$('rehearsalTrack').textContent=activeTrack.title+' · '+(gameMode==='duo'?'DUO · GUITARRA + BAIXO':chosen==='franco'?'FRANCO · GUITARRA':'RYUCHI · BAIXO')+' · '+difficulty.toUpperCase();$('practiceStart').max=String(Math.max(0,Math.floor(activeTrack.duration-3)));$('practiceStart').value='0';$('practiceStartValue').textContent='00:00';show('rehearsal')};
$('practiceStart').oninput=()=>{$('practiceStartValue').textContent=fmtTime(Number($('practiceStart').value))};
$('startRehearsal').onclick=()=>startGame(Number($('practiceStart').value),true,Number($('practiceSpeed').value));
$('closeRehearsal').onclick=()=>show('setup');$('cancelLoading').onclick=enterSetlist;
$('touchPower1').onclick=()=>{if(gameMode==='duo')duoActivatePower(duoPlayers[0]);else activatePower()};
$('touchPower2').onclick=()=>duoActivatePower(duoPlayers[1]);

window.whistlesPerformanceDebug={getCache:()=>({notes:noteDiscSprites.size,pads:fretPadSprites.size,stageBufferTime,stageBufferKey}),reset:()=>{noteDiscSprites.clear();fretPadSprites.clear();stageBufferTime=-Infinity;hudDirty=true;}};
window.whistlesControllerDebug={getPads:()=>getPads().map(p=>({index:p.index,id:p.id,mapping:p.mapping})),getAssigned:()=>gamepadAssigned.slice(),pair:(idx,slot)=>assignPad(idx,slot),open:openControllerPanel};
window.whistlesDebug={getDuoState:()=>({mode:gameMode,crowd,assigned:gamepadAssigned.slice(),players:duoPlayers.map(p=>({artist:p.artist,score:p.score,combo:p.combo,hits:p.perfect+p.good,misses:p.misses,falsePresses:p.falsePresses,notes:p.notes.length,nextMiss:p.nextMiss,power:p.power}))}),setMode:setGameMode,getState:()=>({mode:gameMode,screen,chosen,difficulty,activeTrack:activeTrack.id,selectedTrack:selectedTrack.id,practice,score,combo,notes:notes.length,time:song.currentTime,duration:song.duration,loaded:songReady,firstNote:notes.length?notes[0].t:null,perfect,good,misses,falsePresses,impactCount,offset,crowd,power,powerEnd,multiplier:totalMultiplier(),streakNoticeValue,firstLanes:notes.slice(0,8).map(n=>n.lane),depths:Array.from(fretDepth),pressed:Array.from(keys)}),skipTo:(t)=>{if(screen==='playing'){song.currentTime=t;while(nextMiss<notes.length&&notes[nextMiss].t<t-.2){notes[nextMiss].skipped=true;nextMiss++}}},testSet:(obj)=>{if('crowd'in obj)crowd=obj.crowd;if('power'in obj)power=obj.power;if('combo'in obj)combo=obj.combo;if('powerEnd'in obj)powerEnd=obj.powerEnd;updateHud(true)},testMiss:()=>{const n=notes.find(x=>!x.hit&&!x.miss);if(n){registerMiss(n);updateHud(true)}},testComplete:()=>{if(screen==='playing'){song.pause();finishGame()}},testSaveRecord:(acc=87)=>{saveRecord(activeTrack,chosen,difficulty,{bestAccuracy:acc,bestScore:124500,stars:4,plays:1,clears:1});renderSetlist()},getSoloNotes:()=>activeTrack.charts.franco.normal.filter(n=>n[0]>=57.7&&n[0]<=63.2),getNexusSecondSolo:()=>chartBank.franco.normal.filter(n=>n[0]>=100&&n[0]<=105),getCatalog:()=>catalog.map(t=>({id:t.id,title:t.title,bpm:t.bpm,duration:t.duration,counts:Object.fromEntries(Object.entries(t.charts).map(([c,v])=>[c,Object.fromEntries(Object.entries(v).map(([d,n])=>[d,n.length]))]))}))};
})();
