import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import './styles.css';
import { useMicrophoneAnalyzer } from './hooks/useMicrophoneAnalyzer';
import { useSystemAudioAnalyzer } from './hooks/useSystemAudioAnalyzer';
import { useDjMidi } from './hooks/useDjMidi';
import { useWebcam } from './hooks/useWebcam';
import { useKinect } from './hooks/useKinect';
import { drawVisualizer, VisualSettings } from './visualizer/drawVisualizer';
import { drawAsciiWebcam } from './visualizer/drawAsciiWebcam';
import { drawKinect3D } from './visualizer/drawKinect3D';
import { drawTiles } from './visualizer/drawTiles';
import { drawFractal } from './visualizer/drawFractal';
import { drawGeometry } from './visualizer/drawGeometry';
import { drawMedia } from './visualizer/drawMedia';
import { AudioMonitor } from './components/AudioMonitor';

// ─────────────────────────────────────────────────────────────────────────────
// MANDALA SLIDER DESCRIPTOR
// A declarative way to describe each parameter we expose (label, range, step,
// tooltip, default). Kept outside of the component so each slider can look up
// its default for the ↺ reset button.
// ─────────────────────────────────────────────────────────────────────────────
type MandalaSliderSpec = {
  key: keyof VisualSettings;
  label: string;
  min: number;
  max: number;
  step: number;
  tooltip: string;
  /** Optional formatter for the inline value; defaults to toFixed(stepDecimals). */
  format?: (v: number) => string;
  /** Mark integer-only (uses parseInt and 0 decimals). */
  integer?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// MANDALA PRESETS
// One-click mood configs. Each preset is a partial settings object — it is
// merged on top of the current settings so untouched params keep their value.
// ─────────────────────────────────────────────────────────────────────────────
type MandalaPreset = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  settings: Partial<VisualSettings>;
};

