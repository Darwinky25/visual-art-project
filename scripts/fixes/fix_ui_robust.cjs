const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Find where {layers.map starts and the following </div>))} ends
const match = /\{\s*layers\.map\(layer => \([\s\S]*?<\/div>\s*\)\)\s*\}/;
content = content.replace(match, `{layers.map(layer => (
               <div key={layer.id} 
                    style={{ display: 'flex', flexDirection: 'column', marginTop: '8px', padding: '10px', background: layer.id === activeLayer?.id ? '#252525' : '#111', borderRadius: '6px', border: layer.id === activeLayer?.id ? '1px solid #ffcc00' : '1px solid #333', transition: 'all 0.2s ease', cursor: 'pointer' }}
                    onClick={() => setActiveLayerId(layer.id)}
               >
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <div 
                     onClick={(e) => {
                       e.stopPropagation();
                       setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, enabled: !l.enabled } : l));
                     }}
                     style={{ width: '12px', height: '12px', borderRadius: '4px', background: layer.enabled ? '#ffcc00' : '#444', border: '1px solid #000', cursor: 'pointer', flexShrink: 0 }}
                     title={layer.enabled ? "Visible" : "Hidden"}
                   />
                   <span style={{ flex: 1, fontSize: '0.85rem', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: layer.id === activeLayer?.id ? 700 : 500, color: layer.id === activeLayer?.id ? '#fff' : '#aaa' }}>
                     {layer.type === 'audio2d' ? 'Audio 2D' : layer.type === 'webcamAscii' ? 'Webcam ASCII' : layer.type === 'kinect3d' ? 'Kinect 3D' : 'Media / BG'}
                   </span>
                   <button className="outline" style={{ padding: '4px 8px', fontSize: '9px', background: 'transparent', borderColor: '#444', color: '#ff4444' }} onClick={(e) => {
                     e.stopPropagation();
                     setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, mediaUrl: undefined } : l));
                     setLayers(prev => prev.filter(l => l.id !== layer.id));
                     if (activeLayerId === layer.id) setActiveLayerId(layers[0]?.id || '');
                   }}>✖</button>
                 </div>
                 
                 {layer.type === 'media' && layer.id === activeLayer?.id && (
                   <div style={{ marginTop: '12px', padding: '16px', background: '#0a0a0a', borderRadius: '6px', border: '1px dashed #666', textAlign: 'center', transition: 'border 0.2s' }}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#ffcc00'; }}
                        onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#666'; }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.style.borderColor = '#666';
                          const file = e.dataTransfer.files?.[0];
                          if (file && (file.type.startsWith('video/') || file.type.startsWith('image/'))) {
                            const url = URL.createObjectURL(file);
                            const type = file.type.startsWith('video') ? 'video' : 'image';
                            setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, mediaUrl: url, mediaType: type } : l));
                          }
                        }}
                   >
                     {layer.mediaUrl ? (
                         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                             <span style={{ fontSize: '0.75rem', color: '#ffcc00', marginBottom: '8px' }}>✓ MEDIA LOADED</span>
                             <button className="outline" style={{ fontSize: '0.7rem', padding: '6px 12px' }} onClick={(e) => {
                                 e.stopPropagation();
                                 document.getElementById('file-upload-' + layer.id)?.click();
                             }}>CHANGE FILE</button>
                         </div>
                     ) : (
                         <>
                           <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '8px' }}>Drop Video/Image or</span>
                           <button className="outline" style={{ fontSize: '0.7rem', padding: '6px 12px', border: '1px solid #ffcc00', color: '#ffcc00' }} onClick={(e) => {
                               e.stopPropagation();
                               document.getElementById('file-upload-' + layer.id)?.click();
                           }}>BROWSE FILE</button>
                         </>
                     )}
                     <input 
                       id={'file-upload-' + layer.id}
                       type="file" 
                       accept="video/*,image/*" 
                       style={{ display: 'none' }}
                       onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file) {
                           const url = URL.createObjectURL(file);
                           const type = file.type.startsWith('video') ? 'video' : 'image';
                           setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, mediaUrl: url, mediaType: type } : l));
                         }
                       }}
                     />
                   </div>
                 )}
               </div>
             ))}`);

const removeOldMediaInput = /<div style=\{\{ display: 'flex', flexDirection: 'column', gap: '0\.6rem' \}\}>\s*<strong style=\{\{ opacity: 0\.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0\.65rem' \}\}>Media Source<\/strong>[\s\S]*?<\/div>\s*<\/div>/;
content = content.replace(removeOldMediaInput, "");

fs.writeFileSync('src/App.tsx', content);
