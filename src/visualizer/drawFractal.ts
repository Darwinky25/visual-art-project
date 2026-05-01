import type { AudioFrame } from '../types';
import type { VisualSettings } from './drawVisualizer';

export function drawFractal(
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

  const maxDepth = Math.floor(settings.fractalDepth || 5);
  const rotationSpeed = settings.fractalRotationSpeed || 0.3;
  const zoomScale = settings.fractalZoomScale || 1.0;
  const lineWidth = settings.fractalLineWidth || 2;
  const audioDrive = settings.fractalAudioDriveAmount || 0.8;
  const bassDepth = settings.fractalBassDepth || 0.4;
  const midsRot = settings.fractalMidsRotation || 0.6;
  const highsZoom = settings.fractalHighsZoom || 0.3;
  const innerScale = settings.fractalInnerScale || 1.2;

  // Smoother time-based animation for trippy effect
  const time = (frame.time || 0) * 0.001; // Convert to seconds

  // Smoother audio-driven rotation with harmonic modulation
  const baseRotation =
    (frame.energy * rotationSpeed * 0.7) % (Math.PI * 2) +
    Math.sin(time * 0.8) * 0.4 + // Slower sine wave modulation
    Math.cos(time * 0.6) * 0.25; // Slower cosine harmonic

  // Smoother depth with phase shifts
  const depthModifier =
    1.0 +
    frame.bass * bassDepth * audioDrive * 0.8 * Math.sin(time * 1.5) +
    Math.sin(time * 2.0) * 0.25;

  // Smoother rotation with mids-driven phase shift
  const rotModifier =
    frame.mids * midsRot * 0.8 * Math.cos(time * 1.2) +
    Math.sin(time * 1.8 + frame.mids * Math.PI) * 0.15;

  // Smoother zoom with spiral effect
  const spiralFactor = Math.sin(time * 1.0) * 0.12;
  const zoomModifier =
    1.0 + frame.highs * highsZoom * 0.8 * Math.cos(time * 1.5) + spiralFactor;

  ctx.save();
  ctx.translate(centerX, centerY);

  // Recursive fractal drawing with advanced math
  function drawRecursive(
    x: number,
    y: number,
    size: number,
    angle: number,
    depth: number,
    maxD: number,
  ) {
    if (depth === 0) return;

    // Smoother depth-based phase shift
    const depthPhase = (depth / maxD) * Math.PI * 2;
    
    // Smoother dynamic color with time + depth
    const hue = (depth / maxD) * 360 + time * 40 + Math.sin(depthPhase + time * 0.8) * 60;
    const opacity = (1.0 - depth / maxD) * (0.55 + Math.sin(time * 0.8 + depthPhase) * 0.35);
    ctx.strokeStyle = `hsla(${hue % 360}, 80%, 55%, ${Math.max(0, opacity)})`;
    ctx.fillStyle = `hsla(${hue % 360}, 65%, 50%, ${Math.max(0, opacity * 0.3)})`;
    
    // Smoother width oscillation
    ctx.lineWidth = lineWidth * (depth / maxD + 0.5) * (0.75 + Math.sin(time * 2 + depth) * 0.25);

    // Save context for this branch
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Smoother harmonic scaling
    const harmonicScale = 1.0 + Math.sin(time * 1.5 + depth * 0.6) * 0.12;
    const drawSize = size * zoomModifier * zoomScale * harmonicScale;
    
    // Smoother Lissajous-style distortion for trippy effect
    ctx.transform(
      1 + Math.sin(time * 1.2 + depth) * 0.08,
      Math.cos(time * 1.5 + depth) * 0.06,
      Math.sin(time * 1.0 + depth * 0.4) * 0.06,
      1 + Math.cos(time * 1.6 + depth) * 0.08,
      0,
      0,
    );

    ctx.fillRect(-drawSize / 2, -drawSize / 2, drawSize, drawSize);
    ctx.strokeRect(-drawSize / 2, -drawSize / 2, drawSize, drawSize);

    ctx.restore();

    // Smoother recursive calls with spiral growth
    const nextSize = size / innerScale;
    const nextAngle = angle + baseRotation + rotModifier + Math.sin(time * 1.3 + depth * 0.4) * 0.25;
    
    // Smoother spiral offset
    const spiralOffset = size * (0.6 + Math.sin(time * 0.8 + depth) * 0.15);

    drawRecursive(x + spiralOffset, y, nextSize, nextAngle, depth - 1, maxD);
    drawRecursive(x - spiralOffset, y, nextSize, nextAngle + Math.PI * 0.5, depth - 1, maxD);
    drawRecursive(x, y + spiralOffset, nextSize, nextAngle + Math.PI / 2, depth - 1, maxD);
    drawRecursive(x, y - spiralOffset, nextSize, nextAngle + Math.PI, depth - 1, maxD);
  }

  // Smoother initial size modulation
  const sizeModulation = 1.0 + Math.sin(time * 0.9) * 0.15;
  const startSize = Math.min(width, height) * 0.3 * depthModifier * sizeModulation;
  drawRecursive(0, 0, startSize, baseRotation, maxDepth, maxDepth);

  ctx.restore();
}
