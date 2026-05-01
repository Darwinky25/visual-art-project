#!/bin/bash

echo "=== Kinect Diagnostic Tool ==="
echo ""

# Check if Kinect is connected
echo "1. Checking USB connection..."
if system_profiler SPUSBDataType 2>/dev/null | grep -i "xbox\|kinect" > /dev/null; then
    echo "✅ Kinect detected via USB"
else
    echo "❌ Kinect NOT detected via USB"
    echo "   → Check USB cable connection"
    echo "   → Try a different USB port"
fi
echo ""

# Check libfreenect
echo "2. Checking libfreenect installation..."
if command -v freenect-glview &> /dev/null; then
    echo "✅ libfreenect is installed"
else
    echo "❌ libfreenect NOT installed"
    echo "   → Run: brew install libfreenect"
fi
echo ""

# Check Python freenect module
echo "3. Checking Python freenect module..."
if python3 -c "import freenect" 2>/dev/null; then
    echo "✅ Python freenect module available"
else
    echo "❌ Python freenect module NOT available"
    echo "   → Run: pip3 install freenect"
fi
echo ""

# Check if port 8765 is in use
echo "4. Checking WebSocket port 8765..."
if lsof -i :8765 > /dev/null 2>&1; then
    echo "⚠️  Port 8765 is already in use"
    echo "   → Kill existing process: lsof -ti:8765 | xargs kill"
else
    echo "✅ Port 8765 is available"
fi
echo ""

# Try to start Kinect server
echo "5. Testing Kinect server startup..."
echo "   Starting server for 5 seconds..."
timeout 5 python3 scripts/servers/kinect_server.py 2>&1 | head -20 &
SERVER_PID=$!
sleep 2

if ps -p $SERVER_PID > /dev/null 2>&1; then
    echo "✅ Server started successfully"
    kill $SERVER_PID 2>/dev/null
else
    echo "❌ Server failed to start"
    echo "   → Check error messages above"
fi
echo ""

echo "=== Diagnostic Complete ==="
echo ""
echo "Next steps:"
echo "1. Fix any ❌ issues above"
echo "2. Run: python3 scripts/servers/kinect_server.py"
echo "3. Check for errors in terminal"
echo "4. If server runs, try the app again"
