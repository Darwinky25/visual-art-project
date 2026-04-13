# 🎛️ Realtime DJ Visualizer

A high-performance, web-based audio visualizer built with React, TypeScript, and the Web Audio API. Designed for live stages, DJ sets, or just playing around with your microphone.

## ✨ Features

- **Realtime Audio Analysis:** Capture audio directly from your microphone or system audio.
- **Multiple Visual Styles:** Choose between Radial Ripple, Vertical Wave, Matrix Rain, Random Glitch, and Static Equalizer.
- **100% Customizable:** Granular control over shapes, sizes, movement thresholds (Bass, Mid, High), speeds, and audio smoothing (latency/jitter).
- **Custom Theming:** Full hex/RGB color control over the visuals, text, and background.
- **Stage-Ready Display Mode:** Double-click the canvas to enter a clean, distraction-free Fullscreen mode (hides your cursor and UI).
- **Persistent Settings:** Save your favorite settings directly to your browser's local storage so they are ready for your next set.
- **Highly Optimized:** Decoupled React state from the animation loop, pre-calculated geometry, and minimal DOM reflows to ensure butter-smooth 60fps rendering.

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+ recommended)

### Installation

1. Clone this repository
   ```bash
   git clone <your-repo-url>
   cd <your-repo-dir>
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the development server
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173/](http://localhost:5173/) in your browser.

## 🎮 Controls

1. **Start Mic / Capture System Audio:** Click to initialize the Web Audio API and begin capturing sound.
2. **Visual Settings Panel:** Adjust everything from bass sensitivity to visual glitches on the fly.
3. **Save Settings:** Lock in your configuration so it automatically loads the next time you open the app.
4. **Fullscreen / Clean Mode:** Double-click the animation or press the `Fullscreen` button to enter presentation mode. Press `Esc` or Double-click again to exit.

## 🛠️ Tech Stack

- [Vite](https://vitejs.dev/)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- HTML5 Canvas API
- Web Audio API

## 📝 Notes

- **Browser Permissions:** Capturing microphone or system audio requires a secure context (HTTPS) or `localhost`.
- **System Audio:** Some operating systems (like macOS) may require additional setup or virtual cables (like BlackHole) to natively route system audio into a browser.

---
*Created for live performance and experimental audio-visual generation.*
