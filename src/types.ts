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
  pulse: number;
  bpmHint: number;
};

export type AudioFrame = AudioMetrics & {
  frequency: Uint8Array;
  waveform: Uint8Array;
};
