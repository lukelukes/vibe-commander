use serde::Serialize;
use specta::Type;
use std::path::PathBuf;
use thiserror::Error;

#[derive(Debug, Clone, Serialize, Type)]
pub enum OpenFailedReason {
    PermissionDenied,
    NotFound,
    NoDefaultApp,
    Unknown,
}

impl OpenFailedReason {
    #[must_use]
    pub fn from_error(err: &str) -> Self {
        let lower = err.to_lowercase();
        if lower.contains("permission") || lower.contains("access denied") {
            Self::PermissionDenied
        } else if lower.contains("not found") || lower.contains("no such file") {
            Self::NotFound
        } else if lower.contains("no application") || lower.contains("no default") {
            Self::NoDefaultApp
        } else {
            Self::Unknown
        }
    }
}

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

    #[error("Failed to open: {path:?}")]
    OpenFailed {
        path: PathBuf,
        reason: OpenFailedReason,
    },
}

impl AppError {
    pub fn from_io_error(err: &std::io::Error, path: impl Into<PathBuf>) -> Self {
        let path = path.into();
        match err.kind() {
            std::io::ErrorKind::NotFound => AppError::NotFound { path },
            std::io::ErrorKind::PermissionDenied => AppError::PermissionDenied { path },
            _ => AppError::Io {
                message: err.to_string(),
                path: Some(path),
            },
        }
    }
}
