use proptest::prelude::*;
use std::path::PathBuf;
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

fn sort_entries(entries: &mut [FileEntry]) {
    entries.sort_by(|a, b| {
        let a_is_dir = a.is_dir();
        let b_is_dir = b.is_dir();

        match (a_is_dir, b_is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name().to_lowercase().cmp(&b.name().to_lowercase()),
        }
    });
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(200))]

    #[test]
    fn p2_sorting_is_stable_and_correct(mut entries in entries_strategy()) {
        sort_entries(&mut entries);
        prop_assert!(is_sorted(&entries), "Entries not sorted correctly");
    }

    #[test]
    fn p2_sorting_is_idempotent(mut entries in entries_strategy()) {
        sort_entries(&mut entries);
        let names_first: Vec<_> = entries.iter().map(|e| e.name().to_string()).collect();
        sort_entries(&mut entries);
        let names_second: Vec<_> = entries.iter().map(|e| e.name().to_string()).collect();
        prop_assert_eq!(names_first, names_second, "Second sort changed order");
    }

    #[test]
    fn p2_dirs_always_before_files(mut entries in entries_strategy()) {
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
    fn p3_file_entries_have_size(entry in file_entry_strategy()) {
        match &entry {
            FileEntry::File { size, .. } => {
                prop_assert!(size >= &0, "File should have non-negative size");
            }
            FileEntry::Directory { .. } => {
            }
            FileEntry::Symlink { size, .. } => {
                prop_assert!(size >= &0, "Symlink should have non-negative size");
            }
            FileEntry::Unreadable { .. } => {
            }
            _ => {
            }
        }
    }

    #[test]
    fn p13_path_ends_with_name(entry in file_entry_strategy()) {
        let name = entry.name();
        let path = entry.path();
        let path_str = path.to_string_lossy();
        prop_assert!(
            path_str.ends_with(name),
            "Path '{}' should end with name '{}'",
            path_str,
            name
        );
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

#[cfg(test)]
mod boundary_tests {
    use super::*;

    proptest! {
        #[test]
        fn empty_list_stays_empty(entries in proptest::collection::vec(file_entry_strategy(), 0..1)) {
            let mut sorted = entries.clone();
            sort_entries(&mut sorted);
            prop_assert_eq!(sorted.len(), entries.len());
        }

        #[test]
        fn single_entry_unchanged(entry in file_entry_strategy()) {
            let mut entries = vec![entry.clone()];
            sort_entries(&mut entries);
            prop_assert_eq!(entries.len(), 1);
            prop_assert_eq!(entries[0].name(), entry.name());
        }

        #[test]
        fn unicode_names_handled(s in "[\\p{L}\\p{N}]{1,20}") {
            let entry = FileEntry::File {
                name: s.clone(),
                path: PathBuf::from(format!("/test/{}", s)),
                size: 0,
                modified: None,
            };
            prop_assert_eq!(entry.name(), &s);
        }
    }
}

#[cfg(test)]
mod metamorphic_tests {
    use super::*;

    proptest! {
        #[test]
        fn adding_dir_keeps_sorted_if_placed_correctly(
            mut entries in entries_strategy(),
            new_name in file_name_strategy()
        ) {
            sort_entries(&mut entries);

            let new_dir = FileEntry::Directory {
                name: new_name.clone(),
                path: PathBuf::from(format!("/test/{}", new_name)),
                modified: None,
            };

            entries.push(new_dir);
            sort_entries(&mut entries);

            prop_assert!(is_sorted(&entries), "Adding dir broke sort invariant");
        }

        #[test]
        fn adding_file_keeps_sorted_if_placed_correctly(
            mut entries in entries_strategy(),
            new_name in file_name_strategy()
        ) {
            sort_entries(&mut entries);

            let new_file = FileEntry::File {
                name: new_name.clone(),
                path: PathBuf::from(format!("/test/{}", new_name)),
                size: 42,
                modified: None,
            };

            entries.push(new_file);
            sort_entries(&mut entries);

            prop_assert!(is_sorted(&entries), "Adding file broke sort invariant");
        }
    }
}
