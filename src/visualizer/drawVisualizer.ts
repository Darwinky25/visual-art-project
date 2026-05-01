import type { AudioFrame } from '../types';
import type { DjState } from '../djState';
import { noiseInstance } from '../utils/simplex';

export type VisualSettings = {
  mediaAudioImpact?: number;
  mediaInvertDrop?: boolean;
  visualizationMode: 'audio2d' | 'webcamAscii' | 'kinect3d' | 'tiles' | 'fractal' | 'geometry';
  gridWidthRatio: number;
  yOffsetRatio: number;
  dotSizeBase: number;
  amplitudeRatio: number;
  rowSpacingRatio: number;
  colorMode: 'white' | 'neon' | 'rainbow' | 'thermal' | 'custom';
  customColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  bassThreshold: number;
  midThreshold: number;
  highThreshold: number;
  customText: string;
  characterDensity: number;
  characterOpacity: number;
  animationMotionWeight: number;
  animationFlowWeight: number;
  animationBeatThreshold: number;
  animationBeatResponse: number;
  animationBeatBassInfluence: number;
  animationBeatWaveBaseSpeed: number;
  animationBeatSpatialFreq: number;
  animationCenterBias: number;
  animationBeatLiftStrength: number;
  animationBeatSwayStrength: number;
  animationScatterClampBase: number;
  animationScatterClampBoost: number;
  animationTerrainLift: number;
  animationTerrainBeatStrength: number;
  animationScaleResponse: number;
  audioSmoothing: number;
  movementStyle: 'ripple' | 'wave' | 'matrix' | 'static' | 'glitch' | 'orbit' | 'tunnel' | 'pulse';
  /**
   * Number of mirror axes used by the kaleidoscopic fold. 1 disables the fold
   * (raw polar), 8 is the classic mandala. Typical range: 1..12.
   */
  symmetryFolds?: number;
  globalSpeed: number;
  bassPulseImpact: number;
  baseBrightness: number;
  glitchIntensity: number;
  rippleDamping: number;
  rippleSpeed: number;
  colorWaveDepth: number;
  breathAmplitude: number;
  scatterMultiplier: number;
  asciiResolution: number;
  asciiCharSet: 'standard' | 'dense' | 'binary' | 'matrix';
  asciiGlitch: number;
  asciiAudioImpact: number;
  asciiInvert: boolean;
  
  // NEW KINECT SETTINGS
  kinectDepthMin: number;
  kinectDepthMax: number;
  kinectScalePush: number;
  kinectYPull: number;
  kinectFluidSpeed: number;
  kinectGlow: number;
  kinectDistortion: number;
  kinectMirror: boolean;
  
  // NEW KINECT SIZE/POSITION SETTINGS
  kinectOffsetX: number;
  kinectOffsetY: number;
  kinectZoom: number;
  kinectCropLeft: number;
  kinectCropRight: number;
  kinectCropTop: number;
  kinectCropBottom: number;
  
  // NEW KINECT PARALLAX/SWAY SETTINGS
  kinectSwayAmplitude: number;
  kinectSwaySpeed: number;

  // NEW KINECT CYBERPUNK EFFECTS
  kinectLightTrails: boolean;
  kinectZAxisColor: boolean;
  kinectShockwave: boolean;
  kinectWireframe: boolean;
  kinectSurveillance: boolean;
  kinectSurveillanceColor: string;
  kinectSurveillanceOpacity: number;
  kinectSurveillanceSize: number;
  
  // MESH / RENDER RESOLUTION
  kinectResolution: number;
  
  // ALGORITHM LOGIC EXPOSURE
  noiseScaleBase: number;
  noiseTimeMult: number;
  flowPowerScale: number;
  scatterIntensityScale: number;
  glitchChance: number;
  glitchChars: string;
  zHueBase: number;
  zHueShift: number;
  zLumBase: number;
  zLumShift: number;
  bassPowerMul: number;
  midsPowerMul: number;
  highsPowerMul: number;
  // AUDIO PHYSIC LOGIC
  springTension?: number;
  springFriction?: number;
  shapePower?: number;
  agcDecayRate?: number;

  // NEW DYNAMIC ENGINE TUNING
  audioTimeWarpMultiplier: number;
  terrainMultiplier: number;
  swayMultiplier: number;
  skewMultiplier: number;

  // DEEP TRIG TUNING (Zero Hardcodes)
  trigSinXFreq: number;
  trigCosXFreq: number;
  trigCosXTime: number;
  trigSinDepthXTime: number;
  trigCosZFreq: number;
  trigCosZTime: number;
  trigSinZFreq: number;

  // DSP & ANALYZER TUNING (Zero Hardcodes)
  dspFftSize: number;
  dspMinDecibels: number;
  dspMaxDecibels: number;
  dspBassEnd: number;
  dspMidsEnd: number;
  dspHighsEnd: number;
  dspTransientAttack: number;

  // PROCEDURAL TILES STYLE
  tilesSize: number;
  tilesComplexity: number;
  tilesRotationSpeed: number;
  tilesAudioScaling: number;
  tilesBassAmount: number;
  tilesMidsAmount: number;
  tilesHighsAmount: number;
  tilesColorVariation: number;

  // FRACTAL RECURSION STYLE
  fractalDepth: number;
  fractalRotationSpeed: number;
  fractalZoomScale: number;
  fractalLineWidth: number;
  fractalAudioDriveAmount: number;
  fractalBassDepth: number;
  fractalMidsRotation: number;
  fractalHighsZoom: number;
  fractalInnerScale: number;

  // GEOMETRY LINES STYLE
  geometryLineWidth: number;
  geometryDensity: number;
  geometryRotationSpeed: number;
  geometryAudioScaling: number;
  geometryBassLines: number;
  geometryMidsIntersection: number;
  geometryHighsPattern: number;
  geometryCentroidInfluence: number;
  geometryComplexity: number;

  // KINECT SERVER CONFIGURATION (ALL TWEAKABLE - ZERO HARDCODES)
  kinectServerDownsamplingFactor: number; // 1=full 640x480, 2=320x240, 4=160x120
  kinectServerNormalizationDivisor: number; // Convert 11-bit to 8-bit: value / divisor
  kinectServerFPS: number; // Frames per second from server
  kinectServerRawBitDepth: number; // Kinect V1 is 11-bit (0-2048)
  kinectServerDepthMinRaw: number; // Minimum raw depth value before clipping
  kinectServerDepthMaxRaw: number; // Maximum raw depth value
  kinectServerTiltMin: number; // Motor minimum angle
  kinectServerTiltMax: number; // Motor maximum angle
  kinectServerLEDEnabled: boolean; // Enable LED control
  kinectServerLEDColor: string; // LED color: off, red, green, yellow, blink_red, blink_green, blink_yellow
};

export type VisualOptions = {
  sensitivity: number;
  djState: DjState;
  settings: VisualSettings;
  kinectDepthFrame?: Uint8Array | null;
    kinectDepthSize?: {
        width: number;
        height: number;
    };
};

