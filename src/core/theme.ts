import { createSignal, onCleanup } from 'solid-js';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'vibecommander-theme';

export interface ThemeStore {
  mode: () => ThemeMode;
  resolved: () => ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

export interface ThemeStoreOptions {
  getSystemTheme?: () => ResolvedTheme;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  applyTheme?: (mode: ThemeMode) => void;
  watchSystemTheme?: (callback: (theme: ResolvedTheme) => void) => () => void;
}

function defaultGetSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function defaultApplyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-dark');
  if (mode !== 'system') {
    root.classList.add(`theme-${mode}`);
  }
}

function noop() {
  void 0;
}

function defaultWatchSystemTheme(callback: (theme: ResolvedTheme) => void): () => void {
  if (typeof window === 'undefined') return noop;
  const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'light' : 'dark');
  };
  mediaQuery.addEventListener('change', handler);
  return () => {
    mediaQuery.removeEventListener('change', handler);
  };
}

function defaultStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage;
}

export function createThemeStore(options: ThemeStoreOptions = {}): ThemeStore {
  const getSystem = options.getSystemTheme ?? defaultGetSystemTheme;
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const applyTheme = options.applyTheme ?? defaultApplyTheme;
  const watchSystemTheme = options.watchSystemTheme ?? defaultWatchSystemTheme;

  const storedValue = storage?.getItem(STORAGE_KEY);
  const initialMode: ThemeMode =
    storedValue === 'light' || storedValue === 'dark' || storedValue === 'system'
      ? storedValue
      : 'system';

  const [mode, setModeInternal] = createSignal<ThemeMode>(initialMode);
  const [systemTheme, setSystemTheme] = createSignal<ResolvedTheme>(getSystem());

  const resolved = () => {
    const currentMode = mode();
    return currentMode === 'system' ? systemTheme() : currentMode;
  };

  const setMode = (newMode: ThemeMode) => {
    setModeInternal(newMode);
    storage?.setItem(STORAGE_KEY, newMode);
    applyTheme(newMode);
  };

  const toggle = () => {
    const current = resolved();
    setMode(current === 'dark' ? 'light' : 'dark');
  };

  const cleanup = watchSystemTheme((theme) => {
    setSystemTheme(theme);
    if (mode() === 'system') {
      applyTheme('system');
    }
  });

  onCleanup(cleanup);

  applyTheme(mode());

  return { mode, resolved, setMode, toggle };
}

let globalThemeStore: ThemeStore | null = null;

export function getThemeStore(): ThemeStore {
  globalThemeStore ??= createThemeStore();
  return globalThemeStore;
}

export function initializeTheme(): ThemeStore {
  return getThemeStore();
}
