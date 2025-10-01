/* game.js - Juego Hotwheels Arcade Pro
   Estado central, UI, audio, canvas game loop, niveles, records
*/

/* --------------------
   UTILITIES & CONFIG
   -------------------- */
const $ = id => document.getElementById(id);
const wait = ms => new Promise(r => setTimeout(r, ms));

const CONFIG = {
  recordsKey: 'hotwheels_records_v1',
  settingsKey: 'hotwheels_settings_v1',
  lanes: 4,
  canvasId: 'gameCanvas'
};

const CARS = [
  { id:'c1', name:'Aurora', color:'#ff3b3b', engine:'audio_eng_a' },
  { id:'c2', name:'Eclipse', color:'#1fd1a6', engine:'audio_eng_b' },
  { id:'c3', name:'Phantom', color:'#6c5eff', engine:'audio_eng_c' },
  { id:'c4', name:'Vortex',  color:'#ff8a00', engine:'audio_eng_a' }
];

const LEVELS = [
  { id:1, name:'Práctica', finish:-1800, obstacleFreq:1400, bgSpeed:0.18 },
  { id:2, name:'Intermedio', finish:-2600, obstacleFreq:1000, bgSpeed:0.28 },
  { id:3, name:'Desafío', finish:-3600, obstacleFreq:700, bgSpeed:0.38 }
];

/* --------------------
   AUDIO MANAGER
   -------------------- */
const Audio = (function(){
  const S = {
    intro: $('audio_intro'),
    beep: $('audio_beep'),
    shot: $('audio_shot'),
    crash: $('audio_crash'),
    race: $('audio_race'),
    eng_a: $('audio_eng_a'),
    eng_b: $('audio_eng_b'),
    eng_c: $('audio_eng_c'),
    win: $('audio_win')
  };
  let settings = loadSettings();
  function loadSettings(){
    try { return JSON.parse(localStorage.getItem(CONFIG.settingsKey)) || {music:true,sfx:true,volume:0.8}; }
    catch(e){ return {music:true,sfx:true,volume:0.8}; }
  }
  function save(){ localStorage.setItem(CONFIG.settingsKey, JSON.stringify(settings)); }
  function apply(){
    Object.values(S).forEach(a=>{ try{ a.volume = settings.volume }catch(e){} });
    S.race.muted = !settings.music;
    S.intro.muted = !settings.music;
  }
  function play(key, opts={}) {
    const el = S[key]; if(!el) return;
    try{
      if(opts.reset) el.currentTime = 0;
      if(opts.volume !== undefined) el.volume = opts.volume;
      if((key === 'race' || key === 'intro')) {
        if(settings.music) el.play().catch(()=>{});
      } else {
        if(settings.sfx) el.play().catch(()=>{});
      }
    }catch(e){}
  }
  function stop(key){ const el = S[key]; if(!el) return; try{ el.pause(); el.currentTime = 0; }catch(e){} }
  function stopAll(){ Object.values(S).forEach(s=>{ try{s.pause(); s.currentTime=0;}catch(e){} }); }
  apply();
  return { settings, setMusic(v){settings.music=v;save();apply()}, setSfx(v){settings.sfx=v;save();apply()}, setVolume(v){settings.volume=v;save();apply()}, play, stop, stopAll };
})();

/* --------------------
   PERSISTENCE RECORDS
   -------------------- */
const Records = {
  get(){ try { return JSON.parse(localStorage.getItem(CONFIG.recordsKey)) || []; } catch(e){ return []; } },
  add(t){
    const arr = this.get(); arr.push(t); arr.sort((a,b)=>a-b);
    localStorage.setItem(CONFIG.recordsKey, JSON.stringify(arr.slice(0,10)));
  },
  clear(){ localStorage.removeItem(CONFIG.recordsKey); }
};

/* --------------------
   STATE & UI
   -------------------- */
let STATE = {
  screen: 'intro', // intro, menu, select, race
  chosenCar: 0,
  levelIdx: 0
};

