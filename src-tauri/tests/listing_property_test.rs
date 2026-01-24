#![allow(clippy::uninlined_format_args, clippy::redundant_clone, clippy::str_to_string)]

use proptest::prelude::*;
use std::path::PathBuf;
use vibe_commander_lib::features::listing::sort_entries;
use vibe_commander_lib::shared::types::FileEntry;

fn is_sorted(entries: &[FileEntry]) -> bool {
    entries.windows(2).all(|pair| {
        let a = &pair[0];
        let b = &pair[1];

        let a_is_dir = a.is_dir();
        let b_is_dir = b.is_dir();

        match (a_is_dir, b_is_dir) {
            (true, false) => true,
            (false, true) => false,
            _ => a.name().to_lowercase() <= b.name().to_lowercase(),
        }
    })
}

fn file_name_strategy() -> impl Strategy<Value = String> {
    "[a-zA-Z0-9_.-]{1,20}"
}

fn file_entry_strategy() -> impl Strategy<Value = FileEntry> {
    prop_oneof![
        file_name_strategy().prop_map(|name| FileEntry::File {
            name: name.clone(),
            path: PathBuf::from(format!("/test/{}", name)),
            size: 0,
            modified: None,
        }),
        file_name_strategy().prop_map(|name| FileEntry::Directory {
            name: name.clone(),
            path: PathBuf::from(format!("/test/{}", name)),
            modified: None,
        }),
    ]
}

fn entries_strategy() -> impl Strategy<Value = Vec<FileEntry>> {
    proptest::collection::vec(file_entry_strategy(), 0..50)
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(200))]

    #[test]
    fn sorting_is_stable_and_correct(mut entries in entries_strategy()) {
        sort_entries(&mut entries);
        prop_assert!(is_sorted(&entries), "Entries not sorted correctly");
    }

    #[test]
    fn sorting_is_idempotent(mut entries in entries_strategy()) {
        sort_entries(&mut entries);
        let names_first: Vec<_> = entries.iter().map(|e| e.name().to_string()).collect();
        sort_entries(&mut entries);
        let names_second: Vec<_> = entries.iter().map(|e| e.name().to_string()).collect();
        prop_assert_eq!(names_first, names_second, "Second sort changed order");
    }

    #[test]
    fn dirs_always_before_files(mut entries in entries_strategy()) {
        sort_entries(&mut entries);

        let mut seen_file = false;
        for entry in &entries {
            if !entry.is_dir() {
                seen_file = true;
            } else if seen_file {
                prop_assert!(false, "Directory found after file in sorted list");
            }
        }
    }

    #[test]
    fn sorting_preserves_count(entries in entries_strategy()) {
        let original_count = entries.len();
        let mut sorted = entries;
        sort_entries(&mut sorted);
        prop_assert_eq!(sorted.len(), original_count, "Sorting changed entry count");
    }

    #[test]
    fn sorting_preserves_elements(entries in entries_strategy()) {
        let mut original_names: Vec<String> = entries.iter().map(|e| e.name().to_string()).collect();
        original_names.sort();

        let mut sorted = entries;
        sort_entries(&mut sorted);
        let mut sorted_names: Vec<String> = sorted.iter().map(|e| e.name().to_string()).collect();
        sorted_names.sort();

        prop_assert_eq!(sorted_names, original_names, "Sorting lost or added elements");
    }
}
