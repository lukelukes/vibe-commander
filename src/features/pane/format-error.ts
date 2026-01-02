import type { AppError } from '#tauri-bindings/index';

export function formatAppError(error: AppError): string {
  switch (error.type) {
    case 'PermissionDenied':
      return `Permission denied: ${error.path}`;
    case 'NotFound':
      return `Not found: ${error.path}`;
    case 'InvalidPath':
      return error.message;
    case 'Io':
      return error.message;
    case 'OpenFailed':
      return `Failed to open ${error.path}: ${error.reason}`;
    default: {
      const _exhaustive: never = error;
      return `Unknown error: ${(error as AppError).type}`;
    }
  }
}
