import type { AppError, FileEntry } from '#tauri-bindings/index';

import { mockIPC } from '@tauri-apps/api/mocks';

export type IPCResponse<T> = T | (() => T) | (() => Promise<T>);

export interface MockIPCConfig {
  homeDir?: string;
  listDirectoryResponses?: IPCResponse<FileEntry[] | AppError>[];
  onCommand?: (cmd: string, args: Record<string, unknown>) => unknown;
}

export function createMockIPC(config: MockIPCConfig = {}): void {
  const { homeDir = '/home/test', listDirectoryResponses = [], onCommand } = config;

  let listDirectoryCallIndex = 0;

  mockIPC((cmd, args) => {
    if (onCommand) {
      const result = onCommand(cmd, args as Record<string, unknown>);
      if (result !== undefined) return result;
    }

    if (cmd === 'plugin:path|resolve_directory') {
      return homeDir;
    }

    if (cmd === 'get_initial_directory') {
      return homeDir;
    }

    if (cmd === 'list_directory') {
      if (listDirectoryResponses.length === 0) {
        return [];
      }

      const responseIndex = Math.min(listDirectoryCallIndex, listDirectoryResponses.length - 1);
      const response = listDirectoryResponses[responseIndex];
      listDirectoryCallIndex++;

      const value = typeof response === 'function' ? response() : response;

      if (isAppError(value)) {
        // oxlint-disable-next-line only-throw-error -- TODO: fix this later
        throw value;
      }

      return value;
    }

    return undefined;
  });
}

const APP_ERROR_TYPES = [
  'Io',
  'PermissionDenied',
  'NotFound',
  'InvalidPath',
  'OpenFailed'
] as const;

function isAppError(value: unknown): value is AppError {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    APP_ERROR_TYPES.includes((value as AppError).type)
  );
}

export function createAppError<T extends AppError['type']>(
  type: T,
  details: Omit<Extract<AppError, { type: T }>, 'type'>
): AppError {
  return { path: '', type, ...details } as AppError;
}

type FileEntryType = FileEntry['type'];

type FileEntryOverrides = {
  name?: string;
  path?: string;
  size?: number;
  modified?: number | null;
  target?: string;
  target_is_dir?: boolean;
  reason?: string;
};

export function createMockFileEntry(
  variant: FileEntryType = 'File',
  overrides: FileEntryOverrides = {}
): FileEntry {
  const base = {
    name: overrides.name ?? 'file.txt',
    path: overrides.path ?? '/home/test/file.txt'
  };

  switch (variant) {
    case 'File':
      return {
        type: 'File',
        ...base,
        size: overrides.size ?? 1024,
        modified: overrides.modified ?? 1703836800
      };
    case 'Directory':
      return {
        type: 'Directory',
        ...base,
        modified: overrides.modified ?? 1703836800
      };
    case 'Symlink':
      return {
        type: 'Symlink',
        ...base,
        size: overrides.size ?? 1024,
        modified: overrides.modified ?? 1703836800,
        target: overrides.target ?? '/home/test/target',
        target_is_dir: overrides.target_is_dir ?? false
      };
    case 'Unreadable':
      return {
        type: 'Unreadable',
        ...base,
        reason: overrides.reason ?? 'Permission denied'
      };
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}

export function pendingForever<T = never>(): Promise<T> {
  return new Promise(() => {});
}
