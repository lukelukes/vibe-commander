set quiet
set positional-arguments

mod tauri 'crates/vibe-commander-tauri/justfile'
mod gpui 'crates/vibe-commander-gpui/justfile'

default:
    @just --list --unsorted

# --- dev ---

[group('dev')]
dev:
    bun dev

[group('dev')]
tauri-dev:
    bun tauri dev

# --- check ---

[group('check')]
fmt:
    cargo fmt --all

[group('check')]
fmt-check:
    cargo fmt --all -- --check

[group('check')]
clippy:
    cargo clippy --workspace --all-targets -- -D warnings

[group('check')]
check: fmt-check clippy test

[group('check')]
test:
    cargo test --workspace

[group('check')]
frontend-test:
    bun run test --run

[group('check')]
frontend-lint:
    bun run lint

[group('check')]
frontend-typecheck:
    bun run typecheck

[group('check')]
frontend-fmt-check:
    bun run fmt:check

# --- ci ---

[group('ci')]
ci: ci-rust ci-frontend

[group('ci')]
ci-rust: fmt-check clippy test

[group('ci')]
ci-frontend: frontend-fmt-check frontend-lint frontend-typecheck frontend-test
