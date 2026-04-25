use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use tauri::State;

/// State management for Kinect server subprocess
pub struct KinectServerState {
    process: Arc<Mutex<Option<Child>>>,
}

impl KinectServerState {
    pub fn new() -> Self {
        Self {
            process: Arc::new(Mutex::new(None)),
        }
    }
}

/// Start the Kinect server subprocess
/// Tries Python server first, falls back to Node.js server
#[tauri::command]
pub async fn start_kinect_server(state: State<'_, KinectServerState>) -> Result<String, String> {
    let mut process_lock = state.process.lock().unwrap();
    
    // Check if server is already running
    if process_lock.is_some() {
        return Ok("Kinect server already running".to_string());
    }

    // Try to start Python server first
    let child = Command::new("python3")
        .arg("scripts/servers/kinect_server.py")
        .spawn()
        .or_else(|_| {
            // Fallback to python (without 3)
            Command::new("python")
                .arg("scripts/servers/kinect_server.py")
                .spawn()
        })
        .or_else(|_| {
            // Fallback to Node.js server
            Command::new("node")
                .arg("scripts/servers/kinect_server.js")
                .spawn()
        })
        .map_err(|e| {
            format!(
                "Failed to start Kinect server. Ensure Python 3 or Node.js is installed and Kinect drivers are available. Error: {}",
                e
            )
        })?;

    *process_lock = Some(child);
    log::info!("Kinect server started successfully");
    Ok("Kinect server started successfully".to_string())
}

/// Stop the Kinect server subprocess
#[tauri::command]
pub async fn stop_kinect_server(state: State<'_, KinectServerState>) -> Result<String, String> {
    let mut process_lock = state.process.lock().unwrap();
    
    if let Some(mut child) = process_lock.take() {
        child.kill().map_err(|e| format!("Failed to stop Kinect server: {}", e))?;
        log::info!("Kinect server stopped");
        Ok("Kinect server stopped successfully".to_string())
    } else {
        Ok("Kinect server was not running".to_string())
    }
}

/// Check if Kinect server is currently running
#[tauri::command]
pub async fn kinect_server_status(state: State<'_, KinectServerState>) -> Result<bool, String> {
    let process_lock = state.process.lock().unwrap();
    Ok(process_lock.is_some())
}

/// Restart the Kinect server
#[tauri::command]
pub async fn restart_kinect_server(state: State<'_, KinectServerState>) -> Result<String, String> {
    // Stop if running
    let _ = stop_kinect_server(state.clone()).await;
    
    // Wait a moment for cleanup
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    
    // Start again
    start_kinect_server(state).await
}

// Made with Bob
