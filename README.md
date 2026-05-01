# Realtime DJ Visualizer

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646cff.svg)](https://vitejs.dev/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-24c8db.svg)](https://tauri.app/)

A high-performance, stage-ready audio visualizer built with React, TypeScript, and the Web Audio API. Designed for live performance with microphone-first input, and expandable to system audio, MIDI controllers, webcams, and Kinect depth streaming.

## Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Audio Permissions and System Audio](#audio-permissions-and-system-audio)
- [Native Desktop Apps](#native-desktop-apps)
- [Hardware and Inputs](#hardware-and-inputs)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Build and Release](#build-and-release)
- [Contributing](#contributing)
- [License](#license)

## Overview

Realtime DJ Visualizer is a modular visual engine optimized for low-latency stages and live sets. The renderer runs a high-frequency Canvas loop while the React UI stays lightweight and decoupled, keeping visuals stable under heavy load.

## Features

- Realtime audio analysis with adaptive normalization, beat detection, and stabilized BPM hinting.
- Beat-driven motion that maps energy to displacement, not just brightness.
- Multiple visual modes including mandala, geometry, tiles, fractals, ASCII webcam, and Kinect 3D.
- MIDI control mapping, macro controls, favorites, and preset A/B compare for fast on-stage iteration.
- Stage HUD, fullscreen clean mode, and projector-safe adjustments for live projection.
- Persistent settings stored in local storage.

## Architecture

- Audio analysis runs in a dedicated pipeline that produces beat, energy, and band metrics.
- Visuals render on a continuous Canvas loop with minimal React involvement.
- Input adapters abstract microphone, system audio, MIDI, webcam, and Kinect streams.

## Getting Started

### Requirements

- Node.js v16+ (v18+ recommended)
- Optional: Rust toolchain for Tauri builds

### Install and Run

```bash
npm install
npm run dev
```

Open http://localhost:5173/ in your browser.

## Audio Permissions and System Audio

- Microphone and system audio capture require a secure context (HTTPS or localhost).
- System audio on macOS may require a virtual cable such as BlackHole. See [docs/SETUP.md](docs/SETUP.md).

## Native Desktop Apps

This project supports both Tauri and Electron wrappers.

Tauri (recommended):
```bash
npm run tauri:dev
npm run tauri:build
```

Electron:
```bash
npm run electron:dev
npm run electron:build
```

## Hardware and Inputs

- MIDI controllers via Web MIDI for live mapping.
- Webcam input for ASCII and texture-driven visuals.
- Kinect depth via a local server bridge. See [scripts/servers/README.md](scripts/servers/README.md).

## Project Structure

- [src/](src/) - UI and render orchestration
- [src/audioProcessor.ts](src/audioProcessor.ts) - Audio analysis and beat metrics
- [src/visualizer/](src/visualizer/) - Canvas render modules
- [src/hooks/](src/hooks/) - Audio, MIDI, webcam, Kinect hooks
- [src-tauri/](src-tauri/) - Native audio capture and desktop shell
- [electron/](electron/) - Electron wrapper

## Documentation

- [docs/AUDIO_PROCESSING.md](docs/AUDIO_PROCESSING.md) - DSP and beat logic
- [docs/INPUTS.md](docs/INPUTS.md) - Input devices and routing
- [docs/SETUP.md](docs/SETUP.md) - Setup steps and system audio notes
- [docs/TESTING.md](docs/TESTING.md) - Testing guidance
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - Common fixes

## Build and Release

- Web build: `npm run build` outputs to [dist/](dist/)
- Electron build output directory is configured in [package.json](package.json) under build.directories.output
- Tauri build output: [src-tauri/target/](src-tauri/target/)

## Contributing

1. Create a feature branch
2. Make changes with small, focused commits
3. Open a pull request with a clear description and screenshots if visuals change

## License

No license file is present yet. Add a LICENSE file to clarify usage and redistribution terms.
