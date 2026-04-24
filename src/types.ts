export type VisualPalette = {
  name: string;
  base: string;
  accent: string;
  glow: string;
  background: string;
  backgroundAlt: string;
};

export type AudioMetrics = {
  level: number;
  peak: number;
  bass: number;
  mids: number;
  highs: number;
  treble: number;
  pulse: number;
  bpmHint: number;
  beatOnset: number;
  beatThreshold: number;
  beatIntervalMs: number;
  beatConfidence: number;
  energy: number;
  bassHit: boolean;
  centroid: number; // "Brightness" or center of frequency mass (0-1)
  texture: number;  // "Roughness" or noisiness of the sound (Zero Crossing Rate)
};

export type AudioFrame = AudioMetrics & {
  frequency: Uint8Array;
  waveform: Uint8Array;
  time: number; // Milliseconds since frame creation, for mathematical animations
};
