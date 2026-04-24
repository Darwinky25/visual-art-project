const fs = require('fs');

const code = fs.readFileSync('src/App.tsx', 'utf8');

const targetIdx = code.indexOf('  return (\n    <div className="app-shell"');

if (targetIdx !== -1) {
  const startToIdx = code.slice(0, targetIdx);
  const accCode = `const Accordion = ({ title, children, defaultOpen = true }: any) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: '4px' }}>
      <div className="acc-header" onClick={() => setIsOpen(!isOpen)}>
        <span>{title}</span>
        <span style={{ fontSize: '10px' }}>{isOpen ? '▼' : '▶'}</span>
      </div>
      {isOpen && <div className="acc-body">{children}</div>}
    </div>
  );
};

const Param = ({ label, value, children }: any) => (
  <div className="param-row">
    <div className="param-header">
      <span className="param-label">{label}</span>
      {value !== undefined && <span className="param-val">{value}</span>}
    </div>
    {children}
  </div>
);

`;

  const afterReturnStr = `  return (
    <div className="app-shell" ref={containerRef} style={isFullscreen ? { backgroundColor: '#000', display: 'block', padding: 0, cursor: 'none' } : {}}>
      {!isFullscreen && (
        <header className="header-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 style={{ fontSize: '1.1rem', letterSpacing: '3px', margin: 0 }}>VJ.Engine</h1>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className={micIsRunning ? "primary" : ""} 
                onClick={() => { stopSystem(); setActiveSource('mic'); startMic(); }}
              >Mic In {micIsRunning && '⚫'}</button>
              <button 
                className={systemIsRunning ? "primary" : ""} 
                onClick={() => { stopMic(); setActiveSource('system'); startSystem(); }}
              >Sys In {systemIsRunning && '⚫'}</button>
              <button onClick={() => { stopMic(); stopSystem(); stopWebcam(); }}>Mute All</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#888', marginRight: '8px' }}>MIDI: {midiStatus}</span>
            <button onClick={() => alert('Settings autosaved')} style={{ background: '#222', color: 'white', border: '1px solid #444' }}>💾 Save</button>
            <button onClick={toggleFullscreen} style={{ background: '#222', color: 'white', border: '1px solid #444' }}>⛶ Fullscreen</button>
          </div>
        </header>
      )}

      {!isFullscreen && (
        <aside className="left-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '0.85rem', color: '#fff', letterSpacing: 1 }}>LAYER STACK</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {layers.map(l => (
              <div 
                key={l.id} 
                className={\`layer-item \${l.id === activeLayerId ? 'active' : ''}\`}
                onClick={() => setActiveLayerId(l.id)}
              >
                <div className="layer-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.enabled ? '#10b981' : '#444' }}></div>
                     <span className="layer-title" style={{ color: l.enabled ? '#fff' : '#666' }}>{l.type === 'audio2d' ? 'Audio Grid' : 'Cam Matrix'}</span>
                  </div>
                  <div>
                    <button style={{ padding: '0 6px', background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setLayers(prev => prev.map(pl => pl.id === l.id ? { ...pl, enabled: !pl.enabled } : pl)); }}>{l.enabled ? '👁' : '🙈'}</button>
                    <button style={{ padding: '0 6px', background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setLayers(prev => prev.filter(pl => pl.id !== l.id)); }}>✕</button>
                  </div>
                </div>
                
                {l.id === activeLayerId && (
                  <div className="layer-body">
                    <Param label="Blend Mode">
                      <select style={{ width: '100%', background: '#333', color: '#fff', border: '1px solid #444', padding: '4px' }} value={l.blendMode} onChange={(e) => setLayers(prev => prev.map(pl => pl.id === l.id ? { ...pl, blendMode: e.target.value as GlobalCompositeOperation } : pl))}>
                        <option value="source-over">Normal</option>
                        <option value="screen">Screen (Additive)</option>
                        <option value="multiply">Multiply</option>
                        <option value="difference">Difference</option>
                        <option value="overlay">Overlay</option>
                        <option value="color-dodge">Color Dodge</option>
                      </select>
                    </Param>
                    <Param label="Opacity" value={\`\${(l.opacity * 100).toFixed(0)}%\`}>
                      <input type="range" min="0" max="1" step="0.01" value={l.opacity} onChange={(e) => setLayers(prev => prev.map(pl => pl.id === l.id ? { ...pl, opacity: parseFloat(e.target.value) } : pl))} style={{ width: '100%' }} />
                    </Param>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
             <button style={{ background: '#222', border: '1px solid #444', color: '#fff', padding: '6px', cursor: 'pointer' }} onClick={() => setLayers([{ id: Date.now().toString(), type: 'audio2d', enabled: true, opacity: 1, blendMode: 'screen', settings: { ...defaultSettings, movementStyle: 'glitch' } }, ...layers])}>+ AUDIO</button>
             <button style={{ background: '#222', border: '1px solid #444', color: '#fff', padding: '6px', cursor: 'pointer' }} onClick={() => { setLayers([{ id: Date.now().toString(), type: 'webcamAscii', enabled: true, opacity: 1, blendMode: 'screen', settings: { ...defaultSettings, colorMode: 'neon' } }, ...layers]); startWebcam(); }}>+ CAM</button>
          </div>
          
          <div style={{ marginTop: '24px', borderTop: '1px solid #333', paddingTop: '16px' }}>
             <Param label="Global Sensitivity" value={\`\${sensitivity.toFixed(2)}x\`}>
               <input type="range" min="0.1" max="5" step="0.1" value={sensitivity} onChange={(e) => setSensitivity(parseFloat(e.target.value))} style={{ width: '100%' }} />
             </Param>
          </div>
        </aside>
      )}

      {/* Main rendering canvas */}
      <main className="stage" style={isFullscreen ? { width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, cursor: 'none', zIndex: 9999, margin: 0, padding: 0 } : {}}>
        <canvas ref={canvasRef} onDoubleClick={toggleFullscreen} style={{ width: '100%', height: '100%', display: 'block' }} />
      </main>

      {/* Right panel: dynamic parameter inspector for the selected layer */}
      {!isFullscreen && activeLayer && (
        <aside className="right-panel">
           <h3 style={{ margin: 0, marginBottom: '16px', fontSize: '0.85rem', color: '#fff', letterSpacing: 1 }}>PROPERTIES: {activeLayer.type === 'audio2d' ? 'Audio Grid' : 'Cam Matrix'}</h3>
           
           {activeLayer.type === 'audio2d' && (
             <Accordion title="Shape & Size" defaultOpen={true}>
                <Param label="Grid Width" value={\`\${(settings.gridWidthRatio * 100).toFixed(0)}%\`}>
                  <input type="range" min="0.1" max="1" step="0.05" value={settings.gridWidthRatio} onChange={(e) => setSettings({...settings, gridWidthRatio: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                </Param>
                <Param label="Vertical Shift" value={\`\${(settings.yOffsetRatio * 100).toFixed(0)}%\`}>
                  <input type="range" min="0" max="1" step="0.05" value={settings.yOffsetRatio} onChange={(e) => setSettings({...settings, yOffsetRatio: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                </Param>
                <Param label="Dot Scale" value={settings.dotSizeBase.toFixed(1)}>
                  <input type="range" min="1" max="10" step="0.5" value={settings.dotSizeBase} onChange={(e) => setSettings({...settings, dotSizeBase: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                </Param>
             </Accordion>
           )}

           <Accordion title="Audio Reactivity" defaultOpen={true}>
              <Param label="Smoothing Latency" value={settings.audioSmoothing.toFixed(2)}>
                <input type="range" min="0.01" max="0.95" step="0.01" value={settings.audioSmoothing} onChange={(e) => setSettings({...settings, audioSmoothing: parseFloat(e.target.value)})} style={{ width: '100%' }} />
              </Param>
              {activeLayer.type === 'audio2d' && (
                <>
                  <Param label="Bass Threshold" value={\`\${(settings.bassThreshold * 100).toFixed(0)}%\`}>
                    <input type="range" min="0" max="0.8" step="0.05" value={settings.bassThreshold} onChange={(e) => setSettings({...settings, bassThreshold: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </Param>
                  <Param label="Mid Threshold" value={\`\${(settings.midThreshold * 100).toFixed(0)}%\`}>
                    <input type="range" min="0" max="0.8" step="0.05" value={settings.midThreshold} onChange={(e) => setSettings({...settings, midThreshold: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </Param>
                  <Param label="Treble Threshold" value={\`\${(settings.highThreshold * 100).toFixed(0)}%\`}>
                    <input type="range" min="0" max="0.8" step="0.05" value={settings.highThreshold} onChange={(e) => setSettings({...settings, highThreshold: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </Param>
                </>
              )}
           </Accordion>

           {activeLayer.type === 'audio2d' && (
             <>
               <Accordion title="Wave Geometry" defaultOpen={false}>
                  <Param label="Movement Style">
                    <select value={settings.movementStyle} onChange={(e) => setSettings({...settings, movementStyle: e.target.value as any})} style={{ width: '100%', background: '#333', color: '#fff', border: '1px solid #555' }}>
                       <option value="ripple">Radial Ripple</option>
                       <option value="wave">Vertical Wave</option>
                       <option value="matrix">Matrix Rain</option>
                       <option value="glitch">Glitch Shake</option>
                       <option value="static">Static EQ</option>
                    </select>
                  </Param>
                  <Param label="Wave Density" value={settings.rippleDamping.toFixed(2)}>
                    <input type="range" min="0.05" max="2.0" step="0.05" value={settings.rippleDamping} onChange={(e) => setSettings({...settings, rippleDamping: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </Param>
                  <Param label="Wave Speed" value={settings.rippleSpeed.toFixed(1)}>
                    <input type="range" min="0" max="20" step="0.5" value={settings.rippleSpeed} onChange={(e) => setSettings({...settings, rippleSpeed: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </Param>
                  <Param label="Base Animation Speed" value={\`\${settings.globalSpeed.toFixed(1)}x\`}>
                    <input type="range" min="0" max="5" step="0.1" value={settings.globalSpeed} onChange={(e) => setSettings({...settings, globalSpeed: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </Param>
               </Accordion>

               <Accordion title="Impact Forces" defaultOpen={false}>
                  <Param label="Amplitude Height" value={settings.amplitudeRatio.toFixed(2)}>
                    <input type="range" min="0.1" max="2" step="0.05" value={settings.amplitudeRatio} onChange={(e) => setSettings({...settings, amplitudeRatio: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </Param>
                  <Param label="Bass Depth Pulse" value={settings.bassPulseImpact.toFixed(3)}>
                    <input type="range" min="0" max="0.1" step="0.005" value={settings.bassPulseImpact} onChange={(e) => setSettings({...settings, bassPulseImpact: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </Param>
                  <Param label="Glitch Intensity" value={settings.glitchIntensity}>
                    <input type="range" min="0" max="100" step="1" value={settings.glitchIntensity} onChange={(e) => setSettings({...settings, glitchIntensity: parseInt(e.target.value)})} style={{ width: '100%' }} />
                  </Param>
               </Accordion>
             </>
           )}

           {activeLayer.type === 'webcamAscii' && (
             <Accordion title="Camera ASCII Engine" defaultOpen={true}>
                <Param label="Resolution Density" value={settings.asciiResolution}>
                  <input type="range" min="20" max="200" step="5" value={settings.asciiResolution} onChange={(e) => setSettings({...settings, asciiResolution: parseInt(e.target.value)})} style={{ width: '100%' }} />
                </Param>
                <Param label="Pattern Set">
                  <select value={settings.asciiCharSet} onChange={(e) => setSettings({...settings, asciiCharSet: e.target.value as any})} style={{ width: '100%', background: '#333', color: '#fff', border: '1px solid #555' }}>
                     <option value="standard">Standard (@%#*+)</option>
                     <option value="dense">Dense Shader</option>
                     <option value="binary">Binary Data (10)</option>
                     <option value="matrix">Matrix Katakana</option>
                  </select>
                </Param>
                <Param label="Audio Zoom Impact" value={settings.asciiAudioImpact.toFixed(2)}>
                  <input type="range" min="0" max="2" step="0.1" value={settings.asciiAudioImpact} onChange={(e) => setSettings({...settings, asciiAudioImpact: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                </Param>
                <Param label="Glitch Scatter" value={settings.asciiGlitch}>
                  <input type="range" min="0" max="100" step="1" value={settings.asciiGlitch} onChange={(e) => setSettings({...settings, asciiGlitch: parseInt(e.target.value)})} style={{ width: '100%' }} />
                </Param>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                  <input type="checkbox" id="asciiInvert" checked={settings.asciiInvert} onChange={(e) => setSettings({...settings, asciiInvert: e.target.checked})} style={{ appearance: 'auto', width: 'auto', height: 'auto' }} />
                  <label htmlFor="asciiInvert" style={{ color: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}>Invert Pixel Brightness</label>
                </div>
             </Accordion>
           )}

           <Accordion title="Theme Mapping" defaultOpen={true}>
              <Param label="Color Profile">
                <select value={settings.colorMode} onChange={(e) => setSettings({...settings, colorMode: e.target.value as any})} style={{ width: '100%', background: '#333', color: '#fff', border: '1px solid #555' }}>
                   <option value="white">Sleek White</option>
                   <option value="neon">DJ Neon Sweep</option>
                   <option value="rainbow">Thermal Spectrogram</option>
                   <option value="thermal">Infrared Vision</option>
                   <option value="custom">Solid Custom</option>
                </select>
              </Param>
              {settings.colorMode === 'custom' && (
                <Param label="Primary Hex">
                  <input type="color" value={settings.customColor} onChange={(e) => setSettings({...settings, customColor: e.target.value})} style={{ width: '100%', height: '30px', padding: 0, border: 'none', cursor: 'pointer' }} />
                </Param>
              )}
              <Param label="Background">
                <input type="color" value={settings.backgroundColor} onChange={(e) => setSettings({...settings, backgroundColor: e.target.value})} style={{ width: '100%', height: '30px', padding: 0, border: 'none', cursor: 'pointer' }} />
              </Param>
              
              {activeLayer.type === 'audio2d' && (
                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '4px' }}>Custom String Matrix</label>
                  <textarea rows={3} style={{ width: '100%', background: '#222', color: '#fff', border: '1px solid #444', resize: 'vertical' }} value={settings.customText} onChange={(e) => setSettings({...settings, customText: e.target.value})} />
                </div>
              )}
           </Accordion>
        </aside>
      )}

    </div>
  );
}
`;

  const newCode = startToIdx.replace("export default function App() {", accCode + "\nexport default function App() {") + afterReturnStr;
  fs.writeFileSync('src/App.tsx', newCode);
  console.log("App.tsx return block replaced successfully");
} else {
  console.log("target return block not found");
}

