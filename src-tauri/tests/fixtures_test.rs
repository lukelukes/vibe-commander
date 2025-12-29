mod common;

use common::TestFixture;

#[test]
fn test_fixture_creates_temp_directory() {
    let fixture = TestFixture::new();
    assert!(fixture.path().exists());
    assert!(fixture.path().is_dir());
}

#[test]
fn test_fixture_creates_file() {
    let fixture = TestFixture::new();
    let file_path = fixture.create_file("test.txt", "hello world");

    assert!(file_path.exists());
    let content = std::fs::read_to_string(&file_path).unwrap();
    assert_eq!(content, "hello world");
}

#[test]
fn test_fixture_creates_directory() {
    let fixture = TestFixture::new();
    let dir_path = fixture.create_dir("subdir");

    assert!(dir_path.exists());
    assert!(dir_path.is_dir());
}

#[test]
fn test_fixture_creates_nested_structure() {
    let fixture = TestFixture::new();
    fixture.create_nested_structure(&[
        ("a/b/file1.txt", "content1"),
        ("a/c/file2.txt", "content2"),
        ("root.txt", "root content"),
    ]);

    assert!(fixture.path().join("a/b/file1.txt").exists());
    assert!(fixture.path().join("a/c/file2.txt").exists());
    assert!(fixture.path().join("root.txt").exists());

    let content = std::fs::read_to_string(fixture.path().join("a/b/file1.txt")).unwrap();
    assert_eq!(content, "content1");
}
