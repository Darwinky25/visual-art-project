# Fix Plan: Visual Project Issues

**Date:** 2026-04-26  
**Issues Identified:** 4 critical problems

---

## Issue Summary

1. **Beat Sync Problem:** Visualizations not syncing properly with music beats
2. **Fullscreen Mode Broken:** Fullscreen functionality not working
3. **Beat Debug Impact:** Beat debug feature may be interfering with sync
4. **Kinect Not Working:** Need alternative depth sensing solution

---

## Issue #1: Beat Sync Not Working Properly

### Root Cause Analysis

After analyzing [`src/audioProcessor.ts`](../src/audioProcessor.ts:236-347) and [`src/visualizer/drawVisualizer.ts`](../src/visualizer/drawVisualizer.ts:405-476), I've identified several potential issues:

#### Problem Areas:

1. **Over-Smoothing in Beat Detection**
   - Location: [`audioProcessor.ts:306`](../src/audioProcessor.ts:306)
   - Current: `this.beatPulse *= Math.exp(-deltaSeconds * 10.5);`
   - Issue: Beat pulse decays too quickly (10.5 is very aggressive)
   - The pulse value drops to near-zero within ~200ms, making beats feel "missed"

2. **Conservative Beat Threshold**
   - Location: [`audioProcessor.ts:271`](../src/audioProcessor.ts:271)
   - Current: `adaptiveFluxThreshold = fluxMean + fluxStd * 0.95 + 0.006`
   - Issue: Threshold is too high, missing subtle beats
   - The 0.95 multiplier makes it require very strong transients

3. **Strict Interval Gating**
   - Location: [`audioProcessor.ts:269-270`](../src/audioProcessor.ts:269-270)
   - Current: `minBeatIntervalMs = expectedPeriodMs * 0.38` (too restrictive)
   - Issue: Prevents detection of syncopated rhythms and off-beat hits

4. **Spring Physics Damping**
   - Location: [`audioProcessor.ts:89-93`](../src/audioProcessor.ts:89-93)
   - Current: Bass spring friction = 0.65, tension = 0.3
   - Issue: Too much damping creates lag between audio and visual response

5. **Visualization Beat Response**
   - Location: [`drawVisualizer.ts:432`](../src/visualizer/drawVisualizer.ts:432)
   - Current: Uses `pulseStrength - animationBeatThreshold` with default threshold 0.22
   - Issue: Double-gating (once in audio processor, again in visualizer)

### Proposed Solutions

#### Solution 1A: Improve Beat Pulse Decay
**File:** [`src/audioProcessor.ts`](../src/audioProcessor.ts:306)

```typescript
// BEFORE (line 306):
this.beatPulse *= Math.exp(-deltaSeconds * 10.5);

// AFTER:
this.beatPulse *= Math.exp(-deltaSeconds * 6.5); // Slower decay for longer visual impact
```

**Rationale:** Slower decay (6.5 instead of 10.5) keeps the beat pulse visible for ~300-400ms instead of ~150ms, making beats more perceptible.

#### Solution 1B: Lower Beat Detection Threshold
**File:** [`src/audioProcessor.ts`](../src/audioProcessor.ts:271)

```typescript
// BEFORE (line 271):
const adaptiveFluxThreshold = fluxMean + fluxStd * 0.95 + 0.006;

// AFTER:
const adaptiveFluxThreshold = fluxMean + fluxStd * 0.65 + 0.004; // More sensitive
```

**Rationale:** Lower multiplier (0.65 vs 0.95) and offset (0.004 vs 0.006) makes beat detection more responsive to medium-strength transients.

#### Solution 1C: Relax Interval Gating
**File:** [`src/audioProcessor.ts`](../src/audioProcessor.ts:269)

```typescript
// BEFORE (line 269):
const minBeatIntervalMs = clamp(expectedPeriodMs * 0.38, 140, 320);

// AFTER:
const minBeatIntervalMs = clamp(expectedPeriodMs * 0.28, 100, 280); // Allow faster beats
```

**Rationale:** Lower multiplier (0.28 vs 0.38) and minimum (100ms vs 140ms) allows detection of faster rhythms and syncopation.

#### Solution 1D: Reduce Spring Damping
**File:** [`src/audioProcessor.ts`](../src/audioProcessor.ts:89-93)

