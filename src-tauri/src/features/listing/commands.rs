use crate::shared::{AppError, FileEntry};
use std::env;
use std::fs;
use std::path::PathBuf;
use std::time::UNIX_EPOCH;
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
#[specta::specta]
pub fn list_directory(path: &str) -> Result<Vec<FileEntry>, AppError> {
    let path = PathBuf::from(path);

    let read_dir = fs::read_dir(&path).map_err(|e| match e.kind() {
        std::io::ErrorKind::NotFound => AppError::NotFound { path: path.clone() },
        std::io::ErrorKind::PermissionDenied => AppError::PermissionDenied { path: path.clone() },
        _ => AppError::Io {
            message: e.to_string(),
            path: Some(path.clone()),
        },
    })?;

    let mut entries: Vec<FileEntry> = read_dir
        .filter_map(|entry| entry.ok())
        .map(|entry| build_file_entry(&entry))
        .collect();

    sort_entries(&mut entries);

    Ok(entries)
}

fn build_file_entry(entry: &fs::DirEntry) -> FileEntry {
    let name = entry.file_name().to_string_lossy().into_owned();
    let path = entry.path();

    let metadata = match entry.metadata() {
        Ok(m) => m,
        Err(e) => {
            return FileEntry::Unreadable {
                name,
                path,
                reason: e.to_string(),
            };
        }
    };

    let file_type = entry.file_type().ok();
    let is_symlink = file_type.map(|ft| ft.is_symlink()).unwrap_or(false);

    let modified = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs());

    if is_symlink {
        let target = fs::read_link(&path).unwrap_or_default();
        FileEntry::Symlink {
            name,
            path,
            size: metadata.len(),
            modified,
            target,
            target_is_dir: metadata.is_dir(),
        }
    } else if metadata.is_dir() {
        FileEntry::Directory {
            name,
            path,
            modified,
        }
    } else {
        FileEntry::File {
            name,
            path,
            size: metadata.len(),
            modified,
        }
    }
}

fn sort_entries(entries: &mut [FileEntry]) {
    entries.sort_by(|a, b| match (a.is_dir(), b.is_dir()) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name().to_lowercase().cmp(&b.name().to_lowercase()),
    });
}

#[tauri::command]
#[specta::specta]
pub fn get_initial_directory() -> Result<PathBuf, AppError> {
    if let Ok(start_dir) = env::var("VIBECOMMANDER_START_DIR") {
        let path = PathBuf::from(&start_dir);
        if path.is_dir() {
            return Ok(path);
        }
    }

    dirs::home_dir().ok_or_else(|| AppError::Io {
        message: "Could not determine home directory".to_string(),
        path: None,
    })
}

#[tauri::command]
#[specta::specta]
pub fn open_file(path: &str, app: tauri::AppHandle) -> Result<(), AppError> {
    use crate::shared::OpenFailedReason;
    app.opener()
        .open_path(path, None::<&str>)
        .map_err(|e| AppError::OpenFailed {
            path: PathBuf::from(path),
            reason: OpenFailedReason::from_error(&e.to_string()),
        })
}
