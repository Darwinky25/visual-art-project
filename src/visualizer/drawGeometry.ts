import type { AudioFrame } from '../types';
import type { VisualSettings } from './drawVisualizer';

export function drawGeometry(
  ctx: CanvasRenderingContext2D,
  frame: AudioFrame,
  settings: VisualSettings,
) {
  const { width, height } = ctx.canvas;
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDim = Math.max(width, height);

  const backgroundOpacity = Math.max(0, Math.min(1, settings.backgroundOpacity ?? 1));
  const priorAlpha = ctx.globalAlpha;
  ctx.globalAlpha = priorAlpha * backgroundOpacity;
  ctx.fillStyle = settings.backgroundColor;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = priorAlpha;

  const lineWidth = settings.geometryLineWidth || 2;
  const density = Math.floor(settings.geometryDensity || 8);
  const rotationSpeed = settings.geometryRotationSpeed || 0.4;
  const audioScaling = settings.geometryAudioScaling || 1.0;
  const bassLines = settings.geometryBassLines || 0.5;
  const midsIntersect = settings.geometryMidsIntersection || 0.6;
  const highsPattern = settings.geometryHighsPattern || 0.4;
  const centroidInfluence = settings.geometryCentroidInfluence || 0.7;
  const complexity = Math.floor(settings.geometryComplexity || 4);

  // Advanced time-based animation
  const time = (frame.time || 0) * 0.001; // Convert to seconds

  // Audio-driven + harmonic rotation
  const audioRotation = (frame.energy * rotationSpeed * audioScaling) % (Math.PI * 2);
  const harmonicRotation = Math.sin(time * 1.8) * 0.4 + Math.cos(time * 1.3) * 0.25;
  const rotation = audioRotation + harmonicRotation;

  // Dynamic line count with wave propagation
  const lineCount = Math.floor(
    density + frame.bass * bassLines * density + Math.sin(time * 2.2) * density * 0.3,
  );

  // Intersection modulation with phase shifts
  const intersectionAmount = frame.mids * midsIntersect * Math.cos(time * 1.9);

  // Pattern shift with harmonics
  const patternShift = frame.highs * highsPattern * Math.PI + Math.sin(time * 2.5) * Math.PI * 0.5;

  ctx.save();
  ctx.translate(centerX, centerY);

  // ===== RADIATING LINES (SPOKES) WITH LISSAJOUS MODULATION =====
  for (let i = 0; i < lineCount; i++) {
    const baseAngle = (i / lineCount) * Math.PI * 2 + rotation;
    
    // Phase-shifted for wave propagation effect
    const phaseShift = (i / lineCount) * Math.PI * 2;
    const waveAmplitude = Math.sin(time * 3 + phaseShift) * 0.3 + 0.7; // Wave propagates through lines
    
    const hue = (baseAngle * 57.3 + time * 40) % 360; // Dynamic hue cycling
    const opacity = (0.6 + frame.centroid * centroidInfluence * 0.4) * waveAmplitude;

    ctx.strokeStyle = `hsla(${hue}, 70%, 50%, ${opacity})`;
    ctx.lineWidth = lineWidth + frame.peak * 2 + Math.sin(time * 4 + i * 0.3) * 0.5;

    // Lissajous-modulated line length (creates flowing patterns)
    const lengthMod =
      0.7 +
      frame.texture * 0.3 +
      (i % 2) * 0.15 +
      Math.sin(time * 2.1 + i * 0.5) * 0.2 +
      Math.cos(time * 1.7 + i * 0.4) * 0.15;
    const length = (maxDim / 2) * lengthMod;

    // Lissajous curve endpoints for organic spoke shapes
    const offsetX = Math.sin(time * 1.9 + i * 0.6) * (maxDim * 0.1);
    const offsetY = Math.cos(time * 2.3 + i * 0.7) * (maxDim * 0.1);

    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    ctx.lineTo(
      Math.cos(baseAngle) * length + offsetX,
      Math.sin(baseAngle) * length + offsetY,
    );
    ctx.stroke();
  }

  // ===== PERPENDICULAR GRID WITH WAVE PROPAGATION =====
  for (let i = 0; i < complexity; i++) {
    const baseAngle = (i / complexity) * Math.PI + rotation * intersectionAmount;
    
    // Time-based opacity wave propagation
    const gridPhase = (i / complexity) * Math.PI * 2;
    const gridWave = Math.sin(time * 2.8 + gridPhase) * 0.25 + 0.75;
    
    const hue = (baseAngle * 57.3 + 180 + time * 30) % 360;
    const opacity = (0.4 + frame.pulse * 0.3) * gridWave;

    ctx.strokeStyle = `hsla(${hue}, 60%, 45%, ${opacity})`;
    ctx.lineWidth = lineWidth * 0.8 + Math.sin(time * 3.5 + i) * 0.3;

    // Energy-responsive line length with harmonic oscillation
    const baseLengthMod = 0.8 + frame.energy * 0.2 + Math.sin(time * 1.6 + i * 0.7) * 0.2;
    const length = maxDim * 0.6 * baseLengthMod;

    // Horizontal lines with amplitude modulation
    const hPhase = (i / complexity) * Math.PI;
    const hAmplitude = Math.sin(time * 2.2 + hPhase) * (maxDim / 6);
    
    ctx.beginPath();
    ctx.moveTo(-length, i * (maxDim / complexity * 0.5) - maxDim / 2 + hAmplitude);
    ctx.lineTo(length, i * (maxDim / complexity * 0.5) - maxDim / 2 + hAmplitude);
    ctx.stroke();

    // Vertical lines with perpendicular amplitude
    const vPhase = (i / complexity) * Math.PI + Math.PI / 2;
    const vAmplitude = Math.cos(time * 1.9 + vPhase) * (maxDim / 6);

    ctx.beginPath();
    ctx.moveTo(i * (maxDim / complexity * 0.5) - maxDim / 2 + vAmplitude, -length);
    ctx.lineTo(i * (maxDim / complexity * 0.5) - maxDim / 2 + vAmplitude, length);
    ctx.stroke();
  }

  // ===== CONCENTRIC CIRCLES WITH BREATHING/PULSING EFFECT =====
  for (let ring = 1; ring <= 3; ring++) {
    // Breathing effect: radius oscillates harmonically
    const breathingFactor = Math.sin(time * 1.7 + ring * 1.2) * 0.2 + 1.0;
    const radius =
      (maxDim / 2) *
      ((ring / 3) * 0.7 + 0.3 + frame.bass * 0.2) *
      breathingFactor;

    // Color cycling with pattern shift
    const hue = (ring * 120 + patternShift * 57.3 + time * 50) % 360;
    const opacity =
      (0.3 - ring * 0.08) *
      (0.5 + frame.centroid * 0.5) *
      (0.6 + Math.sin(time * 2.4 + ring) * 0.4); // Additional pulsing

    ctx.strokeStyle = `hsla(${hue}, 65%, 55%, ${opacity})`;
    ctx.lineWidth = lineWidth * 0.6 + Math.sin(time * 3.2 + ring) * 0.3;

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Optional: Add decorative points along circles for musical effect
    if (ring === 2) {
      // Draw decorative nodes every nth position
      const nodeCount = Math.floor(8 + Math.sin(time * 1.5) * 3);
      for (let n = 0; n < nodeCount; n++) {
        const nodeAngle = (n / nodeCount) * Math.PI * 2 + rotation;
        const nodeX = Math.cos(nodeAngle) * radius;
        const nodeY = Math.sin(nodeAngle) * radius;
        
        // Node pulsates with audio
        const nodeSize = 2 + frame.peak * 3 + Math.sin(time * 2.5 + n) * 1.5;
        
        ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${opacity})`;
        ctx.beginPath();
        ctx.arc(nodeX, nodeY, nodeSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}
