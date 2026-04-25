# Testing Guide for Visual Console

This guide will help you test all input types after implementing the Tauri fixes.

---

## Prerequisites

Before testing, ensure you have:
- ✅ Rebuilt the app: `npm run tauri:build` or running in dev mode: `npm run tauri:dev`
- ✅ All dependencies installed: `npm install`
- ✅ Rust toolchain updated: `rustup update`

---

## Testing Checklist

### 1. ✅ Microphone Input

**What to Test:** Real-time audio capture from microphone

**Steps:**
1. Launch the app: `npm run tauri:dev`
2. Click "Start Mic" or microphone button
3. OS should prompt for microphone permission
4. Grant permission
5. Speak or make noise near microphone

**Expected Result:**
- ✅ Permission prompt appears
- ✅ Audio visualizer responds to sound
- ✅ Frequency bars move with audio
- ✅ Beat detection works
- ✅ No console errors

**If It Fails:**
- Check OS privacy settings (System Preferences → Security & Privacy → Microphone)
- Check browser console (F12) for errors
- Verify microphone is working in another app
- See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#microphone-not-working)

---

### 2. ⚠️ System Audio Capture

**What to Test:** Capture computer's audio output

**Important:** Requires virtual audio device (browser API limitation)

**Setup Required:**

#### macOS:
```bash
# Install BlackHole
brew install blackhole-2ch

# Create Multi-Output Device in Audio MIDI Setup
# Include both speakers and BlackHole
```

#### Windows:
1. Right-click speaker icon → Sounds → Recording tab
2. Right-click → Show Disabled Devices
3. Enable "Stereo Mix"

#### Linux:
```bash
# PulseAudio monitor usually available by default
pactl list sources | grep monitor
```

**Steps:**
1. Set up virtual audio device (see above)
2. Select virtual device from audio input dropdown
3. Click "Capture System Audio"
4. Play music or video on your computer

**Expected Result:**
- ✅ Visualizer responds to computer audio
- ✅ Beat detection syncs with music
- ✅ No audio dropouts

**If It Fails:**
- Verify virtual audio device is installed
- Check it's set as default output (macOS) or enabled (Windows)
- See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#system-audio-not-capturing)

---

### 3. ✅ MIDI Controller Input

**What to Test:** DJ controller or MIDI keyboard control

**Requirements:**
- MIDI controller connected via USB
- Web MIDI API support (Chrome, Edge, Opera)

**Steps:**
1. Connect MIDI controller via USB
2. Launch app: `npm run tauri:dev`
3. Check MIDI status indicator (should show "Connected")
4. Move faders, knobs, or press pads on controller
5. Observe visual parameters changing

**Expected Result:**
- ✅ Controller auto-detected
- ✅ MIDI status shows "Connected"
- ✅ Faders/knobs control visual parameters
- ✅ Console shows MIDI messages (check with F12)

**If It Fails:**
- Try different USB port
- Check controller is in MIDI mode (not HID)
- Verify browser supports Web MIDI (not Firefox/Safari)
- See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#controller-not-detected)

---

### 4. ✅ Webcam Input

**What to Test:** Webcam video for ASCII art visualization

**Steps:**
1. Launch app: `npm run tauri:dev`
2. Enable "Webcam ASCII" mode in visualizer settings
3. OS should prompt for camera permission
4. Grant permission
5. Move in front of camera

**Expected Result:**
- ✅ Permission prompt appears
- ✅ Webcam feed appears as ASCII art
- ✅ ASCII updates in real-time
- ✅ Character density adjustable

**If It Fails:**
- Check OS privacy settings (Camera permissions)
- Close other apps using camera (Zoom, Skype, etc.)
- Try different camera if available
- See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#webcam-not-starting)

---

### 5. ✅ Kinect Depth Sensor (Auto-Start)

**What to Test:** Kinect server auto-starts and depth visualization works

