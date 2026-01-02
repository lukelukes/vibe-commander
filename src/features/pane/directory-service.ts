import { commands, type FileEntry, type AppError } from '#tauri-bindings/index';

export type ListDirectoryResult =
  | { ok: true; entries: FileEntry[] }
  | { ok: false; error: AppError };

export type OpenFileResult = { ok: true } | { ok: false; error: AppError };

export interface DirectoryService {
  listDirectory(path: string): Promise<ListDirectoryResult>;
  getInitialDirectory(): Promise<string>;
  openFile(path: string): Promise<OpenFileResult>;
}

export function createDirectoryService(): DirectoryService {
  return {
    async listDirectory(path: string): Promise<ListDirectoryResult> {
      const result = await commands.listDirectory(path);
      if (result.status === 'ok') {
        return { ok: true, entries: result.data };
      }
      return { ok: false, error: result.error };
    },
    async getInitialDirectory(): Promise<string> {
      const result = await commands.getInitialDirectory();
      if (result.status === 'ok') {
        return result.data;
      }
      const err = result.error;
      const msg = 'message' in err ? err.message : `${err.type}: ${err.path}`;
      throw new Error(msg);
    },
    async openFile(path: string): Promise<OpenFileResult> {
      const result = await commands.openFile(path);
      if (result.status === 'ok') {
        return { ok: true };
      }
      return { ok: false, error: result.error };
    }
  };
}
