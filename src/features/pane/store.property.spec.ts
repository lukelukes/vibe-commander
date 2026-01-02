import type { FileEntry } from '#tauri-bindings/index';

import { createMockFileEntry } from '#testing/mock-ipc-factory';
import * as fc from 'fast-check';
import { createRoot } from 'solid-js';
/* oxlint-disable no-await-in-loop, no-unused-vars, unicorn/prefer-at, unicorn/no-array-sort, typescript-eslint/require-await */
import { describe, it, expect, vi } from 'vitest';

import type { DirectoryService, ListDirectoryResult } from './directory-service';

import { createPaneStore } from './store';

type NavigationCommand =
  | { type: 'navigateTo'; path: string }
  | { type: 'goBack' }
  | { type: 'goForward' }
  | { type: 'setCursor'; index: number };

interface NavigationModel {
  path: string;
  backStack: string[];
  forwardStack: string[];
  cursor: number;
  entriesLength: number;
}

function validFileName(): fc.Arbitrary<string> {
  return fc.stringMatching(/^[a-zA-Z0-9_.-]+$/).filter((s) => s.length > 0 && s.length < 30);
}

function fileEntryArbitrary(basePath: string): fc.Arbitrary<FileEntry> {
  return fc.oneof(
    validFileName().map((name) =>
      createMockFileEntry('File', { name, path: `${basePath}/${name}` })
    ),
    validFileName().map((name) =>
      createMockFileEntry('Directory', { name, path: `${basePath}/${name}` })
    )
  );
}