// ULTRA FLUID OPTIMIZATION: 
// 1. Removed dynamic memory allocation (no DOM creation in loop).
// 2. Switched from HSL string parsing to ultra-fast globalAlpha.
// 3. Moderate density for perfect 60fps balance.
let BAND_COUNT = 60;   // Columns
let HISTORY_SIZE = 40; // Rows

let internalTime = 0;

// PRE-ALLOCATED MEMORY BUFFERS (Zero-GC Optimization)
let precalcSinX = new Float32Array(BAND_COUNT);
let precalcCosX = new Float32Array(BAND_COUNT);
let precalcSinDepthX = new Float32Array(BAND_COUNT);
let precalcCosZ = new Float32Array(HISTORY_SIZE);
let precalcSinZ = new Float32Array(HISTORY_SIZE);
let precalcDepthZ = new Float32Array(HISTORY_SIZE);
let dists = new Float32Array(BAND_COUNT);
let eqScales = new Float32Array(BAND_COUNT);
let radialDist = new Float32Array(BAND_COUNT * HISTORY_SIZE);
let radialRipples = new Float32Array(BAND_COUNT * HISTORY_SIZE);
// SYMMETRIC POLAR BUFFERS — every effect is driven from these so the image is
// guaranteed to be 8-fold (kaleidoscopic) symmetric regardless of world (x,y).
let polarFolded = new Float32Array(BAND_COUNT * HISTORY_SIZE);   // folded angle in [0, segA/2]
let polarUX = new Float32Array(BAND_COUNT * HISTORY_SIZE);       // unit radial vector X
let polarUY = new Float32Array(BAND_COUNT * HISTORY_SIZE);       // unit radial vector Y

// EFEK "DELAYED MOTION" ARRAY GLOBAL
// Menyimpan status 'closeness' masing-masing partikel antar-frame 
// agar membentuk jejak bayangan air/fluid trail yang bergerak lelet saat kinect lewat
let fluidGrid = new Float32Array(BAND_COUNT * HISTORY_SIZE);
let cachedSourceInput = '';
let cachedSourceStr = '01';