const screens = {
  intro: $('screen-intro'),
  menu: $('screen-menu'),
  select: $('screen-select'),
  records: $('screen-records'),
  config: $('screen-config'),
  demo: $('screen-demo'),
  rules: $('screen-rules'),
  game: $('game-area')
};
const overlays = {
  lego: $('lego-wrap'),
  count: $('overlay-count'),
  finish: $('overlay-finish')
};

function showScreen(name){
  // hide all main screens & overlays
  Object.values(screens).forEach(s=>s.classList.add('hidden'));
  overlays.lego.classList.add('hidden');
  overlays.count.classList.add('hidden');
  overlays.finish.classList.add('hidden');
  // show requested
  if(name === 'game'){ $('game-area').classList.remove('hidden'); }
  else if(screens[name]) screens[name].classList.remove('hidden');
  STATE.screen = name;
}

/* --------------------
   INTRO / LEGO cinematic
   -------------------- */
const btnYes = $('btn-yes'), btnNo = $('btn-no'), legoAssembly = $('lego-assembly');
btnNo.addEventListener('click', ()=> {
  // slight feedback
  btnNo.animate([{transform:'scale(1)'},{transform:'scale(1.06)'},{transform:'scale(1)'}],{duration:360});
});
// build lego blocks
function buildLego(){
  legoAssembly.innerHTML = '';
  const cols = 16, rows = 6;
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const b = document.createElement('div');
      b.className = 'lego-block';
      b.style.width = '14px'; b.style.height = '14px'; b.style.margin='2px';
      // pattern
      if(r===0 && c>2 && c<13) b.style.background = '#fff';
      else if(r>3 && (c<3 || c>12)) b.style.background = '#111827';
      else if(c>4 && c<11) b.style.background = '#ff3b3b';
      else b.style.background = '#d94b4b';
      b.style.opacity = 0; b.style.transform = 'translateY(40px) scale(.9)';
      legoAssembly.appendChild(b);
    }
  }
}
async function playLegoCinematic(){
  overlays.lego.classList.remove('hidden');
  buildLego();
  const blocks = Array.from(legoAssembly.children);
  blocks.forEach((b,i)=>{
    setTimeout(()=>{ b.style.transition='transform .45s cubic-bezier(.2,.9,.2,1), opacity .18s'; b.style.transform='translateY(0) scale(1)'; b.style.opacity = 1; }, i*6 + Math.random()*80);
  });
  // wait
  await wait(1100 + blocks.length*4);
  // smash out
  legoAssembly.style.transition = 'transform .9s cubic-bezier(.2,.9,.2,1), opacity .3s';
  legoAssembly.style.transform = 'translateY(-420px) scale(1.5) rotate(12deg)'; legoAssembly.style.opacity = 0;
  Audio.play('crash',{reset:true,volume:0.8});
  await wait(900);
  overlays.lego.classList.add('hidden');
  legoAssembly.style.transform=''; legoAssembly.style.opacity=''; legoAssembly.innerHTML='';
}

/* intro yes flow */
btnYes.addEventListener('click', async () => {
  // disable both buttons during cinematic
  btnYes.disabled = true; btnNo.disabled = true;
  Audio.play('intro',{reset:true,volume:0.8});
  await playLegoCinematic();
  // show main menu
  showScreen('menu');
  btnYes.disabled = false; btnNo.disabled = false;
});

/* --------------------
   MENU actions
   -------------------- */
$('menu_play').addEventListener('click', ()=> { showScreen('select'); });
$('menu_select').addEventListener('click', ()=> { showScreen('select'); });
$('menu_records').addEventListener('click', ()=> { renderRecords(); showScreen('records'); });
$('menu_config').addEventListener('click', ()=> { // sync UI
  $('cfgMusic').checked = Audio.settings.music;
  $('cfgSfx').checked = Audio.settings.sfx;
  $('cfgVolume').value = Audio.settings.volume ?? 0.8;
  showScreen('config');
});
$('menu_demo').addEventListener('click', ()=> { showScreen('demo'); });
$('menu_rules').addEventListener('click', ()=> { showScreen('rules'); });

