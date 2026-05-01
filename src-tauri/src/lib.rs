mod kinect_server;
mod audio_capture;

use tauri::Manager;
use kinect_server::{KinectServerState, start_kinect_server, stop_kinect_server, kinect_server_status, restart_kinect_server};
use audio_capture::{AudioCaptureState, list_audio_devices, start_audio_capture, stop_audio_capture, audio_capture_status};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // Initialize state
  let kinect_state = KinectServerState::new();
  let audio_state = AudioCaptureState::new();

  tauri::Builder::default()
    .manage(kinect_state)
    .manage(audio_state)
    .setup(|app| {
      // Setup logging
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      // Auto-start Kinect server on app launch
      let app_handle = app.handle().clone();
      tauri::async_runtime::spawn(async move {
        if let Some(state) = app_handle.try_state::<KinectServerState>() {
          match start_kinect_server(state).await {
            Ok(msg) => log::info!("Kinect auto-start: {}", msg),
            Err(e) => log::warn!("Kinect auto-start failed (this is OK if Kinect is not connected): {}", e),
          }
        }
      });
      
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      start_kinect_server,
      stop_kinect_server,
      kinect_server_status,
      restart_kinect_server,
      list_audio_devices,
      start_audio_capture,
      stop_audio_capture,
      audio_capture_status
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
