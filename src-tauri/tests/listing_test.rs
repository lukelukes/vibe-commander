#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

mod common;

use common::TestFixture;
use std::os::unix::fs::PermissionsExt;
use vibe_commander_lib::features::listing::list_directory;
use vibe_commander_lib::shared::{AppError, FileEntry};

#[test]
fn list_directory_returns_sorted_entries() {
    let fixture = TestFixture::new();

    fixture.create_dir("alpha_dir");
    fixture.create_dir("beta_dir");
    fixture.create_file("charlie.txt", "");
    fixture.create_file("alpha.txt", "");
    fixture.create_file("Beta.txt", "");

    let result = list_directory(fixture.path().to_str().unwrap());
    assert!(result.is_ok());

    let entries = result.unwrap();
    let names: Vec<&str> = entries.iter().map(vibe_commander_lib::shared::FileEntry::name).collect();

    assert_eq!(
        names,
        vec![
            "alpha_dir",
            "beta_dir",
            "alpha.txt",
            "Beta.txt",
            "charlie.txt"
        ]
    );
}

#[test]
#[cfg(unix)]
fn list_directory_handles_permission_denied() {
    let fixture = TestFixture::new();
    let restricted = fixture.create_dir("restricted");

    std::fs::set_permissions(&restricted, std::fs::Permissions::from_mode(0o000)).unwrap();

    let result = list_directory(restricted.to_str().unwrap());

    std::fs::set_permissions(&restricted, std::fs::Permissions::from_mode(0o755)).unwrap();

    assert!(matches!(result, Err(AppError::PermissionDenied { .. })));
}

#[test]
fn list_directory_handles_not_found() {
    let result = list_directory("/nonexistent/path/that/does/not/exist");

    assert!(matches!(result, Err(AppError::NotFound { .. })));
}

#[test]
#[cfg(unix)]
fn list_directory_includes_broken_symlinks() {
    let fixture = TestFixture::new();

    fixture.create_file("valid.txt", "content");
    fixture.create_symlink("broken_link", "/nonexistent/target/that/does/not/exist");

    let result = list_directory(fixture.path().to_str().unwrap());
    assert!(result.is_ok());

    let entries = result.unwrap();
    let names: Vec<&str> = entries.iter().map(vibe_commander_lib::shared::FileEntry::name).collect();

    assert!(names.contains(&"valid.txt"));
    assert!(names.contains(&"broken_link"));

    let broken = entries.iter().find(|e| e.name() == "broken_link").unwrap();
    match broken {
        FileEntry::Symlink { target, .. } => {
            assert_eq!(
                target.to_str().unwrap(),
                "/nonexistent/target/that/does/not/exist"
            );
        }
        _ => panic!("Expected Symlink variant"),
    }
}

#[test]
fn list_directory_entries_are_not_unreadable_on_success() {
    let fixture = TestFixture::new();

    fixture.create_file("file1.txt", "content1");
    fixture.create_file("file2.txt", "content2");
    fixture.create_dir("subdir");

    let result = list_directory(fixture.path().to_str().unwrap());
    assert!(result.is_ok());

    let entries = result.unwrap();
    assert_eq!(entries.len(), 3);

    for entry in &entries {
        assert!(!matches!(entry, FileEntry::Unreadable { .. }));
    }
}

#[test]
fn list_directory_returns_empty_for_empty_dir() {
    let fixture = TestFixture::new();
    let result = list_directory(fixture.path().to_str().unwrap());

    assert!(result.is_ok());
    assert_eq!(result.unwrap().len(), 0);
}

#[test]
fn list_directory_handles_path_with_null_byte() {
    let result = list_directory("/path/with\0null");
    assert!(result.is_err());
}

#[test]
fn list_directory_handles_unicode_paths() {
    let fixture = TestFixture::new();

    fixture.create_file("日本語.txt", "");
    fixture.create_file("émoji_🎉.txt", "");
    fixture.create_dir("中文目录");

    let result = list_directory(fixture.path().to_str().unwrap());
    assert!(result.is_ok());

    let entries = result.unwrap();
    let names: Vec<&str> = entries.iter().map(vibe_commander_lib::shared::FileEntry::name).collect();

    assert!(names.contains(&"日本語.txt"));
    assert!(names.contains(&"émoji_🎉.txt"));
    assert!(names.contains(&"中文目录"));
}
