/* js/game.js
   Juego Hotwheels Arcade Pro - versión completa "single page app"
   Contiene:
    - UI (overlays, carousel, demo/tutorial)
    - AudioManager (música / sfx / persistencia)
    - Game engine (canvas, racers, obstacles, levels, particles)
    - Persistence (localStorage: records, settings)
*/

/* ---------- Helpers ---------- */
const $ = id => document.getElementById(id);
const q = sel => document.querySelector(sel);
const wait = ms => new Promise(res => setTimeout(res, ms));

/* ---------- Config & Assets ---------- */
const CONFIG = {
  recordsKey: 'hotwheels_records_v1',
  settingsKey: 'hotwheels_settings_v1',
  canvasId: 'gameCanvas',
  lanes: 4,
};

const CARS = [
  { id:'c1', name:'Aurora', img: 'https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg?auto=compress&cs=tinysrgb&w=800', color:'#ff3b3b', engine: 'audio_eng_a' },
  { id:'c2', name:'Eclipse', img: 'https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg?auto=compress&cs=tinysrgb&w=800', color:'#1fd1a6', engine: 'audio_eng_b' },
  { id:'c3', name:'Phantom', img: 'https://images.pexels.com/photos/97979/pexels-photo-97979.jpeg?auto=compress&cs=tinysrgb&w=800', color:'#6c5eff', engine: 'audio_eng_c' },
  { id:'c4', name:'Vortex',  img: 'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=800', color:'#ff8a00', engine: 'audio_eng_a' }
];

const LEVELS = [
  { id:1, name:'Práctica', finish:-1800, obstacleFreq:1200, bgSpeed:0.2 },
  { id:2, name:'Intermedio', finish:-2600, obstacleFreq:900, bgSpeed:0.3 },
  { id:3, name:'Desafío', finish:-3600, obstacleFreq:700, bgSpeed:0.45 },
];

/* ---------- Audio Manager ---------- */
const AudioManager = (function(){
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
    try{ return JSON.parse(localStorage.getItem(CONFIG.settingsKey)) || {music:true,sfx:true,volume:0.8}; }catch(e){ return {music:true,sfx:true,volume:0.8}; }
  }
  function save(){ localStorage.setItem(CONFIG.settingsKey, JSON.stringify(settings)); }
  function setMutedMusic(v){ settings.music = v; save(); apply(); }
  function setMutedSfx(v){ settings.sfx = v; save(); apply(); }
  function setVolume(v){ settings.volume = v; save(); apply(); }
  function apply(){
    Object.values(S).forEach(a=>{
      try{ a.volume = settings.volume; }catch(e){} 
    });
    // music controls
    S.race.muted = !settings.music;
    S.intro.muted = !settings.music;
  }
  function play(key, opts = {}) {
    const el = S[key];
    if(!el) return;
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
  function stop(key){
    const el = S[key]; if(!el) return;
    try{ el.pause(); el.currentTime = 0; }catch(e){}
  }
  function stopAll(){
    Object.values(S).forEach(s=>{ try{s.pause(); s.currentTime=0;}catch(e){} });
  }
  apply();
  return {
    settings,
    setMutedMusic, setMutedSfx, setVolume,
    play, stop, stopAll
  };
})();

/* ---------- Persistence: Records ---------- */
const Records = {
  get(){
    try{ return JSON.parse(localStorage.getItem(CONFIG.recordsKey)) || []; }catch(e){ return []; }
  },
  add(time){
    const arr = this.get();
    arr.push(time);
    arr.sort((a,b)=>a-b);
    const trimmed = arr.slice(0,10);
    localStorage.setItem(CONFIG.recordsKey, JSON.stringify(trimmed));
  },
  clear(){
    localStorage.removeItem(CONFIG.recordsKey);
  }
};

