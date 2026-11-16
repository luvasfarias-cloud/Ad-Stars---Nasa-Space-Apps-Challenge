Aqui está o conteúdo inteiro do `README.md` unificado em um único bloco de código, sem cortes, pronto para você copiar e colar direto no GitHub:

```markdown
# 🚀 Ad Stars — NASA Space Apps Challenge

[![Play Live on Vercel](https://img.shields.io/badge/Play%20Live-Vercel-black?style=for-the-badge&logo=vercel)](https://ad-stars-nasa-space-apps-challenge.vercel.app/)

**Play the game directly in your browser:** [https://ad-stars-nasa-space-apps-challenge.vercel.app/](https://ad-stars-nasa-space-apps-challenge.vercel.app/)

**Ad Stars** is an interactive 2.5D and retro PS1-style 3D space mission simulator built for the **NASA Space Apps Challenge**. Players step into the boots of an aerospace engineer inside a bustling Mission Control Center, managing budgets, configuring spacecraft hardware, validating pre-flight orbital physics, and executing high-stakes launch minigames based on real NASA missions.

---

## 🌌 Overview & Gameplay Loop

**Ad Stars** bridges complex aerospace engineering concepts with accessible, nostalgic gameplay:

1. **2.5D Mission Control Hub (`CommandCenter`):** Explore an interactive pixel-art control room, customize your engineer's suit, interact with station terminals, and observe AI-driven scientists navigating the floor using A* pathfinding with string-pulling smoothing.
2. **Mission Board (`Quests`):** Take on 15 missions across 4 Career Maturity Levels (CML 1–4), modeled after real spaceflight programs including **Artemis Gateway**, **James Webb Space Telescope (JWST)**, **Europa Clipper**, **Perseverance**, **Parker Solar Probe**, **DART**, **Dragonfly**, and **Voyager**.
3. **Engineering Workbench & CRT Impact Matrix:** Assemble missions across four critical segments—**Launchers** (Electron, Falcon 9, Vulcan Centaur, SLS Block 1B), **Spacecraft Buses** (CubeSat, Planetary Orbiter, Deep Space MMRTG), **Scientific Instruments** (NIRCam, Laser Altimeters, Spectrometers, Ice-Penetrating Radar), and **Ground Networks** (NSN & DSN 70m)—while balancing budget, payload mass, electrical power, and science output.
4. **Pre-Flight Physics & Trajectory Simulator:** Fine-tune local gravity ($G$), atmospheric density, drag coefficient ($C_d$), and thrust vectors against nominal NASA mission corridors before clearing the pad for launch.
5. **Retro 3D Launch Console & Flight Minigames:** Experience a 320×240 PS1-inspired 3D launch sequence featuring scanlines, dithering, and 15 mission-specific interactive protocols (such as ignition sequencing, cryogenic thermal calibration, hexagonal mirror alignment, binary logic radiation shielding, and Morse beacon decoding).

---

## 🛰️ Space Agency Data & Scientific Realism

To ensure educational value and technical authenticity, **Ad Stars** incorporates open data and real-world parameters from NASA and partner space agencies:

* **Mission Catalog & Flight Profiles:** Orbital parameters, radiation shielding requirements, and mission objectives derived from official NASA mission documentation (Artemis, LRO, SOHO, JWST, Cassini, Juno, Nancy Grace Roman, and Mars surface operations).
* **Propulsion & Cost Modeling:** Realistic payload capacity trade-offs, propellant cost averages, and launch vehicle specifications.
* **Bilingual Support (i18n):** Full real-time localization in **English (`en`)** and **Portuguese (`pt`)**.

---

## 🛠️ Tech Stack & Architecture

* **Language:** TypeScript
* **Graphics & Rendering:** Custom HTML5 Canvas 2D/2.5D pixel-art engine and software-rendered 320×240 3D console with affine texture projection, scanlines, and dynamic lighting.
* **Pathfinding & Simulation:** Grid-based A* navigation with string-pulling smoothing and real-time ballistic/aerodynamic force vector simulation.
* **Audio:** Zero-dependency procedural retro sound synthesizer built with the native browser **Web Audio API** (`AudioContext`).
* **Deployment & Hosting:** Deployed on **Vercel** for instant cross-platform access on desktop and mobile browsers.

---

## 🚀 Running Locally

If you wish to run the project locally:

1. **Clone the repository:**
   `git clone https://github.com/luvasfarias-cloud/Ad-Stars---Nasa-Space-Apps-Challenge.git && cd Ad-Stars---Nasa-Space-Apps-Challenge`
2. **Install dependencies:**
   `npm install`
3. **Run the development server:**
   `npm run dev`
4. Open the local URL provided in your terminal in any modern browser.

---

## 🤖 AI & Super Intelligence (SI) Disclosure

In accordance with the **NASA Space Apps Challenge** rules regarding the use of Artificial Intelligence / Super Intelligence (SI) tools, we transparently disclose how these tools were used in this project:

* **Code & Software Architecture:** Large Language Models (LLMs) and AI development environments (Google AI Studio / Gemini) were used to accelerate development, structure TypeScript modules, optimize the 2.5D and retro 3D Canvas rendering loops, and debug physics and pathfinding algorithms.
* **Data Formatting:** AI tools assisted in structuring publicly available NASA mission parameters (e.g., Artemis, JWST, Europa Clipper, Voyager) into clean TypeScript data tables and bilingual (`en`/`pt`) localization dictionaries.
* **Audio & Visual Assets:** All sound effects are procedurally synthesized via the native Web Audio API, and all 2.5D/3D graphics are drawn programmatically via HTML5 Canvas. No NASA logos, flags, or official mission insignia were generated or modified using AI tools.

```
