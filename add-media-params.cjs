const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

const mediaReactivityHTML = `{activeLayer.type === 'media' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <strong style={{ opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}>Media Reactivity</strong>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Audio Size Impact (Pump): {settings.mediaAudioImpact?.toFixed(2)}</label>
                        <input type="range" min="0" max="2" step="0.1" value={settings.mediaAudioImpact || 0} onChange={(e) => setSettings({...settings, mediaAudioImpact: parseFloat(e.target.value)})} style={{ width: '100%', accentColor: '#ffcc00' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" id="mediaInvert" checked={settings.mediaInvertDrop || false} onChange={(e) => setSettings({...settings, mediaInvertDrop: e.target.checked})} style={{ accentColor: '#ffcc00' }} />
                        <label htmlFor="mediaInvert" style={{ color: '#fff' }}>Invert Action (Drop/Blackout on Beat)</label>
                      </div>
                    </div>
                  </>
                )}

                {activeLayer.type === 'webcamAscii' && (`;

c = c.replace(/\{activeLayer\.type === 'webcamAscii' && \(/, mediaReactivityHTML);

fs.writeFileSync('src/App.tsx', c);
