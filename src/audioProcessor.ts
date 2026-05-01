import { AudioMetrics } from "./types";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type AudioProcessorConfig = {
  springTension: number;
  springFriction: number;
  shapePower: number;
  agcDecayRate: number;
  dspBassEnd: number;
  dspMidsEnd: number;
  dspHighsEnd: number;
  dspTransientAttack: number;
  // New production-level parameters
  enableWindowing: boolean;
  enableAWeighting: boolean;
  enablePerceptualBands: boolean;
  beatSensitivity: number;
  attackTime: number;
  releaseTime: number;
  enableMultiBandOnset: boolean;
  enableHarmonicAnalysis: boolean;
};

const DEFAULT_CONFIG: AudioProcessorConfig = {
  springTension: 0.3,
  springFriction: 0.65,
  shapePower: 2.5,
  agcDecayRate: 0.99,
  dspBassEnd: 5,
  dspMidsEnd: 40,
  dspHighsEnd: 75,
  dspTransientAttack: 0.95,
  // Production defaults
  enableWindowing: true,
  enableAWeighting: true,
  enablePerceptualBands: true,
  beatSensitivity: 1.0,
  attackTime: 0.01,
  releaseTime: 0.1,
  enableMultiBandOnset: true,
  enableHarmonicAnalysis: false, // Expensive, off by default
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) * 0.5;
  }
  return sorted[mid];
}

/**
 * Hann window function for reducing spectral leakage in FFT analysis
 * w(n) = 0.5 * (1 - cos(2πn / (N-1)))
 */
function createHannWindow(size: number): Float32Array {
  const window = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return window;
}

/**
 * A-weighting filter approximation for perceptual loudness
 * Emphasizes frequencies where human hearing is most sensitive (1-5kHz)
 */
function getAWeighting(frequency: number): number {
  const f2 = frequency * frequency;
  const f4 = f2 * f2;
  
  // Simplified A-weighting formula
  const c1 = 12194 * 12194;
  const c2 = 20.6 * 20.6;
  const c3 = 107.7 * 107.7;
  const c4 = 737.9 * 737.9;
  
  const numerator = c1 * f4;
  const denominator = (f2 + c2) * Math.sqrt((f2 + c3) * (f2 + c4)) * (f2 + c1);
  
  const weight = numerator / denominator;
  // Convert to linear scale (0-1 range)
  return Math.min(1, weight * 0.5);
}

/**
 * Perceptual frequency bands based on critical bands (Bark scale approximation)
 * More resolution in bass/low-mids where music has most energy
 *
 * Note: Reserved for future harmonic analysis feature
 * Uncomment when implementing per-bin perceptual weighting
 */
/*
function getPerceptualBandIndex(binIndex: number, totalBins: number, sampleRate: number): number {
  const frequency = (binIndex * sampleRate) / (totalBins * 2);
  
  // Logarithmic mapping with more resolution in bass
  if (frequency < 60) return 0; // Sub-bass
  if (frequency < 250) return 1; // Bass
  if (frequency < 500) return 2; // Low-mids
  if (frequency < 2000) return 3; // Mids
  if (frequency < 4000) return 4; // High-mids
  if (frequency < 8000) return 5; // Highs
  return 6; // Treble/Air
}
*/

/**
 * Envelope follower with separate attack and release times
 * Provides smooth, natural dynamics tracking
 */
class EnvelopeFollower {
  private value = 0;
  
  constructor(
    private attackCoeff: number = 0.01,
    private releaseCoeff: number = 0.1
  ) {}
  
  setAttackTime(seconds: number, sampleRate: number = 60) {
    this.attackCoeff = 1 - Math.exp(-1 / (seconds * sampleRate));
  }
  
  setReleaseTime(seconds: number, sampleRate: number = 60) {
    this.releaseCoeff = 1 - Math.exp(-1 / (seconds * sampleRate));
  }
  
