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

      // Integrasikan gelombang (wave/ripple) original 2D-nya
      if (settings.movementStyle === 'wave') {
          drawY += Math.sin(x * settings.rippleDamping + internalTime * settings.rippleSpeed) * (bassBoost * normalizedDepth);
      } else if (settings.movementStyle === 'ripple') {
          const cx = Math.abs(x - sampleW / 2);
          const cy = Math.abs(y - sampleH / 2);
          const dist = Math.sqrt(cx * cx + cy * cy);
          drawY += Math.sin(dist * settings.rippleDamping - internalTime * settings.rippleSpeed) * (bassBoost * normalizedDepth);
      } else if (settings.movementStyle === 'matrix') {
          drawY = (drawY + (internalTime * settings.rippleSpeed) + (x * 13)) % height;
      } else if (settings.movementStyle === 'glitch') {
          if (Math.random() * 1000 < settings.scatterMultiplier) {
            drawX += (Math.random() - 0.5) * bassBoost * 100;
            drawY += (Math.random() - 0.5) * bassBoost * 100;
          }
      } else if (settings.movementStyle === 'orbit') {
          const cx = Math.abs(x - sampleW / 2);
          const cy = Math.abs(y - sampleH / 2);
          const angle = Math.atan2(cy, cx) + internalTime * settings.rippleSpeed;
          drawX += Math.cos(angle * 4) * bassBoost * normalizedDepth;
          drawY += Math.sin(angle * 4) * bassBoost * normalizedDepth;
      } else if (settings.movementStyle === 'tunnel') {
          const cx = Math.abs(x - sampleW / 2);
          const cy = Math.abs(y - sampleH / 2);
          const dist = Math.log(Math.max(1, Math.sqrt(cx * cx + cy * cy))) * 10;
          drawY += Math.sin(dist * settings.rippleDamping - internalTime * settings.rippleSpeed * 3) * bassBoost * normalizedDepth;
      } else if (settings.movementStyle === 'pulse') {
          const cx = Math.abs(x - sampleW / 2);
          const cy = Math.abs(y - sampleH / 2);
          const beat = Math.pow(Math.sin(internalTime * settings.rippleSpeed), 8);
          drawX += (cx * 0.01) * beat * bassBoost * normalizedDepth;
          drawY += Math.sin(Math.sqrt(cx * cx + cy * cy) * settings.rippleDamping) * bassBoost * normalizedDepth;
      }

        ctx.font = `${Math.max(2, zScale * (width / sampleW) * (baseSize / 10))}px monospace`;
      
      // Warna Matrix / Thermal
      let colorStr = '#ffffff';
      if (settings.colorMode === 'rainbow') {
        const hue = (x * 2) + (y * 2) + (internalTime * 300) + (normalizedDepth * 360 * settings.colorWaveDepth);
        colorStr = `hsl(${Math.floor(hue % 360)}, 100%, 50%)`;
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
