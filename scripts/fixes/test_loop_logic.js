const fs = require('fs');
let content = fs.readFileSync('src/visualizer/drawVisualizer.ts', 'utf8');

// We want to verify how many times ctx is called
let m = 0;
// We can use RegExp logic just to dry-run or find slow areas
