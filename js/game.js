/* js/game.js
   Juego Hotwheels Arcade Pro (modular, comentado)
   - UIController: overlays, animations
   - AudioManager: centraliza reproducción/ mute
   - AssetLoader: precarga assets
   - GameEngine: canvas, entities, physics, AI, particles
   - Persistence: localStorage récords
*/

/* ========================
   CONFIG / ASSETS
   ======================== */
const CONFIG = {
  canvasId: 'gameCanvas',
  recordsKey: 'hotwheels_records_v5',
  finishDistance: -2600,
  lanes: 4
};

const ASSETS = {
  cars: [
    { id: 'aurora', name:'Aurora', img: 'https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg?auto=compress&cs=tinysrgb&w=800', engine: 'aEngA', color:'#ff3b3b'},
    { id: 'eclipse', name:'Eclipse', img: 'https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg?auto=compress&cs=tinysrgb&w=800', engine: 'aEngB', color:'#1fd1a6'},
    { id: 'phantom', name:'Phantom', img: 'https://images.pexels.com/photos/97979/pexels-photo-97979.jpeg?auto=compress&cs=tinysrgb&w=800', engine: 'aEngC', color:'#6c5eff'},
    { id: 'vortex',  name:'Vortex', img: 'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=800', engine: 'aEngA', color:'#ff8a00'}
  ],
  sounds: {
    aIntro: document.getElementById('aIntro'),
    aBeep: document.getElementById('aBeep'),
    aShot: document.getElementById('aShot'),
    aCrash: document.getElementById('aCrash'),
    aRace: document.getElementById('aRace'),
    aEngA: document.getElementById('aEngA'),
    aEngB: document.getElementById('aEngB'),
    aEngC: document.getElementById('aEngC'),
    aWin: document.getElementById('aWin')
  }
};

/* ========================
   UTILITIES
   ======================== */
const $ = (id)=>document.getElementById(id);
const wait = ms => new Promise(r=>setTimeout(r,ms));
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const rand = (a,b)=> a + Math.random()*(b-a);

/* ========================
   AudioManager
   ======================== */
const AudioManager = {
  muted: true,
  setMuted(v){
    this.muted = v;
    Object.values(ASSETS.sounds).forEach(s=>{
      try{ s.muted = v; }catch(e){}
    });
    $('muteBtn').textContent = v ? '🔇' : '🔊';
  },
  play(key, opts={}){
    const audio = ASSETS.sounds[key];
    if(!audio) return;
    try{
      if(opts.reset) audio.currentTime = 0;
      audio.volume = opts.volume ?? 0.6;
      if(!this.muted) audio.play();
    }catch(e){ /* autoplay blocked until user gesture */ }
  },
  stop(key){
    const audio = ASSETS.sounds[key];
    if(!audio) return;
    try{ audio.pause(); audio.currentTime = 0; }catch(e){}
  },
  pauseAll(){
    Object.values(ASSETS.sounds).forEach(s=>{ try{s.pause();}catch(e){} });
  }
};

/* initialize mute state (require user gesture to unmute) */
AudioManager.setMuted(true);

/* ========================
   UIController: overlays, lego animation, carousel
   ======================== */