  process(input: number): number {
    const coeff = input > this.value ? this.attackCoeff : this.releaseCoeff;
    this.value += (input - this.value) * coeff;
    return this.value;
  }
  
  getValue(): number {
    return this.value;
  }
  
  reset() {
    this.value = 0;
  }
}

/**
 * Spring-based smoothing removes the "linear robotic" feel.
 * It provides organic acceleration and bouncy deceleration.
 */
class AudioSpring {
  value = 0;
  velocity = 0;
  
  constructor(public tension = 0.4, public friction = 0.6) {} 

  update(target: number) {
    const force = (target - this.value) * this.tension;
    this.velocity = (this.velocity + force) * this.friction;
    this.value += this.velocity;
    
    // Hard clamp to prevent weird visual glitches from extreme bounces
    if (this.value < 0) { this.value = 0; this.velocity = 0; }
    if (this.value > 1.2) { this.value = 1.2; } 
    if (Math.abs(target - this.value) < 0.0005 && Math.abs(this.velocity) < 0.0005) {
      this.value = target;
      this.velocity = 0;
    }
    return clamp01(this.value);
  }
  
  reset() {
    this.value = 0;
    this.velocity = 0;
  }
}

/**
 * Dynamic normalizer with adaptive floor and peak tracking
 * Provides automatic gain control that adapts to different audio levels
 */
class DynamicNormalizer {
  private floor = 0.01;
  private peak = 0.08;

  update(raw: number, decayRate: number): number {
    const floorRise = 0.003;
    const floorFall = 0.22;
    const floorRate = raw < this.floor ? floorFall : floorRise;
    this.floor = lerp(this.floor, raw, floorRate);

    this.peak = Math.max(raw, this.peak * decayRate);
    if (this.peak < this.floor + 0.02) {
      this.peak = this.floor + 0.02;
    }

    return clamp01((raw - this.floor) / (this.peak - this.floor));
  }
  
  reset() {
    this.floor = 0.01;
    this.peak = 0.08;
  }
}

/**
 * Multi-band onset detector for improved beat detection
 * Tracks energy changes across multiple frequency bands
 */
class OnsetDetector {
  private prevEnergy: number[] = [0, 0, 0, 0];
  private fluxHistory: Float32Array[] = [
    new Float32Array(32),
    new Float32Array(32),
    new Float32Array(32),
    new Float32Array(32),
  ];
  private fluxCursor = 0;
  private fluxCount = 0;
  
  detect(bandEnergies: number[]): { flux: number; threshold: number; detected: boolean } {
    let totalFlux = 0;
    const weights = [0.45, 0.30, 0.15, 0.10]; // Emphasize bass and low-mids
    
    for (let i = 0; i < Math.min(4, bandEnergies.length); i++) {
      const flux = Math.max(0, bandEnergies[i] - this.prevEnergy[i]);
      this.fluxHistory[i][this.fluxCursor] = flux;
      totalFlux += flux * weights[i];
      this.prevEnergy[i] = bandEnergies[i];
    }
    
    this.fluxCursor = (this.fluxCursor + 1) % this.fluxHistory[0].length;
    this.fluxCount = Math.min(this.fluxCount + 1, this.fluxHistory[0].length);
    
    // Calculate adaptive threshold
    let mean = 0;
    for (let i = 0; i < this.fluxCount; i++) {
      for (let j = 0; j < 4; j++) {
        mean += this.fluxHistory[j][i] * weights[j];
      }
    }
    mean /= Math.max(1, this.fluxCount);
    
    let variance = 0;
    for (let i = 0; i < this.fluxCount; i++) {
      let weightedFlux = 0;
      for (let j = 0; j < 4; j++) {
        weightedFlux += this.fluxHistory[j][i] * weights[j];
      }
      const d = weightedFlux - mean;
      variance += d * d;
    }
    const std = Math.sqrt(variance / Math.max(1, this.fluxCount));
    
    const threshold = mean + std * 0.65 + 0.004;
    const detected = totalFlux > threshold;
    
    return { flux: totalFlux, threshold, detected };
  }
  
