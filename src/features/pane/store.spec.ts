import { createMockFileEntry } from '#testing/mock-ipc-factory';
import { createRoot } from 'solid-js';
import { vi, describe, it, expect } from 'vitest';

import type { DirectoryService, ListDirectoryResult } from './directory-service';

import { createPaneStore } from './store';

function createMockService(overrides: Partial<DirectoryService> = {}): DirectoryService {
  return {
    listDirectory: vi.fn().mockResolvedValue({ ok: true, entries: [] }),
    getInitialDirectory: vi.fn().mockResolvedValue('/home/user'),
    ...overrides
  };
}

function unwrapError(err: unknown) {
  if (err instanceof Error) return err;

  if (typeof err === 'object' && err !== null) {
    return new Error(JSON.stringify(err));
  }

  return new Error(String(err));
}

async function withReactiveRoot<T>(
  setup: () => T,
  test: (ctx: T) => Promise<void> | void
): Promise<void> {
  return new Promise((resolve, reject) => {
    createRoot(async (dispose) => {
      try {
        const ctx = setup();
        await test(ctx);
        resolve();
      } catch (e) {
        reject(unwrapError(e));
      } finally {
        dispose();
      }
    });
  });
}

describe('createPaneStore', () => {
  describe('navigateTo', () => {
    it('updates path and entries on success', async () => {
      const entries = [
        createMockFileEntry('File', { name: 'doc.txt', path: '/home/user/doc.txt' }),
        createMockFileEntry('Directory', { name: 'images', path: '/home/user/images' })
      ];

      const service = createMockService({
        listDirectory: vi.fn().mockResolvedValue({ ok: true, entries })
      });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.navigateTo('/home/user');

          expect(state.path).toBe('/home/user');
          expect(state.entries).toContainExactlyInAnyOrder(entries);
          expect(state.loading).toBe(false);
          expect(state.error).toBeNull();
        }
      );
    });

    it('sets error state for PermissionDenied error', async () => {
      const service = createMockService({
        listDirectory: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'PermissionDenied', path: '/root/secret' }
        })
      });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.navigateTo('/root/secret');

          expect(state.error).toBe('Permission denied: /root/secret');
          expect(state.loading).toBe(false);
          expect(state.path).toBe('');
          expect(state.entries).toEqual([]);
        }
      );
    });

    it('sets error state for NotFound error', async () => {
      const service = createMockService({
        listDirectory: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'NotFound', path: '/nonexistent/path' }
        })
      });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.navigateTo('/nonexistent/path');

          expect(state.error).toBe('Not found: /nonexistent/path');
          expect(state.loading).toBe(false);
        }
      );
    });

    it('sets error state for InvalidPath error', async () => {
      const service = createMockService({
        listDirectory: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'InvalidPath', message: 'Path contains invalid characters' }
        })
      });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.navigateTo('/invalid\u0000path');

          expect(state.error).toBe('Path contains invalid characters');
          expect(state.loading).toBe(false);
        }
      );
    });

    it('sets error state for Io error', async () => {
      const service = createMockService({
        listDirectory: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'Io', message: 'Device not ready', path: '/mnt/usb' }
        })
      });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.navigateTo('/mnt/usb');

          expect(state.error).toBe('Device not ready');
          expect(state.loading).toBe(false);
        }
      );
    });

    it('clears previous error on successful navigation', async () => {
      const listDirectory = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          error: { type: 'NotFound', path: '/bad/path' }
        })
        .mockResolvedValueOnce({
          ok: true,
          entries: [createMockFileEntry('File')]
        });

      const service = createMockService({ listDirectory });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.navigateTo('/bad/path');
          expect(state.error).toBe('Not found: /bad/path');

          await actions.navigateTo('/good/path');
          expect(state.error).toBeNull();
        }
      );
    });

    it('concurrent navigations resolve to last requested path', async () => {
      let resolveFirst: (value: ListDirectoryResult) => void;
      let resolveSecond: (value: ListDirectoryResult) => void;

      const firstPromise = new Promise<ListDirectoryResult>((resolve) => {
        resolveFirst = resolve;
      });
      const secondPromise = new Promise<ListDirectoryResult>((resolve) => {
        resolveSecond = resolve;
      });

      const listDirectory = vi
        .fn()
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise);

      const service = createMockService({ listDirectory });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          const firstEntry = createMockFileEntry('File', { name: 'first.txt' });
          const secondEntry = createMockFileEntry('File', { name: 'second.txt' });

          const nav1 = actions.navigateTo('/first/path');
          const nav2 = actions.navigateTo('/second/path');

          resolveSecond!({ ok: true, entries: [secondEntry] });
          resolveFirst!({ ok: true, entries: [firstEntry] });

          await Promise.all([nav1, nav2]);

          expect(state.path).toBe('/second/path');
          expect(state.entries).toContainExactlyInAnyOrder([secondEntry]);
        }
      );
    });

    it('discards stale responses when newer navigation completes first', async () => {
      let resolveStale: (value: ListDirectoryResult) => void;

      const stalePromise = new Promise<ListDirectoryResult>((resolve) => {
        resolveStale = resolve;
      });

      const currentEntry = createMockFileEntry('File', { name: 'current.txt' });
      const staleEntry = createMockFileEntry('File', { name: 'stale.txt' });

      const listDirectory = vi
        .fn()
        .mockReturnValueOnce(stalePromise)
        .mockResolvedValueOnce({ ok: true, entries: [currentEntry] });

      const service = createMockService({ listDirectory });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          const staleNav = actions.navigateTo('/stale/path');
          await actions.navigateTo('/current/path');

          expect(state.path).toBe('/current/path');
          expect(state.entries).toContainExactlyInAnyOrder([currentEntry]);

          resolveStale!({ ok: true, entries: [staleEntry] });
          await staleNav;

          expect(state.path).toBe('/current/path');
          expect(state.entries).toContainExactlyInAnyOrder([currentEntry]);
        }
      );
    });
  });

  describe('refresh', () => {
    it('re-fetches current path', async () => {
      const initialEntries = [createMockFileEntry('File', { name: 'old.txt' })];
      const updatedEntries = [
        createMockFileEntry('File', { name: 'old.txt' }),
        createMockFileEntry('File', { name: 'new.txt' })
      ];

      const listDirectory = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, entries: initialEntries })
        .mockResolvedValueOnce({ ok: true, entries: updatedEntries });

      const service = createMockService({ listDirectory });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.navigateTo('/home/user');
          expect(state.entries).toContainExactlyInAnyOrder(initialEntries);

          await actions.refresh();

          expect(state.entries).toContainExactlyInAnyOrder(updatedEntries);
        }
      );
    });

    it('does nothing when path is empty', async () => {
      const service = createMockService();

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.refresh();

          expect(service.listDirectory).not.toHaveBeenCalled();
          expect(state.path).toBe('');
        }
      );
    });

    it('sets error but preserves path when refresh fails', async () => {
      const initialEntries = [createMockFileEntry('File', { name: 'file.txt' })];

      const listDirectory = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, entries: initialEntries })
        .mockResolvedValueOnce({
          ok: false,
          error: { type: 'Io', message: 'Device disconnected', path: '/mnt/usb' }
        });

      const service = createMockService({ listDirectory });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.navigateTo('/mnt/usb');
          expect(state.path).toBe('/mnt/usb');
          expect(state.error).toBeNull();

          await actions.refresh();

          expect(state.error).toBe('Device disconnected');
          expect(state.path).toBe('/mnt/usb');
        }
      );
    });
  });

  describe('loading state', () => {
    it('sets loading to true during navigation', async () => {
      let resolvePromise: (value: ListDirectoryResult) => void;
      const pendingPromise = new Promise<ListDirectoryResult>((resolve) => {
        resolvePromise = resolve;
      });

      const service = createMockService({
        listDirectory: vi.fn().mockReturnValue(pendingPromise)
      });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          const navigationPromise = actions.navigateTo('/some/path');

          expect(state.loading).toBe(true);

          resolvePromise!({ ok: true, entries: [] });
          await navigationPromise;

          expect(state.loading).toBe(false);
        }
      );
    });
  });

  describe('initial state', () => {
    it('has correct default values', async () => {
      const service = createMockService();

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        ([state]) => {
          expect(state.path).toBe('');
          expect(state.entries).toEqual([]);
          expect(state.loading).toBe(true);
          expect(state.error).toBeNull();
        }
      );
    });
  });

  describe('initialize', () => {
    it('loads home directory', async () => {
      const homeEntries = [
        createMockFileEntry('Directory', { name: 'Documents', path: '/home/user/Documents' }),
        createMockFileEntry('File', { name: 'file.txt', path: '/home/user/file.txt' })
      ];

      const service = createMockService({
        getInitialDirectory: vi.fn().mockResolvedValue('/home/user'),
        listDirectory: vi.fn().mockResolvedValue({ ok: true, entries: homeEntries })
      });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.initialize();

          expect(state.path).toBe('/home/user');
          expect(state.entries).toContainExactlyInAnyOrder(homeEntries);
          expect(state.loading).toBe(false);
        }
      );
    });

    it('sets error when home directory is inaccessible', async () => {
      const service = createMockService({
        getInitialDirectory: vi.fn().mockResolvedValue('/home/user'),
        listDirectory: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'PermissionDenied', path: '/home/user' }
        })
      });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.initialize();

          expect(state.error).toBe('Permission denied: /home/user');
          expect(state.loading).toBe(false);
          expect(state.path).toBe('');
        }
      );
    });
  });

  describe('store independence', () => {
    it('multiple stores maintain independent state', async () => {
      const entry1 = createMockFileEntry('File', { name: 'store1.txt' });
      const entry2 = createMockFileEntry('File', { name: 'store2.txt' });

      const listDirectory1 = vi.fn().mockResolvedValue({ ok: true, entries: [entry1] });
      const listDirectory2 = vi.fn().mockResolvedValue({ ok: true, entries: [entry2] });

      const service1 = createMockService({ listDirectory: listDirectory1 });
      const service2 = createMockService({ listDirectory: listDirectory2 });

      await withReactiveRoot(
        () => ({
          store1: createPaneStore({ directoryService: service1 }),
          store2: createPaneStore({ directoryService: service2 })
        }),
        async ({ store1, store2 }) => {
          const [state1, actions1] = store1;
          const [state2, actions2] = store2;

          await actions1.navigateTo('/path/one');
          await actions2.navigateTo('/path/two');

          expect(state1.path).toBe('/path/one');
          expect(state2.path).toBe('/path/two');
          expect(state1.entries).toContainExactlyInAnyOrder([entry1]);
          expect(state2.entries).toContainExactlyInAnyOrder([entry2]);
        }
      );
    });
  });
});
