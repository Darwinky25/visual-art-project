export type DjDeckState = {
  jogWheel: number;
  isPlaying: boolean;
  isCue: boolean;
  tempoFader: number; // 0..1
  pitchBendUp: boolean;
  pitchBendDown: boolean;
  sync: boolean;
  masterTempo: boolean;
  vinylMode: boolean;
  slipMode: boolean;
  shift: boolean;
  pads: boolean[]; // 8 pads
  loopIn: boolean;
  loopOut: boolean;
  reloop: boolean;
  beatJump: boolean;
  search: boolean;
};

export type DjMixerState = {
  trim: number; // 0..1
  eqHi: number; // 0..1
  eqMid: number; // 0..1
  eqLow: number; // 0..1
  colorFx: number; // 0..1
  channelFader: number; // 0..1
  crossfader: number; // 0..1
  masterLevel: number; // 0..1
  boothLevel: number; // 0..1
  headphoneMix: number; // 0..1
  headphoneLevel: number; // 0..1
  cue: boolean;
  load: boolean;
  browse: number;
  backTag: boolean;
};

export type DjFxState = {
  fxSelect: number;
  fxOn: boolean;
  fxLevelDepth: number; // 0..1
  beatButtons: number;
  micLevel: number; // 0..1
  micEqHi: number; // 0..1
  micEqLow: number; // 0..1
  talkover: boolean;
};

export type DjState = {
  mixerA: DjMixerState;
  mixerB: DjMixerState;
  deckA: DjDeckState;
  deckB: DjDeckState;
  globalFx: DjFxState;
};

export const createDefaultDeck = (): DjDeckState => ({
  jogWheel: 0,
  isPlaying: false,
  isCue: false,
  tempoFader: 0.5,
  pitchBendUp: false,
  pitchBendDown: false,
  sync: false,
  masterTempo: false,
  vinylMode: false,
  slipMode: false,
  shift: false,
  pads: new Array(8).fill(false),
  loopIn: false,
  loopOut: false,
  reloop: false,
  beatJump: false,
  search: false,
});

export const createDefaultMixer = (): DjMixerState => ({
  trim: 0.5,
  eqHi: 0.5,
  eqMid: 0.5,
  eqLow: 0.5,
  colorFx: 0.5,
  channelFader: 1.0,
  crossfader: 0.5,
  masterLevel: 1.0,
  boothLevel: 0.8,
  headphoneMix: 0.5,
  headphoneLevel: 0.5,
  cue: false,
  load: false,
  browse: 0,
  backTag: false,
});

export const createDefaultFx = (): DjFxState => ({
  fxSelect: 0,
  fxOn: false,
  fxLevelDepth: 0.0,
  beatButtons: 0.5,
  micLevel: 1.0,
  micEqHi: 0.5,
  micEqLow: 0.5,
  talkover: false,
});

export const createDefaultDjState = (): DjState => ({
  mixerA: createDefaultMixer(),
  mixerB: createDefaultMixer(),
  deckA: createDefaultDeck(),
  deckB: createDefaultDeck(),
  globalFx: createDefaultFx(),
});
