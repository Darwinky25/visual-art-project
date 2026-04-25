import { useState, useRef, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

type DepthFrameSize = {
  width: number;
  height: number;
};

const DEFAULT_DEPTH_FRAME_SIZE: DepthFrameSize = {
  width: 160,
  height: 120,
};

const KNOWN_DEPTH_SIZES: DepthFrameSize[] = [
  { width: 640, height: 480 },
  { width: 320, height: 240 },
  { width: 160, height: 120 },
];

function inferDepthFrameSize(payloadLength: number, fallback: DepthFrameSize): DepthFrameSize {
  for (const size of KNOWN_DEPTH_SIZES) {
    if (size.width * size.height === payloadLength) {
      return size;
    }
  }

  // Keep Kinect's native 4:3 aspect ratio when payload length is unexpected.
  const inferredHeight = Math.round(Math.sqrt((payloadLength * 3) / 4));
  const inferredWidth = Math.round((inferredHeight * 4) / 3);
  if (inferredWidth > 0 && inferredHeight > 0 && inferredWidth * inferredHeight === payloadLength) {
    return { width: inferredWidth, height: inferredHeight };
  }

  return fallback;
}

export function useKinect() {
  const [isRunning, setIsRunning] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Terputus');
  const depthFrameRef = useRef<Uint8Array | null>(null);
  const depthFrameSizeRef = useRef<DepthFrameSize>(DEFAULT_DEPTH_FRAME_SIZE);
  const wsRef = useRef<WebSocket | null>(null);
  const textDecoderRef = useRef(new TextDecoder());

  const setTilt = useCallback((deg: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'set_tilt', degree: Math.max(-31, Math.min(31, deg)) }));
    }
  }, []);

  const setLED = useCallback((ledColor: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'set_led', led: ledColor }));
    }
  }, []);

  const updateServerConfig = useCallback((config: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        action: 'update_config', 
        config: {
          downsampling_factor: config.kinectServerDownsamplingFactor,
          normalization_divisor: config.kinectServerNormalizationDivisor,
          server_fps: config.kinectServerFPS,
          raw_bit_depth: config.kinectServerRawBitDepth,
          depth_min_raw: config.kinectServerDepthMinRaw,
          depth_max_raw: config.kinectServerDepthMaxRaw,
          tilt_min: config.kinectServerTiltMin,
          tilt_max: config.kinectServerTiltMax,
          led_enabled: config.kinectServerLEDEnabled,
          led_color: config.kinectServerLEDColor,
        }
      }));
    }
  }, []);

  const start = useCallback(async () => {
    if (isRunning) return;
    
    // Check if running in Tauri and ensure server is started
    if ((window as any).__TAURI__) {
      try {
        setConnectionStatus('Starting Kinect server...');
        const status = await invoke('kinect_server_status') as boolean;
        if (!status) {
          await invoke('start_kinect_server');
          // Wait for server to start
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (err) {
        console.error("Failed to start Kinect server:", err);
        setConnectionStatus('Server start failed (check console)');
        return;
      }
    }
    
    setConnectionStatus('Connecting to ws://localhost:8765...');
    const ws = new WebSocket('ws://localhost:8765');
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      setConnectionStatus('Kinect Connected 🟢');
      setIsRunning(true);
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        const bytes = new Uint8Array(event.data);
        if (bytes.length === 0) return;

        let payload = bytes;
        let frameSize = depthFrameSizeRef.current;

        // Python server sends "{json-header}\n<binary-payload>" in one binary message.
        if (bytes[0] === 123) {
          const newlineIndex = bytes.indexOf(10);
          if (newlineIndex > 0) {
            try {
              const headerText = textDecoderRef.current.decode(bytes.subarray(0, newlineIndex));
              const header = JSON.parse(headerText) as Partial<{ type: string; width: number; height: number }>;
              const parsedWidth = Number(header.width);
              const parsedHeight = Number(header.height);

              if (
                header.type === 'depth' &&
                Number.isFinite(parsedWidth) &&
                Number.isFinite(parsedHeight) &&
                parsedWidth > 0 &&
                parsedHeight > 0
              ) {
                frameSize = { width: parsedWidth, height: parsedHeight };
              }

              payload = bytes.subarray(newlineIndex + 1);
            } catch {
              // If header parsing fails, treat packet as raw depth payload.
            }
          }
        }

        if (payload.length === 0) return;

        if (payload.length !== frameSize.width * frameSize.height) {
          frameSize = inferDepthFrameSize(payload.length, frameSize);
        }

        if (payload.length !== frameSize.width * frameSize.height) {
          return;
        }

        depthFrameSizeRef.current = frameSize;
        depthFrameRef.current = payload;
      } else if (typeof event.data === 'string') {
        // JSON message (config updates, etc)
        try {
          JSON.parse(event.data);
          // Handle config or other messages if needed
        } catch (e) {
          // Ignore JSON parse errors for binary data
        }
      }
    };

    ws.onclose = () => {
      setConnectionStatus('Koneksi Bridge Terputus 🔴');
      setIsRunning(false);
    };

    wsRef.current = ws;
  }, [isRunning]);

  const stop = useCallback(() => {
    if (!isRunning) return;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsRunning(false);
    setConnectionStatus('Terputus');
  }, [isRunning]);
  
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    start,
    stop,
    isRunning,
    depthFrameRef,
    depthFrameSizeRef,
    connectionStatus,
    setTilt,
    setLED,
    updateServerConfig,
  };
}