/* ---------- UI Controller (overlays, carousel, demo) ---------- */
const UI = (function(){
  // elements
  const intro = $('intro'), introYes = $('introYes'), introNo = $('introNo');
  const legoWrap = $('legoWrap');
  const mainMenu = $('mainMenu'), menuClose = $('menuClose');
  const selectOverlay = $('selectOverlay'), carouselTrack = $('carouselTrack'), carouselLeft = $('carouselLeft'), carouselRight = $('carouselRight');
  const selectPlay = $('selectPlay'), closeSelect = $('closeSelect');
  const recordsOverlay = $('recordsOverlay'), closeRecords = $('closeRecords'), clearRecordsBtn = $('clearRecords');
  const configOverlay = $('configOverlay'), toggleMusic = $('toggleMusic'), toggleSfx = $('toggleSfx'), volumeRange = $('volumeRange'), closeConfig = $('closeConfig');
  const demoOverlay = $('demoOverlay'), playDemoBtn = $('playDemo'), closeDemo = $('closeDemo');
  const rulesOverlay = $('rulesOverlay'), closeRules = $('closeRules');
  const countdown = $('countdown'), countNum = $('countNum');
  const finishOverlay = $('finishOverlay'), finishReplay = $('finishReplay'), finishContinue = $('finishContinue'), finishMenu = $('finishMenu');
  const recordsList = $('recordsList');

  // carousel state
  let index = 0;
  let startX = 0, isDragging = false;

  function init(){
    // intro behavior
    startNoDrift();
    introNo.addEventListener('click', () => {
      introNo.animate([{transform:'scale(1)'},{transform:'scale(1.06)'},{transform:'scale(1)'}],{duration:360});
    });
    introYes.addEventListener('click', async () => {
      stopNoDrift();
      AudioManager.play('intro', {reset:true});
      await playLegoAssembly();
      intro.classList.add('hidden');
      mainMenu.classList.remove('hidden');
    });

    // menu buttons
    $('menu_play').addEventListener('click', () => { mainMenu.classList.add('hidden'); openSelect(); });
    $('menu_select').addEventListener('click', () => { mainMenu.classList.add('hidden'); openSelect(); });
    $('menu_records').addEventListener('click', () => { renderRecords(); mainMenu.classList.add('hidden'); recordsOverlay.classList.remove('hidden'); });
    $('menu_config').addEventListener('click', () => { mainMenu.classList.add('hidden'); openConfig(); });
    $('menu_demo').addEventListener('click', () => { mainMenu.classList.add('hidden'); demoOverlay.classList.remove('hidden'); });
    $('menu_rules').addEventListener('click', () => { mainMenu.classList.add('hidden'); rulesOverlay.classList.remove('hidden'); });

    menuClose.addEventListener('click', ()=> mainMenu.classList.add('hidden'));

    // carousel controls
    carouselLeft.addEventListener('click', ()=> { setIndex(index - 1); });
    carouselRight.addEventListener('click', ()=> { setIndex(index + 1); });

    carouselTrack.addEventListener('pointerdown', (e)=> {
      isDragging = true; startX = e.clientX; carouselTrack.setPointerCapture(e.pointerId);
    });
    carouselTrack.addEventListener('pointerup', (e)=> { isDragging = false; carouselTrack.releasePointerCapture(e.pointerId); });
    carouselTrack.addEventListener('pointermove', (e)=> {
      if(!isDragging) return;
      const dx = e.clientX - startX;
      if(dx > 40){ setIndex(index - 1); startX = e.clientX; }
      if(dx < -40){ setIndex(index + 1); startX = e.clientX; }
    });

    selectPlay.addEventListener('click', ()=> { selectOverlay.classList.add('hidden'); startRaceFlow(index); });
    closeSelect.addEventListener('click', ()=> { selectOverlay.classList.add('hidden'); mainMenu.classList.remove('hidden'); });

    // records
    closeRecords.addEventListener('click', ()=> recordsOverlay.classList.add('hidden'));
    clearRecordsBtn.addEventListener('click', ()=> { Records.clear(); renderRecords(); });

    // config
    closeConfig.addEventListener('click', ()=> configOverlay.classList.add('hidden'));
    toggleMusic.addEventListener('change', ()=> { AudioManager.setMutedMusic(toggleMusic.checked ? true : false); });
    toggleSfx.addEventListener('change', ()=> { AudioManager.setMutedSfx(toggleSfx.checked ? true : false); });
    volumeRange.addEventListener('input', ()=> { AudioManager.setVolume(parseFloat(volumeRange.value)); });

    // demo
    playDemoBtn.addEventListener('click', ()=> { playDemo(); });
    closeDemo.addEventListener('click', ()=> demoOverlay.classList.add('hidden'));

    // rules
    closeRules.addEventListener('click', ()=> rulesOverlay.classList.add('hidden'));

    // finish overlay controls
    finishReplay.addEventListener('click', ()=> { finishOverlay.classList.add('hidden'); Game.start(index); });
    finishContinue.addEventListener('click', ()=> { finishOverlay.classList.add('hidden'); Game.continueToNextLevel(); });
    finishMenu.addEventListener('click', ()=> { finishOverlay.classList.add('hidden'); mainMenu.classList.remove('hidden'); });

    // populate carousel
    renderCarousel();
    // load settings into UI
    loadSettingsUI();
    // open menu button on topbar
    $('openMenu').addEventListener('click', ()=> mainMenu.classList.remove('hidden'));
    // mobile touch buttons mapping to Game.input
    $('touchLeft').addEventListener('touchstart', ()=> Game.input.left = true, {passive:true});
    $('touchLeft').addEventListener('touchend', ()=> Game.input.left = false, {passive:true});
    $('touchRight').addEventListener('touchstart', ()=> Game.input.right = true, {passive:true});
    $('touchRight').addEventListener('touchend', ()=> Game.input.right = false, {passive:true});
  }

  /* No-drift start/stop (intro No button floats) */
  let noDriftTimer = null;
  function startNoDrift(){
    const btn = $('introNo');
    let t = 0;
    noDriftTimer = setInterval(()=> { t += 0.12; btn.style.transform = `translate(${Math.sin(t)*18}px, ${Math.cos(t)*8}px)`; }, 70);
  }
  function stopNoDrift(){ clearInterval(noDriftTimer); $('introNo').style.transform = ''; }

  /* LEGO assembly animation (blocks assemble then smash) */
  async function playLegoAssembly(){
    legoWrap.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'lego-assembly';
    // pattern 16x6
    const cols = 16, rows = 6;
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const b = document.createElement('div');
        b.style.width = '14px';
        b.style.height = '14px';
        if(r === 0 && c>2 && c<13) b.style.background = '#ffffff';
        else if(r>3 && (c<3 || c>12)) b.style.background = '#111827';
        else if(c>4 && c<11) b.style.background = '#ff3b3b';
        else b.style.background = '#d94b4b';
        b.style.transform = 'translateY(160px) scale(0.8)';
        b.style.opacity = '0';
        container.appendChild(b);
      }
    }
    legoWrap.appendChild(container);
    const blocks = Array.from(container.children);
    blocks.forEach((b,i)=> setTimeout(()=> { b.style.transition='transform 420ms cubic-bezier(.2,.9,.2,1), opacity 160ms'; b.style.transform='translateY(0) scale(1)'; b.style.opacity='1'; }, i*8 + Math.random()*60));
    await wait(1200 + blocks.length*4);
    // smash
    container.style.transition = 'transform 900ms cubic-bezier(.2,.9,.2,1), opacity 260ms';
    container.style.transform = 'translateY(-420px) scale(1.6) rotate(12deg)';
    container.style.opacity = '0';
    AudioManager.play('crash', {reset:true, volume:0.9});
    await wait(900);
    legoWrap.innerHTML = '';
  }

  /* Carousel UI */
  function renderCarousel(){
    carouselTrack.innerHTML = '';
    CARS.forEach((c,i)=>{
      const el = document.createElement('div');
      el.className = 'carousel-item' + (i===0?' selected':'');
      el.innerHTML = `<img src="${c.img}" alt="${c.name}" style="width:100%;height:120px;object-fit:cover;border-radius:8px"/><div style="margin-top:8px;font-weight:800">${c.name}</div>`;
      el.addEventListener('click', ()=> { setIndex(i); });
      carouselTrack.appendChild(el);
    });
    index = 0;
    updateCarousel();
  }
  function setIndex(i){
    if(i < 0) i = CARS.length - 1;
    if(i >= CARS.length) i = 0;
    index = i;
    updateCarousel();
    // quick engine sound preview
    const engKey = CARS[index].engine;
    AudioManager.play(engKey, {reset:true, volume:0.45});
  }
  function updateCarousel(){
    const items = carouselTrack.children;
    for(let j=0;j<items.length;j++){
      items[j].classList.toggle('selected', j===index);
    }
    // move track center
    const itemWidth = items[0] ? items[0].getBoundingClientRect().width + 12 : 0;
    const offset = (itemWidth * index);
    carouselTrack.style.transform = `translateX(${-offset}px)`;
  }

  /* Records rendering */
  function renderRecords(){
    const arr = Records.get();
    recordsList.innerHTML = '';
    if(arr.length === 0) recordsList.innerHTML = '<li>No hay registros aún</li>';
    arr.forEach((t,i)=> {
      const li = document.createElement('li');
      li.textContent = `${i+1}. ${(t/1000).toFixed(2)} s`;
      recordsList.appendChild(li);
    });
  }

  /* Config UI */
  function openConfig(){
    toggleMusic.checked = AudioManager.settings.music;
    toggleSfx.checked = AudioManager.settings.sfx;
    volumeRange.value = AudioManager.settings.volume ?? 0.8;
    configOverlay.classList.remove('hidden');
  }
  function loadSettingsUI(){
    toggleMusic.checked = AudioManager.settings.music;
    toggleSfx.checked = AudioManager.settings.sfx;
    volumeRange.value = AudioManager.settings.volume ?? 0.8;
  }

  /* Demo (plays automated demo runner) */
  async function playDemo(){
    demoOverlay.classList.add('hidden');
    // simple demo: open select, pick first car, run an automated short demo play for 8s
    mainMenu.classList.add('hidden');
    openSelect();
    setIndex(0);
    await wait(900);
    selectOverlay.classList.add('hidden');
    // start small demo run
    AudioManager.play('race', {reset:true, volume:0.45});
    const demoTime = 8000;
    Game.demoMode = true;
    Game.start(index, true); // start demo
    await wait(demoTime);
    Game.stopDemo();
    Game.demoMode = false;
    AudioManager.stop('race');
    // show demo finish info and return to menu
    finishOverlay.classList.remove('hidden');
    $('finishTitle').textContent = 'Demo finalizada';
    $('finishText').textContent = 'Eso es todo — ahora prueba el juego real.';
  }

  /* Countdown flow used when starting race */
  async function startRaceFlow(chosenIdx){
    countdown.classList.remove('hidden');
    let n = 3;
    countNum.textContent = n;
    while(n > 0){
      AudioManager.play('beep', {reset:true});
      await wait(900);
      n--;
      countNum.textContent = n > 0 ? n : '¡Go!';
    }
    countdown.classList.add('hidden');
    AudioManager.play('shot', {reset:true});
    // start music and engine
    AudioManager.play('race', {reset:true});
    const engineKey = CARS[chosenIdx].engine;
    AudioManager.play(engineKey, {volume:0.28});
    // Start the actual game
    Game.start(chosenIdx);
  }

  return {
    init, setIndex, renderRecords, openConfig, playDemo
  };
})();