  reset() {
    this.prevEnergy = [0, 0, 0, 0];
    this.fluxCursor = 0;
    this.fluxCount = 0;
    for (let i = 0; i < this.fluxHistory.length; i++) {
      this.fluxHistory[i].fill(0);
    }
  }
}

/**
 * Production-quality audio processor with advanced DSP algorithms
 */
export class AudioProcessor {
  private config: AudioProcessorConfig = { ...DEFAULT_CONFIG };
  
  // Windowing for FFT
  private hannWindow: Float32Array | null = null;
  private windowedFrequency: Float32Array | null = null;
  
  // Springs for smooth visual response
  private bassSpring = new AudioSpring(0.45, 0.55);
  private midsSpring = new AudioSpring(0.4, 0.6);
  private highsSpring = new AudioSpring(0.4, 0.6);
  private trebleSpring = new AudioSpring(0.4, 0.6);
  private levelSpring = new AudioSpring(0.25, 0.7);
  
  // Envelope followers for dynamics
  private bassEnvelope = new EnvelopeFollower(0.01, 0.1);
  private midsEnvelope = new EnvelopeFollower(0.01, 0.1);
  private highsEnvelope = new EnvelopeFollower(0.01, 0.1);
  private trebleEnvelope = new EnvelopeFollower(0.01, 0.1);
  
  // Per-band dynamic normalizers
  private bassNormalizer = new DynamicNormalizer();
  private midsNormalizer = new DynamicNormalizer();
  private highsNormalizer = new DynamicNormalizer();
  private trebleNormalizer = new DynamicNormalizer();
  private energyNormalizer = new DynamicNormalizer();
  
  // Beat detection
  private onsetDetector = new OnsetDetector();
  private prevBassNorm = 0;
  private prevEnergyNorm = 0;
  private prevPeak = 0;
  private bassAttackEnv = 0;
  private bassBaseline = 0;
  private fluxHistory = new Float32Array(64);
  private fluxCursor = 0;
  private fluxCount = 0;
  
  // Timing and BPM
  private lastProcessTime = performance.now();
  private lastBeatTime = 0;
  private beatIntervals: number[] = [];
  private lastBeatIntervalMs = 500;
  private bpmEstimate = 120;
  private beatPulse = 0;
  
  // Performance optimization
  private sampleRate = 48000; // Default, updated from context
  
