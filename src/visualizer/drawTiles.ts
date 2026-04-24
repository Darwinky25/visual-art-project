import type { AudioFrame } from '../types';
import type { VisualSettings } from './drawVisualizer';

export function drawTiles(
  ctx: CanvasRenderingContext2D,
  frame: AudioFrame,
  settings: VisualSettings,
) {
  const { width, height } = ctx.canvas;
  const centerX = width / 2;
  const centerY = height / 2;

  const backgroundOpacity = Math.max(0, Math.min(1, settings.backgroundOpacity ?? 1));
  const priorAlpha = ctx.globalAlpha;
  ctx.globalAlpha = priorAlpha * backgroundOpacity;
  ctx.fillStyle = settings.backgroundColor;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = priorAlpha;

  const tileSize = settings.tilesSize || 30;
  const complexity = Math.floor(settings.tilesComplexity || 3);
  const rotationSpeed = settings.tilesRotationSpeed || 0.5;
  const audioScaling = settings.tilesAudioScaling || 1.0;
  const bassAmount = settings.tilesBassAmount || 0.3;
  const midsAmount = settings.tilesMidsAmount || 0.5;
  const highsAmount = settings.tilesHighsAmount || 0.2;
  const colorVar = settings.tilesColorVariation || 0.5;

  // Advanced time-based animation (continuous counter from frame.time in ms)
  const time = (frame.time || 0) * 0.001; // Convert to seconds for smooth oscillation

  // Audio-driven + math-based rotation
  const audioRotation = (frame.energy * rotationSpeed * audioScaling) % (Math.PI * 2);
  const harmonicRotation = Math.sin(time * 2) * 0.3 + Math.cos(time * 1.3) * 0.2; // Harmonic oscillation
  const rotation = audioRotation + harmonicRotation;

  // Harmonic scaling with phase shifts
  const scale =
    1.0 +
    frame.bass * bassAmount * Math.sin(time * 3) +
    frame.mids * midsAmount * Math.cos(time * 2.7) +
    frame.highs * highsAmount * Math.sin(time * 5.1);

  // Lissajous-style hue progression
  const hueShift = frame.centroid * 360 * colorVar + time * 30; // Continuous hue rotation

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);

  // Draw concentric tiled squares with wave propagation
  for (let layer = 0; layer < complexity; layer++) {
    const offset = (layer * tileSize) / complexity;
    
    // Phase-shifted opacity based on layer depth and time
    const layerPhase = (layer / complexity) * Math.PI * 2;
    const wavePropagate = Math.sin(time * 2.5 + layerPhase) * 0.3 + 0.7;
    const opacity = (1.0 - (layer / complexity) * 0.7) * wavePropagate;

    // Hue based on layer + audio centroid + time
    const hue = (layer * 60 + hueShift + time * 45) % 360;
    ctx.fillStyle = `hsla(${hue}, 70%, 50%, ${opacity})`;
    ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${opacity * 0.8})`;
    ctx.lineWidth = 1 + frame.peak * 2 + Math.sin(time * 4 + layer) * 0.5;

    // Draw tiled squares with Lissajous position modulation
    for (let x = -3; x <= 3; x++) {
      for (let y = -3; y <= 3; y++) {
        // Lissajous curve modulation for organic movement
        const lissX = Math.sin(time * 2.1 + x * 0.5) * 5;
        const lissY = Math.cos(time * 1.8 + y * 0.5) * 5;

        const px = x * (tileSize + offset) + lissX;
        const py = y * (tileSize + offset) + lissY;
        const s = tileSize * (1 + frame.texture * 0.3 + Math.sin(time * 3 + x + y) * 0.2);

        ctx.fillRect(px - s / 2, py - s / 2, s, s);
        if (layer < complexity - 1) {
          ctx.strokeRect(px - s / 2, py - s / 2, s, s);
        }
      }
    }
  }

  ctx.restore();
}
