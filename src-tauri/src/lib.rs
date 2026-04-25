mod kinect_server;

use tauri::Manager;
use kinect_server::{KinectServerState, start_kinect_server, stop_kinect_server, kinect_server_status, restart_kinect_server};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // Initialize Kinect server state
  let kinect_state = KinectServerState::new();

  tauri::Builder::default()
    .manage(kinect_state)
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
      restart_kinect_server
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