const UI = (function(){
  const intro = $('intro');
  const legoWrap = $('legoWrap');
  const mainMenu = $('mainMenu');
  const selectOverlay = $('selectOverlay');
  const recordsOverlay = $('recordsOverlay');
  const countdown = $('countdown');
  const finishOverlay = $('finishOverlay');
  let chosenIndex = 0;

  function init(){
    // intro buttons
    $('introNo').addEventListener('click', ()=>{ // drift animation feedback is style-driven
      $('introNo').animate([{transform:'scale(1)'},{transform:'scale(1.06)'},{transform:'scale(1)'}],{duration:360});
    });
    $('introYes').addEventListener('click', async ()=>{
      // stop any NO drift
      stopNoDrift();
      // play intro sting
      AudioManager.play('aIntro', {reset:true, volume:0.8});
      // play lego assembly and smash
      await playLegoAssembly();
      // show menu
      intro.classList.add('hidden');
      showMainMenu();
    });

    // main menu buttons
    $('menu_play').addEventListener('click', ()=>{ hideMainMenu(); openSelect(); });
    $('menu_select').addEventListener('click', ()=>{ hideMainMenu(); openSelect(); });
    $('menu_records').addEventListener('click', ()=>{ renderRecords(); recordsOverlay.classList.remove('hidden'); });
    $('menu_rules').addEventListener('click', ()=>{ alert('Reglas: evita conos, cruza la meta y sé el primero.'); });
    $('menuClose').addEventListener('click', ()=> mainMenu.classList.add('hidden'));

    // select overlay handlers
    $('selectPlay').addEventListener('click', ()=>{ selectOverlay.classList.add('hidden'); startRaceSequence(); });
    $('closeSelect').addEventListener('click', ()=>{ selectOverlay.classList.add('hidden'); mainMenu.classList.remove('hidden'); });

    // records overlay
    $('closeRecords').addEventListener('click', ()=> recordsOverlay.classList.add('hidden'));

    // finish overlay
    $('finishReplay').addEventListener('click', ()=>{ finishOverlay.classList.add('hidden'); Game.start(); });
    $('finishMenu').addEventListener('click', ()=>{ finishOverlay.classList.add('hidden'); showMainMenu(); });

    // mute
    $('muteBtn').addEventListener('click', ()=> AudioManager.setMuted(!AudioManager.muted));

    // touch controls
    $('touchLeft').addEventListener('touchstart', ()=> Game.input.left = true, {passive:true});
    $('touchLeft').addEventListener('touchend', ()=> Game.input.left = false, {passive:true});
    $('touchRight').addEventListener('touchstart', ()=> Game.input.right = true, {passive:true});
    $('touchRight').addEventListener('touchend', ()=> Game.input.right = false, {passive:true});

    startNoDrift();
    renderCarousel();
  }

  // animate "No" drift
  let noDriftTimer = null;
  function startNoDrift(){
    const btn = $('introNo');
    let t = 0;
    noDriftTimer = setInterval(()=>{ t+=0.13; btn.style.transform = `translate(${Math.sin(t)*18}px, ${Math.cos(t)*8}px)`; }, 70);
  }
  function stopNoDrift(){ clearInterval(noDriftTimer); $('introNo').style.transform = ''; }

  // lego-style assembly: create div grid of small blocks then animate them
  async function playLegoAssembly(){
    // build grid
    legoWrap.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'lego-assembly';
    // create simple block pattern (16x6)
    const cols = 16, rows = 6;
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const block = document.createElement('div');
        block.className = 'lego-block';
        // color pattern for a car-like silhouette
        if(r===0 && c>2 && c<13) block.style.background = '#ffffff';
        else if(r>3 && (c<3 || c>12)) block.style.background = '#111827';
        else if(c>4 && c<11) block.style.background = '#ff3b3b';
        else block.style.background = '#d94b4b';
        block.style.width = '14px';
        block.style.height = '14px';
        block.style.borderRadius = '2px';
        block.style.transform = 'translateY(160px) scale(0.8)';
        block.style.opacity = '0';
        container.appendChild(block);
      }
    }
    legoWrap.appendChild(container);
    // animate blocks into place with stagger
    const blocks = Array.from(container.children);
    blocks.forEach((b,i)=>{
      const delay = i*8 + Math.random()*80;
      setTimeout(()=>{ b.style.transition = 'transform 420ms cubic-bezier(.2,.9,.2,1), opacity 160ms'; b.style.transform = 'translateY(0) scale(1)'; b.style.opacity = '1'; }, delay);
    });
    // wait for assembly then smash
    await wait(1200 + blocks.length*4);
    // smash: animate container
    container.style.transition = 'transform 900ms cubic-bezier(.2,.9,.2,1), opacity 260ms';
    container.style.transform = 'translateY(-340px) scale(1.6) rotate(14deg)';
    container.style.opacity = '0';
    // play crash SFX
    AudioManager.play('aCrash', {reset:true, volume:0.8});
    await wait(900);
    legoWrap.innerHTML = '';
  }

  // CAROUSEL / SELECT rendering
  function renderCarousel(){
    const carousel = $('carousel');
    carousel.innerHTML = '';
    ASSETS.cars.forEach((c, i)=>{
      const card = document.createElement('div');
      card.innerHTML = `<img src="${c.img}" alt="${c.name}" style="width:100%;height:110px;object-fit:cover;border-radius:8px"/><div style="margin-top:8px;font-weight:800">${c.name}</div>`;
      card.addEventListener('click', ()=>{
        chosenIndex = i;
        document.querySelectorAll('#carousel > div').forEach(n=>n.classList.remove('selected'));
        card.classList.add('selected');
        // quick motor sound
        AudioManager.play(ASSETS.cars[i].engine, {reset:true, volume:0.45});
      });
      if(i===0) card.classList.add('selected');
      carousel.appendChild(card);
    });
  }

  function openSelect(){ selectOverlay.classList.remove('hidden'); }
  function showMainMenu(){ mainMenu.classList.remove('hidden'); }
  function hideMainMenu(){ mainMenu.classList.add('hidden'); }

  function startRaceSequence(){
    // countdown with sound
    countdown.classList.remove('hidden');
    let n = 3;
    countNum.textContent = n;
    const step = setInterval(()=>{
      n--;
      if(n>0){
        countNum.textContent = n;
        AudioManager.play('aBeep', {reset:true, volume:0.6});
      } else {
        clearInterval(step);
        countdown.classList.add('hidden');
        // shot and start music
        AudioManager.play('aShot', {reset:true, volume:0.6});
        AudioManager.play('aRace', {reset:true, volume:0.45});
        // play chosen engine loop
        const engKey = ASSETS.cars[chosenIndex].engine;
        AudioManager.play(engKey, {volume:0.28});
        // actually start game
        Game.start(chosenIndex);
      }
    }, 900);
  }

  function renderRecords(){
    const arr = JSON.parse(localStorage.getItem(CONFIG.recordsKey) || '[]');
    const list = $('recordsList');
    list.innerHTML = '';
    if(arr.length === 0) list.innerHTML = '<li>No hay registros aún</li>';
    arr.forEach((t,i)=> {
      const li = document.createElement('li');
      li.textContent = `${i+1}. ${(t/1000).toFixed(2)} s`;
      list.appendChild(li);
    });
  }

  return {
    init, openSelect, startRaceSequence, renderRecords, showMainMenu, hideMainMenu
  };
})();

