# vibecommander

A minimal, fast, dual-pane file manager for Linux and macOS inspired by Total Commander and Marta. Prioritizes keyboard efficiency, instant performance, and seamless CLI integration.

## Core Philosophy

- **Performance**: Instant response for all navigation, scrolling, and filtering operations
- **Reliability**: Rock-solid file operations - never lose or corrupt data
- **Keyboard-first**: Every workflow reachable via keyboard
- **Simplicity**: Clean codebase, easy to extend, avoid overengineering

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Tauri 2.x |
| Frontend | Solid.js + TypeScript |
| Backend | Rust |
| Config | TOML (XDG: `~/.config/vibecommander/`) |
| Platforms | Linux, macOS |

---

## UI Architecture

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ [Path Breadcrumbs / Editable Path Bar]              [Tab] [Tab] │
├────────────────────────────┬────────────────────────────────────┤
│                            │                                    │
│   Left Pane                │   Right Pane                       │
│   (Fully Independent)      │   (Fully Independent)              │
│                            │                                    │
│   - Own tabs               │   - Own tabs                       │
│   - Own sort order         │   - Own sort order                 │
│   - Own filters            │   - Own filters                    │
│                            │                                    │
├────────────────────────────┴────────────────────────────────────┤
│ Status: 3 selected (12.4 MB) │ 1,234 items │ 45.2 GB free       │
└─────────────────────────────────────────────────────────────────┘
```

### Panes

- **Dual-pane** default layout
- Each pane is **fully independent**: separate tabs, sort order, filters, view settings
- **Tabs per pane**: Multiple locations open per pane (MVP)
- Workspace/session system for saving tab sets (post-MVP)

### File List Columns

MVP columns (standard view):
- Name (with type icon)
- Size
- Modified date

Post-MVP: Configurable columns (permissions, owner, extension, etc.)

**Column behavior**:
- User-resizable via drag
- Sortable per-pane
- Persist widths in config

### Path Bar

- **Clickable breadcrumbs** by default (click segment to navigate)
- Click or hotkey to enter **edit mode** for direct path typing
- Supports paste

### Status Bar

Full context display:
- Selection summary: item count + total size
- Current directory item count
- Free disk space

---

## Navigation

### Keyboard

| Key | Action |
|-----|--------|
| ↑/↓ | Move cursor |
| Enter | Enter directory / Open file |
| Backspace | Go to parent directory |
| Tab | Switch focus between panes |
| Alt+← | Navigate back in history |
| Alt+→ | Navigate forward in history |
| Home | First item |
| End | Last item |
| Page Up/Down | Page scroll |

### Quick Filter

- **Activation**: Just start typing (alphanumeric chars)
- Filters current directory (no recursion)
- **Highlight matches** in filenames
- Press Escape to clear filter

### Global Fuzzy Jump

- Separate hotkey (Ctrl+P / Cmd+P)
- **Primary backend**: `plocate` if available (trigram-indexed, ~8ms across millions of files)
- **Fallback**: On-demand scanning with smart caching + `find` as last resort
- Cache invalidation via inotify (Linux) / FSEvents (macOS)
- Graceful degradation: If plocate unavailable, show warning + use fallback

### Breadcrumb Navigation

- Click any path segment to navigate directly
- Hover shows full path

---

## Selection

| Input | Behavior |
|-------|----------|
| Space | Toggle selection on current item, cursor moves down |
| Shift+↑/↓ | Extend selection range |
| Ctrl+A / Cmd+A | Select all |
| Escape | Clear selection |

---

## File Operations

### Copy/Move (F5/F6)

- **Default**: Copy/Move from active pane to inactive pane
- **Alternative**: Invoke destination picker for arbitrary target
- Keyboard: F5 (copy), F6 (move)

### Conflict Resolution

Marta/TC style dialog:
- **Replace**: Overwrite existing file
- **Keep Both**: Auto-rename with suffix
- **Skip**: Do not copy this file
- **Apply to all** checkbox for batch decisions

### Progress Display

- **Non-blocking modal**: Can continue navigating while operations run
- **Minimizable** to status bar indicator (TC style)
- **Operation queue**: Multiple operations queue up, execute sequentially
- Shows:
  - Overall progress bar
  - Current file name
  - Transfer speed (MB/s)
  - Time remaining estimate
  - Bytes copied / total
- **Controls**: Pause, Cancel
- **Completion**: Auto-dismiss on success, persist on error

### Delete

| Key | Action |
|-----|--------|
| F8 or Delete | Move to system trash (reversible) |
| Shift+Delete | Permanent delete (with confirmation) |

### Rename

- **F2**: Inline editing in file list
- Filename becomes editable in-place
- **Cursor position**: Select all text, cursor placed before extension dot (e.g., `document|.txt`)
- **Validation**: Check for invalid characters, existing names
- Enter to confirm, Escape to cancel

### Create

| Key | Action |
|-----|--------|
| F7 | Create new folder (inline naming) |
| Shift+F7 | Create new file (inline naming) |

Also available via command palette.

---

## Command Palette

### Access

- Hotkey: Ctrl+Shift+P / Cmd+Shift+P
- **Actions only** (separate from fuzzy file jump)

### Shell Command Execution

Simple substitution syntax:
```
vim {file}           # Current file
tar -czf archive.tar.gz {selection}  # All selected files
git status {dir}     # Current directory
```

### Placeholders

| Placeholder | Expands to |
|-------------|-----------|
| `{file}` | Current file path |
| `{files}` | All selected file paths (space-separated) |
| `{selection}` | Same as {files} |
| `{dir}` | Current directory path |
| `{filename}` | Current filename without path |
| `{basename}` | Filename without extension |
| `{ext}` | File extension |

### Built-in Actions

Ship with curated defaults:
- Open in terminal
- Open in default editor
- Copy path to clipboard
- Git status
- Git diff
- Open in VS Code / preferred editor

Users can add custom actions in config.

---

## Symlinks & Special Files

- **Visual indicator**: Distinct icon/color for symlinks (→ arrow suffix or overlay)
- **Broken symlinks**: Red/strikethrough treatment to clearly identify dead links
- **Show target path**: Column or tooltip shows link destination
- **Explicit operations**:
  - Enter follows the link
  - Context action to "Go to link target" or "Operate on link itself"

---

## Hidden Files

- **Hidden by default** (dotfiles not shown)
- Toggle: Ctrl+H / Cmd+Shift+.
- **When visible**: Dimmed text color to distinguish from regular files
- Persist preference in config

---

## Bookmarks

MVP:
- Simple flat list of bookmarked paths
- Hotkey to open bookmarks panel
- Add current location to bookmarks

Post-MVP:
- Nested groups (Work, Personal, Projects)
- Drag to reorder

---

## Theming

Fully themeable from the start:
- Theme files in `~/.config/vibecommander/themes/`
- CSS variables for all colors
- Ship with dark theme default
- Support light theme
- Follow system preference option

Theme covers:
- Background colors (panes, statusbar, dialogs)
- Text colors (normal, selected, cursor)
- Accent colors (selection, highlights)
- Border colors
- Icon styles

---

## Configuration

Location: `~/.config/vibecommander/config.toml`

**Hot-reload**: Config file is watched; changes apply immediately without restart (theme, keybindings, settings).

```toml
[general]
single_instance = true
show_hidden = false
follow_system_theme = true
theme = "dark"

