use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, Stream, StreamConfig};
use ringbuf::{HeapRb, HeapProducer};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

const BUFFER_SIZE: usize = 2048;
const SAMPLE_RATE: u32 = 48000;

/// State management for audio capture
pub struct AudioCaptureState {
    stream: Arc<Mutex<Option<Stream>>>,
    producer: Arc<Mutex<Option<HeapProducer<f32>>>>,
    device_name: Arc<Mutex<String>>,
}

impl AudioCaptureState {
    pub fn new() -> Self {
        Self {
            stream: Arc::new(Mutex::new(None)),
            producer: Arc::new(Mutex::new(None)),
            device_name: Arc::new(Mutex::new(String::new())),
        }
    }
}

/// List available audio input devices
#[tauri::command]
pub async fn list_audio_devices() -> Result<Vec<String>, String> {
    let host = cpal::default_host();
    let devices = host
        .input_devices()
        .map_err(|e| format!("Failed to get input devices: {}", e))?;

    let mut device_names = Vec::new();
    for device in devices {
        if let Ok(name) = device.name() {
            device_names.push(name);
        }
    }

    Ok(device_names)
}

/// Start audio capture from specified device
#[tauri::command]
pub async fn start_audio_capture(
    device_name: Option<String>,
    state: State<'_, AudioCaptureState>,
    app_handle: AppHandle,
) -> Result<String, String> {
    // Stop existing stream if any
    stop_audio_capture(state.inner().clone()).await?;

    let host = cpal::default_host();
    
    // Get the device
    let device: Device = if let Some(name) = device_name.clone() {
        host.input_devices()
            .map_err(|e| format!("Failed to get input devices: {}", e))?
            .find(|d| d.name().ok() == Some(name.clone()))
            .ok_or_else(|| format!("Device '{}' not found", name))?
    } else {
        host.default_input_device()
            .ok_or_else(|| "No default input device available".to_string())?
    };

    let device_name_str = device.name().unwrap_or_else(|_| "Unknown".to_string());
    *state.device_name.lock().unwrap() = device_name_str.clone();

    // Configure stream
    let config = StreamConfig {
        channels: 1,
        sample_rate: cpal::SampleRate(SAMPLE_RATE),
        buffer_size: cpal::BufferSize::Fixed(BUFFER_SIZE as u32),
    };

    // Create ring buffer for audio data
    let ring = HeapRb::<f32>::new(BUFFER_SIZE * 10);
    let (mut producer, mut consumer) = ring.split();

    // Store producer in state
    *state.producer.lock().unwrap() = Some(producer.clone());

    // Build input stream
    let stream = device
        .build_input_stream(
            &config,
            move |data: &[f32], _: &cpal::InputCallbackInfo| {
                // Write audio data to ring buffer
                for &sample in data {
                    let _ = producer.try_push(sample);
                }
            },
            move |err| {
                eprintln!("Audio stream error: {}", err);
            },
            None,
        )
        .map_err(|e| format!("Failed to build input stream: {}", e))?;

    // Start the stream
    stream
        .play()
        .map_err(|e| format!("Failed to start stream: {}", e))?;

    // Store stream in state
    *state.stream.lock().unwrap() = Some(stream);

    // Spawn task to emit audio data to frontend
    let app_handle_clone = app_handle.clone();
    tokio::spawn(async move {
        let mut buffer = vec![0.0f32; BUFFER_SIZE];
        loop {
            tokio::time::sleep(tokio::time::Duration::from_millis(20)).await;
            
            // Read from ring buffer
            let mut samples_read = 0;
            while samples_read < BUFFER_SIZE {
                if let Some(sample) = consumer.try_pop() {
                    buffer[samples_read] = sample;
                    samples_read += 1;
                } else {
                    break;
                }
            }

            if samples_read > 0 {
                // Emit audio data to frontend
                let _ = app_handle_clone.emit("audio-data", &buffer[..samples_read]);
            }
        }
    });

    Ok(format!("Audio capture started on device: {}", device_name_str))
}

/// Stop audio capture
#[tauri::command]
pub async fn stop_audio_capture(state: State<'_, AudioCaptureState>) -> Result<String, String> {
    let mut stream_lock = state.stream.lock().unwrap();
    if let Some(stream) = stream_lock.take() {
        drop(stream);
    }

    let mut producer_lock = state.producer.lock().unwrap();
    *producer_lock = None;

    Ok("Audio capture stopped".to_string())
}

/// Get current audio capture status
#[tauri::command]
pub async fn audio_capture_status(state: State<'_, AudioCaptureState>) -> Result<String, String> {
    let stream_lock = state.stream.lock().unwrap();
    let device_name = state.device_name.lock().unwrap();
    
    if stream_lock.is_some() {
        Ok(format!("Capturing from: {}", device_name))
    } else {
        Ok("Not capturing".to_string())
    }
}

// Made with Bob
