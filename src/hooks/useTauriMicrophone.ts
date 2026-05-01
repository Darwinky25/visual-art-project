import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
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
  time: 0,
});

export function useTauriMicrophone(
  smoothingTimeConstant: number = 0.15,
  audioProcessorConfig: any = {}
  // metricsUpdateMs parameter removed - unused
) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const frameRef = useRef<AudioFrame>(createEmptyFrame());
  const processorRef = useRef<AudioProcessor>(new AudioProcessor());
  const unlistenRef = useRef<(() => void) | null>(null);
  
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'starting' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AudioMetrics>(frameRef.current);
  const [devices, setDevices] = useState<string[]>([]);

  // Update processor config
  useEffect(() => {
    if (processorRef.current) {
      processorRef.current.setConfig(audioProcessorConfig);
    }
  }, [audioProcessorConfig]);

  // List available devices
  const refreshDevices = useCallback(async () => {
    try {
      const deviceList = await invoke<string[]>('list_audio_devices');
      setDevices(deviceList);
    } catch (err) {
      console.error('Failed to list audio devices:', err);
    }
  }, []);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  const stop = useCallback(async () => {
    setIsRunning(false);
    setStatus('idle');

    // Stop Tauri audio capture
    try {
      await invoke('stop_audio_capture');
    } catch (err) {
      console.error('Failed to stop audio capture:', err);
    }

    // Unlisten from audio events
    if (unlistenRef.current) {
      unlistenRef.current();
      unlistenRef.current = null;
    }

    // Clean up Web Audio API
    scriptProcessorRef.current?.disconnect();
    scriptProcessorRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    await audioContextRef.current?.close();
    audioContextRef.current = null;
  }, []);

  useEffect(() => () => { stop(); }, [stop]);

  const start = useCallback(async (deviceName?: string) => {
    if (isRunning) {
      await stop();
    }

    setError(null);
    setStatus('starting');

    try {
      // Create Web Audio context for analysis
      const AudioContextClass = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('AudioContext not available');
      }

      const audioContext = new AudioContextClass({ latencyHint: 'interactive' });
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = audioProcessorConfig?.dspFftSize ?? 2048;
      analyser.minDecibels = audioProcessorConfig?.dspMinDecibels ?? -80;
      analyser.maxDecibels = audioProcessorConfig?.dspMaxDecibels ?? -10;
      analyser.smoothingTimeConstant = Math.max(0, Math.min(0.99, smoothingTimeConstant));

      // Set sample rate in processor for accurate frequency calculations
      if (processorRef.current && typeof processorRef.current.setSampleRate === 'function') {
        processorRef.current.setSampleRate(audioContext.sampleRate);
      }

      // Create script processor to receive audio data
      const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
      scriptProcessor.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      scriptProcessorRef.current = scriptProcessor;
      
      // Pre-allocate buffers for performance
      let frequency = new Uint8Array(analyser.frequencyBinCount);
      let waveform = new Uint8Array(analyser.frequencyBinCount);

      // Listen for audio data from Tauri
      const unlisten = await listen<number[]>('audio-data', (event) => {
        if (!analyserRef.current || !scriptProcessorRef.current || !audioContextRef.current) return;

        const audioData = new Float32Array(event.payload);
        
        // Create an audio buffer and feed it to the analyser
        const buffer = audioContextRef.current.createBuffer(1, audioData.length, audioContextRef.current.sampleRate);
        buffer.copyToChannel(audioData, 0);
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(analyserRef.current);
        analyserRef.current.connect(scriptProcessorRef.current);
        source.start();

        // Reallocate buffers only if FFT size changed
        if (frequency.length !== analyserRef.current.frequencyBinCount) {
          frequency = new Uint8Array(analyserRef.current.frequencyBinCount);
          waveform = new Uint8Array(analyserRef.current.frequencyBinCount);
          console.log('[TauriMic] Buffer size changed to', analyserRef.current.frequencyBinCount);
        }
        
        // Get audio data
        analyserRef.current.getByteFrequencyData(frequency);
        analyserRef.current.getByteTimeDomainData(waveform);

        // Process audio with production-quality algorithms
        const metricsObj = processorRef.current.process(frequency, waveform);

        // Update frame reference
        frameRef.current = {
          ...metricsObj,
          frequency,
          waveform,
          time: performance.now(),
        };

        setMetrics(metricsObj);
      });

      unlistenRef.current = unlisten;

      // Start Tauri audio capture
      const result = await invoke<string>('start_audio_capture', { 
        deviceName: deviceName || null 
      });
      
      console.log(result);
      setIsRunning(true);
      setStatus('ready');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start audio capture';
      setError(message);
      setStatus('error');
      await stop();
    }
  }, [isRunning, stop, audioProcessorConfig, smoothingTimeConstant]);

  return {
    frame: frameRef,
    metrics,
    error,
    status,
    isRunning,
    devices,
    start,
    stop,
    refreshDevices,
  };
}

// Made with Bob
