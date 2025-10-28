use std::path::PathBuf;
use anyhow::Result;

/// Initializes the app by ensuring the Zapcut directory exists in the user's Documents folder
pub fn initialize_app_directories() -> Result<PathBuf> {
    let documents_dir = get_documents_dir()?;
    let zapcut_dir = documents_dir.join("Zapcut");

    if !zapcut_dir.exists() {
        std::fs::create_dir_all(&zapcut_dir)?;
    }

    Ok(zapcut_dir)
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
