/* game.js - Hotwheels Arcade Pro
   - UI/UX polished + engine playable on GitHub Pages
   - Sprites used: inline SVG data-URLs for cars (no external images necessary)
*/

/* ---------- Utilities ---------- */
const $ = id => document.getElementById(id);
const wait = ms => new Promise(res => setTimeout(res, ms));

/* ---------- Config ---------- */
const CONFIG = {
  recordsKey: 'hotwheels_records_v3',
  settingsKey: 'hotwheels_settings_v3',
  canvasId: 'gameCanvas',
  lanes: 4
};

/* ---------- Inline sprite data URLs (small SVG cars) ----------
   Using inline SVG keeps the repo simple for GitHub Pages.
   You can replace these with local PNGs in /assets/cars/ if you prefer.
*/
const CAR_SVGS = [
  // red coupe
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="220" height="120"><rect rx="14" ry="14" width="200" height="70" x="10" y="30" fill="%23ff3b3b"/><circle cx="50" cy="100" r="10" fill="%23000"/><circle cx="170" cy="100" r="10" fill="%23000"/></svg>')}`,
  // teal sport
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="220" height="120"><rect rx="14" ry="14" width="200" height="70" x="10" y="30" fill="%231fd1a6"/><circle cx="50" cy="100" r="10" fill="%23000"/><circle cx="170" cy="100" r="10" fill="%23000"/></svg>')}`,
  // purple
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="220" height="120"><rect rx="14" ry="14" width="200" height="70" x="10" y="30" fill="%236c5eff"/><circle cx="50" cy="100" r="10" fill="%23000"/><circle cx="170" cy="100" r="10" fill="%23000"/></svg>')}`,
  // orange
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="220" height="120"><rect rx="14" ry="14" width="200" height="70" x="10" y="30" fill="%23ff8a00"/><circle cx="50" cy="100" r="10" fill="%23000"/><circle cx="170" cy="100" r="10" fill="%23000"/></svg>')}`,
];

/* ---------- Game data: cars & levels ---------- */
const CARS = [
  { id:'c1', name:'Aurora', color:'#ff3b3b', img: CAR_SVGS[0], engine:'audio_eng_a' },
  { id:'c2', name:'Eclipse', color:'#1fd1a6', img: CAR_SVGS[1], engine:'audio_eng_b' },
  { id:'c3', name:'Phantom', color:'#6c5eff', img: CAR_SVGS[2], engine:'audio_eng_c' },
  { id:'c4', name:'Vortex',  color:'#ff8a00', img: CAR_SVGS[3], engine:'audio_eng_a' }
];

const LEVELS = [
  { id:1, name:'Práctica', finish:-1600, obstacleFreq:1400, bgSpeed:0.18 },
  { id:2, name:'Intermedio', finish:-2600, obstacleFreq:1000, bgSpeed:0.28 },
  { id:3, name:'Desafío', finish:-3600, obstacleFreq:700, bgSpeed:0.38 }
];

/* ---------- Audio Manager ---------- */
const Audio = (() => {
  const S = {
    intro: $('audio_intro'),
    beep: $('audio_beep'),
    shot: $('audio_shot'),
    crash: $('audio_crash'),
    race: $('audio_race'),
    eng_a: $('audio_eng_a'),
    eng_b: $('audio_eng_b'),
    eng_c: $('audio_eng_c'),
    win: $('audio_win'),
  };
  let settings = loadSettings();
  function loadSettings(){
    try { return JSON.parse(localStorage.getItem(CONFIG.settingsKey)) || {music:true,sfx:true,volume:0.8}; }
    catch(e) { return {music:true,sfx:true,volume:0.8}; }
  }
  function save(){ localStorage.setItem(CONFIG.settingsKey, JSON.stringify(settings)); }
  function apply(){ Object.values(S).forEach(a=>{ try{ a.volume = settings.volume }catch(e){} }); S.race.muted = !settings.music; S.intro.muted = !settings.music; }
  function play(key, opts={}){ const el = S[key]; if(!el) return; try{ if(opts.reset) el.currentTime = 0; if(opts.volume !== undefined) el.volume = opts.volume; if((key==='race' || key==='intro')) { if(settings.music) el.play().catch(()=>{}); } else { if(settings.sfx) el.play().catch(()=>{}); } }catch(e){} }
  function stop(key){ const el = S[key]; if(!el) return; try{ el.pause(); el.currentTime = 0; }catch(e){} }
  function stopAll(){ Object.values(S).forEach(s=>{ try{s.pause(); s.currentTime=0;}catch(e){} }); }
  apply();
  return {
    settings, setMusic(v){ settings.music=v; save(); apply(); }, setSfx(v){ settings.sfx=v; save(); apply(); }, setVolume(v){ settings.volume=v; save(); apply(); },
    play, stop, stopAll
  };
})();

