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

## 📂 Estructura del proyecto

```bash
hotwheels-race/
├─ README.md
├─ index.html
├─ LICENSE
├─ /css/
│   └─ style.css
├─ /js/
│   └─ game.js
├─ /assets/
│   ├─ /images/
│   │   ├─ logo.png
│   │   ├─ cars/
│   │   │   ├─ aurora.webp
│   │   │   ├─ eclipse.webp
│   │   │   ├─ phantom.webp
│   │   │   └─ vortex.webp
│   │   └─ bg-parallax-layer1.webp
│   └─ /sounds/
│       ├─ intro.mp3
│       ├─ lego-crash.ogg
│       ├─ select-engine-A.ogg
│       ├─ select-engine-B.ogg
│       ├─ select-engine-C.ogg
│       ├─ race-loop.ogg
│       ├─ beep.ogg
│       └─ shot-start.ogg