```typescript
// BEFORE (lines 89-93):
private bassSpring = new AudioSpring(0.3, 0.65);
private midsSpring = new AudioSpring(0.3, 0.65);
private highsSpring = new AudioSpring(0.3, 0.65);
private trebleSpring = new AudioSpring(0.3, 0.65);
private levelSpring = new AudioSpring(0.15, 0.8);

// AFTER:
private bassSpring = new AudioSpring(0.45, 0.55); // Higher tension, less friction
private midsSpring = new AudioSpring(0.4, 0.6);
private highsSpring = new AudioSpring(0.4, 0.6);
private trebleSpring = new AudioSpring(0.4, 0.6);
private levelSpring = new AudioSpring(0.25, 0.7); // Faster energy response
```

**Rationale:** Higher tension (faster response) and lower friction (less damping) reduces lag between audio and visual.

#### Solution 1E: Enhance Phase-Based Pulse
**File:** [`src/audioProcessor.ts`](../src/audioProcessor.ts:311-317)

```typescript
// BEFORE (lines 311-317):
const beatPeriodMs = 60000 / bpmHint;
let phasePulse = 0;
if (this.lastBeatTime > 0 && beatPeriodMs > 0) {
  const phase = ((now - this.lastBeatTime) % beatPeriodMs) / beatPeriodMs;
  const phaseDistance = Math.min(phase, 1 - phase);
  phasePulse = Math.exp(-(phaseDistance * phaseDistance) / (2 * 0.09 * 0.09));
}

// AFTER:
const beatPeriodMs = 60000 / bpmHint;
let phasePulse = 0;
if (this.lastBeatTime > 0 && beatPeriodMs > 0) {
  const phase = ((now - this.lastBeatTime) % beatPeriodMs) / beatPeriodMs;
  const phaseDistance = Math.min(phase, 1 - phase);
  // Wider pulse window (0.15 vs 0.09) for more sustained beat visualization
  phasePulse = Math.exp(-(phaseDistance * phaseDistance) / (2 * 0.15 * 0.15));
}
```

**Rationale:** Wider Gaussian window (0.15 vs 0.09) creates longer-lasting phase-based pulses that maintain sync even between detected beats.

#### Solution 1F: Add Beat Anticipation
**File:** [`src/audioProcessor.ts`](../src/audioProcessor.ts:319)

```typescript
// BEFORE (line 319):
const pulse = clamp01(Math.max(this.beatPulse, phasePulse * 0.68, outBass * 0.72 + outEnergy * 0.45));

// AFTER:
// Add anticipation: pulse slightly before the beat for tighter sync
const anticipationPhase = ((now - this.lastBeatTime + beatPeriodMs * 0.05) % beatPeriodMs) / beatPeriodMs;
const anticipationDistance = Math.min(anticipationPhase, 1 - anticipationPhase);
const anticipationPulse = Math.exp(-(anticipationDistance * anticipationDistance) / (2 * 0.12 * 0.12));
const pulse = clamp01(Math.max(this.beatPulse, phasePulse * 0.75, anticipationPulse * 0.4, outBass * 0.72 + outEnergy * 0.45));
```

**Rationale:** Adds a slight anticipatory pulse (5% ahead) that makes visuals feel more "locked in" with the music.

### Implementation Priority

**High Priority (Immediate Impact):**
1. Solution 1A: Beat pulse decay (easiest, biggest impact)
2. Solution 1B: Lower threshold (makes detection more sensitive)
3. Solution 1D: Reduce spring damping (reduces lag)

**Medium Priority (Fine-tuning):**
4. Solution 1C: Relax interval gating (allows more rhythm types)
5. Solution 1E: Enhance phase pulse (sustains between beats)

**Low Priority (Advanced):**
6. Solution 1F: Beat anticipation (requires testing to avoid feeling "early")

---

## Issue #2: Fullscreen Mode Not Working

### Root Cause Analysis

**Location:** [`src/App.tsx:898-904`](../src/App.tsx:898-904)

```typescript
const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    containerRef.current?.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
};
```

#### Identified Problems:

1. **Optional Chaining on requestFullscreen**
   - `containerRef.current?.requestFullscreen?.()` may fail silently
   - No error handling or fallback for unsupported browsers

2. **Missing Vendor Prefixes**
   - Safari uses `webkitRequestFullscreen`
   - Older browsers need prefixed versions

