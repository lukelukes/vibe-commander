use serde::Serialize;
use specta::Type;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Type)]
#[serde(tag = "type")]
#[non_exhaustive]
pub enum FileEntry {
    File {
        name: String,
        path: PathBuf,
        size: u64,
        modified: Option<u64>,
    },
    Directory {
        name: String,
        path: PathBuf,
        modified: Option<u64>,
    },
    Symlink {
        name: String,
        path: PathBuf,
        size: u64,
        modified: Option<u64>,
        target: PathBuf,
        target_is_dir: bool,
    },
    Unreadable {
        name: String,
        path: PathBuf,
        reason: String,
    },
}

impl FileEntry {
    pub fn name(&self) -> &str {
        match self {
            FileEntry::File { name, .. }
            | FileEntry::Directory { name, .. }
            | FileEntry::Symlink { name, .. }
            | FileEntry::Unreadable { name, .. } => name,
        }
    }

    pub fn path(&self) -> &Path {
        match self {
            FileEntry::File { path, .. }
            | FileEntry::Directory { path, .. }
            | FileEntry::Symlink { path, .. }
            | FileEntry::Unreadable { path, .. } => path,
        }
    }

    pub fn is_dir(&self) -> bool {
        matches!(
            self,
            FileEntry::Directory { .. }
                | FileEntry::Symlink {
                    target_is_dir: true,
                    ..
                }
        )
    }
}
