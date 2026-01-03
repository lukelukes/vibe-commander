import { webdriverio } from '@vitest/browser-webdriverio';
import path from 'path';
import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

const headed = process.env.HEADED === 'true';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          include: ['src/**/*.{test,spec}.ts'],
          exclude: ['src/**/*.property.spec.ts'],
          name: 'unit',
          environment: 'node',
          setupFiles: ['./src/testing/setup.ts']
        }
      },
      {
        test: {
          include: ['src/**/*.property.spec.ts'],
          name: 'property',
          environment: 'node',
          testTimeout: 120000,
          hookTimeout: 30000,
          setupFiles: ['./src/testing/setup.ts']
        }
      },
      {
        plugins: [solid()],
        resolve: {
          alias: {
            // "@vitest-browser-solid/pure": path.resolve(__dirname, "vitest-browser-solid/pure.ts"),
          }
        },
        test: {
          name: 'browser',
          browser: {
            provider: webdriverio(),
            enabled: true,
            headless: !headed,
            instances: [{ browser: 'chrome' }]
          },
          environment: 'node',
          setupFiles: ['./vitest-browser-solid/index.ts', './src/testing/setup.ts'],
          include: ['src/**/*.browser.{test,spec}.{ts,tsx}']
        }
      }
    ]
  }
});
