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

  // Advanced time-based animation
  const time = (frame.time || 0) * 0.001; // Convert to seconds

  // Audio-driven rotation with harmonic modulation
  const baseRotation =
    (frame.energy * rotationSpeed) % (Math.PI * 2) +
    Math.sin(time * 1.2) * 0.5 + // Sine wave modulation
    Math.cos(time * 0.8) * 0.3; // Cosine harmonic

  // Depth with phase shifts based on audio bands
  const depthModifier =
    1.0 +
    frame.bass * bassDepth * audioDrive * Math.sin(time * 2.3) +
    Math.sin(time * 3) * 0.3;

  // Rotation with mids-driven phase shift
  const rotModifier =
    frame.mids * midsRot * Math.cos(time * 1.7) +
    Math.sin(time * 2.5 + frame.mids * Math.PI) * 0.2;

  // Zoom with highs modulation + spiral effect
  const spiralFactor = Math.sin(time * 1.5) * 0.15;
  const zoomModifier =
    1.0 + frame.highs * highsZoom * Math.cos(time * 2.1) + spiralFactor;

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

    // Depth-based phase shift for complex animation
    const depthPhase = (depth / maxD) * Math.PI * 2;
    
    // Dynamic color with time + depth
    const hue = (depth / maxD) * 360 + time * 60 + Math.sin(depthPhase + time) * 90;
    const opacity = (1.0 - depth / maxD) * (0.5 + Math.sin(time + depthPhase) * 0.4);
    ctx.strokeStyle = `hsla(${hue % 360}, 75%, 50%, ${Math.max(0, opacity)})`;
    ctx.fillStyle = `hsla(${hue % 360}, 60%, 45%, ${Math.max(0, opacity * 0.3)})`;
    
    // Width oscillates with time
    ctx.lineWidth = lineWidth * (depth / maxD + 0.5) * (0.7 + Math.sin(time * 3 + depth) * 0.3);

    // Save context for this branch
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Add harmonic scaling based on branch depth
    const harmonicScale = 1.0 + Math.sin(time * 2.2 + depth * 0.8) * 0.15;
    const drawSize = size * zoomModifier * zoomScale * harmonicScale;
    
    // Lissajous-style distortion
    ctx.transform(
      1 + Math.sin(time * 1.8 + depth) * 0.1,
      Math.cos(time * 2.1 + depth) * 0.08,
      Math.sin(time * 1.5 + depth * 0.5) * 0.08,
      1 + Math.cos(time * 2.3 + depth) * 0.1,
      0,
      0,
    );

    ctx.fillRect(-drawSize / 2, -drawSize / 2, drawSize, drawSize);
    ctx.strokeRect(-drawSize / 2, -drawSize / 2, drawSize, drawSize);

    ctx.restore();

    // Recursive calls with spiral growth (4-way branching)
    const nextSize = size / innerScale;
    const nextAngle = angle + baseRotation + rotModifier + Math.sin(time * 1.9 + depth * 0.5) * 0.3;
    
    // Spiral offset: branches spiral outward over time
    const spiralOffset = size * (0.6 + Math.sin(time * 1.1 + depth) * 0.2);

    drawRecursive(x + spiralOffset, y, nextSize, nextAngle, depth - 1, maxD);
    drawRecursive(x - spiralOffset, y, nextSize, nextAngle + Math.PI * 0.5, depth - 1, maxD);
    drawRecursive(x, y + spiralOffset, nextSize, nextAngle + Math.PI / 2, depth - 1, maxD);
    drawRecursive(x, y - spiralOffset, nextSize, nextAngle + Math.PI, depth - 1, maxD);
  }

  // Start recursive drawing with time-modulated initial size
  const sizeModulation = 1.0 + Math.sin(time * 1.3) * 0.2;
  const startSize = Math.min(width, height) * 0.3 * depthModifier * sizeModulation;
  drawRecursive(0, 0, startSize, baseRotation, maxDepth, maxDepth);

  ctx.restore();
}
