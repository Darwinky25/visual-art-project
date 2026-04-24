import { VisualSettings } from './drawVisualizer';
import { AudioFrame } from '../types';

export function drawMedia(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  element: HTMLVideoElement | HTMLImageElement | null,
  settings: VisualSettings,
  frame: AudioFrame | null
) {
  if (!element) return;

  const sw = element instanceof HTMLVideoElement ? element.videoWidth : element.width;
  const sh = element instanceof HTMLVideoElement ? element.videoHeight : element.height;

  if (sw === 0 || sh === 0) return;

  // Audio Reactivity Math
  const impact = settings.mediaAudioImpact || 0;
  let scaleBump = 1.0;
  let extraOpacity = 1.0;
  
  if (impact > 0 && frame) {
      if (settings.mediaInvertDrop) {
          // Drops out on beat (flash black)
          extraOpacity = Math.max(0, 1 - (frame.bass * impact));
          scaleBump = Math.max(0.5, 1 - (frame.bass * impact * 0.2));
      } else {
          // Hits hard on beat (zoom in)
          scaleBump = 1 + (frame.bass * impact * 0.5);
      }
  }

  // Calculate cover aspect ratio
  const canvasRatio = canvas.width / canvas.height;
  const elementRatio = sw / sh;

  let dw = canvas.width * scaleBump;
  let dh = canvas.height * scaleBump;
  let dx = 0;
  let dy = 0;

  if (elementRatio > canvasRatio) {
    // wide media, crop sides
    dw = (canvas.height * elementRatio) * scaleBump;
    dx = (canvas.width - dw) / 2;
  } else {
    // tall media, crop top/bottom
    dh = (canvas.width / elementRatio) * scaleBump;
    dy = (canvas.height - dh) / 2;
  }
  
  ctx.save();
  ctx.globalAlpha = ctx.globalAlpha * extraOpacity;

  // Draw media
  ctx.drawImage(element, dx, dy, dw, dh);
  ctx.restore();
}
