mod tauri 'crates/vibe-commander-tauri/justfile'

default: help

help:
    @just --list

check:
    cargo check --workspace

clippy:
    cargo clippy --workspace --all-targets

test:
    cargo test --workspace

fmt:
    cargo fmt --all

tauri-dev:
    bun tauri dev

gpui:
    cargo run -p vibe-commander-gpui

frontend-test:
    bun run test

dev:
    bun dev