**Requirements:**
- Kinect V1 or V2 connected via USB
- libfreenect installed
- Python 3 or Node.js installed

**Setup:**
```bash
# macOS
brew install libfreenect

# Linux
sudo apt install libfreenect-dev

# Test Kinect manually
freenect-glview
```

**Steps:**
1. Connect Kinect via USB (use USB 2.0 port for V1)
2. Launch app: `npm run tauri:dev`
3. **Server should auto-start** (check terminal for "Kinect server started")
4. Enable "Kinect 3D" mode in visualizer
5. Move in front of Kinect

**Expected Result:**
- ✅ Server auto-starts on app launch
- ✅ No manual server startup needed
- ✅ 3D depth visualization appears
- ✅ Depth updates in real-time
- ✅ Tilt/LED controls work (if available)

**If It Fails:**
- Check terminal for server startup errors
- Verify libfreenect installed: `freenect-glview`
- Try different USB port (USB 2.0 for Kinect V1)
- Check Kinect power adapter connected (V1)
- Manual start: `python3 scripts/servers/kinect_server.py`
- See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#kinect-server-wont-start)

---

## Performance Testing

### Frame Rate Test
1. Enable FPS counter in settings
2. Test each visualization mode
3. Verify 60 FPS maintained

**Expected:** 60 FPS in most modes, 30+ FPS in complex modes

### CPU Usage Test
1. Open Activity Monitor / Task Manager
2. Run visualizer with all inputs
3. Check CPU usage

**Expected:** <50% CPU on modern hardware

### Memory Test
1. Run app for 10+ minutes
2. Check memory usage
3. Verify no memory leaks

**Expected:** Stable memory usage, no continuous growth

---

## Integration Testing

### Multiple Inputs Simultaneously
1. Enable microphone
2. Connect MIDI controller
3. Enable webcam
4. Verify all work together

**Expected:** All inputs function without conflicts

### Fullscreen Mode
1. Double-click canvas or press Fullscreen button
2. Verify UI hides
3. Press Esc to exit

**Expected:** Clean fullscreen mode, easy exit

### Settings Persistence
1. Adjust settings
2. Click "Save Settings"
3. Close and reopen app
4. Verify settings restored

**Expected:** All settings persist across sessions

---

## Platform-Specific Testing

### macOS
- ✅ Microphone permission prompt
- ✅ Camera permission prompt
- ✅ BlackHole for system audio
- ✅ Kinect via libfreenect

### Windows
- ✅ Microphone permission
- ✅ Camera permission
- ✅ Stereo Mix for system audio
- ✅ Kinect SDK or libfreenect

### Linux
- ✅ PulseAudio permissions
- ✅ Camera permissions (v4l2)
- ✅ PulseAudio monitor for system audio
- ✅ libfreenect for Kinect

---

## Reporting Issues

If you encounter issues during testing:

1. **Check Console:** Press F12, look for errors
2. **Check Terminal:** Look for Rust/server errors
3. **Check Logs:** Tauri logs in terminal
4. **Document:**
   - OS and version
   - Input type that failed
   - Error messages
   - Steps to reproduce

5. **Create GitHub Issue:** Include all above information

---

## Success Criteria

All tests pass when:
- ✅ Microphone works without manual setup
- ✅ Webcam works without manual setup
- ✅ MIDI controller auto-detects
- ✅ Kinect server auto-starts
- ⚠️ System audio works (with virtual device setup)
- ✅ No console errors
- ✅ Smooth 60 FPS performance
- ✅ Settings persist
- ✅ Fullscreen mode works

---

## Next Steps After Testing

1. If all tests pass → App is ready for use!
2. If some tests fail → See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. For advanced configuration → See [INPUTS.md](./INPUTS.md)
4. For setup help → See [SETUP.md](./SETUP.md)

---

**Note:** System audio capture requiring a virtual device is a browser API limitation, not a bug. This is unavoidable and affects all web-based audio applications.