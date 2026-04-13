import type { AudioFrame } from '../types';
import type { DjState } from '../djState';

export type VisualSettings = {
  gridWidthRatio: number;
  yOffsetRatio: number;
  dotSizeBase: number;
  amplitudeRatio: number;
  rowSpacingRatio: number;
  colorMode: 'white' | 'neon' | 'rainbow' | 'custom';
  customColor: string;
  backgroundColor: string;
  bassThreshold: number;
  midThreshold: number;
  highThreshold: number;
  customText: string;
  audioSmoothing: number;
  movementStyle: 'ripple' | 'wave' | 'matrix' | 'static' | 'glitch';
  globalSpeed: number;
  bassPulseImpact: number;
  baseBrightness: number;
  glitchIntensity: number;
  rippleDamping: number;
  rippleSpeed: number;
  colorWaveDepth: number;
  breathAmplitude: number;
  scatterMultiplier: number;
};

export type VisualOptions = {
  sensitivity: number;
  djState: DjState;
  settings: VisualSettings;
};

// ULTRA FLUID OPTIMIZATION: 
// 1. Removed dynamic memory allocation (no DOM creation in loop).
// 2. Switched from HSL string parsing to ultra-fast globalAlpha.
// 3. Moderate density for perfect 60fps balance.
const BAND_COUNT = 60;   // Columns
const HISTORY_SIZE = 40; // Rows

let internalTime = 0;

