# Audio Processing - Production-Level Implementation

## Overview

This document describes the production-quality audio processing algorithms implemented in the visual project. The audio system has been enhanced with professional DSP techniques for accurate beat detection, frequency analysis, and dynamic response.

## Architecture

### Core Components

1. **[`AudioProcessor`](../src/audioProcessor.ts)** - Main DSP engine with advanced algorithms
2. **[`useMicrophoneAnalyzer`](../src/hooks/useMicrophoneAnalyzer.ts)** - Microphone input hook
3. **[`useSystemAudioAnalyzer`](../src/hooks/useSystemAudioAnalyzer.ts)** - System audio (BlackHole) hook
4. **[`useTauriMicrophone`](../src/hooks/useTauriMicrophone.ts)** - Tauri native audio hook
5. **[`audio_capture.rs`](../src-tauri/src/audio_capture.rs)** - Rust audio capture backend

## Production-Level Features

### 1. FFT Analysis Quality

#### Windowing Function (Hann Window)
- **Purpose**: Reduces spectral leakage in FFT analysis
- **Implementation**: `w(n) = 0.5 * (1 - cos(2πn / (N-1)))`
- **Benefit**: Cleaner frequency separation, more accurate bass/mid/treble detection
- **Toggle**: `enableWindowing: true` (default)

```typescript
// Example: Disable windowing for raw FFT
processor.setConfig({ enableWindowing: false });
```

#### A-Weighting Filter
- **Purpose**: Perceptual loudness weighting (emphasizes 1-5kHz where humans are most sensitive)
- **Implementation**: Simplified A-weighting curve approximation
- **Benefit**: More natural visual response to perceived loudness
- **Toggle**: `enableAWeighting: true` (default)

```typescript
// Example: Disable A-weighting for flat frequency response
processor.setConfig({ enableAWeighting: false });
```

### 2. Frequency Band Analysis

#### Perceptual Bands (Bark Scale Approximation)
- **Sub-bass**: < 60 Hz
- **Bass**: 60-250 Hz (extra resolution for kick drums)
- **Low-mids**: 250-500 Hz
- **Mids**: 500-2000 Hz
- **High-mids**: 2000-4000 Hz
- **Highs**: 4000-8000 Hz
- **Treble/Air**: 8000+ Hz

**Benefits**:
- More resolution where music has most energy
- Better separation of kick, snare, vocals, cymbals
- Logarithmic scaling matches human perception

```typescript
// Example: Use perceptual bands (recommended)
processor.setConfig({ enablePerceptualBands: true });

// Example: Use legacy linear bands
processor.setConfig({ 
  enablePerceptualBands: false,
  dspBassEnd: 5,    // 5% of spectrum
  dspMidsEnd: 40,   // 40% of spectrum
  dspHighsEnd: 75   // 75% of spectrum
});
```

### 3. Beat Detection

#### Multi-Band Onset Detection
- **Method**: Tracks energy changes across 4 frequency bands simultaneously
- **Weights**: Bass (45%), Low-mids (30%), Mids (15%), Highs (10%)
- **Adaptive Threshold**: Mean + (StdDev × 0.65) + 0.004
- **Benefits**: 
  - Fewer false positives
  - Better detection of different drum types
  - Adapts to varying music styles

```typescript
// Example: Enable multi-band onset (recommended)
processor.setConfig({ enableMultiBandOnset: true });

// Example: Adjust beat sensitivity
processor.setConfig({ 
  beatSensitivity: 1.5  // Range: 0.1-3.0 (1.0 = default)
});
```

#### BPM Estimation
- **Method**: Median filtering of beat intervals with octave correction
- **Range**: 60-200 BPM
- **Smoothing**: Adaptive (faster when uncertain, slower when locked)
- **Output**: `bpmHint` in AudioMetrics

#### Beat Confidence
- **Factors**:
  - Onset ratio (flux vs threshold)
  - Bass energy gate
  - Interval consistency
- **Range**: 0.0-1.0
- **Output**: `beatConfidence` in AudioMetrics

### 4. Dynamics Processing

#### Envelope Followers
- **Purpose**: Smooth attack/release for natural dynamics
- **Implementation**: Separate attack and release coefficients
- **Default**: Attack = 10ms, Release = 100ms
- **Per-band**: Independent envelopes for bass, mids, highs, treble

```typescript
// Example: Faster attack for snappier response
processor.setConfig({ 
  attackTime: 0.005,   // 5ms
  releaseTime: 0.15    // 150ms
});
```

#### Dynamic Normalization (AGC)
- **Purpose**: Automatic gain control adapts to different audio levels
- **Method**: Adaptive floor and peak tracking per band
- **Benefits**:
  - Consistent visual response across quiet/loud tracks
  - Prevents clipping and underutilization
  - Adapts to room acoustics

