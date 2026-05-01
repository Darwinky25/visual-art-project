const { app, BrowserWindow, desktopCapturer, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let kinectServer = null;

// Start Kinect server
function startKinectServer() {
  const serverPath = path.join(__dirname, '..', 'scripts', 'servers');
  
  // Try Python first
  kinectServer = spawn('python3', [path.join(serverPath, 'kinect_server.py')]);
  
  kinectServer.on('error', (err) => {
    console.log('Python3 failed, trying python:', err.message);
    kinectServer = spawn('python', [path.join(serverPath, 'kinect_server.py')]);
    
    kinectServer.on('error', (err2) => {
      console.log('Python failed, trying Node.js:', err2.message);
      kinectServer = spawn('node', [path.join(serverPath, 'kinect_server.js')]);
      
      kinectServer.on('error', (err3) => {
        console.error('Failed to start Kinect server:', err3.message);
      });
    });
  });

  if (kinectServer) {
    kinectServer.stdout?.on('data', (data) => {
      console.log(`Kinect server: ${data}`);
    });

    kinectServer.stderr?.on('data', (data) => {
      console.error(`Kinect server error: ${data}`);
    });

    console.log('Kinect server started');
  }
}

// Stop Kinect server
function stopKinectServer() {
  if (kinectServer) {
    kinectServer.kill();
    kinectServer = null;
    console.log('Kinect server stopped');
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.cjs'),
      // Allow media devices
      webSecurity: true,
    },
    title: 'Visual Console',
    center: true,
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Grant media permissions
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'microphone', 'camera', 'midi', 'midiSysex'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Handle desktop capturer for system audio
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    return permission === 'media';
  });
}

// IPC handler to get desktop sources for system audio capture
ipcMain.handle('get-desktop-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 150, height: 150 }
    });
    return sources;
  } catch (error) {
    console.error('Error getting desktop sources:', error);
    return [];
  }
});

app.whenReady().then(() => {
  createWindow();
  startKinectServer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopKinectServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopKinectServer();
});

// Made with Bob
