const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add layerCanvasesRef
content = content.replace(
  /const canvasRef = useRef<HTMLCanvasElement>\(null\);/,
  "const canvasRef = useRef<HTMLCanvasElement>(null);\n  const layerCanvasesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());"
);

// 2. Overhaul renderLoop layersRef.current.forEach block
const loopSearch = /layersRef\.current\.forEach\(layer => \{[\s\S]*?\}\);;/;
// wait, I also need to make sure I don't replace too much. Let's find exactly the block:
const renderCodeStart = "        layersRef.current.forEach(layer => {";
const renderCodeEnd = "        });;\n        \n        ctx.globalAlpha = 1.0;";

content = content.replace(/layersRef\.current\.forEach\(layer => \{[\s\S]*?\}\);\s*;/g, `        layersRef.current.forEach(layer => {
          if (!layer.enabled) return;

          // Per-layer offscreen canvas to isolate internal 'source-over' modifications inside drawVisualizer
          let lCanvas = layerCanvasesRef.current.get(layer.id);
          if (!lCanvas) {
            lCanvas = document.createElement('canvas');
            layerCanvasesRef.current.set(layer.id, lCanvas);
          }
          if (lCanvas.width !== canvasRef.current.width) lCanvas.width = canvasRef.current.width;
          if (lCanvas.height !== canvasRef.current.height) lCanvas.height = canvasRef.current.height;
          
          const lCtx = lCanvas.getContext('2d');
          if (!lCtx) return;

          if (layer.type === 'audio2d') {
            drawVisualizer(lCtx, lCanvas, currentData, {
              sensitivity: sensitivityRef.current,
              djState: djStateRef.current,
              settings: layer.settings,
              kinectDepthFrame: depthFrameRef.current
            });
          } else if (layer.type === 'webcamAscii' && videoRef.current && videoRef.current.readyState >= 2) {
            drawAsciiWebcam(lCtx, lCanvas, videoRef.current, currentData, {
              sensitivity: sensitivityRef.current,
              settings: layer.settings,
            });
          } else if (layer.type === 'kinect3d') {
            drawKinect3D(lCtx, lCanvas, depthFrameRef.current, currentData, {
              sensitivity: sensitivityRef.current,
              settings: layer.settings,
            });
          } else if (layer.type === 'media') {
            const mediaEl = mediaElementsRef.current.get(layer.id);
            if (mediaEl) {
              drawMedia(lCtx, lCanvas, mediaEl, layer.settings);
            }
          }

          // Composite isolated layer securely to main canvas
          ctx.globalAlpha = layer.opacity;
          ctx.globalCompositeOperation = layer.blendMode;
          ctx.drawImage(lCanvas, 0, 0);
        });`);

fs.writeFileSync('src/App.tsx', content);