export function drawVisualizer(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, frame: AudioFrame, options: VisualOptions) {
  const { width, height } = canvas;
  const { sensitivity, djState, settings } = options;

  // Dynamically update mesh resolution and character density if changed in UI
  const targetResolution = settings.kinectResolution !== undefined ? settings.kinectResolution : 1;
  const targetCharacterDensity = settings.characterDensity !== undefined ? settings.characterDensity : 1;
  const clampedCharacterDensity = Math.max(0.5, Math.min(2.0, targetCharacterDensity));
    const targetBandCount = Math.max(20, Math.min(140, Math.floor(60 * targetResolution * clampedCharacterDensity)));
    const targetHistorySize = Math.max(12, Math.min(96, Math.floor(40 * targetResolution * clampedCharacterDensity)));
  
  if (BAND_COUNT !== targetBandCount || HISTORY_SIZE !== targetHistorySize) {
      BAND_COUNT = targetBandCount;
      HISTORY_SIZE = targetHistorySize;
      
      // Re-allocate buffers solely on resolution change
      fluidGrid = new Float32Array(BAND_COUNT * HISTORY_SIZE);
      precalcSinX = new Float32Array(BAND_COUNT);
      precalcCosX = new Float32Array(BAND_COUNT);
      precalcSinDepthX = new Float32Array(BAND_COUNT);
      precalcCosZ = new Float32Array(HISTORY_SIZE);
      precalcSinZ = new Float32Array(HISTORY_SIZE);
      precalcDepthZ = new Float32Array(HISTORY_SIZE);
      dists = new Float32Array(BAND_COUNT);
      eqScales = new Float32Array(BAND_COUNT);
      radialDist = new Float32Array(BAND_COUNT * HISTORY_SIZE);
      radialRipples = new Float32Array(BAND_COUNT * HISTORY_SIZE);
      polarFolded = new Float32Array(BAND_COUNT * HISTORY_SIZE);
      polarUX = new Float32Array(BAND_COUNT * HISTORY_SIZE);
      polarUY = new Float32Array(BAND_COUNT * HISTORY_SIZE);
  }

  const playSpeed = djState.deckA.isPlaying ? 1 : 0.4;
  const bassImpact = Math.pow(frame.bass, 2) * sensitivity;
  
  // Waktu berjalan natural, tetapi bisa di-warp oleh Audio Energy jika audioTimeWarpMultiplier > 0
  const audioTimeWarpMulti = settings.audioTimeWarpMultiplier !== undefined ? settings.audioTimeWarpMultiplier : 0;
  const audioTimeWarp = (frame.energy * 0.1) * sensitivity * audioTimeWarpMulti;
  internalTime += (0.05 + audioTimeWarp) * playSpeed * settings.globalSpeed;

  ctx.globalCompositeOperation = 'source-over';
  
  // CYBERPUNK 1: EFEK MOTION BLUR / JEJAK CAHAYA (Light Trails)
  const isTrails = settings.kinectLightTrails !== undefined ? settings.kinectLightTrails : true;
  if (options.kinectDepthFrame && isTrails) {
    ctx.globalAlpha = 0.4; // Ditingkatkan dari 0.15 ke 0.4 biar nggak terlalu slow-mo / numpuk kelamaan
  } else {
    ctx.globalAlpha = 1.0;
  }

  const backgroundOpacity = Math.max(0, Math.min(1, settings.backgroundOpacity ?? 1));
  const priorAlpha = ctx.globalAlpha;
  ctx.globalAlpha = priorAlpha * backgroundOpacity;
  ctx.fillStyle = settings.backgroundColor || '#000000';
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = priorAlpha;

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
    if (settings.customText !== cachedSourceInput) {
        cachedSourceInput = settings.customText;
        cachedSourceStr = settings.customText.replace(/\s+/g, '') || '01';
    }
    const sourceStr = cachedSourceStr;

  // PRE-CALCULATE TRIGONOMETRY ARRAYS USING GLOBAL BUFFERS
  // (Prevents allocating 5000+ Float32 items per frame)
  const txSinXFreq = settings.trigSinXFreq ?? 0.2;
  const txCosXFreq = settings.trigCosXFreq ?? 0.4;
  const txCosXTime = settings.trigCosXTime ?? 0.8;
  const txSinDepthXTime = settings.trigSinDepthXTime ?? 5.0;
  for (let x = 0; x < BAND_COUNT; x++) {
     precalcSinX[x] = Math.sin(x * txSinXFreq + internalTime);
     precalcCosX[x] = Math.cos(x * txCosXFreq - internalTime * txCosXTime);
     precalcSinDepthX[x] = Math.sin(x + internalTime * txSinDepthXTime); // Base for depth fx
  }

  for (let x = 0; x < BAND_COUNT; x++) {
     dists[x] = Math.abs((x - BAND_COUNT / 2) / (BAND_COUNT / 2));
     if (x < BAND_COUNT * 0.2) eqScales[x] = djState.mixerA.eqLow * 2;
     else if (x < BAND_COUNT * 0.6) eqScales[x] = djState.mixerA.eqMid * 2;
     else eqScales[x] = djState.mixerA.eqHi * 2;
  }

  const tzCosZFreq = settings.trigCosZFreq ?? 0.3;
  const tzCosZTime = settings.trigCosZTime ?? 0.5;
  const tzSinZFreq = settings.trigSinZFreq ?? 0.2;
  for (let z = 0; z < HISTORY_SIZE; z++) {
     precalcCosZ[z] = Math.cos(z * tzCosZFreq - internalTime * tzCosZTime);
     precalcSinZ[z] = Math.sin(z * tzSinZFreq + internalTime);
     precalcDepthZ[z] = z; // Adding z to depth later
  }
  
  // ============================================================================
  // SYMMETRIC POLAR GRID — the heart of the kaleidoscope
  // ----------------------------------------------------------------------------
  // Every movement style derives its value from (dist, foldedAngle) ONLY, never
  // from raw (x, z). Because mirrored positions produce identical (dist,
  // foldedAngle), the result is guaranteed 8-fold mirror symmetric.
  // ============================================================================
  const movementStyle = settings.movementStyle || 'glitch';
  // Number of kaleidoscope mirror axes. Clamped so the visualizer stays
  // well-defined even if a UI slider sends nonsense values.
  const SEGMENTS = Math.max(1, Math.min(24, Math.floor(settings.symmetryFolds ?? 8)));
  const SEG_ANGLE = (Math.PI * 2) / SEGMENTS;
  const HALF_SEG = SEG_ANGLE / 2;
  const rippleSpeed = settings.rippleSpeed;
  const rippleDamping = settings.rippleDamping;
  // Normalize distance to ~screen-diagonal so tunable params feel the same
  // across resolutions.
  const distScale = 1 / Math.max(1, Math.min(colSpacing, rowSpacing));
  // distScale * colSpacing ~= 1 per grid step. Then multiply by rippleDamping.

  for (let z = 0; z < HISTORY_SIZE; z++) {
    for (let x = 0; x < BAND_COUNT; x++) {
      const idx = z * BAND_COUNT + x;
      // Pixel-space vector from center (uses actual spacings so the pattern
      // stays round on any aspect ratio).
      const cxPx = (x + 0.5 - BAND_COUNT / 2) * colSpacing;
      const czPx = (z + 0.5 - HISTORY_SIZE / 2) * rowSpacing;
      const dist = Math.sqrt(cxPx * cxPx + czPx * czPx);
      const angle = Math.atan2(czPx, cxPx);

      // FOLDED ANGLE: classic kaleidoscope fold into a [0, HALF_SEG] slice.
      const wrapped = ((angle % SEG_ANGLE) + SEG_ANGLE) % SEG_ANGLE;
      const folded = Math.abs(wrapped - HALF_SEG);

      // Unit radial vector — used later for symmetric radial push.
      const invD = dist > 0.0001 ? 1 / dist : 0;
      polarUX[idx] = cxPx * invD;
      polarUY[idx] = czPx * invD;
      polarFolded[idx] = folded;

      // Scale dist so `d * rippleDamping` gives a pleasing number of rings.
      const d = dist * distScale;
      const fa6 = folded * 6;
      const fa8 = folded * 8;
      let ripple = 0.5;

      switch (movementStyle) {
        case 'wave': {
          // Radial waves + angular petals — a breathing flower.
          const r = Math.sin(d * rippleDamping * 0.35 - internalTime * rippleSpeed * 0.4);
          const petals = Math.cos(fa6 + internalTime * 0.9);
          ripple = 0.5 + r * 0.35 + petals * 0.25;
          break;
        }
        case 'matrix': {
          // Cascading concentric rings with 6-fold angular lattice.
          const rings = Math.sin(d * rippleDamping * 0.55 - internalTime * rippleSpeed * 0.6);
          const spokes = Math.cos(folded * 6 - internalTime * 0.7);
          ripple = 0.5 + rings * 0.4 + spokes * 0.2;
          break;
        }
        case 'glitch': {
          // Pure 8-fold kaleidoscopic mandala (the default / hero look).
          const ring = Math.sin(d * rippleDamping * 0.45 - internalTime * rippleSpeed * 0.4);
          const petal = Math.sin(fa8 + internalTime * 0.5);
          const inter = Math.cos(d * 0.05 + fa8 * 0.5 - internalTime * 0.35);
          ripple = 0.5 + ring * petal * 0.4 + inter * 0.2;
          break;
        }
        case 'orbit': {
          // Rotating spiral. Uses `cos` of folded angle so the result is still
          // mirror-symmetric (cos is even about 0).
          const spiral = Math.cos(d * 0.08 - fa8 * 2 + internalTime * rippleSpeed * 0.3);
          const ring = Math.sin(d * rippleDamping * 0.4 - internalTime * rippleSpeed * 0.5);
          ripple = 0.5 + spiral * 0.3 + ring * 0.25;
          break;
        }
        case 'tunnel': {
          // Zoom tunnel: rings rush inward, angular spokes rotate.
          const rings = Math.sin(d * rippleDamping * 0.6 + internalTime * rippleSpeed * 1.1);
          const spokes = Math.cos(fa8 * 2 + internalTime * 0.6);
          const deep = Math.sin(d * 0.04 + internalTime * rippleSpeed * 0.5);
          ripple = 0.5 + rings * 0.35 + spokes * 0.2 + deep * 0.15;
          break;
        }
        case 'pulse': {
          // Pure expanding / contracting concentric rings + global heartbeat.
          const rings = Math.sin(d * rippleDamping * 0.5 - internalTime * rippleSpeed * 0.6);
          const beat = Math.sin(internalTime * 1.2) * 0.5 + 0.5;
          ripple = 0.5 + rings * 0.4 + (beat - 0.5) * 0.25;
          break;
        }
        case 'static': {
          // Slow breathing mandala.
          const breathe = Math.sin(internalTime * 0.5);
          const mand = Math.sin(d * 0.05 - internalTime * 0.6) * Math.cos(fa6);
          ripple = 0.5 + mand * 0.35 + breathe * 0.15;
          break;
        }
        case 'ripple':
        default: {
          // Classic concentric rings expanding from center.
          const r1 = Math.sin(d * rippleDamping * 0.5 - internalTime * rippleSpeed * 0.6);
          const r2 = Math.cos(d * rippleDamping * 0.25 + internalTime * rippleSpeed * 0.3);
          ripple = 0.5 + r1 * 0.4 + r2 * 0.2;
          break;
        }
      }

      radialDist[idx] = dist;
      radialRipples[idx] = ripple;
    }
  }
  
  // STATE CACHING FOR CANVAS API (Prevents massive CPU stalls)
  let lastAlpha = -1;
  let lastFillStyle = '';
  // Fonts are extremely expensive to re-parse natively, track current size to prevent layout thrashing
  let activeFontSize = baseFontSize;
  ctx.font = `bold ${activeFontSize}px "Courier New", Courier, monospace`;
  
  // GLOBAL WIREFRAME BATCHING (Improves frame rate from 5fps to 60fps)
  let activeWireframeColor = '';
  let isWireframePathOpen = false;

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
  const animationMotionWeight = Math.max(0, settings.animationMotionWeight ?? 1.0);
  const animationFlowWeight = Math.max(0, settings.animationFlowWeight ?? 1.0);
  const animationBeatThreshold = Math.max(0, Math.min(0.9, settings.animationBeatThreshold ?? 0.22));
  const animationBeatResponse = Math.max(0, settings.animationBeatResponse ?? 0.8);
  const animationBeatBassInfluence = Math.max(0, settings.animationBeatBassInfluence ?? 0.65);
  const animationBeatWaveBaseSpeed = Math.max(0, settings.animationBeatWaveBaseSpeed ?? 11.0);
  const animationBeatSpatialFreq = Math.max(0.01, settings.animationBeatSpatialFreq ?? 0.28);
  const animationCenterBias = Math.max(0, Math.min(1, settings.animationCenterBias ?? 0.65));
  const animationBeatLiftStrength = Math.max(0, settings.animationBeatLiftStrength ?? 18.0);
  // animationBeatSwayStrength no longer used — the cartesian sway term was
  // inherently asymmetric; beat motion is now a purely radial shockwave.
  const animationScatterClampBase = Math.max(0, settings.animationScatterClampBase ?? 28.0);
  const animationScatterClampBoost = Math.max(0, settings.animationScatterClampBoost ?? 10.0);
  const animationTerrainLift = Math.max(0, settings.animationTerrainLift ?? 120.0);
  const animationTerrainBeatStrength = Math.max(0, settings.animationTerrainBeatStrength ?? 10.0);
  const animationScaleResponse = Math.max(0, settings.animationScaleResponse ?? 1.0);

  // Beat envelope is now a configurable motion driver.
  const beatNormalizer = Math.max(0.01, 1 - animationBeatThreshold);
  const beatTransient = Math.max(0, (pulseStrength - animationBeatThreshold) / beatNormalizer);
  const beatMotionDrive = Math.min(1.5, beatTransient * (animationBeatResponse + baseBass * animationBeatBassInfluence)) * animationMotionWeight;
  const beatWaveSpeed = animationBeatWaveBaseSpeed + settings.rippleSpeed * 0.75;
  const beatSpatialFreq = animationBeatSpatialFreq + settings.rippleDamping * 0.12;

  // PRE-CALCULATE ZONE POWER FOR THE FRAME
  // HOIST KINECT SETTINGS TO SAVE CPU (2400 frames array iter)
  const kinectFrameWidth = Math.max(1, Math.floor(options.kinectDepthSize?.width ?? 160));
  const kinectFrameHeight = Math.max(1, Math.floor(options.kinectDepthSize?.height ?? 120));
  const kinectFrameLength = kinectFrameWidth * kinectFrameHeight;
  const isKinectEnabled = !!options.kinectDepthFrame && options.kinectDepthFrame.length >= kinectFrameLength;
  const doMirror = settings.kinectMirror !== undefined ? settings.kinectMirror : true;
  const offsetX = settings.kinectOffsetX !== undefined ? settings.kinectOffsetX : 0;
  const offsetY = settings.kinectOffsetY !== undefined ? settings.kinectOffsetY : 0;
  const zoom = settings.kinectZoom !== undefined ? settings.kinectZoom : 1.0;
  const cropL = settings.kinectCropLeft !== undefined ? settings.kinectCropLeft : 0.0;
  const cropR = settings.kinectCropRight !== undefined ? settings.kinectCropRight : 1.0;
  const cropT = settings.kinectCropTop !== undefined ? settings.kinectCropTop : 0.0;
  const cropB = settings.kinectCropBottom !== undefined ? settings.kinectCropBottom : 1.0;
  const depthMin = settings.kinectDepthMin !== undefined ? settings.kinectDepthMin : 20;
  const depthMax = settings.kinectDepthMax !== undefined ? settings.kinectDepthMax : 110;
  const yPull = settings.kinectYPull !== undefined ? settings.kinectYPull : 80;
  const scalePush = settings.kinectScalePush !== undefined ? settings.kinectScalePush : 1.5;
  const fluidSpeed = settings.kinectFluidSpeed !== undefined ? settings.kinectFluidSpeed : 0.08;
  const distortionForce = settings.kinectDistortion !== undefined ? settings.kinectDistortion : 0.1;
  const glowForce = settings.kinectGlow !== undefined ? settings.kinectGlow : 0.8;
  const swayAmplitude = settings.kinectSwayAmplitude !== undefined ? settings.kinectSwayAmplitude : 30.0;
  const swaySpeed = settings.kinectSwaySpeed !== undefined ? settings.kinectSwaySpeed : 1.0;
  const isShockwave = settings.kinectShockwave !== undefined ? settings.kinectShockwave : true;
  const isZColor = settings.kinectZAxisColor !== undefined ? settings.kinectZAxisColor : true;
  const isWireframe = settings.kinectWireframe !== undefined ? settings.kinectWireframe : false;
  const isKColorCustom = settings.colorMode === 'custom' || settings.colorMode === 'white';
  const swayMotionOffset = Math.sin(internalTime * swaySpeed * 0.5) * swayAmplitude; // Precalc global time wave
  const centerX = width / 2;
  const ctrX = width / 2;
  const ctrY = height / 2;  

  const bassPowerBase = (baseBass * baseBass * (settings.bassPowerMul ?? 1.5) + pulseStrength * 0.5) * sensitivity;
  const midsPowerBase = (frame.mids * frame.mids) * (settings.midsPowerMul ?? 2.0) * sensitivity;
  const highsPowerBase = (frame.highs * frame.highs) * (settings.highsPowerMul ?? 2.0) * sensitivity;
  const bassLocalDominance = Math.max(0, baseBass - settings.bassThreshold);
  const midsLocalDominance = Math.max(0, frame.mids - settings.midThreshold);
  const highsLocalDominance = Math.max(0, frame.highs - settings.highThreshold);
  const bassBeatHitRaw = bassLocalDominance > 0.1 || pulseStrength > (settings.bassThreshold + 0.4);
  const midsBeatHitRaw = midsLocalDominance > 0.1;
  const highsBeatHitRaw = highsLocalDominance > 0.1;

  // SURVEILLANCE STATE
  const isSurveillance = settings.kinectSurveillance !== undefined ? settings.kinectSurveillance : false;
  const MAX_CLUSTERS = 8;
  const cMinX = new Float32Array(MAX_CLUSTERS);
  const cMaxX = new Float32Array(MAX_CLUSTERS);
  const cMinY = new Float32Array(MAX_CLUSTERS);
  const cMaxY = new Float32Array(MAX_CLUSTERS);
  const cPoints = new Int32Array(MAX_CLUSTERS);
  let clusterCount = 0;
  const CLUSTER_DIST = Math.min(width, height) * 0.18; // Dist threshold to group body parts

  // Set white mode style exactly ONCE if we are in white mode
  if (isWhiteMode) {
      ctx.fillStyle = '#FFFFFF';
      lastFillStyle = '#FFFFFF';
  } else if (isCustomMode) {
      const customCol = settings.customColor || '#FFFFFF';
      ctx.fillStyle = customCol;
      lastFillStyle = customCol;
  }

  // Array untuk menyimpan posisi aktual setiap titik setelah fisika diterapkan
  // Digunakan untuk Matrix Wireframe (menghubungkan ke titik Z sebelumnya)
  const pxGrid = new Float32Array(BAND_COUNT * HISTORY_SIZE);
  const pyGrid = new Float32Array(BAND_COUNT * HISTORY_SIZE);

  for (let z = 0; z < HISTORY_SIZE; z++) {
    const pyBase = startY + z * rowSpacing;

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
      
      // SYMMETRIC CHARACTER SELECTION
      // Index into the character source using (dist, foldedAngle) so mirrored
      // cells always pick the SAME glyph — visibly reinforcing symmetry.
      const foldedAngleCell = polarFolded[idx];
      const charSymKey = Math.floor(
        distToCenter * 0.15 + foldedAngleCell * 7.3 + internalTime * 0.7
      );
      let char = sourceStr[((charSymKey % sourceLen) + sourceLen) % sourceLen];
      charIndex++;

      // KUNCI GERAKAN BUKAN HANYA BASS:
      let isBeatHit = false;
      let movementPowerRaw = 0;

      if (indexRatio < 0.3) {
        // BASS ZONE
        isBeatHit = bassBeatHitRaw && boosted > settings.bassThreshold;
        movementPowerRaw = bassPowerBase * eqScale;
      } else if (indexRatio < 0.7) {
        // MID ZONE
        isBeatHit = midsBeatHitRaw && boosted > settings.midThreshold;
        movementPowerRaw = midsPowerBase * eqScale;
      } else {
        // HIGH ZONE
        isBeatHit = highsBeatHitRaw && boosted > settings.highThreshold;
        movementPowerRaw = highsPowerBase * eqScale;
      }

      const movementPower = movementPowerRaw > 2 ? 2 : movementPowerRaw;
      const frontDepth = 1 - (z / HISTORY_SIZE);
      const centerFalloff = 1 - Math.min(1, distToCenter / maxDist);
      const motionWeight = (1 - animationCenterBias) + (centerFalloff * animationCenterBias);
      const audioScale = 1.0 + Math.min(0.35, movementPower * (0.15 * animationScaleResponse) * (0.5 + beatMotionDrive));

      // SYMMETRIC radial unit vector for this cell (points outward from center).
      const ux = polarUX[idx];
      const uy = polarUY[idx];

      // 1. SYMMETRIC BEAT SHOCKWAVE
      // Instead of driving lift by raw (x, z), propagate a ring shockwave along
      // the radial axis. Every mirrored cell receives the same magnitude, so
      // symmetry is preserved.
      const beatShock = Math.sin(distToCenter * beatSpatialFreq - internalTime * beatWaveSpeed)
          * beatMotionDrive
          * animationBeatLiftStrength
          * settings.amplitudeRatio
          * (0.35 + frontDepth * 0.65)
          * motionWeight;

      // 2. BEAT CHARACTER CYCLE (symmetric — indexed by dist+foldedAngle only)
      if (isBeatHit && movementPower > 0.8) {
         const chars = settings.glitchChars || "XYZ#%@!$<>{}[]";
         const symIdx = Math.floor(
           (distToCenter * 0.1 + foldedAngleCell * 5.1 + internalTime * 2) % chars.length
         );
         const safeIdx = ((symIdx % chars.length) + chars.length) % chars.length;
         char = chars[safeIdx];
      }

      // 3. SYMMETRIC SIMPLEX NOISE (sampled in polar space)
      // Sampling at (dist, foldedAngle) guarantees symmetry: every mirrored
      // cell evaluates the same noise value.
      const noiseScaleBase = settings.noiseScaleBase !== undefined ? settings.noiseScaleBase : 0.005;
      const noiseScale = noiseScaleBase;
      const noiseTimeMult = settings.noiseTimeMult !== undefined ? settings.noiseTimeMult : 0.15;
      const noiseTime = internalTime * noiseTimeMult;

      const polarNR = distToCenter * noiseScale;         // radial noise coordinate
      const polarNA = foldedAngleCell * 3.0;             // angular noise coordinate
      const flowPowerScale = settings.flowPowerScale !== undefined ? settings.flowPowerScale : 5.0;
      const flowPower = Math.max(0, frame.energy) * flowPowerScale * settings.amplitudeRatio * animationFlowWeight;

      // Scalar noise sample — one number that drives radial displacement.
      let noiseRad = noiseInstance.noise3D(polarNR, polarNA, noiseTime);
      noiseRad += noiseInstance.noise3D(polarNR * 2.3, polarNA * 2.3, noiseTime * 1.6) * 0.35;
      const warpRadial = noiseRad * flowPower;

      // 4. SYMMETRIC BREATHING PULSE driven by the ripple pattern itself.
      // radialRipples[idx] is already built from (dist, foldedAngle), so this
      // preserves symmetry.
      const breathPulse = (radialRipples[idx] * 2.0 - 1.0)
          * settings.scatterMultiplier * 0.15 * settings.amplitudeRatio;

      // 5. COMBINED RADIAL PUSH — project everything along the outward vector.
      // Tangential and cartesian components are intentionally zero so that
      // mirrored cells stay mirrored after displacement.
      const radialPush = warpRadial + beatShock + breathPulse;
      const maxScatter = animationScatterClampBase + movementPower * animationScatterClampBoost;
      const clampedRadial = Math.max(-maxScatter, Math.min(maxScatter, radialPush));
      const scatterX = ux * clampedRadial;
      const scatterY = uy * clampedRadial;

      // FX drift — already radial-symmetric: depends only on dist and time.
      const fxDrift = Math.sin(distToCenter * 0.04 + internalTime * 2.0) * 3 * fxDepth;

      // 6. SYMMETRIC TERRAIN LIFT — apply audio lift radially (outward).
      const configTerrain = settings.terrainMultiplier !== undefined ? settings.terrainMultiplier : 0.8;
      const terrainRipple = radialRipples[idx] * 2.0 - 1.0;
      const audioLift = boosted * animationTerrainLift * settings.amplitudeRatio * sensitivityPlayScale * configTerrain;
      const beatTerrainPush = beatMotionDrive
          * (animationTerrainBeatStrength + movementPower * (animationTerrainBeatStrength * 0.8))
          * (0.2 + frontDepth * 0.55)
          * motionWeight;
      const baseTerrainHeight = audioLift + (terrainRipple * audioLift * 0.4) + (beatTerrainPush * radialRipples[idx]);

      // Base cartesian position on the rigid grid — kept pristine so Kinect
      // lookup still works. Any asymmetric trig / skew / wind has been removed.
      const pxBase = startX + x * colSpacing + xBias;
      const pyBaseGrid = pyBase;

      // Apply the symmetric radial push to the final position. Terrain height
      // becomes an additional radial shove (outward when positive).
      let px = pxBase + scatterX + fxDrift + ux * baseTerrainHeight;
      let py = pyBaseGrid + scatterY + fxDrift + uy * baseTerrainHeight;
      let scale = audioScale;
      let rawBrightness = 0.08 + (boosted * 1.15 > 0.78 ? 0.78 : boosted * 1.15) + beatMotionDrive * 0.08;

      // 3D KINECT HOLOGRAPHIC OVERLAP MAGIC (Apply KINECT FIRST, then audio warping on top)
      if (isKinectEnabled && options.kinectDepthFrame && options.kinectDepthFrame.length > 0) {

        // CORRECT LOGIC: Map the base pixel position (before audio warp) to a normalized 0-1 coordinate space.
        // This ensures the Kinect depth acts like a uniform webcam overlay across the entire canvas.
        const normX = pxBase / canvas.width;
        const normY = pyBaseGrid / canvas.height;

        let targetCloseness = 0;

        // Check Crop boundaries first (in normalized 0-1 space)
        if (normX >= cropL && normX <= cropR && normY >= cropT && normY <= cropB) {
            // Apply Zoom and Offset adjustments
            const adjX = (normX - 0.5) / zoom + 0.5 - offsetX;
            const adjY = (normY - 0.5) / zoom + 0.5 - offsetY;

                // Map adjusted normalized coordinates to the current Kinect frame size.
                let kx = Math.floor(adjX * kinectFrameWidth);
                let ky = Math.floor(adjY * kinectFrameHeight);

            // Mirror if necessary
                if (doMirror) kx = (kinectFrameWidth - 1) - kx;

                if (kx >= 0 && kx < kinectFrameWidth && ky >= 0 && ky < kinectFrameHeight) {
                    const frameIndex = ky * kinectFrameWidth + kx;
               const rawDepth = frameIndex < options.kinectDepthFrame.length ? options.kinectDepthFrame[frameIndex] : 0;

            // KINECT DEPTH LOGIC:
            // 8-bit Kinect data (0-255).
            // - Sangat dekat / tangan: ~50-80
            // - Tembok belakang / jauh: ~110-150
            // - Error / Out of bounds: 255
            
            // Logika UI ditarik (hoisted) agar ringan

            if (rawDepth > depthMin && rawDepth < depthMax) {
               // Normalisasi objek dekat menjadi targetCloseness = 1.0 (sangat maju), objek jauh = 0.0 (menyatu dengan rata layarnya)
               const range = depthMax - depthMin;
               targetCloseness = Math.pow(Math.max(0, (depthMax - rawDepth) / range), 1.5);
               targetCloseness = Math.min(1.0, targetCloseness); // Clamp max 1.0
            }
            
            // LOGIKA FLUID DELAYED MOTION:
            // Bukannya partikel teks langsung melompat ke nilai target (instan keras/mentah), 
            // Setiap detik, nilai posisinya hanya bergerak lambat mendekati targetnya.
            // Ini akan menciptakan efek "buntut basah" atau cetakan tubuh yang tenggelam pelan-pelan seperti karet di memori air.
            const lerpSpeed = fluidSpeed; 
            const currVal = fluidGrid[idx];
            // Kalau tubuh lebih maju (naik), berikan dorongan cepat, tapi pas tangan mundur biarkan dia mencair balik perlahan.
            const speed = targetCloseness > currVal ? lerpSpeed * 2.5 : lerpSpeed; 
            fluidGrid[idx] = currVal + (targetCloseness - currVal) * speed;
            
            const closeness = fluidGrid[idx];

            if (closeness > 0.05) {
                 // INTERAKSI REALISTIS (3D Topographic Mesh)
                 // Kain audionya ditarik rapat, mengikuti kecepatan air tertunda (delayed fluid motion).
                 
                 // 1. Skala huruf dijaga agar grid tidak hancur berantakan
                 scale = Math.max(scale, 1.0 + (closeness * scalePush)); 
                 
                 // 2. Tarikan/tonjolan fisik terkendali (maksimal -80px) agar membentuk patung, bukan partikel melayang.
                 py -= closeness * yPull; 
                 
                 // 2.5 Efek Parallax/Ayunan 3D Berputar Kiri-Kanan 
                 if (swayAmplitude > 0) {
                     px += closeness * swayMotionOffset;
                 }

                 // 3. Sentuhan Audio: Biarkan ombak musik (scatterY) mendorong bentuk patungnya naik-turun bersama bass!
                 // Ini yang membuat hologram Anda bergetar/berinteraksi dengan musik SEBAGAI SATU KESATUAN benda padat.
                 const musicPush = (scatterX + scatterY) * closeness * 1.5;
                 px += musicPush * 0.5;
                 py += musicPush;
                 
                 // CYBERPUNK 3: SHOCKWAVE / BASS EXPLOSION
                 if (isShockwave && bassImpact > 0.4) {
                    const dxCenter = px - ctrX;
                    const dyCenter = py - ctrY;
                    const distCenter = Math.max(1, Math.sqrt(dxCenter*dxCenter + dyCenter*dyCenter));
                    // Makin ke tengah ledakannya makin kuat mendorongnya menjauh
                    const explosionForce = (2000 / (distCenter + 50)) * closeness * bassImpact * 0.5;
                    px += (dxCenter / distCenter) * explosionForce;
                    py += (dyCenter / distCenter) * explosionForce;
                 }
                 
                 // 4. Pembengkakan (lens distorsi radial/surface tension) diatur oleh UI (Distortion Force)
                 const dx = px - centerX;
                 px += (dx * closeness * distortionForce); 
                 
                 // Memberikan kesan shadow di lekukan kedalaman untuk ilusi Relief 3D
                 if (closeness < 0.2) {
                    rawBrightness *= 0.6; // Bayangan saat pangkal kain mulai ditarik ke atas
                 } else if (closeness > 0.8 && isBeatHit) {
                    // Ketika lagu meledak (beatDrop), puncak tangan Anda bersinar terang putih menyilaukan
                    rawBrightness = 1.2 * glowForce; 
                 }
               }
            
            // Tambahkan pendaran cahaya/glow pada puncak patung fisik agar kontras dengan dasar ombak
            if (closeness > 0) {
               rawBrightness = Math.max(rawBrightness, closeness * glowForce);
            }
         } else {
             // Kalau diluar resolusi / kinect bounds, pelan2 matiin fluidnya
             const currVal = fluidGrid[idx];
             fluidGrid[idx] = currVal + (0 - currVal) * 0.08;
         }
         }
      } else if (isKinectEnabled && (!options.kinectDepthFrame || options.kinectDepthFrame.length === 0)) {
         // Kinect enabled but no data - decay fluidGrid
         const currVal = fluidGrid[idx];
         fluidGrid[idx] = currVal + (0 - currVal) * 0.15;
      }
      
      // Quantize brightness globally: lower fidelity = fewer state changes and less CPU lag
      const characterOpacity = Math.max(0, Math.min(1, settings.characterOpacity ?? 1));
      const alphaRaw = Math.round(rawBrightness * 10) / 10;
      const alpha = alphaRaw * characterOpacity;

      // ALWAYS RECORD POSITION EVEN IF NOT VISIBLE TO PREVENT WIREFRAME 0,0 ORIGIN ARTIFACTS
      pxGrid[idx] = px;
      pyGrid[idx] = py;
      
      // 0.08 cutoff ensures invisible and near-invisible text is skipped, saving tons of draw calls
      if (alphaRaw > 0.08) {
          if (lastAlpha !== alpha) {
              ctx.globalAlpha = alpha;
              lastAlpha = alpha;
          }

          // CYBERPUNK 2: HOLOGRAPHIC Z-AXIS HEATMAP COLOR
          let appliedColorStr = '';

          if (!isKColorCustom && isKinectEnabled && isZColor && fluidGrid[idx] > 0.02) {
              // Badan depan (1.0) = Cyan (180), Bahu (0.5) = Pink (300), Belakang (0.1) = Ungu Gelap (270)
              // Quantize depth chunks to lower DOM string allocation overhead
              const depthMapValue = Math.round(fluidGrid[idx] * 10) / 10;
              const zHue = (settings.zHueBase ?? 270) + (depthMapValue * (settings.zHueShift ?? -90)); // 270 turun ke 180 (Purple -> Pink -> Cyan)
              const zLum = (settings.zLumBase ?? 40) + (depthMapValue * (settings.zLumShift ?? 30)) + (isBeatHit ? 20 : 0); // Terang saat maju dan bass
              appliedColorStr = `hsl(${Math.floor(zHue)}, 100%, ${Math.min(100, Math.floor(zLum))}%)`;
          } else if (!isWhiteMode && !isCustomMode) {
             let hue;
             let lum = 50;
             if (settings.colorMode === 'rainbow') {
                 // Symmetric rainbow — hue is a function of (dist, foldedAngle)
                 // so mirrored cells share the same color and the image stays
                 // a true kaleidoscope across axes.
                 hue = (distToCenter * 0.8) + (foldedAngleCell * 180 / Math.PI) * 4 + internalTime * 20;
                 hue += Math.sin(internalTime * 0.5 + distToCenter * 0.02) * 30;
             } else if (settings.colorMode === 'thermal') {
                 const v = Math.min(1, Math.max(0, boosted * 1.5));
                 if (v < 0.2) {
                   hue = 240;
                   lum = (v / 0.2) * 30;
                 } else if (v < 0.5) {
                   hue = 240 - ((v - 0.2) / 0.3) * 240;
                   lum = 30 + ((v - 0.2) / 0.3) * 20;
                 } else if (v < 0.8) {
                   hue = ((v - 0.5) / 0.3) * 60;
                   lum = 50;
                 } else {
                   hue = 60;
                   lum = 50 + ((v - 0.8) / 0.2) * 50;
                 }
             } else {
                 // Symmetric hue: driven by distance ring, not raw row index.
                 hue = djState.mixerA.colorFx * 360 + (distToCenter * 0.6);
             }
                   
             appliedColorStr = settings.colorMode === 'thermal' 
               ? `hsl(${Math.floor(hue)}, 100%, ${Math.floor(lum)}%)`
               : `hsl(${Math.floor(hue / 10) * 10}, 100%, 50%)`;
          }

          // Apply color if we calculated one (either Z-Axis or standard mode overrides)
          if (appliedColorStr && lastFillStyle !== appliedColorStr) {
             ctx.fillStyle = appliedColorStr;
             lastFillStyle = appliedColorStr;
          }

          let targetFontSize = baseFontSize;
          if (scale > 1.05) {
             targetFontSize = Math.floor(baseFontSize * scale);
          }

          if (targetFontSize !== activeFontSize) {
             ctx.font = `bold ${targetFontSize}px "Courier New", Courier, monospace`;
             activeFontSize = targetFontSize;
          }

          ctx.fillText(char, px, py);

          // CYBERPUNK 4: MATRIX WIREFRAME

          if (isSurveillance && fluidGrid[idx] > 0.3) {
             let found = false;
             for (let c = 0; c < clusterCount; c++) {
                 let cx = (cMinX[c] + cMaxX[c]) / 2;
                 let cy = (cMinY[c] + cMaxY[c]) / 2;
                 let distSq = (px - cx)*(px - cx) + (py - cy)*(py - cy);
                 // If close enough, expand the cluster bounds
                 if (distSq < CLUSTER_DIST * CLUSTER_DIST) {
                     if (px < cMinX[c]) cMinX[c] = px;
                     if (px > cMaxX[c]) cMaxX[c] = px;
                     if (py < cMinY[c]) cMinY[c] = py;
                     if (py > cMaxY[c]) cMaxY[c] = py;
                     cPoints[c]++;
                     found = true;
                     break;
                 }
             }
             // If a new distinct part is found, spin up a new tracker box
             if (!found && clusterCount < MAX_CLUSTERS) {
                 cMinX[clusterCount] = px;
                 cMaxX[clusterCount] = px;
                 cMinY[clusterCount] = py;
                 cMaxY[clusterCount] = py;
                 cPoints[clusterCount] = 1;
                 clusterCount++;
             }
          }

          if (isWireframe && fluidGrid[idx] > 0.05) {
             const strokeCol = appliedColorStr || lastFillStyle || '#ffffff';
             
             // Check if we need to start a new color path batch
             if (strokeCol !== activeWireframeColor) {
                 if (isWireframePathOpen) {
                     ctx.stroke(); // Draw the previous batch
                 }
                 ctx.beginPath();
                 ctx.strokeStyle = strokeCol;
                 ctx.lineWidth = 1;
                 activeWireframeColor = strokeCol;
                 isWireframePathOpen = true;
             }
             
             // Sambung garis ke tetangga horizontal (kiri)
             if (x > 0 && fluidGrid[idx - 1] > 0.05) {
                ctx.moveTo(pxGrid[idx - 1], pyGrid[idx - 1]);
                ctx.lineTo(px, py);
             }
             
             // Sambung garis ke tetangga vertikal (atas)
             if (z > 0 && fluidGrid[idx - BAND_COUNT] > 0.05) {
                ctx.moveTo(pxGrid[idx - BAND_COUNT], pyGrid[idx - BAND_COUNT]);
                ctx.lineTo(px, py);
             }
          }
      }
    }
  }

  // FINAL FLUSH FOR WIREFRAME BATCH
  if (isWireframePathOpen) {
      ctx.stroke();
  }

  // DRAW SURVEILLANCE OVERLAY
  if (isSurveillance && clusterCount > 0) {
      ctx.save();
      const baseSurveillanceColor = settings.kinectSurveillanceColor || '#00ffcc';
      const sizeMult = settings.kinectSurveillanceSize !== undefined ? settings.kinectSurveillanceSize : 1.2;
      const opacity = settings.kinectSurveillanceOpacity !== undefined ? settings.kinectSurveillanceOpacity : 0.8;
      
      // Makes the boxes significantly brighter / illuminated
      ctx.shadowColor = baseSurveillanceColor;
      ctx.shadowBlur = 10;
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = opacity;
      
      ctx.strokeStyle = baseSurveillanceColor;
      ctx.fillStyle = baseSurveillanceColor;
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.textAlign = 'left';

      const pad = 15;
      
      // GLOBALS FOR FULL FRAME METRICS
      let activeSensors = 0;
      let primaryBox = null;
      let highestPoints = 0;
      
      let validClusters = [];
      for (let c = 0; c < clusterCount; c++) {
          if (cPoints[c] < 4) continue; // Noise filter for stray particles
          
          let minX = cMinX[c] - pad;
          let maxX = cMaxX[c] + pad;
          let minY = cMinY[c] - pad;
          let maxY = cMaxY[c] + pad;

          let cx = (minX + maxX) / 2;
          let cy = (minY + maxY) / 2;
          let boxWidth = (maxX - minX) * sizeMult;
          let boxHeight = (maxY - minY) * sizeMult;
          
          minX = cx - boxWidth / 2;
          maxX = cx + boxWidth / 2;
          minY = cy - boxHeight / 2;
          maxY = cy + boxHeight / 2;

          validClusters.push({
             c, cx, cy, minX, maxX, minY, maxY, boxWidth, boxHeight, pts: cPoints[c], role: 'OBJ'
          });
      }

      // ASSIGN SPECIFIC ANATOMY ROLES (Head, Hands, Right Leg) based on relative positions
      if (validClusters.length > 0) {
          // 1. Head is always the highest point (lowest cy)
          validClusters.sort((a,b) => a.cy - b.cy);
          validClusters[0].role = 'HEAD';
          
          let others = validClusters.slice(1);
          if (others.length > 0) {
              // 2. Right leg is the lowest point on the right screen side (highest cy, highest cx)
              // Sort by distance to bottom-right corner (width, height)
              others.sort((a,b) => ((width - a.cx) + (height - a.cy)) - ((width - b.cx) + (height - b.cy)));
              others[0].role = 'R-LEG';
              
              // 3. Hands are the remaining furthest left and right
              let hands = others.slice(1);
              if (hands.length > 0) {
                  hands.sort((a,b) => a.cx - b.cx);
                  hands[0].role = 'L-HAND'; // Leftmost is left hand
                  if (hands.length > 1) {
                      hands[hands.length - 1].role = 'R-HAND'; // Rightmost is right hand
                  }
              }
          }
      }

      // Filter to ONLY show requested anatomy
      const trackingTargets = validClusters.filter(c => c.role !== 'OBJ');

      for (const target of trackingTargets) {
          activeSensors += target.pts;

          // Track biggest object found for distance algorithm
          if (target.pts > highestPoints) {
              highestPoints = target.pts;
              primaryBox = target;
          }

          // Subtle tinted background for the boxes
          ctx.globalAlpha = opacity * 0.15;
          ctx.fillRect(target.minX, target.minY, target.boxWidth, target.boxHeight);
          ctx.globalAlpha = opacity;

          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 5]); // Dashed interior box 
          ctx.strokeRect(target.minX, target.minY, target.boxWidth, target.boxHeight);

          // Solid corners
          ctx.setLineDash([]);
          ctx.lineWidth = 3.0; // Thicker corners
          const cs = 18 * sizeMult; // Corner border size

          // Top-Left
          ctx.beginPath(); ctx.moveTo(target.minX, target.minY + cs); ctx.lineTo(target.minX, target.minY); ctx.lineTo(target.minX + cs, target.minY); ctx.stroke();
          // Top-Right
          ctx.beginPath(); ctx.moveTo(target.maxX - cs, target.minY); ctx.lineTo(target.maxX, target.minY); ctx.lineTo(target.maxX, target.minY + cs); ctx.stroke();
          // Bottom-Left
          ctx.beginPath(); ctx.moveTo(target.minX, target.maxY - cs); ctx.lineTo(target.minX, target.maxY); ctx.lineTo(target.minX + cs, target.maxY); ctx.stroke();
          // Bottom-Right
          ctx.beginPath(); ctx.moveTo(target.maxX - cs, target.maxY); ctx.lineTo(target.maxX, target.maxY); ctx.lineTo(target.maxX, target.maxY - cs); ctx.stroke();

          // Reticle Crosshair
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(target.cx - 10, target.cy); ctx.lineTo(target.cx + 10, target.cy);
          ctx.moveTo(target.cx, target.cy - 10); ctx.lineTo(target.cx, target.cy + 10);
          ctx.stroke();

          // Object Tag
          ctx.fillText(`[${target.role}]`, target.minX, target.minY - 5);
      }

      // RESTORED METRICS OVERLAY
      if (primaryBox) {
          ctx.globalAlpha = opacity;
          ctx.fillStyle = baseSurveillanceColor;
          ctx.font = 'bold 12px "Courier New", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`TRACKING LOG: ${trackingTargets.length} TARGETS`, primaryBox.minX, primaryBox.minY - 20);
          ctx.fillText(`SENSORS: ${activeSensors} PTS`, primaryBox.minX, primaryBox.maxY + 20);
          
          const distAlg = (primaryBox.boxWidth * primaryBox.boxHeight) / 1000;
          ctx.fillText(`DIST MAP: ${distAlg.toFixed(1)}`, primaryBox.maxX - 100, primaryBox.minY - 20);
      }

      // Draw random red dot blinker for recording mode globally in top left
      ctx.globalAlpha = opacity;
      ctx.fillStyle = '#ff0000';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 15;
      ctx.font = 'bold 14px "Courier New", monospace';
      if (internalTime % 2 < 1) {
          ctx.beginPath();
          ctx.arc(30, 30, 6, 0, Math.PI * 2);
          ctx.fill();
      }
      ctx.fillText(`REC`, 45, 34);

      ctx.restore();
  }

  // Restore opacity for next frame
  ctx.globalAlpha = 1.0;
  ctx.restore();
}
