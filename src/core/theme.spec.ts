import { createRoot } from 'solid-js';
import { describe, it, expect, vi } from 'vitest';

import { createThemeStore, type ThemeMode, type ResolvedTheme } from './theme';

function createMockStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    _set: (key: string, value: string) => {
      store[key] = value;
    }
  };
}

function createTestStore(opts: { storedTheme?: ThemeMode; systemTheme?: ResolvedTheme }) {
  const storage = createMockStorage();
  if (opts.storedTheme) {
    storage._set('vibecommander-theme', opts.storedTheme);
  }

  const applyTheme = vi.fn();

  const store = createThemeStore({
    storage,
    getSystemTheme: () => opts.systemTheme ?? 'dark',
    applyTheme,
    watchSystemTheme: () => () => {}
  });

  return { store, storage, applyTheme };
}

describe('createThemeStore', () => {
  it('defaults to system mode when no stored preference', () => {
    createRoot((dispose) => {
      const { store } = createTestStore({ systemTheme: 'dark' });
      expect(store.mode()).toBe('system');
      dispose();
    });
  });

  it('restores stored theme mode from storage', () => {
    createRoot((dispose) => {
      const { store } = createTestStore({ storedTheme: 'light', systemTheme: 'dark' });
      expect(store.mode()).toBe('light');
      dispose();
    });
  });

  it('resolves system mode to system theme', () => {
    createRoot((dispose) => {
      const { store } = createTestStore({ systemTheme: 'light' });
      expect(store.mode()).toBe('system');
      expect(store.resolved()).toBe('light');
      dispose();
    });
  });

  it('resolves explicit light mode to light', () => {
    createRoot((dispose) => {
      const { store } = createTestStore({ systemTheme: 'dark' });
      store.setMode('light');
      expect(store.resolved()).toBe('light');
      dispose();
    });
  });

  it('resolves explicit dark mode to dark', () => {
    createRoot((dispose) => {
      const { store } = createTestStore({ systemTheme: 'light' });
      store.setMode('dark');
      expect(store.resolved()).toBe('dark');
      dispose();
    });
  });

  it('persists theme mode to storage', () => {
    createRoot((dispose) => {
      const { store, storage } = createTestStore({ systemTheme: 'dark' });
      store.setMode('light');
      expect(storage.setItem).toHaveBeenCalledWith('vibecommander-theme', 'light');
      dispose();
    });
  });

  it('applies light theme when mode is light', () => {
    createRoot((dispose) => {
      const { store, applyTheme } = createTestStore({ systemTheme: 'dark' });
      applyTheme.mockClear();
      store.setMode('light');
      expect(applyTheme).toHaveBeenCalledWith('light');
      dispose();
    });
  });

  it('applies dark theme when mode is dark', () => {
    createRoot((dispose) => {
      const { store, applyTheme } = createTestStore({ systemTheme: 'light' });
      applyTheme.mockClear();
      store.setMode('dark');
      expect(applyTheme).toHaveBeenCalledWith('dark');
      dispose();
    });
  });

  it('applies system theme when mode is system', () => {
    createRoot((dispose) => {
      const { store, applyTheme } = createTestStore({ storedTheme: 'light', systemTheme: 'dark' });
      applyTheme.mockClear();
      store.setMode('system');
      expect(applyTheme).toHaveBeenCalledWith('system');
      dispose();
    });
  });

  it('toggle switches from dark to light', () => {
    createRoot((dispose) => {
      const { store } = createTestStore({ systemTheme: 'dark' });
      store.toggle();
      expect(store.mode()).toBe('light');
      expect(store.resolved()).toBe('light');
      dispose();
    });
  });

  it('toggle switches from light to dark', () => {
    createRoot((dispose) => {
      const { store } = createTestStore({ storedTheme: 'light', systemTheme: 'dark' });
      store.toggle();
      expect(store.mode()).toBe('dark');
      expect(store.resolved()).toBe('dark');
      dispose();
    });
  });

  it('toggle switches based on resolved theme when in system mode', () => {
    createRoot((dispose) => {
      const { store } = createTestStore({ systemTheme: 'light' });
      expect(store.mode()).toBe('system');
      expect(store.resolved()).toBe('light');
      store.toggle();
      expect(store.mode()).toBe('dark');
      dispose();
    });
  });

  it('ignores invalid stored values', () => {
    createRoot((dispose) => {
      const storage = createMockStorage();
      storage._set('vibecommander-theme', 'invalid-value');

      const store = createThemeStore({
        storage,
        getSystemTheme: () => 'dark',
        applyTheme: () => {},
        watchSystemTheme: () => () => {}
      });

      expect(store.mode()).toBe('system');
      dispose();
    });
  });

  it('applies initial theme on creation', () => {
    createRoot((dispose) => {
      const { applyTheme } = createTestStore({ storedTheme: 'light', systemTheme: 'dark' });
      expect(applyTheme).toHaveBeenCalledWith('light');
      dispose();
    });
  });
});