[keybindings]
copy = "F5"
move = "F6"
delete = "F8"
mkdir = "F7"
rename = "F2"
toggle_hidden = "Ctrl+H"
command_palette = "Ctrl+Shift+P"
fuzzy_jump = "Ctrl+P"
quick_filter = ""  # Just start typing

[actions]
# Custom command palette actions
[[actions.custom]]
name = "Open in Vim"
command = "vim {file}"
shortcut = "Ctrl+E"

[[actions.custom]]
name = "Compress selection"
command = "tar -czf archive.tar.gz {selection}"

[session]
restore_tabs = true
restore_scroll = true

[sounds]
enabled = true          # Play system sounds on errors
error_sound = "default" # Use system error sound

[search]
plocate_path = "/usr/bin/plocate"  # Path to plocate binary
plocate_fallback = "find"          # Fallback when plocate unavailable
search_timeout = 5000              # Timeout in ms for search operations
```

### Keybindings

Fully customizable:
- All bindings configurable via TOML
- Mix of TC-style (F-keys) and modern (Cmd/Ctrl combos)

Default keybind reference:

| Function | Linux | macOS |
|----------|-------|-------|
| Copy | F5 | F5 |
| Move | F6 | F6 |
| Delete | F8 | F8 |
| Mkdir | F7 | F7 |
| Rename | F2 | F2 |
| View | F3 | F3 |
| Edit | F4 | F4 |
| Refresh | Ctrl+R | Cmd+R |
| Command Palette | Ctrl+Shift+P | Cmd+Shift+P |
| Fuzzy Jump | Ctrl+P | Cmd+P |
| Toggle Hidden | Ctrl+H | Cmd+Shift+. |
| Go to Path | Ctrl+G | Cmd+Shift+G |
| Open | Enter | Enter |
| Open With... | Shift+Enter | Shift+Enter |

---

## CLI Interface

Binary: `vc`

```bash
# Open at current directory
vc

