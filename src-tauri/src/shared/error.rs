use serde::Serialize;
use specta::Type;
use std::path::PathBuf;
use thiserror::Error;

#[derive(Debug, Error, Serialize, Type)]
#[serde(tag = "type")]
pub enum AppError {
    #[error("IO error: {message}")]
    Io {
        message: String,
        path: Option<PathBuf>,
    },

    #[error("Permission denied: {path}")]
    PermissionDenied { path: PathBuf },

    #[error("Not found: {path}")]
    NotFound { path: PathBuf },

    #[error("Invalid path: {message}")]
    InvalidPath { message: String },

    #[error("Failed to open: {path} - {reason}")]
    OpenFailed { path: PathBuf, reason: String },
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        match err.kind() {
            std::io::ErrorKind::NotFound => AppError::NotFound {
                path: PathBuf::new(),
            },
            std::io::ErrorKind::PermissionDenied => AppError::PermissionDenied {
                path: PathBuf::new(),
            },
            _ => AppError::Io {
                message: err.to_string(),
                path: None,
            },
        }
    }
}
