import { } from './drawVisualizer';

const charSets = {
  standard: '@%#*+=-:. ',
  dense: 'Ñ@#W$9876543210?!abc;:+=-,._ ',
  binary: '10 ',
  matrix: 'ｷｸｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ',
};

const offscreenCanvas = document.createElement('canvas');
const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });

let internalTime = 0;

export function drawAsciiWebcam(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  audioFrame: { bass: number; mids: number; highs: number },
  options: {
    sensitivity: number;
    settings: any;
  }
) {
  const { width, height } = canvas;
  const { settings, sensitivity } = options;

  internalTime += 10 * settings.globalSpeed;

  if (!offscreenCtx) return;

  const rawCharacterDensity = settings.characterDensity ?? 1;
  const characterDensity = Math.max(0.5, Math.min(2.0, rawCharacterDensity));
  const res = Math.max(10, Math.floor((settings.asciiResolution || 50) * characterDensity));
  let charSet = charSets[settings.asciiCharSet as keyof typeof charSets] || charSets.standard;
  if (settings.customText && settings.customText.length > 0) charSet = settings.customText;

  const w = res;
  const h = Math.floor(res * (height / width));

  if (offscreenCanvas.width !== w) offscreenCanvas.width = w;
  if (offscreenCanvas.height !== h) offscreenCanvas.height = h;

  offscreenCtx.drawImage(video, 0, 0, w, h);
  const imageData = offscreenCtx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Clear background
  const backgroundOpacity = Math.max(0, Math.min(1, settings.backgroundOpacity ?? 1));
  const priorAlpha = ctx.globalAlpha;
  ctx.globalAlpha = priorAlpha * backgroundOpacity;
  ctx.fillStyle = settings.backgroundColor || '#000000';
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = priorAlpha;

  const characterOpacity = Math.max(0, Math.min(1, settings.characterOpacity ?? 1));
  ctx.globalAlpha = characterOpacity;

  const audioPulsing = 1 + (audioFrame.bass * settings.bassPulseImpact * sensitivity * 10);
  const globalScale = settings.gridWidthRatio;
  const baseSize = settings.dotSizeBase * 2;
  const globalFontSize = Math.max(2, (width / w) * audioPulsing * (baseSize / 10));

  ctx.font = `${globalFontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const cellW = (width / w) * globalScale;
  const cellH = (height / h) * (1 + settings.rowSpacingRatio) * globalScale;

  const offsetX = (width - (w * cellW)) / 2;
  const offsetYPos = (height - (h * cellH)) * settings.yOffsetRatio;

  const bassBoost = audioFrame.bass > settings.bassThreshold ? audioFrame.bass * settings.baseBrightness : 0;
  const isHighGlitchActive = audioFrame.highs > settings.highThreshold;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      let brightness = ((r * 0.299 + g * 0.587 + b * 0.114) / 255) + bassBoost;
      
      if (settings.asciiInvert) brightness = 1 - brightness;

      brightness = Math.min(1, Math.max(0, brightness));

      const charIdx = Math.floor(brightness * (charSet.length - 1));
      let char = charSet[charIdx];

      if (isHighGlitchActive && Math.random() * 100 < settings.glitchIntensity) {
        char = charSet[Math.floor(Math.random() * charSet.length)];
      }

      let drawX = offsetX + x * cellW + cellW / 2;
      let drawY = offsetYPos + y * cellH + cellH / 2;

      // Apply movement styles from Group 3
      if (settings.movementStyle === 'wave') {
          drawY += Math.sin(x * settings.rippleDamping + internalTime * 0.005 * settings.rippleSpeed) * (settings.amplitudeRatio * 50 * audioFrame.mids);
      } else if (settings.movementStyle === 'ripple') {
          const cx = Math.abs(x - w / 2);
          const cy = Math.abs(y - h / 2);
          const dist = Math.sqrt(cx * cx + cy * cy);
           drawY += Math.sin(dist * settings.rippleDamping - internalTime * 0.01 * settings.rippleSpeed) * (settings.amplitudeRatio * 50 * audioFrame.bass);
      } else if (settings.movementStyle === 'matrix') {
          drawY = (drawY + (internalTime * settings.rippleSpeed) + (x * 13)) % height;
      } else if (settings.movementStyle === 'glitch') {
          if (Math.random() * 1000 < settings.scatterMultiplier) {
            drawX += (Math.random() - 0.5) * settings.amplitudeRatio * 100;
            drawY += (Math.random() - 0.5) * settings.amplitudeRatio * 100;
          }
      } else if (settings.movementStyle === 'orbit') {
          const cx = Math.abs(x - w / 2);
          const cy = Math.abs(y - h / 2);
          const angle = Math.atan2(cy, cx) + internalTime * 0.01 * settings.rippleSpeed;
          drawX += Math.cos(angle * 4) * settings.amplitudeRatio * 50 * audioFrame.bass;
          drawY += Math.sin(angle * 4) * settings.amplitudeRatio * 50 * audioFrame.bass;
      } else if (settings.movementStyle === 'tunnel') {
          const cx = Math.abs(x - w / 2);
          const cy = Math.abs(y - h / 2);
          const dist = Math.log(Math.max(1, Math.sqrt(cx * cx + cy * cy))) * 10;
          drawY += Math.sin(dist * settings.rippleDamping - internalTime * 0.01 * settings.rippleSpeed * 3) * settings.amplitudeRatio * 50 * audioFrame.bass;
      } else if (settings.movementStyle === 'pulse') {
          const cx = Math.abs(x - w / 2);
          const cy = Math.abs(y - h / 2);
          const beat = Math.pow(Math.sin(internalTime * 0.01 * settings.rippleSpeed), 8);
          drawX += (cx * 0.01) * beat * settings.amplitudeRatio * 50 * audioFrame.bass;
          drawY += Math.sin(Math.sqrt(cx * cx + cy * cy) * settings.rippleDamping) * settings.amplitudeRatio * 50 * audioFrame.bass;
      }

      if (settings.colorMode === 'white') {
        ctx.fillStyle = '#fff';
      } else if (settings.colorMode === 'custom') {
        ctx.fillStyle = settings.customColor;
      } else if (settings.colorMode === 'thermal') {
        const v = Math.min(1, Math.max(0, brightness));
        let colH = 0, l = 50;
        if (v < 0.2) {
          colH = 240;
          l = (v / 0.2) * 30; // 0 to 30
        } else if (v < 0.5) {
          colH = 240 - ((v - 0.2) / 0.3) * 240; // 240 to 0
          l = 30 + ((v - 0.2) / 0.3) * 20; // 30 to 50
        } else if (v < 0.8) {
          colH = ((v - 0.5) / 0.3) * 60; // 0 to 60
          l = 50;
        } else {
          colH = 60;
          l = 50 + ((v - 0.8) / 0.2) * 50; // 50 to 100
        }
        ctx.fillStyle = `hsl(${Math.floor(colH)}, 100%, ${Math.floor(l)}%)`;
      } else if (settings.colorMode === 'rainbow') { // ADDED RAINBOW FOR WEBCAM
        const hue = (x * 5) + (y * 2) + (internalTime * 3) + (brightness * 360 * settings.colorWaveDepth);
        ctx.fillStyle = `hsl(${Math.floor(hue % 360)}, 100%, 50%)`;
      } else {
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      }

      ctx.fillText(char, drawX, drawY);
    }
  }

  ctx.globalAlpha = 1;
}