3. **No Error Handling**
   - Fullscreen can be blocked by browser policies
   - No user feedback when it fails

4. **Container Element Issues**
   - The `containerRef` points to the app shell div
   - Should target the canvas container for better UX

### Proposed Solutions

#### Solution 2A: Add Vendor Prefix Support
**File:** [`src/App.tsx`](../src/App.tsx:898-904)

```typescript
// REPLACE toggleFullscreen function:
const toggleFullscreen = async () => {
  try {
    if (!document.fullscreenElement) {
      const element = containerRef.current;
      if (!element) return;
      
      // Try standard API first
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      }
      // Safari fallback
      else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      }
      // Firefox fallback
      else if ((element as any).mozRequestFullScreen) {
        await (element as any).mozRequestFullScreen();
      }
      // IE11 fallback
      else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
      } else {
        console.warn('Fullscreen API not supported');
        alert('Fullscreen mode is not supported in your browser');
      }
    } else {
      // Exit fullscreen with vendor prefixes
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    }
  } catch (error) {
    console.error('Fullscreen error:', error);
    // Don't show alert for user-cancelled fullscreen
    if (error instanceof Error && !error.message.includes('request')) {
      alert('Could not enter fullscreen mode. Please try again.');
    }
  }
};
```

#### Solution 2B: Add Multiple Fullscreen Event Listeners
**File:** [`src/App.tsx`](../src/App.tsx:906-912)

```typescript
// REPLACE useEffect for fullscreen change:
useEffect(() => {
  const handleFullscreenChange = () => {
    const isFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
    setIsFullscreen(isFullscreen);
  };
  
  // Add all vendor-prefixed event listeners
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  document.addEventListener('MSFullscreenChange', handleFullscreenChange);
  
  return () => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
  };
}, []);
```

#### Solution 2C: Add Keyboard Shortcut
**File:** [`src/App.tsx`](../src/App.tsx) - Add new useEffect

```typescript
// ADD after fullscreen change useEffect:
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // F11 or F for fullscreen
    if (e.key === 'F11' || (e.key === 'f' && !e.ctrlKey && !e.metaKey)) {
      e.preventDefault();
      toggleFullscreen();
    }
    // ESC to exit (browser handles this, but we can add custom behavior)
    if (e.key === 'Escape' && isFullscreen) {
      // Custom exit behavior if needed
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [isFullscreen]);
```

### Implementation Priority

**Critical:**
1. Solution 2A: Vendor prefix support (fixes Safari/older browsers)
2. Solution 2B: Multiple event listeners (ensures state sync)

**Nice to Have:**
3. Solution 2C: Keyboard shortcut (better UX)

---

## Issue #3: Beat Debug Feature Interfering with Sync

### Root Cause Analysis

**Location:** [`src/App.tsx:1225-1247`](../src/App.tsx:1225-1247)

The Beat Debug panel displays:
- Beat Onset (flux value)
- Beat Threshold (adaptive threshold)
- Beat Interval (ms between beats)
- Beat Confidence (0-100%)

#### Potential Issues:

1. **No Direct Interference Found**
   - The debug panel is read-only display
   - It doesn't modify beat detection logic
   - However, it may reveal that beat detection itself is the problem

2. **Possible Performance Impact**
   - Updating 4 debug values every frame could cause minor overhead
   - String formatting with `.toFixed()` on every render

3. **Visual Distraction**
   - Debug panel may make users focus on numbers instead of feel
   - Numbers updating rapidly can be distracting

### Proposed Solutions

#### Solution 3A: Make Debug Panel Optional
**File:** [`src/App.tsx`](../src/App.tsx:1225-1247)

```typescript
// ADD state for debug panel toggle:
const [showBeatDebug, setShowBeatDebug] = useState(false);

// WRAP debug panel in conditional:
{showBeatDebug && (
  <div style={{ marginTop: '1.2rem', marginBottom: '1rem', borderTop: '1px dashed #333', paddingTop: '1rem' }}>
    <strong style={{ opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem', marginBottom: '8px', display: 'block' }}>Beat Debug</strong>
    {/* ... existing debug content ... */}
  </div>
)}

// ADD toggle button in GLOBAL menu:
<button
  onClick={() => setShowBeatDebug(!showBeatDebug)}
  style={{ padding: '8px 12px', background: showBeatDebug ? '#ffcc00' : '#333', color: showBeatDebug ? '#000' : '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
>
  {showBeatDebug ? 'Hide' : 'Show'} Beat Debug
</button>
```

