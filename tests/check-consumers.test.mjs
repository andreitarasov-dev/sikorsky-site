import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, access, symlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { copyConsumer, runCommand } from '../scripts/check-consumers.mjs';

test('disposable consumer preserves source, excludes secrets and caches, and cannot modify original files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'theme-copy-test-'));
  try {
    const source = join(root, 'source');
    const copy = join(root, 'copy');
    await mkdir(join(source, 'src'), { recursive: true });
    for (const name of ['package.json', 'package-lock.json', '.env', '.env.local', 'src/page.astro']) {
      await writeFile(join(source, name), name);
    }
    for (const dir of ['.git', 'node_modules', 'dist', '.astro']) {
      await mkdir(join(source, dir)); await writeFile(join(source, dir, 'excluded'), 'x');
    }
    await copyConsumer(source, copy);
    assert.equal(await readFile(join(copy, 'src/page.astro'), 'utf8'), 'src/page.astro');
    for (const name of ['.env', '.env.local', '.git', 'node_modules', 'dist', '.astro']) {
      await assert.rejects(access(join(copy, name)));
    }
    await writeFile(join(copy, 'package-lock.json'), 'mutated');
    assert.equal(await readFile(join(source, 'package-lock.json'), 'utf8'), 'package-lock.json');
    await assert.rejects(runCommand(process.execPath, ['-e', 'process.exit(4)'], { cwd: copy }));
    assert.equal(await readFile(join(source, 'package.json'), 'utf8'), 'package.json');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('external symlinks cannot pull private files into validation copies', async () => {
  const root = await mkdtemp(join(tmpdir(), 'theme-link-test-'));
  try {
    const source = join(root, 'source');
    await mkdir(source); await writeFile(join(root, 'private'), 'secret');
    await symlink(join(root, 'private'), join(source, 'linked-file'));
    await assert.rejects(copyConsumer(source, join(root, 'copy')), /symbolic link/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('validation strips live Firebase configuration and local theme overrides', async () => {
  const { cleanEnvironment } = await import('../scripts/check-consumers.mjs');
  assert.deepEqual(cleanEnvironment({ PATH: '/bin', PUBLIC_FIREBASE_API_KEY: 'live', PUBLIC_FIREBASE_DATABASE_URL: 'live', SIKORSKY_THEME_DIR: '/local' }), { PATH: '/bin' });
});
