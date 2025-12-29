use std::fs::{self, File};
use std::io::Write;
use std::path::PathBuf;
use tempfile::TempDir;

pub struct TestFixture {
    pub dir: TempDir,
}

impl TestFixture {
    pub fn new() -> Self {
        Self {
            dir: TempDir::new().expect("Failed to create temp directory"),
        }
    }

    pub fn path(&self) -> PathBuf {
        self.dir.path().to_path_buf()
    }

    pub fn create_file(&self, name: &str, content: &str) -> PathBuf {
        let path = self.dir.path().join(name);
        let mut file = File::create(&path).expect("Failed to create file");
        file.write_all(content.as_bytes())
            .expect("Failed to write file");
        path
    }

    pub fn create_dir(&self, name: &str) -> PathBuf {
        let path = self.dir.path().join(name);
        fs::create_dir_all(&path).expect("Failed to create directory");
        path
    }

    pub fn create_nested_structure(&self, files: &[(&str, &str)]) {
        for (name, content) in files {
            let path = self.dir.path().join(name);
            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent).expect("Failed to create parent dirs");
            }
            let mut file = File::create(&path).expect("Failed to create file");
            file.write_all(content.as_bytes())
                .expect("Failed to write file");
        }
    }
}

impl Default for TestFixture {
    fn default() -> Self {
        Self::new()
    }
}
