use std::path::PathBuf;
use anyhow::Result;

/// Initializes the app by ensuring the Zapcut directory structure exists in the user's Documents folder
pub fn initialize_app_directories() -> Result<PathBuf> {
    let documents_dir = get_documents_dir()?;
    let zapcut_dir = documents_dir.join("Zapcut");

    if !zapcut_dir.exists() {
        std::fs::create_dir_all(&zapcut_dir)?;
    }

    // Create subdirectories
    std::fs::create_dir_all(zapcut_dir.join("recordings"))?;
    std::fs::create_dir_all(zapcut_dir.join("exports"))?;
    std::fs::create_dir_all(zapcut_dir.join("thumbnails"))?;
    std::fs::create_dir_all(zapcut_dir.join("projects"))?;

    Ok(zapcut_dir)
}

/// Gets the recordings directory path
pub fn get_recordings_dir() -> Result<PathBuf> {
    let zapcut_dir = initialize_app_directories()?;
    Ok(zapcut_dir.join("recordings"))
}

/// Gets the exports directory path
#[allow(dead_code)]
pub fn get_exports_dir() -> Result<PathBuf> {
    let zapcut_dir = initialize_app_directories()?;
    Ok(zapcut_dir.join("exports"))
}

/// Gets the user's Documents directory
#[cfg(target_os = "macos")]
fn get_documents_dir() -> Result<PathBuf> {
    let home = dirs::home_dir().ok_or_else(|| anyhow::anyhow!("Could not determine home directory"))?;
    Ok(home.join("Documents"))
}

#[cfg(target_os = "windows")]
fn get_documents_dir() -> Result<PathBuf> {
    let documents = dirs::document_dir().ok_or_else(|| anyhow::anyhow!("Could not determine Documents directory"))?;
    Ok(documents)
}

#[cfg(target_os = "linux")]
fn get_documents_dir() -> Result<PathBuf> {
    let home = dirs::home_dir().ok_or_else(|| anyhow::anyhow!("Could not determine home directory"))?;
    Ok(home.join("Documents"))
}
