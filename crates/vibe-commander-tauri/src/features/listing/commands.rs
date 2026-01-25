use std::path::PathBuf;
use tauri_plugin_opener::OpenerExt;
use vibe_commander_core::{listing, AppError, FileEntry, OpenFailedReason};

#[tauri::command]
#[specta::specta]
pub fn list_directory(path: &str) -> Result<Vec<FileEntry>, AppError> {
    listing::list_directory(path)
}

#[tauri::command]
#[specta::specta]
pub fn get_initial_directory() -> Result<PathBuf, AppError> {
    listing::get_initial_directory()
}

#[allow(clippy::needless_pass_by_value)]
#[tauri::command]
#[specta::specta]
pub fn open_file(path: &str, app: tauri::AppHandle) -> Result<(), AppError> {
    app.opener()
        .open_path(path, None::<&str>)
        .map_err(|e| AppError::OpenFailed {
            path: PathBuf::from(path),
            reason: OpenFailedReason::from_error(&e.to_string()),
        })
}
