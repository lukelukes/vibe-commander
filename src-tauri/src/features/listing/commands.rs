use crate::shared::{AppError, FileEntry};

#[tauri::command]
#[specta::specta]
pub fn list_directory(_path: &str) -> Result<Vec<FileEntry>, AppError> {
    Ok(vec![])
}
