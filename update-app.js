const fs = require('fs');

const appContent = fs.readFileSync('src/App.tsx', 'utf8');
let newApp = appContent.replace(
  "const [activeMode, setActiveMode] = useState<'audio2d' | 'webcamAscii'>('audio2d');",
  `export type Layer = { id: string; name: string; type: 'audio2d' | 'webcamAscii'; visible: boolean; settings: VisualSettings; blendMode: string; };

  const [layers, setLayers] = useState<Layer[]>(() => {
    try {
      const saved = localStorage.getItem('visualizer_layers');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return [
      { id: '1', name: 'Background Audio', type: 'audio2d', visible: true, blendMode: 'source-over', settings: { ...defaultSettings, visualizationMode: 'audio2d' } }
    ];
  });
  const [selectedLayerId, setSelectedLayerId] = useState<string>('1');

  useEffect(() => {
    localStorage.setItem('visualizer_layers', JSON.stringify(layers));
  }, [layers]);

  const selectedLayer = layers.find(l => l.id === selectedLayerId) || layers[0];
  const activeMode = selectedLayer.type;
  
  const setSettings = (newSettingsHook: any) => {
    setLayers(prev => prev.map(l => {
      if (l.id === selectedLayerId) {
        return { ...l, settings: typeof newSettingsHook === 'function' ? newSettingsHook(l.settings) : newSettingsHook };
      }
      return l;
    }));
  };
  
  const settings = selectedLayer.settings;`
);

newApp = newApp.replace(/const \[audioSettings[\s\S]*?setAudioSettings;\n/, '');

newApp = newApp.replace(/const activeModeRef = useRef\(activeMode\);\n  const settingsRef = useRef\(settings\);\n/, "const layersRef = useRef(layers);\nconst activeModeRef = useRef(activeMode);\nconst settingsRef = useRef(settings);\n");

newApp = newApp.replace(
  "useEffect(() => {\n    settingsRef.current = settings;\n  }, [settings]);",
  "useEffect(() => {\n    settingsRef.current = settings;\n  }, [settings]);\n  useEffect(() => { layersRef.current = layers; }, [layers]);"
);

const drawLoopRegex = /const ctx = canvasRef\.current\.getContext\('2d'\);\s*if \(ctx\) \{[\s\S]*?\}\s*\}/;
newApp = newApp.replace(drawLoopRegex, `const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        // Clear global background first
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        // Draw each visible layer from bottom to top
        [...layersRef.current].reverse().forEach((layer, index) => {
          if (!layer.visible) return;
          
          if (layer.type === 'webcamAscii' && videoRef.current && videoRef.current.readyState >= 2) {
             drawAsciiWebcam(ctx, canvasRef.current, videoRef.current, currentData, {
              sensitivity: sensitivityRef.current,
              settings: layer.settings,
              clearBackground: false
            });
          } else if (layer.type === 'audio2d') {
            drawVisualizer(ctx, canvasRef.current, currentData, {
              sensitivity: sensitivityRef.current,
              djState: djStateRef.current,
              settings: layer.settings,
              clearBackground: false,
              blendMode: layer.blendMode as any
            });
          }
        });
      }`);

newApp = newApp.replace(
  '<button onClick={toggleFullscreen} className="outline">Fullscreen</button>',
  `<button onClick={toggleFullscreen} className="outline">Fullscreen</button>
            </div>
            
            {/* LAYER MANAGER UI */}
            <div style={{ marginTop: '1rem', background: '#222', padding: '0.5rem', borderRadius: '4px' }}>
               <h4 style={{ fontSize: '0.8rem', color: '#ccc', marginBottom: '0.5rem' }}>Layer Stack</h4>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 {layers.map(l => (
                   <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: l.id === selectedLayerId ? '#444' : '#111', cursor: 'pointer', borderLeft: l.id === selectedLayerId ? '2px solid #3b82f6' : '2px solid transparent' }} onClick={() => setSelectedLayerId(l.id)}>
                     <span style={{ fontSize: '0.75rem', color: l.visible ? '#fff' : '#666' }}>{l.name}</span>
                     <div>
                       <button style={{ padding: '0 4px', background: 'transparent', fontSize: '0.7rem' }} onClick={(e) => { e.stopPropagation(); setLayers(prev => prev.map(pl => pl.id === l.id ? { ...pl, visible: !pl.visible } : pl)); }}>{l.visible ? '👁' : '🙈'}</button>
                       <button style={{ padding: '0 4px', background: 'transparent', fontSize: '0.7rem', color: 'red' }} onClick={(e) => { e.stopPropagation(); setLayers(prev => prev.filter(pl => pl.id !== l.id)); }}>✕</button>
                     </div>
                   </div>
                 ))}
               </div>
               <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                 <button style={{ fontSize: '0.7rem', padding: '2px 6px' }} onClick={() => setLayers([{ id: Date.now().toString(), name: 'New Audio Layer', type: 'audio2d', visible: true, blendMode: 'screen', settings: defaultSettings }, ...layers])}>+ Audio</button>
                 <button style={{ fontSize: '0.7rem', padding: '2px 6px' }} onClick={() => { setLayers([{ id: Date.now().toString(), name: 'New Webcam Layer', type: 'webcamAscii', visible: true, blendMode: 'screen', settings: defaultSettings }, ...layers]); startWebcam(); }}>+ Webcam</button>
               </div>
               
               {/* BLEND MODE SETTINGS FOR CURRENT LAYER */}
               <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #444' }}>
                 <label style={{ fontSize: '0.7rem', display: 'block', color: '#fff', marginBottom: '2px' }}>Selected Layer Blend Mode:</label>
                 <select style={{ width: '100%', fontSize: '0.7rem', padding: '2px', background: '#333', color: '#fff', border: 'none' }} value={selectedLayer.blendMode} onChange={(e) => setLayers(prev => prev.map(l => l.id === selectedLayerId ? { ...l, blendMode: e.target.value } : l))}>
                   <option value="source-over">Normal</option>
                   <option value="screen">Screen (Additive)</option>
                   <option value="multiply">Multiply</option>
                   <option value="difference">Difference</option>
                 </select>
               </div>
            </div>`
);

// We need to strip out the old activeMode button
newApp = newApp.replace(/<button\s*className="outline"\s*style={{ background: activeMode === 'webcamAscii'[\s\S]*?<\/button>/, '');

fs.writeFileSync('src/App.tsx', newApp);
