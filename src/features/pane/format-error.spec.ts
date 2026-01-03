import type { AppError } from '#tauri-bindings/index';

import { describe, it, expect } from 'vitest';

import { formatAppError } from './format-error';

describe('formatAppError', () => {
  describe('PermissionDenied', () => {
    it.each([
      { path: '/root/secret', expected: 'Permission denied: /root/secret' },
      { path: '/home/user/.ssh/id_rsa', expected: 'Permission denied: /home/user/.ssh/id_rsa' },
      { path: '', expected: 'Permission denied: ' }
    ])('formats path $path', ({ path, expected }) => {
      const error: AppError = { type: 'PermissionDenied', path };
      expect(formatAppError(error)).toBe(expected);
    });
  });

  describe('NotFound', () => {
    it.each([
      { path: '/nonexistent', expected: 'Not found: /nonexistent' },
      { path: '/path/with spaces/file.txt', expected: 'Not found: /path/with spaces/file.txt' },
      { path: '', expected: 'Not found: ' }
    ])('formats path $path', ({ path, expected }) => {
      const error: AppError = { type: 'NotFound', path };
      expect(formatAppError(error)).toBe(expected);
    });
  });

  describe('InvalidPath', () => {
    it.each([
      { message: 'Path contains null bytes', expected: 'Path contains null bytes' },
      { message: 'Invalid UTF-8 sequence', expected: 'Invalid UTF-8 sequence' },
      { message: '', expected: '' }
    ])('returns message directly: $message', ({ message, expected }) => {
      const error: AppError = { type: 'InvalidPath', message };
      expect(formatAppError(error)).toBe(expected);
    });
  });

  describe('Io', () => {
    it.each([
      { message: 'Device not ready' },
      { message: 'Connection refused' },
      { message: 'Read-only file system' }
    ])('returns message directly: $message', ({ message }) => {
      const error: AppError = { type: 'Io', message, path: null };
      expect(formatAppError(error)).toBe(message);
    });
  });

  describe('OpenFailed', () => {
    it.each([
      { reason: 'PermissionDenied' as const, expected: 'permission denied' },
      { reason: 'NotFound' as const, expected: 'file not found' },
      { reason: 'NoDefaultApp' as const, expected: 'no default application' },
      { reason: 'Unknown' as const, expected: 'unknown error' }
    ])('formats $reason reason', ({ reason, expected }) => {
      const error: AppError = { type: 'OpenFailed', path: '/path/to/file.txt', reason };
      expect(formatAppError(error)).toBe(`Failed to open /path/to/file.txt: ${expected}`);
    });

    it('includes the file path in the message', () => {
      const error: AppError = {
        type: 'OpenFailed',
        path: '/home/user/document.pdf',
        reason: 'NoDefaultApp'
      };
      expect(formatAppError(error)).toBe(
        'Failed to open /home/user/document.pdf: no default application'
      );
    });
  });
});
