const fs = require('fs');

let c = fs.readFileSync('src/App.tsx', 'utf8');

const oldGlobalAudio = /<button onClick=\{toggleFullscreen\} className="outline">Fullscreen<\/button>\n\s*<\/div>\n\s*\{micIsRunning/;

const newGlobalAudio = `<button onClick={toggleFullscreen} className="outline">Fullscreen</button>
            </div>
            
            <div style={{ marginTop: '1.5rem', marginBottom: '1rem', borderTop: '1px dashed #333', paddingTop: '1rem' }}>
              <strong style={{ opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem', display: 'block', marginBottom: '8px' }}>🚀 Global Post-FX (VJ Shaders)</strong>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  style={{ background: globalBlackout ? '#ff4444' : '#222', color: '#fff', border: '1px solid ' + (globalBlackout ? '#ff4444' : '#444'), padding: '12px' }}
                  onClick={() => setGlobalBlackout(p => !p)}
                >
                  {globalBlackout ? '⚫ BLACKOUT ACTIVE (SPACEBAR)' : '⚫ MASTER PANIC / BLACKOUT (SPACEBAR)'}
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      style={{ flex: 1, background: globalScanlines ? '#ffcc00' : '#222', color: globalScanlines ? '#000' : '#fff', border: '1px solid ' + (globalScanlines ? '#ffcc00' : '#444') }}
                      onClick={() => setGlobalScanlines(p => !p)}
                    >
                      📺 CRT Scanlines
                    </button>
                    
                    <button 
                      style={{ flex: 1, background: globalGlitch ? '#ffcc00' : '#222', color: globalGlitch ? '#000' : '#fff', border: '1px solid ' + (globalGlitch ? '#ffcc00' : '#444') }}
                      onClick={() => setGlobalGlitch(p => !p)}
                    >
                      ⚡ RGB Bass Glitch
                    </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', marginBottom: '1rem', borderTop: '1px dashed #333', paddingTop: '1rem' }}>
               <strong style={{ opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                   <span>⏱️ Tempo Sync (BPM)</span>
                   <span style={{ color: '#10b981' }}>{bpm} BPM</span>
               </strong>
               <button 
                    style={{ width: '100%', padding: '16px', background: '#111', color: '#10b981', border: '1px solid #10b981', fontSize: '1rem', fontWeight: 'bold' }}
                    onClick={handleTempoTap}
               >
                   TAP TEMPO
               </button>
            </div>

            {micIsRunning`;

c = c.replace(oldGlobalAudio, newGlobalAudio);

fs.writeFileSync('src/App.tsx', c);