/* ---------- Records ---------- */
const Records = {
  get(){ try{ return JSON.parse(localStorage.getItem(CONFIG.recordsKey)) || []; }catch(e){ return []; } },
  add(t){ const arr = this.get(); arr.push(t); arr.sort((a,b)=>a-b); localStorage.setItem(CONFIG.recordsKey, JSON.stringify(arr.slice(0,10))); },
  clear(){ localStorage.removeItem(CONFIG.recordsKey); }
};

/* ---------- UI / State ---------- */
let STATE = { screen:'intro', chosenCar:0, levelIdx:0 };
const screens = {
  intro: $('screen-intro'), menu: $('screen-menu'), select: $('screen-select'),
  records: $('screen-records'), config: $('screen-config'), demo: $('screen-demo'),
  rules: $('screen-rules'), game: $('game-area')
};
const overlays = { lego: $('lego-wrap'), count: $('overlay-count'), finish: $('overlay-finish') };
function showScreen(name){ Object.values(screens).forEach(s=> s.classList.add('hidden')); Object.values(overlays).forEach(o=> o.classList.add('hidden')); if(name==='game') screens.game.classList.remove('hidden'); else if(screens[name]) screens[name].classList.remove('hidden'); STATE.screen = name; }

/* ---------- Intro cinematic (lego) ---------- */
const btnYes = $('btn-yes'), btnNo = $('btn-no'), legoAssembly = $('lego-assembly');
let noDriftTimer = null;
function startNoDrift(){ const btn = btnNo; let t=0; noDriftTimer = setInterval(()=>{ t+=0.12; btn.style.transform = `translate(${Math.sin(t)*14}px, ${Math.cos(t)*6}px)`; }, 80); }
function stopNoDrift(){ clearInterval(noDriftTimer); btnNo.style.transform = ''; }

function buildLego(){ legoAssembly.innerHTML=''; const cols=16, rows=6; for(let r=0;r<rows;r++){ for(let c=0;c<cols;c++){ const b=document.createElement('div'); b.style.width='14px'; b.style.height='14px'; if(r===0 && c>2 && c<13) b.style.background='#fff'; else if(r>3 && (c<3 || c>12)) b.style.background='#111827'; else if(c>4 && c<11) b.style.background='#ff3b3b'; else b.style.background='#d94b4b'; b.style.opacity='0'; b.style.transform='translateY(40px) scale(.9)'; legoAssembly.appendChild(b); } } }
async function playLegoCinematic(){ overlays.lego.classList.remove('hidden'); buildLego(); const blocks = Array.from(legoAssembly.children); blocks.forEach((b,i)=> setTimeout(()=>{ b.style.transition='transform .45s cubic-bezier(.2,.9,.2,1), opacity .18s'; b.style.transform='translateY(0) scale(1)'; b.style.opacity = 1; }, i*6 + Math.random()*80)); await wait(1100 + blocks.length*4); legoAssembly.style.transition='transform .9s cubic-bezier(.2,.9,.2,1), opacity .3s'; legoAssembly.style.transform='translateY(-420px) scale(1.5) rotate(12deg)'; legoAssembly.style.opacity='0'; Audio.play('crash',{reset:true,volume:0.8}); await wait(900); overlays.lego.classList.add('hidden'); legoAssembly.style.transform=''; legoAssembly.style.opacity=''; legoAssembly.innerHTML=''; }

