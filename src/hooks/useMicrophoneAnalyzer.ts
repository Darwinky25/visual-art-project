import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AudioFrame, AudioMetrics } from '../types';

const createEmptyFrame = (bins = 256): AudioFrame => ({
  level: 0,
  peak: 0,
  bass: 0,
  mids: 0,
  highs: 0,
  pulse: 0,
  bpmHint: 0,
  frequency: new Uint8Array(bins),
  waveform: new Uint8Array(bins),
});

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function useMicrophoneAnalyzer(smoothingTimeConstant: number = 0.15) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTapRef = useRef<number | null>(null);
  const tapsRef = useRef<number[]>([]);
  const frameRef = useRef<AudioFrame>(createEmptyFrame());
  const runningRef = useRef(false);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'starting' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AudioMetrics>(frameRef.current);

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

  const start = useCallback(async () => {
    if (runningRef.current) {
      return;
    }

    setError(null);
    setStatus('starting');

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Browser tidak mendukung microphone access.');
      setStatus('error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('AudioContext tidak tersedia di browser ini.');
      }

      const audioContext = new AudioContextClass({ latencyHint: 'interactive' });
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      // Diberi sedikit smoothing (0.15) biar gerakannya gak terlalu "kasar"
      // tapi latency tetep berasa instan dibanding default (0.8)
      analyser.smoothingTimeConstant = smoothingTimeConstant;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const frequency = new Uint8Array(analyser.frequencyBinCount);
      const waveform = new Uint8Array(analyser.frequencyBinCount);
      const now = performance.now();
      let lastMetricsUpdate = now;

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

        analyserRef.current.getByteFrequencyData(frequency);
        analyserRef.current.getByteTimeDomainData(waveform);

        const bins = frequency.length;
        const bassEnd = Math.max(8, Math.floor(bins * 0.12));
        const midsEnd = Math.max(bassEnd + 1, Math.floor(bins * 0.45));

        let sum = 0;
        let peak = 0;
        let bassSum = 0;
        let midsSum = 0;
        let highsSum = 0;
        let zeroCrossings = 0;
        let previousSigned = waveform[0] - 128;

        for (let i = 0; i < bins; i += 1) {
          const value = frequency[i] / 255;
          sum += value;
          peak = Math.max(peak, value);

          if (i < bassEnd) {
            bassSum += value;
          } else if (i < midsEnd) {
            midsSum += value;
          } else {
            highsSum += value;
          }

          const signed = waveform[i] - 128;
          if ((signed >= 0 && previousSigned < 0) || (signed < 0 && previousSigned >= 0)) {
            zeroCrossings += 1;
          }
          previousSigned = signed;
        }

        const level = sum / bins;
        const bass = bassSum / bassEnd;
        const mids = midsSum / Math.max(1, midsEnd - bassEnd);
        const highs = highsSum / Math.max(1, bins - midsEnd);
        const pulse = clamp01(Math.max(bass * 1.2, level * 0.95, peak * 0.75));

        const lastTap = lastTapRef.current;
        if (pulse > 0.72) {
          const tapTime = performance.now();
          if (lastTap !== null && tapTime - lastTap > 250 && tapTime - lastTap < 1100) {
            tapsRef.current.push(tapTime - lastTap);
            tapsRef.current = tapsRef.current.slice(-6);
          }
          lastTapRef.current = tapTime;
        }

        const averageTap = tapsRef.current.length
          ? tapsRef.current.reduce((acc, value) => acc + value, 0) / tapsRef.current.length
          : 0;
        const bpmHint = averageTap > 0 ? 60000 / averageTap : Math.min(180, Math.max(60, 80 + bass * 60 + zeroCrossings * 0.08));

        frameRef.current = {
          level,
          peak,
          bass,
          mids,
          highs,
          pulse,
          bpmHint,
          frequency,
          waveform,
        };

        if (performance.now() - lastMetricsUpdate > 90) {
          lastMetricsUpdate = performance.now();
          setMetrics({ level, peak, bass, mids, highs, pulse, bpmHint });
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
  }, [stop]);

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
