import { useState, useRef, useCallback } from 'react';

export function useWebcam() {
  const [isRunning, setIsRunning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const start = useCallback(async () => {
    if (isRunning) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (!videoRef.current) {
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        videoRef.current = video;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsRunning(true);
    } catch (err) {
      console.error("Failed to start webcam:", err);
    }
  }, [isRunning]);

  const stop = useCallback(() => {
    if (!isRunning) return;
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsRunning(false);
  }, [isRunning]);

  return { start, stop, isRunning, videoRef };
}
