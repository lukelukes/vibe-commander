import type { FileEntry } from '#tauri-bindings/index';

import { createEffect, For, onCleanup, onMount, Show } from 'solid-js';

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

export function isNavigableDirectory(entry: FileEntry): boolean {
  if (entry.type === 'Directory') return true;
  if (entry.type === 'Symlink' && entry.target_is_dir) return true;
  return false;
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
  cursor: number;
  onSelect?: (index: number) => void;
  onNavigate?: (entry: FileEntry) => void;
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
  const rowRefs: HTMLDivElement[] = [];

  createEffect(() => {
    rowRefs.length = 0;
  });

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

  createEffect(() => {
    const cursor = props.cursor;
    if (cursor < 0 || !rowRefs[cursor] || !bodyRef) return;

    const row = rowRefs[cursor];
    const rowTop = row.offsetTop;
    const rowBottom = rowTop + row.offsetHeight;
    const containerTop = bodyRef.scrollTop;
    const containerBottom = containerTop + bodyRef.clientHeight;

    if (rowTop < containerTop || rowBottom > containerBottom) {
      row.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  });

  const colBase = 'px-2 truncate leading-6';

  return (
    <div class="flex flex-col flex-1 min-h-0">
      <div class="flex shrink-0 pr-[10px] bg-bg-subtle border-b border-border-subtle font-medium text-xs uppercase tracking-wide text-text-muted">
        <span class={`${colBase} w-7 shrink-0 text-center text-sm h-7 leading-7`} />
        <span class={`${colBase} flex-1 min-w-0 h-7 leading-7`}>Name</span>
        <span class={`${colBase} w-20 shrink-0 text-right h-7 leading-7`}>Size</span>
        <span class={`${colBase} w-[140px] shrink-0 text-right h-7 leading-7`}>Modified</span>
      </div>
      <div class="flex-1 overflow-y-scroll min-h-0" ref={bodyRef} data-testid="file-list-body">
        <Show
          when={props.entries.length > 0}
          fallback={
            <div class="flex items-center justify-center h-full text-text-muted text-sm">
              Directory is empty
            </div>
          }
        >
          <For each={props.entries}>
            {(entry, index) => (
              <div
                ref={(el) => (rowRefs[index()] = el)}
                class="file-row flex h-6 items-center cursor-default select-none"
                data-testid="file-entry"
                data-entry-type={getEntryTypeAttr(entry)}
                data-cursor={index() === props.cursor}
                role="row"
                aria-selected={index() === props.cursor}
                onPointerDown={(e) => {
                  if (e.button === 0) props.onSelect?.(index());
                }}
                onDblClick={() => props.onNavigate?.(entry)}
              >
                <span
                  class={`${colBase} w-7 shrink-0 text-center text-sm`}
                  data-testid="entry-type"
                  data-entry-type={getEntryTypeAttr(entry)}
                >
                  {getEntryIcon(entry)}
                </span>
                <span class={`${colBase} flex-1 min-w-0 file-col-name`} data-testid="entry-name">
                  {entry.name}
                </span>
                <span
                  class={`${colBase} w-20 shrink-0 text-right text-text-muted tabular-nums file-col-meta`}
                  data-testid="entry-size"
                >
                  {getEntrySize(entry)}
                </span>
                <span
                  class={`${colBase} w-[140px] shrink-0 text-right text-text-muted tabular-nums file-col-meta`}
                  data-testid="entry-date"
                >
                  {getEntryModified(entry)}
                </span>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  );
}
