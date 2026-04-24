# 🎛️ Realtime DJ Visualizer

A high-performance, web-based audio visualizer built with React, TypeScript, and the Web Audio API. Designed for live stages, DJ sets, or just playing around with your microphone.

## ✨ Features

- **Realtime Audio Analysis:** Capture audio directly from your microphone or system audio.
- **Production Audio Engine:** Adaptive per-band normalization, improved transient/beat detection, and stabilized BPM hinting for live performance conditions.
- **Tighter Beat Sync:** Multi-signal onset detection (bass + energy + waveform transient), smarter interval gating, and phase-aligned beat pulse for more locked visual timing.
- **Stronger Bass Pickup:** Low-frequency weighting and faster bass attack/release response improve kick and sub-bass detection so drops are less likely to be missed.
- **Beat-Driven Motion:** Beat energy now drives mesh displacement and kinetic movement (not just brightness), creating more physical animation response.
- **Balanced Motion Feel:** Spatial beat movement is tuned with falloff and displacement limits to keep animation lighter and less blocky on dense scenes.
- **Multiple Visual Styles:** Choose between Radial Ripple, Vertical Wave, Matrix Rain, Random Glitch, and Static Equalizer.
- **100% Customizable:** Granular control over shapes, sizes, movement thresholds (Bass, Mid, High), speeds, and audio smoothing (latency/jitter).
- **Custom Theming:** Full hex/RGB color control over the visuals, text, and background.
- **Stage-Ready Display Mode:** Double-click the canvas to enter a clean, distraction-free Fullscreen mode (hides your cursor and UI).
- **Control UX Upgrade:** New Basic/Advanced panel mode plus quick search to reduce control overload during live sets.
- **Favorites Strip:** Pin your most-used parameters into a quick-access favorites area.
- **Performance Macros:** Four macro sliders (Energy, Motion, Color Heat, Texture) for fast scene shaping on stage.
- **Preset Browser + A/B Compare:** Save layer presets, assign Slot A/B, and auto-switch between them for quick comparison.
- **Stage HUD:** Optional on-canvas HUD with FPS, live audio stats, clip risk warning, active layer, and active preset.
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

## 🧩 Native App (Tauri)

### Prerequisites
- Rust toolchain (install via https://rustup.rs)
- Tauri system dependencies for your OS

### Run in Tauri (dev)
1. Start the Vite dev server:
   ```bash
   npm run dev
   ```
2. In a second terminal, launch the native shell:
   ```bash
   npm run tauri:dev
   ```

### Build native bundle
```bash
npm run tauri:build
```

## 🎮 Controls

1. **Start Mic / Capture System Audio:** Choose an audio input (soundcard, USB interface, or default) from the dropdown, then start capture.
2. **Visual Settings Panel:** Use the left navigation rail to jump between GLOBAL, SCENE, VISUALS, and MIDI, then adjust everything from bass sensitivity to visual glitches on the fly.
   - Includes a **Character Density** control to increase or reduce how many glyphs are drawn in Audio 2D, Webcam ASCII, and Kinect 3D modes.
   - Includes **Character Opacity** to fade glyphs without dimming the background.
   - Includes **Background Opacity** to control how solid the stage backdrop feels.
   - Includes an **Animation Engine (All Motion Settings)** panel for live control of beat threshold, lift/sway strength, flow weight, terrain lift, clamps, and motion weighting.
   - Includes **Basic/Advanced mode** and a **search bar** for quicker navigation.
   - Includes **Favorites Quick Controls** where pinned controls stay at the top.
   - Includes **Performance Macros** to drive multiple motion/color parameters from a few sliders.
   - Includes **Preset Browser + A/B compare** for rapid visual decision-making.
3. **Save Settings:** Lock in your configuration so it automatically loads the next time you open the app.
4. **Fullscreen / Clean Mode:** Double-click the animation or press the `Fullscreen` button to enter presentation mode. Press `Esc` or Double-click again to exit.
5. **HUD Toggle:** Use the `HUD` button in VISUALS to show/hide real-time stage diagnostics.
6. **Beat Debug Panel:** In GLOBAL routing, monitor live onset, threshold, beat interval, and confidence to tune sync stability in real time.
7. **Projector Mode:** Enable black lift, white cap, and safe frame to compensate for projector washout and overscan.

## 🛠️ Tech Stack

- [Vite](https://vitejs.dev/)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- HTML5 Canvas API
- Web Audio API

## 📝 Notes

- **Browser Permissions:** Capturing microphone or system audio requires a secure context (HTTPS) or `localhost`.
- **System Audio:** Some operating systems (like macOS) may require additional setup or virtual cables (like BlackHole) to natively route system audio into a browser.
- **Kinect Depth Stream:** The frontend now auto-detects incoming depth frame size (for 640x480, 320x240, 160x120, and metadata-driven sizes) so changing server downsampling does not break centering or scale.

---
*Created for live performance and experimental audio-visual generation.*
