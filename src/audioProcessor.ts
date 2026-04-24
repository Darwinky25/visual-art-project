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
 * Spring-based smoothing removes the "linear robotic" feel.
 * It provides organic acceleration and bouncy deceleration.
 */
class AudioSpring {
  value = 0;
  velocity = 0;
  // tension: determines speed. friction: dampens wobbles
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
}

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
}

export class AudioProcessor {
  // Configurable logic variables
  private config: AudioProcessorConfig = { ...DEFAULT_CONFIG };

  // Replace linear LERP with Physics Springs
  private bassSpring = new AudioSpring(0.3, 0.65);
  private midsSpring = new AudioSpring(0.3, 0.65);
  private highsSpring = new AudioSpring(0.3, 0.65);
  private trebleSpring = new AudioSpring(0.3, 0.65);
  private levelSpring = new AudioSpring(0.15, 0.8); // Energy level should "float" smoothly

  // Per-band dynamic normalizers for robust AGC under different material/loudness.
  private bassNormalizer = new DynamicNormalizer();
  private midsNormalizer = new DynamicNormalizer();
  private highsNormalizer = new DynamicNormalizer();
  private trebleNormalizer = new DynamicNormalizer();
  private energyNormalizer = new DynamicNormalizer();

  private prevBassNorm = 0;
  private prevEnergyNorm = 0;
  private prevPeak = 0;
  private bassAttackEnv = 0;
  private bassBaseline = 0;
  private fluxHistory = new Float32Array(64);
  private fluxCursor = 0;
  private fluxCount = 0;

  private lastProcessTime = performance.now();
  private lastBeatTime = 0;
  private beatIntervals: number[] = [];
  private lastBeatIntervalMs = 500;
  private bpmEstimate = 120;
  private beatPulse = 0;

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

    this.bassSpring.tension = clamp(this.config.springTension + 0.08, 0.05, 1.5);
    this.midsSpring.tension = this.config.springTension;
    this.highsSpring.tension = this.config.springTension;
    this.trebleSpring.tension = this.config.springTension;

