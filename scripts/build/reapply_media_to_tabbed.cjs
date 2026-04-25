const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add drawMedia import
content = content.replace(
  /import \{ drawKinect3D \} from '\.\/visualizer\/drawKinect3D';/,
  "import { drawKinect3D } from './visualizer/drawKinect3D';\nimport { drawMedia } from './visualizer/drawMedia';"
);

// 2. Update Layer Type
content = content.replace(
  /type: 'audio2d' \| 'webcamAscii' \| 'kinect3d';/,
  "type: 'audio2d' | 'webcamAscii' | 'kinect3d' | 'media';\n  mediaUrl?: string;\n  mediaType?: 'video' | 'image' | null;"
);

// 3. Add refs and useEffect
content = content.replace(
  /const activeLayer = layers\[activeLayerIndex\];[\s\n]*const settings = activeLayer \? activeLayer\.settings : defaultSettings;/,
  `const activeLayer = layers[activeLayerIndex];

  const mediaElementsRef = useRef<Map<string, HTMLVideoElement | HTMLImageElement>>(new Map());

  // Handle setting up Media elements automatically outside the draw loop
  useEffect(() => {
    layers.forEach(layer => {
      if (layer.type === 'media' && layer.mediaUrl) {
        if (!mediaElementsRef.current.has(layer.id) || (mediaElementsRef.current.get(layer.id) as any)?.src !== layer.mediaUrl) {
          if (layer.mediaType === 'video') {
            const vid = document.createElement('video');
            vid.src = layer.mediaUrl;
            vid.crossOrigin = 'anonymous';
            vid.loop = true;
            vid.muted = true;
            vid.play().catch(e => console.warn('Autoplay prevented:', e));
            mediaElementsRef.current.set(layer.id, vid);
          } else if (layer.mediaType === 'image') {
            const img = new Image();
            img.src = layer.mediaUrl;
            img.crossOrigin = 'anonymous';
            mediaElementsRef.current.set(layer.id, img);
          }
        }
      }
    });

    // Cleanup removed layers
    for (const [id, element] of mediaElementsRef.current.entries()) {
      if (!layers.find(l => l.id === id) || layers.find(l => l.id === id)?.type !== 'media') {
        if (element instanceof HTMLVideoElement) {
          element.pause();
          element.src = '';
        }
        mediaElementsRef.current.delete(id);
      }
    }
  }, [layers]);

  const settings = activeLayer ? activeLayer.settings : defaultSettings;`
);

// 4. renderLoop modifications
content = content.replace(
  /\} else if \(layer\.type === 'kinect3d'\) \{[\s\S]*?drawKinect3D[^}]*\}\);[\s\S]*?\}\)/,
  `} else if (layer.type === 'kinect3d') {
            drawKinect3D(ctx, canvasRef.current!, depthFrameRef.current, currentData, {
              sensitivity: sensitivityRef.current,
              settings: layer.settings,
            });
          } else if (layer.type === 'media') {
            const mediaEl = mediaElementsRef.current.get(layer.id);
            if (mediaEl) {
              drawMedia(ctx, canvasRef.current!, mediaEl, layer.settings);
            }
          }
        });`
);

// 5. Update UI rendering layer type name string
content = content.replace(
  /\{layer\.type === 'audio2d' \? 'Audio 2D' : 'Webcam ASCII'\} \(\{layer\.id\}\)/,
  "{layer.type === 'audio2d' ? 'Audio 2D' : layer.type === 'webcamAscii' ? 'Webcam ASCII' : layer.type === 'kinect3d' ? 'Kinect 3D' : 'Media / BG'} ({layer.id})"
);

// 6. Fix "Audio 2D / Webcam" in buttons (the tabbed UI uses "+ Kinect 3D", "+ AUDIO", etc. inside a different block)
// I need to look for `>+ Kinect 3D</button>` in the tabbed UI first. Wait, let me grep where that button is.
fs.writeFileSync('src/App.tsx', content);
