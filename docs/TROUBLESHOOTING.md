# Troubleshooting Guide

Common issues and solutions for Visual Console.

---

## Audio Input Issues

### Microphone Not Working

**Symptoms:** No audio visualization, microphone button doesn't respond

**Solutions:**
1. **Check Permissions:**
   - macOS: System Preferences → Security & Privacy → Microphone
   - Windows: Settings → Privacy → Microphone
   - Grant permission to browser/app

2. **Check Browser Console:**
   - Press F12 or Cmd+Option+I
   - Look for `NotAllowedError` or `NotFoundError`

3. **Verify Microphone:**
   - Test in another app
   - Check it's set as default input device

4. **Check Tauri Configuration:**
   - Ensure window label is set to "main"
   - Verify CSP includes `mediastream:`

### System Audio Not Capturing

**Symptoms:** System audio option doesn't work

**Solutions:**
1. **Install Virtual Audio Device** (required):
   - macOS: BlackHole (`brew install blackhole-2ch`)
   - Windows: Enable Stereo Mix or install VB-Audio Cable
   - Linux: Configure PulseAudio monitor

2. **Set as Output Device**
3. **Select in App** from audio input dropdown

---

## MIDI Controller Issues

### Controller Not Detected

**Solutions:**
1. Check USB connection
2. Verify browser supports Web MIDI API (Chrome, Edge, Opera)
3. Check system recognition
4. Restart app

### MIDI Controls Not Responding

**Solutions:**
1. Check MIDI mapping in `src/hooks/useDjMidi.ts`
2. Verify MIDI messages in browser console
3. Ensure controller is in MIDI mode

---

## Webcam Issues

### Webcam Not Starting

**Solutions:**
1. Check camera permissions in OS settings
2. Close other apps using camera
3. Check browser console for errors
4. Restart browser

---

## Kinect Issues

### Kinect Server Won't Start

**Solutions:**
1. **Install libfreenect:**
   ```bash
   # macOS
   brew install libfreenect
   
   # Linux
   sudo apt install libfreenect-dev
   ```

2. **Check USB Connection:**
   - Use USB 2.0 port (Kinect V1)
   - Try different port
   - Check power adapter connected

3. **Test Manually:**
   ```bash
   freenect-glview
   ```

4. **Manual Server Start:**
   ```bash
   python3 scripts/servers/kinect_server.py
   ```

### No Depth Data

**Solutions:**
1. Check WebSocket connection in browser console
2. Verify port (8765 for Python, 8080 for Node.js)
3. Check firewall settings
4. Restart everything

---

## Tauri Configuration Issues

### Inputs Not Working in Native App

**Critical Fix Required:**

1. **Add Window Label** in `src-tauri/tauri.conf.json`:
   ```json
   "windows": [
     {
       "label": "main",
       ...
     }
   ]
   ```

2. **Update CSP** to include:
   - `mediastream:` for audio/video
   - `ws:` for WebSocket
   - `blob:` and `data:` for processing

3. **Rebuild:**
   ```bash
   npm run tauri:build
   ```

### Build Errors

**Solutions:**
1. Update Rust: `rustup update`
2. Clean build: `npm run tauri build -- --clean`
3. Clear node_modules: `rm -rf node_modules && npm install`

---

## Performance Issues

### Low FPS / Stuttering

**Solutions:**
1. Reduce visual complexity
2. Lower FFT size
3. Increase smoothing
4. Enable hardware acceleration
5. Close background apps

### High CPU Usage

**Solutions:**
1. Reduce update rate
2. Use simpler visualizations
3. Disable unused inputs

---

## Getting Help

1. Check browser console (F12) for errors
2. Review [SETUP.md](./SETUP.md) and [INPUTS.md](./INPUTS.md)
3. Create GitHub issue with:
   - OS and version
   - Error messages
   - Steps to reproduce
