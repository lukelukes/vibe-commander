import type { FileEntry } from '#tauri-bindings/index';

import { For, onCleanup, onMount } from 'solid-js';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(timestamp: number | null): string {
  if (timestamp === null) return '—';
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function getEntryIcon(entry: FileEntry): string {
  switch (entry.type) {
    case 'Unreadable':
      return '\u26A0\uFE0F';
    case 'Directory':
      return '\uD83D\uDCC1';
    case 'Symlink':
      return '\uD83D\uDD17';
    case 'File':
      return '\uD83D\uDCC4';
    default: {
      const _exhaustive: never = entry;
      return _exhaustive;
    }
  }
}

export function getEntryTypeAttr(entry: FileEntry): string {
  switch (entry.type) {
    case 'Directory':
      return 'directory';
    case 'File':
      return 'file';
    case 'Symlink':
      return 'symlink';
    case 'Unreadable':
      return 'unreadable';
    default: {
      const _exhaustive: never = entry;
      return _exhaustive;
    }
  }
}

export function getEntrySize(entry: FileEntry): string {
  switch (entry.type) {
    case 'File':
      return formatFileSize(entry.size);
    case 'Symlink':
      return entry.target_is_dir ? '\u2014' : formatFileSize(entry.size);
    case 'Directory':
    case 'Unreadable':
      return '\u2014';
    default: {
      const _exhaustive: never = entry;
      return _exhaustive;
    }
  }
}

export function getEntryModified(entry: FileEntry): string {
  switch (entry.type) {
    case 'File':
    case 'Directory':
    case 'Symlink':
      return formatDate(entry.modified);
    case 'Unreadable':
      return '\u2014';
    default: {
      const _exhaustive: never = entry;
      return _exhaustive;
    }
  }
}

export interface FileListProps {
  entries: FileEntry[];
}

export const ROW_HEIGHT = 25;
export const ROWS_PER_SCROLL = 3;

export function calculateScrollAmount(deltaY: number): number {
  const direction = deltaY > 0 ? 1 : -1;
  return direction * ROW_HEIGHT * ROWS_PER_SCROLL;
}

export function FileList(props: FileListProps) {
  // oxlint-disable-next-line no-unassigned-vars
  let bodyRef!: HTMLDivElement;

  const handleWheel = (e: WheelEvent) => {
    if (!bodyRef) return;
    e.preventDefault();
    bodyRef.scrollTop += calculateScrollAmount(e.deltaY);
  };

  onMount(() => {
    bodyRef?.addEventListener('wheel', handleWheel, { passive: false });
  });

  onCleanup(() => {
    bodyRef?.removeEventListener('wheel', handleWheel);
  });

  return (
    <div class="file-list">
      <div class="file-list__header">
        <span class="file-list__col file-list__col-icon"></span>
        <span class="file-list__col file-list__col-name">Name</span>
        <span class="file-list__col file-list__col-size">Size</span>
        <span class="file-list__col file-list__col-date">Modified</span>
      </div>
      <div class="file-list__body" ref={bodyRef} data-testid="file-list-body">
        <For each={props.entries}>
          {(entry) => (
            <div
              class="file-list__row"
              data-testid="file-entry"
              data-entry-type={getEntryTypeAttr(entry)}
            >
              <span
                class="file-list__col file-list__col-icon"
                data-testid="entry-type"
                data-entry-type={getEntryTypeAttr(entry)}
              >
                {getEntryIcon(entry)}
              </span>
              <span class="file-list__col file-list__col-name" data-testid="entry-name">
                {entry.name}
              </span>
              <span class="file-list__col file-list__col-size" data-testid="entry-size">
                {getEntrySize(entry)}
              </span>
              <span class="file-list__col file-list__col-date" data-testid="entry-date">
                {getEntryModified(entry)}
              </span>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
