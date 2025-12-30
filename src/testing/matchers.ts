import { expect } from 'vitest';

expect.extend({
  toContainExactlyInAnyOrder<T>(received: T[], expected: T[]) {
    // if (!Array.isArray(received)) {
    //   return {
    //     message: () => `expected ${received} to be an array`,
    //     pass: false
    //   };
    // }
    //
    // if (!Array.isArray(expected)) {
    //   return {
    //     message: () => `expected ${expected} to be an array`,
    //     pass: false
    //   };
    // }

    if (received.length !== expected.length) {
      return {
        message: () =>
          `expected array length ${received.length} to equal ${expected.length}\n` +
          `received: ${JSON.stringify(received, null, 2)}\n` +
          `expected: ${JSON.stringify(expected, null, 2)}`,
        pass: false
      };
    }

    const receivedCopy = [...received];
    const unmatched: unknown[] = [];

    for (const expectedItem of expected) {
      const index = receivedCopy.findIndex((item) => this.equals(item, expectedItem));
      if (index === -1) {
        unmatched.push(expectedItem);
      } else {
        receivedCopy.splice(index, 1);
      }
    }

    if (unmatched.length > 0 || receivedCopy.length > 0) {
      return {
        message: () => {
          const missing =
            unmatched.length > 0 ? `\nMissing: ${JSON.stringify(unmatched, null, 2)}` : '';
          const extra =
            receivedCopy.length > 0 ? `\nExtra: ${JSON.stringify(receivedCopy, null, 2)}` : '';
          return (
            `arrays do not contain the same elements in any order${missing}${extra}\n` +
            `received: ${JSON.stringify(received, null, 2)}\n` +
            `expected: ${JSON.stringify(expected, null, 2)}`
          );
        },
        pass: false
      };
    }

    return {
      message: () => `expected arrays not to match exactly in any order`,
      pass: true
    };
  }
});

interface CustomMatchers<R = unknown> {
  toContainExactlyInAnyOrder<E = unknown>(expected: readonly E[]): R;
}

declare module 'vitest' {
  // oxlint-disable-next-line no-explicit-any no-empty-object-type -- any coming from the base interface
  interface Assertion<T = any> extends CustomMatchers<T> {}
  // oxlint-disable-next-line no-empty-object-type -- extending the base interface
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