#### Solution 3B: Throttle Debug Updates
**File:** [`src/App.tsx`](../src/App.tsx) - Modify metrics update

```typescript
// ADD throttled debug metrics state:
const [debugMetrics, setDebugMetrics] = useState(liveMetrics);

// ADD throttled update effect:
useEffect(() => {
  // Only update debug display every 200ms instead of every frame
  const interval = setInterval(() => {
    setDebugMetrics(liveMetrics);
  }, 200);
  return () => clearInterval(interval);
}, [liveMetrics]);

// USE debugMetrics in debug panel instead of liveMetrics:
<div style={{ color: '#fff', fontFamily: 'var(--mono-font)', fontSize: '0.75rem' }}>
  {debugMetrics.beatOnset.toFixed(3)}
</div>
```

#### Solution 3C: Improve Debug Visualization
**File:** [`src/App.tsx`](../src/App.tsx:1225-1247)

```typescript
// ADD visual beat indicator instead of just numbers:
<div style={{ marginTop: '1.2rem', marginBottom: '1rem', borderTop: '1px dashed #333', paddingTop: '1rem' }}>
  <strong style={{ opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem', marginBottom: '8px', display: 'block' }}>Beat Sync</strong>
  
  {/* Visual beat pulse indicator */}
  <div style={{ 
    width: '100%', 
    height: '40px', 
    background: '#141414', 
    borderRadius: '4px', 
    marginBottom: '12px',
    position: 'relative',
    overflow: 'hidden'
  }}>
    <div style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: `${liveMetrics.pulse * 100}%`,
      height: '100%',
      background: liveMetrics.bassHit ? '#10b981' : '#3b82f6',
      transition: 'width 0.05s ease-out',
      boxShadow: liveMetrics.bassHit ? '0 0 20px #10b981' : 'none'
    }} />
    <div style={{
      position: 'absolute',
      left: `${(liveMetrics.beatOnset / liveMetrics.beatThreshold) * 100}%`,
      top: 0,
      width: '2px',
      height: '100%',
      background: '#ffcc00'
    }} />
  </div>
  
  {/* Existing debug numbers (collapsed by default) */}
  {/* ... */}
</div>
```

### Recommendation

