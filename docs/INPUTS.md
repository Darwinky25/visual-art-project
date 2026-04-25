# Input Configuration Guide

This guide covers all input types supported by Visual Console and how to configure them.

---

## Overview

Visual Console supports **5 input types**:

1. **Microphone** - Real-time audio from microphone
2. **System Audio** - Computer's audio output (music, videos, etc.)
3. **MIDI Controllers** - DJ controllers, keyboards, control surfaces
4. **Webcam** - Video feed for ASCII art visualization
5. **Kinect** - Depth sensor for 3D visualization

---

## 1. Microphone Input

### How It Works
Uses Web Audio API's `getUserMedia()` to capture microphone audio in real-time.

### Setup
1. Launch the app
2. Click "Start Mic" or microphone button
3. Browser/OS will prompt for permission
4. Grant microphone access
5. Visualizer responds to audio input

### Configuration
- **Smoothing:** Adjust audio smoothing (lower = more responsive, higher = smoother)
- **FFT Size:** Change frequency resolution (higher = more detail, more CPU)
- **Bass/Mid/High Sensitivity:** Adjust frequency band thresholds

### Troubleshooting
- **No permission prompt:** Check if running on HTTPS or localhost
- **Permission denied:** Check OS privacy settings (System Preferences → Security & Privacy → Microphone on macOS)
- **No audio detected:** Check microphone is selected as default input device
- **Distorted audio:** Lower input volume or adjust sensitivity

---

## 2. System Audio Capture

### How It Works
Captures computer's audio output by routing it through a virtual audio device.

### Important Limitation
**Browser APIs cannot directly capture system audio.** You must use a virtual audio device to route system audio as an input device.

### Platform Setup

#### macOS
1. **Install BlackHole** (recommended, free):
   ```bash
   brew install blackhole-2ch
   ```
   Or download from: https://github.com/ExistentialAudio/BlackHole

2. **Create Multi-Output Device:**
   - Open "Audio MIDI Setup" (in Applications/Utilities)
   - Click "+" → "Create Multi-Output Device"
   - Check both your speakers and BlackHole
   - Set as default output in System Preferences

3. **In Visual Console:**
   - Select "BlackHole 2ch" from audio input dropdown
   - Click "Capture System Audio"

#### Windows
1. **Enable Stereo Mix** (built-in):
   - Right-click speaker icon in taskbar
   - Select "Sounds" → "Recording" tab
   - Right-click in empty space → "Show Disabled Devices"
   - Right-click "Stereo Mix" → "Enable"
   - Set as default recording device

2. **Alternative: VB-Audio Cable** (if Stereo Mix unavailable):
   - Download from: https://vb-audio.com/Cable/
   - Install and restart
   - Set VB-Cable as default output
   - Select VB-Cable as input in Visual Console

#### Linux
1. **PulseAudio Monitor** (usually built-in):
   ```bash
   pactl list sources | grep monitor
   ```

2. **In Visual Console:**
   - Select "Monitor of [your output device]"
   - Click "Capture System Audio"

### Configuration
Same as microphone input, plus:
- **Loopback Monitoring:** Enable to hear audio while capturing
- **Latency Compensation:** Adjust if audio/visual sync is off

### Troubleshooting
- **No system audio device:** Virtual audio device not installed or not set as output
- **Can't hear audio:** Enable loopback or use Multi-Output Device (macOS)
- **Choppy visualization:** Reduce FFT size or increase smoothing

---

## 3. MIDI Controller Input

### How It Works
Uses Web MIDI API to receive MIDI messages from connected controllers.

### Supported Devices
- DJ controllers (Pioneer DDJ, Numark, Traktor, etc.)
- MIDI keyboards
- Control surfaces (Akai, Novation, etc.)
- Any USB MIDI device

### Setup
1. Connect MIDI controller via USB
2. Launch Visual Console
3. Controller auto-detects (check MIDI status indicator)
4. Move faders/knobs to control visual parameters

### MIDI Mapping
Default mappings (can be customized in `src/hooks/useDjMidi.ts`):

| Control | CC/Note | Parameter |
|---------|---------|-----------|
| Note 10 | CC 10 | Mixer A Trim |
| Note 11 | CC 11 | Mixer B Trim |
| Note 14-16 | CC 14-16 | Mixer A EQ (Hi/Mid/Low) |
| Note 18-20 | CC 18-20 | Mixer B EQ (Hi/Mid/Low) |
| Note 8 | CC 8 | Channel Fader A |
| Note 9 | CC 9 | Channel Fader B |