  public setConfig(config: any) {
    if (!config || typeof config !== 'object') return;

    this.config.springTension = clamp(config.springTension ?? this.config.springTension, 0.05, 1.5);
    this.config.springFriction = clamp(config.springFriction ?? this.config.springFriction, 0.1, 0.99);
    this.config.shapePower = clamp(config.shapePower ?? this.config.shapePower, 1.0, 4.0);
    this.config.agcDecayRate = clamp(config.agcDecayRate ?? this.config.agcDecayRate, 0.9, 0.9995);
    this.config.dspBassEnd = clamp(config.dspBassEnd ?? this.config.dspBassEnd, 1, 30);
    this.config.dspMidsEnd = clamp(config.dspMidsEnd ?? this.config.dspMidsEnd, 5, 80);
    this.config.dspHighsEnd = clamp(config.dspHighsEnd ?? this.config.dspHighsEnd, 20, 99);
    this.config.dspTransientAttack = clamp(config.dspTransientAttack ?? this.config.dspTransientAttack, 0.7, 0.99);
    
    // New production parameters
    this.config.enableWindowing = config.enableWindowing ?? this.config.enableWindowing;
    this.config.enableAWeighting = config.enableAWeighting ?? this.config.enableAWeighting;
    this.config.enablePerceptualBands = config.enablePerceptualBands ?? this.config.enablePerceptualBands;
    this.config.beatSensitivity = clamp(config.beatSensitivity ?? this.config.beatSensitivity, 0.1, 3.0);
    this.config.attackTime = clamp(config.attackTime ?? this.config.attackTime, 0.001, 0.1);
    this.config.releaseTime = clamp(config.releaseTime ?? this.config.releaseTime, 0.01, 1.0);
    this.config.enableMultiBandOnset = config.enableMultiBandOnset ?? this.config.enableMultiBandOnset;
    this.config.enableHarmonicAnalysis = config.enableHarmonicAnalysis ?? this.config.enableHarmonicAnalysis;

    // Update spring parameters
    this.bassSpring.tension = clamp(this.config.springTension + 0.08, 0.05, 1.5);
    this.midsSpring.tension = this.config.springTension;
    this.highsSpring.tension = this.config.springTension;
    this.trebleSpring.tension = this.config.springTension;

    this.bassSpring.friction = clamp(this.config.springFriction - 0.06, 0.1, 0.99);
    this.midsSpring.friction = this.config.springFriction;
    this.highsSpring.friction = this.config.springFriction;
    this.trebleSpring.friction = this.config.springFriction;
    
    // Update envelope followers
    this.bassEnvelope.setAttackTime(this.config.attackTime);
    this.bassEnvelope.setReleaseTime(this.config.releaseTime);
    this.midsEnvelope.setAttackTime(this.config.attackTime);
    this.midsEnvelope.setReleaseTime(this.config.releaseTime);
    this.highsEnvelope.setAttackTime(this.config.attackTime);
    this.highsEnvelope.setReleaseTime(this.config.releaseTime);
    this.trebleEnvelope.setAttackTime(this.config.attackTime);
    this.trebleEnvelope.setReleaseTime(this.config.releaseTime);
  }
  
  public setSampleRate(sampleRate: number) {
    this.sampleRate = sampleRate;
  }
  
  /**
   * Apply Hann window to frequency data to reduce spectral leakage
   */
  private applyWindow(frequency: Uint8Array): Float32Array {
    if (!this.hannWindow || this.hannWindow.length !== frequency.length) {
      this.hannWindow = createHannWindow(frequency.length);
      this.windowedFrequency = new Float32Array(frequency.length);
    }
    
    for (let i = 0; i < frequency.length; i++) {
      this.windowedFrequency![i] = (frequency[i] / 255.0) * this.hannWindow[i];
    }
    
    return this.windowedFrequency!;
  }