/* wire intro */
btnNo.addEventListener('click', ()=> { btnNo.animate([{transform:'scale(1)'},{transform:'scale(1.06)'},{transform:'scale(1)'}],{duration:360}); });
btnYes.addEventListener('click', async ()=> { btnYes.disabled=true; btnNo.disabled=true; Audio.play('intro',{reset:true,volume:0.8}); stopNoDrift(); await playLegoCinematic(); showScreen('menu'); btnYes.disabled=false; btnNo.disabled=false; });
startNoDrift();

/* ---------- Menu wiring ---------- */
$('menu_play').addEventListener('click', ()=> showScreen('select'));
$('menu_select').addEventListener('click', ()=> showScreen('select'));
$('menu_records').addEventListener('click', ()=> { renderRecords(); showScreen('records'); });
$('menu_config').addEventListener('click', ()=> { $('cfgMusic').checked = Audio.settings.music; $('cfgSfx').checked = Audio.settings.sfx; $('cfgVolume').value = Audio.settings.volume ?? 0.8; showScreen('config'); });
$('menu_demo').addEventListener('click', ()=> showScreen('demo'));
$('menu_rules').addEventListener('click', ()=> showScreen('rules'));
$('closeRecords').addEventListener('click', ()=> showScreen('menu'));
$('clearRecords').addEventListener('click', ()=> { Records.clear(); renderRecords(); });
$('closeConfig').addEventListener('click', ()=> showScreen('menu'));
$('cfgMusic').addEventListener('change', ()=> Audio.setMusic($('cfgMusic').checked));
$('cfgSfx').addEventListener('change', ()=> Audio.setSfx($('cfgSfx').checked));
$('cfgVolume').addEventListener('input', ()=> Audio.setVolume(parseFloat($('cfgVolume').value)));
$('btn-demo-start').addEventListener('click', ()=> { showScreen('game'); UI.startRaceFlow(true); });
$('btn-demo-close').addEventListener('click', ()=> showScreen('menu'));
$('closeRules').addEventListener('click', ()=> showScreen('menu'));
$('openMenu').addEventListener('click', ()=> showScreen('menu'));

/* ---------- Carousel ---------- */
const carousel = $('carousel'); let carouselIndex = 0;
function renderCarousel(){
  carousel.innerHTML = '';
  CARS.forEach((c,i)=>{
    const el = document.createElement('div'); el.className='carousel-item';
    if(i===0) el.classList.add('selected');
    el.innerHTML = `<img src="${c.img}" alt="${c.name}" style="width:100%;height:110px;object-fit:contain;border-radius:8px"/><div style="margin-top:8px;font-weight:800">${c.name}</div>`;
    el.addEventListener('click', ()=> setCar(i));
    carousel.appendChild(el);
  });
  setCar(0);
}
function setCar(i){
  carouselIndex = (i + CARS.length) % CARS.length;
  Array.from(carousel.children).forEach((ch, idx)=> ch.classList.toggle('selected', idx===carouselIndex));
  STATE.chosenCar = carouselIndex;
  Audio.play(CARS[carouselIndex].engine, {reset:true, volume:0.35});
}
$('carPrev').addEventListener('click', ()=> setCar(carouselIndex-1));
$('carNext').addEventListener('click', ()=> setCar(carouselIndex+1));
$('btn-select-back').addEventListener('click', ()=> showScreen('menu'));
$('btn-play-now').addEventListener('click', ()=> { showScreen('game'); UI.startRaceFlow(false); });
renderCarousel();

/* render records */
function renderRecords(){ const list = $('recordsList'); list.innerHTML=''; const arr=Records.get(); if(arr.length===0) { list.innerHTML='<li>No hay registros aún</li>'; return; } arr.forEach((t,i)=>{ const li=document.createElement('li'); li.textContent=`${i+1}. ${(t/1000).toFixed(2)} s`; list.appendChild(li); }); }

