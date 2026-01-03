import type { FileEntry } from '#tauri-bindings/index';

import { createMockFileEntry } from '#testing/mock-ipc-factory';
import { describe, it, expect, vi } from 'vitest';

import type { DirectoryService } from './directory-service';
import type { PaneActions, PaneState } from './store';

import { createKeyboardHandler, getParentPath } from './keyboard';

function createMockState(overrides: Partial<PaneState> = {}): PaneState {
  return {
    path: '/home/user',
    entries: [],
    loading: false,
    error: null,
    cursor: 0,
    backStack: [],
    forwardStack: [],
    ...overrides
  };
}

function createMockActions(): PaneActions {
  return {
    navigateTo: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    initialize: vi.fn().mockResolvedValue(undefined),
    setCursor: vi.fn(),
    goBack: vi.fn().mockResolvedValue(undefined),
    goForward: vi.fn().mockResolvedValue(undefined)
  };
}

function createMockService(): DirectoryService {
  return {
    listDirectory: vi.fn().mockResolvedValue({ ok: true, entries: [] }),
    getInitialDirectory: vi.fn().mockResolvedValue('/home/user'),
    openFile: vi.fn().mockResolvedValue({ ok: true })
  };
}

function createKeyEvent(key: string, options: KeyboardEventInit = {}): KeyboardEvent {
  const div = document.createElement('div');
  const event = new KeyboardEvent('keydown', { key, ...options });
  Object.defineProperty(event, 'target', { value: div });
  return event;
}

describe('getParentPath', () => {
  it('returns parent for nested path', () => {
    expect(getParentPath('/home/user/documents')).toBe('/home/user');
  });

  it('returns root for single-level path', () => {
    expect(getParentPath('/home')).toBe('/');
  });

  it('returns null for root', () => {
    expect(getParentPath('/')).toBe(null);
  });

  it('handles trailing slashes', () => {
    expect(getParentPath('/home/user/')).toBe('/home');
  });

  it('returns null for empty string', () => {
    expect(getParentPath('')).toBe(null);
  });
});

describe('createKeyboardHandler', () => {
  const entries: FileEntry[] = [
    createMockFileEntry('Directory', { name: 'docs', path: '/docs', modified: 1000 }),
    createMockFileEntry('File', { name: 'file.txt', path: '/file.txt', size: 100, modified: 1000 }),
    createMockFileEntry('File', {
      name: 'other.txt',
      path: '/other.txt',
      size: 100,
      modified: 1000
    })
  ];

  it('ArrowDown increments cursor', async () => {
    const state = createMockState({ entries, cursor: 0 });
    const actions = createMockActions();
    const handler = createKeyboardHandler({
      state,
      actions,
      service: createMockService(),
      setError: vi.fn()
    });

    await handler(createKeyEvent('ArrowDown'));
    expect(actions.setCursor).toHaveBeenCalledWith(1);
  });

  it('ArrowUp decrements cursor', async () => {
    const state = createMockState({ entries, cursor: 1 });
    const actions = createMockActions();
    const handler = createKeyboardHandler({
      state,
      actions,
      service: createMockService(),
      setError: vi.fn()
    });

    await handler(createKeyEvent('ArrowUp'));
    expect(actions.setCursor).toHaveBeenCalledWith(0);
  });

  it('Home sets cursor to 0', async () => {
    const state = createMockState({ entries, cursor: 2 });
    const actions = createMockActions();
    const handler = createKeyboardHandler({
      state,
      actions,
      service: createMockService(),
      setError: vi.fn()
    });

    await handler(createKeyEvent('Home'));
    expect(actions.setCursor).toHaveBeenCalledWith(0);
  });

  it('End sets cursor to last entry', async () => {
    const state = createMockState({ entries, cursor: 0 });
    const actions = createMockActions();
    const handler = createKeyboardHandler({
      state,
      actions,
      service: createMockService(),
      setError: vi.fn()
    });

    await handler(createKeyEvent('End'));
    expect(actions.setCursor).toHaveBeenCalledWith(2);
  });

  it('Enter on directory navigates', async () => {
    const state = createMockState({ entries, cursor: 0 });
    const actions = createMockActions();
    const handler = createKeyboardHandler({
      state,
      actions,
      service: createMockService(),
      setError: vi.fn()
    });

    await handler(createKeyEvent('Enter'));
    expect(actions.navigateTo).toHaveBeenCalledWith('/docs');
  });

  it('Enter on file opens file', async () => {
    const state = createMockState({ entries, cursor: 1 });
    const service = createMockService();
    const handler = createKeyboardHandler({
      state,
      actions: createMockActions(),
      service,
      setError: vi.fn()
    });

    await handler(createKeyEvent('Enter'));
    expect(service.openFile).toHaveBeenCalledWith('/file.txt');
  });

  it('Backspace navigates to parent', async () => {
    const state = createMockState({ path: '/home/user', entries });
    const actions = createMockActions();
    const handler = createKeyboardHandler({
      state,
      actions,
      service: createMockService(),
      setError: vi.fn()
    });

    await handler(createKeyEvent('Backspace'));
    expect(actions.navigateTo).toHaveBeenCalledWith('/home');
  });

  it('Alt+ArrowLeft calls goBack', async () => {
    const state = createMockState({ entries });
    const actions = createMockActions();
    const handler = createKeyboardHandler({
      state,
      actions,
      service: createMockService(),
      setError: vi.fn()
    });

    await handler(createKeyEvent('ArrowLeft', { altKey: true }));
    expect(actions.goBack).toHaveBeenCalled();
  });

  it('Alt+ArrowRight calls goForward', async () => {
    const state = createMockState({ entries });
    const actions = createMockActions();
    const handler = createKeyboardHandler({
      state,
      actions,
      service: createMockService(),
      setError: vi.fn()
    });

    await handler(createKeyEvent('ArrowRight', { altKey: true }));
    expect(actions.goForward).toHaveBeenCalled();
  });

  it('ignores events when target is input', async () => {
    const state = createMockState({ entries });
    const actions = createMockActions();
    const handler = createKeyboardHandler({
      state,
      actions,
      service: createMockService(),
      setError: vi.fn()
    });

    const input = document.createElement('input');
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    Object.defineProperty(event, 'target', { value: input });

    await handler(event);
    expect(actions.setCursor).not.toHaveBeenCalled();
  });
});
