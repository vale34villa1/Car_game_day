# 🚗 Hotwheels Arcade Race

Un juego de carreras arcade creado con **HTML, CSS y JavaScript** con un diseño profesional y efectos visuales únicos.  
El objetivo es elegir tu coche de lujo, competir en la pista evitando obstáculos y lograr el primer lugar.  
Al ganar, el juego celebra con el mensaje especial: **"Feliz día Hotwheels"**. 🎉

---

## ✨ Características principales
- Intro arcade con animación y menú interactivo.
- Selección de 4 modelos de coches de lujo con un **carrusel 3D**.
- Pista de carrera con efecto **parallax** y obstáculos dinámicos.
- Cuenta regresiva (3...2...1 🔫) antes de iniciar la carrera.
- **Música personalizada**: intro, motor, choque y música de carrera.
- IA rival para competir en tiempo real.
- **Sistema de récords** almacenado en el navegador (localStorage).
- Totalmente **responsive** (teclado y controles táctiles para móviles).
- Animaciones inspiradas en estilo arcade / lego.

---

## 🚀 Instalación y uso

Clona el repositorio:
```bash
git clone https://github.com/TU_USUARIO/hotwheels-race.git
cd hotwheels-race
```
Abre un servidor local para probar:

Con Python:
```bash
python -m http.server xxxx
```

Con Node.js:
```bash
npx http-server -p xxxx
```

Abre en tu navegador:
👉 http://localhost:xxxx

---

## 🛠️ Tecnologías usadas

- HTML5 (estructura y canvas del juego)

- CSS3 (efectos neón, IU/UX arcade, animaciones)

- JavaScript (ES6) (motor del juego, IA rival, almacenamiento de récords)

---

## 📂 Estructura del proyecto

```bash
hotwheels-race/
├─ index.html
├─ css/
│   └─ style.css
├─ js/
│   └─ game.js
└─ assets/
    ├─ images/
    │   ├─ cars/ (4 coches: car1.png, car2.png, car3.png, car4.png)
    │   └─ pista.png, fondo.png, logo.png
    └─ sounds/
        ├─ menu.mp3
        ├─ race.mp3
        ├─ click.ogg
        ├─ start.ogg
        └─ win.mp3

```
## 🎨 Créditos y recursos

- Sonidos: Mixkit, Pixabay SFX y Google Actions.

- Imágenes: Unsplash y Pexels.

- Fuentes: Google Fonts, Orbitron.