# Open at specific path (in active pane)
vc /path/to/dir

# Open path in specific pane
vc --pane left /path/a
vc --pane right /var/log

# Open two paths in left and right
vc --pane left ~/projects --pane right ~/downloads

# Version and help
vc --version
vc --help
```

### Options

| Flag | Description |
|------|-------------|
| `--pane <left\|right>` | Open path in specified pane (new tab if instance exists) |
| `--version` | Print version and exit |
| `--help` | Print help and exit |

### Single Instance Behavior

- First `vc` call opens window
- Subsequent `vc /path` calls focus existing window and navigate (active pane or specified `--pane`)
- Use `vc --new-window` for explicit new window (post-MVP)

---

## File Type Handling

### Open (Enter)

MVP: Use system default via `xdg-open` (Linux) / `open` (macOS)

Post-MVP: Configurable per-type handlers:
```toml
[handlers]
"*.md" = "code"
"*.pdf" = "zathura"
"*.jpg" = "feh"
```

---

## Permission Handling

When navigating to a directory without read permission:
1. Show error notification
2. Offer "Retry with elevated permissions" option
3. Use `pkexec` (Linux) / privilege escalation (macOS) to retry

---

## Filesystem Watching

**Smart hybrid approach**:
- **When focused**: Watch current directories via inotify/FSEvents, auto-refresh on changes
- **When backgrounded**: Pause watching to save resources
- **Debounce events**: 100ms window to coalesce rapid filesystem changes
- **Inactive tab timeout**: Drop watches for tabs inactive >30s, re-watch on activation
- Manual refresh always available: Ctrl+R / Cmd+R

---

## Performance Requirements

### Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Window visible | < 100ms | Perceived instant |
| Fully interactive | < 500ms | Acceptable for Tauri/WebView |
| Directory listing (1k files) | < 16ms | Single frame |
| Fuzzy search response | < 50ms | Feels instant |
| Memory footprint (idle) | < 150MB | Reasonable for GUI app |
| Binary size | < 20MB | Tauri advantage |

### Directory Loading

- **Target**: < 100ms to display first screenful for directories up to 10k files
- **Large directories (10k-100k)**:
  - Virtualized scrolling (only render visible rows)
  - Async loading with progress indicator
  - Incremental rendering

### Memory

- Virtualized lists to cap DOM node count
- Lazy load file metadata (stat calls)
- LRU cache for directory contents and fuzzy index

### Startup Optimization

1. Show window frame immediately
2. Load config async
3. Restore last session state
4. Render file lists (first batch immediately)
5. Start file watchers in background

---

## Session Persistence

Restore on launch:
- Pane locations (left/right paths)
- Open tabs per pane
- Scroll position per tab
- Window size and position
- Active pane

Store in: `~/.local/state/vibecommander/session.json`

---

## Error Handling

**Adaptive verbosity**:
- Default: User-friendly message ("Cannot read folder")
- Expandable: "Show details" reveals errno, full path, underlying error
- Logged: Full technical details to `~/.local/state/vibecommander/logs/`

**Sound feedback**:
- Play system error sound on permission/access errors
- Configurable: can be disabled in config `[sounds]` section

**Error types & responses**:
| Error | Response |
|-------|----------|
| Permission denied | Error sound + toast notification |
| Path not found | Error sound + toast notification |
| Disk full | Modal dialog, abort operation |
| Config parse error | Notification + use defaults |

---

## MVP Scope

### Must Have (MVP)

- [x] Dual-pane layout with independent state
- [x] Tabs per pane
- [x] Standard columnar file view (name, size, date)
- [x] Traditional keyboard navigation (arrows, Enter, Backspace)
- [x] Space + Shift+arrow selection
- [x] F5 copy, F6 move with conflict resolution dialog
- [x] F8 delete (trash), Shift+Delete (permanent)
- [x] F2 inline rename
- [x] F7 create folder
- [x] Quick filter (type to filter current dir)
- [x] Global fuzzy jump (Ctrl+P)
- [x] Command palette with shell execution
- [x] Curated default actions
- [x] Breadcrumb navigation + editable path bar
- [x] Alt+arrows for history navigation
- [x] Session persistence (tabs, locations, scroll)
- [x] XDG TOML config with customizable keybindings
- [x] Full theming support
- [x] Status bar (selection, count, free space)
- [x] Hidden files toggle (Ctrl+H)
- [x] Simple bookmarks list
- [x] Single-instance `vc` CLI
- [x] System-default file opening (xdg-open)
- [x] Privilege escalation prompt for permission errors
- [x] Smart filesystem watching
- [x] Minimizable progress dialog
- [x] Virtualized scrolling for large dirs
- [x] Column resizing
- [x] Symlink visual indicators and explicit handling
- [x] Broken symlink visual treatment (red/strikethrough)
- [x] Adaptive error messages
- [x] Error sounds (configurable)
- [x] Config hot-reload
- [x] CLI --pane flag for pane targeting
- [x] plocate integration for fuzzy search (with fallback)
- [x] Non-blocking progress with queue and Pause/Cancel

### Post-MVP

- [ ] Configurable columns
- [ ] Nested bookmark groups
- [ ] Workspace/session system (save/restore named sets)
- [ ] Per-type file handlers
- [ ] Built-in viewers (text, image, markdown preview)
- [ ] Archive browsing (zip, tar)
- [ ] Drag and drop from external apps
- [ ] Batch rename
- [ ] File comparison
- [ ] Search within files (grep)

---

## Project Structure (Proposed)

```
vibecommander/
├── src-tauri/           # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/    # Tauri command handlers
│   │   ├── fs/          # Filesystem operations
│   │   ├── config/      # Config loading/saving
│   │   ├── watch/       # FS watching
│   │   └── actions/     # Shell action execution
│   └── Cargo.toml
├── src/                 # Solid.js frontend
│   ├── components/
│   │   ├── Pane/
│   │   ├── FileList/
│   │   ├── PathBar/
│   │   ├── StatusBar/
│   │   ├── CommandPalette/
│   │   ├── Dialog/
│   │   └── Tabs/
│   ├── stores/          # Solid.js reactive stores
│   ├── hooks/           # Custom hooks
│   ├── styles/          # CSS/themes
│   ├── lib/             # Utilities
│   └── App.tsx
├── config/              # Default config templates
└── themes/              # Built-in themes
```

---

## Design Notes

### Why Tauri over Electron?

- Significantly smaller binary size (~10MB vs ~150MB)
- Lower memory footprint
- Native Rust backend for file operations
- Better security model
- Growing ecosystem with good DX

### Why Solid.js over React?

- True reactivity (no virtual DOM diffing)
- Smaller bundle size
- Excellent performance for frequent updates (file list scrolling)
- Simpler mental model for fine-grained reactivity

### Why Not TUI?

- Cross-platform consistency harder in terminal
- Rich interactions (drag columns, click breadcrumbs) more natural in GUI
- macOS users expect native GUI
- Can still be highly keyboard-driven

---

## Success Metrics

1. **Startup time**: < 500ms to fully interactive
2. **Window visible**: < 100ms (perceived instant)
3. **Navigation latency**: < 50ms for directory changes
4. **Filter latency**: < 16ms (60fps) while typing
5. **Memory usage**: < 150MB for typical usage
6. **Binary size**: < 20MB

---

## Visual Design Decisions

### Icons
- **MVP**: System theme icons (freedesktop icon theme on Linux, SF Symbols on macOS)
- **Post-MVP**: Configurable - option to use bundled consistent icon set

### Typography
- **MVP**: System default UI font
- **Post-MVP**: Customizable font in settings

---

## Open Questions

1. Touch/trackpad: Any specific gestures to support? (two-finger swipe for history?)
2. Trash integration: Use `trash-cli` or implement freedesktop.org spec directly?
3. Sound playback: System sound API or shell out to `paplay`/`aplay`?
4. Single-instance IPC: Unix socket vs D-Bus for CLI → running instance communication?
