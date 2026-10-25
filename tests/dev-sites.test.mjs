import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { validateCheckout, assertPortAvailable, runServers } from '../scripts/dev-sites.mjs';

test('rejects missing or incorrect consumer checkouts before starting servers', async () => {
  const root = await mkdtemp(join(tmpdir(), 'theme-dev-test-'));
  try {
    await assert.rejects(validateCheckout(join(root, 'missing'), 'sikorsky.design'), /checkout|package.json/);
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'wrong' }));
    await assert.rejects(validateCheckout(root, 'sikorsky.design'), /sikorsky.design/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('occupied port fails instead of silently choosing another port', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await assert.rejects(assertPortAvailable(server.address().port), /in use/); }
  finally { await new Promise(resolve => server.close(resolve)); }
});

test('child failure stops its sibling and leaves dependency files untouched', async () => {
  const root = await mkdtemp(join(tmpdir(), 'theme-process-test-'));
  try {
    const manifest = join(root, 'package.json');
    const lock = join(root, 'package-lock.json');
    await writeFile(manifest, '{"name":"test"}');
    await writeFile(lock, '{}');
    const pidFile = join(root, 'pid');
    const before = await Promise.all([readFile(manifest), readFile(lock)]);
    const result = await runServers([
      { command: process.execPath, args: ['-e', `require('fs').writeFileSync(${JSON.stringify(pidFile)}, String(process.pid)); setInterval(()=>{},1000)`], cwd: root },
      { command: process.execPath, args: ['-e', 'setTimeout(()=>process.exit(3),400)'], cwd: root },
    ]);
    assert.equal(result, 3);
    const pid = Number(await readFile(pidFile, "utf8"));
    assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
    assert.deepEqual(await Promise.all([readFile(manifest), readFile(lock)]), before);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('interruption stops all child servers', async () => {
  const controller = new AbortController();
  const result = runServers([{ command: process.execPath, args: ['-e', 'setInterval(()=>{},1000)'], cwd: tmpdir() }], { signal: controller.signal });
  setTimeout(() => controller.abort(), 200);
  assert.equal(await result, 130);
});

test('a command that cannot start fails promptly', async () => {
  assert.equal(await runServers([{ command: '/no-such-theme-command', args: [], cwd: tmpdir() }]), 1);
});

test('shutdown kills a grandchild even when its direct parent has already exited', async () => {
  const root = await mkdtemp(join(tmpdir(), 'theme-grandchild-test-'));
  let pid;
  try {
    const pidFile = join(root, 'grandchild');
    const grandchild = `process.on('SIGTERM',()=>{});require('fs').writeFileSync(${JSON.stringify(pidFile)},String(process.pid));setInterval(()=>{},1000)`;
    const parent = `require('child_process').spawn(process.execPath,['-e',${JSON.stringify(grandchild)}],{stdio:'ignore'});setTimeout(()=>process.exit(0),500)`;
    await runServers([{ command: process.execPath, args: ['-e', parent], cwd: root }]);
    pid = Number(await readFile(pidFile, 'utf8'));
    let alive = true;
    for (let attempt = 0; attempt < 30; attempt++) {
      try { process.kill(pid, 0); } catch (error) { if (error.code === 'ESRCH') { alive = false; break; } throw error; }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(alive, false, 'Grandchild must not survive launcher shutdown');
  } finally {
    if (pid) { try { process.kill(pid, 'SIGKILL'); } catch {} }
    await rm(root, { recursive: true, force: true });
  }
});
