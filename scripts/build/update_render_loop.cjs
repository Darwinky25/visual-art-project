const fs = require('fs');

let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace(
  /ctx\.fillStyle = '#000000';\n\s*ctx\.fillRect\(0, 0, canvasRef\.current\.width, canvasRef\.current\.height\);/,
  `ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        if (globalBlackout) return; // Panic Button Stop Drawing Layers
`
);

c = c.replace(
  /ctx\.globalCompositeOperation = 'source-over';/,
  `ctx.globalCompositeOperation = 'source-over';
        
        // POST-FX: Scanlines
        if (globalScanlines) {
          ctx.globalAlpha = 0.15;
          ctx.fillStyle = '#ffffff';
          for (let y = 0; y < canvasRef.current.height; y += 4) {
             ctx.fillRect(0, y, canvasRef.current.width, 1);
          }
          ctx.globalAlpha = 1.0;
        }

        // POST-FX: Global Glitch
        if (globalGlitch && currentData && currentData.bass > 0.4) {
          ctx.globalCompositeOperation = 'difference';
          ctx.drawImage(canvasRef.current, Math.random() * 20 - 10, 0); // Horizontal tear
          ctx.globalCompositeOperation = 'source-over';
        }`
);

fs.writeFileSync('src/App.tsx', c);

