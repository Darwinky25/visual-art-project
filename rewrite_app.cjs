const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Remove the newbie title and subtitle
content = content.replace(
  /<h1>REALTIME DJ VISUALIZER<\/h1>[\s\S]*?<p[^>]*>.*?<\/p>/,
  ''
);

// 2. Add an `activeMenu` state
content = content.replace(
  /const \[activeLayerId, setActiveLayerId\] = useState<string>\(layers\[0\]\?\.id \|\| 'layer-1'\);/,
  "const [activeLayerId, setActiveLayerId] = useState<string>(layers[0]?.id || 'layer-1');\n  const [activeMenu, setActiveMenu] = useState<'source'|'layers'|'params'|'midi'>('params');"
);

// 3. Insert the Professional Menu Navigation
const menuNav = `
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', borderBottom: '1px solid #222', paddingBottom: '8px' }}>
            <button onClick={() => setActiveMenu('source')} style={{ flex: 1, padding: '4px 0', fontSize: '10px', background: activeMenu === 'source' ? 'var(--accent)' : '#111', color: activeMenu === 'source' ? '#000' : '#888', border: 'none' }}>SOURCE</button>
            <button onClick={() => setActiveMenu('layers')} style={{ flex: 1, padding: '4px 0', fontSize: '10px', background: activeMenu === 'layers' ? 'var(--accent)' : '#111', color: activeMenu === 'layers' ? '#000' : '#888', border: 'none' }}>LAYERS</button>
            <button onClick={() => setActiveMenu('params')} style={{ flex: 1, padding: '4px 0', fontSize: '10px', background: activeMenu === 'params' ? 'var(--accent)' : '#111', color: activeMenu === 'params' ? '#000' : '#888', border: 'none' }}>PARAMS</button>
            <button onClick={() => setActiveMenu('midi')} style={{ flex: 1, padding: '4px 0', fontSize: '10px', background: activeMenu === 'midi' ? 'var(--accent)' : '#111', color: activeMenu === 'midi' ? '#000' : '#888', border: 'none' }}>MIDI</button>
          </div>
`;
content = content.replace(
  /<aside className="panel controls glass"[^>]*>/,
  (match) => match + '\n' + menuNav
);

// Now wrap the Source section 
content = content.replace(
  /\<div className="card"\>(\s*<div className="flex gap-2 mt"[\s\S]*?\{webcamIsRunning[^>]*>\s*<\/div>)/,
  "{activeMenu === 'source' && (\n          <div className=\"card\">\n$1<div className=\"flex space-between mt\">\n                <button onClick={() => {\n                  localStorage.setItem('visualizer_layers', JSON.stringify(layers));\n                  localStorage.setItem('visualizer_sensitivity', sensitivity.toString());\n                  alert('Settings saved locally!');\n                }} style={{ background: '#10b981', color: 'white', border: 'none' }}>\n                  Save Settings\n                </button>\n                <button onClick={toggleFullscreen} className=\"outline\">Fullscreen</button>\n              </div>"
);

// We need a precise replacement. Wait, writing regex for JSX is notoriously error-prone. 
// A better way is to read the file, identify line ranges using `head` and `tail`, and stitch them together.
