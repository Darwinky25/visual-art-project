export function drawKinect3D(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  kinectDepthBuffer: Uint8Array | null,
  audioFrame: { bass: number; mids: number; highs: number },
  options: {
    sensitivity: number;
    settings: any;
    frameSize?: {
      width: number;
      height: number;
    };
  }
) {
  const { width, height } = canvas;
  const { settings, sensitivity } = options;

  let internalTime = Date.now() * 0.001 * settings.globalSpeed;

  // Background statis
  const backgroundOpacity = Math.max(0, Math.min(1, settings.backgroundOpacity ?? 1));
  const priorAlpha = ctx.globalAlpha;
  ctx.globalAlpha = priorAlpha * backgroundOpacity;
  ctx.fillStyle = settings.backgroundColor || '#000000';
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = priorAlpha;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const characterOpacity = Math.max(0, Math.min(1, settings.characterOpacity ?? 1));
  ctx.globalAlpha = characterOpacity;

  const w = Math.max(1, Math.floor(options.frameSize?.width ?? 160));
  const h = Math.max(1, Math.floor(options.frameSize?.height ?? 120));
  const requiredLength = w * h;
  
  if (!kinectDepthBuffer || kinectDepthBuffer.length < requiredLength) {
    ctx.fillStyle = '#ff0000';
    ctx.font = '20px monospace';
    ctx.fillText('Belum ada Sinyal dari Kinect Server...', width / 2, height / 2);
    ctx.globalAlpha = 1;
    return;
  }

  const depthBuffer = kinectDepthBuffer;

  const globalScale = settings.gridWidthRatio;
  const baseSize = settings.dotSizeBase * 2;
  const zoom = settings.kinectZoom !== undefined ? settings.kinectZoom : 1.0;
  const rawCharacterDensity = settings.characterDensity ?? 1;
  const characterDensity = Math.max(0.5, Math.min(2.0, rawCharacterDensity));

  let sampleW = Math.max(1, Math.floor(w * characterDensity));
  let sampleH = Math.max(1, Math.floor(h * characterDensity));
  const maxSamples = 120000;
  if (sampleW * sampleH > maxSamples) {
    const sampleScale = Math.sqrt(maxSamples / (sampleW * sampleH));
    sampleW = Math.max(1, Math.floor(sampleW * sampleScale));
    sampleH = Math.max(1, Math.floor(sampleH * sampleScale));
  }

  // Apply zoom: zoom > 1.0 zooms OUT (smaller cells), zoom < 1.0 zooms IN (larger cells)
  const cellW = ((width / sampleW) * globalScale) / zoom;
  const cellH = ((height / sampleH) * (1 + settings.rowSpacingRatio) * globalScale) / zoom;

  const projectedWidth = sampleW * cellW;
  const projectedHeight = sampleH * cellH;
  const offsetX = ((width - projectedWidth) / 2) + ((settings.kinectOffsetX ?? 0) * width * 0.5);
  const offsetYPos = ((height - projectedHeight) * settings.yOffsetRatio) + ((settings.kinectOffsetY ?? 0) * height * 0.5);
  const bassBoost = audioFrame.bass * settings.amplitudeRatio * 50;

  for (let y = 0; y < sampleH; y++) {
    for (let x = 0; x < sampleW; x++) {
      const sourceX = Math.min(w - 1, Math.floor(x / characterDensity));
      const sourceY = Math.min(h - 1, Math.floor(y / characterDensity));
      // Data kedalaman: Semakin dekat nilainya lebih besar/tebal
      const depth = depthBuffer[sourceY * w + sourceX]; 
      
      // Filter noise (jika object terlalu jauh, jangan digambar agar mirip hologram terpotong)
      if (depth < 20 || depth > 200) continue; 
      
      const normalizedDepth = (depth - 20) / 180; // 0.0 (jauh) -> 1.0 (sangat dekat depan lensa)
      
      // Pseudo 3D Efek Perbesaran dan Sumbu Z
      const zScale = 1 + (normalizedDepth * 3) + (audioFrame.bass * settings.bassPulseImpact * sensitivity); 
      
      let drawX = offsetX + x * cellW + cellW / 2;
      let drawY = offsetYPos + y * cellH + cellH / 2;
      
      // Efek perspektif melebar kalau dekat layer
      drawX += (drawX - width / 2) * (normalizedDepth * 0.5);
      drawY += (drawY - height / 2) * (normalizedDepth * 0.5);

      // Smooth, trippy wave integration - less chaotic, more hypnotic
      if (settings.movementStyle === 'wave') {
          // Smoother wave with harmonic layers
          drawY += Math.sin(x * settings.rippleDamping * 0.6 + internalTime * settings.rippleSpeed * 0.7) * (bassBoost * normalizedDepth * 0.8);
          drawY += Math.cos(x * settings.rippleDamping * 0.4 - internalTime * settings.rippleSpeed * 0.5) * (bassBoost * normalizedDepth * 0.4);
      } else if (settings.movementStyle === 'ripple') {
          const cx = Math.abs(x - sampleW / 2);
          const cy = Math.abs(y - sampleH / 2);
          const dist = Math.sqrt(cx * cx + cy * cy);
          // Slower, smoother ripple with secondary harmonic
          drawY += Math.sin(dist * settings.rippleDamping * 0.6 - internalTime * settings.rippleSpeed * 0.7) * (bassBoost * normalizedDepth * 0.8);
          drawX += Math.cos(dist * settings.rippleDamping * 0.4 + internalTime * settings.rippleSpeed * 0.5) * (bassBoost * normalizedDepth * 0.3);
      } else if (settings.movementStyle === 'matrix') {
          // Smooth cascading flow instead of abrupt wrapping
          const flowSpeed = internalTime * settings.rippleSpeed * 0.6;
          drawY += Math.sin(flowSpeed + x * 0.1) * (bassBoost * normalizedDepth * 0.5);
      } else if (settings.movementStyle === 'glitch') {
          // Smooth kaleidoscopic pattern instead of random glitch
          const cx = Math.abs(x - sampleW / 2);
          const cy = Math.abs(y - sampleH / 2);
          const angle = Math.atan2(cy, cx);
          drawX += Math.sin(angle * 6 + internalTime * settings.rippleSpeed * 0.5) * (bassBoost * normalizedDepth * 0.6);
          drawY += Math.cos(angle * 4 - internalTime * settings.rippleSpeed * 0.4) * (bassBoost * normalizedDepth * 0.6);
      } else if (settings.movementStyle === 'orbit') {
          const cx = Math.abs(x - sampleW / 2);
          const cy = Math.abs(y - sampleH / 2);
          // Smoother spiral rotation
          const angle = Math.atan2(cy, cx) + internalTime * settings.rippleSpeed * 0.5;
          const dist = Math.sqrt(cx * cx + cy * cy);
          drawX += Math.cos(angle * 3 + dist * 0.05) * bassBoost * normalizedDepth * 0.7;
          drawY += Math.sin(angle * 3 - dist * 0.05) * bassBoost * normalizedDepth * 0.7;
      } else if (settings.movementStyle === 'tunnel') {
          const cx = Math.abs(x - sampleW / 2);
          const cy = Math.abs(y - sampleH / 2);
          const dist = Math.log(Math.max(1, Math.sqrt(cx * cx + cy * cy))) * 10;
          // Smoother tunnel with rotating component
          drawY += Math.sin(dist * settings.rippleDamping * 0.6 - internalTime * settings.rippleSpeed * 1.5) * bassBoost * normalizedDepth * 0.8;
          const angle = Math.atan2(cy, cx);
          drawX += Math.cos(angle * 4 + internalTime * settings.rippleSpeed * 0.4) * bassBoost * normalizedDepth * 0.3;
      } else if (settings.movementStyle === 'pulse') {
          const cx = Math.abs(x - sampleW / 2);
          const cy = Math.abs(y - sampleH / 2);
          // Smooth breathing pulse
          const beat = Math.sin(internalTime * settings.rippleSpeed * 0.6) * 0.5 + 0.5;
          const dist = Math.sqrt(cx * cx + cy * cy);
          drawX += Math.sin(dist * settings.rippleDamping * 0.5) * beat * bassBoost * normalizedDepth * 0.5;
          drawY += Math.cos(dist * settings.rippleDamping * 0.5) * beat * bassBoost * normalizedDepth * 0.5;
      }

        ctx.font = `${Math.max(2, zScale * (width / sampleW) * (baseSize / 10))}px monospace`;
      
      // Smoother color cycling for trippy effect
      let colorStr = '#ffffff';
      if (settings.colorMode === 'rainbow') {
        // Slower, smoother color transitions with phase shift
        const hue = (x * 1.5) + (y * 1.5) + (internalTime * 150) + (normalizedDepth * 360 * settings.colorWaveDepth);
        const phaseShift = Math.sin(internalTime * 0.5 + x * 0.1 + y * 0.1) * 30;
        colorStr = `hsl(${Math.floor((hue + phaseShift) % 360)}, 100%, 50%)`;
      } else if (settings.colorMode === 'thermal') {
        const hue = 240 - (normalizedDepth * 240);
        colorStr = `hsl(${Math.floor(hue)}, 100%, 50%)`;
      } else if (settings.colorMode === 'custom') {
        colorStr = settings.customColor;
      }
      
      ctx.fillStyle = colorStr;
      
      const textArray = settings.customText && settings.customText.length > 0 ? settings.customText : '@%#*+= ';
      const char = textArray[Math.floor(normalizedDepth * (textArray.length - 1))];
      
      ctx.fillText(char, drawX, drawY);
    }
  }

  ctx.globalAlpha = 1;
}
