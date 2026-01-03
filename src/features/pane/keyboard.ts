import type { DirectoryService } from './directory-service';
import type { PaneActions, PaneState } from './store';

import { isNavigableDirectory } from './file-list';
import { formatAppError } from './format-error';

const PAGE_SIZE = 15;

export function getParentPath(path: string): string | null {
  const normalized = path.replace(/\/+$/, '');
  if (normalized === '' || normalized === '/') return null;
  const parent = normalized.slice(0, normalized.lastIndexOf('/')) || '/';
  return parent;
}

export interface KeyboardHandlerOptions {
  state: PaneState;
  actions: PaneActions;
  service: DirectoryService;
  setError: (error: string | null) => void;
}

export function createKeyboardHandler(options: KeyboardHandlerOptions) {
  const { state, actions, service, setError } = options;

  return async (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        actions.setCursor(state.cursor - 1);
        break;

      case 'ArrowDown':
        e.preventDefault();
        actions.setCursor(state.cursor + 1);
        break;

      case 'Home':
        e.preventDefault();
        actions.setCursor(0);
        break;

      case 'End':
        e.preventDefault();
        actions.setCursor(state.entries.length - 1);
        break;

      case 'PageUp':
        e.preventDefault();
        actions.setCursor(state.cursor - PAGE_SIZE);
        break;

      case 'PageDown':
        e.preventDefault();
        actions.setCursor(state.cursor + PAGE_SIZE);
        break;

      case 'Enter': {
        e.preventDefault();
        const entry = state.entries[state.cursor];
        if (!entry) break;
        if (isNavigableDirectory(entry)) {
          await actions.navigateTo(entry.path);
        } else if (entry.type === 'File' || entry.type === 'Symlink') {
          const result = await service.openFile(entry.path);
          if (!result.ok) {
            setError(formatAppError(result.error));
          }
        }
        break;
      }

      case 'Backspace': {
        e.preventDefault();
        const parent = getParentPath(state.path);
        if (parent) {
          await actions.navigateTo(parent);
        }
        break;
      }

      case 'ArrowLeft':
        if (e.altKey) {
          e.preventDefault();
          await actions.goBack();
        }
        break;

      case 'ArrowRight':
        if (e.altKey) {
          e.preventDefault();
          await actions.goForward();
        }
        break;

      default:
        break;
    }
  };
}