**The beat debug panel is NOT causing the sync issue.** The real problem is in the audio processing algorithm (Issue #1). However:

- Solution 3A: Make it optional (good for production)
- Solution 3C: Add visual indicator (helps users see sync quality)

---

## Issue #4: Kinect Not Working - Alternative Solutions

### Current Kinect Implementation

**Architecture:**
- Python server using libfreenect
- WebSocket connection on port 8765
- Auto-start via Tauri backend
- 3D depth visualization

**Files:**
- [`scripts/servers/kinect_server.py`](../scripts/servers/kinect_server.py)
- [`src/hooks/useKinect.ts`](../src/hooks/useKinect.ts)
- [`src/visualizer/drawKinect3D.ts`](../src/visualizer/drawKinect3D.ts)
- [`src-tauri/src/kinect_server.rs`](../src-tauri/src/kinect_server.rs)

### Why Kinect Might Not Work

1. **Hardware Issues:**
   - Kinect V1 requires specific USB 3.0 controller
   - Power supply issues (needs external power on some systems)
   - Driver compatibility (libfreenect may not be installed)

2. **Software Issues:**
   - Python dependencies not installed
   - WebSocket port 8765 blocked or in use
   - Tauri auto-start failing silently

3. **Platform Issues:**
   - macOS: Requires libfreenect via Homebrew
   - Windows: Needs Kinect SDK or libfreenect
   - Linux: Needs libfreenect-dev

### Alternative Depth Sensing Solutions

#### Option A: WebRTC Depth Camera (Recommended)

**Technology:** Use modern depth cameras with WebRTC support
- Intel RealSense (D435, D455)
- Azure Kinect DK
- iPhone/iPad LiDAR (via WebRTC)

**Advantages:**
- No external server needed
- Browser-native support
- Better performance
- Modern hardware

**Implementation:**
```typescript
// New hook: src/hooks/useDepthCamera.ts
export function useDepthCamera() {
  const [depthFrame, setDepthFrame] = useState<Uint8Array | null>(null);
  
  const start = async () => {
    try {
      // Request depth stream via WebRTC
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          // @ts-ignore - depth is experimental
          videoKind: 'depth',
          width: 640,
          height: 480
        }
      });
      
      // Process depth frames
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      // Extract depth data from video frames
      // ... implementation
    } catch (error) {
      console.error('Depth camera not available:', error);
    }
  };
  
  return { depthFrame, start, stop };
}
```

#### Option B: Webcam-Based Depth Estimation

**Technology:** Use AI/ML for depth estimation from regular webcam
- TensorFlow.js BodyPix
- MediaPipe
- MiDaS depth estimation

**Advantages:**
- Works with any webcam
- No special hardware needed
- Good enough for visualization

**Implementation:**
```typescript
// Use TensorFlow.js for depth estimation
import * as tf from '@tensorflow/tfjs';
import * as bodyPix from '@tensorflow-models/body-pix';

export function useWebcamDepth() {
  const [depthMap, setDepthMap] = useState<Float32Array | null>(null);
  
  const start = async () => {
    const net = await bodyPix.load();
    const video = await setupWebcam();
    
    const estimateDepth = async () => {
      const segmentation = await net.segmentPerson(video);
      // Convert segmentation to depth map
      const depth = segmentationToDepth(segmentation);
      setDepthMap(depth);
      requestAnimationFrame(estimateDepth);
    };
    
    estimateDepth();
  };
  
  return { depthMap, start, stop };
}
```

#### Option C: Fix Existing Kinect Implementation

**Diagnostic Steps:**

1. **Check libfreenect installation:**
```bash
# macOS
brew list libfreenect

# Linux
dpkg -l | grep libfreenect

# Test Kinect directly
freenect-glview
```

2. **Check Python dependencies:**
```bash
python3 -c "import freenect; print('OK')"
```

3. **Test WebSocket manually:**
```bash
# Start server manually
python3 scripts/servers/kinect_server.py

# Check if port is open
lsof -i :8765
```

4. **Check Tauri logs:**
```bash
# Run in dev mode and check console
npm run tauri:dev
```

**Common Fixes:**

```bash
# macOS - Install libfreenect
brew install libfreenect

# Install Python bindings
pip3 install freenect

# Fix USB permissions (Linux)
sudo usermod -a -G video $USER
sudo cp /usr/share/doc/libfreenect/fakenect/51-kinect.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules
```

#### Option D: Remove Kinect Dependency

**Simplest Solution:** Disable Kinect features entirely

**Changes needed:**
1. Remove Kinect layer type from UI
2. Remove auto-start in [`src/App.tsx:893-896`](../src/App.tsx:893-896)
3. Keep code for future use but don't activate

```typescript
// In App.tsx, comment out auto-start:
// useEffect(() => {
//   startKinect();
// }, [startKinect]);
```

### Recommended Approach

**Short-term (Immediate):**
- Option D: Disable Kinect auto-start to prevent errors
- Focus on fixing beat sync (more critical)

**Medium-term (1-2 weeks):**
- Option C: Debug existing Kinect setup if hardware is available
- Document setup requirements clearly

**Long-term (Future enhancement):**
- Option B: Add webcam-based depth estimation (works for everyone)
- Option A: Support modern depth cameras (better quality)

---

## Implementation Roadmap

### Phase 1: Critical Fixes (Immediate)

**Priority 1: Beat Sync**
1. Apply Solution 1A (beat pulse decay)
2. Apply Solution 1B (lower threshold)
3. Apply Solution 1D (reduce spring damping)
4. Test with various music genres

**Priority 2: Fullscreen**
1. Apply Solution 2A (vendor prefixes)
2. Apply Solution 2B (event listeners)
3. Test on Safari, Chrome, Firefox

**Priority 3: Kinect**
1. Apply Option D (disable auto-start)
2. Add clear error message if Kinect unavailable

**Estimated effort:** 2-3 hours

### Phase 2: Fine-tuning (Next session)

**Beat Sync Refinement:**
1. Apply Solution 1C (interval gating)
2. Apply Solution 1E (phase pulse)
3. Test Solution 1F (anticipation) - may need adjustment

**Debug Panel:**
1. Apply Solution 3A (make optional)
2. Apply Solution 3C (visual indicator)

**Estimated effort:** 1-2 hours

### Phase 3: Kinect Alternative (Future)

**If Kinect hardware available:**
1. Debug existing implementation (Option C)
2. Document setup process

**If no Kinect:**
1. Implement webcam depth estimation (Option B)
2. Add as new layer type

**Estimated effort:** 4-6 hours

---

## Testing Plan

### Beat Sync Testing

**Test Cases:**
1. **Steady 4/4 beat** (120 BPM house music)
   - Expected: Consistent pulse on every beat
   - Verify: Visual hits align with kick drum

2. **Fast tempo** (140+ BPM drum & bass)
   - Expected: Catches rapid beats without missing
   - Verify: No beat skipping

3. **Syncopated rhythm** (hip-hop, funk)
   - Expected: Catches off-beat hits
   - Verify: Snare and hi-hat hits visible

4. **Dynamic range** (quiet verse → loud drop)
   - Expected: Adapts to volume changes
   - Verify: Doesn't lose sync during transitions

5. **Bass-heavy** (dubstep, trap)
   - Expected: Strong response to sub-bass
   - Verify: Drop hits are dramatic

### Fullscreen Testing

**Test Matrix:**

| Browser | OS | Test |
|---------|----|----- |
| Chrome | macOS | Button click, F11, double-click |
| Safari | macOS | Button click, double-click |
| Firefox | macOS | Button click, F11 |
| Chrome | Windows | Button click, F11 |
| Edge | Windows | Button click, F11 |

**Verify:**
- Enters fullscreen correctly
- Exits with ESC
- State updates properly
- No console errors

### Kinect Testing

**If implementing fixes:**
1. Verify WebSocket connection
2. Check depth data streaming
3. Test 3D visualization rendering
4. Verify audio reactivity

---

## Configuration Changes

### Recommended Default Settings

After implementing beat sync fixes, update defaults in [`src/App.tsx`](../src/App.tsx:28-183):

```typescript
const defaultSettings: VisualSettings = {
  // ... existing settings ...
  
  // UPDATED for better beat sync:
  animationBeatThreshold: 0.18,        // Was 0.22 (lower = more sensitive)
  animationBeatResponse: 1.0,          // Was 0.8 (higher = stronger response)
  animationBeatBassInfluence: 0.75,    // Was 0.65 (more bass impact)
  springTension: 0.45,                 // Was 0.3 (faster response)
  springFriction: 0.55,                // Was 0.65 (less damping)
  dspTransientAttack: 0.92,            // Was 0.95 (faster attack)
  
  // ... rest of settings ...
};
```

---

## Success Criteria

### Beat Sync
- ✅ Visuals pulse on every beat (4/4 time)
- ✅ No missed beats during drops
- ✅ Syncopation visible (off-beat hits)
- ✅ Adapts to tempo changes within 2-3 beats
- ✅ Works across genres (house, hip-hop, rock, electronic)

### Fullscreen
- ✅ Works in Chrome, Safari, Firefox
- ✅ Works on macOS and Windows
- ✅ Keyboard shortcuts functional
- ✅ No console errors
- ✅ Smooth enter/exit transitions

### Kinect
- ✅ No errors when Kinect unavailable
- ✅ Clear user feedback about status
- ✅ Optional: Working depth visualization

---

## Risk Assessment

### Low Risk
- Beat pulse decay change (1A) - Easy to revert
- Fullscreen vendor prefixes (2A) - Standard practice
- Kinect auto-start disable (D) - Non-breaking

### Medium Risk
- Spring physics changes (1D) - May need fine-tuning
- Beat threshold changes (1B) - Could cause false positives
- Interval gating changes (1C) - May affect BPM detection

### High Risk
- Beat anticipation (1F) - Could feel "off" if not tuned correctly
- Phase pulse changes (1E) - Complex interaction with beat detection

### Mitigation
- Test each change individually
- Keep original values commented in code
- Add UI controls for key parameters
- Create preset for "original" settings

---

## Next Steps

1. **Review this plan** - Confirm approach and priorities
2. **Switch to Code mode** - Implement Phase 1 fixes
3. **Test thoroughly** - Verify each fix works
4. **Iterate** - Adjust parameters based on testing
5. **Document** - Update README with new settings

Would you like me to proceed with implementing these fixes?
