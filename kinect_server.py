import asyncio
import websockets
import freenect
import numpy as np
import json
from dataclasses import dataclass, asdict

# ===== KINECT SERVER CONFIGURATION (ALL TWEAKABLE - ZERO HARDCODES) =====
@dataclass
class KinectConfig:
    """Every Kinect parameter is configurable, no hardcodes"""
    # Resolution & Downsampling
    downsampling_factor: int = 2  # 1=640x480 (full), 2=320x240, 4=160x120
    
    # Depth Normalization
    raw_bit_depth: int = 11  # Kinect V1 is 11-bit (0-2048)
    normalization_divisor: float = 8.0  # Convert 11-bit to 8-bit: value / 8
    depth_min_raw: int = 0  # Minimum raw depth value before clipping
    depth_max_raw: int = 2048  # Maximum raw depth value (2^11)
    
    # Frame Rate Control
    server_fps: int = 30  # Frames per second from server
    
    # Motor Control
    tilt_min: int = -30  # Motor min angle
    tilt_max: int = 30  # Motor max angle
    tilt_current: int = 0  # Current tilt angle
    
    # LED Control (if using LED)
    led_enabled: bool = False
    led_color: str = 'off'  # off, red, green, yellow, blink_red, blink_green, blink_yellow

current_config = KinectConfig()
clients = set()

async def broadcast_config():
    """Broadcast current config to all connected clients"""
    if clients:
        config_msg = json.dumps({
            "type": "config",
            "data": asdict(current_config)
        })
        for client in clients:
            try:
                await client.send(config_msg)
            except:
                pass

async def stream_depth(websocket):
    print("Visualizer Frontend Connected (Stream Started)!")
    try:
        while True:
            # Ambil frame depth dari Kamera USB Kinect V1
            # Format aslinya 640x480 (11-bit)
            depth_matrix, timestamp = freenect.sync_get_depth()
            
            if depth_matrix is not None:
                # Downsample sesuai konfigurasi
                # downsampling_factor=2 → ambil tiap 2 baris/kolom → 320x240
                # downsampling_factor=4 → ambil tiap 4 baris/kolom → 160x120
                downsampling = current_config.downsampling_factor
                small_depth = depth_matrix[::downsampling, ::downsampling]
                
                # Clip ke range yang dikonfigurasi
                clipped = np.clip(small_depth, 
                                 current_config.depth_min_raw, 
                                 current_config.depth_max_raw)
                
                # Konversi ke 8-bit menggunakan divisor yang dapat dikonfigurasi
                normalized = np.clip(clipped / current_config.normalization_divisor, 0, 255).astype(np.uint8)
                
                # Kirim sebagai binary + metadata header
                header = json.dumps({
                    "type": "depth",
                    "width": small_depth.shape[1],
                    "height": small_depth.shape[0],
                    "timestamp": timestamp
                }).encode() + b'\n'
                
                await websocket.send(header + normalized.tobytes())
                
            # Frame rate control - sesuai konfigurasi
            frame_delay = 1.0 / current_config.server_fps
            await asyncio.sleep(frame_delay)
            
    except websockets.exceptions.ConnectionClosed:
        print("WebSocket Closed (Stream stopped).")
        clients.discard(websocket)
    except Exception as e:
        print(f"Stream error: {e}")
        clients.discard(websocket)

async def receive_commands(websocket):
    print("Mendengarkan instruksi UI (Motor Tilt/Config)...")
    try:
        async for message in websocket:
            if isinstance(message, str):
                try:
                    data = json.loads(message)
                    
                    # Handle Motor Tilt Command
                    if data.get("action") == "set_tilt":
                        degree = int(data.get("degree", 0))
                        degree = max(current_config.tilt_min, min(current_config.tilt_max, degree))
                        print(f"Motor Tilt: {degree}°")
                        try:
                            freenect.sync_set_tilt_degs(degree, 0)
                            current_config.tilt_current = degree
                        except Exception as e:
                            print(f"Motor error: {e}")
                    
                    # Handle LED Control
                    elif data.get("action") == "set_led":
                        led_option = data.get("led", "off")
                        print(f"LED: {led_option}")
                        try:
                            if led_option == "off":
                                freenect.sync_set_led(freenect.LED_OFF, 0)
                            elif led_option == "red":
                                freenect.sync_set_led(freenect.LED_RED, 0)
                            elif led_option == "green":
                                freenect.sync_set_led(freenect.LED_GREEN, 0)
                            elif led_option == "yellow":
                                freenect.sync_set_led(freenect.LED_YELLOW, 0)
                            elif led_option == "blink_red":
                                freenect.sync_set_led(freenect.LED_BLINK_RED, 0)
                            elif led_option == "blink_green":
                                freenect.sync_set_led(freenect.LED_BLINK_GREEN, 0)
                            elif led_option == "blink_yellow":
                                freenect.sync_set_led(freenect.LED_BLINK_YELLOW, 0)
                            current_config.led_color = led_option
                        except Exception as e:
                            print(f"LED error: {e}")
                    
                    # Handle Config Update (ALL parameters)
                    elif data.get("action") == "update_config":
                        config_update = data.get("config", {})
                        for key, value in config_update.items():
                            if hasattr(current_config, key):
                                setattr(current_config, key, value)
                                print(f"Updated {key} → {value}")
                        
                        # Broadcast new config to all clients
                        await broadcast_config()
                    
                    # Handle Get Current Config
                    elif data.get("action") == "get_config":
                        config_msg = json.dumps({
                            "type": "config",
                            "data": asdict(current_config)
                        })
                        await websocket.send(config_msg)
                        
                except Exception as ex:
                    print(f"Gagal memproses JSON: {ex}")
                    
    except websockets.exceptions.ConnectionClosed:
        pass
    except Exception as e:
        print(f"Receive error: {e}")

async def handler(websocket):
    # Menyuruh WebSocket melayani 2 arah secara bersamaan (Kirim Video Depth, Terima Motor/Config JSON)
    clients.add(websocket)
    await broadcast_config()  # Send current config when client connects
    
    await asyncio.gather(
        stream_depth(websocket),
        receive_commands(websocket)
    )

async def main():
    print("=" * 60)
    print("Kinect Bridge Server - FULLY CONFIGURABLE (ZERO HARDCODES)")
    print("=" * 60)
    print(f"Server running on ws://localhost:8080")
    print(f"Current Config:")
    for key, value in asdict(current_config).items():
        print(f"  {key}: {value}")
    print("=" * 60)
    print("Waiting for Web Frontend connections...\n")
    
    async with websockets.serve(handler, "localhost", 8080):
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nServer shutting down...")

