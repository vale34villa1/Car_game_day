const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 🚗 jugador
let player = {
  x: canvas.width / 2 - 25,
  y: canvas.height - 120,
  w: 50,
  h: 100,
  speed: 6
};

// 🚧 obstáculos
let obstacles = [];
let gameRunning = false;
let gameLoop;

// 🎶 música
let bgMusic = new Audio("https://actions.google.com/sounds/v1/ambiences/arcade_game_start.ogg");
let crashSound = new Audio("https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg");
let winSound = new Audio("https://actions.google.com/sounds/v1/cartoon/concussive_drum_hit.ogg");

// 🎮 iniciar juego
document.getElementById("playBtn").addEventListener("click", startGame);
document.getElementById("restartBtn").addEventListener("click", () => location.reload());

function startGame() {
  document.getElementById("menu").classList.remove("active");
  document.getElementById("game").classList.add("active");
  bgMusic.loop = true;
  bgMusic.play();
  gameRunning = true;
  gameLoop = setInterval(update, 30);
}

function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 🚗 jugador
  ctx.fillStyle = "red";
  ctx.fillRect(player.x, player.y, player.w, player.h);

  // 🚧 obstáculos
  if (Math.random() < 0.03) {
    obstacles.push({
      x: Math.random() * (canvas.width - 50),
      y: -100,
      w: 50,
      h: 100
    });
  }

  obstacles.forEach((obs, i) => {
    obs.y += 5;
    ctx.fillStyle = "yellow";
    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

    // colisión
    if (
      player.x < obs.x + obs.w &&
      player.x + player.w > obs.x &&
      player.y < obs.y + obs.h &&
      player.h + player.y > obs.y
    ) {
      crashSound.play();
      endGame(false);
    }

    if (obs.y > canvas.height) obstacles.splice(i, 1);
  });

  // victoria simple
  if (Math.random() < 0.001) {
    winSound.play();
    endGame(true);
  }
}

function endGame(victory) {
  clearInterval(gameLoop);
  gameRunning = false;
  document.getElementById("game").classList.remove("active");
  document.getElementById("victory").classList.add("active");
  if (!victory) {
    document.querySelector("#victory h2").innerText = "💥 ¡Chocaste! Intenta otra vez";
  }
}

// 🎮 controles teclado
document.addEventListener("keydown", (e) => {
  if (!gameRunning) return;
  if (e.key === "ArrowLeft" && player.x > 0) player.x -= player.speed;
  if (e.key === "ArrowRight" && player.x + player.w < canvas.width) player.x += player.speed;
  if (e.key === "ArrowUp" && player.y > 0) player.y -= player.speed;
  if (e.key === "ArrowDown" && player.y + player.h < canvas.height) player.y += player.speed;
});

// 🎮 controles táctiles
document.getElementById("left").addEventListener("click", () => (player.x -= player.speed));
document.getElementById("right").addEventListener("click", () => (player.x += player.speed));
document.getElementById("up").addEventListener("click", () => (player.y -= player.speed));