const mandalaPresets: MandalaPreset[] = [
  {
    id: 'gentle',
    name: 'Gentle Mandala',
    emoji: '🌸',
    description: 'Slow, breathing 6-fold flower with low scatter.',
    settings: {
      movementStyle: 'static',
      symmetryFolds: 6,
      globalSpeed: 0.6,
      rippleSpeed: 3.0,
      rippleDamping: 0.5,
      breathAmplitude: 0.55,
      scatterMultiplier: 12,
      bassPulseImpact: 0.015,
      animationBeatLiftStrength: 10,
      animationBeatResponse: 0.6,
      animationBeatWaveBaseSpeed: 8,
      audioTimeWarpMultiplier: 0.25,
      flowPowerScale: 3,
      noiseScaleBase: 0.004,
      noiseTimeMult: 0.2,
    },
  },
  {
    id: 'classic',
    name: 'Classic Kaleidoscope',
    emoji: '🔮',
    description: '8-fold glitch mandala — the default hero look.',
    settings: {
      movementStyle: 'glitch',
      symmetryFolds: 8,
      globalSpeed: 1.5,
      rippleSpeed: 8,
      rippleDamping: 0.8,
      breathAmplitude: 0.35,
      scatterMultiplier: 30,
      bassPulseImpact: 0.025,
      animationBeatLiftStrength: 25,
      animationBeatResponse: 1.2,
      animationBeatWaveBaseSpeed: 15,
      audioTimeWarpMultiplier: 0.5,
      flowPowerScale: 5,
      noiseScaleBase: 0.005,
      noiseTimeMult: 0.35,
    },
  },
  {
    id: 'intense',
    name: 'Intense Psychedelic',
    emoji: '⚡',
    description: '12-fold, fast, punches hard on beats.',
    settings: {
      movementStyle: 'glitch',
      symmetryFolds: 12,
      globalSpeed: 3.2,
      rippleSpeed: 15,
      rippleDamping: 1.2,
      breathAmplitude: 0.55,
      scatterMultiplier: 120,
      bassPulseImpact: 0.07,
      animationBeatLiftStrength: 40,
      animationBeatResponse: 2.4,
      animationBeatWaveBaseSpeed: 24,
      audioTimeWarpMultiplier: 1.2,
      flowPowerScale: 15,
      noiseScaleBase: 0.012,
      noiseTimeMult: 0.6,
    },
  },
  {
    id: 'tunnel',
    name: 'Hypnotic Tunnel',
    emoji: '🌀',
    description: 'Zooming tunnel, slow rotation, deep flow.',
    settings: {
      movementStyle: 'tunnel',
      symmetryFolds: 8,
      globalSpeed: 1.1,
      rippleSpeed: 11,
      rippleDamping: 1.4,
      breathAmplitude: 0.25,
      scatterMultiplier: 20,
      bassPulseImpact: 0.03,
      animationBeatLiftStrength: 18,
      animationBeatResponse: 1.0,
      animationBeatWaveBaseSpeed: 20,
      audioTimeWarpMultiplier: 0.7,
      flowPowerScale: 20,
      noiseScaleBase: 0.008,
      noiseTimeMult: 0.5,
    },
  },
  {
    id: 'pulse',
    name: 'Pulsing Rings',
    emoji: '💫',
    description: 'Concentric heartbeat rings with strong bass thump.',
    settings: {
      movementStyle: 'pulse',
      symmetryFolds: 8,
      globalSpeed: 1.2,
      rippleSpeed: 10,
      rippleDamping: 0.9,
      breathAmplitude: 0.45,
      scatterMultiplier: 25,
      bassPulseImpact: 0.08,
      animationBeatLiftStrength: 35,
      animationBeatResponse: 1.8,
      animationBeatWaveBaseSpeed: 18,
      audioTimeWarpMultiplier: 0.4,
      flowPowerScale: 6,
      noiseScaleBase: 0.005,
      noiseTimeMult: 0.3,
    },
  },
  {
    id: 'liquid',
    name: 'Liquid Flow',
    emoji: '🎨',
    description: 'Fluid ripple, high flow noise, painterly feel.',
    settings: {
      movementStyle: 'ripple',
      symmetryFolds: 8,
      globalSpeed: 1.4,
      rippleSpeed: 9,
      rippleDamping: 0.7,
      breathAmplitude: 0.4,
      scatterMultiplier: 40,
      bassPulseImpact: 0.03,
      animationBeatLiftStrength: 20,
      animationBeatResponse: 1.1,
      animationBeatWaveBaseSpeed: 14,
      audioTimeWarpMultiplier: 0.6,
      flowPowerScale: 35,
      noiseScaleBase: 0.02,
      noiseTimeMult: 0.7,
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MANDALA CONTROL GROUPS — each group becomes a collapsible section in the UI.
// Default tooltips explain what the param does in one sentence.
// ─────────────────────────────────────────────────────────────────────────────
const mandalaSymmetryControls: MandalaSliderSpec[] = [
  { key: 'symmetryFolds', label: 'Symmetry Folds', min: 1, max: 12, step: 1, integer: true,
    tooltip: 'Number of kaleidoscope mirror axes. 8 is the classic mandala, 12 feels crystalline.' },
];

const mandalaFlowControls: MandalaSliderSpec[] = [
  { key: 'globalSpeed', label: 'Global Speed', min: 0, max: 5, step: 0.05,
    tooltip: 'Master multiplier for all animation time. Higher = faster mandala.' },
  { key: 'rippleSpeed', label: 'Ripple Speed', min: 0, max: 20, step: 0.1,
    tooltip: 'How fast concentric rings / petals travel outward.' },
  { key: 'rippleDamping', label: 'Ripple Damping', min: 0, max: 2, step: 0.02,
    tooltip: 'Density of the ring pattern — higher values pack more rings on screen.' },
  { key: 'breathAmplitude', label: 'Breath Amplitude', min: 0, max: 1, step: 0.01,
    tooltip: 'How deeply the mandala "inhales/exhales" radially over time.' },
  { key: 'scatterMultiplier', label: 'Scatter Multiplier', min: 0, max: 200, step: 1, integer: true,
    tooltip: 'Radial push strength driven by the breathing pulse — larger = more dramatic expansion.' },
];

const mandalaAudioControls: MandalaSliderSpec[] = [
  { key: 'bassPulseImpact', label: 'Bass Pulse Impact', min: 0, max: 0.1, step: 0.001,
    tooltip: 'How much the bass inflates the whole grid vertically on every kick.' },
  { key: 'animationBeatLiftStrength', label: 'Beat Lift Strength', min: 0, max: 50, step: 0.5,
    tooltip: 'Magnitude of the radial shockwave that rides out from center on each beat.' },
  { key: 'animationBeatWaveBaseSpeed', label: 'Beat Wave Speed', min: 0, max: 30, step: 0.5,
    tooltip: 'How fast the on-beat shockwave ring travels outward.' },
  { key: 'animationBeatResponse', label: 'Beat Response', min: 0, max: 3, step: 0.05,
    tooltip: 'Overall sensitivity of motion to beat transients.' },
  { key: 'audioTimeWarpMultiplier', label: 'Audio Time Warp', min: 0, max: 2, step: 0.02,
    tooltip: 'Let audio energy speed up internal time — feel the music bend time itself.' },
];

const mandalaNoiseControls: MandalaSliderSpec[] = [
  { key: 'flowPowerScale', label: 'Flow Power', min: 0, max: 50, step: 0.5,
    tooltip: 'How hard simplex-noise flow pushes grid cells radially.' },
  { key: 'noiseScaleBase', label: 'Noise Scale', min: 0, max: 0.05, step: 0.0005,
    tooltip: 'Size of the flow-noise features. Small = broad swells, large = fine turbulence.' },
  { key: 'noiseTimeMult', label: 'Noise Time', min: 0, max: 1, step: 0.01,
    tooltip: 'Speed at which the noise field evolves over time.' },
];

export type Layer = {
  id: string;
  type: 'audio2d' | 'webcamAscii' | 'kinect3d' | 'media';
  mediaUrl?: string;
  mediaType?: 'video' | 'image' | null;
  enabled: boolean;
  settings: VisualSettings;
  opacity: number;
  blendMode: GlobalCompositeOperation;
};

const defaultSettings: VisualSettings = {
  mediaAudioImpact: 0.0,
  mediaInvertDrop: false,
  visualizationMode: 'audio2d',
  gridWidthRatio: 1.0,
  yOffsetRatio: 0.5,
  dotSizeBase: 6,
  amplitudeRatio: 0.8,
  rowSpacingRatio: 0.035,
  colorMode: 'white',
  customColor: '#ffffff',
  backgroundColor: '#000000',
  backgroundOpacity: 1.0,
  // Default to 'glitch' — the kaleidoscopic 8-fold mandala.
  movementStyle: 'glitch',
  // Number of kaleidoscope mirror axes (1-12). 8 = classic mandala.
  symmetryFolds: 8,
  bassThreshold: 0.2,
  midThreshold: 0.4,
  highThreshold: 0.6,
  audioSmoothing: 0.15,
  // Visible motion but not frantic.
  globalSpeed: 1.5,
  bassPulseImpact: 0.025,
  baseBrightness: 0.08,
  glitchIntensity: 10,
  rippleDamping: 0.8,
  // Keep ripple speed strong so rings/spokes visibly flow outward.
  rippleSpeed: 8.0,
  colorWaveDepth: 0.6,
  // Breathing amplitude kept strong so the mandala visibly inhales/exhales.
  breathAmplitude: 0.35,
  // Scatter reduced — it now drives the symmetric radial breath (not asymmetric noise).
  scatterMultiplier: 30,
  audioTimeWarpMultiplier: 0.5,
  terrainMultiplier: 1.5,
  // Sway & skew were asymmetric — their internal paths are now unused, keep at 0
  // so nothing accidentally disturbs symmetry if anyone dials them up.
  swayMultiplier: 0.0,
  skewMultiplier: 0.0,
  trigSinXFreq: 0.5,
  trigCosXFreq: 0.8,
  trigCosXTime: 1.5,
  trigSinDepthXTime: 8.0,
  trigCosZFreq: 0.6,
  trigCosZTime: 1.2,
  trigSinZFreq: 0.5,
  dspFftSize: 2048,
  dspMinDecibels: -80,
  dspMaxDecibels: -10,
  dspBassEnd: 5,
  dspMidsEnd: 40,
  dspHighsEnd: 75,
  dspTransientAttack: 0.95,
  customText: 'ltsdeiw sro le temuggmpndgtble tatodt rroycga hedWidntzed Drveresehe oro trzoeman atspea hntt ms aoe lcoesw fs tcst shr e w tis bhesJul tfo di,s pehayafeotep seotn dngexConditananns giotehesioasowthoawitdcynsmgn a a Cuusco d ot pd t,aTt .sasu .ebeate, i via d t Acr nanscur n how tth ontiediaor or essungattg',
  characterDensity: 1.0,
  characterOpacity: 1.0,
  animationMotionWeight: 1.5,
  animationFlowWeight: 1.8,
  animationBeatThreshold: 0.2,
  animationBeatResponse: 1.2,
  animationBeatBassInfluence: 1.0,
  animationBeatWaveBaseSpeed: 15.0,
  animationBeatSpatialFreq: 0.4,
  animationCenterBias: 0.5,
  animationBeatLiftStrength: 25.0,
  animationBeatSwayStrength: 15.0,
  animationScatterClampBase: 40.0,
  animationScatterClampBoost: 15.0,
  animationTerrainLift: 150.0,
  animationTerrainBeatStrength: 12.0,
  animationScaleResponse: 1.5,
  asciiResolution: 50,
  asciiCharSet: 'standard',
  asciiGlitch: 5,
  asciiAudioImpact: 0.5,
  asciiInvert: false,
  kinectDepthMin: 20,
  kinectDepthMax: 110,
  kinectScalePush: 1.5,
  kinectYPull: 80,
  kinectFluidSpeed: 0.08,
  kinectGlow: 0.8,
  kinectDistortion: 0.1,
  kinectMirror: true,
  kinectOffsetX: 0.0,
  kinectOffsetY: 0.0,
  kinectZoom: 1.0,
  kinectCropLeft: 0.0,
  kinectCropRight: 1.0,
  kinectCropTop: 0.0,
  kinectCropBottom: 1.0,
  kinectSwayAmplitude: 20.0,
  kinectSwaySpeed: 1.0,
  kinectLightTrails: true,
  kinectZAxisColor: true,
  kinectShockwave: true,
  kinectWireframe: false,
  kinectSurveillance: false,
  kinectSurveillanceColor: '#00ffcc',
  kinectSurveillanceOpacity: 0.8,
  kinectSurveillanceSize: 1.2,
  kinectResolution: 1.0,
  // Noise now sampled in polar space (dist, foldedAngle) so it stays symmetric.
  // Lower scales produce broad, slow, kaleidoscopic swells instead of chaos.
  noiseScaleBase: 0.005,
  noiseTimeMult: 0.35,
  flowPowerScale: 5.0,
  scatterIntensityScale: 12.0,
  glitchChance: 0.0,
  glitchChars: "XYZ#%@!$<>{}[]",
  zHueBase: 270,
  zHueShift: -90,
  zLumBase: 40,
  zLumShift: 30,
  bassPowerMul: 1.5,
  midsPowerMul: 2.0,
  highsPowerMul: 2.0,
  springTension: 0.3,
  springFriction: 0.65,
  shapePower: 2.5,
  agcDecayRate: 0.99,
  
  // Procedural Tiles defaults
  tilesSize: 30,
  tilesComplexity: 3,
  tilesRotationSpeed: 0.5,
  tilesAudioScaling: 1.0,
  tilesBassAmount: 0.3,
  tilesMidsAmount: 0.5,
  tilesHighsAmount: 0.2,
  tilesColorVariation: 0.5,
  
  // Fractal Recursion defaults
  fractalDepth: 5,
  fractalRotationSpeed: 0.3,
  fractalZoomScale: 1.0,
  fractalLineWidth: 2,
  fractalAudioDriveAmount: 0.8,
  fractalBassDepth: 0.4,
  fractalMidsRotation: 0.6,
  fractalHighsZoom: 0.3,
  fractalInnerScale: 1.2,
  
  // Geometry Lines defaults
  geometryLineWidth: 2,
  geometryDensity: 8,
  geometryRotationSpeed: 0.4,
  geometryAudioScaling: 1.0,
  geometryBassLines: 0.5,
  geometryMidsIntersection: 0.6,
  geometryHighsPattern: 0.4,
  geometryCentroidInfluence: 0.7,
  geometryComplexity: 4,
  
  // Kinect Server Configuration (all tweakable, zero hardcodes)
  kinectServerDownsamplingFactor: 2, // 1=full 640x480, 2=320x240, 4=160x120
  kinectServerNormalizationDivisor: 8, // Convert 11-bit to 8-bit
  kinectServerFPS: 30, // Frames per second from server
  kinectServerRawBitDepth: 11, // Kinect V1 is 11-bit
  kinectServerDepthMinRaw: 0, // Min raw depth value
  kinectServerDepthMaxRaw: 2048, // Max raw depth value (2^11)
  kinectServerTiltMin: -30, // Motor minimum angle
  kinectServerTiltMax: 30, // Motor maximum angle
  kinectServerLEDEnabled: false, // Enable LED control
  kinectServerLEDColor: 'off', // LED color option
};

export type MidiMapping = {
  cc: number;
  channel: number;
  settingKey: string;
  min: number;
  max: number;
  layerId: string;
};

type FavoriteControlKey = keyof VisualSettings | 'layerOpacity' | 'sensitivity';

type QuickControlDescriptor = {
  key: FavoriteControlKey;
  label: string;
  min: number;
  max: number;
  step: number;
  advanced?: boolean;
  aliases?: string[];
  formatValue: (value: number) => string;
};

type SavedPreset = {
  id: string;
  name: string;
  createdAt: number;
  layerType: Layer['type'];
  settings: VisualSettings;
  opacity: number;
  blendMode: GlobalCompositeOperation;
};

const quickControlDescriptors: QuickControlDescriptor[] = [
  {
    key: 'sensitivity',
    label: 'Input Sensitivity',
    min: 0.1,
    max: 5,
    step: 0.1,
    aliases: ['gain', 'input', 'audio'],
    formatValue: (value) => `${value.toFixed(1)}x`,
  },
  {
    key: 'layerOpacity',
    label: 'Layer Opacity',
    min: 0,
    max: 1,
    step: 0.05,
    aliases: ['blend', 'alpha'],
    formatValue: (value) => `${Math.round(value * 100)}%`,
  },
  {
    key: 'globalSpeed',
    label: 'Animation Speed',
    min: 0,
    max: 5,
    step: 0.1,
    aliases: ['speed', 'tempo', 'motion'],
    formatValue: (value) => `${value.toFixed(1)}x`,
  },
  {
    key: 'amplitudeRatio',
    label: 'Amplitude',
    min: 0.1,
    max: 2,
    step: 0.05,
    aliases: ['height', 'reactivity'],
    formatValue: (value) => value.toFixed(2),
  },
  {
    key: 'bassPulseImpact',
    label: 'Bass Pulse',
    min: 0,
    max: 0.1,
    step: 0.005,
    aliases: ['bass', 'beat', 'pulse'],
    formatValue: (value) => value.toFixed(3),
  },
  {
    key: 'colorWaveDepth',
    label: 'Color Wave Depth',
    min: 0,
    max: 1,
    step: 0.05,
    aliases: ['color', 'hue', 'theme'],
    formatValue: (value) => value.toFixed(2),
  },
  {
    key: 'characterDensity',
    label: 'Character Density',
    min: 0.5,
    max: 2,
    step: 0.05,
    aliases: ['ascii', 'text', 'density'],
    formatValue: (value) => `${value.toFixed(2)}x`,
  },
  {
    key: 'scatterMultiplier',
    label: 'Scatter Jump',
    min: 0,
    max: 200,
    step: 1,
    aliases: ['scatter', 'glitch', 'chaos'],
    formatValue: (value) => value.toFixed(0),
  },
  {
    key: 'animationBeatResponse',
    label: 'Beat Response',
    min: 0,
    max: 2,
    step: 0.05,
    advanced: true,
    aliases: ['animation', 'beat', 'motion'],
    formatValue: (value) => value.toFixed(2),
  },
  {
    key: 'animationMotionWeight',
    label: 'Motion Weight',
    min: 0,
    max: 2,
    step: 0.05,
    advanced: true,
    aliases: ['animation', 'flow', 'weight'],
    formatValue: (value) => value.toFixed(2),
  },
];

const lerp = (min: number, max: number, amount: number) => min + (max - min) * amount;

export default function App() {
  // Check if this is projector mode (opened from projector button)
  const isProjectorMode = new URLSearchParams(window.location.search).get('projector') === 'true';
  
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerCanvasesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const [newMappingKey, setNewMappingKey] = useState('kinectResolution');
  const [newMappingMin, setNewMappingMin] = useState(0);
  const [newMappingMax, setNewMappingMax] = useState(1);

  
  const [layers, setLayers] = useState<Layer[]>(() => {
    try {
      const saved = localStorage.getItem('visualizer_layers');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Sanitize: ensure each layer has valid settings
        return parsed.map((layer: any) => ({
          ...layer,
          settings: {
            ...defaultSettings,
            ...(layer.settings || {}),
            // Ensure critical colors are never corrupted
            backgroundColor: layer.settings?.backgroundColor && String(layer.settings.backgroundColor).match(/^#[\da-f]{6}$/i) 
              ? layer.settings.backgroundColor 
              : defaultSettings.backgroundColor,
            customColor: layer.settings?.customColor && String(layer.settings.customColor).match(/^#[\da-f]{6}$/i)
              ? layer.settings.customColor
              : defaultSettings.customColor,
          }
        }));
      }
    } catch (e) {
      console.warn('Failed to restore layers from localStorage, using defaults:', e);
    }
    return [
      {
        id: 'layer-1',
        type: 'audio2d',
        enabled: true,
        settings: { ...defaultSettings },
        opacity: 1.0,
        blendMode: 'source-over'
      }
    ];
  });

  const [activeLayerId, setActiveLayerId] = useState<string>(layers[0]?.id || 'layer-1');
  const [activeMenu, setActiveMenu] = useState<'source'|'layers'|'params'|'midi'>('layers');

  const activeLayerIndex = layers.findIndex(l => l.id === activeLayerId) !== -1 ? layers.findIndex(l => l.id === activeLayerId) : 0;
  const activeLayer = layers[activeLayerIndex];

  const [controlMode, setControlMode] = useState<'basic' | 'advanced'>(() => {
    try {
      const saved = localStorage.getItem('visualizer_control_mode');
      return saved === 'advanced' ? 'advanced' : 'basic';
    } catch {
      return 'basic';
    }
  });
  const [controlSearch, setControlSearch] = useState('');
  const [favoriteControlKeys, setFavoriteControlKeys] = useState<FavoriteControlKey[]>(() => {
    try {
      const saved = localStorage.getItem('visualizer_favorite_controls');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed as FavoriteControlKey[];
      }
    } catch {
      // Ignore malformed values and fall back to defaults.
    }
    return ['sensitivity', 'globalSpeed', 'characterDensity', 'animationBeatResponse'];
  });

  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>(() => {
    try {
      const saved = localStorage.getItem('visualizer_saved_presets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed as SavedPreset[];
      }
    } catch {
      // Ignore malformed values and fall back to empty list.
    }
    return [];
  });
  const [presetSlotA, setPresetSlotA] = useState('');
  const [presetSlotB, setPresetSlotB] = useState('');
  const [abCompareEnabled, setAbCompareEnabled] = useState(false);
  const [abCompareMs, setAbCompareMs] = useState(900);
  const [lastAppliedPresetId, setLastAppliedPresetId] = useState<string | null>(null);

  const [macroEnergy, setMacroEnergy] = useState(0.5);
  const [macroMotion, setMacroMotion] = useState(0.5);
  const [macroColor, setMacroColor] = useState(0.5);
  const [macroTexture, setMacroTexture] = useState(0.5);

  const [showHud, setShowHud] = useState(true);
  const [showBeatDebug, setShowBeatDebug] = useState(false);
  const [fps, setFps] = useState(0);
  const fpsFrameCounterRef = useRef(0);
  const fpsLastTickRef = useRef(performance.now());

  // ─────────────────────────────────────────────────────────────────────────
  // TOASTS — replaces inline error strings with a dismissible notification.
  // ─────────────────────────────────────────────────────────────────────────
  type ToastKind = 'error' | 'info' | 'success';
  type Toast = { id: number; kind: ToastKind; message: string };
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const pushToast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, kind, message }]);
    // Auto-dismiss after 8s.
    window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 8000);
  }, []);
  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Responsive/narrow-viewport state — on < 900px we hide the sidebar until
  // the user opens it explicitly via the gear icon.
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 900 : false
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsNarrow(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Collapsible section open-state. Groups default to open only when the
  // brief asks (Motion & Flow + Audio Reactivity).
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => ({
    motion: true,
    audio: true,
    appearance: false,
    noise: false,
    symmetry: false,
    advanced: false,
  }));
  const toggleGroup = useCallback((id: string) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Hidden file input for JSON import.
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Help (keyboard shortcut) popover visibility.
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  const mediaElementsRef = useRef<Map<string, HTMLVideoElement | HTMLImageElement>>(new Map());

  // Handle setting up Media elements automatically outside the draw loop
  useEffect(() => {
    layers.forEach(layer => {
      if (layer.type === 'media' && layer.mediaUrl) {
        if (!mediaElementsRef.current.has(layer.id) || (mediaElementsRef.current.get(layer.id) as any)?.src !== layer.mediaUrl) {
          if (layer.mediaType === 'video') {
            const vid = document.createElement('video');
            vid.src = layer.mediaUrl;
            vid.crossOrigin = 'anonymous';
            vid.loop = true;
            vid.muted = true;
            vid.play().catch(e => console.warn('Autoplay prevented:', e));
            mediaElementsRef.current.set(layer.id, vid);
          } else if (layer.mediaType === 'image') {
            const img = new Image();
            img.src = layer.mediaUrl;
            img.crossOrigin = 'anonymous';
            mediaElementsRef.current.set(layer.id, img);
          }
        }
      }
    });

    // Cleanup removed layers
    for (const [id, element] of mediaElementsRef.current.entries()) {
      if (!layers.find(l => l.id === id) || layers.find(l => l.id === id)?.type !== 'media') {
        if (element instanceof HTMLVideoElement) {
          element.pause();
          element.src = '';
        }
        mediaElementsRef.current.delete(id);
      }
    }
  }, [layers]);

  const settings = activeLayer ? activeLayer.settings : defaultSettings;

  const settingsUpdateFrameRef = useRef<number | null>(null);
  const pendingSettingsUpdatesRef = useRef<Array<(s: VisualSettings) => VisualSettings>>([]);
  const settingsTargetLayerIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (settingsUpdateFrameRef.current !== null) {
        cancelAnimationFrame(settingsUpdateFrameRef.current);
        settingsUpdateFrameRef.current = null;
      }
      pendingSettingsUpdatesRef.current = [];
      settingsTargetLayerIdRef.current = null;
    };
  }, []);

  const setSettings = (newSettings: VisualSettings | ((s: VisualSettings) => VisualSettings)) => {
    if (!activeLayer) return;

    const updater = typeof newSettings === 'function' ? newSettings : () => newSettings;
    pendingSettingsUpdatesRef.current.push(updater);
    if (!settingsTargetLayerIdRef.current) {
      settingsTargetLayerIdRef.current = activeLayer.id;
    }

    if (settingsUpdateFrameRef.current === null) {
      settingsUpdateFrameRef.current = requestAnimationFrame(() => {
        const updates = pendingSettingsUpdatesRef.current;
        const targetLayerId = settingsTargetLayerIdRef.current;
        pendingSettingsUpdatesRef.current = [];
        settingsTargetLayerIdRef.current = null;
        settingsUpdateFrameRef.current = null;

        if (!targetLayerId || updates.length === 0) return;

        setLayers(prev => prev.map(l => {
          if (l.id !== targetLayerId) return l;
          let nextSettings = l.settings;
          updates.forEach((fn) => {
            nextSettings = fn(nextSettings);
          });
          if (nextSettings === l.settings) return l;
          return {
            ...l,
            settings: nextSettings,
          };
        }));
      });
    }
  };

  const [activeSource, setActiveSource] = useState<'mic' | 'system'>('mic');
  const [sensitivity, setSensitivity] = useState(() => {
    try {
      const saved = localStorage.getItem('visualizer_sensitivity');
      if (saved) return parseFloat(saved);
    } catch {
      // Ignore localStorage errors.
    }
    return 1;
  });

  const isAdvancedMode = controlMode === 'advanced';
  const normalizedSearch = controlSearch.trim().toLowerCase();
  const matchesSearch = useCallback((...terms: string[]) => {
    if (!normalizedSearch) return true;
    return terms.some((term) => term.toLowerCase().includes(normalizedSearch));
  }, [normalizedSearch]);

  const visibleControlDescriptors = useMemo(
    () => quickControlDescriptors.filter((descriptor) => {
      if (!isAdvancedMode && descriptor.advanced) return false;
      return matchesSearch(descriptor.label, ...(descriptor.aliases ?? []));
    }),
    [isAdvancedMode, matchesSearch]
  );

  const getControlValue = useCallback((key: FavoriteControlKey) => {
    if (!activeLayer) return 0;
    if (key === 'sensitivity') return sensitivity;
    if (key === 'layerOpacity') return activeLayer.opacity;
    return Number(settings[key] ?? 0);
  }, [activeLayer, sensitivity, settings]);

  const setControlValue = useCallback((key: FavoriteControlKey, value: number) => {
    if (!activeLayer) return;
    if (key === 'sensitivity') {
      setSensitivity(value);
      return;
    }
    if (key === 'layerOpacity') {
      setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, opacity: value } : l));
      return;
    }

    const nextValue = key === 'scatterMultiplier' ? Math.round(value) : value;
    setSettings(prev => ({
      ...prev,
      [key]: nextValue,
    }));
  }, [activeLayer, setSettings]);

  const toggleFavoriteControl = useCallback((key: FavoriteControlKey) => {
    setFavoriteControlKeys(prev => {
      if (prev.includes(key)) return prev.filter(item => item !== key);
      return [...prev, key];
    });
  }, []);

  const applyPresetToActiveLayer = useCallback((preset: SavedPreset) => {
    setLayers(prev => prev.map(layer => {
      if (layer.id !== activeLayerId) return layer;
      return {
        ...layer,
        opacity: preset.opacity,
        blendMode: preset.blendMode,
        settings: {
          ...defaultSettings,
          ...preset.settings,
        },
      };
    }));
    setLastAppliedPresetId(preset.id);
  }, [activeLayerId]);

  const saveCurrentPreset = useCallback(() => {
    if (!activeLayer) return;
    const defaultName = `${activeLayer.type.toUpperCase()} ${savedPresets.length + 1}`;
    const input = window.prompt('Preset name', defaultName);
    if (!input) return;

    const newPreset: SavedPreset = {
      id: `preset-${Date.now()}`,
      name: input.trim() || defaultName,
      createdAt: Date.now(),
      layerType: activeLayer.type,
      settings: { ...settings },
      opacity: activeLayer.opacity,
      blendMode: activeLayer.blendMode,
    };
    setSavedPresets(prev => [newPreset, ...prev].slice(0, 64));
    setLastAppliedPresetId(newPreset.id);
  }, [activeLayer, savedPresets.length, settings]);

  const removePreset = useCallback((presetId: string) => {
    setSavedPresets(prev => prev.filter(preset => preset.id !== presetId));
    setPresetSlotA(prev => prev === presetId ? '' : prev);
    setPresetSlotB(prev => prev === presetId ? '' : prev);
    setLastAppliedPresetId(prev => prev === presetId ? null : prev);
  }, []);

  const compatiblePresets = useMemo(() => {
    if (!activeLayer) return savedPresets;
    return savedPresets.filter(preset => preset.layerType === activeLayer.type);
  }, [activeLayer, savedPresets]);

  const activePresetLabel = useMemo(() => {
    if (!lastAppliedPresetId) return 'Manual';
    const preset = savedPresets.find(item => item.id === lastAppliedPresetId);
    return preset ? preset.name : 'Manual';
  }, [lastAppliedPresetId, savedPresets]);

  const favoriteDescriptors = useMemo(
    () => visibleControlDescriptors.filter(descriptor => favoriteControlKeys.includes(descriptor.key)),
    [visibleControlDescriptors, favoriteControlKeys]
  );

  const setMacroEnergyValue = useCallback((value: number) => {
    setMacroEnergy(value);
    setSettings(prev => ({
      ...prev,
      amplitudeRatio: lerp(0.2, 1.9, value),
      bassPulseImpact: lerp(0.002, 0.08, value),
      animationBeatLiftStrength: lerp(8, 28, value),
    }));
  }, [setSettings]);

  const setMacroMotionValue = useCallback((value: number) => {
    setMacroMotion(value);
    setSettings(prev => ({
      ...prev,
      globalSpeed: lerp(0.6, 3.2, value),
      animationMotionWeight: lerp(0.5, 1.8, value),
      animationFlowWeight: lerp(0.5, 1.6, value),
    }));
  }, [setSettings]);

  const setMacroColorValue = useCallback((value: number) => {
    setMacroColor(value);
    setSettings(prev => ({
      ...prev,
      colorWaveDepth: lerp(0.05, 1.0, value),
      baseBrightness: lerp(0.02, 0.25, value),
    }));
  }, [setSettings]);

  const setMacroTextureValue = useCallback((value: number) => {
    setMacroTexture(value);
    setSettings(prev => ({
      ...prev,
      scatterMultiplier: Math.round(lerp(15, 190, value)),
      glitchIntensity: Math.round(lerp(2, 45, value)),
    }));
  }, [setSettings]);

  // ─────────────────────────────────────────────────────────────────────────
  // MANDALA / MOVEMENT HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /** Reset a single parameter to its documented default. */
  const resetSetting = useCallback((key: keyof VisualSettings) => {
    setSettings(prev => ({ ...prev, [key]: (defaultSettings as any)[key] }));
  }, [setSettings]);

  /** Apply a mandala-mood preset to the currently active layer. */
  const applyMandalaPreset = useCallback((preset: MandalaPreset) => {
    setSettings(prev => ({ ...prev, ...preset.settings }));
    pushToast(`${preset.emoji} ${preset.name} loaded`, 'success');
  }, [setSettings, pushToast]);

  /** Cycle through mandala presets — bound to the P shortcut. */
  const [mandalaPresetIndex, setMandalaPresetIndex] = useState(0);
  const cycleMandalaPreset = useCallback(() => {
    const next = (mandalaPresetIndex + 1) % mandalaPresets.length;
    setMandalaPresetIndex(next);
    applyMandalaPreset(mandalaPresets[next]);
  }, [mandalaPresetIndex, applyMandalaPreset]);

  /** Cycle through movementStyle options — bound to the M shortcut. */
  const movementStyles = useMemo<VisualSettings['movementStyle'][]>(() =>
    ['ripple', 'wave', 'matrix', 'glitch', 'orbit', 'tunnel', 'pulse', 'static'], []);
  const cycleMovementStyle = useCallback(() => {
    setSettings(prev => {
      const idx = movementStyles.indexOf(prev.movementStyle);
      const next = movementStyles[(idx + 1) % movementStyles.length];
      pushToast(`Movement: ${next}`, 'info');
      return { ...prev, movementStyle: next };
    });
  }, [movementStyles, setSettings, pushToast]);

  /** Replace the active layer's settings with the baked defaults. */
  const loadAllDefaults = useCallback(() => {
    if (!activeLayer) return;
    if (!window.confirm('Reset ALL visual settings on this layer to defaults?')) return;
    setLayers(prev => prev.map(l => l.id === activeLayer.id
      ? { ...l, settings: { ...defaultSettings } }
      : l));
    pushToast('Defaults restored', 'success');
  }, [activeLayer, pushToast]);

  /** Download the current layer's settings as a JSON file. */
  const exportSettingsJson = useCallback(() => {
    if (!activeLayer) return;
    try {
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        layerType: activeLayer.type,
        opacity: activeLayer.opacity,
        blendMode: activeLayer.blendMode,
        settings,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mandala-settings-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      pushToast('Settings exported', 'success');
    } catch (err) {
      pushToast(`Export failed: ${err instanceof Error ? err.message : err}`, 'error');
    }
  }, [activeLayer, settings, pushToast]);

  /** Read a JSON file and merge it into the active layer's settings. */
  const handleImportFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result ?? '{}'));
        const imported = (data.settings ?? data) as Partial<VisualSettings>;
        setSettings(prev => ({ ...prev, ...imported }));
        if (typeof data.opacity === 'number' && activeLayer) {
          setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, opacity: data.opacity } : l));
        }
        if (typeof data.blendMode === 'string' && activeLayer) {
          setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, blendMode: data.blendMode } : l));
        }
        pushToast('Settings imported', 'success');
      } catch (err) {
        pushToast(`Import failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
      }
    };
    reader.onerror = () => pushToast('Could not read file', 'error');
    reader.readAsText(file);
    // Reset so importing the same file twice still triggers onChange.
    e.target.value = '';
  }, [activeLayer, setSettings, pushToast]);

  /** Pick random-but-sensible mandala values. */
  const randomizeMandala = useCallback(() => {
    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    const pickStyle = () =>
      movementStyles[Math.floor(Math.random() * movementStyles.length)];
    setSettings(prev => ({
      ...prev,
      movementStyle: pickStyle(),
      symmetryFolds: Math.round(rand(4, 12)),
      globalSpeed: rand(0.6, 3),
      rippleSpeed: rand(3, 16),
      rippleDamping: rand(0.4, 1.4),
      breathAmplitude: rand(0.15, 0.6),
      scatterMultiplier: Math.round(rand(15, 120)),
      bassPulseImpact: rand(0.01, 0.06),
      animationBeatLiftStrength: rand(10, 40),
      animationBeatResponse: rand(0.8, 2.2),
      animationBeatWaveBaseSpeed: rand(8, 24),
      audioTimeWarpMultiplier: rand(0.2, 1.2),
      flowPowerScale: rand(2, 25),
      noiseScaleBase: rand(0.002, 0.02),
      noiseTimeMult: rand(0.15, 0.7),
    }));
    pushToast('🎲 Randomized', 'success');
  }, [setSettings, movementStyles, pushToast]);

  /** Save settings to localStorage — used by Ctrl/Cmd+S / S shortcut / toolbar. */
  const saveSettingsToLocal = useCallback(() => {
    try {
      localStorage.setItem('visualizer_layers', JSON.stringify(layers));
      localStorage.setItem('visualizer_sensitivity', sensitivity.toString());
      pushToast('Settings saved locally', 'success');
    } catch (err) {
      pushToast(`Save failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  }, [layers, sensitivity, pushToast]);

  /** Read the currently-typed value for a given VisualSettings key. */
  const readSetting = useCallback((key: keyof VisualSettings): number => {
    const raw = (settings as any)[key];
    if (typeof raw === 'number') return raw;
    const def = (defaultSettings as any)[key];
    return typeof def === 'number' ? def : 0;
  }, [settings]);

  const audioEngineConfig = {
    springTension: settings.springTension ?? 0.3,
    springFriction: settings.springFriction ?? 0.65,
    shapePower: settings.shapePower ?? 2.5,
    agcDecayRate: settings.agcDecayRate ?? 0.99,
    dspFftSize: settings.dspFftSize ?? 2048,
    dspMinDecibels: settings.dspMinDecibels ?? -80,
    dspMaxDecibels: settings.dspMaxDecibels ?? -10,
    dspBassEnd: settings.dspBassEnd ?? 5,
    dspMidsEnd: settings.dspMidsEnd ?? 40,
    dspHighsEnd: settings.dspHighsEnd ?? 75,
    dspTransientAttack: settings.dspTransientAttack ?? 0.95,
  };

  const analyzerMetricsUpdateMs = activeMenu === 'source' || showHud ? 140 : 360;

  const { start: startMic, stop: stopMic, frame: micFrame, isRunning: micIsRunning, error: micError, metrics: micMetrics } = useMicrophoneAnalyzer(settings.audioSmoothing, audioEngineConfig, analyzerMetricsUpdateMs);
  const { start: startSystem, stop: stopSystem, frame: systemFrame, isRunning: systemIsRunning, metrics: systemMetrics } = useSystemAudioAnalyzer(settings.audioSmoothing, audioEngineConfig, analyzerMetricsUpdateMs);
  
  const { start: startWebcam, stop: stopWebcam, isRunning: webcamIsRunning, videoRef } = useWebcam();
  const {
    start: startKinect,
    isRunning: kinectIsRunning,
    depthFrameRef,
    depthFrameSizeRef,
    connectionStatus: kinectStatus,
    setTilt: sendTiltKinect,
    updateServerConfig: sendKinectConfig,
    setLED: sendKinectLED,
  } = useKinect();

  const [kinectTilt, setKinectTilt] = useState(0);

  const { midiStatus, lastMessage, djStateRef } = useDjMidi();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const isResizingSidebarRef = useRef(false);
  const sidebarResizeStartXRef = useRef(0);
  const sidebarResizeStartWidthRef = useRef(320);
  const [globalBlackout, setGlobalBlackout] = useState(false);
  const [globalScanlines, setGlobalScanlines] = useState(false);
  const [globalGlitch, setGlobalGlitch] = useState(false);
  const [projectorMode, setProjectorMode] = useState(false);
  const [projectorLift, setProjectorLift] = useState(0.18);
  const [projectorWhiteCap, setProjectorWhiteCap] = useState(0.9);
  const [projectorSafeFrame, setProjectorSafeFrame] = useState(0.04);
  
  // BPM State
  const [bpm, setBpm] = useState(120);
  const [_tapTimes, setTapTimes] = useState<number[]>([]);
  
  const handleTempoTap = () => {
    const now = Date.now();
    setTapTimes(prev => {
      const times = [...prev, now].filter(t => now - t < 3000); // keep last 3 seconds of taps
      if (times.length >= 2) {
        const diffs = [];
        for (let i = 1; i < times.length; i++) {
          diffs.push(times[i] - times[i-1]);
        }
        const avgMs = diffs.reduce((a,b) => a+b, 0) / diffs.length;
        const newBpm = Math.round(60000 / avgMs);
        if (newBpm > 40 && newBpm < 300) setBpm(newBpm);
      }
      return times;
    });
  };

  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>(() => {
    return localStorage.getItem('visualizer_audio_device') ?? '';
  });

  // Surface microphone errors through the toast system instead of leaving
  // raw error text in the button row.
  useEffect(() => {
    if (micError) pushToast(micError, 'error');
  }, [micError, pushToast]);

  const refreshAudioInputs = useCallback(async (requestLabels = false) => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    if (requestLabels && navigator.mediaDevices.getUserMedia) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        // Ignore permission errors; still try to enumerate.
      }
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter(d => d.kind === 'audioinput');
      setAudioInputDevices(inputs);
    } catch {
      // Ignore enumeration failures.
    }
  }, []);

  useEffect(() => {
    void refreshAudioInputs();
  }, [refreshAudioInputs]);

  useEffect(() => {
    localStorage.setItem('visualizer_audio_device', selectedAudioDevice);
  }, [selectedAudioDevice]);

  useEffect(() => {
    if (!audioInputDevices.length) return;
    if (selectedAudioDevice && !audioInputDevices.some(device => device.deviceId === selectedAudioDevice)) {
      setSelectedAudioDevice('');
    }
  }, [audioInputDevices, selectedAudioDevice]);

  useEffect(() => {
    localStorage.setItem('visualizer_control_mode', controlMode);
  }, [controlMode]);

  useEffect(() => {
    localStorage.setItem('visualizer_favorite_controls', JSON.stringify(favoriteControlKeys));
  }, [favoriteControlKeys]);

  useEffect(() => {
    localStorage.setItem('visualizer_saved_presets', JSON.stringify(savedPresets));
  }, [savedPresets]);

  useEffect(() => {
    if (!abCompareEnabled || !presetSlotA || !presetSlotB) return;
    let showA = true;
    const intervalId = window.setInterval(() => {
      const idToApply = showA ? presetSlotA : presetSlotB;
      const preset = compatiblePresets.find(item => item.id === idToApply);
      if (preset) {
        applyPresetToActiveLayer(preset);
      }
      showA = !showA;
    }, Math.max(250, abCompareMs));

    return () => window.clearInterval(intervalId);
  }, [abCompareEnabled, presetSlotA, presetSlotB, abCompareMs, compatiblePresets, applyPresetToActiveLayer]);

  useEffect(() => {
    if (!compatiblePresets.length) {
      setPresetSlotA('');
      setPresetSlotB('');
      setAbCompareEnabled(false);
      return;
    }
    if (presetSlotA && !compatiblePresets.some(preset => preset.id === presetSlotA)) {
      setPresetSlotA('');
    }
    if (presetSlotB && !compatiblePresets.some(preset => preset.id === presetSlotB)) {
      setPresetSlotB('');
    }
  }, [compatiblePresets, presetSlotA, presetSlotB]);
  
  const [midiMappings, setMidiMappings] = useState<MidiMapping[]>(() => {
    try {
      const saved = localStorage.getItem('visualizer_midi');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return [];
  });
  const [learningMidi, setLearningMidi] = useState<Partial<MidiMapping> | null>(null);

  useEffect(() => {
    if (!lastMessage) return;

    if (learningMidi) {
      if (lastMessage.note > 0) {
        const newMapping: MidiMapping = {
          cc: lastMessage.note,
          channel: lastMessage.channel,
          settingKey: learningMidi.settingKey!,
          min: learningMidi.min!,
          max: learningMidi.max!,
          layerId: learningMidi.layerId!
        };
        
        setMidiMappings(prev => {
          const updated = [...prev.filter(p => !(p.cc === newMapping.cc && p.channel === newMapping.channel)), newMapping];
          localStorage.setItem('visualizer_midi', JSON.stringify(updated));
          return updated;
        });
        setLearningMidi(null);
      }
      return;
    }

    const mapping = midiMappings.find(m => m.cc === lastMessage.note && m.channel === lastMessage.channel);
    if (mapping) {
      const ratio = lastMessage.velocity / 127;
      const val = mapping.min + (ratio * (mapping.max - mapping.min));
      
      setLayers(prev => prev.map(l => {
        if (l.id === mapping.layerId) {
          if (mapping.settingKey === 'layerOpacity') {
            return { ...l, opacity: val };
          }
          return {
            ...l,
            settings: { ...l.settings, [mapping.settingKey]: val }
          };
        }
        return l;
      }));
    }
  }, [lastMessage]); // We intentionally do not use midiMappings in dependencies here, but it works because lastMessage updates on every turn anyway.

  
  const layersRef = useRef(layers);
  const sensitivityRef = useRef(sensitivity);
  
  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  useEffect(() => {
    const usingWebcam = layers.some(l => l.enabled && l.type === 'webcamAscii');
    if (usingWebcam && !webcamIsRunning) {
      startWebcam();
    }
  }, [layers, webcamIsRunning, startWebcam]);

  // Automatically start Kinect whenever app loads
  useEffect(() => {
    startKinect();
  }, [startKinect]);

  const toggleFullscreen = () => {
    console.log('toggleFullscreen called');
    
    // Simple fallback: just toggle the isFullscreen state to hide sidebar
    // This works even if browser fullscreen API is blocked
    if (!isFullscreen) {
      console.log('Entering pseudo-fullscreen mode (hiding sidebar)');
      setIsFullscreen(true);
      
      // Also try real fullscreen API if available
      const element = stageRef.current;
      if (element && element.requestFullscreen) {
        console.log('Also attempting browser fullscreen...');
        element.requestFullscreen().catch(err => {
          console.warn('Browser fullscreen blocked, using sidebar-hide mode instead:', err);
        });
      }
    } else {
      console.log('Exiting fullscreen mode');
      setIsFullscreen(false);
      
      // Exit browser fullscreen if active
      if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(err => console.warn('Exit fullscreen failed:', err));
        }
      }
    }
  };

  const openProjectorWindow = () => {
    // Open a new window with just the canvas for projector output
    const projectorUrl = window.location.origin + window.location.pathname + '?projector=true';
    const projectorWindow = window.open(
      projectorUrl,
      'ProjectorOutput',
      'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no'
    );
    
    if (projectorWindow) {
      console.log('Projector window opened');
    } else {
      alert('Please allow popups for this site to use projector mode');
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      console.log('handleFullscreenChange triggered');
      // PHASE 1 FIX: Check all vendor-prefixed fullscreen elements
      const isFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      console.log('isFullscreen:', isFullscreen);
      console.log('document.fullscreenElement:', document.fullscreenElement);
      setIsFullscreen(isFullscreen);
    };
    
    // PHASE 1 FIX: Add all vendor-prefixed event listeners
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

  // ───────────────────────────────────────────────────────────────────────
  // GLOBAL KEYBOARD SHORTCUTS
  //   Space — play/pause input (mic/system audio)
  //   F     — fullscreen toggle
  //   P     — cycle mandala preset
  //   M     — cycle movementStyle
  //   S     — save settings
  //   R     — randomize mandala
  //   ?     — toggle shortcuts help popover
  //   Esc   — exit fullscreen / close help
  // Shortcuts are ignored while the user is typing inside an input/textarea.
  // ───────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      const tag = tgt?.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tgt?.isContentEditable;

      if (e.key === 'Escape') {
        if (showShortcutsHelp) { setShowShortcutsHelp(false); return; }
        if (isFullscreen) { setIsFullscreen(false); return; }
        if (mobileSidebarOpen) { setMobileSidebarOpen(false); return; }
      }

      if (isTyping) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'spacebar': {
          e.preventDefault();
          // Play/pause input — start whichever matches the current source, or
          // stop both if any is running.
          if (micIsRunning || systemIsRunning) {
            stopMic();
            stopSystem();
            pushToast('Input paused', 'info');
          } else if (activeSource === 'mic') {
            startMic(selectedAudioDevice);
            pushToast('Microphone input started', 'info');
          } else {
            startSystem();
            pushToast('System audio started', 'info');
          }
          break;
        }
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'p':
          e.preventDefault();
          cycleMandalaPreset();
          break;
        case 'm':
          e.preventDefault();
          cycleMovementStyle();
          break;
        case 's':
          e.preventDefault();
          saveSettingsToLocal();
          break;
        case 'r':
          e.preventDefault();
          randomizeMandala();
          break;
        case '?':
        case '/':
          if (e.shiftKey || e.key === '?') {
            e.preventDefault();
            setShowShortcutsHelp(prev => !prev);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isFullscreen, mobileSidebarOpen, showShortcutsHelp,
    micIsRunning, systemIsRunning, activeSource, selectedAudioDevice,
    startMic, stopMic, startSystem, stopSystem,
    cycleMandalaPreset, cycleMovementStyle, saveSettingsToLocal, randomizeMandala,
    pushToast,
  ]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizingSidebarRef.current) return;
      const delta = event.clientX - sidebarResizeStartXRef.current;
      const nextWidth = Math.min(520, Math.max(260, sidebarResizeStartWidthRef.current + delta));
      setSidebarWidth(nextWidth);
    };

    const handleMouseUp = () => {
      if (!isResizingSidebarRef.current) return;
      isResizingSidebarRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const renderLoop = useCallback(() => {
    if (canvasRef.current && djStateRef.current) {
      const parent = canvasRef.current.parentElement;
      if (parent) {
        if (canvasRef.current!.width !== parent.clientWidth || canvasRef.current!.height !== parent.clientHeight) {
          canvasRef.current!.width = parent.clientWidth;
          canvasRef.current!.height = parent.clientHeight;
        }
      }
      
      const currentData = activeSource === 'mic' && micFrame.current 
        ? micFrame.current 
        : systemFrame.current;

      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);

                layersRef.current.forEach(layer => {
          if (!layer.enabled) return;

          // Per-layer offscreen canvas to isolate internal 'source-over' modifications inside drawVisualizer
          let lCanvas = layerCanvasesRef.current.get(layer.id);
          if (!lCanvas) {
            lCanvas = document.createElement('canvas');
            layerCanvasesRef.current.set(layer.id, lCanvas);
          }
          if (lCanvas.width !== canvasRef.current!.width) lCanvas.width = canvasRef.current!.width;
          if (lCanvas.height !== canvasRef.current!.height) lCanvas.height = canvasRef.current!.height;
          
          const lCtx = lCanvas.getContext('2d');
          if (!lCtx) return;

          if (layer.type === 'audio2d') {
            if (layer.settings.visualizationMode === 'tiles') {
              drawTiles(lCtx, currentData, layer.settings);
            } else if (layer.settings.visualizationMode === 'fractal') {
              drawFractal(lCtx, currentData, layer.settings);
            } else if (layer.settings.visualizationMode === 'geometry') {
              drawGeometry(lCtx, currentData, layer.settings);
            } else {
              // Default audio2d
              drawVisualizer(lCtx, lCanvas, currentData, {
                sensitivity: sensitivityRef.current,
                djState: djStateRef.current,
                settings: layer.settings,
                kinectDepthFrame: depthFrameRef.current,
                kinectDepthSize: depthFrameSizeRef.current,
              });
            }
          } else if (layer.type === 'webcamAscii' && videoRef.current && videoRef.current.readyState >= 2) {
            drawAsciiWebcam(lCtx, lCanvas, videoRef.current, currentData, {
              sensitivity: sensitivityRef.current,
              settings: layer.settings,
            });
          } else if (layer.type === 'kinect3d') {
            drawKinect3D(lCtx, lCanvas, depthFrameRef.current, currentData, {
              sensitivity: sensitivityRef.current,
              settings: layer.settings,
              frameSize: depthFrameSizeRef.current,
            });
          } else if (layer.type === 'media') {
            const mediaEl = mediaElementsRef.current.get(layer.id);
            if (mediaEl) {
              drawMedia(lCtx, lCanvas, mediaEl, layer.settings, currentData);
            }
          }

          // Composite isolated layer securely to main canvas
          ctx.globalAlpha = layer.opacity;
          ctx.globalCompositeOperation = layer.blendMode;
          ctx.drawImage(lCanvas, 0, 0);
        });
        
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
        
        // POST-FX: Scanlines
        if (globalScanlines) {
          ctx.globalAlpha = 0.15;
          ctx.fillStyle = '#ffffff';
          for (let y = 0; y < canvasRef.current.height; y += 4) {
             ctx.fillRect(0, y, canvasRef.current.width, 1);
          }
          ctx.globalAlpha = 1.0;
        }

        // POST-FX: Global Glitch
        if (globalGlitch && currentData && currentData.bass > 0.4) {
          ctx.globalCompositeOperation = 'difference';
          ctx.drawImage(canvasRef.current, Math.random() * 20 - 10, 0); // Horizontal tear
          ctx.globalCompositeOperation = 'source-over';
        }
      }

      const now = performance.now();
      if (showHud) {
        fpsFrameCounterRef.current += 1;
        if (now - fpsLastTickRef.current >= 500) {
          const elapsed = now - fpsLastTickRef.current;
          const nextFps = Math.round((fpsFrameCounterRef.current * 1000) / elapsed);
          setFps(nextFps);
          fpsFrameCounterRef.current = 0;
          fpsLastTickRef.current = now;
        }
      } else {
        fpsFrameCounterRef.current = 0;
        fpsLastTickRef.current = now;
      }
    }
  }, [micFrame, systemFrame, activeSource, djStateRef, videoRef, globalBlackout, globalScanlines, globalGlitch, showHud]);

  useEffect(() => {
    let loopId: number;
    const loop = () => {
      renderLoop();
      loopId = requestAnimationFrame(loop);
    };
    loopId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(loopId);
  }, [renderLoop]);

  // Send Kinect server config updates when settings change
  useEffect(() => {
    if (kinectIsRunning) {
      sendKinectConfig(settings);
    }
  }, [
    kinectIsRunning,
    sendKinectConfig,
    settings.kinectServerDownsamplingFactor,
    settings.kinectServerNormalizationDivisor,
    settings.kinectServerFPS,
    settings.kinectServerRawBitDepth,
    settings.kinectServerDepthMinRaw,
    settings.kinectServerDepthMaxRaw,
    settings.kinectServerTiltMin,
    settings.kinectServerTiltMax,
  ]);

  // Send LED updates
  useEffect(() => {
    if (kinectIsRunning && settings.kinectServerLEDEnabled) {
      sendKinectLED(settings.kinectServerLEDColor);
    }
  }, [kinectIsRunning, settings.kinectServerLEDEnabled, settings.kinectServerLEDColor, sendKinectLED]);

  const liveMetrics = activeSource === 'mic' ? micMetrics : systemMetrics;
  const clipWarning = liveMetrics.peak > 0.95 || liveMetrics.level > 0.95;

  // ───────────────────────────────────────────────────────────────────────
  // Inline helpers rendering the new mandala controls. Defined inside the
  // component so they can close over `settings`, `resetSetting`, etc.
  // ───────────────────────────────────────────────────────────────────────
  const formatSliderValue = (spec: MandalaSliderSpec, value: number): string => {
    if (spec.format) return spec.format(value);
    if (spec.integer) return value.toFixed(0);
    // Derive a sensible decimal count from the step size.
    const stepStr = String(spec.step);
    const dot = stepStr.indexOf('.');
    const decimals = dot === -1 ? 0 : Math.min(4, stepStr.length - dot - 1);
    return value.toFixed(decimals);
  };

  const renderMandalaSlider = (spec: MandalaSliderSpec) => {
    const value = readSetting(spec.key);
    const defaultValue = Number((defaultSettings as any)[spec.key] ?? 0);
    const isAtDefault = Math.abs(value - defaultValue) < (spec.step / 2);
    return (
      <div key={`mandala-slider-${spec.key}`} className="mandala-slider-row">
        <div className="mandala-slider-head">
          <label className="mandala-slider-label" title={spec.tooltip}>
            {spec.label}
            <span className="mandala-slider-info" title={spec.tooltip} aria-label={spec.tooltip}>ⓘ</span>
          </label>
          <div className="mandala-slider-value-group">
            <span className="mandala-slider-value">{formatSliderValue(spec, value)}</span>
            <button
              type="button"
              className="mandala-reset-btn"
              disabled={isAtDefault}
              title={`Reset to default (${formatSliderValue(spec, defaultValue)})`}
              onClick={() => resetSetting(spec.key)}
            >
              ↺
            </button>
          </div>
        </div>
        <input
          type="range"
          min={spec.min}
          max={spec.max}
          step={spec.step}
          value={value}
          onChange={(e) => {
            const raw = parseFloat(e.target.value);
            const next = spec.integer ? Math.round(raw) : raw;
            setSettings(prev => ({ ...prev, [spec.key]: next }));
          }}
        />
        <div className="mandala-slider-minmax">
          <span>{formatSliderValue(spec, spec.min)}</span>
          <span>{formatSliderValue(spec, spec.max)}</span>
        </div>
      </div>
    );
  };

  const renderCollapsibleSection = (
    id: string,
    icon: string,
    title: string,
    body: React.ReactNode
  ) => {
    const open = !!openGroups[id];
    return (
      <section key={`mandala-section-${id}`} className={`mandala-section ${open ? 'open' : 'closed'}`}>
        <button
          type="button"
          className="mandala-section-header"
          aria-expanded={open}
          onClick={() => toggleGroup(id)}
        >
          <span className="mandala-section-title">
            <span className="mandala-section-icon">{icon}</span>
            {title}
          </span>
          <span className={`mandala-chevron ${open ? 'open' : ''}`} aria-hidden>▾</span>
        </button>
        {open && <div className="mandala-section-body">{body}</div>}
      </section>
    );
  };

  return (
    <div
      className={`app-shell ${isNarrow ? 'is-narrow' : ''} ${isNarrow && mobileSidebarOpen ? 'sidebar-open' : ''}`}
      ref={containerRef}
      style={(isFullscreen || isProjectorMode) ? { backgroundColor: '#000', display: 'block', padding: 0, cursor: 'none' } : {}}
    >
      {!isFullscreen && !isProjectorMode && (!isNarrow || mobileSidebarOpen) && (
        <aside
          className={`sidebar ${isNarrow ? 'sidebar--overlay' : ''}`}
          style={isNarrow
            ? undefined
            : { width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth }}
        >
          {isNarrow && (
            <button
              type="button"
              className="sidebar-close"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close settings"
              title="Close settings"
            >✕</button>
          )}
          <nav className="sidebar-nav">
            <button className={`nav-button ${activeMenu === 'source' ? 'is-active' : ''}`} onClick={() => setActiveMenu('source')}>Global</button>
            <button className={`nav-button ${activeMenu === 'layers' ? 'is-active' : ''}`} onClick={() => setActiveMenu('layers')}>Scene</button>
            <button className={`nav-button ${activeMenu === 'params' ? 'is-active' : ''}`} onClick={() => setActiveMenu('params')}>Visuals</button>
            <button className={`nav-button ${activeMenu === 'midi' ? 'is-active' : ''}`} onClick={() => setActiveMenu('midi')}>Midi</button>
          </nav>
          <div
            className="sidebar-resizer"
            onMouseDown={(event) => {
              isResizingSidebarRef.current = true;
              sidebarResizeStartXRef.current = event.clientX;
              sidebarResizeStartWidthRef.current = sidebarWidth;
              document.body.style.cursor = 'col-resize';
              document.body.style.userSelect = 'none';
            }}
          />
          <div className="sidebar-content">
          {activeMenu === 'source' && (
          <div className="card">
            <strong style={{ opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem', marginBottom: '8px', display: 'block' }}>Global Routing & Audio</strong>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <AudioMonitor metrics={activeSource === 'mic' ? micMetrics : systemMetrics} />
            </div>

            <div className="flex gap-2 mt" style={{ marginBottom: 16 }}>
              <select
                 value={selectedAudioDevice}
                 onChange={(e) => {
                   const nextDevice = e.target.value;
                   setSelectedAudioDevice(nextDevice);
                   if (micIsRunning) startMic(nextDevice);
                 }}
                 style={{ padding: '4px', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px', maxWidth: '200px' }}
              >
                 <option value="">-- Default Input --</option>
                 {audioInputDevices.map(d => (
                   <option key={d.deviceId} value={d.deviceId}>{d.label || `Input (${d.deviceId.substring(0, 5)})`}</option>
                 ))}
              </select>
              <button className="outline" onClick={() => refreshAudioInputs(true)}>Refresh Devices</button>
              <button 
                className="primary" 
                onClick={async () => {
                  stopSystem(); 
                  setActiveSource('mic'); 
                  // Request permission to expose device labels when needed.
                  if (audioInputDevices.length > 0 && !audioInputDevices[0].label) {
                    await refreshAudioInputs(true);
                  }
                  startMic(selectedAudioDevice);
                }}
              >Start Input</button>
              <button className="primary outline" onClick={() => {
                console.log('Capture System Audio button clicked');
                stopMic();
                setActiveSource('system');
                startSystem();
              }}>Capture System Audio</button>
              <button onClick={() => { stopMic(); stopSystem(); stopWebcam(); }}>Stop All</button>
              {/* Errors surface via the toast system at the bottom-right of the stage. */}

              <button onClick={saveSettingsToLocal} className="primary">
                Save Settings
              </button>
              <button onClick={toggleFullscreen} className="outline">Fullscreen</button>
              <button
                onClick={openProjectorWindow}
                className="outline"
                style={{ background: '#8b5cf6', color: '#fff', borderColor: '#8b5cf6' }}
              >
                🎥 Open Projector Output
              </button>
              <button
                onClick={() => setShowBeatDebug(!showBeatDebug)}
                className="outline"
                style={{ background: showBeatDebug ? '#ffcc00' : 'transparent', color: showBeatDebug ? '#000' : '#fff', borderColor: showBeatDebug ? '#ffcc00' : '#555' }}
              >
                {showBeatDebug ? 'Hide' : 'Show'} Beat Debug
              </button>
            </div>
            
            <div style={{ marginTop: '1.5rem', marginBottom: '1rem', borderTop: '1px dashed #333', paddingTop: '1rem' }}>
              <strong style={{ opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem', display: 'block', marginBottom: '8px' }}>Global Post-FX (VJ Shaders)</strong>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="toggle-label" style={{ background: globalBlackout ? '#2a1a1a' : '#1c1c1e', borderColor: globalBlackout ? '#ff4444' : '#333' }}>
                  <span>Master Panic (Spacebar)</span>
                  <input type="checkbox" className="toggle-input toggle-input-red" checked={globalBlackout} onChange={() => setGlobalBlackout(p => !p)} />
                  <div className="toggle-switch"></div>
                </label>

                <label className="toggle-label" style={{ background: globalScanlines ? '#2a261a' : '#1c1c1e', borderColor: globalScanlines ? '#ffcc00' : '#333' }}>
                  <span>CRT Scanlines</span>
                  <input type="checkbox" className="toggle-input" checked={globalScanlines} onChange={() => setGlobalScanlines(p => !p)} />
                  <div className="toggle-switch"></div>
                </label>
                
                <label className="toggle-label" style={{ background: globalGlitch ? '#2a261a' : '#1c1c1e', borderColor: globalGlitch ? '#ffcc00' : '#333' }}>
                  <span>RGB Bass Glitch</span>
                  <input type="checkbox" className="toggle-input" checked={globalGlitch} onChange={() => setGlobalGlitch(p => !p)} />
                  <div className="toggle-switch"></div>
                </label>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', marginBottom: '1rem', borderTop: '1px dashed #333', paddingTop: '1rem' }}>
              <strong style={{ opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem', display: 'block', marginBottom: '8px' }}>Projector Mode</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="toggle-label" style={{ background: projectorMode ? '#1a1a1a' : '#111', borderColor: projectorMode ? '#ffffff' : '#333' }}>
                  <span>Enable Projector Compensation</span>
                  <input type="checkbox" className="toggle-input" checked={projectorMode} onChange={() => setProjectorMode(prev => !prev)} />
                  <div className="toggle-switch"></div>
                </label>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Black Lift: {(projectorLift * 100).toFixed(0)}%</label>
                  <input type="range" min="0" max="0.6" step="0.02" value={projectorLift} onChange={(e) => setProjectorLift(parseFloat(e.target.value))} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>White Cap: {(projectorWhiteCap * 100).toFixed(0)}%</label>
                  <input type="range" min="0.4" max="1" step="0.02" value={projectorWhiteCap} onChange={(e) => setProjectorWhiteCap(parseFloat(e.target.value))} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Safe Frame: {(projectorSafeFrame * 100).toFixed(1)}%</label>
                  <input type="range" min="0" max="0.1" step="0.005" value={projectorSafeFrame} onChange={(e) => setProjectorSafeFrame(parseFloat(e.target.value))} style={{ width: '100%' }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', marginBottom: '1rem', borderTop: '1px dashed #333', paddingTop: '1rem' }}>
               <strong style={{ opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                   <span>Tempo Sync (BPM)</span>
                   <span style={{ color: '#10b981' }}>{bpm} BPM</span>
               </strong>
               <button 
                    style={{ width: '100%', padding: '16px', background: '#111', color: '#10b981', border: '1px solid #10b981', fontSize: '1rem', fontWeight: 'bold' }}
                    onClick={handleTempoTap}
               >
                   TAP TEMPO
               </button>
            </div>

            {showBeatDebug && (
              <div style={{ marginTop: '1.2rem', marginBottom: '1rem', borderTop: '1px dashed #333', paddingTop: '1rem' }}>
                <strong style={{ opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem', marginBottom: '8px', display: 'block' }}>Beat Debug</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: '4px', padding: '8px' }}>
                    <div style={{ color: '#777', fontSize: '0.62rem', textTransform: 'uppercase', marginBottom: '3px' }}>Onset</div>
                    <div style={{ color: '#fff', fontFamily: 'var(--mono-font)', fontSize: '0.75rem' }}>{liveMetrics.beatOnset.toFixed(3)}</div>
                  </div>
                  <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: '4px', padding: '8px' }}>
                    <div style={{ color: '#777', fontSize: '0.62rem', textTransform: 'uppercase', marginBottom: '3px' }}>Threshold</div>
                    <div style={{ color: '#fff', fontFamily: 'var(--mono-font)', fontSize: '0.75rem' }}>{liveMetrics.beatThreshold.toFixed(3)}</div>
                  </div>
                  <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: '4px', padding: '8px' }}>
                    <div style={{ color: '#777', fontSize: '0.62rem', textTransform: 'uppercase', marginBottom: '3px' }}>Interval</div>
                    <div style={{ color: '#fff', fontFamily: 'var(--mono-font)', fontSize: '0.75rem' }}>{liveMetrics.beatIntervalMs.toFixed(0)} ms</div>
                  </div>
                  <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: '4px', padding: '8px' }}>
                    <div style={{ color: '#777', fontSize: '0.62rem', textTransform: 'uppercase', marginBottom: '3px' }}>Confidence</div>
                    <div style={{ color: liveMetrics.beatConfidence > 0.66 ? '#10b981' : liveMetrics.beatConfidence > 0.4 ? '#ffcc00' : '#ef4444', fontFamily: 'var(--mono-font)', fontSize: '0.75rem' }}>
                      {(liveMetrics.beatConfidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {micIsRunning && <span style={{ padding: '4px 8px', background: '#3b82f6', color: '#fff', borderRadius: '4px', fontSize: '12px', marginRight: 4 }}>Mic live</span>}
            {systemIsRunning && <span style={{ padding: '4px 8px', background: '#10b981', color: '#fff', borderRadius: '4px', fontSize: '12px', marginRight: 4 }}>System audio live</span>}
              {webcamIsRunning && <span style={{ padding: '4px 8px', background: '#eab308', color: '#fff', borderRadius: '4px', fontSize: '12px', marginRight: 4 }}>Webcam active</span>}
              {kinectIsRunning && <span style={{ padding: '4px 8px', background: '#8b5cf6', color: '#fff', borderRadius: '4px', fontSize: '12px' }}>{kinectStatus}</span>}
           </div>
           )}

           {activeMenu === 'layers' && (
           <div className="card">
             <div className="flex space-between">
              <span style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 600 }}>Layers Setup</span>
             </div>
             
             {layers.map(layer => (
               <div key={layer.id} 
                    style={{ display: 'flex', flexDirection: 'column', marginTop: '8px', padding: '10px', background: layer.id === activeLayer?.id ? '#252525' : '#111', borderRadius: '6px', border: layer.id === activeLayer?.id ? '1px solid #ffcc00' : '1px solid #333', transition: 'all 0.2s ease', cursor: 'pointer' }}
                    onClick={() => setActiveLayerId(layer.id)}
               >
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <div 
                     onClick={(e) => {
                       e.stopPropagation();
                       setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, enabled: !l.enabled } : l));
                     }}
                     style={{ width: '12px', height: '12px', borderRadius: '4px', background: layer.enabled ? '#ffcc00' : '#444', border: '1px solid #000', cursor: 'pointer', flexShrink: 0 }}
                     title={layer.enabled ? "Visible" : "Hidden"}
                   />
                   <span style={{ flex: 1, fontSize: '0.85rem', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: layer.id === activeLayer?.id ? 700 : 500, color: layer.id === activeLayer?.id ? '#fff' : '#aaa' }}>
                     {layer.type === 'audio2d' ? 'Audio 2D' : layer.type === 'webcamAscii' ? 'Webcam ASCII' : layer.type === 'kinect3d' ? 'Kinect 3D' : 'Media / BG'}
                   </span>
                   <div style={{ display: 'flex', gap: '4px' }}>
                     <button className="outline" title="Move Up" style={{ padding: '2px 6px', fontSize: '10px', background: '#222', borderColor: '#444', color: '#fff' }} onClick={(e) => {
                       e.stopPropagation();
                       const idx = layers.findIndex(l => l.id === layer.id);
                       if (idx > 0) {
                         setLayers(prev => {
                           const copy = [...prev];
                           const temp = copy[idx-1];
                           copy[idx-1] = copy[idx];
                           copy[idx] = temp;
                           return copy;
                         });
                       }
                     }}>↑</button>
                     <button className="outline" title="Move Down" style={{ padding: '2px 6px', fontSize: '10px', background: '#222', borderColor: '#444', color: '#fff' }} onClick={(e) => {
                       e.stopPropagation();
                       const idx = layers.findIndex(l => l.id === layer.id);
                       if (idx < layers.length - 1) {
                         setLayers(prev => {
                           const copy = [...prev];
                           const temp = copy[idx+1];
                           copy[idx+1] = copy[idx];
                           copy[idx] = temp;
                           return copy;
                         });
                       }
                     }}>↓</button>
                     <button className="outline" title="Delete" style={{ padding: '2px 6px', fontSize: '10px', background: '#222', borderColor: '#444', color: '#ff4444' }} onClick={(e) => {
                       e.stopPropagation();
                       setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, mediaUrl: undefined } : l));
                       setLayers(prev => prev.filter(l => l.id !== layer.id));
                       if (activeLayerId === layer.id) setActiveLayerId(layers[0]?.id || '');
                     }}>X</button>
                   </div>
                 </div>
                 
                 {layer.type === 'media' && layer.id === activeLayer?.id && (
                   <div style={{ marginTop: '12px', padding: '16px', background: '#0a0a0a', borderRadius: '6px', border: '1px dashed #666', textAlign: 'center', transition: 'border 0.2s' }}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#ffcc00'; }}
                        onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#666'; }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.style.borderColor = '#666';
                          const file = e.dataTransfer.files?.[0];
                          if (file && (file.type.startsWith('video/') || file.type.startsWith('image/'))) {
                            const url = URL.createObjectURL(file);
                            const type = file.type.startsWith('video') ? 'video' : 'image';
                            setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, mediaUrl: url, mediaType: type } : l));
                          }
                        }}
                   >
                     {layer.mediaUrl ? (
                         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                             <span style={{ fontSize: '0.75rem', color: '#ffcc00', marginBottom: '8px' }}>[MEDIA LOADED]</span>
                             <button className="outline" style={{ fontSize: '0.7rem', padding: '6px 12px' }} onClick={(e) => {
                                 e.stopPropagation();
                                 document.getElementById('file-upload-' + layer.id)?.click();
                             }}>CHANGE FILE</button>
                         </div>
                     ) : (
                         <>
                           <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '8px' }}>Drop Video/Image or</span>
                           <button className="outline" style={{ fontSize: '0.7rem', padding: '6px 12px', border: '1px solid #ffcc00', color: '#ffcc00' }} onClick={(e) => {
                               e.stopPropagation();
                               document.getElementById('file-upload-' + layer.id)?.click();
                           }}>BROWSE FILE</button>
                         </>
                     )}
                     <input 
                       id={'file-upload-' + layer.id}
                       type="file" 
                       accept="video/*,image/*" 
                       style={{ display: 'none' }}
                       onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file) {
                           const url = URL.createObjectURL(file);
                           const type = file.type.startsWith('video') ? 'video' : 'image';
                           setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, mediaUrl: url, mediaType: type } : l));
                         }
                       }}
                     />
                   </div>
                 )}
               </div>
             ))}

             <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                <button className="outline" onClick={() => {
                  const newId = `layer-${Date.now()}`;
                  setLayers(prev => [...prev, { id: newId, type: 'audio2d', enabled: true, settings: { ...defaultSettings, visualizationMode: 'audio2d' }, opacity: 1.0, blendMode: 'screen' }]);
                  setActiveLayerId(newId);
                }}>+ Audio Layer</button>
                <button className="outline" onClick={() => {
                  const newId = `layer-${Date.now()}`;
                  setLayers(prev => [...prev, { id: newId, type: 'webcamAscii', enabled: true, settings: { ...defaultSettings, visualizationMode: 'webcamAscii' }, opacity: 1.0, blendMode: 'screen' }]);
                  setActiveLayerId(newId);
                }}>+ Webcam Layer</button>
                  <button className="outline" onClick={() => {
                    const newId = `layer-${Date.now()}`;
                    setLayers(prev => [...prev, { id: newId, type: 'kinect3d', enabled: true, settings: { ...defaultSettings, visualizationMode: 'kinect3d' }, opacity: 1.0, blendMode: 'screen' }]);
                    setActiveLayerId(newId);
                    startKinect();
                  }}>+ KINECT 3D</button>
                  <button className="outline" style={{ border: '1px solid #ffcc00', color: '#ffcc00' }} onClick={() => {
                    const newId = `layer-${Date.now()}`;
                    setLayers(prev => [...prev, { id: newId, type: 'media', enabled: true, settings: { ...defaultSettings, visualizationMode: 'audio2d' }, opacity: 1.0, blendMode: 'screen' }]);
                    setActiveLayerId(newId);
                  }}>+ MEDIA BG</button>
             </div>
             
             {/* MIDI Monitor moved into the card */}
             <div style={{ marginTop: '1rem', paddingTop: '0.8rem', borderTop: '1px dashed #333' }}>
               <p style={{ margin: 0, fontSize: '0.75rem', color: '#888' }}>{midiStatus}</p>
               {lastMessage && (
                 <p style={{ marginTop: '0.4rem', marginBottom: 0, fontSize: '0.70rem', color: '#ffcc00' }}>
                   MIDI Debug - Ch: {lastMessage.channel} | Cmd: {lastMessage.command} | CC: {lastMessage.note} | Val: {lastMessage.velocity}
                 </p>
               )}
             </div>

          </div>
          )}

          {activeLayer && activeMenu === 'params' && (
            <div className="card">
              <h3 style={{ fontSize: '0.9rem', marginBottom: '0.8rem' }}>Settings for Active Layer: {activeLayer.type}</h3>

              {/* ═══════════════════════════════════════════════════════════════
                   MANDALA UX: toolbar → presets → collapsible control groups
                   ─────────────────────────────────────────────────────────────
                   Every slider shows its numeric value, min/max labels, a
                   tooltip, and a ↺ reset-to-default button. Groups collapse to
                   keep the panel digestible.
                   ═══════════════════════════════════════════════════════════ */}
              <div className="mandala-ux">
                {/* ── Global actions toolbar ── */}
                <div className="mandala-actions" role="toolbar" aria-label="Settings actions">
                  <button type="button" className="primary" onClick={saveSettingsToLocal} title="Save settings to this browser (S)">💾 Save</button>
                  <button type="button" onClick={loadAllDefaults} title="Reset every setting to default">⟲ Defaults</button>
                  <button type="button" onClick={exportSettingsJson} title="Download current settings as JSON">⬇ Export</button>
                  <button type="button" onClick={() => importFileInputRef.current?.click()} title="Load settings from a JSON file">⬆ Import</button>
                  <button type="button" onClick={randomizeMandala} title="Randomize mandala movement parameters (R)">🎲 Randomize</button>
                  <button type="button" onClick={() => setShowShortcutsHelp(prev => !prev)} title="Keyboard shortcuts" className="mandala-help-btn">?</button>
                  <input
                    ref={importFileInputRef}
                    type="file"
                    accept="application/json,.json"
                    style={{ display: 'none' }}
                    onChange={handleImportFileChange}
                  />
                </div>

                {/* ── Mandala mood presets ── */}
                <div className="mandala-presets">
                  <div className="mandala-presets-title">Mandala Presets</div>
                  <div className="mandala-presets-grid">
                    {mandalaPresets.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        className="mandala-preset-btn"
                        title={preset.description}
                        onClick={() => {
                          const idx = mandalaPresets.findIndex(p => p.id === preset.id);
                          if (idx >= 0) setMandalaPresetIndex(idx);
                          applyMandalaPreset(preset);
                        }}
                      >
                        <span className="mandala-preset-emoji">{preset.emoji}</span>
                        <span className="mandala-preset-name">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Collapsible mandala control groups ── */}
                <div className="mandala-groups">
                  {renderCollapsibleSection('motion', '🌀', 'Motion & Flow', (
                    <>
                      <div className="mandala-field">
                        <label className="mandala-select-label">
                          Movement Style
                          <span className="mandala-slider-info" title="Which kaleidoscopic motion recipe drives the mandala.">ⓘ</span>
                        </label>
                        <select
                          value={settings.movementStyle}
                          onChange={(e) => setSettings({ ...settings, movementStyle: e.target.value as VisualSettings['movementStyle'] })}
                        >
                          <option value="ripple">Ripple — concentric rings</option>
                          <option value="wave">Wave — breathing petals</option>
                          <option value="matrix">Matrix — rings + spokes</option>
                          <option value="glitch">Glitch — classic mandala</option>
                          <option value="orbit">Orbit — rotating spiral</option>
                          <option value="tunnel">Tunnel — zoom inward</option>
                          <option value="pulse">Pulse — heartbeat rings</option>
                          <option value="static">Static — slow breath</option>
                        </select>
                      </div>
                      {mandalaFlowControls.map(renderMandalaSlider)}
                    </>
                  ))}

                  {renderCollapsibleSection('audio', '🔊', 'Audio Reactivity', (
                    <>{mandalaAudioControls.map(renderMandalaSlider)}</>
                  ))}

                  {renderCollapsibleSection('noise', '🌊', 'Noise & Texture', (
                    <>{mandalaNoiseControls.map(renderMandalaSlider)}</>
                  ))}

                  {renderCollapsibleSection('symmetry', '⚡', 'Symmetry & Mandala', (
                    <>
                      {mandalaSymmetryControls.map(renderMandalaSlider)}
                      <p className="mandala-hint">
                        Fewer folds feel organic; 8 is the classic kaleidoscope; 12 feels crystalline.
                      </p>
                    </>
                  ))}

                  {renderCollapsibleSection('appearance', '🎨', 'Appearance & Color', (
                    <div className="mandala-appearance-row">
                      <div>
                        <label className="mandala-select-label">Primary Color</label>
                        <input
                          type="color"
                          value={settings.colorMode === 'custom' ? settings.customColor : '#ffffff'}
                          onChange={(e) => setSettings({ ...settings, customColor: e.target.value, colorMode: 'custom' })}
                        />
                      </div>
                      <div>
                        <label className="mandala-select-label">Color Mode</label>
                        <select
                          value={settings.colorMode}
                          onChange={(e) => setSettings({ ...settings, colorMode: e.target.value as VisualSettings['colorMode'] })}
                        >
                          <option value="white">Minimal White</option>
                          <option value="rainbow">Rainbow</option>
                          <option value="neon">Neon</option>
                          <option value="thermal">Thermal Vision</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ux-toolbar">
                <div className="ux-toolbar-row">
                  <button
                    className={controlMode === 'basic' ? 'primary' : 'outline'}
                    onClick={() => setControlMode('basic')}
                  >
                    Basic
                  </button>
                  <button
                    className={controlMode === 'advanced' ? 'primary' : 'outline'}
                    onClick={() => setControlMode('advanced')}
                  >
                    Advanced
                  </button>
                  <button className={showHud ? 'primary' : 'outline'} onClick={() => setShowHud(prev => !prev)}>
                    HUD
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Search quick controls and presets"
                  value={controlSearch}
                  onChange={(event) => setControlSearch(event.target.value)}
                />
              </div>

              <div className="favorites-panel">
                <strong style={{ opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: '0.65rem' }}>Favorites Quick Controls</strong>
                {!favoriteDescriptors.length && (
                  <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: '#777' }}>Pin controls below to build your live favorites strip.</p>
                )}
                {favoriteDescriptors.map((descriptor) => (
                  <div key={`favorite-${descriptor.key}`} className="favorite-control-row">
                    <div className="favorite-control-header">
                      <span>{descriptor.label}</span>
                      <span>{descriptor.formatValue(getControlValue(descriptor.key))}</span>
                    </div>
                    <input
                      type="range"
                      min={descriptor.min}
                      max={descriptor.max}
                      step={descriptor.step}
                      value={getControlValue(descriptor.key)}
                      onChange={(event) => setControlValue(descriptor.key, parseFloat(event.target.value))}
                    />
                  </div>
                ))}

                <div className="pin-grid">
                  {visibleControlDescriptors.map((descriptor) => {
                    const isFavorite = favoriteControlKeys.includes(descriptor.key);
                    return (
                      <button
                        key={`pin-${descriptor.key}`}
                        className={isFavorite ? 'primary' : 'outline'}
                        onClick={() => toggleFavoriteControl(descriptor.key)}
                      >
                        {isFavorite ? 'Unpin' : 'Pin'} {descriptor.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="macro-panel">
                <strong style={{ opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: '0.65rem' }}>Performance Macros</strong>
                <div className="macro-row">
                  <label>Energy</label>
                  <input type="range" min="0" max="1" step="0.01" value={macroEnergy} onChange={(event) => setMacroEnergyValue(parseFloat(event.target.value))} />
                </div>
                <div className="macro-row">
                  <label>Motion</label>
                  <input type="range" min="0" max="1" step="0.01" value={macroMotion} onChange={(event) => setMacroMotionValue(parseFloat(event.target.value))} />
                </div>
                <div className="macro-row">
                  <label>Color Heat</label>
                  <input type="range" min="0" max="1" step="0.01" value={macroColor} onChange={(event) => setMacroColorValue(parseFloat(event.target.value))} />
                </div>
                <div className="macro-row">
                  <label>Texture</label>
                  <input type="range" min="0" max="1" step="0.01" value={macroTexture} onChange={(event) => setMacroTextureValue(parseFloat(event.target.value))} />
                </div>
              </div>

              <div className="preset-panel">
                <div className="preset-panel-header">
                  <strong style={{ opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: '0.65rem', margin: 0 }}>Preset Browser + A/B</strong>
                  <button className="outline" onClick={saveCurrentPreset}>Save Current</button>
                </div>

                <div className="preset-slot-row">
                  <select value={presetSlotA} onChange={(event) => setPresetSlotA(event.target.value)}>
                    <option value="">Slot A</option>
                    {compatiblePresets.map((preset) => (
                      <option key={`slot-a-${preset.id}`} value={preset.id}>{preset.name}</option>
                    ))}
                  </select>
                  <select value={presetSlotB} onChange={(event) => setPresetSlotB(event.target.value)}>
                    <option value="">Slot B</option>
                    {compatiblePresets.map((preset) => (
                      <option key={`slot-b-${preset.id}`} value={preset.id}>{preset.name}</option>
                    ))}
                  </select>
                  <button
                    className={abCompareEnabled ? 'primary' : 'outline'}
                    onClick={() => setAbCompareEnabled(prev => !prev)}
                    disabled={!presetSlotA || !presetSlotB}
                  >
                    A/B Compare
                  </button>
                </div>

                <div className="macro-row">
                  <label>Compare Speed</label>
                  <input type="range" min="250" max="2000" step="50" value={abCompareMs} onChange={(event) => setAbCompareMs(parseInt(event.target.value, 10))} />
                </div>

                <div className="preset-list">
                  {compatiblePresets
                    .filter((preset) => matchesSearch(preset.name, preset.layerType))
                    .map((preset) => (
                      <div key={preset.id} className={`preset-item ${lastAppliedPresetId === preset.id ? 'active' : ''}`}>
                        <div className="preset-meta">
                          <span>{preset.name}</span>
                          <span>{new Date(preset.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="preset-actions">
                          <button className="outline" onClick={() => applyPresetToActiveLayer(preset)}>Apply</button>
                          <button className="outline" onClick={() => setPresetSlotA(preset.id)}>A</button>
                          <button className="outline" onClick={() => setPresetSlotB(preset.id)}>B</button>
                          <button className="outline" onClick={() => removePreset(preset.id)}>Del</button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              
              <div style={{ borderBottom: '1px solid #333', paddingBottom: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.8rem' }}>
                <strong style={{ opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}>Layer Overrides</strong>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: '#222', padding: '6px', borderRadius: '4px', border: '1px solid #444' }}>
                   <label style={{ margin: 0, color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>Teks / Huruf Warna Utama</label>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <input 
                       type="color" 
                       value={settings.colorMode === 'custom' ? settings.customColor : '#ffffff'} 
                       onChange={(e) => setSettings({...settings, customColor: e.target.value, colorMode: 'custom', kinectZAxisColor: false})} 
                       style={{ width: '40px', height: '24px', border: 'none', padding: 0, cursor: 'pointer', background: 'transparent' }}
                     />
                     <button className="outline" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setSettings({...settings, colorMode: 'rainbow'})}>Reset Ke RGB</button>
                   </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Opacity: {(activeLayer.opacity * 100).toFixed(0)}%</label>
                  <input type="range" min="0" max="1" step="0.05" value={activeLayer.opacity} onChange={(e) => {
                    setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, opacity: parseFloat(e.target.value) } : l));
                  }} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Character Opacity: {((settings.characterOpacity ?? 1) * 100).toFixed(0)}%</label>
                  <input type="range" min="0" max="1" step="0.05" value={settings.characterOpacity ?? 1} onChange={(e) => {
                    setSettings({ ...settings, characterOpacity: parseFloat(e.target.value) });
                  }} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Blend Mode:</label>
                  <select 
                    style={{ width: '100%', padding: '4px', background: '#333', color: 'white', border: 'none', borderRadius: '4px' }}
                    value={activeLayer.blendMode} 
                    onChange={(e) => {
                      setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, blendMode: e.target.value as GlobalCompositeOperation } : l));
                    }}
                  >
                     <option value="source-over">Normal</option>
                     <option value="screen">Screen (Add)</option>
                     <option value="multiply">Multiply</option>
                     <option value="overlay">Overlay</option>
                     <option value="lighter">Lighter</option>
                     <option value="difference">Difference</option>
                  </select>
                </div>
                <button 
                  style={{ 
                    width: '100%', 
                    padding: '6px', 
                    background: '#333', 
                    border: '1px solid #999', 
                    color: '#fff',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    marginTop: '0.4rem'
                  }}
                  onClick={() => {
                    localStorage.removeItem('visualizer_layers');
                    localStorage.removeItem('visualizer_midi');
                    setLayers([{
                      id: 'layer-1',
                      type: 'audio2d',
                      enabled: true,
                      settings: { ...defaultSettings },
                      opacity: 1.0,
                      blendMode: 'source-over'
                    }]);
                    setActiveLayerId('layer-1');
                    alert('Settings reset to defaults!');
                  }}
                >
                  🔄 Reset All Settings
                </button>
              </div>

              <div className="visuals-sections" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.75rem' }}>
                
                {/* ========== SECTION 1: QUICK START & SENSITIVITY ========== */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', borderBottom: '1px solid #444', paddingBottom: '0.8rem' }}>
                  <strong style={{ opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: '0.65rem' }}>Quick Start</strong>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff', fontWeight: 600 }}>Visualization Mode:</label>
                    <select 
                      style={{ width: '100%', padding: '6px', background: '#222', color: 'white', border: '1px solid #00ffff', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}
                      value={settings.visualizationMode} 
                      onChange={(e) => setSettings({...settings, visualizationMode: e.target.value as any})}
                    >
                       <option value="audio2d">Audio 2D (Standard)</option>
                       <option value="webcamAscii">Webcam ASCII</option>
                       <option value="kinect3d">Kinect 3D</option>
                       <option value="tiles">Procedural Tiles</option>
                       <option value="fractal">Fractal Recursion</option>
                       <option value="geometry">Geometry Lines</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff', fontWeight: 600 }}>Sensitivity: {sensitivity.toFixed(1)}x</label>
                    <input type="range" min="0.1" max="5" step="0.1" value={sensitivity} onChange={(e) => setSensitivity(parseFloat(e.target.value))} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff', fontWeight: 600 }}>Animation Speed: {settings.globalSpeed.toFixed(1)}x</label>
                    <input type="range" min="0" max="5" step="0.1" value={settings.globalSpeed} onChange={(e) => setSettings({...settings, globalSpeed: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                </div>

                {/* ========== SECTION 2: AUDIO INPUT ========== */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', borderBottom: '1px solid #444', paddingBottom: '0.8rem' }}>
                  <strong style={{ opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: '0.65rem' }}>Audio Input</strong>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Smoothing (Latency/Jitter): {settings.audioSmoothing.toFixed(2)}</label>
                    <input type="range" min="0.01" max="0.95" step="0.01" value={settings.audioSmoothing} onChange={(e) => setSettings({...settings, audioSmoothing: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                  <details style={{ color: '#ccc' }}>
                    <summary style={{ cursor: 'pointer', fontSize: '0.7rem', opacity: 0.8 }}>📊 Band Thresholds</summary>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem', paddingLeft: '0.5rem', borderLeft: '2px solid #00ffff' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Bass: {(settings.bassThreshold * 100).toFixed(0)}%</label>
                        <input type="range" min="0" max="0.8" step="0.05" value={settings.bassThreshold} onChange={(e) => setSettings({...settings, bassThreshold: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Mids: {(settings.midThreshold * 100).toFixed(0)}%</label>
                        <input type="range" min="0" max="0.8" step="0.05" value={settings.midThreshold} onChange={(e) => setSettings({...settings, midThreshold: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Treble: {(settings.highThreshold * 100).toFixed(0)}%</label>
                        <input type="range" min="0" max="0.8" step="0.05" value={settings.highThreshold} onChange={(e) => setSettings({...settings, highThreshold: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                    </div>
                  </details>
                </div>

                {/* ========== SECTION 3: CANVAS LAYOUT ========== */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', borderBottom: '1px solid #444', paddingBottom: '0.8rem' }}>
                  <strong style={{ opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: '0.65rem' }}>Canvas Layout</strong>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Grid Width: {(settings.gridWidthRatio * 100).toFixed(0)}%</label>
                    <input type="range" min="0.1" max="1" step="0.05" value={settings.gridWidthRatio} onChange={(e) => setSettings({...settings, gridWidthRatio: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Vertical Position: {(settings.yOffsetRatio * 100).toFixed(0)}%</label>
                    <input type="range" min="0.1" max="1" step="0.05" value={settings.yOffsetRatio} onChange={(e) => setSettings({...settings, yOffsetRatio: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Dot Size: {settings.dotSizeBase.toFixed(1)}</label>
                    <input type="range" min="1" max="10" step="0.5" value={settings.dotSizeBase} onChange={(e) => setSettings({...settings, dotSizeBase: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Depth Spacing: {settings.rowSpacingRatio.toFixed(3)}</label>
                    <input type="range" min="0.005" max="0.05" step="0.001" value={settings.rowSpacingRatio} onChange={(e) => setSettings({...settings, rowSpacingRatio: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                </div>

                {/* ========== SECTION 4: WAVE ANIMATION ========== */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', borderBottom: '1px solid #444', paddingBottom: '0.8rem' }}>
                  <strong style={{ opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: '0.65rem' }}>Wave & Motion</strong>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Movement Style:</label>
                    <select 
                      style={{ width: '100%', padding: '4px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '4px', fontSize: '0.75rem' }}
                      value={settings.movementStyle} 
                      onChange={(e) => setSettings({...settings, movementStyle: e.target.value as any})}
                    >
                       <option value="ripple">Radial Ripple</option>
                       <option value="wave">Vertical Wave</option>
                       <option value="matrix">Matrix Rain</option>
                       <option value="glitch">Random Glitch</option>
                       <option value="static">Static Equalizer</option>
                       <option value="orbit">Orbiting Spiral</option>
                       <option value="tunnel">Hyperspace Tunnel</option>
                       <option value="pulse">Heartbeat Pulse</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Density: {settings.rippleDamping.toFixed(2)}</label>
                      <input type="range" min="0.05" max="2.0" step="0.05" value={settings.rippleDamping} onChange={(e) => setSettings({...settings, rippleDamping: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Speed: {settings.rippleSpeed.toFixed(1)}</label>
                      <input type="range" min="0" max="20" step="0.5" value={settings.rippleSpeed} onChange={(e) => setSettings({...settings, rippleSpeed: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Color Wave Depth: {settings.colorWaveDepth.toFixed(2)}</label>
                    <input type="range" min="0" max="1" step="0.05" value={settings.colorWaveDepth} onChange={(e) => setSettings({...settings, colorWaveDepth: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                </div>

                {/* ========== SECTION 5: AUDIO IMPACT ========== */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', borderBottom: '1px solid #444', paddingBottom: '0.8rem' }}>
                  <strong style={{ opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: '0.65rem' }}>Audio Reaction</strong>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Amplitude (Height): {settings.amplitudeRatio.toFixed(2)}</label>
                    <input type="range" min="0.1" max="2" step="0.05" value={settings.amplitudeRatio} onChange={(e) => setSettings({...settings, amplitudeRatio: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Bass Impact: {settings.bassPulseImpact.toFixed(3)}</label>
                      <input type="range" min="0" max="0.1" step="0.005" value={settings.bassPulseImpact} onChange={(e) => setSettings({...settings, bassPulseImpact: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Bass Brightness: {settings.baseBrightness.toFixed(2)}</label>
                      <input type="range" min="0" max="0.5" step="0.01" value={settings.baseBrightness} onChange={(e) => setSettings({...settings, baseBrightness: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Scatter/Jump: {settings.scatterMultiplier}</label>
                    <input type="range" min="0" max="200" step="1" value={settings.scatterMultiplier} onChange={(e) => setSettings({...settings, scatterMultiplier: parseInt(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                </div>

                {/* ========== SECTION 5B: ANIMATION ENGINE ========== */}
                {isAdvancedMode && activeLayer.type === 'audio2d' && settings.visualizationMode === 'audio2d' && (
                <details style={{ borderBottom: '1px solid #444', paddingBottom: '0.8rem' }}>
                  <summary style={{ opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.6rem' }}>Animation Engine (All Motion Settings)</summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.8rem', paddingLeft: '0.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Motion Weight: {(settings.animationMotionWeight ?? 1).toFixed(2)}</label>
                        <input type="range" min="0" max="2" step="0.05" value={settings.animationMotionWeight ?? 1} onChange={(e) => setSettings({...settings, animationMotionWeight: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Flow Weight: {(settings.animationFlowWeight ?? 1).toFixed(2)}</label>
                        <input type="range" min="0" max="2" step="0.05" value={settings.animationFlowWeight ?? 1} onChange={(e) => setSettings({...settings, animationFlowWeight: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Beat Threshold: {(settings.animationBeatThreshold ?? 0.22).toFixed(2)}</label>
                        <input type="range" min="0" max="0.8" step="0.01" value={settings.animationBeatThreshold ?? 0.22} onChange={(e) => setSettings({...settings, animationBeatThreshold: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Beat Response: {(settings.animationBeatResponse ?? 0.8).toFixed(2)}</label>
                        <input type="range" min="0" max="2" step="0.05" value={settings.animationBeatResponse ?? 0.8} onChange={(e) => setSettings({...settings, animationBeatResponse: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Beat Bass Influence: {(settings.animationBeatBassInfluence ?? 0.65).toFixed(2)}</label>
                        <input type="range" min="0" max="2" step="0.05" value={settings.animationBeatBassInfluence ?? 0.65} onChange={(e) => setSettings({...settings, animationBeatBassInfluence: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Center Bias: {(settings.animationCenterBias ?? 0.65).toFixed(2)}</label>
                        <input type="range" min="0" max="1" step="0.01" value={settings.animationCenterBias ?? 0.65} onChange={(e) => setSettings({...settings, animationCenterBias: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Beat Wave Base Speed: {(settings.animationBeatWaveBaseSpeed ?? 11).toFixed(1)}</label>
                        <input type="range" min="0" max="30" step="0.5" value={settings.animationBeatWaveBaseSpeed ?? 11} onChange={(e) => setSettings({...settings, animationBeatWaveBaseSpeed: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Beat Spatial Freq: {(settings.animationBeatSpatialFreq ?? 0.28).toFixed(2)}</label>
                        <input type="range" min="0.01" max="2" step="0.01" value={settings.animationBeatSpatialFreq ?? 0.28} onChange={(e) => setSettings({...settings, animationBeatSpatialFreq: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Beat Lift Strength: {(settings.animationBeatLiftStrength ?? 18).toFixed(1)}</label>
                        <input type="range" min="0" max="60" step="1" value={settings.animationBeatLiftStrength ?? 18} onChange={(e) => setSettings({...settings, animationBeatLiftStrength: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Beat Sway Strength: {(settings.animationBeatSwayStrength ?? 7).toFixed(1)}</label>
                        <input type="range" min="0" max="40" step="0.5" value={settings.animationBeatSwayStrength ?? 7} onChange={(e) => setSettings({...settings, animationBeatSwayStrength: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Scatter Clamp Base: {(settings.animationScatterClampBase ?? 28).toFixed(1)}</label>
                        <input type="range" min="0" max="80" step="1" value={settings.animationScatterClampBase ?? 28} onChange={(e) => setSettings({...settings, animationScatterClampBase: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Scatter Clamp Boost: {(settings.animationScatterClampBoost ?? 10).toFixed(1)}</label>
                        <input type="range" min="0" max="30" step="0.5" value={settings.animationScatterClampBoost ?? 10} onChange={(e) => setSettings({...settings, animationScatterClampBoost: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Terrain Lift: {(settings.animationTerrainLift ?? 120).toFixed(0)}</label>
                        <input type="range" min="0" max="220" step="1" value={settings.animationTerrainLift ?? 120} onChange={(e) => setSettings({...settings, animationTerrainLift: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Terrain Beat: {(settings.animationTerrainBeatStrength ?? 10).toFixed(1)}</label>
                        <input type="range" min="0" max="40" step="0.5" value={settings.animationTerrainBeatStrength ?? 10} onChange={(e) => setSettings({...settings, animationTerrainBeatStrength: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Scale Response: {(settings.animationScaleResponse ?? 1).toFixed(2)}</label>
                        <input type="range" min="0" max="2" step="0.05" value={settings.animationScaleResponse ?? 1} onChange={(e) => setSettings({...settings, animationScaleResponse: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                    </div>
                  </div>
                </details>
                )}

                {/* ========== SECTION 6: COLOR & THEME ========== */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', borderBottom: '1px solid #444', paddingBottom: '0.8rem' }}>
                  <strong style={{ opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: '0.65rem' }}>Color & Theme</strong>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <label style={{ color: '#fff', fontSize: '0.85rem' }}>Primary Color</label>
                    <input 
                      type="color" 
                      value={settings.colorMode === 'custom' ? settings.customColor : '#ffffff'} 
                      onChange={(e) => setSettings({...settings, customColor: e.target.value, colorMode: 'custom'})} 
                      style={{ width: '50px', height: '30px', border: 'none', padding: 0, cursor: 'pointer' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Mode:</label>
                    <select 
                      style={{ width: '100%', padding: '4px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '4px', fontSize: '0.75rem' }}
                      value={settings.colorMode} 
                      onChange={(e) => setSettings({...settings, colorMode: e.target.value as any})}
                    >
                       <option value="white">Minimal White</option>
                       <option value="rainbow">Rainbow</option>
                       <option value="neon">Neon</option>
                       <option value="thermal">Thermal Vision</option>
                       <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <label style={{ color: '#fff', fontSize: '0.85rem' }}>Background</label>
                    <input 
                      type="color" 
                      value={settings.backgroundColor} 
                      onChange={(e) => setSettings({...settings, backgroundColor: e.target.value})} 
                      style={{ width: '50px', height: '30px', border: 'none', padding: 0 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Background Opacity: {((settings.backgroundOpacity ?? 1) * 100).toFixed(0)}%</label>
                    <input type="range" min="0" max="1" step="0.05" value={settings.backgroundOpacity ?? 1} onChange={(e) => setSettings({...settings, backgroundOpacity: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                  {activeLayer.type !== 'media' && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>
                        Custom Text / Characters (Audio 2D, Webcam ASCII, Kinect 3D)
                      </label>
                      <textarea
                        rows={3}
                        value={settings.customText}
                        onChange={(e) => setSettings({ ...settings, customText: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px',
                          background: '#222',
                          color: '#fff',
                          border: '1px solid #444',
                          borderRadius: '4px',
                          resize: 'vertical',
                          fontSize: '0.75rem',
                        }}
                      />
                      <div style={{ marginTop: '0.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff', fontSize: '0.75rem' }}>
                          Character Density: {(settings.characterDensity ?? 1).toFixed(2)}x
                        </label>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.05"
                          value={settings.characterDensity ?? 1}
                          onChange={(e) => setSettings({ ...settings, characterDensity: parseFloat(e.target.value) })}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* ========== SECTION 7: TILES MODE ========== */}
                {isAdvancedMode && settings.visualizationMode === 'tiles' && (
                  <details style={{ borderBottom: '1px solid #444', paddingBottom: '0.8rem' }}>
                    <summary style={{ opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.6rem', color: '#00ff99' }}>Procedural Tiles Mode</summary>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.8rem', paddingLeft: '0.5rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Tile Size: {settings.tilesSize}</label>
                        <input type="range" min="5" max="100" step="1" value={settings.tilesSize ?? 30} onChange={(e) => setSettings({...settings, tilesSize: parseInt(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Complexity (Layers): {settings.tilesComplexity}</label>
                        <input type="range" min="1" max="20" step="1" value={settings.tilesComplexity ?? 5} onChange={(e) => setSettings({...settings, tilesComplexity: parseInt(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Rotation Speed: {(settings.tilesRotationSpeed ?? 0.5).toFixed(2)}</label>
                        <input type="range" min="0" max="3" step="0.05" value={settings.tilesRotationSpeed ?? 0.5} onChange={(e) => setSettings({...settings, tilesRotationSpeed: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Audio Scaling: {(settings.tilesAudioScaling ?? 1.0).toFixed(2)}</label>
                        <input type="range" min="0" max="3" step="0.1" value={settings.tilesAudioScaling ?? 1.0} onChange={(e) => setSettings({...settings, tilesAudioScaling: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.3rem' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.65rem' }}>Bass: {(settings.tilesBassAmount ?? 0.3).toFixed(2)}</label>
                          <input type="range" min="0" max="1" step="0.05" value={settings.tilesBassAmount ?? 0.3} onChange={(e) => setSettings({...settings, tilesBassAmount: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.65rem' }}>Mids: {(settings.tilesMidsAmount ?? 0.3).toFixed(2)}</label>
                          <input type="range" min="0" max="1" step="0.05" value={settings.tilesMidsAmount ?? 0.3} onChange={(e) => setSettings({...settings, tilesMidsAmount: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.65rem' }}>Highs: {(settings.tilesHighsAmount ?? 0.3).toFixed(2)}</label>
                          <input type="range" min="0" max="1" step="0.05" value={settings.tilesHighsAmount ?? 0.3} onChange={(e) => setSettings({...settings, tilesHighsAmount: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Color Variation: {(settings.tilesColorVariation ?? 0.5).toFixed(2)}</label>
                        <input type="range" min="0" max="1" step="0.05" value={settings.tilesColorVariation ?? 0.5} onChange={(e) => setSettings({...settings, tilesColorVariation: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                    </div>
                  </details>
                )}

                {/* ========== SECTION 8: FRACTAL MODE ========== */}
                {isAdvancedMode && settings.visualizationMode === 'fractal' && (
                  <details style={{ borderBottom: '1px solid #444', paddingBottom: '0.8rem' }}>
                    <summary style={{ opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.6rem', color: '#ff00ff' }}>Fractal Recursion Mode</summary>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.8rem', paddingLeft: '0.5rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Max Depth: {settings.fractalDepth ?? 5}</label>
                        <input type="range" min="1" max="15" step="1" value={settings.fractalDepth ?? 5} onChange={(e) => setSettings({...settings, fractalDepth: parseInt(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Rotation Speed: {(settings.fractalRotationSpeed ?? 0.3).toFixed(2)}</label>
                        <input type="range" min="0" max="2" step="0.05" value={settings.fractalRotationSpeed ?? 0.3} onChange={(e) => setSettings({...settings, fractalRotationSpeed: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Zoom Scale: {(settings.fractalZoomScale ?? 0.5).toFixed(2)}</label>
                        <input type="range" min="0.1" max="2" step="0.1" value={settings.fractalZoomScale ?? 0.5} onChange={(e) => setSettings({...settings, fractalZoomScale: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Line Width: {(settings.fractalLineWidth ?? 1.0).toFixed(1)}</label>
                        <input type="range" min="0.5" max="5" step="0.5" value={settings.fractalLineWidth ?? 1.0} onChange={(e) => setSettings({...settings, fractalLineWidth: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Audio Drive Amount: {(settings.fractalAudioDriveAmount ?? 0.5).toFixed(2)}</label>
                        <input type="range" min="0" max="2" step="0.1" value={settings.fractalAudioDriveAmount ?? 0.5} onChange={(e) => setSettings({...settings, fractalAudioDriveAmount: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.3rem' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.65rem' }}>Bass Depth: {(settings.fractalBassDepth ?? 0.3).toFixed(2)}</label>
                          <input type="range" min="0" max="1" step="0.05" value={settings.fractalBassDepth ?? 0.3} onChange={(e) => setSettings({...settings, fractalBassDepth: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.65rem' }}>Mids Rotation: {(settings.fractalMidsRotation ?? 0.2).toFixed(2)}</label>
                          <input type="range" min="0" max="1" step="0.05" value={settings.fractalMidsRotation ?? 0.2} onChange={(e) => setSettings({...settings, fractalMidsRotation: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.65rem' }}>Highs Zoom: {(settings.fractalHighsZoom ?? 0.2).toFixed(2)}</label>
                          <input type="range" min="0" max="1" step="0.05" value={settings.fractalHighsZoom ?? 0.2} onChange={(e) => setSettings({...settings, fractalHighsZoom: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Inner Scale: {(settings.fractalInnerScale ?? 0.6).toFixed(2)}</label>
                        <input type="range" min="0.1" max="1" step="0.05" value={settings.fractalInnerScale ?? 0.6} onChange={(e) => setSettings({...settings, fractalInnerScale: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                    </div>
                  </details>
                )}

                {/* ========== SECTION 9: GEOMETRY MODE ========== */}
                {isAdvancedMode && settings.visualizationMode === 'geometry' && (
                  <details style={{ borderBottom: '1px solid #444', paddingBottom: '0.8rem' }}>
                    <summary style={{ opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.6rem', color: '#00ccff' }}>Geometry Lines Mode</summary>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.8rem', paddingLeft: '0.5rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Line Width: {(settings.geometryLineWidth ?? 1.5).toFixed(1)}</label>
                        <input type="range" min="0.5" max="5" step="0.5" value={settings.geometryLineWidth ?? 1.5} onChange={(e) => setSettings({...settings, geometryLineWidth: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Density (Complexity): {settings.geometryDensity ?? 8}</label>
                        <input type="range" min="2" max="30" step="1" value={settings.geometryDensity ?? 8} onChange={(e) => setSettings({...settings, geometryDensity: parseInt(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Rotation Speed: {(settings.geometryRotationSpeed ?? 0.4).toFixed(2)}</label>
                        <input type="range" min="0" max="2" step="0.05" value={settings.geometryRotationSpeed ?? 0.4} onChange={(e) => setSettings({...settings, geometryRotationSpeed: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Audio Scaling: {(settings.geometryAudioScaling ?? 1.0).toFixed(2)}</label>
                        <input type="range" min="0" max="3" step="0.1" value={settings.geometryAudioScaling ?? 1.0} onChange={(e) => setSettings({...settings, geometryAudioScaling: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.3rem' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.65rem' }}>Bass Lines: {(settings.geometryBassLines ?? 0.4).toFixed(2)}</label>
                          <input type="range" min="0" max="1" step="0.05" value={settings.geometryBassLines ?? 0.4} onChange={(e) => setSettings({...settings, geometryBassLines: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.65rem' }}>Mids Intersection: {(settings.geometryMidsIntersection ?? 0.3).toFixed(2)}</label>
                          <input type="range" min="0" max="1" step="0.05" value={settings.geometryMidsIntersection ?? 0.3} onChange={(e) => setSettings({...settings, geometryMidsIntersection: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.65rem' }}>Highs Pattern: {(settings.geometryHighsPattern ?? 0.3).toFixed(2)}</label>
                          <input type="range" min="0" max="1" step="0.05" value={settings.geometryHighsPattern ?? 0.3} onChange={(e) => setSettings({...settings, geometryHighsPattern: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Centroid Influence: {(settings.geometryCentroidInfluence ?? 0.5).toFixed(2)}</label>
                        <input type="range" min="0" max="1" step="0.05" value={settings.geometryCentroidInfluence ?? 0.5} onChange={(e) => setSettings({...settings, geometryCentroidInfluence: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Complexity Mode: {settings.geometryComplexity ?? 2}</label>
                        <input type="range" min="1" max="5" step="1" value={settings.geometryComplexity ?? 2} onChange={(e) => setSettings({...settings, geometryComplexity: parseInt(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                    </div>
                  </details>
                )}

                {/* ========== SECTION 10: AUDIO DSP ENGINE ========== */}
                {isAdvancedMode && (
                <details style={{ borderBottom: '1px solid #444', paddingBottom: '0.8rem' }}>
                  <summary style={{ opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.6rem' }}>Audio DSP Engine (Advanced)</summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.8rem', paddingLeft: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>FFT Size: {settings.dspFftSize}</label>
                      <select value={settings.dspFftSize ?? 2048} onChange={(e) => setSettings({...settings, dspFftSize: parseInt(e.target.value)})} style={{ width: '100%', background: '#222', color: '#fff', border: '1px solid #444', padding: '4px' }}>
                         <option value="512">512 (Fast, Noisy)</option>
                         <option value="1024">1024</option>
                         <option value="2048">2048 (Balanced)</option>
                         <option value="4096">4096</option>
                         <option value="8192">8192 (Precise, Slow)</option>
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Min dB: {settings.dspMinDecibels}</label>
                        <input type="range" min="-120" max="-40" step="1" value={settings.dspMinDecibels ?? -80} onChange={(e) => setSettings({...settings, dspMinDecibels: parseInt(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Max dB: {settings.dspMaxDecibels}</label>
                        <input type="range" min="-40" max="0" step="1" value={settings.dspMaxDecibels ?? -10} onChange={(e) => setSettings({...settings, dspMaxDecibels: parseInt(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.2rem', color: '#ccc', fontSize: '0.7rem' }}>Frequency Band Separation</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.3rem' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.65rem' }}>Bass: {settings.dspBassEnd?.toFixed(0)}%</label>
                          <input type="range" min="1" max="25" step="0.5" value={settings.dspBassEnd ?? 5} onChange={(e) => setSettings({...settings, dspBassEnd: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.65rem' }}>Mids: {settings.dspMidsEnd?.toFixed(0)}%</label>
                          <input type="range" min="20" max="60" step="0.5" value={settings.dspMidsEnd ?? 40} onChange={(e) => setSettings({...settings, dspMidsEnd: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.65rem' }}>Highs: {settings.dspHighsEnd?.toFixed(0)}%</label>
                          <input type="range" min="50" max="95" step="0.5" value={settings.dspHighsEnd ?? 75} onChange={(e) => setSettings({...settings, dspHighsEnd: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Transient Attack: {settings.dspTransientAttack?.toFixed(2)}</label>
                      <input type="range" min="0.7" max="0.99" step="0.01" value={settings.dspTransientAttack ?? 0.95} onChange={(e) => setSettings({...settings, dspTransientAttack: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                    </div>
                  </div>
                </details>
                )}

                {/* ========== SECTION 11: GEOMETRY MATH ========== */}
                {isAdvancedMode && (
                <details style={{ borderBottom: '1px solid #444', paddingBottom: '0.8rem' }}>
                  <summary style={{ opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.6rem' }}>Geometry Modulation (Advanced)</summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.8rem', paddingLeft: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Audio Time Warp: {settings.audioTimeWarpMultiplier?.toFixed(2)}</label>
                      <input type="range" min="0" max="5.0" step="0.1" value={settings.audioTimeWarpMultiplier ?? 0.0} onChange={(e) => setSettings({...settings, audioTimeWarpMultiplier: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Z-Axis Terrain: {settings.terrainMultiplier?.toFixed(2)}</label>
                      <input type="range" min="0" max="5.0" step="0.1" value={settings.terrainMultiplier ?? 0.8} onChange={(e) => setSettings({...settings, terrainMultiplier: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Wind / Sway: {settings.swayMultiplier?.toFixed(2)}</label>
                      <input type="range" min="0" max="3.0" step="0.1" value={settings.swayMultiplier ?? 0.0} onChange={(e) => setSettings({...settings, swayMultiplier: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Pitch Skew: {settings.skewMultiplier?.toFixed(2)}</label>
                      <input type="range" min="0" max="5.0" step="0.1" value={settings.skewMultiplier ?? 0.0} onChange={(e) => setSettings({...settings, skewMultiplier: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                    </div>
                  </div>
                </details>
                )}

                {/* ========== SECTION 12: TRIG FORM ========== */}
                {isAdvancedMode && activeLayer.type === 'audio2d' && settings.visualizationMode === 'audio2d' && (
                <details style={{ borderBottom: '1px solid #444', paddingBottom: '0.8rem' }}>
                  <summary style={{ opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.6rem' }}>Trigonometry Matrix (Advanced)</summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.8rem', paddingLeft: '0.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Sin(X) Freq: {settings.trigSinXFreq?.toFixed(2)}</label>
                        <input type="range" min="0.0" max="2.0" step="0.01" value={settings.trigSinXFreq ?? 0.2} onChange={(e) => setSettings({...settings, trigSinXFreq: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Cos(X) Freq: {settings.trigCosXFreq?.toFixed(2)}</label>
                        <input type="range" min="0.0" max="2.0" step="0.01" value={settings.trigCosXFreq ?? 0.4} onChange={(e) => setSettings({...settings, trigCosXFreq: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Cos(X) Time: {settings.trigCosXTime?.toFixed(2)}</label>
                        <input type="range" min="-2.0" max="2.0" step="0.1" value={settings.trigCosXTime ?? 0.8} onChange={(e) => setSettings({...settings, trigCosXTime: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Sin(Depth X): {settings.trigSinDepthXTime?.toFixed(2)}</label>
                        <input type="range" min="0.0" max="10.0" step="0.1" value={settings.trigSinDepthXTime ?? 5.0} onChange={(e) => setSettings({...settings, trigSinDepthXTime: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Cos(Z) Freq: {settings.trigCosZFreq?.toFixed(2)}</label>
                        <input type="range" min="0.0" max="2.0" step="0.01" value={settings.trigCosZFreq ?? 0.3} onChange={(e) => setSettings({...settings, trigCosZFreq: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Cos(Z) Time: {settings.trigCosZTime?.toFixed(2)}</label>
                        <input type="range" min="-2.0" max="2.0" step="0.1" value={settings.trigCosZTime ?? 0.5} onChange={(e) => setSettings({...settings, trigCosZTime: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Sin(Z) Freq: {settings.trigSinZFreq?.toFixed(2)}</label>
                      <input type="range" min="0.0" max="2.0" step="0.01" value={settings.trigSinZFreq ?? 0.2} onChange={(e) => setSettings({...settings, trigSinZFreq: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                    </div>
                  </div>
                </details>
                )}

                {/* ========== SETTING KHUSUS KINECT MUNCUL BILA AUDIO 2D DIPADUKAN DENGAN KINECT ATAU SEDANG LAYER KINECT */}
                {isAdvancedMode && kinectIsRunning && (
                  <div style={{ padding: '0.8rem', background: '#1a0a2a', borderRadius: '4px', border: '1px solid #4a2a6a', marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <strong style={{ color: '#d48bff', display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}>KINECT 3D CALIBRATION</strong>
                    <div>
                      <label style={{ display: 'flex', justifyContent: 'space-between', color: '#ffb3ff', marginBottom: '0.2rem' }}>Mesh Render Resolution: <span>{settings.kinectResolution !== undefined ? settings.kinectResolution.toFixed(1) : 1.0}x</span></label>
                      <input type="range" min="0.5" max="3.0" step="0.1" value={settings.kinectResolution !== undefined ? settings.kinectResolution : 1.0} onChange={(e) => setSettings({ ...settings, kinectResolution: parseFloat(e.target.value) })} style={{ width: '100%', accentColor: '#ffb3ff' }} />
                    </div>
                    <div>
                      <label style={{ display: 'flex', justifyContent: 'space-between', color: '#ffb3ff', marginBottom: '0.2rem' }}>Near Sensor Distance (Min): <span>{settings.kinectDepthMin}</span></label>
                      <input type="range" min="5" max="100" value={settings.kinectDepthMin} onChange={(e) => setSettings({ ...settings, kinectDepthMin: parseInt(e.target.value) })} style={{ width: '100%', accentColor: '#ffb3ff' }} />
                    </div>
                    <div>
                      <label style={{ display: 'flex', justifyContent: 'space-between', color: '#ffb3ff', marginBottom: '0.2rem' }}>Far Sensor/Wall Distance (Max): <span>{settings.kinectDepthMax}</span></label>
                      <input type="range" min="50" max="250" value={settings.kinectDepthMax} onChange={(e) => setSettings({ ...settings, kinectDepthMax: parseInt(e.target.value) })} style={{ width: '100%', accentColor: '#ffb3ff' }} />
                    </div>
                    <div>
                      <label style={{ display: 'flex', justifyContent: 'space-between', color: '#ffb3ff', marginBottom: '0.2rem' }}>Center Mesh Protrusion (Y-Pull): <span>{settings.kinectYPull}px</span></label>
                      <input type="range" min="0" max="300" value={settings.kinectYPull} onChange={(e) => setSettings({ ...settings, kinectYPull: parseInt(e.target.value) })} style={{ width: '100%', accentColor: '#ffb3ff' }} />
                    </div>
                    <div>
                      <label style={{ display: 'flex', justifyContent: 'space-between', color: '#ffb3ff', marginBottom: '0.2rem' }}>Particle Deformation Force (Text Scale): <span>{settings.kinectScalePush}x</span></label>
                      <input type="range" min="0.0" max="5.0" step="0.1" value={settings.kinectScalePush} onChange={(e) => setSettings({ ...settings, kinectScalePush: parseFloat(e.target.value) })} style={{ width: '100%', accentColor: '#ffb3ff' }} />
                    </div>
                    <div>
                      <label style={{ display: 'flex', justifyContent: 'space-between', color: '#aaffff', marginBottom: '0.2rem' }}>Motor Tilt Position (Up / Down): <span>{kinectTilt}°</span></label>
                      <input type="range" min="-30" max="30" step="1" value={kinectTilt} 
                           onChange={(e) => setKinectTilt(parseInt(e.target.value))} 
                           onMouseUp={() => sendTiltKinect(kinectTilt)}
                           onTouchEnd={() => sendTiltKinect(kinectTilt)}
                           style={{ width: '100%', accentColor: '#aaffff' }} />
                    </div>
                    <hr style={{ borderColor: '#4a2a6a', margin: '0.5rem 0' }} />
                    <div>
                      <label style={{ display: 'flex', justifyContent: 'space-between', color: '#ffb3ff', marginBottom: '0.2rem' }}>Fluid Memory Delay Speed: <span>{(settings.kinectFluidSpeed).toFixed(2)}x</span></label>
                      <input type="range" min="0.01" max="0.5" step="0.01" value={settings.kinectFluidSpeed} onChange={(e) => setSettings({ ...settings, kinectFluidSpeed: parseFloat(e.target.value) })} style={{ width: '100%', accentColor: '#ffb3ff' }} />
                    </div>
                    <div>
                      <label style={{ display: 'flex', justifyContent: 'space-between', color: '#ffb3ff', marginBottom: '0.2rem' }}>Body Emission Glow: <span>{(settings.kinectGlow * 100).toFixed(0)}%</span></label>
                      <input type="range" min="0.0" max="2.0" step="0.1" value={settings.kinectGlow} onChange={(e) => setSettings({ ...settings, kinectGlow: parseFloat(e.target.value) })} style={{ width: '100%', accentColor: '#ffb3ff' }} />
                    </div>
                    <div>
                      <label style={{ display: 'flex', justifyContent: 'space-between', color: '#ffb3ff', marginBottom: '0.2rem' }}>Radial Edge Distortion: <span>{settings.kinectDistortion}x</span></label>
                      <input type="range" min="0.0" max="1.5" step="0.05" value={settings.kinectDistortion} onChange={(e) => setSettings({ ...settings, kinectDistortion: parseFloat(e.target.value) })} style={{ width: '100%', accentColor: '#ffb3ff' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', color: '#ffb3ff' }}>
                      <input type="checkbox" checked={settings.kinectMirror} onChange={(e) => setSettings({ ...settings, kinectMirror: e.target.checked })} style={{ accentColor: '#ffb3ff' }}/>
                      <label>Mirror Camera (Horizontal Flip)</label>
                    </div>

                    <hr style={{ borderColor: '#4a2a6a', margin: '0.5rem 0' }} />
                    <strong style={{ opacity: 0.8, color: '#ffb3ff', fontSize: '0.75rem' }}>3D PARALLAX / SWAY</strong>
                    
                    <div>
                      <label style={{ display: 'flex', justifyContent: 'space-between', color: '#ffb3ff', marginBottom: '0.2rem' }}>3D Parallax Sway Amplitude: <span>{settings.kinectSwayAmplitude !== undefined ? settings.kinectSwayAmplitude.toFixed(1) : 15.0}</span></label>
                      <input type="range" min="0" max="60" step="1" value={settings.kinectSwayAmplitude !== undefined ? settings.kinectSwayAmplitude : 15.0} onChange={(e) => setSettings({ ...settings, kinectSwayAmplitude: parseFloat(e.target.value) })} style={{ width: '100%', accentColor: '#aaffff' }} />
                    </div>
                    <div>
                      <label style={{ display: 'flex', justifyContent: 'space-between', color: '#ffb3ff', marginBottom: '0.2rem' }}>Parallax Sway Speed: <span>{settings.kinectSwaySpeed !== undefined ? settings.kinectSwaySpeed.toFixed(1) : 1.0}x</span></label>
                      <input type="range" min="0.1" max="5.0" step="0.1" value={settings.kinectSwaySpeed !== undefined ? settings.kinectSwaySpeed : 1.0} onChange={(e) => setSettings({ ...settings, kinectSwaySpeed: parseFloat(e.target.value) })} style={{ width: '100%', accentColor: '#aaffff' }} />
                    </div>

                    <hr style={{ borderColor: '#4a2a6a', margin: '0.5rem 0' }} />
                    <strong style={{ opacity: 0.8, color: '#ff00ff', fontSize: '0.75rem' }}>CYBERPUNK EFFECTS (EXPERIMENTAL)</strong>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.3rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#fff', fontSize: '0.7rem' }}>
                          <input type="checkbox" checked={settings.kinectLightTrails} onChange={(e) => setSettings({ ...settings, kinectLightTrails: e.target.checked })} style={{ accentColor: '#ff00ff' }}/>
                          Motion Blur / Trails
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#fff', fontSize: '0.7rem' }}>
                          <input type="checkbox" checked={settings.kinectZAxisColor} onChange={(e) => setSettings({ ...settings, kinectZAxisColor: e.target.checked })} style={{ accentColor: '#ff00ff' }}/>
                          Holographic Z-Color
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#fff', fontSize: '0.7rem' }}>
                          <input type="checkbox" checked={settings.kinectShockwave} onChange={(e) => setSettings({ ...settings, kinectShockwave: e.target.checked })} style={{ accentColor: '#ff00ff' }}/>
                          Bass Explosions
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#fff', fontSize: '0.7rem' }}>
                          <input type="checkbox" checked={settings.kinectWireframe} onChange={(e) => setSettings({ ...settings, kinectWireframe: e.target.checked })} style={{ accentColor: '#ff00ff' }}/>
                          Matrix Wireframe
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#00ffcc', fontSize: '0.7rem' }}>
                          <input type="checkbox" checked={settings.kinectSurveillance} onChange={(e) => setSettings({ ...settings, kinectSurveillance: e.target.checked })} style={{ accentColor: '#00ffcc' }}/>
                          [CCTV] Tracker
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#fff', fontSize: '0.7rem' }}>
                          <input type="color" value={settings.kinectSurveillanceColor || '#00ffcc'} onChange={(e) => setSettings({ ...settings, kinectSurveillanceColor: e.target.value })} style={{ width: '20px', height: '20px', padding: 0, border: 'none', background: 'none' }}/>
                          CCTV Color
                        </label>
                    </div>
                    {settings.kinectSurveillance && (
                      <div style={{ marginTop: '0.3rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0, 255, 204, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                        <div>
                          <label style={{ display: 'flex', justifyContent: 'space-between', color: settings.kinectSurveillanceColor || '#00ffcc', marginBottom: '0.2rem', fontSize: '0.7rem' }}>Tracking UI Opacity: <span>{(settings.kinectSurveillanceOpacity ?? 0.8).toFixed(2)}</span></label>
                          <input type="range" min="0.0" max="1.0" step="0.05" value={settings.kinectSurveillanceOpacity ?? 0.8} onChange={(e) => setSettings({ ...settings, kinectSurveillanceOpacity: parseFloat(e.target.value) })} style={{ width: '100%', accentColor: settings.kinectSurveillanceColor || '#00ffcc' }} />
                        </div>
                        <div>
                          <label style={{ display: 'flex', justifyContent: 'space-between', color: settings.kinectSurveillanceColor || '#00ffcc', marginBottom: '0.2rem', fontSize: '0.7rem' }}>Tracking UI Size: <span>{(settings.kinectSurveillanceSize ?? 1.2).toFixed(2)}x</span></label>
                          <input type="range" min="0.5" max="3.0" step="0.1" value={settings.kinectSurveillanceSize ?? 1.2} onChange={(e) => setSettings({ ...settings, kinectSurveillanceSize: parseFloat(e.target.value) })} style={{ width: '100%', accentColor: settings.kinectSurveillanceColor || '#00ffcc' }} />
                        </div>
                      </div>
                    )}

                    <hr style={{ borderColor: '#444', margin: '0.5rem 0' }} />
                    <strong style={{ opacity: 0.8, color: '#fff', fontSize: '0.75rem' }}>POSITION & CROP</strong>
                    
                    <div>
                      <label style={{ display: 'flex', justifyContent: 'space-between', color: '#ccc', marginBottom: '0.2rem' }}>Camera Zoom Scale: <span>{settings.kinectZoom?.toFixed(2)}x</span></label>
                      <input type="range" min="0.5" max="3.0" step="0.05" value={settings.kinectZoom || 1.0} onChange={(e) => setSettings({ ...settings, kinectZoom: parseFloat(e.target.value) })} style={{ width: '100%', accentColor: '#fff' }} />
                    </div>
                    <div>
                      <label style={{ display: 'flex', justifyContent: 'space-between', color: '#ccc', marginBottom: '0.2rem' }}>Horizontal Offset (X): <span>{settings.kinectOffsetX?.toFixed(2)}</span></label>
                      <input type="range" min="-1.0" max="1.0" step="0.05" value={settings.kinectOffsetX || 0.0} onChange={(e) => setSettings({ ...settings, kinectOffsetX: parseFloat(e.target.value) })} style={{ width: '100%', accentColor: '#fff' }} />
                    </div>
                    <div>
                      <label style={{ display: 'flex', justifyContent: 'space-between', color: '#ccc', marginBottom: '0.2rem' }}>Vertical Offset (Y): <span>{settings.kinectOffsetY?.toFixed(2)}</span></label>
                      <input type="range" min="-1.0" max="1.0" step="0.05" value={settings.kinectOffsetY || 0.0} onChange={(e) => setSettings({ ...settings, kinectOffsetY: parseFloat(e.target.value) })} style={{ width: '100%', accentColor: '#fff' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.3rem' }}>
                        <div>
                          <label style={{ display: 'block', color: '#ccc', fontSize: '0.7rem' }}>Crop Left: {(settings.kinectCropLeft ?? 0).toFixed(2)}</label>
                          <input type="range" min="0.0" max="0.5" step="0.01" value={settings.kinectCropLeft || 0.0} onChange={(e) => setSettings({ ...settings, kinectCropLeft: parseFloat(e.target.value) })} style={{ width: '100%' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#ccc', fontSize: '0.7rem', textAlign: 'right' }}>Crop Right: {(settings.kinectCropRight ?? 1).toFixed(2)}</label>
                          <input type="range" min="0.5" max="1.0" step="0.01" value={settings.kinectCropRight || 1.0} onChange={(e) => setSettings({ ...settings, kinectCropRight: parseFloat(e.target.value) })} style={{ width: '100%' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#ccc', fontSize: '0.7rem' }}>Crop Top: {(settings.kinectCropTop ?? 0).toFixed(2)}</label>
                          <input type="range" min="0.0" max="0.5" step="0.01" value={settings.kinectCropTop || 0.0} onChange={(e) => setSettings({ ...settings, kinectCropTop: parseFloat(e.target.value) })} style={{ width: '100%' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#ccc', fontSize: '0.7rem', textAlign: 'right' }}>Crop Bottom: {(settings.kinectCropBottom ?? 1).toFixed(2)}</label>
                          <input type="range" min="0.5" max="1.0" step="0.01" value={settings.kinectCropBottom || 1.0} onChange={(e) => setSettings({ ...settings, kinectCropBottom: parseFloat(e.target.value) })} style={{ width: '100%' }} />
                        </div>
                    </div>
                  </div>
                )}

                {isAdvancedMode && kinectIsRunning && activeLayer.type === 'audio2d' && (
                  <div style={{ padding: '0.8rem', background: '#0a2a1a', borderRadius: '4px', border: '1px solid #2a6a4a', marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <strong style={{ color: '#00ff99', display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}>KINECT SERVER CONFIGURATION (ZERO HARDCODES)</strong>
                    
                    <strong style={{ color: '#00ff99', fontSize: '0.7rem', marginTop: '0.4rem' }}>Resolution & Downsampling</strong>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Downsampling Factor: {settings.kinectServerDownsamplingFactor}x</label>
                      <select value={settings.kinectServerDownsamplingFactor ?? 2} onChange={(e) => setSettings({...settings, kinectServerDownsamplingFactor: parseInt(e.target.value)})} style={{ width: '100%', background: '#222', color: '#fff', border: '1px solid #00ff99', padding: '4px' }}>
                        <option value="1">1x (Full 640x480 - High Detail)</option>
                        <option value="2">2x (320x240 - Balanced)</option>
                        <option value="4">4x (160x120 - Low Latency)</option>
                      </select>
                    </div>

                    <strong style={{ color: '#00ff99', fontSize: '0.7rem', marginTop: '0.4rem' }}>Depth Normalization</strong>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Normalization Divisor: {(settings.kinectServerNormalizationDivisor ?? 8).toFixed(1)}</label>
                      <input type="range" min="1" max="20" step="0.5" value={settings.kinectServerNormalizationDivisor ?? 8} onChange={(e) => setSettings({...settings, kinectServerNormalizationDivisor: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.65rem' }}>Depth Min Raw: {settings.kinectServerDepthMinRaw ?? 0}</label>
                        <input type="range" min="0" max="500" step="10" value={settings.kinectServerDepthMinRaw ?? 0} onChange={(e) => setSettings({...settings, kinectServerDepthMinRaw: parseInt(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.65rem' }}>Depth Max Raw: {settings.kinectServerDepthMaxRaw ?? 2048}</label>
                        <input type="range" min="1500" max="2048" step="10" value={settings.kinectServerDepthMaxRaw ?? 2048} onChange={(e) => setSettings({...settings, kinectServerDepthMaxRaw: parseInt(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Raw Bit Depth: {settings.kinectServerRawBitDepth ?? 11}-bit</label>
                      <input type="range" min="8" max="16" step="1" value={settings.kinectServerRawBitDepth ?? 11} onChange={(e) => setSettings({...settings, kinectServerRawBitDepth: parseInt(e.target.value)})} style={{ width: '100%' }} />
                    </div>

                    <strong style={{ color: '#00ff99', fontSize: '0.7rem', marginTop: '0.4rem' }}>Frame Rate Control</strong>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>Server FPS: {settings.kinectServerFPS ?? 30}</label>
                      <input type="range" min="10" max="60" step="5" value={settings.kinectServerFPS ?? 30} onChange={(e) => setSettings({...settings, kinectServerFPS: parseInt(e.target.value)})} style={{ width: '100%' }} />
                    </div>

                    <strong style={{ color: '#00ff99', fontSize: '0.7rem', marginTop: '0.4rem' }}>Motor Tilt Bounds</strong>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.65rem' }}>Tilt Min: {settings.kinectServerTiltMin ?? -30}°</label>
                        <input type="range" min="-60" max="0" step="1" value={settings.kinectServerTiltMin ?? -30} onChange={(e) => setSettings({...settings, kinectServerTiltMin: parseInt(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.65rem' }}>Tilt Max: {settings.kinectServerTiltMax ?? 30}°</label>
                        <input type="range" min="0" max="60" step="1" value={settings.kinectServerTiltMax ?? 30} onChange={(e) => setSettings({...settings, kinectServerTiltMax: parseInt(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                    </div>

                    <strong style={{ color: '#00ff99', fontSize: '0.7rem', marginTop: '0.4rem' }}>LED Control</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input type="checkbox" checked={settings.kinectServerLEDEnabled ?? false} onChange={(e) => setSettings({...settings, kinectServerLEDEnabled: e.target.checked})} style={{ accentColor: '#00ff99' }}/>
                      <label style={{ color: '#fff', fontSize: '0.7rem' }}>Enable LED</label>
                    </div>
                    {settings.kinectServerLEDEnabled && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.1rem', color: '#fff', fontSize: '0.7rem' }}>LED Color:</label>
                        <select value={settings.kinectServerLEDColor ?? 'off'} onChange={(e) => setSettings({...settings, kinectServerLEDColor: e.target.value})} style={{ width: '100%', background: '#222', color: '#fff', border: '1px solid #00ff99', padding: '4px' }}>
                          <option value="off">Off</option>
                          <option value="red">Red</option>
                          <option value="green">Green</option>
                          <option value="yellow">Yellow</option>
                          <option value="blink_red">Blink Red</option>
                          <option value="blink_green">Blink Green</option>
                          <option value="blink_yellow">Blink Yellow</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {activeLayer.type === 'media' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <strong style={{ opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}>Media Reactivity</strong>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Audio Size Impact (Pump): {settings.mediaAudioImpact?.toFixed(2)}</label>
                        <input type="range" min="0" max="2" step="0.1" value={settings.mediaAudioImpact || 0} onChange={(e) => setSettings({...settings, mediaAudioImpact: parseFloat(e.target.value)})} style={{ width: '100%', accentColor: '#ffcc00' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" id="mediaInvert" checked={settings.mediaInvertDrop || false} onChange={(e) => setSettings({...settings, mediaInvertDrop: e.target.checked})} style={{ accentColor: '#ffcc00' }} />
                        <label htmlFor="mediaInvert" style={{ color: '#fff' }}>Invert Action (Drop/Blackout on Beat)</label>
                      </div>
                    </div>
                  </>
                )}

                {activeLayer.type === 'webcamAscii' && (
                  <>
                    {/* GROUP 6: ASCII SETTINGS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <strong style={{ opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}>ASCII & Webcam</strong>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>ASCII Resolution: {settings.asciiResolution}</label>
                        <input type="range" min="10" max="150" step="5" value={settings.asciiResolution} onChange={(e) => setSettings({...settings, asciiResolution: parseInt(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Character Set:</label>
                        <select 
                          style={{ width: '100%', padding: '4px', background: '#333', color: 'white', border: 'none', borderRadius: '4px' }}
                          value={settings.asciiCharSet} 
                          onChange={(e) => setSettings({...settings, asciiCharSet: e.target.value as any})}
                        >
                           <option value="standard">Standard (@%#*+=-:. )</option>
                           <option value="dense">Dense</option>
                           <option value="binary">Binary (10)</option>
                           <option value="matrix">Matrix</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>ASCII Glitch Intensity: {settings.asciiGlitch}</label>
                        <input type="range" min="0" max="100" step="1" value={settings.asciiGlitch} onChange={(e) => setSettings({...settings, asciiGlitch: parseInt(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Audio Size Impact: {settings.asciiAudioImpact.toFixed(2)}</label>
                        <input type="range" min="0" max="2" step="0.1" value={settings.asciiAudioImpact} onChange={(e) => setSettings({...settings, asciiAudioImpact: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" id="asciiInvert" checked={settings.asciiInvert} onChange={(e) => setSettings({...settings, asciiInvert: e.target.checked})} />
                        <label htmlFor="asciiInvert" style={{ color: '#fff' }}>Invert Brightness</label>
                      </div>
                    </div>
                  </>
                )}

              </div>
            </div>
          )}

          {activeLayer && activeMenu === 'midi' && (
              <div style={{ marginTop: '0', padding: '1rem', background: '#111', borderRadius: '6px', border: '1px solid #333', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ margin: '0 0 0.8rem 0', color: '#22c55e', fontSize: '0.75rem', letterSpacing: '1px' }}>MIDI CC Assigner</h4>
                
                {midiMappings.filter(m => m.layerId === activeLayer.id).map(m => (
                  <div key={`${m.cc}-${m.channel}-${m.settingKey}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', marginBottom: '0.4rem', fontSize: '0.75rem', background: '#111', padding: '0.4rem', borderRadius: '4px' }}>
                    <span style={{ color: '#22c55e', fontWeight: 'bold' }}>CC {m.cc}</span>
                    <span style={{flex: 1, textOverflow: 'ellipsis', overflow: 'hidden'}}>{m.settingKey} ({m.min}..{m.max})</span>
                    <button 
                      style={{ padding: '2px 6px', fontSize: '0.65rem' }}
                      className="outline"
                      onClick={() => {
                        setMidiMappings(prev => {
                          const updated = prev.filter(p => !(p.cc === m.cc && p.channel === m.channel));
                          localStorage.setItem('visualizer_midi', JSON.stringify(updated));
                          return updated;
                        });
                      }}>DEL</button>
                  </div>
                ))}
                
                <div style={{ display: 'flex', gap: '0.4rem', flexDirection: 'column', marginTop: '1rem', borderTop: '1px dashed #444', paddingTop: '1rem' }}>
                  <select 
                    value={newMappingKey} 
                    onChange={e => setNewMappingKey(e.target.value)}
                    style={{ width: '100%', padding: '6px', background: '#111', color: 'white', border: '1px solid #333', borderRadius: '4px' }}
                  >
                    <option value="layerOpacity">Layer Opacity (Global)</option>
                    {Object.keys(defaultSettings).map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{fontSize: '10px', opacity: 0.6}}>Min:</span>
                    <input type="number" step="0.01" placeholder="Min" value={newMappingMin} onChange={e => setNewMappingMin(parseFloat(e.target.value))} style={{ width: '40%', padding: '4px', background: '#111', color: 'white', border: '1px solid #333', borderRadius: '4px' }} />
                    <span style={{fontSize: '10px', opacity: 0.6}}>Max:</span>
                    <input type="number" step="0.01" placeholder="Max" value={newMappingMax} onChange={e => setNewMappingMax(parseFloat(e.target.value))} style={{ width: '40%', padding: '4px', background: '#111', color: 'white', border: '1px solid #333', borderRadius: '4px' }} />
                  </div>
                  <button 
                    onClick={() => {
                      if (learningMidi) {
                        setLearningMidi(null);
                      } else {
                        setLearningMidi({
                          settingKey: newMappingKey,
                          min: newMappingMin,
                          max: newMappingMax,
                          layerId: activeLayer.id
                        });
                      }
                    }} 
                    style={{ 
                      marginTop: '0.4rem',
                      background: learningMidi ? '#ffcc00' : '#444', 
                      color: learningMidi ? '#000' : '#fff',
                      border: 'none',
                      fontWeight: learningMidi ? 'bold' : 'normal',
                      padding: '8px'
                    }}
                  >
                    {learningMidi ? "Twist Knob / Move Fader Now... (Click to cancel)" : "+ Assign MIDI CC to Setting"}
                  </button>
                </div>
              </div>
          )}
          </div>
        </aside>
      )}

      <main
        ref={stageRef}
        className="stage"
        style={(isFullscreen || isProjectorMode) ? { margin: 0, padding: 0, borderRadius: 0, width: '100vw', height: '100vh', position: 'relative', cursor: 'none' } : {}}
        onDoubleClick={isProjectorMode ? undefined : toggleFullscreen}
      >
        <canvas ref={canvasRef} />
        {showHud && (
          <div className={`stage-hud ${clipWarning ? 'warning' : ''}`}>
            <div className="stage-hud-row">
              <span>FPS {fps}</span>
              <span>{activeSource === 'mic' ? 'MIC' : 'SYSTEM'}</span>
              <span>Layer {activeLayer ? activeLayer.type : 'none'}</span>
            </div>
            <div className="stage-hud-row">
              <span>LVL {(liveMetrics.level * 100).toFixed(0)}%</span>
              <span>ENG {(liveMetrics.energy * 100).toFixed(0)}%</span>
              <span>{liveMetrics.bassHit ? 'BASS HIT' : 'BASS HOLD'}</span>
            </div>
            <div className="stage-hud-row">
              <span>Preset {activePresetLabel}</span>
              <span>{clipWarning ? 'CLIP RISK' : 'HEADROOM OK'}</span>
            </div>
          </div>
        )}

        {/* Hamburger gear toggles the sidebar on narrow viewports. Kept out of
            fullscreen / projector mode so it never shows during shows. */}
        {isNarrow && !isFullscreen && !isProjectorMode && (
          <button
            type="button"
            className="mobile-sidebar-toggle"
            onClick={() => setMobileSidebarOpen(prev => !prev)}
            aria-label="Toggle settings panel"
            title="Settings"
          >
            ⚙
          </button>
        )}
      </main>

      {/* Backdrop dims the stage when the mobile sidebar is open. */}
      {isNarrow && mobileSidebarOpen && !isFullscreen && !isProjectorMode && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* ── Toasts — dismissible notifications for errors and actions ── */}
      {toasts.length > 0 && (
        <div className="toast-stack" role="status" aria-live="polite">
          {toasts.map(t => (
            <div key={t.id} className={`toast toast--${t.kind}`}>
              <span className="toast-message">{t.message}</span>
              <button
                type="button"
                className="toast-dismiss"
                onClick={() => dismissToast(t.id)}
                aria-label="Dismiss"
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* ── Shortcuts help popover ── */}
      {showShortcutsHelp && (
        <div className="shortcuts-help-backdrop" onClick={() => setShowShortcutsHelp(false)}>
          <div className="shortcuts-help-panel" onClick={(e) => e.stopPropagation()}>
            <div className="shortcuts-help-header">
              <strong>Keyboard Shortcuts</strong>
              <button
                type="button"
                className="toast-dismiss"
                onClick={() => setShowShortcutsHelp(false)}
                aria-label="Close"
              >✕</button>
            </div>
            <dl className="shortcuts-list">
              <dt><kbd>Space</kbd></dt><dd>Play / pause input</dd>
              <dt><kbd>F</kbd></dt><dd>Toggle fullscreen</dd>
              <dt><kbd>P</kbd></dt><dd>Cycle mandala preset</dd>
              <dt><kbd>M</kbd></dt><dd>Cycle movement style</dd>
              <dt><kbd>S</kbd></dt><dd>Save settings</dd>
              <dt><kbd>R</kbd></dt><dd>Randomize mandala</dd>
              <dt><kbd>?</kbd></dt><dd>Toggle this help</dd>
              <dt><kbd>Esc</kbd></dt><dd>Exit fullscreen / close overlays</dd>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