/* records screen */
$('closeRecords').addEventListener('click', ()=> showScreen('menu'));
$('clearRecords').addEventListener('click', ()=> { Records.clear(); renderRecords(); });

/* config screen */
$('closeConfig').addEventListener('click', ()=> showScreen('menu'));
$('cfgMusic').addEventListener('change', ()=> { Audio.setMusic($('cfgMusic').checked); });
$('cfgSfx').addEventListener('change', ()=> { Audio.setSfx($('cfgSfx').checked); });
$('cfgVolume').addEventListener('input', ()=> { Audio.setVolume(parseFloat($('cfgVolume').value)); });

/* demo screen */
$('btn-demo-start').addEventListener('click', async ()=> {
  showScreen('game'); // demo will start inside Game demo mode
  UI.startRaceFlow(true);
});
$('btn-demo-close').addEventListener('click', ()=> showScreen('menu'));

/* rules */
$('closeRules').addEventListener('click', ()=> showScreen('menu'));

/* menu open while in game */
$('openMenu').addEventListener('click', ()=> showScreen('menu'));

/* --------------------
   CAROUSEL select
   -------------------- */
const carousel = $('carousel'); let carouselIndex = 0;
function renderCarousel(){
  carousel.innerHTML = '';
  CARS.forEach((c,i)=>{
    const el = document.createElement('div');
    el.className = 'carousel-item' + (i===0? ' selected':'');
    el.innerHTML = `<div style="height:110px;display:flex;align-items:center;justify-content:center;font-size:40px">${i===0?'🚗': i===1? '🏎️' : i===2? '🚙':'🚘'}</div><div style="margin-top:8px;font-weight:800">${c.name}</div>`;
    el.addEventListener('click', ()=> { setCar(i); });
    carousel.appendChild(el);
  });
}
function setCar(i){
  carouselIndex = (i + CARS.length) % CARS.length;
  Array.from(carousel.children).forEach((ch, idx)=> ch.classList.toggle('selected', idx===carouselIndex));
  STATE.chosenCar = carouselIndex;
  // preview engine sound
  Audio.play(CARS[carouselIndex].engine, {reset:true,volume:0.35});
}
$('carPrev').addEventListener('click', ()=> setCar(carouselIndex-1));
$('carNext').addEventListener('click', ()=> setCar(carouselIndex+1));
$('btn-select-back').addEventListener('click', ()=> showScreen('menu'));
$('btn-play-now').addEventListener('click', ()=> { showScreen('game'); UI.startRaceFlow(false); });

renderCarousel(); setCar(0);

/* render records list */
function renderRecords(){
  const list = $('recordsList'); list.innerHTML = '';
  const arr = Records.get();
  if(arr.length===0) { list.innerHTML = '<li>No hay registros aún</li>'; return; }
  arr.forEach((t,i)=>{ const li = document.createElement('li'); li.textContent = `${i+1}. ${(t/1000).toFixed(2)} s`; list.appendChild(li); });
}

/* --------------------
   UI Utilities (countdown, overlays)
   -------------------- */
const UI = (function(){
  const countOverlay = overlays.count;
  const cntNum = $('countNum');
  async function startRaceFlow(isDemo=false){
    // prepare: show overlay count 3..2..1
    countOverlay.classList.remove('hidden');
    for(let n=3;n>=1;n--){
      cntNum.textContent = n;
      Audio.play('beep',{reset:true});
      await wait(800);
    }
    cntNum.textContent = '¡Go!';
    Audio.play('shot',{reset:true});
    await wait(350);
    countOverlay.classList.add('hidden');
    // start audio race + engine
    Audio.play('race',{reset:true,volume:0.5});
    const engKey = CARS[STATE.chosenCar].engine;
    Audio.play(engKey,{volume:0.28});
    // start the game
    Game.start(STATE.chosenCar, isDemo);
  }
  return { startRaceFlow };
})();