/* ---------- Game Engine (Canvas) ---------- */
const Game = (function(){
  const canvas = $(CONFIG.canvasId);
  const ctx = canvas.getContext('2d', { alpha: false });
  let DPR = window.devicePixelRatio || 1;
  let W = canvas.width, H = canvas.height;

  function resize(){
    const rect = canvas.getBoundingClientRect();
    W = canvas.width = Math.max(900, Math.round(rect.width * DPR));
    H = canvas.height = Math.max(520, Math.round(rect.height * DPR));
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(1,0,0,1,0,0);
  }
  window.addEventListener('resize', ()=> { DPR = window.devicePixelRatio || 1; resize(); });

  // Game state
  let racers = [], obstacles = [], particles = [];
  let offsetY = 0;
  let running = false;
  let startTime = 0;
  let lastTs = 0;
  let chosenCarIdx = 0;
  let currentLevelIdx = 0;
  let demoMode = false;

  // Input
  const input = { left:false, right:false };
  window.addEventListener('keydown', e => {
    if(e.key === 'ArrowLeft') input.left = true;
    if(e.key === 'ArrowRight') input.right = true;
    if(e.key === ' ' && !running) { /* optional turbo */ }
  });
  window.addEventListener('keyup', e => {
    if(e.key === 'ArrowLeft') input.left = false;
    if(e.key === 'ArrowRight') input.right = false;
  });

  // touch buttons wired from UI init (Game.input)
  const touchLeft = $('touchLeft'), touchRight = $('touchRight');
  if(touchLeft && touchRight){
    touchLeft.addEventListener('touchstart', ()=> input.left = true, {passive:true});
    touchLeft.addEventListener('touchend', ()=> input.left = false, {passive:true});
    touchRight.addEventListener('touchstart', ()=> input.right = true, {passive:true});
    touchRight.addEventListener('touchend', ()=> input.right = false, {passive:true});
  }

  // Racer class
  class Racer {
    constructor(name, color, x, lane, isPlayer=false){
      this.name = name; this.color = color; this.x = x; this.lane = lane;
      this.y = 0; this.speed = 0; this.maxSpeed = 1.9 + Math.random() * 1.1;
      this.isPlayer = isPlayer; this.finished = false; this.finishTime = null;
      this.width = 58; this.height = 34;
    }
    draw(offsetY){
      const drawX = (this.x/ DPR) - this.width/2;
      const drawY = (H/ DPR) - ((this.y - offsetY)/ DPR) - 90;
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(drawX + 6, drawY + this.height - 6, this.width - 12, 6);
      // body
      ctx.fillStyle = this.color;
      roundRect(drawX, drawY, this.width, this.height, 6, true);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(drawX + 12, drawY + 6, 22, 8);
      ctx.fillRect(drawX + 36, drawY + 6, 10, 8);
    }
  }

  function roundRect(x,y,w,h,r, fill=true){
    ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
    if(fill) ctx.fill(); else ctx.stroke();
  }

  /* Parallax backgrounds: simple color layers + moving shapes */
  let bgOffset = 0;
  function drawBackground(level){
    // sky gradient
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#081625'); g.addColorStop(1,'#021017');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    // parallax decorative bands
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for(let i=0;i<6;i++){
      const y = (i*120 + (bgOffset * (0.2 + i*0.03))) % (H + 200) - 100;
      ctx.fillRect(0, y, W, 40);
    }
  }

  /* Particles system */
  function spawnSparks(x,y){
    for(let i=0;i<10;i++){
      particles.push({
        x, y, vx: (Math.random()-0.5)*4, vy: - (Math.random()*4 + 1),
        life: Math.random()*400 + 200, color: ['#ffd34d','#ff8a00','#fff'][Math.floor(Math.random()*3)],
        confetti: false
      });
    }
  }
  function spawnConfetti(x,y){
    for(let i=0;i<50;i++){
      particles.push({
        x, y, vx: (Math.random()-0.5)*6, vy: - (Math.random()*5 + 1),
        life: Math.random()*1400 + 800, color: ['#ff3b3b','#ffd34d','#1fd1a6','#6c5eff'][Math.floor(Math.random()*4)],
        confetti: true
      });
    }
  }
  function updateParticles(dt, offsetY){
    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      p.vy += 0.02 * dt;
      p.x += p.vx * (dt/16);
      p.y += p.vy * (dt/16);
      p.life -= dt;
      if(p.life <= 0) particles.splice(i,1);
    }
  }
  function drawParticles(offsetY){
    particles.forEach(p=>{
      const dx = p.x / DPR;
      const dy = (p.y - offsetY) / DPR;
      ctx.fillStyle = p.color;
      if(p.confetti) ctx.fillRect(dx, (H/DPR) - dy, 4,8);
      else ctx.fillRect(dx, (H/DPR) - dy, 3,3);
    });
  }

  /* Obstacles drawing */
  function drawObstacle(o, offsetY){
    const dy = (H/DPR) - ((o.y - offsetY) / DPR) - 90;
    if(dy < -80 || dy > H/DPR + 80) return;
    ctx.save(); ctx.translate(o.x / DPR, dy);
    ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(-12,10); ctx.lineTo(12,10); ctx.closePath(); ctx.fillStyle = '#ff7a00'; ctx.fill();
    ctx.restore();
  }

  function spawnObstacles(level){
    obstacles = [];
    for(let y = -150; y > level.finish; y -= (level.obstacleFreq + Math.random()*400)){
      const lane = Math.floor(Math.random() * CONFIG.lanes);
      obstacles.push({ x: laneCenter(lane), y: y - Math.random()*60, w:36, h:18 });
    }
  }

  function laneCenter(i){
    const margin = 120 * DPR;
    const avail = W - margin*2;
    return margin + (i + 0.5) * (avail / CONFIG.lanes);
  }

  /* Game update loop */
  function update(ts){
    if(!running) return;
    const dt = lastTs ? (ts - lastTs) : 16;
    lastTs = ts;

    bgOffset += dt * (LEVELS[currentLevelIdx].bgSpeed * 0.02);

    // input (player)
    const player = racers.find(r=> r.isPlayer);
    if(player && !player.finished){
      if(demoMode) {
        // demo simple AI: random left/right to avoid obstacles
        autoDemoAI(player);
      } else {
        if(input.left) player.x -= 7 * (dt/16);
        if(input.right) player.x += 7 * (dt/16);
      }
      const minX = laneCenter(0) - 80, maxX = laneCenter(CONFIG.lanes-1) + 80;
      player.x = Math.max(minX, Math.min(maxX, player.x));
      player.speed += 0.03 * (dt/16); if(player.speed > player.maxSpeed) player.speed = player.maxSpeed;
    }

    // AI racers
    racers.forEach(r => {
      if(r.isPlayer || r.finished) return;
      const tx = laneCenter(r.lane);
      r.x += (tx - r.x) * 0.08 * (dt/16);
      if(Math.random() < 0.003) r.x += (Math.random()-0.5) * 40;
      r.speed += (r.maxSpeed - r.speed) * 0.005 + (Math.random()-0.5) * 0.01;
      r.speed = Math.max(0.7, Math.min(r.speed, r.maxSpeed + 0.5));
    });

    // collisions with obstacles
    racers.forEach(r => {
      obstacles.forEach(o => {
        const dx = Math.abs(r.x - o.x);
        const dy = Math.abs(r.y - o.y);
        if(dx < 36 && dy < 20){
          r.speed *= 0.55;
          if(r.isPlayer){
            AudioManager.play('crash', {reset:true});
            spawnSparks(r.x, H * DPR * 0.5);
            flashScreen();
          }
        }
      });
    });

    // progress
    racers.forEach(r => {
      r.y -= r.speed * (dt/16);
      if(r.y < LEVELS[currentLevelIdx].finish && !r.finished){
        r.finished = true; r.finishTime = performance.now();
      }
    });

    // update particles
    updateParticles(dt, offsetY);

    // HUD update
    const order = [...racers].sort((a,b)=> a.y - b.y);
    const pIndex = order.findIndex(r=> r.isPlayer);
    $('posInfo').textContent = `Posición: ${pIndex+1}/${racers.length}`;
    const p = racers.find(r=> r.isPlayer);
    const dist = Math.max(0, Math.min(100, Math.round((Math.abs(LEVELS[currentLevelIdx].finish) - Math.abs(p.y)) / Math.abs(LEVELS[currentLevelIdx].finish) * 100)));
    $('lapInfo').textContent = `Distancia: ${dist}%`;
    $('timeInfo').textContent = `Tiempo: ${((performance.now() - startTime)/1000).toFixed(2)}s`;

    offsetY = order[0].y + 820;

    // check finish
    if(racers.every(r=> r.finished)){
      running = false;
      onFinish();
    }
  }

  function draw(){
    // clear
    ctx.clearRect(0,0,W,H);
    drawBackground(LEVELS[currentLevelIdx]); // simple parallax
    // track region
    const tx = 100 * DPR, tw = W - tx*2;
    ctx.fillStyle = '#16262f'; roundRect(tx/DPR, 30/DPR, tw/DPR, (H - 60)/DPR, 22/DPR, true);

    // lane markers
    for(let i=0;i<CONFIG.lanes;i++){
      const lx = laneCenter(i) / DPR;
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(lx - 2, 0, 4, H / DPR);
    }

    // obstacles
    obstacles.forEach(o => drawObstacle(o, offsetY));

    // finish line
    const finishDY = (H/DPR) - ((LEVELS[currentLevelIdx].finish - offsetY)/ DPR) - 90/DPR;
    if(finishDY < (H/DPR + 200)){
      ctx.fillStyle = '#fff';
      for(let i=0;i<12;i++){
        ctx.fillRect((tx/DPR) + i*40, finishDY, 20, 10);
      }
      ctx.font = '22px sans-serif';
      ctx.fillText('META', (W/DPR)/2 - 30, finishDY - 6);
    }

    // racers
    racers.forEach(r => r.draw(offsetY));

    // particles
    drawParticles(offsetY);
  }

  function loop(ts){
    update(ts);
    draw();
    if(running) requestAnimationFrame(loop);
  }

  /* Public API: start/stop, continue to next level, demo controls */
  function start(chosenIdx = 0, demo = false){
    // prepare
    resize();
    chosenCarIdx = chosenIdx;
    demoMode = !!demo;
    currentLevelIdx = 0;
    setupRace(chosenIdx, currentLevelIdx);
    running = true;
    startTime = performance.now();
    lastTs = 0;
    requestAnimationFrame(loop);
  }

  function stopDemo(){
    demoMode = false;
    running = false;
    // stop music
    AudioManager.stop('race');
  }

  function stop(){
    running = false;
    AudioManager.stopAll();
  }

  function continueToNextLevel(){
    if(currentLevelIdx < LEVELS.length - 1){
      currentLevelIdx++;
      // start same car at next level
      setupRace(chosenCarIdx, currentLevelIdx);
      running = true;
      startTime = performance.now();
      lastTs = 0;
      AudioManager.play('race', {reset:true});
      requestAnimationFrame(loop);
      $('levelLabel').textContent = `Nivel ${LEVELS[currentLevelIdx].id} - ${LEVELS[currentLevelIdx].name}`;
    } else {
      // finished all levels
      $('finishTitle').textContent = '¡Has completado todos los niveles!';
      $('finishText').textContent = 'Gracias por jugar';
    }
  }

  /* Setup race, create racers and obstacles */
  function setupRace(chosenIdx, levelIdx){
    racers = []; obstacles = []; particles = [];
    offsetY = 0;
    currentLevelIdx = levelIdx || 0;
    // create racers
    for(let i=0;i<CONFIG.lanes;i++){
      const x = laneCenter(i);
      if(i===0){
        const car = CARS[chosenIdx % CARS.length];
        racers.push(new Racer('Tú', car.color, x, i, true));
      } else {
        const cols = ['#ff8a00','#6bd1ff','#d46cff','#f1c40f'];
        racers.push(new Racer('CPU'+i, cols[i%cols.length], x, i, false));
      }
      racers[i].y = -i * 36;
    }
    // obstacles
    spawnObstacles(LEVELS[currentLevelIdx]);
    // update label
    $('levelLabel').textContent = `Nivel ${LEVELS[currentLevelIdx].id} - ${LEVELS[currentLevelIdx].name}`;
  }

  /* called when all racers finished */
  function onFinish(){
    AudioManager.stopAll();
    AudioManager.play('win', {reset:true});
    spawnConfetti(W/2, H/2);
    // compute ranking and save record if player is in list
    const ranking = [...racers].sort((a,b)=> a.finishTime - b.finishTime);
    const player = ranking.find(r => r.isPlayer);
    if(player){
      const base = Math.min(...ranking.map(r=> r.finishTime));
      const t = player.finishTime - base;
      Records.add(t);
    }
    // show finish overlay
    $('finishOverlay').classList.remove('hidden');
  }

  /* Demo AI: simple behavior to avoid obstacles */
  function autoDemoAI(player){
    // very simple: if obstacle close ahead in same lane, move left/right randomly
    const lookAhead = 200;
    const upcoming = obstacles.find(o => Math.abs(o.y - player.y) < lookAhead && Math.abs(o.x - player.x) < 220);
    if(upcoming){
      if(Math.random() > 0.5) player.x += 8;
      else player.x -= 8;
    } else {
      // slight wandering
      if(Math.random() < 0.02) player.x += (Math.random()-0.5)*8;
    }
  }

  /* helper: flash screen on crash */
  function flashScreen(){
    canvas.style.filter = 'brightness(1.5) saturate(1.1)';
    setTimeout(()=> canvas.style.filter = '', 120);
  }

  return {
    start,
    stop,
    stopDemo,
    continueToNextLevel,
    input,
    demoMode
  };
})();

/* ---------- Boot (init UI and attach actions) ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // init UI controls
  UI.init();
  // ensure audio allowed after gesture
  function unlockAudio(){
    AudioManager.setVolume(AudioManager.settings.volume ?? 0.8);
    AudioManager.setMutedMusic(AudioManager.settings.music);
    AudioManager.setMutedSfx(AudioManager.settings.sfx);
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
  }
  document.addEventListener('click', unlockAudio);
  document.addEventListener('touchstart', unlockAudio);
});
