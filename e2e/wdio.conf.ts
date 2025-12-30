import type { Options } from '@wdio/types';

import { spawn, type ChildProcess } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createTestFixture, type TestFixture } from './fixtures/index.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(__dirname, '../src-tauri/target/release/vibe-commander');

let tauriDriver: ChildProcess;
let testFixture: TestFixture;

export const config: Options.Testrunner = {
  hostname: '127.0.0.1',
  port: 4444,
  specs: ['./specs/**/*.ts'],
  exclude: [],
  maxInstances: 1,
  capabilities: [
    {
      'tauri:options': {
        application: appPath
      }
    }
  ],
  logLevel: 'warn',
  bail: 0,
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000
  },

  onPrepare: async function () {
    testFixture = await createTestFixture({
      'documents/': {},
      'documents/notes.txt': 'some notes',
      'downloads/': {},
      'file.txt': 'hello world',
      'readme.md': '# Test',
      '.hidden': 'hidden file'
    });

    process.env.VIBECOMMANDER_START_DIR = testFixture.path;

    const tauriDriverPath = path.resolve(os.homedir(), '.cargo', 'bin', 'tauri-driver');
    tauriDriver = spawn(tauriDriverPath, [], {
      stdio: [null, process.stdout, process.stderr],
      env: {
        ...process.env,
        VIBECOMMANDER_START_DIR: testFixture.path
      }
    });
  },

  onComplete: async function () {
    tauriDriver.kill();
    await testFixture.cleanup();
  }
};

export { testFixture };