/* ---------- UI start flow (countdown) ---------- */
const UI = (function(){
  const cnt = overlays.count; const cntNum = $('countNum');
  async function startRaceFlow(isDemo=false){
    cnt.classList.remove('hidden');
    for(let n=3;n>=1;n--){ cntNum.textContent=n; Audio.play('beep',{reset:true}); await wait(800); }
    cntNum.textContent='¡Go!'; Audio.play('shot',{reset:true}); await wait(300); cnt.classList.add('hidden');
    Audio.play('race',{reset:true,volume:0.45});
    const eng = CARS[STATE.chosenCar].engine; Audio.play(eng,{volume:0.28});
    Game.start(STATE.chosenCar, isDemo);
  }
  return { startRaceFlow };
})();

/* ---------- Game Engine (canvas) ---------- */
const Game = (function(){
  const canvas = $(CONFIG.canvasId); const ctx = canvas.getContext('2d',{alpha:false});
  let DPR = window.devicePixelRatio || 1; let W = canvas.width, H = canvas.height;
  function resize(){ const rect = canvas.getBoundingClientRect(); W = canvas.width = Math.max(900, Math.round(rect.width * DPR)); H = canvas.height = Math.max(520, Math.round(rect.height * DPR)); canvas.style.width = rect.width + 'px'; canvas.style.height = rect.height + 'px'; ctx.setTransform(1,0,0,1,0,0); }
  window.addEventListener('resize', ()=> { DPR = window.devicePixelRatio || 1; resize(); }); resize();

  let racers = [], obstacles = [], particles = [];
  let running=false, lastTs=0, offsetY=0;
  let chosenCarIdx=0, levelIdx=0, demoMode=false, startTime=0;

  // input
  const input = { left:false, right:false };
  window.addEventListener('keydown', e=> { if(e.key==='ArrowLeft') input.left=true; if(e.key==='ArrowRight') input.right=true; });
  window.addEventListener('keyup', e=> { if(e.key==='ArrowLeft') input.left=false; if(e.key==='ArrowRight') input.right=false; });
  // mobile
  $('touch-left').addEventListener('touchstart', ()=> input.left=true, {passive:true}); $('touch-left').addEventListener('touchend', ()=> input.left=false, {passive:true});
  $('touch-right').addEventListener('touchstart', ()=> input.right=true, {passive:true}); $('touch-right').addEventListener('touchend', ()=> input.right=false, {passive:true});

  class Racer {
    constructor(name,color,x,lane,isPlayer=false){ this.name=name; this.color=color; this.x=x; this.lane=lane; this.y=0; this.speed=0; this.maxSpeed=1.9 + Math.random()*1.1; this.isPlayer=isPlayer; this.finished=false; this.finishTime=null; this.w=58; this.h=34; }
    draw(off){
      const dx = (this.x / DPR) - this.w/2; const dy = (H/ DPR) - ((this.y - off)/ DPR) - 90;
      ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(dx+6, dy + this.h - 6, this.w-12, 6);
      ctx.fillStyle = this.color; roundRect(dx,dy,this.w,this.h,6,true);
      ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.fillRect(dx+12,dy+6,22,8); ctx.fillRect(dx+36,dy+6,10,8);
    }
  }

  function roundRect(x,y,w,h,r,fill=true){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.closePath(); if(fill) ctx.fill(); else ctx.stroke(); }

  function laneCenter(i){ const margin = 120 * DPR; const avail = W - margin*2; return margin + (i + 0.5) * (avail / CONFIG.lanes); }

  function spawnObstacles(level){
    obstacles = [];
    for(let y=-150; y> level.finish; y -= (level.obstacleFreq + Math.random()*400)){
      const lane = Math.floor(Math.random()*CONFIG.lanes);
      obstacles.push({ x: laneCenter(lane), y: y - Math.random()*80, w:36, h:18 });
    }
  }

  function setupRace(chosenIdx, lvlIdx){
    racers=[]; obstacles=[]; particles=[]; offsetY=0;
    levelIdx = lvlIdx || 0; chosenCarIdx = chosenIdx || 0;
    for(let i=0;i<CONFIG.lanes;i++){
      const x = laneCenter(i);
      if(i===0) racers.push(new Racer('Tú', CARS[chosenCarIdx].color, x, i, true));
      else racers.push(new Racer('CPU'+i, ['#ff8a00','#6bd1ff','#d46cff','#f1c40f'][i%4], x, i, false));
      racers[i].y = -i*36;
    }
    spawnObstacles(LEVELS[levelIdx]);
    $('levelLabel').textContent = `Nivel ${LEVELS[levelIdx].id} - ${LEVELS[levelIdx].name}`;
  }

  function spawnConfetti(x,y){ for(let i=0;i<40;i++){ particles.push({x,y,vx:(Math.random()-0.5)*6,vy:- (Math.random()*4+1),life:Math.random()*1400+400,conf:true,color:['#ff3b3b','#ffd34d','#1fd1a6','#6c5eff'][Math.floor(Math.random()*4)]}); } }
  function updateParticles(dt, off){ for(let i=particles.length-1;i>=0;i--){ const p=particles[i]; p.vy+=0.02*dt; p.x+=p.vx*(dt/16); p.y+=p.vy*(dt/16); p.life-=dt; if(p.life<=0) particles.splice(i,1); } }
  function drawParticles(off){ particles.forEach(p=>{ const dx = p.x / DPR; const dy = (p.y - off)/ DPR; ctx.fillStyle = p.color; if(p.conf) ctx.fillRect(dx, (H/DPR) - dy, 4, 8); else ctx.fillRect(dx, (H/DPR) - dy, 3, 3); }); }

  function update(ts){
    if(!running) return; const dt = lastTs? (ts-lastTs):16; lastTs=ts;
    const player = racers.find(r=> r.isPlayer);
    if(player && !player.finished){
      if(input.left) player.x -= 7*(dt/16);
      if(input.right) player.x += 7*(dt/16);
      const minX = laneCenter(0)-80, maxX = laneCenter(CONFIG.lanes-1)+80; player.x = Math.max(minX, Math.min(maxX, player.x));
      player.speed += 0.03*(dt/16); if(player.speed > player.maxSpeed) player.speed = player.maxSpeed;
    }
    racers.forEach(r=>{ if(r.isPlayer || r.finished) return; const tx = laneCenter(r.lane); r.x += (tx - r.x)*0.08*(dt/16); if(Math.random()<0.003) r.x += (Math.random()-0.5)*40; r.speed += (r.maxSpeed - r.speed)*0.005 + (Math.random()-0.5)*0.01; r.speed = Math.max(0.7, Math.min(r.speed, r.maxSpeed + 0.5)); });
    racers.forEach(r=>{ obstacles.forEach(o=>{ const dx = Math.abs(r.x - o.x), dy = Math.abs(r.y - o.y); if(dx < 36 && dy < 20){ r.speed *= 0.55; if(r.isPlayer){ Audio.play('crash',{reset:true,volume:0.9}); spawnConfetti(r.x, H/2); flashCanvas(); } } }); });
    racers.forEach(r=>{ r.y -= r.speed * (dt/16); if(r.y < LEVELS[levelIdx].finish && !r.finished){ r.finished=true; r.finishTime = performance.now(); } });
    const order = [...racers].sort((a,b)=> a.y - b.y); const pIndex = order.findIndex(r=> r.isPlayer);
    $('posInfo').textContent = `Pos: ${pIndex+1}/${racers.length}`; const p = racers.find(r=> r.isPlayer); const dist = Math.max(0, Math.min(100, Math.round((Math.abs(LEVELS[levelIdx].finish) - Math.abs(p.y)) / Math.abs(LEVELS[levelIdx].finish) * 100))); $('distInfo').textContent = `Dist: ${dist}%`; $('timeInfo').textContent = `Tiempo: ${((performance.now()-startTime)/1000).toFixed(2)}s`;
    offsetY = order[0].y + 820;
    updateParticles(dt, offsetY);
    if(racers.every(r=> r.finished)){ running=false; onFinish(); }
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    const g = ctx.createLinearGradient(0,0,W,0); g.addColorStop(0,'#07151d'); g.addColorStop(1,'#021018'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    const tx = 100 * DPR, tw = W - tx*2; ctx.fillStyle = '#16262f'; roundRect(tx/DPR, 30/DPR, tw/DPR, (H - 60)/DPR, 22/DPR, true);
    for(let i=0;i<CONFIG.lanes;i++){ const lx = laneCenter(i)/DPR; ctx.fillStyle='rgba(255,255,255,0.04)'; ctx.fillRect(lx-2,0,4,H/DPR); }
    obstacles.forEach(o=>{ const dy = (H/DPR) - ((o.y - offsetY)/DPR) - 90; if(dy < -60 || dy > H/DPR + 80) return; ctx.save(); ctx.translate(o.x/DPR, dy); ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(-12,10); ctx.lineTo(12,10); ctx.closePath(); ctx.fillStyle = '#ff7a00'; ctx.fill(); ctx.restore(); });
    const finishDY = (H/DPR) - ((LEVELS[levelIdx].finish - offsetY)/DPR) - 90; if(finishDY < H/DPR + 200){ ctx.fillStyle='#fff'; for(let i=0;i<12;i++){ ctx.fillRect((tx/DPR)+i*40, finishDY, 20, 10); } ctx.font='22px sans-serif'; ctx.fillText('META', (W/DPR)/2 - 30, finishDY - 6); }
    racers.forEach(r=> r.draw(offsetY));
    drawParticles(offsetY);
  }

  function loop(ts){ update(ts); draw(); if(running) requestAnimationFrame(loop); }

  function start(chosenIdx=0, demo=false){
    chosenCarIdx = chosenIdx; levelIdx = 0; demoMode = demo; startTime = performance.now();
    setupRace(chosenIdx, levelIdx); running=true; lastTs=0; requestAnimationFrame(loop);
  }

  function onFinish(){
    Audio.stopAll(); Audio.play('win',{reset:true,volume:0.9}); spawnConfetti(W/2, H/2);
    const ranking = [...racers].sort((a,b)=> a.finishTime - b.finishTime); const player = ranking.find(r=> r.isPlayer);
    if(player){ const base = Math.min(...ranking.map(r=> r.finishTime)); const t = player.finishTime - base; Records.add(t); }
    overlays.finish.classList.remove('hidden');
    $('finishTitle').textContent = (ranking[0].isPlayer ? '🏆 ¡Felicidades!' : 'Carrera terminada');
    $('finishText').textContent = (ranking[0].isPlayer ? 'Feliz día Hotwheels, campeón' : `Ganador: ${ranking[0].name}`);
  }

  function flashCanvas(){ canvas.style.filter = 'brightness(1.6) saturate(1.1)'; setTimeout(()=> canvas.style.filter = '', 120); }

  return { start };
})();

/* ---------- finish overlay wiring ---------- */
$('finishReplay').addEventListener('click', ()=> { overlays.finish.classList.add('hidden'); UI.startRaceFlow(false); });
$('finishContinue').addEventListener('click', ()=> { overlays.finish.classList.add('hidden'); /* continue not implemented: could advance level here */ });
$('finishMenu').addEventListener('click', ()=> { overlays.finish.classList.add('hidden'); showScreen('menu'); });

/* ---------- unlock audio on first gesture ---------- */
document.addEventListener('click', function unlock(){ Audio.setVolume(Audio.settings.volume ?? 0.8); Audio.setMusic(Audio.settings.music); Audio.setSfx(Audio.settings.sfx); document.removeEventListener('click', unlock); });

/* show intro */
showScreen('intro');
