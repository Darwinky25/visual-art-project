# Visual Console - Setup Guide

## Prerequisites

### Required
- **Node.js** 16+ (recommended: 18 or 20)
- **Rust toolchain** (install via [rustup.rs](https://rustup.rs))
- **Git** for version control

### Platform-Specific Requirements

#### macOS
- **Xcode Command Line Tools:** `xcode-select --install`
- **Homebrew** (recommended for dependencies)
- **For Kinect:** `brew install libfreenect`
- **For System Audio:** Install [BlackHole](https://github.com/ExistentialAudio/BlackHole) (free, open-source)

#### Windows
- **Visual Studio Build Tools** or Visual Studio with C++ development tools
- **For Kinect:** Install Kinect SDK or libfreenect
- **For System Audio:** Enable "Stereo Mix" in Sound Settings (built-in) or install VB-Audio Cable

#### Linux
- **Build essentials:** `sudo apt install build-essential` (Debian/Ubuntu)
- **For Kinect:** `sudo apt install libfreenect-dev`
- **For System Audio:** Configure PulseAudio monitor source (built-in)

---

## Installation

### 1. Clone Repository
```bash
git clone https://github.com/Darwinky25/visual-art-project.git
cd visual-art-project
```

### 2. Install Dependencies
```bash
npm install
```

This will install all frontend dependencies and Tauri CLI.

### 3. Install Rust Dependencies
Tauri will automatically download and compile Rust dependencies on first build.

---

## Development

### Web-Only Development (Fastest)
Run the Vite development server:
```bash
npm run dev
```
Access at: http://localhost:5173

**Note:** Some features (like auto-starting Kinect server) require the Tauri wrapper.

### Native App Development (Recommended)
Run the Tauri development build:
```bash
npm run tauri:dev
```

This will:
1. Start the Vite dev server
2. Launch the native Tauri window
3. Auto-start the Kinect server (if Kinect is connected)
4. Enable all native features

---

## Building for Production

### Create Native App Bundle
```bash
npm run tauri:build
```

This creates platform-specific installers in `src-tauri/target/release/bundle/`:
- **macOS:** `.dmg` and `.app`
- **Windows:** `.msi` and `.exe`
- **Linux:** `.deb`, `.AppImage`, etc.

---

## Input Setup

### Microphone
1. Launch app
2. Click "Start Mic" button
3. Grant microphone permission when prompted
4. Audio visualizer should respond to sound

### System Audio Capture
**Important:** Requires virtual audio device (browser API limitation)

#### macOS Setup
1. Install [BlackHole](https://github.com/ExistentialAudio/BlackHole)
2. Create Multi-Output Device in Audio MIDI Setup
3. Select BlackHole as input in app

#### Windows Setup
1. Right-click speaker icon → Sounds → Recording tab
2. Right-click → Show Disabled Devices
3. Enable "Stereo Mix"
4. Select Stereo Mix as input in app

#### Linux Setup
1. PulseAudio monitor is usually available by default
2. Select "Monitor of [your output device]" in app

### MIDI Controllers
1. Connect MIDI controller via USB
2. Launch app
3. Controller should auto-detect
4. Move faders/knobs to control visuals

### Webcam
1. Launch app
2. Enable webcam mode in visualizer settings
3. Grant camera permission when prompted
4. Webcam feed appears as ASCII art

### Kinect Depth Sensor
1. Connect Kinect via USB
2. Launch app (server auto-starts)
3. Enable Kinect mode in visualizer
4. 3D depth visualization should appear

**Troubleshooting:** If Kinect doesn't work, check:
- USB connection is secure
- Kinect drivers are installed
- Check browser console for WebSocket errors

---

## Troubleshooting

### "Permission Denied" Errors
- Check OS privacy settings
- Grant microphone/camera permissions
- Restart app after granting permissions

### Kinect Not Connecting
- Verify USB connection
- Check if libfreenect is installed
- Look for errors in terminal/console
- Try manually starting server: `python3 scripts/servers/kinect_server.py`

### Audio Not Working in Tauri App
- Ensure you're on the latest commit (input fixes applied)
- Check browser console for CSP errors
- Verify permissions in OS settings

### Build Errors
- Update Rust: `rustup update`
- Clear build cache: `npm run tauri build -- --clean`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

---

## Next Steps

- Read [INPUTS.md](./INPUTS.md) for detailed input configuration
- See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues
- Check [README.md](../README.md) for feature overview

---

## Support

For issues or questions:
1. Check existing GitHub issues
2. Review troubleshooting guide
3. Create new issue with details (OS, error messages, steps to reproduce)