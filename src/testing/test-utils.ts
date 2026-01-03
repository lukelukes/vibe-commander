import { createRoot } from 'solid-js';

export function unwrapError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (typeof err === 'object' && err !== null) {
    return new Error(JSON.stringify(err));
  }
  return new Error(String(err));
}

export async function withReactiveRoot<T>(
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
