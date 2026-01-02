import type { AppError, OpenFailedReason } from '#tauri-bindings/index';

function formatOpenFailedReason(reason: OpenFailedReason): string {
  switch (reason) {
    case 'PermissionDenied':
      return 'permission denied';
    case 'NotFound':
      return 'file not found';
    case 'NoDefaultApp':
      return 'no default application';
    case 'Unknown':
      return 'unknown error';
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

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
      return `Failed to open ${error.path}: ${formatOpenFailedReason(error.reason)}`;
    default: {
      const _exhaustive: never = error;
      return `Unknown error: ${(error as AppError).type}`;
    }
  }
}
