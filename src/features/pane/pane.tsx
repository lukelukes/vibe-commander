import type { FileEntry } from '#tauri-bindings/index';

import { PathBar } from '#features/path-bar/path-bar';
import { Show } from 'solid-js';

import type { PaneActions, PaneState } from './store';

import { FileList } from './file-list.tsx';

export interface PaneProps {
  store: [PaneState, PaneActions];
  isActive: boolean;
  onActivate: () => void;
}

function isNavigableDirectory(entry: FileEntry): boolean {
  if (entry.type === 'Directory') return true;
  if (entry.type === 'Symlink' && entry.target_is_dir) return true;
  return false;
}

export function Pane(props: PaneProps) {
  const state = () => props.store[0];
  const actions = () => props.store[1];

  const cursor = () => state().cursor;

  const handleNavigate = (entry: FileEntry) => {
    if (isNavigableDirectory(entry)) {
      void actions().navigateTo(entry.path);
    }
  };

  return (
    <div
      class="w-full h-full flex flex-col overflow-hidden"
      role="region"
      aria-label="File pane"
      data-focused={props.isActive}
      onClick={() => {
        props.onActivate();
      }}
      onKeyDown={() => {
        // Keyboard handled at app level
      }}
    >
      <PathBar path={state().path} onNavigate={(path) => void actions().navigateTo(path)} />
      <Show when={state().loading}>
        <div
          class="flex items-center justify-center flex-1 text-text-muted text-sm"
          data-testid="pane-loading"
        >
          Loading...
        </div>
      </Show>
      <Show when={state().error}>
        <div
          class="flex items-center justify-center flex-1 text-error text-sm"
          data-testid="pane-error"
        >
          {state().error}
        </div>
      </Show>
      <Show when={!state().loading && !state().error}>
        <FileList
          entries={state().entries}
          cursor={cursor()}
          onSelect={(index) => {
            actions().setCursor(index);
          }}
          onNavigate={handleNavigate}
        />
      </Show>
    </div>
  );
}
