import { useState, useRef, useEffect, useCallback } from 'react';
import './styles.css';
import { useMicrophoneAnalyzer } from './hooks/useMicrophoneAnalyzer';
import { useSystemAudioAnalyzer } from './hooks/useSystemAudioAnalyzer';
import { useDjMidi } from './hooks/useDjMidi';
import { drawVisualizer, VisualSettings } from './visualizer/drawVisualizer';

const defaultSettings: VisualSettings = {
  gridWidthRatio: 1.0,
  yOffsetRatio: 0.5,
  dotSizeBase: 6, // Adjusted slightly larger for the super-optimized grid
  amplitudeRatio: 0.3,
  rowSpacingRatio: 0.035, // More vertical breathing room
  colorMode: 'white',
  customColor: '#ffffff',
  backgroundColor: '#000000',
  movementStyle: 'ripple',
  bassThreshold: 0.2,
  midThreshold: 0.4,
  highThreshold: 0.6,
  audioSmoothing: 0.15,
  globalSpeed: 1.0,
  bassPulseImpact: 0.01,
  baseBrightness: 0.05,
  glitchIntensity: 20,
  rippleDamping: 0.4,
  rippleSpeed: 7.0,
  colorWaveDepth: 0.4,
  breathAmplitude: 0.1,
  scatterMultiplier: 50,
  customText: 'ltsdeiw sro le temuggmpndgtble tatodt rroycga hedWidntzed Drveresehe oro trzoeman atspea hntt ms aoe lcoesw fs tcst shr e w tis bhesJul tfo di,s pehayafeotep seotn dngexConditananns giotehesioasowthoawitdcynsmgn a a Cuusco d ot pd t,aTt .sasu .ebeate, i via d t Acr nanscur n how tth ontiediaor or essungattg',
};

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [settings, setSettings] = useState<VisualSettings>(() => {
    try {
      const saved = localStorage.getItem('visualizer_settings');
      if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return defaultSettings;
  });
  
  const { start: startMic, stop: stopMic, frame: micFrame, isRunning: micIsRunning } = useMicrophoneAnalyzer(settings.audioSmoothing);
  const { start: startSystem, stop: stopSystem, frame: systemFrame, isRunning: systemIsRunning } = useSystemAudioAnalyzer(settings.audioSmoothing);
  const [activeSource, setActiveSource] = useState<'mic' | 'system'>('mic');
  
  const { midiStatus, djStateRef } = useDjMidi();
  
  const [sensitivity, setSensitivity] = useState(() => {
    try {
      const saved = localStorage.getItem('visualizer_sensitivity');
      if (saved) return parseFloat(saved);
    } catch { /* ignore */ }
    return 1;
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const settingsRef = useRef(settings);
  const sensitivityRef = useRef(sensitivity);
  
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  
  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const renderLoop = useCallback(() => {
    if (canvasRef.current && djStateRef.current) {
      const parent = canvasRef.current.parentElement;
      if (parent) {
        if (canvasRef.current.width !== parent.clientWidth) {
          canvasRef.current.width = parent.clientWidth;
        }
        if (canvasRef.current.height !== parent.clientHeight) {
          canvasRef.current.height = parent.clientHeight;
        }
      }
      
      const currentData = activeSource === 'mic' && micFrame.current 
        ? micFrame.current 
        : systemFrame.current;

      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        drawVisualizer(ctx, canvasRef.current, currentData, {
          sensitivity: sensitivityRef.current,
          djState: djStateRef.current,
          settings: settingsRef.current,
        });
      }
    }
    requestAnimationFrame(renderLoop);
  }, [micFrame, systemFrame, activeSource, djStateRef]);

  useEffect(() => {
    let loopId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(loopId);
  }, [renderLoop]);

  return (
    <div className="app-shell" ref={containerRef} style={isFullscreen ? { backgroundColor: '#000', display: 'block', padding: 0, cursor: 'none' } : {}}>
      {!isFullscreen && (
        <aside className="panel controls glass" style={{ overflowY: 'auto', maxHeight: '100%' }}>
          <div className="card">
            <h1>REALTIME DJ VISUALIZER</h1>
            <p style={{ marginTop: 8 }}>Start mic input, test the response, and shape the visuals for live stage use.</p>
            <div className="flex gap-2 mt" style={{ marginBottom: 16 }}>
              <button className="primary" onClick={() => {
                stopSystem();
                setActiveSource('mic');
                startMic();
              }}>Start mic</button>
              
              <button 
                className="primary outline" 
                onClick={() => {
                  stopMic();
                  setActiveSource('system');
                  startSystem();
                }}
              >Capture System Audio
              </button>

              <button onClick={() => {
                stopMic();
                stopSystem();
              }}>Stop</button>
              
              <button onClick={() => {
                localStorage.setItem('visualizer_settings', JSON.stringify(settings));
                localStorage.setItem('visualizer_sensitivity', sensitivity.toString());
                alert('Settings saved locally!');
              }} style={{ background: '#10b981', color: 'white', border: 'none' }}>
                Save Settings
              </button>
              <button onClick={toggleFullscreen} className="outline">Fullscreen</button>
            </div>
            {micIsRunning ? <span style={{ padding: '4px 8px', background: '#3b82f6', color: '#fff', borderRadius: '4px', fontSize: '12px', marginRight: 4 }}>Mic live</span> : null}
            {systemIsRunning ? <span style={{ padding: '4px 8px', background: '#10b981', color: '#fff', borderRadius: '4px', fontSize: '12px' }}>System audio live</span> : null}
          </div>

          <div className="card">
             <div className="flex space-between">
              <span style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 600 }}>MIDI Status</span>
             </div>
             <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>{midiStatus}</p>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.8rem' }}>Visual Settings</h3>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
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

            </div>
          </div>
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
