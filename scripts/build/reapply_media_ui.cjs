const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace(
  /setActiveLayerId\(newId\);\n\s*startKinect\(\);\n\s*\}\}>\+ Kinect 3D<\/button>\n\s*<\/div>/,
  `setActiveLayerId(newId);
                    startKinect();
                  }}>+ KINECT 3D</button>
                  <button className="outline" style={{ border: '1px solid #ffcc00', color: '#ffcc00' }} onClick={() => {
                    const newId = \`layer-\${Date.now()}\`;
                    setLayers(prev => [...prev, { id: newId, type: 'media', enabled: true, settings: { ...defaultSettings, visualizationMode: 'audio2d' }, opacity: 1.0, blendMode: 'screen' }]);
                    setActiveLayerId(newId);
                  }}>+ MEDIA BG</button>
             </div>`
);

// Update upper-case text if needed
c = c.replace(
  /\{layer\.type === 'audio2d' \? 'Audio 2D' : 'Webcam ASCII'\} \(\{layer\.id\}\)/,
  "{layer.type === 'audio2d' ? 'Audio 2D' : layer.type === 'webcamAscii' ? 'Webcam ASCII' : layer.type === 'kinect3d' ? 'Kinect 3D' : 'Media / BG'} ({layer.id})"
);

const filePickerUI = `
                {activeLayer.type === 'media' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <strong style={{ opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}>Media Source</strong>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.2rem', color: '#fff' }}>Upload Video / Image:</label>
                      <input 
                        type="file" 
                        accept="video/*,image/*" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            const type = file.type.startsWith('video') ? 'video' : 'image';
                            setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, mediaUrl: url, mediaType: type } : l));
                          }
                        }}
                        style={{ width: '100%', padding: '4px', background: '#333', color: 'white', border: 'none', borderRadius: '4px' }}
                      />
                    </div>
                  </div>
                )}
`;

c = c.replace(
  /\{activeLayer\.type === 'webcamAscii'/g,
  filePickerUI + "\n                {activeLayer.type === 'webcamAscii'"
);

fs.writeFileSync('src/App.tsx', c);
