const WebSocket = require('ws');
let freenect;

try {
  freenect = require('freenect');
} catch (e) {
  console.error("Oops! Modul 'freenect' belum terinstall atau driver gagal dimuat.");
  console.error("Jalankan: brew install libfreenect");
  console.error("Lalu: npm install freenect ws");
  process.exit(1);
}

const wss = new WebSocket.Server({ port: 8080 });
console.log("Kinect Bridge Server berjalan di ws://localhost:8080");

let clients = [];

wss.on('connection', (ws) => {
  console.log("Visualizer Frontend Connected!");
  clients.push(ws);
  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
  });
});

const kinect = new freenect.Kinect();

if (kinect.init()) {
  console.log("Kinect V1 Terdeteksi. Mulai streaming depth...");
  kinect.startDepth();
  
  // Mengirim data depth (kedalaman)
  kinect.on('depth', (depthBuffer) => {
    if (clients.length === 0) return;
    
    // Resolusi asli Kinect V1 adalah 640x480. 
    // Kita downsample menjadi 160x120 agar WebSocket tidak berat (menghemat bandwidth)
    const width = 640;
    const height = 480;
    const downsample = 4; 
    const newWidth = width / downsample;
    const newHeight = height / downsample;
    
    const smallBuffer = new Uint8Array(newWidth * newHeight);
    
    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        // freenect mengembalikan data 11-bit (0-2047) di dalam buffer 16-bit
        const srcX = x * downsample;
        const srcY = y * downsample;
        const idx = (srcY * width + srcX) * 2;
        
        // Ambil byte dan normalkan ke 0-255 (Uint8) untuk dikirim via WebSocket
        const highByte = depthBuffer[idx + 1];
        smallBuffer[y * newWidth + x] = highByte; 
      }
    }
    
    clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(smallBuffer);
      }
    });
  });
} else {
  console.error("Gagal inisialisasi Kinect. Pastikan USB sudah dicolok dan power adapter menyala.");
}
