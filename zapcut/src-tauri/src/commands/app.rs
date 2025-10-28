use tauri::command;
use crate::utils::app_init::initialize_app_directories;

#[command]
pub async fn init_app() -> Result<String, String> {
    match initialize_app_directories() {
        Ok(path) => Ok(path.to_string_lossy().to_string()),
        Err(e) => Err(format!("Failed to initialize app directories: {}", e)),
    }
}
