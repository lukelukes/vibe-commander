import { invoke } from "@tauri-apps/api/core";

export interface FileEntry {
  name: string;
  path: string;
  size: number;
  modified: number | null;
  is_dir: boolean;
  is_symlink: boolean;
  symlink_target: string | null;
}

export async function listDirectory(path: string): Promise<FileEntry[]> {
  return invoke("list_directory", { path });
}
