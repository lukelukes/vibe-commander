import type { FileEntry } from '#tauri-bindings/index';

import { createStore } from 'solid-js/store';

import { createDirectoryService, type DirectoryService } from './directory-service';
import { formatAppError } from './format-error';

export interface PaneState {
  path: string;
  entries: FileEntry[];
  loading: boolean;
  error: string | null;
}

export interface PaneActions {
  navigateTo: (path: string) => Promise<void>;
  refresh: () => Promise<void>;
  initialize: () => Promise<void>;
}

export interface PaneStoreOptions {
  directoryService?: DirectoryService;
}

export function createPaneStore(options: PaneStoreOptions = {}): [PaneState, PaneActions] {
  const service = options.directoryService ?? createDirectoryService();

  const [state, setState] = createStore<PaneState>({
    path: '',
    entries: [],
    loading: true,
    error: null
  });

  let currentNavigationId = 0;

  const loadDirectory = async (dirPath: string) => {
    const thisNavigation = ++currentNavigationId;
    setState('loading', true);
    setState('error', null);

    const result = await service.listDirectory(dirPath);

    if (thisNavigation !== currentNavigationId) return;

    if (result.ok) {
      setState('path', dirPath);
      setState('entries', result.entries);
    } else {
      setState('error', formatAppError(result.error));
    }

    setState('loading', false);
  };

  const actions: PaneActions = {
    navigateTo: (dirPath: string) => loadDirectory(dirPath),
    refresh: async () => {
      if (state.path) {
        await loadDirectory(state.path);
      }
    },
    initialize: async () => {
      const initialDir = await service.getInitialDirectory();
      await loadDirectory(initialDir);
    }
  };

  return [state, actions];
}
