const fs = require('fs');
let c = fs.readFileSync('src/visualizer/drawVisualizer.ts', 'utf8');

c = c.replace(
  /export type VisualSettings = \{/,
  `export type VisualSettings = {
  mediaAudioImpact?: number;
  mediaInvertDrop?: false;`
);
fs.writeFileSync('src/visualizer/drawVisualizer.ts', c);

let c2 = fs.readFileSync('src/App.tsx', 'utf8');
c2 = c2.replace(
  /const defaultSettings: VisualSettings = \{/,
  `const defaultSettings: VisualSettings = {
  mediaAudioImpact: 0.0,
  mediaInvertDrop: false,`
);
fs.writeFileSync('src/App.tsx', c2);