/* --------------------
   GAME: canvas engine
   -------------------- */
const Game = (function(){
  const canvas = $(CONFIG.canvasId); const ctx = canvas.getContext('2d');
  let W = canvas.width, H = canvas.height; let DPR = window.devicePixelRatio || 1;
  function resize(){ const rect = canvas.getBoundingClientRect(); W = canvas.width = Math.round(rect.width * DPR); H = canvas.height = Math.round(rect.height * DPR); ctx.setTransform(1,0,0,1,0,0); } 
  window.addEventListener('resize', ()=> resize());
  resize();

  // state
  let racers = [], obstacles = [], particles = [];
  let running = false, lastTs=0, offsetTop=0;
  let chosenCarIdx = 0, levelIdx = 0, startTime=0;

  // input
  const input = { left:false, right:false };
  window.addEventListener('keydown', e => { if(e.key==='ArrowLeft') input.left=true; if(e.key==='ArrowRight') input.right=true; });
  window.addEventListener('keyup', e => { if(e.key==='ArrowLeft') input.left=false; if(e.key==='ArrowRight') input.right=false; });
  // mobile touch
  $('touch-left').addEventListener('touchstart', ()=> input.left=true, {passive:true}); $('touch-left').addEventListener('touchend', ()=> input.left=false, {passive:true});
  $('touch-right').addEventListener('touchstart', ()=> input.right=true, {passive:true}); $('touch-right').addEventListener('touchend', ()=> input.right=false, {passive:true});

  // Racer class
  class Racer {
    constructor(name,color,x,lane,isPlayer=false){ this.name=name; this.color=color; this.x=x; this.lane=lane; this.y=0; this.speed=0; this.maxSpeed=1.9 + Math.random()*1.1; this.isPlayer=isPlayer; this.finished=false; this.finishTime=null; this.w=58; this.h=34; }
    draw(off){
      const dx = (this.x/ DPR) - this.w/2; const dy = (H/ DPR) - ((this.y - off)/ DPR) - 90;
      // shadow
      ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(dx+6, dy + this.h - 6, this.w-12, 6);
      // body
      ctx.fillStyle = this.color; roundRect(dx,dy,this.w,this.h,6,true);
      // windows
      ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.fillRect(dx+12,dy+6,22,8); ctx.fillRect(dx+36,dy+6,10,8);
    }
  }

  function roundRect(x,y,w,h,r,fill=true){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.closePath(); if(fill) ctx.fill(); else ctx.stroke(); }

  function laneCenter(i){
    const margin = 120 * DPR; const avail = W - margin*2; return margin + (i + 0.5) * (avail / CONFIG.lanes);
  }

  function spawnObstacles(level){
    obstacles = [];
    for(let y=-150; y> level.finish; y -= (level.obstacleFreq + Math.random()*400)){
      const lane = Math.floor(Math.random()*CONFIG.lanes);
      obstacles.push({ x: laneCenter(lane), y: y - Math.random()*60, w:36, h:18 });
    }
  }

  function setupRace(chosenIdx, lvlIdx){
    racers = []; obstacles = []; particles = []; offsetTop = 0;
    levelIdx = lvlIdx || 0;
    chosenCarIdx = chosenIdx || 0;
    for(let i=0;i<CONFIG.lanes;i++){
      const x = laneCenter(i);
      if(i===0) racers.push(new Racer('Tú', CARS[chosenCarIdx].color, x, i, true));
      else racers.push(new Racer('CPU'+i, ['#ff8a00','#6bd1ff','#d46cff','#f1c40f'][i%4], x, i, false));
      racers[i].y = -i*36;
    }
    spawnObstacles(LEVELS[levelIdx]);
    $('levelLabel').textContent = `Nivel ${LEVELS[levelIdx].id} - ${LEVELS[levelIdx].name}`;
  }

  function spawnConfetti(x,y){
    for(let i=0;i<40;i++){ particles.push({x,y,vx:(Math.random()-0.5)*6,vy:- (Math.random()*4+1),life:Math.random()*1200+400,conf:true,color:['#ff3b3b','#ffd34d','#1fd1a6','#6c5eff'][Math.floor(Math.random()*4)]}); }
  }
  function updateParticles(dt, off){
    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i]; p.vy += 0.02*dt; p.x += p.vx*(dt/16); p.y += p.vy*(dt/16); p.life -= dt; if(p.life<=0) particles.splice(i,1);
    }
  }
  function drawParticles(off){
    particles.forEach(p=>{ const dx = p.x/ DPR; const dy = (p.y - off)/ DPR; ctx.fillStyle=p.color; if(p.conf) ctx.fillRect(dx,(H/DPR)-dy,4,8); else ctx.fillRect(dx,(H/DPR)-dy,3,3); });
  }

  function update(ts){
    if(!running) return; const dt = lastTs? (ts-lastTs):16; lastTs=ts;
    // player input
    const player = racers.find(r=>r.isPlayer);
    if(player && !player.finished){
      if(input.left) player.x -= 7*(dt/16);
      if(input.right) player.x += 7*(dt/16);
      const minX = laneCenter(0)-80, maxX = laneCenter(CONFIG.lanes-1)+80; player.x = Math.max(minX,Math.min(maxX,player.x));
      player.speed += 0.03*(dt/16); if(player.speed > player.maxSpeed) player.speed = player.maxSpeed;
    }
    // AI
    racers.forEach(r=>{ if(r.isPlayer || r.finished) return; const tx = laneCenter(r.lane); r.x += (tx - r.x)*0.08*(dt/16); if(Math.random()<0.003) r.x += (Math.random()-0.5)*40; r.speed += (r.maxSpeed - r.speed)*0.005 + (Math.random()-0.5)*0.01; r.speed = Math.max(0.7, Math.min(r.speed, r.maxSpeed + 0.5)); });
    // collisions with obstacles
    racers.forEach(r=>{ obstacles.forEach(o=>{ const dx = Math.abs(r.x - o.x); const dy = Math.abs(r.y - o.y); if(dx < 36 && dy < 20){ r.speed *= 0.55; if(r.isPlayer){ Audio.play('crash',{reset:true,volume:0.9}); spawnConfetti(r.x, H/2); flashCanvas(); } } }); });
    // progress
    racers.forEach(r=>{ r.y -= r.speed*(dt/16); if(r.y < LEVELS[levelIdx].finish && !r.finished){ r.finished=true; r.finishTime=performance.now(); } });
    // HUD updates
    const order = [...racers].sort((a,b)=>a.y - b.y);
    const pIndex = order.findIndex(r=>r.isPlayer);
    $('posInfo').textContent = `Posición: ${pIndex+1}/${racers.length}`;
    const p = racers.find(r=>r.isPlayer); const dist = Math.max(0, Math.min(100, Math.round((Math.abs(LEVELS[levelIdx].finish)-Math.abs(p.y))/Math.abs(LEVELS[levelIdx].finish)*100)));
    $('distInfo').textContent = `Distancia: ${dist}%`; $('timeInfo').textContent = `Tiempo: ${((performance.now()-startTime)/1000).toFixed(2)}s`;
    offsetTop = order[0].y + 820;
    updateParticles(dt, offsetTop);
    if(racers.every(r=>r.finished)){ running=false; onFinish(); }
  }

  function draw(){
    // clear
    ctx.clearRect(0,0,W,H);
    // background simple
    const g = ctx.createLinearGradient(0,0,H,0); g.addColorStop(0,'#07151d'); g.addColorStop(1,'#021018'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    // track area
    const tx = 100* DPR, tw = W - tx*2;
    ctx.fillStyle = '#16262f'; roundRect(tx/DPR,30/DPR,tw/DPR,(H-60)/DPR,22/DPR,true);
    // lane markers
    for(let i=0;i<CONFIG.lanes;i++){ const lx = laneCenter(i)/ DPR; ctx.fillStyle='rgba(255,255,255,0.04)'; ctx.fillRect(lx-2,0,4,H/DPR); }
    // obstacles
    obstacles.forEach(o=>{ const dy = (H/DPR) - ((o.y - offsetTop)/ DPR) - 90; if(dy < -60 || dy > H/DPR + 80) return; ctx.save(); ctx.translate(o.x/ DPR, dy); ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(-12,10); ctx.lineTo(12,10); ctx.closePath(); ctx.fillStyle='#ff7a00'; ctx.fill(); ctx.restore();});
    // finish line
    const finishDY = (H/DPR) - ((LEVELS[levelIdx].finish - offsetTop)/ DPR) - 90;
    if(finishDY < H/DPR + 200){ ctx.fillStyle='#fff'; for(let i=0;i<12;i++){ ctx.fillRect((tx/DPR)+i*40, finishDY, 20, 10); } ctx.font='22px sans-serif'; ctx.fillText('META', (W/DPR)/2 - 30, finishDY - 6); }
    // racers
    racers.forEach(r=> r.draw(offsetTop));
    // particles
    drawParticles(offsetTop);
  }

  function loop(ts){ update(ts); draw(); if(running) requestAnimationFrame(loop); }

  function start(chosenIdx=0, demo=false){
    chosenCarIdx = chosenIdx; levelIdx = 0; startTime = performance.now();
    setupRace(chosenIdx, levelIdx); running=true; lastTs=0; requestAnimationFrame(loop);
  }
  function stopAll(){ running=false; Audio.stopAll(); }
  function onFinish(){
    Audio.stopAll(); Audio.play('win',{reset:true,volume:0.9}); spawnConfetti(W/2, H/2);
    const ranking = [...racers].sort((a,b)=>a.finishTime - b.finishTime); const player = ranking.find(r=> r.isPlayer);
    if(player){ const base = Math.min(...ranking.map(r=>r.finishTime)); const t = player.finishTime - base; Records.add(t); }
    // show finish overlay
    overlays.finish.classList.remove('hidden');
    $('finishTitle').textContent = (ranking[0].isPlayer? '🏆 ¡Felicidades!' : 'Carrera terminada');
    $('finishText').textContent = (ranking[0].isPlayer? 'Feliz día Hotwheels, campeón' : `Ganador: ${ranking[0].name}`);
  }

  function flashCanvas(){ canvas.style.filter='brightness(1.6) saturate(1.1)'; setTimeout(()=> canvas.style.filter='',120); }
  function continueNextLevel(){ if(levelIdx < LEVELS.length -1){ levelIdx++; setupRace(chosenCarIdx, levelIdx); running=true; startTime = performance.now(); lastTs=0; Audio.play('race',{reset:true}); requestAnimationFrame(loop); $('levelLabel').textContent = `Nivel ${LEVELS[levelIdx].id} - ${LEVELS[levelIdx].name}`; overlays.finish.classList.add('hidden'); } else { $('finishTitle').textContent='¡Has completado todos los niveles!'; $('finishText').textContent='Gracias por jugar'; } }

  // expose some controls
  return { start, stopAll, continueNextLevel, input: input, resumeFromFinish: ()=> { overlays.finish.classList.add('hidden'); showScreen('menu'); } };
})();

/* Finish overlay buttons */
$('finishReplay').addEventListener('click', ()=> { overlays.finish.classList.add('hidden'); UI.startRaceFlow(false); });
$('finishMenu').addEventListener('click', ()=> { overlays.finish.classList.add('hidden'); showScreen('menu'); });
$('finishReplay').addEventListener('click', ()=> { overlays.finish.classList.add('hidden'); UI.startRaceFlow(false); });

/* Demo / unlock audio user gesture */
document.addEventListener('click', function unlock(){ Audio.setVolume(Audio.settings.volume ?? 0.8); Audio.setMusic(Audio.settings.music); Audio.setSfx(Audio.settings.sfx); document.removeEventListener('click', unlock); });

/* INIT show intro */
showScreen('intro');