/* ========================
   Game Engine
   ======================== */
const Game = (function(){
  const canvas = document.getElementById(CONFIG.canvasId);
  const ctx = canvas.getContext('2d', { alpha: false });
  let W = canvas.width, H = canvas.height;

  function resize(){
    const rect = canvas.getBoundingClientRect();
    // keep internal resolution decent
    W = canvas.width = Math.max(1000, rect.width * devicePixelRatio);
    H = canvas.height = Math.max(560, rect.height * devicePixelRatio);
    ctx.setTransform(1,0,0,1,0,0);
  }
  window.addEventListener('resize', ()=> { try{ resize(); } catch(e){} });

  // Entities
  class Racer {
    constructor(name, color, x, lane, isPlayer=false){
      this.name = name;
      this.color = color;
      this.x = x;
      this.lane = lane;
      this.y = 0;
      this.speed = 0;
      this.maxSpeed = 1.9 + Math.random()*1.1;
      this.isPlayer = isPlayer;
      this.finished = false;
      this.finishTime = null;
      this.width = 58;
      this.height = 34;
    }
    draw(offsetY){
      const drawX = this.x - this.width/2;
      const drawY = H - (this.y - offsetY) - 90;
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(drawX+6, drawY + this.height - 6, this.width-12, 6);
      // body
      ctx.fillStyle = this.color;
      roundRect(drawX, drawY, this.width, this.height, 6, true);
      // windows
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(drawX + 12, drawY + 6, 22, 8);
      ctx.fillRect(drawX + 36, drawY + 6, 10, 8);
    }
  }

  function roundRect(x,y,w,h,r, fill){
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.closePath();
    if(fill) ctx.fill();
    else ctx.stroke();
  }

  // game state
  let racers = [], obstacles = [], offsetY = 0;
  let running = false;
  let lastTs = 0;
  const input = { left:false, right:false };
  const particles = [];

  // Attach keyboard
  window.addEventListener('keydown', (e)=> {
    if(e.key === 'ArrowLeft') input.left = true;
    if(e.key === 'ArrowRight') input.right = true;
  });
  window.addEventListener('keyup', (e)=> {
    if(e.key === 'ArrowLeft') input.left = false;
    if(e.key === 'ArrowRight') input.right = false;
  });

  // mobile touch area also sets Game.input dynamically (UI wires touch buttons to Game.input)
  const touchLeftBtn = $('touchLeft'), touchRightBtn = $('touchRight');
  if(touchLeftBtn && touchRightBtn){
    touchLeftBtn.addEventListener('touchstart', ()=> input.left = true, {passive:true});
    touchLeftBtn.addEventListener('touchend', ()=> input.left = false, {passive:true});
    touchRightBtn.addEventListener('touchstart', ()=> input.right = true, {passive:true});
    touchRightBtn.addEventListener('touchend', ()=> input.right = false, {passive:true});
  }

  // Setup race with chosen car index
  function setupRace(chosenIdx){
    racers = [];
    obstacles = [];
    offsetY = 0;
    const laneSpacing = 120;
    for(let i=0;i<CONFIG.lanes;i++){
      const x = laneCenter(i);
      if(i===0){
        const c = ASSETS.cars[chosenIdx % ASSETS.cars.length];
        racers.push(new Racer('Tú', c.color, x, i, true));
      } else {
        const colors = ['#ff8a00','#6bd1ff','#d46cff','#f1c40f'];
        racers.push(new Racer('CPU'+i, colors[i%colors.length], x, i, false));
      }
      racers[i].y = -i*36;
    }
    for(let y = -150; y > CONFIG.finishDistance; y -= 160 + Math.random()*120){
      const lane = Math.floor(Math.random()*CONFIG.lanes);
      obstacles.push({ x: laneCenter(lane), y: y - Math.random()*80, w:36, h:18 });
    }
    // prepare variables
    running = false;
    lastTs = 0;
  }

  function laneCenter(i){
    const margin = 120 * devicePixelRatio;
    const avail = W - margin*2;
    return margin + (i + 0.5) * (avail / CONFIG.lanes);
  }

  // Particle system (sparks and confetti)
  function spawnSpark(x,y){
    for(let i=0;i<12;i++){
      particles.push({
        x, y,
        vx: rand(-2,2), vy: rand(-5,-1),
        life: rand(260,480),
        color: ['#ffd34d','#ff8a00','#ffffff'][Math.floor(Math.random()*3)]
      });
    }
  }
  function spawnConfetti(x,y){
    for(let i=0;i<40;i++){
      particles.push({
        x, y,
        vx: rand(-3,3), vy: rand(-6,-1),
        life: rand(800,1600),
        confetti: true,
        color: ['#ff3b3b','#ffd34d','#1fd1a6','#6c5eff'][Math.floor(Math.random()*4)]
      });
    }
  }

  function updateParticles(dt){
    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      p.vy += 0.03 * dt;
      p.x += p.vx * dt*0.06;
      p.y += p.vy * dt*0.06;
      p.life -= dt;
      if(p.life <= 0) particles.splice(i,1);
    }
  }
  function drawParticles(offsetY){
    particles.forEach(p=>{
      const dx = p.x;
      const dy = p.y - offsetY;
      ctx.fillStyle = p.color;
      if(p.confetti){
        ctx.fillRect(dx, H - dy, 4, 8);
      } else {
        ctx.fillRect(dx, H - dy, 3, 3);
      }
    });
  }

  // collisions and game tick
  function update(ts){
    if(!running) return;
    const dt = lastTs ? (ts - lastTs) : 16;
    lastTs = ts;
    // player input
    const player = racers.find(r=>r.isPlayer);
    if(player && !player.finished){
      if(input.left) player.x -= 7 * (dt/16);
      if(input.right) player.x += 7 * (dt/16);
      const minX = laneCenter(0) - 80, maxX = laneCenter(CONFIG.lanes-1) + 80;
      player.x = clamp(player.x, minX, maxX);
      player.speed += 0.03 * (dt/16);
      if(player.speed > player.maxSpeed) player.speed = player.maxSpeed;
    }
    // AI
    racers.forEach(r=>{
      if(r.isPlayer || r.finished) return;
      const tx = laneCenter(r.lane);
      r.x += (tx - r.x) * 0.08;
      if(Math.random() < 0.003) r.x += (Math.random()-0.5) * 40;
      r.speed += (r.maxSpeed - r.speed) * 0.005 + (Math.random()-0.5) * 0.01;
      r.speed = clamp(r.speed, 0.7, r.maxSpeed + 0.5);
    });
    // obstacles
    racers.forEach(r=>{
      obstacles.forEach(o=>{
        const dx = Math.abs(r.x - o.x);
        const dy = Math.abs(r.y - o.y);
        if(dx < 36 && dy < 20){
          r.speed *= 0.55;
          if(r.isPlayer){
            AudioManager.play('aCrash', {reset:true, volume:0.9});
            spawnSpark(r.x, H - (r.y - offsetY) - 70);
            flashScreen();
          }
        }
      });
    });
    // progress racers
    racers.forEach(r=>{
      r.y -= r.speed * (dt/16);
      if(r.y < CONFIG.finishDistance && !r.finished){
        r.finished = true;
        r.finishTime = performance.now();
      }
    });
    // position / HUD
    const order = [...racers].sort((a,b)=> a.y - b.y);
    const pIdx = order.findIndex(r=>r.isPlayer);
    $('posInfo').textContent = `Posición: ${pIdx+1}/${racers.length}`;
    const playerR = racers.find(r=>r.isPlayer);
    const dist = Math.max(0, Math.min(100, Math.round((Math.abs(CONFIG.finishDistance) - Math.abs(playerR.y)) / Math.abs(CONFIG.finishDistance) * 100)));
    $('lapInfo').textContent = `Distancia: ${dist}%`;
    $('speedInfo').textContent = `Vel: ${Math.round((playerR.speed||0)*10)}`;

    offsetY = order[0].y + 820;
    updateParticles(dt);
    // finish detection
    if(racers.every(r=>r.finished)){
      running = false;
      onFinish();
    }
  }

  function draw(){
    // clear
    ctx.fillStyle = '#07121a';
    ctx.fillRect(0,0,W,H);

    // sides + track
    const tx = 100, tw = W - 200;
    ctx.fillStyle = '#07151d';
    ctx.fillRect(0,0,tx,H);
    ctx.fillRect(tx + tw, 0, tx, H);

    // main track
    ctx.fillStyle = '#16262f';
    roundRect(tx, 30, tw, H-60, 22, true);

    // lane markers
    for(let i=0;i<CONFIG.lanes;i++){
      const lx = laneCenter(i);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(lx - 2, 0, 4, H);
    }

    // obstacles
    obstacles.forEach(o=>{
      const dy = H - (o.y - offsetY) - 90;
      if(dy < -60 || dy > H + 80) return;
      ctx.save();
      ctx.translate(o.x, dy);
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(-12, 10);
      ctx.lineTo(12, 10);
      ctx.closePath();
      ctx.fillStyle = '#ff7a00';
      ctx.fill();
      ctx.restore();
    });

    // finish line
    const finishDY = H - (CONFIG.finishDistance - offsetY) - 90;
    if(finishDY < H + 200){
      ctx.fillStyle = '#fff';
      for(let i=0;i<12;i++){
        ctx.fillRect(tx + i*40, finishDY, 20, 10);
      }
      ctx.font = '22px sans-serif';
      ctx.fillText('META', W/2 - 30, finishDY - 6);
    }

    // racers
    racers.forEach(r=> r.draw(offsetY));

    // particles
    drawParticles(offsetY);
  }

  function loop(ts){
    update(ts);
    draw();
    if(running) requestAnimationFrame(loop);
  }

  function start(chosenIdx=0){
    resize();
    setupRace(chosenIdx);
    running = true;
    lastTs = 0;
    requestAnimationFrame(loop);
  }

  function onFinish(){
    // stop engine loops & music
    Object.values(ASSETS.sounds).forEach(s=>{ try{s.pause(); s.currentTime=0;}catch(e){} });
    AudioManager.play('aWin', {reset:true, volume:0.8});
    spawnConfetti(W/2, H/2);
    // compute ranking
    const ranking = [...racers].sort((a,b)=> a.finishTime - b.finishTime);
    const winner = ranking[0];
    if(winner.isPlayer){
      $('finishTitle').textContent = '🏆 ¡Felicidades!';
      $('finishText').textContent = 'Feliz día Hotwheels, campeón';
    } else {
      $('finishTitle').textContent = 'Carrera terminada';
      $('finishText').textContent = `Ganador: ${winner.name}`;
    }
    // save record if player participated
    saveRecordIfPlayer(ranking);
    // show finish overlay
    $('finishOverlay').classList.remove('hidden');
  }

  function flashScreen(){
    canvas.style.filter = 'brightness(1.6) saturate(1.1)';
    setTimeout(()=> canvas.style.filter = '', 120);
  }

  // persistence
  function saveRecordIfPlayer(ranking){
    const player = ranking.find(r=>r.isPlayer);
    if(!player) return;
    const base = Math.min(...ranking.map(r=>r.finishTime));
    const t = player.finishTime - base;
    let arr = JSON.parse(localStorage.getItem(CONFIG.recordsKey) || '[]');
    arr.push(t);
    arr.sort((a,b)=>a-b);
    arr = arr.slice(0,6);
    localStorage.setItem(CONFIG.recordsKey, JSON.stringify(arr));
    UI.renderRecords();
  }

  // expose input for UI to control touch buttons
  return {
    start,
    input
  };
})();

/* ========================
   BOOT / INIT
   ======================== */
document.addEventListener('DOMContentLoaded', async ()=>{
  UI.init();

  // Render initial carousel and car selectors
  // (rendered by UI.init)
  // Ensure audio unlocked after gesture
  function unlockAudio(){
    AudioManager.setMuted(false);
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
  }
  document.addEventListener('click', unlockAudio);
  document.addEventListener('touchstart', unlockAudio);
});
