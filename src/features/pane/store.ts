import type { FileEntry } from '#tauri-bindings/index';

import { createStore } from 'solid-js/store';

import { createDirectoryService, type DirectoryService } from './directory-service';
import { formatAppError } from './format-error';

export interface PaneState {
  path: string;
  entries: FileEntry[];
  loading: boolean;
  error: string | null;
  cursor: number;
  backStack: string[];
  forwardStack: string[];
}

export interface PaneActions {
  navigateTo: (path: string) => Promise<void>;
  refresh: () => Promise<void>;
  initialize: () => Promise<void>;
  setCursor: (index: number) => void;
  goBack: () => Promise<void>;
  goForward: () => Promise<void>;
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
    error: null,
    cursor: -1,
    backStack: [],
    forwardStack: []
  });

  let currentNavigationId = 0;
  const MAX_CURSOR_HISTORY = 500;
  const cursorHistory = new Map<string, number>();

  const saveCursorPosition = () => {
    if (state.path && state.cursor >= 0) {
      cursorHistory.delete(state.path);
      cursorHistory.set(state.path, state.cursor);

      if (cursorHistory.size > MAX_CURSOR_HISTORY) {
        const firstKey = cursorHistory.keys().next().value;
        if (firstKey !== undefined) {
          cursorHistory.delete(firstKey);
        }
      }
    }
  };

  const loadDirectory = async (dirPath: string, restoreCursor = false): Promise<boolean> => {
    const thisNavigation = ++currentNavigationId;
    setState('loading', true);
    setState('error', null);

    const result = await service.listDirectory(dirPath);

    if (thisNavigation !== currentNavigationId) return false;

    if (result.ok) {
      setState('path', dirPath);
      setState('entries', result.entries);

      let newCursor = result.entries.length > 0 ? 0 : -1;
      if (restoreCursor && result.entries.length > 0) {
        const savedCursor = cursorHistory.get(dirPath);
        if (savedCursor !== undefined) {
          newCursor = Math.min(savedCursor, result.entries.length - 1);
        }
      }
      setState('cursor', newCursor);

      setState('loading', false);
      return true;
    }

    setState('error', formatAppError(result.error));
    setState('loading', false);
    return false;
  };

  const setCursor = (index: number) => {
    if (state.loading || state.entries.length === 0) return;
    const clamped = Math.max(0, Math.min(index, state.entries.length - 1));
    setState('cursor', clamped);
  };

  const actions: PaneActions = {
    navigateTo: async (dirPath: string) => {
      if (state.path && state.path !== dirPath) {
        saveCursorPosition();
        const lastBack = state.backStack.at(-1);
        if (lastBack !== state.path) {
          setState('backStack', [...state.backStack, state.path]);
        }
        setState('forwardStack', []);
      }
      await loadDirectory(dirPath, true);
    },
    refresh: async () => {
      if (state.path) {
        await loadDirectory(state.path);
      }
    },
    initialize: async () => {
      const initialDir = await service.getInitialDirectory();
      await loadDirectory(initialDir);
    },
    setCursor,
    goBack: async () => {
      if (state.backStack.length === 0) return;
      saveCursorPosition();
      const newBackStack = [...state.backStack];
      const prevPath = newBackStack.pop()!;
      setState('backStack', newBackStack);
      setState('forwardStack', [...state.forwardStack, state.path]);
      await loadDirectory(prevPath, true);
    },
    goForward: async () => {
      if (state.forwardStack.length === 0) return;
      saveCursorPosition();
      const newForwardStack = [...state.forwardStack];
      const nextPath = newForwardStack.pop()!;
      setState('forwardStack', newForwardStack);
      setState('backStack', [...state.backStack, state.path]);
      await loadDirectory(nextPath, true);
    }
  };

  return [state, actions];
}