export function drawVisualizer(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, frame: AudioFrame, options: VisualOptions) {
  const { width, height } = canvas;
  const { sensitivity, djState, settings } = options;

  const playSpeed = djState.deckA.isPlaying ? 1 : 0.4;
  const bassImpact = Math.pow(frame.bass, 2) * sensitivity;
  
  // Realtime active progression for the flowing ripples
  internalTime += 0.05 * playSpeed * settings.globalSpeed;

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = settings.backgroundColor || '#000000';
  ctx.fillRect(0, 0, width, height);

  const fxDepth = djState.globalFx.fxOn ? djState.globalFx.fxLevelDepth : 0;

  ctx.save();
  // Global bounce and drift removed to strictly focus on individual character manipulation.

  // Settings parsing - Floor the font size for Crispness
  const dynamicFontScale = Math.min(width / BAND_COUNT, height / HISTORY_SIZE) * (settings.dotSizeBase * 0.4);
  const baseFontSize = Math.floor(Math.max(8, dynamicFontScale + fxDepth * 5));

  ctx.font = `bold ${baseFontSize}px "Courier New", Courier, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const gridWidth = width * settings.gridWidthRatio;
  // Increase vertical space on bass just slightly so the text "breathes" vertically
  // Reduced to 0.01 to minimize the extreme pulsing effect
  const gridHeight = height * (0.6 + settings.rowSpacingRatio * 15) * (1 + bassImpact * settings.bassPulseImpact); 

  const startX = (width - gridWidth) / 2;
  const startY = height * settings.yOffsetRatio - gridHeight / 2;
  
  const colSpacing = gridWidth / BAND_COUNT;
  const rowSpacing = gridHeight / HISTORY_SIZE;
  
  const xBias = (djState.mixerA.crossfader - 0.5) * width * 0.3;
  const isWhiteMode = settings.colorMode === 'white' && Math.abs(djState.mixerA.colorFx - 0.5) < 0.05;
  const isCustomMode = settings.colorMode === 'custom' && Math.abs(djState.mixerA.colorFx - 0.5) < 0.05;

  let charIndex = 0;
  
  // CACHE TEXT TO AVOID REGEX EVERY LOOP AND STRING PARSING
  const sourceStr = settings.customText.replace(/\\s+/g, '') || '01';

  // PRE-CALCULATE TRIGONOMETRY ARRAYS (Prevents thousands of slow Math.sin calls per frame)
  const precalcSinX = new Float32Array(BAND_COUNT);
  const precalcCosX = new Float32Array(BAND_COUNT);
  const precalcSinDepthX = new Float32Array(BAND_COUNT);
  for (let x = 0; x < BAND_COUNT; x++) {
     precalcSinX[x] = Math.sin(x * 0.2 + internalTime);
     precalcCosX[x] = Math.cos(x * 0.4 - internalTime * 0.8);
     precalcSinDepthX[x] = Math.sin(x + internalTime * 5); // Base for depth fx
  }

  const precalcCosZ = new Float32Array(HISTORY_SIZE);
  const precalcSinZ = new Float32Array(HISTORY_SIZE);
  const precalcDepthZ = new Float32Array(HISTORY_SIZE);
  
  // PRE-CALCULATE CONSTANTS THAT DON'T CHANGE PER FRAME
  const dists = new Float32Array(BAND_COUNT);
  const eqScales = new Float32Array(BAND_COUNT);
  for (let x = 0; x < BAND_COUNT; x++) {
     dists[x] = Math.abs((x - BAND_COUNT / 2) / (BAND_COUNT / 2));
     if (x < BAND_COUNT * 0.2) eqScales[x] = djState.mixerA.eqLow * 2;
     else if (x < BAND_COUNT * 0.6) eqScales[x] = djState.mixerA.eqMid * 2;
     else eqScales[x] = djState.mixerA.eqHi * 2;
  }

  for (let z = 0; z < HISTORY_SIZE; z++) {
     precalcCosZ[z] = Math.cos(z * 0.3 - internalTime * 0.5);
     precalcSinZ[z] = Math.sin(z * 0.2 + internalTime);
     precalcDepthZ[z] = z; // Adding z to depth later
  }
  
  // PRE-CALCULATE RADIAL GRID (To replace Waterfall)
  // We calculate distance from the true center of the screen
  const movementStyle = settings.movementStyle || 'ripple';
  const radialDist = new Float32Array(BAND_COUNT * HISTORY_SIZE);
  const radialRipples = new Float32Array(BAND_COUNT * HISTORY_SIZE);
  for (let z = 0; z < HISTORY_SIZE; z++) {
    for (let x = 0; x < BAND_COUNT; x++) {
      const idx = z * BAND_COUNT + x;
      // Center coordinates
      const cx = x - (BAND_COUNT / 2);
      const cz = z - (HISTORY_SIZE / 2);
      
      let dist = 0;
      let ripple = 0;

      if (movementStyle === 'wave') {
          // Linear bottom-to-top wave
          dist = Math.abs(cz); // distance from center line horizontally
          ripple = Math.sin((HISTORY_SIZE - z) * settings.rippleDamping - internalTime * settings.rippleSpeed) * 0.5 + 0.5;
      } else if (movementStyle === 'matrix') {
          // Top-to-bottom rain
          dist = z; // mapping frequency mostly back to front
          ripple = Math.sin(z * settings.rippleDamping + x * 0.2 - internalTime * (settings.rippleSpeed * 1.4)) * 0.5 + 0.5;
      } else if (movementStyle === 'static') {
          // No movement, just frequency
          dist = Math.sqrt(cx * cx + cz * cz);
          ripple = 0.5; // neutral carrier wave
      } else if (movementStyle === 'glitch') {
          dist = (Math.sin(cx * x + cz * z) * 10 + 10);
          ripple = Math.random() > 0.9 ? 1.0 : 0.2;
      } else { // 'ripple'
          // Normalized distance from center
          dist = Math.sqrt(cx * cx + cz * cz);
          // Ripple flows OUTWARD from the center, creating a pulse/shockwave effect
          ripple = Math.sin(dist * settings.rippleDamping - internalTime * settings.rippleSpeed) * 0.5 + 0.5;
      }

      radialDist[idx] = dist;
      radialRipples[idx] = ripple;
    }
  }
  
  // STATE CACHING FOR CANVAS API (Prevents massive CPU stalls)
  let lastAlpha = -1;
  let lastFillStyle = '';

  const freqLen = frame.frequency.length;
  const baseBass = frame.bass;
  const pulseStrength = frame.pulse;
  const sensitivityPlayScale = playSpeed * sensitivity;
  const sourceLen = sourceStr.length;
  const maxDist = Math.max(BAND_COUNT, HISTORY_SIZE) / 2;
  const breathOffset = Math.sin(internalTime * 0.5) * settings.breathAmplitude;
  const freqMapMultiplier = freqLen * 0.4;
  // Reduced global baseline bass lift from 0.3 to 0.05 to minimize screen pulsing forward
  const baseBassRatio = baseBass * settings.baseBrightness;

  // PRE-CALCULATE ZONE POWER FOR THE FRAME
  const bassPowerBase = (baseBass * baseBass * 1.5 + pulseStrength * 0.5) * sensitivity;
  const midsPowerBase = (frame.mids * frame.mids) * 2.0 * sensitivity;
  const highsPowerBase = (frame.highs * frame.highs) * 2.0 * sensitivity;
  const bassLocalDominance = Math.max(0, baseBass - settings.bassThreshold);
  const midsLocalDominance = Math.max(0, frame.mids - settings.midThreshold);
  const highsLocalDominance = Math.max(0, frame.highs - settings.highThreshold);
  const bassBeatHitRaw = bassLocalDominance > 0.1 || pulseStrength > (settings.bassThreshold + 0.4);
  const midsBeatHitRaw = midsLocalDominance > 0.1;
  const highsBeatHitRaw = highsLocalDominance > 0.1;

  // Set white mode style exactly ONCE if we are in white mode
  if (isWhiteMode) {
      ctx.fillStyle = '#FFFFFF';
      lastFillStyle = '#FFFFFF';
  } else if (isCustomMode) {
      const customCol = settings.customColor || '#FFFFFF';
      ctx.fillStyle = customCol;
      lastFillStyle = customCol;
  }

  for (let z = 0; z < HISTORY_SIZE; z++) {
    const pyBase = startY + z * rowSpacing;
    const cacheCosZ = precalcCosZ[z];
    const cacheSinZ = precalcSinZ[z];
    const cacheDepthZ = precalcDepthZ[z];

    for (let x = 0; x < BAND_COUNT; x++) {
      const idx = z * BAND_COUNT + x;
      // REALTIME INSTANTANEOUS EVALUATION
      // Radial Pulse/Shockwave movement
      
      const distToCenter = radialDist[idx];
      
      // indexRatio maps the distance to a frequency band. 
      // Closer to center = low frequencies (bass). Edges = high frequencies.
      const indexRatioRaw = (distToCenter / maxDist) + breathOffset;
      const indexRatio = indexRatioRaw < 0 ? 0 : (indexRatioRaw > 1 ? 1 : indexRatioRaw);
      
      // Math.pow(x, 1.5) logic optimized as x * sqrt(x)
      const bandIndex = Math.floor((indexRatio * Math.sqrt(indexRatio)) * freqMapMultiplier);
      const rawAudio = frame.frequency[bandIndex] / 255;
      
      // Carrier wave: creates a flowing ripple structure projecting OUTWARD
      const val = rawAudio * ((1 - settings.colorWaveDepth) + radialRipples[idx] * settings.colorWaveDepth) + baseBassRatio;
      
      const eqScale = eqScales[x];
      const boostedRaw = val * eqScale * sensitivityPlayScale;
      const boosted = boostedRaw > 1 ? 1 : boostedRaw;
      
      // Select the character from the block of text
      let char = sourceStr[charIndex % sourceLen];
      charIndex++;

      // KUNCI GERAKAN BUKAN HANYA BASS:
      let localDominance = 0;
      let isBeatHit = false;
      let movementPowerRaw = 0;

      if (indexRatio < 0.3) {
        // BASS ZONE
        localDominance = bassLocalDominance;
        isBeatHit = bassBeatHitRaw && boosted > settings.bassThreshold;
        movementPowerRaw = bassPowerBase * eqScale;
      } else if (indexRatio < 0.7) {
        // MID ZONE
        localDominance = midsLocalDominance;
        isBeatHit = midsBeatHitRaw && boosted > settings.midThreshold;
        movementPowerRaw = midsPowerBase * eqScale;
      } else {
        // HIGH ZONE
        localDominance = highsLocalDominance;
        isBeatHit = highsBeatHitRaw && boosted > settings.highThreshold;
        movementPowerRaw = highsPowerBase * eqScale;
      }

      const movementPower = movementPowerRaw > 2 ? 2 : movementPowerRaw;

      // Glitch effect: shift the character cyclically on local hits
      if (isBeatHit) {
         const shift = Math.floor(localDominance * settings.glitchIntensity);
         char = sourceStr[(charIndex + shift) % sourceLen];
      }

      // Only scatter points that are visually "lit up" by their respective bands
      const scatterIntensity = isBeatHit ? (movementPower * settings.scatterMultiplier * settings.amplitudeRatio) : 0;
      
      const scatterX = scatterIntensity * (precalcSinX[x] + cacheCosZ);
      const scatterY = scatterIntensity * (precalcCosX[x] + cacheSinZ);
      
      const fxDrift = Math.sin(precalcSinDepthX[x] + cacheDepthZ) * 3 * fxDepth;

      const px = startX + x * colSpacing + xBias + scatterX + fxDrift;
      const py = pyBase + scatterY + fxDrift;
      
      // FLUID OPTIMIZATION: Bypassing HSL string parsing entirely. 
      const rawBrightness = 0.05 + (boosted * 1.5 > 0.95 ? 0.95 : boosted * 1.5);
      
      // Quantize brightness globally: lower fidelity = fewer state changes and less CPU lag
      const alpha = Math.round(rawBrightness * 10) / 10;
      
      // 0.08 cutoff ensures invisible and near-invisible text is skipped, saving tons of draw calls
      if (alpha > 0.08) {
          if (lastAlpha !== alpha) {
              ctx.globalAlpha = alpha;
              lastAlpha = alpha;
          }

          if (!isWhiteMode && !isCustomMode) {
             const hue = settings.colorMode === 'rainbow' 
                   ? (x / BAND_COUNT * 360) + (internalTime * 40) + (z * 5)
                   : djState.mixerA.colorFx * 360 + (z * 2);
                   
             const colorStr = `hsl(${Math.floor(hue / 10) * 10}, 100%, 50%)`;
             if (lastFillStyle !== colorStr) {
                 ctx.fillStyle = colorStr;
                 lastFillStyle = colorStr;
             }
          }

          ctx.fillText(char, px, py);
      }
    }
  }

  // Restore opacity for next frame
  ctx.globalAlpha = 1.0;
  ctx.restore();
}
