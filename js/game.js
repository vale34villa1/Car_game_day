const startScreen = document.getElementById("start-screen");
const continueBtn = document.getElementById("continue-btn");
const carAnim = document.getElementById("car-animation");
const menuScreen = document.getElementById("menu-screen");
const selectScreen = document.getElementById("select-screen");
const endScreen = document.getElementById("end-screen");
const endMessage = document.getElementById("end-message");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const bgMusic = document.getElementById("bg-music");
const crashSound = document.getElementById("crash-sound");
const startSound = document.getElementById("start-sound");

let currentCar = 1;
let car = { x: 370, y: 400, width: 60, height: 100 };
let keys = {};
let obstacles = [];
let lines = [];
let gameState = "start";
let score = 0;
let speed = 5;

// ---- Inicio ----
continueBtn.onclick = () => {
  continueBtn.style.display = "none";
  carAnim.style.display = "block";
  carAnim.addEventListener("animationend", () => {
    startScreen.classList.add("hidden");
    carAnim.style.display = "none";
    menuScreen.classList.remove("hidden");
    gameState = "menu";
  });
};

// ---- Menú ----
function goToSelect() {
  menuScreen.classList.add("hidden");
  selectScreen.classList.remove("hidden");
}
function showRecords() { alert("Récords: " + (localStorage.getItem("bestScore") || 0)); }
function showRules() { alert("Mueve tu coche con ← → y esquiva obstáculos."); }
function showDemo() { alert("En el demo verás cómo esquivar objetos sin perder."); }
function showSettings() { alert("Aquí podrías activar/desactivar música y sonidos."); }

// ---- Selección de coche ----
function prevCar() {
  currentCar = currentCar === 1 ? 4 : currentCar - 1;
  updateCarSelection();
}
function nextCar() {
  currentCar = currentCar === 4 ? 1 : currentCar + 1;
  updateCarSelection();
}
function updateCarSelection() {
  document.querySelectorAll(".car-option").forEach((opt, idx) => {
    opt.classList.toggle("active", idx + 1 === currentCar);
  });
}

// ---- Juego ----
function startRace() {
  selectScreen.classList.add("hidden");
  canvas.style.display = "block";
  gameState = "race";
  score = 0;
  obstacles = [];
  lines = [];
  car.x = 370;
  bgMusic.play();
  countdown(() => requestAnimationFrame(gameLoop));
}

// ---- Cuenta regresiva ----
function countdown(callback) {
  let count = 3;
  const interval = setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "80px Orbitron";
    ctx.fillText(count > 0 ? count : "GO!", canvas.width / 2 - 80, canvas.height / 2);
    startSound.play();
    count--;
    if (count < -1) {
      clearInterval(interval);
      callback();
    }
  }, 1000);
}

// ---- Input ----
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// ---- Loop ----
function gameLoop() {
  if (gameState !== "race") return;

  // Fondo carretera
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Líneas de carretera
  if (lines.length < 10) {
    lines.push({ x: canvas.width / 2 - 10, y: -50, width: 20, height: 80 });
  }
  lines.forEach(line => line.y += speed);
  lines = lines.filter(line => line.y < canvas.height);
  ctx.fillStyle = "#fff";
  lines.forEach(line => ctx.fillRect(line.x, line.y, line.width, line.height));

  // Obstáculos
  if (Math.random() < 0.03) {
    obstacles.push({ x: Math.random() * 750, y: -50, width: 40, height: 60 });
  }
  obstacles.forEach(o => o.y += speed);

  // Dibujar coche
  ctx.fillStyle = "#ff3300";
  ctx.fillRect(car.x, car.y, car.width, car.height);

  // Movimiento
  if (keys["ArrowLeft"] && car.x > 0) car.x -= 6;
  if (keys["ArrowRight"] && car.x < canvas.width - car.width) car.x += 6;

  // Dibujar obstáculos
  ctx.fillStyle = "#00ccff";
  obstacles.forEach(o => ctx.fillRect(o.x, o.y, o.width, o.height));

  // Colisiones
  for (let o of obstacles) {
    if (car.x < o.x + o.width && car.x + car.width > o.x && car.y < o.y + o.height && car.y + car.height > o.y) {
      crashSound.play();
      endRace(false);
      return;
    }
  }

  // Score
  score++;
  ctx.fillStyle = "white";
  ctx.font = "20px Orbitron";
  ctx.fillText("Puntos: " + score, 20, 30);

  requestAnimationFrame(gameLoop);
}

// ---- Fin de carrera ----
function endRace(win) {
  gameState = "end";
  canvas.style.display = "none";
  endScreen.classList.remove("hidden");
  endMessage.innerText = win ? "🏆 ¡Ganaste la carrera!" : "💥 Choque! Intenta de nuevo.";
  bgMusic.pause();
  bgMusic.currentTime = 0;
  const best = localStorage.getItem("bestScore") || 0;
  if (score > best) localStorage.setItem("bestScore", score);
}
function goToMenu() {
  endScreen.classList.add("hidden");
  menuScreen.classList.remove("hidden");
}