### Custom Mapping
1. Open `src/hooks/useDjMidi.ts`
2. Find the MIDI message handler
3. Map note/CC numbers to visual parameters
4. Rebuild app

### Troubleshooting
- **Controller not detected:** Check USB connection, try different port
- **No MIDI messages:** Check browser console for MIDI access errors
- **Wrong mappings:** Use MIDI monitor to identify correct CC numbers
- **Latency:** Reduce audio smoothing for faster response

---

## 4. Webcam Input

### How It Works
Captures webcam video and converts it to ASCII art visualization.

### Setup
1. Launch Visual Console
2. Enable "Webcam ASCII" mode in visualizer settings
3. Browser/OS prompts for camera permission
4. Grant camera access
5. Webcam feed appears as ASCII art

### Configuration
- **Character Density:** More characters = more detail
- **Character Opacity:** Fade characters without dimming background
- **Contrast:** Adjust ASCII brightness mapping
- **Resolution:** Lower for better performance

### Troubleshooting
- **No camera prompt:** Check HTTPS/localhost requirement
- **Permission denied:** Check OS privacy settings (Camera permissions)
- **Black screen:** Check camera is not in use by another app
- **Low FPS:** Reduce resolution or character density

---

## 5. Kinect Depth Sensor

### How It Works
Kinect server captures depth data and streams it via WebSocket to the visualizer.

### Supported Devices
- Kinect V1 (Xbox 360)
- Kinect V2 (Xbox One) - with appropriate drivers

### Setup
1. Connect Kinect via USB
2. Launch Visual Console (server auto-starts)
3. Enable "Kinect 3D" mode in visualizer
4. Depth visualization appears

### Server Auto-Start
The Tauri app automatically starts the Kinect server on launch. No manual server startup required.

### Manual Server Control
If needed, you can manually control the server:

```bash
# Start Python server
python3 scripts/servers/kinect_server.py

# Start Node.js server
node scripts/servers/kinect_server.js
```

### Configuration
Server settings in `scripts/servers/kinect_server.py`:
- **Downsampling:** 1=640x480, 2=320x240, 4=160x120
- **FPS:** Server frame rate (default: 30)
- **Tilt Control:** Motor angle (-30 to +30 degrees)
- **LED Control:** Kinect LED color

Frontend settings:
- **Point Size:** Size of depth points
- **Color Mapping:** Depth-to-color gradient
- **Rotation:** 3D view rotation
- **Zoom:** Camera distance

### Troubleshooting
- **Server won't start:** Check libfreenect installation
- **No depth data:** Check USB connection, try different port
- **Connection refused:** Check WebSocket port (8765 for Python, 8080 for Node.js)
- **Choppy visualization:** Increase downsampling factor
- **Kinect not detected:** Check drivers, try `freenect-glview` to test

---

## Input Priority & Mixing

### Single Input Mode
By default, only one audio input is active at a time (microphone OR system audio).

### MIDI + Audio
MIDI can be used simultaneously with audio inputs to control visual parameters while audio drives the visualization.

### Multiple Visualizers
You can layer multiple visualization modes:
- Audio 2D + Kinect 3D
- Webcam ASCII + Audio overlay
- Fractal + Geometry + Audio reactive

---

## Performance Tips

1. **Reduce FFT Size:** Lower frequency resolution = better performance
2. **Increase Smoothing:** Reduces CPU load from rapid changes
3. **Lower Webcam Resolution:** Smaller video = faster processing
4. **Increase Kinect Downsampling:** Fewer depth points = better FPS
5. **Disable Unused Inputs:** Close unused input streams
6. **Use Hardware Acceleration:** Enable GPU acceleration in browser settings

---

## Advanced Configuration

### Audio Processing Pipeline
1. **Input:** getUserMedia() captures audio
2. **Analysis:** Web Audio API AnalyserNode processes FFT
3. **Processing:** Custom AudioProcessor extracts features
4. **Visualization:** Features drive visual parameters

### Custom Audio Features
Edit `src/audioProcessor.ts` to add custom audio analysis:
- Beat detection algorithms
- Spectral centroid
- Onset detection
- BPM estimation

### Custom MIDI Mappings
Edit `src/hooks/useDjMidi.ts` to create custom control schemes:
- Map to different visual parameters
- Add MIDI learn functionality
- Create preset switching via MIDI

---

## See Also

- [SETUP.md](./SETUP.md) - Installation and setup guide
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues and solutions
- [README.md](../README.md) - Feature overview and usage