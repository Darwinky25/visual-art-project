import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AudioFrame, AudioMetrics } from '../types';
import { AudioProcessor } from '../audioProcessor';

const createEmptyFrame = (bins = 256): AudioFrame => ({
  level: 0,
  peak: 0,
  bass: 0,
  mids: 0,
  highs: 0,
  treble: 0,
  energy: 0,
  bassHit: false,
  pulse: 0,
  bpmHint: 0,
  beatOnset: 0,
  beatThreshold: 0,
  beatIntervalMs: 500,
  beatConfidence: 0,
  centroid: 0,
  texture: 0,
  frequency: new Uint8Array(bins),
  waveform: new Uint8Array(bins),
  time: 0, // Milliseconds since analyzer started
});

export function useMicrophoneAnalyzer(
  smoothingTimeConstant: number = 0.15,
  audioProcessorConfig: any = {},
  metricsUpdateMs: number = 180
) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const frameRef = useRef<AudioFrame>(createEmptyFrame());
  const processorRef = useRef<AudioProcessor>(new AudioProcessor());
  
  // Re-sync processor reference on config change
  useEffect(() => {
    if (processorRef.current) {
      processorRef.current.setConfig(audioProcessorConfig);
    }
  }, [audioProcessorConfig]);

  // Sync analyser DSP settings when config changes
  useEffect(() => {
    if (analyserRef.current) {
      if (audioProcessorConfig?.dspFftSize) {
        analyserRef.current.fftSize = audioProcessorConfig.dspFftSize;
      }
      if (audioProcessorConfig?.dspMinDecibels !== undefined) {
        analyserRef.current.minDecibels = audioProcessorConfig.dspMinDecibels;
      }
      if (audioProcessorConfig?.dspMaxDecibels !== undefined) {
        analyserRef.current.maxDecibels = audioProcessorConfig.dspMaxDecibels;
      }
    }
  }, [audioProcessorConfig?.dspFftSize, audioProcessorConfig?.dspMinDecibels, audioProcessorConfig?.dspMaxDecibels]);
  
  const runningRef = useRef(false);
  const metricsIntervalRef = useRef(metricsUpdateMs);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'starting' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AudioMetrics>(frameRef.current);

  useEffect(() => {
    metricsIntervalRef.current = Math.max(60, metricsUpdateMs);
  }, [metricsUpdateMs]);

  const stop = useCallback((resetStatus = true) => {
    runningRef.current = false;
    setIsRunning(false);
    if (resetStatus) {
      setStatus('idle');
    }

    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    sourceRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    void audioContextRef.current?.close();
    audioContextRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (analyserRef.current) {
      analyserRef.current.smoothingTimeConstant = smoothingTimeConstant;
    }
  }, [smoothingTimeConstant]);

  const start = useCallback(async (forcedDeviceId?: string) => {
    if (runningRef.current) {
      // Allow restarting cleanly if we are forcing a new device while already running
      if (forcedDeviceId) stop(false);
      else return;
    }

    setError(null);
    setStatus('starting');

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Browser tidak mendukung microphone access.');
      setStatus('error');
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      
      let targetDeviceId = forcedDeviceId;
      if (!targetDeviceId) {
        const nonKinectMic = audioInputs.find(d => !d.label.toLowerCase().includes('kinect') && !d.label.toLowerCase().includes('xbox'));
        if (nonKinectMic) targetDeviceId = nonKinectMic.deviceId;
      }
      
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          ...(targetDeviceId ? { deviceId: { exact: targetDeviceId } } : {})
        },
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.warn("Failed with specific deviceId, falling back to default mic:", err);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('AudioContext tidak tersedia di browser ini.');
      }

      const audioContext = new AudioContextClass({ latencyHint: 'interactive' });
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = audioProcessorConfig?.dspFftSize ?? 2048; // Default 2048 gives us ~21Hz resolution per bin
      analyser.minDecibels = audioProcessorConfig?.dspMinDecibels ?? -80; // Limit bottom noise floor to avoid false rhythm
      analyser.maxDecibels = audioProcessorConfig?.dspMaxDecibels ?? -10;

      analyser.smoothingTimeConstant = Math.max(0, Math.min(0.99, smoothingTimeConstant));

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Set sample rate in processor for accurate frequency calculations
      if (processorRef.current && typeof processorRef.current.setSampleRate === 'function') {
        processorRef.current.setSampleRate(audioContext.sampleRate);
      }

      // Pre-allocate buffers for performance (avoid GC pressure)
      let frequency = new Uint8Array(analyser.frequencyBinCount);
      let waveform = new Uint8Array(analyser.frequencyBinCount);
      const now = performance.now();
      let lastMetricsUpdate = now;
      const startTime = now; // Track when animation loop started

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;
      streamRef.current = stream;
      runningRef.current = true;
      setIsRunning(true);
      setStatus('ready');

      const loop = () => {
        if (!analyserRef.current || !runningRef.current) {
          return;
        }

        // Reallocate buffers only if FFT size changed
        if (frequency.length !== analyserRef.current.frequencyBinCount) {
          frequency = new Uint8Array(analyserRef.current.frequencyBinCount);
          waveform = new Uint8Array(analyserRef.current.frequencyBinCount);
          console.log('[MicAnalyzer] Buffer size changed to', analyserRef.current.frequencyBinCount);
        }

        // Get audio data
        analyserRef.current.getByteFrequencyData(frequency);
        analyserRef.current.getByteTimeDomainData(waveform);

        // Process audio with production-quality algorithms
        const metricsObj = processorRef.current.process(frequency, waveform);

        // Update frame reference (shared with visualizers)
        frameRef.current = {
          ...metricsObj,
          frequency,
          waveform,
          time: performance.now() - startTime, // Milliseconds since loop started
        };

        // Throttle React state updates to reduce overhead
        if (performance.now() - lastMetricsUpdate > metricsIntervalRef.current) {
          lastMetricsUpdate = performance.now();
          setMetrics(metricsObj);
        }

        animationRef.current = requestAnimationFrame(loop);
      };

      animationRef.current = requestAnimationFrame(loop);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Gagal mengakses microphone.';
      stop(false);
      setError(message);
      setStatus('error');
    }
  }, [stop, audioProcessorConfig, smoothingTimeConstant]);

  const frame = useMemo(() => frameRef, []);

  return {
    frame,
    metrics,
    error,
    status,
    isRunning,
    start,
    stop,
  };
}