    this.bassSpring.friction = clamp(this.config.springFriction - 0.06, 0.1, 0.99);
    this.midsSpring.friction = this.config.springFriction;
    this.highsSpring.friction = this.config.springFriction;
    this.trebleSpring.friction = this.config.springFriction;
  }

  public process(frequency: Uint8Array, waveform: Uint8Array): AudioMetrics {
    const bins = frequency.length;

    const bassEnd = Math.max(2, Math.floor((this.config.dspBassEnd / 100) * bins));
    const midsEnd = Math.max(bassEnd + 2, Math.floor((this.config.dspMidsEnd / 100) * bins));
    const highsEnd = Math.max(midsEnd + 2, Math.floor((this.config.dspHighsEnd / 100) * bins));
    const trebleEnd = Math.max(highsEnd + 1, bins);

    let bPow = 0, mPow = 0, hPow = 0, tPow = 0, totalPow = 0, totalLinear = 0, weightedLinear = 0;
    let bCount = 0, mCount = 0, hCount = 0, tCount = 0;

    // Bin 0 is DC offset; skip for stability.
    for (let i = 1; i < bins; i++) {
      const val = frequency[i] / 255.0;
      const power = val * val;
      totalPow += power;
      totalLinear += val;
      weightedLinear += val * (i / (bins - 1));
      
      if (i < bassEnd) {
        const bassWeight = lerp(1.35, 0.85, i / Math.max(1, bassEnd - 1));
        bPow += power * bassWeight;
        bCount += bassWeight;
      }
      else if (i < midsEnd) { mPow += power; mCount++; }
      else if (i < highsEnd) { hPow += power; hCount++; }
      else if (i < trebleEnd) { tPow += power; tCount++; }
    }

    const rawBass = bCount > 0 ? Math.sqrt(bPow / bCount) : 0;
    const rawMids = mCount > 0 ? Math.sqrt(mPow / mCount) : 0;
    const rawHighs = hCount > 0 ? Math.sqrt(hPow / hCount) : 0;
    const rawTreble = tCount > 0 ? Math.sqrt(tPow / tCount) : 0;
    const rawAvg = Math.sqrt(totalPow / Math.max(1, bins - 1));

    // Spectral centroid: 0=dark/warm, 1=bright/airy.
    const centroidVal = totalLinear > 0 ? weightedLinear / totalLinear : 0;
    const centroidExtracted = clamp01(Math.pow(centroidVal * 1.8, 0.9));

    // Spectral texture: blend waveform roughness and upper-band activity.
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

    // Per-band AGC and normalization.
    const decayRate = this.config.agcDecayRate;
    const bassNorm = this.bassNormalizer.update(rawBass, decayRate);
    const midsNorm = this.midsNormalizer.update(rawMids, decayRate);
    const highsNorm = this.highsNormalizer.update(rawHighs, decayRate);
    const trebleNorm = this.trebleNormalizer.update(rawTreble, decayRate);
    const energyNorm = this.energyNormalizer.update(rawAvg, decayRate);

    // Non-linear shaping for expressive visuals while preserving low-level detail.
    const shapePower = this.config.shapePower;
    const shape = (normalized: number) => {
      const gated = clamp01((normalized - 0.03) / 0.97);
      return Math.pow(gated, shapePower);
    };

    const bassTransient = Math.max(0, bassNorm - this.bassBaseline);
    this.bassAttackEnv = Math.max(bassTransient, this.bassAttackEnv * 0.84);

    const bassShapePower = Math.max(1.1, shapePower * 0.7);
    const bassGated = clamp01((bassNorm - 0.015) / 0.985);
    const bassBody = Math.pow(bassGated, bassShapePower);
    const bassPresence = Math.max(0, bassNorm - 0.2) * 0.35;
    const targetBass = clamp01(bassBody + this.bassAttackEnv * 0.7 + bassPresence);
    const targetMids = shape(midsNorm);
    const targetHighs = shape(highsNorm);
    const targetTreble = shape(trebleNorm);
    const targetEnergy = shape(energyNorm);

    // Apply Spring Physics for final organic smoothing
    const outBass = this.bassSpring.update(targetBass);
    const outMids = this.midsSpring.update(targetMids);
    const outHighs = this.highsSpring.update(targetHighs);
    const outTreble = this.trebleSpring.update(targetTreble);
    const outEnergy = this.levelSpring.update(targetEnergy);

    let p = 0;
    for (let i = 0; i < waveform.length; i++) {
      p = Math.max(p, Math.abs((waveform[i] - 128) / 128.0));
    }

    // Robust beat detection (adaptive flux threshold + interval sanity).
    const now = performance.now();
    const deltaSeconds = clamp((now - this.lastProcessTime) / 1000, 1 / 240, 0.2);
    this.lastProcessTime = now;

    const attack = this.config.dspTransientAttack;
    const bassFlux = Math.max(0, bassNorm - this.prevBassNorm);
    const energyFlux = Math.max(0, energyNorm - this.prevEnergyNorm);
    const peakFlux = Math.max(0, p - this.prevPeak);
    const flux = (bassFlux * 0.58) + (energyFlux * 0.27) + (peakFlux * 0.15);

    this.prevBassNorm = bassNorm;
    this.prevEnergyNorm = energyNorm;
    this.prevPeak = p;
    this.bassBaseline = lerp(this.bassBaseline, bassNorm, 1 - attack);

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

    const expectedPeriodMs = 60000 / clamp(this.bpmEstimate, 70, 190);
    const minBeatIntervalMs = clamp(expectedPeriodMs * 0.38, 140, 320);
    const maxBeatIntervalMs = clamp(expectedPeriodMs * 1.9, 480, 1800);
    const adaptiveFluxThreshold = fluxMean + fluxStd * 0.95 + 0.006;
    const bassEnergyGate =
      bassNorm > Math.max(0.11, this.bassBaseline + 0.035) ||
      (energyNorm > 0.18 && peakFlux > 0.05);

    let bassHit = false;
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
      this.beatPulse *= Math.exp(-deltaSeconds * 10.5);
    }

    const bpmHint = clamp(this.bpmEstimate, 60, 200);

    const beatPeriodMs = 60000 / bpmHint;
    let phasePulse = 0;
    if (this.lastBeatTime > 0 && beatPeriodMs > 0) {
      const phase = ((now - this.lastBeatTime) % beatPeriodMs) / beatPeriodMs;
      const phaseDistance = Math.min(phase, 1 - phase);
      phasePulse = Math.exp(-(phaseDistance * phaseDistance) / (2 * 0.09 * 0.09));
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
}
