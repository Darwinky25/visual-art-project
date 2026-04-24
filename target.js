  return (
    <div className="app-shell" ref={containerRef} style={isFullscreen ? { backgroundColor: '#000', display: 'block', padding: 0, cursor: 'none' } : {}}>
      {!isFullscreen && (
        <aside className="panel controls glass" style={{ overflowY: 'auto', maxHeight: '100%' }}>
          <div className="card">
            <h1>REALTIME DJ VISUALIZER</h1>
            <p style={{ marginTop: 8 }}>Start mic input, test the response, and shape the visuals for live stage use.</p>
            <div className="flex gap-2 mt" style={{ marginBottom: 16 }}>
              <button className="primary" onClick={() => { stopSystem(); setActiveSource('mic'); startMic(); }}>Start mic</button>
              <button className="primary outline" onClick={() => { stopMic(); setActiveSource('system'); startSystem(); }}>Capture System Audio</button>
              <button onClick={() => { stopMic(); stopSystem(); stopWebcam(); }}>Stop All</button>
              
              <button onClick={() => {
                localStorage.setItem('visualizer_layers', JSON.stringify(layers));
                localStorage.setItem('visualizer_sensitivity', sensitivity.toString());
                alert('Settings saved locally!');
              }} style={{ background: '#10b981', color: 'white', border: 'none' }}>
                Save Settings
              </button>
              <button onClick={toggleFullscreen} className="outline">Fullscreen</button>
            </div>
            {micIsRunning && <span style={{ padding: '4px 8px', background: '#3b82f6', color: '#fff', borderRadius: '4px', fontSize: '12px', marginRight: 4 }}>Mic live</span>}
            {systemIsRunning && <span style={{ padding: '4px 8px', background: '#10b981', color: '#fff', borderRadius: '4px', fontSize: '12px', marginRight: 4 }}>System audio live</span>}
            {webcamIsRunning && <span style={{ padding: '4px 8px', background: '#eab308', color: '#fff', borderRadius: '4px', fontSize: '12px' }}>Webcam active</span>}
          </div>

          <div className="card">
             <div className="flex space-between">
              <span style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 600 }}>Layers Setup</span>
             </div>
             
             {layers.map(layer => (
               <div key={layer.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', padding: '8px', background: layer.id === activeLayer?.id ? '#333' : 'transparent', borderRadius: '4px', border: '1px solid #444' }}>
                 <input type="checkbox" checked={layer.enabled} onChange={(e) => {
                   setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, enabled: e.target.checked } : l));
                 }} />
                 <span style={{ flex: 1, cursor: 'pointer' }} onClick={() => setActiveLayerId(layer.id)}>
                   {layer.type === 'audio2d' ? 'Audio 2D' : 'Webcam ASCII'} ({layer.id})
                 </span>
                 <button className="outline" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => {
                   setLayers(prev => prev.filter(l => l.id !== layer.id));
                   if (activeLayerId === layer.id) setActiveLayerId(layers[0]?.id || '');
                 }}>X</button>
               </div>
             ))}

             <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                <button className="outline" onClick={() => {
                  const newId = `layer-${Date.now()}`;
                  setLayers(prev => [...prev, { id: newId, type: 'audio2d', enabled: true, settings: { ...defaultSettings, visualizationMode: 'audio2d' }, opacity: 1.0, blendMode: 'screen' }]);
                  setActiveLayerId(newId);
                }}>+ Audio Layer</button>
                <button className="outline" onClick={() => {
                  const newId = `layer-${Date.now()}`;
                  setLayers(prev => [...prev, { id: newId, type: 'webcamAscii', enabled: true, settings: { ...defaultSettings, visualizationMode: 'webcamAscii' }, opacity: 1.0, blendMode: 'screen' }]);
                  setActiveLayerId(newId);
                }}>+ Webcam Layer</button>
             </div>
          </div>

          <div className="card">
             <div className="flex space-between">
              <span style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 600 }}>MIDI Status</span>
             </div>
             <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>{midiStatus}</p>
          </div>

          {activeLayer && (
            <div className="card">
              <h3 style={{ fontSize: '0.9rem', marginBottom: '0.8rem' }}>Settings for Active Layer: {activeLayer.type}</h3>
              
              <div style={{ borderBottom: '1px solid #333', paddingBottom: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.8rem' }}>
                <strong style={{ opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}>Layer Overrides</strong>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Opacity: {(activeLayer.opacity * 100).toFixed(0)}%</label>
                  <input type="range" min="0" max="1" step="0.05" value={activeLayer.opacity} onChange={(e) => {
                    setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, opacity: parseFloat(e.target.value) } : l));
                  }} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Blend Mode:</label>
                  <select 
                    style={{ width: '100%', padding: '4px', background: '#333', color: 'white', border: 'none', borderRadius: '4px' }}
                    value={activeLayer.blendMode} 
                    onChange={(e) => {
                      setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, blendMode: e.target.value as GlobalCompositeOperation } : l));
                    }}
                  >
                     <option value="source-over">Normal</option>
                     <option value="screen">Screen (Add)</option>
                     <option value="multiply">Multiply</option>
                     <option value="overlay">Overlay</option>
                     <option value="lighter">Lighter</option>
                     <option value="difference">Difference</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.75rem' }}>
                
                {/* GROUP 1: BASE VISUALS */}
                <div style={{ borderBottom: '1px solid #333', paddingBottom: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <strong style={{ opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}>Shape & Size</strong>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Sensitivity: {sensitivity.toFixed(1)}x</label>
                    <input type="range" min="0.1" max="5" step="0.1" value={sensitivity} onChange={(e) => setSensitivity(parseFloat(e.target.value))} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Grid Width: {(settings.gridWidthRatio * 100).toFixed(0)}%</label>
                    <input type="range" min="0.1" max="1" step="0.05" value={settings.gridWidthRatio} onChange={(e) => setSettings({...settings, gridWidthRatio: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Vertical Position: {(settings.yOffsetRatio * 100).toFixed(0)}%</label>
                    <input type="range" min="0.1" max="1" step="0.05" value={settings.yOffsetRatio} onChange={(e) => setSettings({...settings, yOffsetRatio: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Dot Size: {settings.dotSizeBase.toFixed(1)}</label>
                    <input type="range" min="1" max="10" step="0.5" value={settings.dotSizeBase} onChange={(e) => setSettings({...settings, dotSizeBase: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Perspective Spacing: {settings.rowSpacingRatio.toFixed(3)}</label>
                    <input type="range" min="0.005" max="0.05" step="0.001" value={settings.rowSpacingRatio} onChange={(e) => setSettings({...settings, rowSpacingRatio: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                </div>

                {/* GROUP 2: AUDIO THRESHOLD */}
                <div style={{ borderBottom: '1px solid #333', paddingBottom: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                   <strong style={{ opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}>Audio Analysis</strong>
                   <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Audio Smoothing (Latency/Jitter): {settings.audioSmoothing.toFixed(2)}</label>
                    <input type="range" min="0.01" max="0.95" step="0.01" value={settings.audioSmoothing} onChange={(e) => setSettings({...settings, audioSmoothing: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Bass Movement Threshold: {(settings.bassThreshold * 100).toFixed(0)}%</label>
                    <input type="range" min="0" max="0.8" step="0.05" value={settings.bassThreshold} onChange={(e) => setSettings({...settings, bassThreshold: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Mid Movement Threshold: {(settings.midThreshold * 100).toFixed(0)}%</label>
                    <input type="range" min="0" max="0.8" step="0.05" value={settings.midThreshold} onChange={(e) => setSettings({...settings, midThreshold: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>High/Treble Movement Threshold: {(settings.highThreshold * 100).toFixed(0)}%</label>
                    <input type="range" min="0" max="0.8" step="0.05" value={settings.highThreshold} onChange={(e) => setSettings({...settings, highThreshold: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                </div>

                {/* GROUP 3: WAVE & MOVEMENT */}
                <div style={{ borderBottom: '1px solid #333', paddingBottom: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <strong style={{ opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}>Wave Geometry</strong>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Movement Style:</label>
                    <select 
                      style={{ width: '100%', padding: '4px', background: '#333', color: 'white', border: 'none', borderRadius: '4px' }}
                      value={settings.movementStyle} 
                      onChange={(e) => setSettings({...settings, movementStyle: e.target.value as any})}
                    >
                       <option value="ripple">Radial Ripple (Default)</option>
                       <option value="wave">Vertical Wave</option>
                       <option value="matrix">Matrix Rain</option>
                       <option value="glitch">Random Glitch</option>
                       <option value="static">Static Equalizer</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Wave/Ripple Density: {settings.rippleDamping.toFixed(2)}</label>
                    <input type="range" min="0.05" max="2.0" step="0.05" value={settings.rippleDamping} onChange={(e) => setSettings({...settings, rippleDamping: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Wave/Ripple Speed: {settings.rippleSpeed.toFixed(1)}</label>
                    <input type="range" min="0" max="20" step="0.5" value={settings.rippleSpeed} onChange={(e) => setSettings({...settings, rippleSpeed: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Color Wave Depth: {settings.colorWaveDepth.toFixed(2)}</label>
                    <input type="range" min="0" max="1" step="0.05" value={settings.colorWaveDepth} onChange={(e) => setSettings({...settings, colorWaveDepth: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Animation Base Speed: {settings.globalSpeed.toFixed(1)}x</label>
                    <input type="range" min="0" max="5" step="0.1" value={settings.globalSpeed} onChange={(e) => setSettings({...settings, globalSpeed: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Breathing Amplitude: {settings.breathAmplitude.toFixed(2)}</label>
                    <input type="range" min="0" max="0.5" step="0.01" value={settings.breathAmplitude} onChange={(e) => setSettings({...settings, breathAmplitude: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                </div>

                {/* GROUP 4: IMPACT & GLITCH */}
                <div style={{ borderBottom: '1px solid #333', paddingBottom: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <strong style={{ opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}>Impact & Reaction</strong>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Amplitude Base (Height): {settings.amplitudeRatio.toFixed(2)}</label>
                    <input type="range" min="0.1" max="2" step="0.05" value={settings.amplitudeRatio} onChange={(e) => setSettings({...settings, amplitudeRatio: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Bass Pulse Impact (Zoom Grid): {settings.bassPulseImpact.toFixed(3)}</label>
                    <input type="range" min="0" max="0.1" step="0.005" value={settings.bassPulseImpact} onChange={(e) => setSettings({...settings, bassPulseImpact: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Glitch Text Intensity: {settings.glitchIntensity}</label>
                    <input type="range" min="0" max="100" step="1" value={settings.glitchIntensity} onChange={(e) => setSettings({...settings, glitchIntensity: parseInt(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Scatter / Jump Multiplier: {settings.scatterMultiplier}</label>
                    <input type="range" min="0" max="200" step="1" value={settings.scatterMultiplier} onChange={(e) => setSettings({...settings, scatterMultiplier: parseInt(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Base Bass Brightness: {settings.baseBrightness.toFixed(2)}</label>
                    <input type="range" min="0" max="0.5" step="0.01" value={settings.baseBrightness} onChange={(e) => setSettings({...settings, baseBrightness: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>
                </div>

                {/* GROUP 5: THEME */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', borderBottom: '1px solid #333', paddingBottom: '0.6rem' }}>
                  <strong style={{ opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}>Theme & Content</strong>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Color Mode:</label>
                    <select 
                      style={{ width: '100%', padding: '4px', background: '#333', color: 'white', border: 'none', borderRadius: '4px' }}
                      value={settings.colorMode} 
                      onChange={(e) => setSettings({...settings, colorMode: e.target.value as any})}
                    >
                       <option value="white">Minimal White</option>
                       <option value="neon">Neon Override</option>
                       <option value="rainbow">Rainbow Spectrogram</option>
                       <option value="thermal">Thermal Vision</option>
                       <option value="custom">Custom Color (100% Control)</option>
                    </select>
                  </div>
                  
                  {settings.colorMode === 'custom' && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Primary Text Color:</label>
                      <input 
                        type="color" 
                        value={settings.customColor} 
                        onChange={(e) => setSettings({...settings, customColor: e.target.value})} 
                        style={{ width: '100%', height: '30px', border: 'none', padding: 0, background: 'none' }}
                      />
                    </div>
                  )}
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Background Color:</label>
                    <input 
                      type="color" 
                      value={settings.backgroundColor} 
                      onChange={(e) => setSettings({...settings, backgroundColor: e.target.value})} 
                      style={{ width: '100%', height: '30px', border: 'none', padding: 0, background: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Custom Text / Characters:</label>
                    <textarea 
                      style={{ width: '100%', height: '80px', padding: '4px', background: '#333', color: 'white', border: 'none', borderRadius: '4px' }}
                      value={settings.customText}
                      onChange={(e) => setSettings({...settings, customText: e.target.value})}
                    />
                  </div>                
                </div>
                
                {activeLayer.type === 'webcamAscii' && (
                  <>
                    {/* GROUP 6: ASCII SETTINGS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <strong style={{ opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}>ASCII & Webcam</strong>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>ASCII Resolution: {settings.asciiResolution}</label>
                        <input type="range" min="10" max="150" step="5" value={settings.asciiResolution} onChange={(e) => setSettings({...settings, asciiResolution: parseInt(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Character Set:</label>
                        <select 
                          style={{ width: '100%', padding: '4px', background: '#333', color: 'white', border: 'none', borderRadius: '4px' }}
                          value={settings.asciiCharSet} 
                          onChange={(e) => setSettings({...settings, asciiCharSet: e.target.value as any})}
                        >
                           <option value="standard">Standard (@%#*+=-:. )</option>
                           <option value="dense">Dense</option>
                           <option value="binary">Binary (10)</option>
                           <option value="matrix">Matrix</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>ASCII Glitch Intensity: {settings.asciiGlitch}</label>
                        <input type="range" min="0" max="100" step="1" value={settings.asciiGlitch} onChange={(e) => setSettings({...settings, asciiGlitch: parseInt(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Audio Size Impact: {settings.asciiAudioImpact.toFixed(2)}</label>
                        <input type="range" min="0" max="2" step="0.1" value={settings.asciiAudioImpact} onChange={(e) => setSettings({...settings, asciiAudioImpact: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" id="asciiInvert" checked={settings.asciiInvert} onChange={(e) => setSettings({...settings, asciiInvert: e.target.checked})} />
                        <label htmlFor="asciiInvert" style={{ color: '#fff' }}>Invert Brightness</label>
                      </div>
                    </div>
                  </>
                )}

              </div>
            </div>
          )}
        </aside>
      )}

      <main 
        className="stage" 
        style={isFullscreen ? { margin: 0, padding: 0, borderRadius: 0, width: '100vw', height: '100vh', position: 'relative', cursor: 'none' } : {}}
        onDoubleClick={toggleFullscreen}
      >
        <canvas ref={canvasRef} />
      </main>
    </div>
  );
}
