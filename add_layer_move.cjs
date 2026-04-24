const fs = require('fs');

let c = fs.readFileSync('src/App.tsx', 'utf8');

const oldRemoveButton = /<button className="outline" style=\{\{ padding: '4px 8px', fontSize: '9px', background: 'transparent', borderColor: '#444', color: '#ff4444' \}\} onClick=\{\(e\) => \{[\s\S]*?\}\}>✖<\/button>/;

const newButtons = `<div style={{ display: 'flex', gap: '4px' }}>
                     <button className="outline" title="Move Up" style={{ padding: '2px 6px', fontSize: '10px', background: '#222', borderColor: '#444', color: '#fff' }} onClick={(e) => {
                       e.stopPropagation();
                       const idx = layers.findIndex(l => l.id === layer.id);
                       if (idx > 0) {
                         setLayers(prev => {
                           const copy = [...prev];
                           const temp = copy[idx-1];
                           copy[idx-1] = copy[idx];
                           copy[idx] = temp;
                           return copy;
                         });
                       }
                     }}>↑</button>
                     <button className="outline" title="Move Down" style={{ padding: '2px 6px', fontSize: '10px', background: '#222', borderColor: '#444', color: '#fff' }} onClick={(e) => {
                       e.stopPropagation();
                       const idx = layers.findIndex(l => l.id === layer.id);
                       if (idx < layers.length - 1) {
                         setLayers(prev => {
                           const copy = [...prev];
                           const temp = copy[idx+1];
                           copy[idx+1] = copy[idx];
                           copy[idx] = temp;
                           return copy;
                         });
                       }
                     }}>↓</button>
                     <button className="outline" title="Delete" style={{ padding: '2px 6px', fontSize: '10px', background: '#222', borderColor: '#444', color: '#ff4444' }} onClick={(e) => {
                       e.stopPropagation();
                       setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, mediaUrl: undefined } : l));
                       setLayers(prev => prev.filter(l => l.id !== layer.id));
                       if (activeLayerId === layer.id) setActiveLayerId(layers[0]?.id || '');
                     }}>✖</button>
                   </div>`;

c = c.replace(oldRemoveButton, newButtons);

fs.writeFileSync('src/App.tsx', c);

