import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface FixtureSpec {
  [name: string]: string | FixtureSpec;
}

export interface TestFixture {
  path: string;
  cleanup: () => Promise<void>;
}

export async function createTestFixture(spec: FixtureSpec): Promise<TestFixture> {
  const fixtureRoot = join(tmpdir(), `vibecommander-e2e-${randomUUID()}`);
  await mkdir(fixtureRoot, { recursive: true });

  await buildFixtureTree(fixtureRoot, spec);

  return {
    path: fixtureRoot,
    cleanup: () => rm(fixtureRoot, { recursive: true, force: true })
  };
}

async function buildFixtureTree(basePath: string, spec: FixtureSpec): Promise<void> {
  for (const [key, value] of Object.entries(spec)) {
    const fullPath = join(basePath, key);

    if (typeof value === 'string') {
      await mkdir(join(fullPath, '..'), { recursive: true });
      await writeFile(fullPath, value);
    } else if (key.endsWith('/')) {
      await mkdir(fullPath, { recursive: true });
    } else {
      await mkdir(fullPath, { recursive: true });
      await buildFixtureTree(fullPath, value);
    }
  }
}