```typescript
// Example: Adjust AGC decay rate
processor.setConfig({ 
  agcDecayRate: 0.995  // Range: 0.9-0.9995 (slower = more stable)
});
```

#### Spring Physics Smoothing
- **Purpose**: Organic, bouncy motion instead of linear interpolation
- **Parameters**: Tension (speed) and Friction (damping)
- **Per-band**: Independent springs for bass, mids, highs, treble, energy

```typescript
// Example: Bouncier bass response
processor.setConfig({ 
  springTension: 0.5,   // Higher = faster response
  springFriction: 0.6   // Lower = more bounce
});
```

### 5. Spectral Analysis

#### Spectral Centroid
- **Purpose**: Measures "brightness" or center of frequency mass
- **Range**: 0.0 (dark/warm) to 1.0 (bright/airy)
- **Use cases**: Color mapping, filter sweeps, mood detection
- **Output**: `centroid` in AudioMetrics

#### Spectral Texture
- **Purpose**: Measures "roughness" or noisiness
- **Method**: Zero-crossing rate + upper-band activity
- **Range**: 0.0 (smooth/tonal) to 1.0 (rough/noisy)
- **Use cases**: Particle density, distortion effects
- **Output**: `texture` in AudioMetrics

### 6. Performance Optimizations

#### Buffer Management
- **Pre-allocation**: Buffers created once, reused every frame
- **Lazy reallocation**: Only when FFT size changes
- **Benefit**: Reduces garbage collection pressure

#### Efficient Processing
- **Windowing**: Pre-computed Hann window, reused
- **Float32Array**: Used internally for faster math
- **Minimal allocations**: No new arrays in hot path

#### Throttled Updates
- **React state**: Updated at configurable interval (default 180ms)
- **Frame reference**: Updated every frame for visualizers
- **Benefit**: Reduces React re-renders, maintains smooth visuals

## Configuration Reference

### AudioProcessorConfig

```typescript
interface AudioProcessorConfig {
  // Spring physics
  springTension: number;      // 0.05-1.5, default: 0.3
  springFriction: number;     // 0.1-0.99, default: 0.65
  
  // Dynamics
  shapePower: number;         // 1.0-4.0, default: 2.5
  agcDecayRate: number;       // 0.9-0.9995, default: 0.99
  attackTime: number;         // 0.001-0.1s, default: 0.01
  releaseTime: number;        // 0.01-1.0s, default: 0.1
  
  // Frequency bands (legacy, %)
  dspBassEnd: number;         // 1-30, default: 5
  dspMidsEnd: number;         // 5-80, default: 40
  dspHighsEnd: number;        // 20-99, default: 75
  
  // Beat detection
  dspTransientAttack: number; // 0.7-0.99, default: 0.95
  beatSensitivity: number;    // 0.1-3.0, default: 1.0
  
  // Production features
  enableWindowing: boolean;        // default: true
  enableAWeighting: boolean;       // default: true
  enablePerceptualBands: boolean;  // default: true
  enableMultiBandOnset: boolean;   // default: true
  enableHarmonicAnalysis: boolean; // default: false (expensive)
}
```

### Analyzer Hook Config

```typescript
// FFT settings
dspFftSize: 2048 | 4096 | 8192  // default: 2048
dspMinDecibels: number          // default: -80
dspMaxDecibels: number          // default: -10

// Smoothing
smoothingTimeConstant: 0.0-0.99 // default: 0.15

// Update rate
metricsUpdateMs: number         // default: 180ms
```

## AudioMetrics Output

```typescript
interface AudioMetrics {
  // Frequency bands (0.0-1.0)
  bass: number;           // Low frequencies (kick, bass)
  mids: number;           // Mid frequencies (vocals, guitars)
  highs: number;          // High frequencies (snare, hi-hats)
  treble: number;         // Very high frequencies (cymbals, air)
  
  // Overall levels
  level: number;          // Overall energy level
  energy: number;         // Same as level (alias)
  peak: number;           // Peak amplitude
  
  // Beat detection
  bassHit: boolean;       // True when beat detected
  pulse: number;          // Smooth pulse value (0.0-1.0)
  bpmHint: number;        // Estimated BPM (60-200)
  beatOnset: number;      // Raw onset flux value
  beatThreshold: number;  // Adaptive threshold
  beatIntervalMs: number; // Last beat interval in ms
  beatConfidence: number; // Beat detection confidence (0.0-1.0)
  
  // Spectral features
  centroid: number;       // Brightness (0.0-1.0)
  texture: number;        // Roughness (0.0-1.0)
}
```

## Usage Examples

### Basic Setup

