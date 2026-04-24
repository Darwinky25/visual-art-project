const fs = require('fs');
let content = fs.readFileSync('src/visualizer/drawVisualizer.ts', 'utf8');

// The issue: We are evaluating `settings.kinectX` inside the loop 2400 times per frame!
// Specifically these lines:
const anchor = `      // 3D KINECT HOLOGRAPHIC OVERLAP MAGIC
      if (options.kinectDepthFrame) {
         // UI Size Settings
         const doMirror = settings.kinectMirror !== undefined ? settings.kinectMirror : true;
         const offsetX = settings.kinectOffsetX !== undefined ? settings.kinectOffsetX : 0;
         const offsetY = settings.kinectOffsetY !== undefined ? settings.kinectOffsetY : 0;
         const zoom = settings.kinectZoom !== undefined ? settings.kinectZoom : 1.0;
         
         const cropL = settings.kinectCropLeft !== undefined ? settings.kinectCropLeft : 0.0;
         const cropR = settings.kinectCropRight !== undefined ? settings.kinectCropRight : 1.0;
         const cropT = settings.kinectCropTop !== undefined ? settings.kinectCropTop : 0.0;
         const cropB = settings.kinectCropBottom !== undefined ? settings.kinectCropBottom : 1.0;`;

// We should pull them OUT of the loop!
