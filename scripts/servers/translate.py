import re

with open('src/App.tsx', 'r') as f:
    text = f.read()

# Kinect 3D Calibration
text = text.replace('Sensor Jarak Dekat (Min):', 'Near Sensor Distance (Min):')
text = text.replace('Sensor Tembok / Jauh (Max):', 'Far Sensor/Wall Distance (Max):')
text = text.replace('Tarikan Tonjolan Tengah Layar (Y-Pull):', 'Center Mesh Protrusion (Y-Pull):')
text = text.replace('Daya Dobrak Huruf (Skala Teks):', 'Particle Deformation Force (Text Scale):')
text = text.replace('Posisi Motor Leher (Naik / Turun):', 'Motor Tilt Position (Up / Down):')
text = text.replace('Kecepatan Bayangan Memori Air:', 'Fluid Memory Delay Speed:')
text = text.replace('Cahaya Putih (Glow) Badan:', 'Body Emission Glow:')
text = text.replace('Distorsi Bentuk Samping (Radial):', 'Radial Edge Distortion:')
text = text.replace('Balik / Mirror Kamera (Sisi Kiri Kanan)', 'Mirror Camera (Horizontal Flip)')

# 3D Parallax / Sway
text = text.replace('Kuat Ayunan 3D Kiri-Kanan:', '3D Parallax Sway Amplitude:')
text = text.replace('Kecepatan Ayun Parallax:', 'Parallax Sway Speed:')

# Position & Crop
text = text.replace('Zoom Ukuran (Skala):', 'Camera Zoom Scale:')
text = text.replace('Geser Horizontal (X):', 'Horizontal Offset (X):')
text = text.replace('Geser Vertikal (Y):', 'Vertical Offset (Y):')
text = text.replace('Potong Kiri:', 'Crop Left:')
text = text.replace('Potong Kanan:', 'Crop Right:')
text = text.replace('Potong Atas:', 'Crop Top:')
text = text.replace('Potong Bawah:', 'Crop Bottom:')

with open('src/App.tsx', 'w') as f:
    f.write(text)
