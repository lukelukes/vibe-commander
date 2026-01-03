import { createMockFileEntry } from '#testing/mock-ipc-factory';
import { withReactiveRoot } from '#testing/test-utils';
import { vi, describe, it, expect } from 'vitest';

import type { DirectoryService, ListDirectoryResult } from './directory-service';

import { createPaneStore } from './store';

function createMockService(overrides: Partial<DirectoryService> = {}): DirectoryService {
  return {
    listDirectory: vi.fn().mockResolvedValue({ ok: true, entries: [] }),
    getInitialDirectory: vi.fn().mockResolvedValue('/home/user'),
    openFile: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides
  };
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

  describe('cursor management', () => {
    it('setCursor clamps index to valid range', async () => {
      const entries = [
        createMockFileEntry('File', { name: 'a.txt', path: '/a.txt', size: 100, modified: 1000 }),
        createMockFileEntry('File', { name: 'b.txt', path: '/b.txt', size: 100, modified: 1000 }),
        createMockFileEntry('File', { name: 'c.txt', path: '/c.txt', size: 100, modified: 1000 })
      ];

      const service = createMockService({
        listDirectory: vi.fn().mockResolvedValue({ ok: true, entries })
      });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.initialize();

          actions.setCursor(10);
          expect(state.cursor).toBe(2);

          actions.setCursor(-5);
          expect(state.cursor).toBe(0);
        }
      );
    });

    it('setCursor does nothing while loading', async () => {
      const service = createMockService();

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        ([state, actions]) => {
          expect(state.loading).toBe(true);
          actions.setCursor(5);
          expect(state.cursor).toBe(-1);
        }
      );
    });

    it('cursor resets to 0 on navigation to new directory', async () => {
      const entries = [
        createMockFileEntry('File', { name: 'a.txt', path: '/a.txt', size: 100, modified: 1000 }),
        createMockFileEntry('File', { name: 'b.txt', path: '/b.txt', size: 100, modified: 1000 })
      ];

      const service = createMockService({
        listDirectory: vi.fn().mockResolvedValue({ ok: true, entries })
      });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.initialize();

          actions.setCursor(1);
          expect(state.cursor).toBe(1);

          await actions.navigateTo('/other');
          expect(state.cursor).toBe(0);
        }
      );
    });

    it('cursor is -1 for empty directories', async () => {
      const service = createMockService({
        listDirectory: vi.fn().mockResolvedValue({ ok: true, entries: [] })
      });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.initialize();

          expect(state.cursor).toBe(-1);
        }
      );
    });

    it('setCursor does nothing when entries is empty', async () => {
      const service = createMockService({
        listDirectory: vi.fn().mockResolvedValue({ ok: true, entries: [] })
      });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.initialize();

          expect(state.cursor).toBe(-1);
          actions.setCursor(0);
          expect(state.cursor).toBe(-1);
          actions.setCursor(5);
          expect(state.cursor).toBe(-1);
        }
      );
    });

    it('setCursor sets cursor correctly within valid range', async () => {
      const entries = [
        createMockFileEntry('File', { name: 'a.txt', path: '/a.txt', size: 100, modified: 1000 }),
        createMockFileEntry('File', { name: 'b.txt', path: '/b.txt', size: 100, modified: 1000 }),
        createMockFileEntry('File', { name: 'c.txt', path: '/c.txt', size: 100, modified: 1000 }),
        createMockFileEntry('File', { name: 'd.txt', path: '/d.txt', size: 100, modified: 1000 })
      ];

      const service = createMockService({
        listDirectory: vi.fn().mockResolvedValue({ ok: true, entries })
      });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.initialize();

          actions.setCursor(0);
          expect(state.cursor).toBe(0);

          actions.setCursor(2);
          expect(state.cursor).toBe(2);

          actions.setCursor(3);
          expect(state.cursor).toBe(3);
        }
      );
    });
  });

  describe('navigation history', () => {
    it('navigateTo adds current path to backStack', async () => {
      const entries = [
        createMockFileEntry('Directory', { name: 'sub', path: '/sub', modified: 1000 })
      ];

      const service = createMockService({
        listDirectory: vi.fn().mockResolvedValue({ ok: true, entries })
      });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.initialize();

          expect(state.backStack).toEqual([]);
          await actions.navigateTo('/sub');
          expect(state.backStack).toEqual(['/home/user']);
        }
      );
    });

    it('navigateTo clears forwardStack', async () => {
      const entries = [createMockFileEntry('Directory', { name: 'a', path: '/a', modified: 1000 })];

      const service = createMockService({
        listDirectory: vi.fn().mockResolvedValue({ ok: true, entries })
      });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.initialize();

          await actions.navigateTo('/a');
          await actions.goBack();
          expect(state.forwardStack.length).toBeGreaterThan(0);

          await actions.navigateTo('/new');
          expect(state.forwardStack).toEqual([]);
        }
      );
    });

    it('goBack navigates to previous directory', async () => {
      const service = createMockService({
        listDirectory: vi.fn().mockResolvedValue({ ok: true, entries: [] })
      });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.initialize();

          const initialPath = state.path;
          await actions.navigateTo('/other');
          expect(state.path).toBe('/other');

          await actions.goBack();
          expect(state.path).toBe(initialPath);
        }
      );
    });

    it('goBack moves current path to forwardStack', async () => {
      const service = createMockService({
        listDirectory: vi.fn().mockResolvedValue({ ok: true, entries: [] })
      });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.initialize();

          await actions.navigateTo('/other');
          await actions.goBack();
          expect(state.forwardStack).toContain('/other');
        }
      );
    });

    it('goBack does nothing with empty backStack', async () => {
      const service = createMockService({
        listDirectory: vi.fn().mockResolvedValue({ ok: true, entries: [] })
      });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.initialize();

          const initialPath = state.path;
          await actions.goBack();
          expect(state.path).toBe(initialPath);
        }
      );
    });

    it('goForward navigates to next directory after goBack', async () => {
      const service = createMockService({
        listDirectory: vi.fn().mockResolvedValue({ ok: true, entries: [] })
      });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.initialize();

          await actions.navigateTo('/other');
          await actions.goBack();
          await actions.goForward();
          expect(state.path).toBe('/other');
        }
      );
    });

    it('goForward does nothing with empty forwardStack', async () => {
      const service = createMockService({
        listDirectory: vi.fn().mockResolvedValue({ ok: true, entries: [] })
      });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.initialize();

          const initialPath = state.path;
          await actions.goForward();
          expect(state.path).toBe(initialPath);
        }
      );
    });

    it('goBack restores cursor position from cursorHistory', async () => {
      const entries = [
        createMockFileEntry('File', {
          name: 'a.txt',
          path: '/home/user/a.txt',
          size: 100,
          modified: 1000
        }),
        createMockFileEntry('File', {
          name: 'b.txt',
          path: '/home/user/b.txt',
          size: 100,
          modified: 1000
        }),
        createMockFileEntry('File', {
          name: 'c.txt',
          path: '/home/user/c.txt',
          size: 100,
          modified: 1000
        })
      ];

      const otherEntries = [
        createMockFileEntry('File', {
          name: 'x.txt',
          path: '/other/x.txt',
          size: 100,
          modified: 1000
        })
      ];

      const listDirectory = vi.fn().mockImplementation((path: string) => {
        if (path === '/home/user') {
          return Promise.resolve({ ok: true, entries });
        }
        return Promise.resolve({ ok: true, entries: otherEntries });
      });

      const service = createMockService({ listDirectory });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.initialize();
          expect(state.path).toBe('/home/user');
          expect(state.cursor).toBe(0);

          actions.setCursor(2);
          expect(state.cursor).toBe(2);

          await actions.navigateTo('/other');
          expect(state.path).toBe('/other');
          expect(state.cursor).toBe(0);

          await actions.goBack();
          expect(state.path).toBe('/home/user');
          expect(state.cursor).toBe(2);
        }
      );
    });

    it('goForward restores cursor position from cursorHistory', async () => {
      const homeEntries = [
        createMockFileEntry('File', {
          name: 'a.txt',
          path: '/home/user/a.txt',
          size: 100,
          modified: 1000
        }),
        createMockFileEntry('File', {
          name: 'b.txt',
          path: '/home/user/b.txt',
          size: 100,
          modified: 1000
        })
      ];

      const otherEntries = [
        createMockFileEntry('File', {
          name: 'x.txt',
          path: '/other/x.txt',
          size: 100,
          modified: 1000
        }),
        createMockFileEntry('File', {
          name: 'y.txt',
          path: '/other/y.txt',
          size: 100,
          modified: 1000
        }),
        createMockFileEntry('File', {
          name: 'z.txt',
          path: '/other/z.txt',
          size: 100,
          modified: 1000
        })
      ];

      const listDirectory = vi.fn().mockImplementation((path: string) => {
        if (path === '/home/user') {
          return Promise.resolve({ ok: true, entries: homeEntries });
        }
        return Promise.resolve({ ok: true, entries: otherEntries });
      });

      const service = createMockService({ listDirectory });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.initialize();

          await actions.navigateTo('/other');
          actions.setCursor(2);
          expect(state.cursor).toBe(2);

          await actions.goBack();
          expect(state.path).toBe('/home/user');

          await actions.goForward();
          expect(state.path).toBe('/other');
          expect(state.cursor).toBe(2);
        }
      );
    });

    it('navigateTo does not add duplicate consecutive paths to backStack', async () => {
      const entries = [
        createMockFileEntry('Directory', { name: 'sub', path: '/sub', modified: 1000 })
      ];

      const service = createMockService({
        listDirectory: vi.fn().mockResolvedValue({ ok: true, entries })
      });

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.initialize();

          await actions.navigateTo('/a');
          await actions.navigateTo('/a');
          await actions.navigateTo('/a');

          expect(state.backStack).toEqual(['/home/user']);
        }
      );
    });
  });
});