```typescript
import { useMicrophoneAnalyzer } from './hooks/useMicrophoneAnalyzer';

function MyVisualizer() {
  const { frame, metrics, start, stop, isRunning } = useMicrophoneAnalyzer(
    0.15,  // smoothingTimeConstant
    {      // audioProcessorConfig
      enableWindowing: true,
      enableAWeighting: true,
      enablePerceptualBands: true,
      beatSensitivity: 1.0,
    },
    180    // metricsUpdateMs
  );
  
  // Access real-time audio data
  const bass = frame.current.bass;
  const beat = frame.current.bassHit;
  const bpm = frame.current.bpmHint;
}
```

### Advanced Configuration

```typescript
// High-resolution bass detection
const config = {
  dspFftSize: 4096,           // Higher resolution
  enablePerceptualBands: true,
  beatSensitivity: 1.2,       // More sensitive
  attackTime: 0.005,          // Fast attack
  releaseTime: 0.2,           // Slower release
  springTension: 0.5,         // Snappier response
  springFriction: 0.55,       // Less damping
};

// Smooth, ambient response
const config = {
  beatSensitivity: 0.7,       // Less sensitive
  attackTime: 0.02,           // Slower attack
  releaseTime: 0.3,           // Slower release
  springTension: 0.2,         // Gentler response
  springFriction: 0.75,       // More damping
  shapePower: 3.0,            // More compression
};
```

### Visualizer Integration

```typescript
function draw(ctx: CanvasRenderingContext2D, audio: AudioFrame) {
  // Use bass for size
  const size = 100 + audio.bass * 200;
  
  // Use beat for flash
  if (audio.bassHit) {
    ctx.fillStyle = 'white';
  }
  
  // Use centroid for color (warm to cool)
  const hue = audio.centroid * 180; // 0=red, 180=cyan
  ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
  
  // Use texture for particle count
  const particleCount = Math.floor(audio.texture * 100);
  
  // Use BPM for animation speed
  const speed = audio.bpmHint / 120; // Normalized to 120 BPM
}
```

## Performance Considerations

### CPU Usage
- **FFT Size**: 2048 = ~1-2% CPU, 4096 = ~2-4% CPU, 8192 = ~4-8% CPU
- **Windowing**: +0.5% CPU
- **Multi-band onset**: +0.3% CPU
- **A-weighting**: +0.2% CPU

### Memory Usage
- **Base**: ~100KB (processor state)
- **Per analyzer**: ~50KB (buffers)
- **FFT 2048**: ~8KB per buffer
- **FFT 4096**: ~16KB per buffer

### Latency
- **Web Audio API**: ~10-20ms (browser dependent)
- **Processing**: <1ms
- **Total**: ~11-21ms (acceptable for real-time visuals)

## Troubleshooting

### Beats Not Detected
1. Increase `beatSensitivity` (try 1.5)
2. Enable `enableMultiBandOnset`
3. Check audio input level (should have peaks)
4. Verify `dspMinDecibels` isn't too high

### Too Many False Positives
1. Decrease `beatSensitivity` (try 0.7)
2. Increase `dspTransientAttack` (try 0.97)
3. Check for background noise

### Visuals Too Jittery
1. Increase `springFriction` (try 0.75)
2. Increase `releaseTime` (try 0.2)
3. Increase `smoothingTimeConstant` (try 0.25)

### Visuals Too Sluggish
1. Increase `springTension` (try 0.5)
2. Decrease `releaseTime` (try 0.05)
3. Decrease `smoothingTimeConstant` (try 0.1)

### Bass Not Responsive
1. Enable `enablePerceptualBands`
2. Increase FFT size to 4096
3. Check `dspMinDecibels` (should be -80 or lower)

## Future Enhancements

### Planned Features
- [ ] Harmonic analysis for chord detection
- [ ] Tempo tracking state machine
- [ ] Downbeat detection
- [ ] Key/scale detection
- [ ] Vocal/instrument separation
- [ ] LUFS loudness metering
- [ ] Spectral flux patterns for genre detection

### Rust Backend Improvements
- [ ] FFT processing in Rust (lower latency)
- [ ] SIMD optimizations
- [ ] Real-time resampling
- [ ] Hardware-accelerated DSP

## References

- [Web Audio API Specification](https://www.w3.org/TR/webaudio/)
- [Digital Signal Processing Guide](https://www.dspguide.com/)
- [Music Information Retrieval](https://musicinformationretrieval.com/)
- [A-weighting Filter](https://en.wikipedia.org/wiki/A-weighting)
- [Bark Scale](https://en.wikipedia.org/wiki/Bark_scale)
- [Onset Detection](https://www.ee.columbia.edu/~dpwe/papers/BelloDPWE05-onset.pdf)

## Credits

Production-level audio processing implementation by the visual project team.
Algorithms based on industry-standard DSP techniques and music information retrieval research.