  public process(frequency: Uint8Array, waveform: Uint8Array): AudioMetrics {
    const bins = frequency.length;
    
    // Apply windowing if enabled
    let processedFreq: Float32Array | Uint8Array = frequency;
    if (this.config.enableWindowing) {
      processedFreq = this.applyWindow(frequency);
    }

    // Determine frequency bands
    let bassEnd: number, midsEnd: number, highsEnd: number, trebleEnd: number;
    
    if (this.config.enablePerceptualBands) {
      // Perceptual bands based on musical content
      bassEnd = Math.max(2, Math.floor((250 / (this.sampleRate / 2)) * bins)); // 20-250 Hz
      midsEnd = Math.max(bassEnd + 2, Math.floor((2000 / (this.sampleRate / 2)) * bins)); // 250-2000 Hz
      highsEnd = Math.max(midsEnd + 2, Math.floor((8000 / (this.sampleRate / 2)) * bins)); // 2000-8000 Hz
      trebleEnd = bins; // 8000+ Hz
    } else {
      // Legacy linear bands
      bassEnd = Math.max(2, Math.floor((this.config.dspBassEnd / 100) * bins));
      midsEnd = Math.max(bassEnd + 2, Math.floor((this.config.dspMidsEnd / 100) * bins));
      highsEnd = Math.max(midsEnd + 2, Math.floor((this.config.dspHighsEnd / 100) * bins));
      trebleEnd = bins;
    }

    let bPow = 0, mPow = 0, hPow = 0, tPow = 0, totalPow = 0, totalLinear = 0, weightedLinear = 0;
    let bCount = 0, mCount = 0, hCount = 0, tCount = 0;

    // Bin 0 is DC offset; skip for stability
    for (let i = 1; i < bins; i++) {
      const val = processedFreq instanceof Uint8Array ? processedFreq[i] / 255.0 : processedFreq[i];
      
      // Apply A-weighting if enabled
      let weight = 1.0;
      if (this.config.enableAWeighting) {
        const freq = (i * this.sampleRate) / (bins * 2);
        weight = getAWeighting(freq);
      }
      
      const weightedVal = val * weight;
      const power = weightedVal * weightedVal;
      
      totalPow += power;
      totalLinear += weightedVal;
      weightedLinear += weightedVal * (i / (bins - 1));
      
      if (i < bassEnd) {
        // Extra bass weighting for punch
        const bassWeight = lerp(1.35, 0.85, i / Math.max(1, bassEnd - 1));
        bPow += power * bassWeight;
        bCount += bassWeight;
      }
      else if (i < midsEnd) { mPow += power; mCount++; }
      else if (i < highsEnd) { hPow += power; hCount++; }
      else if (i < trebleEnd) { tPow += power; tCount++; }
    }

    // RMS calculation for each band
    const rawBass = bCount > 0 ? Math.sqrt(bPow / bCount) : 0;
    const rawMids = mCount > 0 ? Math.sqrt(mPow / mCount) : 0;
    const rawHighs = hCount > 0 ? Math.sqrt(hPow / hCount) : 0;
    const rawTreble = tCount > 0 ? Math.sqrt(tPow / tCount) : 0;
    const rawAvg = Math.sqrt(totalPow / Math.max(1, bins - 1));

    // Spectral centroid: 0=dark/warm, 1=bright/airy
    const centroidVal = totalLinear > 0 ? weightedLinear / totalLinear : 0;
    const centroidExtracted = clamp01(Math.pow(centroidVal * 1.8, 0.9));

    // Spectral texture: blend waveform roughness and upper-band activity
    let zcr = 0;
    let prevSign = waveform[0] > 128;
    for (let i = 1; i < waveform.length; i++) {
        const sign = waveform[i] > 128;
        if (sign !== prevSign) {
            zcr++;
            prevSign = sign;
        }
    }
    const zcrNorm = zcr / Math.max(1, waveform.length - 1);
    const roughness = clamp01((zcrNorm - 0.02) / 0.35);
    const spectralActivity = clamp01((rawHighs + rawTreble) * 0.8);
    const textureVal = clamp01(roughness * 0.7 + spectralActivity * 0.3);

    // Per-band AGC and normalization
    const decayRate = this.config.agcDecayRate;
    const bassNorm = this.bassNormalizer.update(rawBass, decayRate);
    const midsNorm = this.midsNormalizer.update(rawMids, decayRate);
    const highsNorm = this.highsNormalizer.update(rawHighs, decayRate);
    const trebleNorm = this.trebleNormalizer.update(rawTreble, decayRate);
    const energyNorm = this.energyNormalizer.update(rawAvg, decayRate);

    // Apply envelope followers for smooth dynamics
    const bassEnv = this.bassEnvelope.process(bassNorm);
    const midsEnv = this.midsEnvelope.process(midsNorm);
    const highsEnv = this.highsEnvelope.process(highsNorm);
    const trebleEnv = this.trebleEnvelope.process(trebleNorm);

    // Non-linear shaping for expressive visuals
    const shapePower = this.config.shapePower;
    const shape = (normalized: number) => {
      const gated = clamp01((normalized - 0.03) / 0.97);
      return Math.pow(gated, shapePower);
    };

    // Bass transient detection
    const bassTransient = Math.max(0, bassNorm - this.bassBaseline);
    this.bassAttackEnv = Math.max(bassTransient, this.bassAttackEnv * 0.84);

    const bassShapePower = Math.max(1.1, shapePower * 0.7);
    const bassGated = clamp01((bassEnv - 0.015) / 0.985);
    const bassBody = Math.pow(bassGated, bassShapePower);
    const bassPresence = Math.max(0, bassEnv - 0.2) * 0.35;
    const targetBass = clamp01(bassBody + this.bassAttackEnv * 0.7 + bassPresence);
    const targetMids = shape(midsEnv);
    const targetHighs = shape(highsEnv);
    const targetTreble = shape(trebleEnv);
    const targetEnergy = shape(energyNorm);

    // Apply Spring Physics for final organic smoothing
    const outBass = this.bassSpring.update(targetBass);
    const outMids = this.midsSpring.update(targetMids);
    const outHighs = this.highsSpring.update(targetHighs);
    const outTreble = this.trebleSpring.update(targetTreble);
    const outEnergy = this.levelSpring.update(targetEnergy);

    // Peak detection
    let p = 0;
    for (let i = 0; i < waveform.length; i++) {
      p = Math.max(p, Math.abs((waveform[i] - 128) / 128.0));
    }

    // Beat detection
    const now = performance.now();
    const deltaSeconds = clamp((now - this.lastProcessTime) / 1000, 1 / 240, 0.2);
    this.lastProcessTime = now;

    let flux: number, adaptiveFluxThreshold: number, bassHit = false;
    
    if (this.config.enableMultiBandOnset) {
      // Multi-band onset detection
      const bandEnergies = [bassNorm, midsNorm, highsNorm, trebleNorm];
      const onsetResult = this.onsetDetector.detect(bandEnergies);
      flux = onsetResult.flux * this.config.beatSensitivity;
      adaptiveFluxThreshold = onsetResult.threshold * this.config.beatSensitivity;
    } else {
      // Legacy single-band detection
      const bassFlux = Math.max(0, bassNorm - this.prevBassNorm);
      const energyFlux = Math.max(0, energyNorm - this.prevEnergyNorm);
      const peakFlux = Math.max(0, p - this.prevPeak);
      flux = (bassFlux * 0.58 + energyFlux * 0.27 + peakFlux * 0.15) * this.config.beatSensitivity;

      this.fluxHistory[this.fluxCursor] = flux;
      this.fluxCursor = (this.fluxCursor + 1) % this.fluxHistory.length;
      this.fluxCount = Math.min(this.fluxCount + 1, this.fluxHistory.length);

      let fluxMean = 0;
      for (let i = 0; i < this.fluxCount; i++) {
        fluxMean += this.fluxHistory[i];
      }
      fluxMean /= Math.max(1, this.fluxCount);

      let fluxVariance = 0;
      for (let i = 0; i < this.fluxCount; i++) {
        const d = this.fluxHistory[i] - fluxMean;
        fluxVariance += d * d;
      }
      const fluxStd = Math.sqrt(fluxVariance / Math.max(1, this.fluxCount));
      adaptiveFluxThreshold = (fluxMean + fluxStd * 0.65 + 0.004) * this.config.beatSensitivity;
    }

    this.prevBassNorm = bassNorm;
    this.prevEnergyNorm = energyNorm;
    this.prevPeak = p;
    this.bassBaseline = lerp(this.bassBaseline, bassNorm, 1 - this.config.dspTransientAttack);

    // Beat timing and BPM estimation
    const expectedPeriodMs = 60000 / clamp(this.bpmEstimate, 70, 190);
    const minBeatIntervalMs = clamp(expectedPeriodMs * 0.28, 100, 280);
    const maxBeatIntervalMs = clamp(expectedPeriodMs * 1.9, 480, 1800);
    const bassEnergyGate =
      bassNorm > Math.max(0.11, this.bassBaseline + 0.035) ||
      (energyNorm > 0.18 && p > 0.05);

    if (
      flux > adaptiveFluxThreshold &&
      bassEnergyGate &&
      now - this.lastBeatTime > minBeatIntervalMs
    ) {
      bassHit = true;
      if (this.lastBeatTime > 0) {
        const interval = now - this.lastBeatTime;
        if (interval >= minBeatIntervalMs * 0.8 && interval <= maxBeatIntervalMs) {
          this.beatIntervals.push(interval);
          this.lastBeatIntervalMs = interval;
          if (this.beatIntervals.length > 24) this.beatIntervals.shift();
        }
      }
      this.lastBeatTime = now;
      this.beatPulse = 1;

      if (this.beatIntervals.length >= 4) {
        const medianInterval = median(this.beatIntervals);
        if (medianInterval > 0) {
          let bpmCandidate = 60000 / medianInterval;
          while (bpmCandidate < this.bpmEstimate * 0.7) bpmCandidate *= 2;
          while (bpmCandidate > this.bpmEstimate * 1.45) bpmCandidate *= 0.5;
          bpmCandidate = clamp(bpmCandidate, 60, 200);
          const bpmSmoothing = this.beatIntervals.length > 10 ? 0.2 : 0.12;
          this.bpmEstimate = lerp(this.bpmEstimate, bpmCandidate, bpmSmoothing);
        }
      }
    } else {
      this.beatPulse *= Math.exp(-deltaSeconds * 6.5);
    }

    const bpmHint = clamp(this.bpmEstimate, 60, 200);

    // Phase-locked pulse for visual sync
    const beatPeriodMs = 60000 / bpmHint;
    let phasePulse = 0;
    if (this.lastBeatTime > 0 && beatPeriodMs > 0) {
      const phase = ((now - this.lastBeatTime) % beatPeriodMs) / beatPeriodMs;
      const phaseDistance = Math.min(phase, 1 - phase);
      phasePulse = Math.exp(-(phaseDistance * phaseDistance) / (2 * 0.15 * 0.15));
    }

    const pulse = clamp01(Math.max(this.beatPulse, phasePulse * 0.68, outBass * 0.72 + outEnergy * 0.45));

    const onsetRatio = flux / Math.max(0.0001, adaptiveFluxThreshold);
    const intervalFit = 1 - Math.min(1, Math.abs(this.lastBeatIntervalMs - expectedPeriodMs) / Math.max(1, expectedPeriodMs));
    const confidence = clamp01(
      (clamp01((onsetRatio - 0.65) / 0.85) * 0.58) +
      (bassEnergyGate ? 0.18 : 0) +
      (intervalFit * 0.24)
    );

    return {
      level: outEnergy,
      peak: p,
      bass: outBass,
      mids: outMids,
      highs: outHighs,
      treble: outTreble,
      energy: outEnergy,
      bassHit,
      pulse,
      bpmHint,
      beatOnset: flux,
      beatThreshold: adaptiveFluxThreshold,
      beatIntervalMs: this.lastBeatIntervalMs,
      beatConfidence: confidence,
      centroid: centroidExtracted,
      texture: textureVal
    };
  }
  
  /**
   * Reset all internal state (useful when switching audio sources)
   */
  public reset() {
    this.bassSpring.reset();
    this.midsSpring.reset();
    this.highsSpring.reset();
    this.trebleSpring.reset();
    this.levelSpring.reset();
    
    this.bassEnvelope.reset();
    this.midsEnvelope.reset();
    this.highsEnvelope.reset();
    this.trebleEnvelope.reset();
    
    this.bassNormalizer.reset();
    this.midsNormalizer.reset();
    this.highsNormalizer.reset();
    this.trebleNormalizer.reset();
    this.energyNormalizer.reset();
    
    this.onsetDetector.reset();
    
    this.prevBassNorm = 0;
    this.prevEnergyNorm = 0;
    this.prevPeak = 0;
    this.bassAttackEnv = 0;
    this.bassBaseline = 0;
    this.fluxHistory.fill(0);
    this.fluxCursor = 0;
    this.fluxCount = 0;
    
    this.lastProcessTime = performance.now();
    this.lastBeatTime = 0;
    this.beatIntervals = [];
    this.lastBeatIntervalMs = 500;
    this.bpmEstimate = 120;
    this.beatPulse = 0;
  }
}
