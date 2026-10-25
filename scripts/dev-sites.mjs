import { readFile, access } from 'node:fs/promises';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const themeRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function validateCheckout(directory, expectedName) {
  let pkg;
  try { pkg = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8')); }
  catch { throw new Error(`Cannot read checkout ${directory}/package.json`); }
  if (pkg.name !== expectedName) throw new Error(`Expected ${expectedName} at ${directory}; found ${pkg.name}`);
  return directory;
}

export function assertPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', error => reject(new Error(`Port ${port} is in use or unavailable: ${error.message}`)));
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
}

// Each server owns a process group, including any toolchain children.
export async function runServers(specs, { signal } = {}) {
  const children = [];
  let stopping = false;
  let finish;
  const firstExit = new Promise(resolve => { finish = resolve; });
  const stop = (code = 0) => { if (!stopping) { stopping = true; finish(code); } };
  const onInterrupt = () => stop(130);
  const onTerminate = () => stop(143);
  process.once('SIGINT', onInterrupt);
  process.once('SIGTERM', onTerminate);
  signal?.addEventListener('abort', onInterrupt, { once: true });
  if (signal?.aborted) stop(130);
  for (const spec of specs) {
    if (stopping) break;
    const child = spawn(spec.command, spec.args, {
      cwd: spec.cwd, env: spec.env ?? process.env, stdio: 'inherit', detached: process.platform !== 'win32',
    });
    const closed = new Promise(resolve => {
      child.once('error', error => { console.error(error.message); stop(1); });
      child.once('close', (code, signal) => { stop(code ?? (signal ? 1 : 0)); resolve(); });
    });
    children.push({ child, closed });
  }
  if (!children.length) stop(1);
  const code = await firstExit;
  const kill = signal => {
    for (const { child } of children) {
      if (!child.pid) continue;
      try { process.platform === 'win32' ? child.kill(signal) : process.kill(-child.pid, signal); }
      catch (error) { if (error.code !== 'ESRCH') console.error(error.message); }
    }
  };
  kill('SIGTERM');
  const force = setTimeout(() => kill('SIGKILL'), 2000);
  await Promise.all(children.map(({ closed }) => closed));
  // A direct server may exit before a stubborn descendant. Its process group
  // can still exist, so finish cleanup before cancelling the escalation timer.
  kill('SIGKILL');
  clearTimeout(force);
  process.removeListener('SIGINT', onInterrupt);
  process.removeListener('SIGTERM', onTerminate);
  signal?.removeEventListener('abort', onInterrupt);
  return code;
}

export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: { andrei: { type: 'string' }, pavel: { type: 'string' } } });
  const sites = [
    { name: 'andreitarasov.dev', directory: resolve(values.andrei ?? join(themeRoot, '../andreitarasov.dev')), port: 4321 },
    { name: 'sikorsky.design', directory: resolve(values.pavel ?? join(themeRoot, '../sikorsky.design')), port: 4322 },
  ];
  await validateCheckout(themeRoot, '@sikorsky/site');
  for (const site of sites) {
    await validateCheckout(site.directory, site.name);
    await assertPortAvailable(site.port);
    try { await access(join(site.directory, 'node_modules/astro/astro.js')); }
    catch { throw new Error(`Run npm ci in ${site.directory} before previewing.`); }
  }
  console.log('Local theme:', themeRoot);
  console.log('Restart this command after changing theme integration/configuration. CSS and components reload automatically.');
  for (const site of sites) console.log(`${site.name}: http://127.0.0.1:${site.port}`);
  return runServers(sites.map(site => ({
    command: process.execPath,
    args: [join(site.directory, 'node_modules/astro/astro.js'), 'dev', '--host', '127.0.0.1', '--port', String(site.port)],
    cwd: site.directory,
    env: { ...process.env, SIKORSKY_THEME_DIR: themeRoot },
  })));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(code => { process.exitCode = code; }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