function sortEntries(entries: FileEntry[]): FileEntry[] {
  return [...entries].sort((a, b) => {
    const aIsDir = a.type === 'Directory';
    const bIsDir = b.type === 'Directory';
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
}

function createMockService(entriesMap: Map<string, FileEntry[]>): DirectoryService {
  return {
    listDirectory: vi
      .fn()
      .mockImplementation(async (path: string): Promise<ListDirectoryResult> => {
        const entries = entriesMap.get(path) ?? [];
        return { ok: true, entries: sortEntries(entries) };
      }),
    getInitialDirectory: vi.fn().mockResolvedValue('/home/user'),
    openFile: vi.fn().mockResolvedValue(null)
  };
}

function clampCursor(index: number, entriesLength: number): number {
  if (entriesLength === 0) return -1;
  return Math.max(0, Math.min(index, entriesLength - 1));
}

function modelNavigateTo(
  model: NavigationModel,
  newPath: string,
  newEntriesLength: number
): NavigationModel {
  const shouldPushToBack = model.path && model.path !== newPath;
  const lastBack = model.backStack[model.backStack.length - 1];
  const shouldAddToStack = shouldPushToBack && lastBack !== model.path;
  return {
    path: newPath,
    backStack: shouldAddToStack ? [...model.backStack, model.path] : model.backStack,
    forwardStack: shouldPushToBack ? [] : model.forwardStack,
    cursor: newEntriesLength > 0 ? 0 : -1,
    entriesLength: newEntriesLength
  };
}

function modelGoBack(
  model: NavigationModel,
  entriesLengthForPath: (p: string) => number
): NavigationModel | null {
  if (model.backStack.length === 0) return null;
  const newBack = [...model.backStack];
  const prevPath = newBack.pop()!;
  const length = entriesLengthForPath(prevPath);
  return {
    path: prevPath,
    backStack: newBack,
    forwardStack: [...model.forwardStack, model.path],
    cursor: clampCursor(0, length),
    entriesLength: length
  };
}

function modelGoForward(
  model: NavigationModel,
  entriesLengthForPath: (p: string) => number
): NavigationModel | null {
  if (model.forwardStack.length === 0) return null;
  const newForward = [...model.forwardStack];
  const nextPath = newForward.pop()!;
  const length = entriesLengthForPath(nextPath);
  return {
    path: nextPath,
    backStack: [...model.backStack, model.path],
    forwardStack: newForward,
    cursor: clampCursor(0, length),
    entriesLength: length
  };
}

function modelSetCursor(model: NavigationModel, index: number): NavigationModel {
  return {
    ...model,
    cursor: clampCursor(index, model.entriesLength)
  };
}

function unwrapError(err: unknown): Error {
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

describe('PaneStore Property-Based Tests', () => {
  describe('Invariance Properties', () => {
    it('P1: cursor is always within bounds after any setCursor', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fileEntryArbitrary('/test'), { maxLength: 50 }),
          fc.array(fc.integer({ min: -100, max: 100 }), {
            minLength: 1,
            maxLength: 10
          }),
          async (entries, cursorValues) => {
            const entriesMap = new Map([['/test', entries]]);
            const service = createMockService(entriesMap);

            await withReactiveRoot(
              () => createPaneStore({ directoryService: service }),
              async ([state, actions]) => {
                await actions.navigateTo('/test');

                for (const cursor of cursorValues) {
                  actions.setCursor(cursor);

                  if (state.entries.length === 0) {
                    expect(state.cursor).toBe(-1);
                  } else {
                    expect(state.cursor).toBeGreaterThanOrEqual(0);
                    expect(state.cursor).toBeLessThan(state.entries.length);
                  }
                }
              }
            );
          }
        ),
        { numRuns: 50, timeout: 30000 }
      );
    }, 60000);

    it('P2: entries are always sorted (dirs first, then alphabetical)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fileEntryArbitrary('/test'), { minLength: 2, maxLength: 30 }),
          async (entries) => {
            const entriesMap = new Map([['/test', entries]]);
            const service = createMockService(entriesMap);

            await withReactiveRoot(
              () => createPaneStore({ directoryService: service }),
              async ([state, actions]) => {
                await actions.navigateTo('/test');

                for (let i = 0; i < state.entries.length - 1; i++) {
                  const a = state.entries[i]!;
                  const b = state.entries[i + 1]!;
                  const aIsDir = a.type === 'Directory';
                  const bIsDir = b.type === 'Directory';

                  if (aIsDir && !bIsDir) {
                    continue;
                  }
                  if (!aIsDir && bIsDir) {
                    throw new Error(`File "${a.name}" appears before directory "${b.name}"`);
                  }
                  const cmp = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
                  expect(cmp).toBeLessThanOrEqual(0);
                }
              }
            );
          }
        ),
        { numRuns: 50, timeout: 30000 }
      );
    }, 60000);
  });

  describe('Inverse Relationships', () => {
    it('P4: navigation sequence is reversible via goBack', async () => {
      const pathArb = fc.constantFrom('/a', '/b', '/c', '/d', '/e');

      await fc.assert(
        fc.asyncProperty(
          fc
            .array(pathArb, { minLength: 2, maxLength: 4 })
            .filter((paths) => new Set(paths).size === paths.length),
          async (paths) => {
            const entriesMap = new Map<string, FileEntry[]>();
            for (const p of paths) {
              entriesMap.set(p, [
                createMockFileEntry('File', { name: 'test.txt', path: `${p}/test.txt` })
              ]);
            }
            const service = createMockService(entriesMap);

            await withReactiveRoot(
              () => createPaneStore({ directoryService: service }),
              async ([state, actions]) => {
                for (const p of paths) {
                  await actions.navigateTo(p);
                }
                const finalPath = state.path;
                expect(finalPath).toBe(paths[paths.length - 1]);

                for (let i = 0; i < paths.length - 1; i++) {
                  await actions.goBack();
                }
                expect(state.path).toBe(paths[0]);

                for (let i = 0; i < paths.length - 1; i++) {
                  await actions.goForward();
                }
                expect(state.path).toBe(finalPath);
              }
            );
          }
        ),
        { numRuns: 30, timeout: 30000 }
      );
    }, 60000);

    it('P5: goBack then goForward returns to same path', async () => {
      const entriesMap = new Map<string, FileEntry[]>([
        ['/a', [createMockFileEntry('File', { name: 'a.txt', path: '/a/a.txt' })]],
        ['/b', [createMockFileEntry('File', { name: 'b.txt', path: '/b/b.txt' })]]
      ]);
      const service = createMockService(entriesMap);

      await withReactiveRoot(
        () => createPaneStore({ directoryService: service }),
        async ([state, actions]) => {
          await actions.navigateTo('/a');
          await actions.navigateTo('/b');

          const beforeBack = state.path;
          await actions.goBack();
          await actions.goForward();

          expect(state.path).toBe(beforeBack);
        }
      );
    });
  });

  describe('Idempotence', () => {
    it('P6: setCursor is idempotent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fileEntryArbitrary('/test'), { minLength: 1, maxLength: 20 }),
          fc.integer({ min: -10, max: 50 }),
          async (entries, cursorVal) => {
            const entriesMap = new Map([['/test', entries]]);
            const service = createMockService(entriesMap);

            await withReactiveRoot(
              () => createPaneStore({ directoryService: service }),
              async ([state, actions]) => {
                await actions.navigateTo('/test');

                actions.setCursor(cursorVal);
                const afterFirst = state.cursor;
                actions.setCursor(cursorVal);
                const afterSecond = state.cursor;

                expect(afterFirst).toBe(afterSecond);
              }
            );
          }
        ),
        { numRuns: 50, timeout: 30000 }
      );
    }, 60000);
  });

  describe('Metamorphic Relations', () => {
    it('P8: large cursor clamps to last index', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fileEntryArbitrary('/test'), { minLength: 1, maxLength: 20 }),
          fc.integer({ min: 100, max: 1000 }),
          async (entries, largeCursor) => {
            const entriesMap = new Map([['/test', entries]]);
            const service = createMockService(entriesMap);

            await withReactiveRoot(
              () => createPaneStore({ directoryService: service }),
              async ([state, actions]) => {
                await actions.navigateTo('/test');
                actions.setCursor(largeCursor);
                expect(state.cursor).toBe(state.entries.length - 1);
              }
            );
          }
        ),
        { numRuns: 30, timeout: 30000 }
      );
    }, 60000);

    it('P8b: negative cursor clamps to 0', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fileEntryArbitrary('/test'), { minLength: 1, maxLength: 20 }),
          fc.integer({ min: -1000, max: -1 }),
          async (entries, negativeCursor) => {
            const entriesMap = new Map([['/test', entries]]);
            const service = createMockService(entriesMap);

            await withReactiveRoot(
              () => createPaneStore({ directoryService: service }),
              async ([state, actions]) => {
                await actions.navigateTo('/test');
                actions.setCursor(negativeCursor);
                expect(state.cursor).toBe(0);
              }
            );
          }
        ),
        { numRuns: 30, timeout: 30000 }
      );
    }, 60000);
  });

  describe('Conservation', () => {
    it('P11: navigateTo always increases backStack by 1', async () => {
      const pathArb = fc.constantFrom('/a', '/b', '/c', '/d');

      await fc.assert(
        fc.asyncProperty(
          fc.array(pathArb, { minLength: 2, maxLength: 5 }).filter((paths) => {
            for (let i = 1; i < paths.length; i++) {
              const curr = paths[i];
              if (curr === paths[i - 1]) return false;
            }
            return true;
          }),
          async (paths) => {
            const entriesMap = new Map<string, FileEntry[]>();
            for (const p of paths) {
              entriesMap.set(p, [
                createMockFileEntry('File', { name: 'f.txt', path: `${p}/f.txt` })
              ]);
            }
            const service = createMockService(entriesMap);

            await withReactiveRoot(
              () => createPaneStore({ directoryService: service }),
              async ([state, actions]) => {
                for (let i = 0; i < paths.length; i++) {
                  const beforeSize = state.backStack.length;
                  await actions.navigateTo(paths[i]!);
                  const afterSize = state.backStack.length;

                  if (i === 0) {
                    expect(afterSize).toBe(0);
                  } else {
                    expect(afterSize).toBe(beforeSize + 1);
                  }
                }

                expect(state.forwardStack.length).toBe(0);
              }
            );
          }
        ),
        { numRuns: 30, timeout: 30000 }
      );
    }, 60000);

    it('P12: cursor position is restored when navigating back', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 0, max: 30 }),
          async (entriesCountA, entriesCountB, savedCursor) => {
            const entriesA = Array.from({ length: entriesCountA }, (_, i) =>
              createMockFileEntry('File', { name: `file${i}.txt`, path: `/a/file${i}.txt` })
            );
            const entriesB = Array.from({ length: entriesCountB }, (_, i) =>
              createMockFileEntry('File', { name: `file${i}.txt`, path: `/b/file${i}.txt` })
            );

            const entriesMap = new Map<string, FileEntry[]>([
              ['/a', entriesA],
              ['/b', entriesB]
            ]);
            const service = createMockService(entriesMap);

            await withReactiveRoot(
              () => createPaneStore({ directoryService: service }),
              async ([state, actions]) => {
                await actions.navigateTo('/a');
                actions.setCursor(savedCursor);
                const actualSavedCursor = state.cursor;

                await actions.navigateTo('/b');
                expect(state.path).toBe('/b');

                await actions.goBack();
                expect(state.path).toBe('/a');

                const expectedCursor = Math.min(actualSavedCursor, entriesCountA - 1);
                expect(state.cursor).toBe(expectedCursor);
              }
            );
          }
        ),
        { numRuns: 50, timeout: 30000 }
      );
    }, 60000);

    it('P12b: cursor clamps when list shrinks between visits', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 10, max: 20 }),
          fc.integer({ min: 1, max: 5 }),
          async (initialCount, shrunkCount) => {
            let visitCount = 0;
            const entriesMap = new Map<string, FileEntry[]>();

            const dynamicService: DirectoryService = {
              listDirectory: vi.fn().mockImplementation(async (path: string) => {
                if (path === '/a') {
                  visitCount++;
                  const count = visitCount === 1 ? initialCount : shrunkCount;
                  const entries = Array.from({ length: count }, (_, i) =>
                    createMockFileEntry('File', { name: `f${i}.txt`, path: `/a/f${i}.txt` })
                  );
                  return { ok: true, entries: sortEntries(entries) };
                }
                return {
                  ok: true,
                  entries: [createMockFileEntry('File', { name: 'x.txt', path: '/b/x.txt' })]
                };
              }),
              getInitialDirectory: vi.fn().mockResolvedValue('/home'),
              openFile: vi.fn().mockResolvedValue(null)
            };

            await withReactiveRoot(
              () => createPaneStore({ directoryService: dynamicService }),
              async ([state, actions]) => {
                await actions.navigateTo('/a');
                const highCursor = initialCount - 1;
                actions.setCursor(highCursor);
                expect(state.cursor).toBe(highCursor);

                await actions.navigateTo('/b');
                await actions.goBack();

                expect(state.cursor).toBe(shrunkCount - 1);
              }
            );
          }
        ),
        { numRuns: 30, timeout: 30000 }
      );
    }, 60000);
  });

  describe('Model-Based Testing', () => {
    it('navigation state matches model after random command sequences', async () => {
      const pathArb = fc.constantFrom('/a', '/b', '/c');

      const commandArb = fc.oneof(
        pathArb.map((p) => ({ type: 'navigateTo' as const, path: p })),
        fc.constant({ type: 'goBack' as const }),
        fc.constant({ type: 'goForward' as const }),
        fc.integer({ min: -5, max: 20 }).map((i) => ({ type: 'setCursor' as const, index: i }))
      );

      await fc.assert(
        fc.asyncProperty(
          fc.array(commandArb, { minLength: 3, maxLength: 10 }),
          async (commands) => {
            const entriesMap = new Map<string, FileEntry[]>();
            const getEntriesLength = (p: string): number => {
              if (!entriesMap.has(p)) {
                entriesMap.set(p, [
                  createMockFileEntry('File', { name: 'a.txt', path: `${p}/a.txt` }),
                  createMockFileEntry('Directory', { name: 'sub', path: `${p}/sub` })
                ]);
              }
              return entriesMap.get(p)!.length;
            };
            for (const p of ['/a', '/b', '/c']) {
              getEntriesLength(p);
            }
            const service = createMockService(entriesMap);

            await withReactiveRoot(
              () => createPaneStore({ directoryService: service }),
              async ([state, actions]) => {
                let model: NavigationModel = {
                  path: '',
                  backStack: [],
                  forwardStack: [],
                  cursor: -1,
                  entriesLength: 0
                };

                for (const cmd of commands) {
                  if (cmd.type === 'navigateTo') {
                    const len = getEntriesLength(cmd.path);
                    model = modelNavigateTo(model, cmd.path, len);
                    await actions.navigateTo(cmd.path);
                  } else if (cmd.type === 'goBack') {
                    const newModel = modelGoBack(model, getEntriesLength);
                    if (newModel) {
                      model = newModel;
                      await actions.goBack();
                    }
                  } else if (cmd.type === 'goForward') {
                    const newModel = modelGoForward(model, getEntriesLength);
                    if (newModel) {
                      model = newModel;
                      await actions.goForward();
                    }
                  } else if (cmd.type === 'setCursor') {
                    model = modelSetCursor(model, cmd.index);
                    actions.setCursor(cmd.index);
                  }
                }

                expect(state.path).toBe(model.path);
                expect(state.backStack).toEqual(model.backStack);
                expect(state.forwardStack).toEqual(model.forwardStack);
              }
            );
          }
        ),
        { numRuns: 100, timeout: 60000 }
      );
    }, 120000);
  });
});
