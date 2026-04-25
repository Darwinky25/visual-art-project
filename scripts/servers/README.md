# Kinect Server Scripts

This directory contains server implementations for Kinect depth sensor integration.

## Available Servers

### Python Server (`kinect_server.py`)
- **Requirements:** `freenect`, `websockets`, `numpy`
- **Port:** 8765
- **Features:** Configurable downsampling, tilt control, LED control

### Node.js Server (`kinect_server.js`)
- **Requirements:** `freenect`, `ws`
- **Port:** 8080
- **Features:** Real-time depth streaming, downsampling

### Translation Script (`translate.py`)
- Utility script for translations

## Auto-Start

The Tauri application automatically starts the appropriate Kinect server when launched. No manual server startup is required.

## Manual Usage

If you need to run the server manually:

```bash
# Python server
python3 kinect_server.py

# Node.js server
node kinect_server.js
```

## Configuration

Server configuration can be adjusted in the respective script files. See inline comments for available options.