import { cp, lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { themeRoot, validateCheckout } from './dev-sites.mjs';

const excluded = new Set(['.git', 'node_modules', 'dist', '.astro', '.claude', '.superpowers', '.artifacts', 'playwright-report', 'test-results']);
export async function copyConsumer(source, destination) {
  await cp(source, destination, {
    recursive: true,
    filter: async path => {
      const name = basename(path);
      if (excluded.has(name) || name.startsWith('.env')) return false;
      if ((await lstat(path)).isSymbolicLink()) throw new Error(`Refusing symbolic link in consumer source: ${path}`);
      return true;
    },
  });
}

export function cleanEnvironment(env = process.env) {
  return Object.fromEntries(Object.entries(env).filter(([key]) =>
    key !== 'SIKORSKY_THEME_DIR' && !key.startsWith('PUBLIC_FIREBASE_')));
}

export function runCommand(command, args, { cwd, env = cleanEnvironment(), logFile } = {}) {
  return new Promise((resolve, reject) => {
    const log = logFile ? createWriteStream(logFile, { flags: 'a' }) : null;
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', data => { output += data; log?.write(data); });
    child.stderr.on('data', data => { log?.write(data); if (!log) process.stderr.write(data); });
    child.once('error', error => { log?.end(); reject(error); });
    child.once('close', code => {
      log?.end();
      code === 0 ? resolve(output) : reject(new Error(`${command} ${args.join(' ')} failed (${code})${logFile ? `; see ${logFile}` : ''}`));
    });
  });
}

async function revision(directory) {
  try {
    const commit = (await runCommand('git', ['rev-parse', 'HEAD'], { cwd: directory })).trim();
    const dirty = Boolean((await runCommand('git', ['status', '--porcelain'], { cwd: directory })).trim());
    return { commit, includesLocalChanges: dirty };
  } catch { return { commit: null, includesLocalChanges: true }; }
}

export async function checkConsumers({ andrei, pavel, artifactDir, tarball }) {
  // Preflight before copying or running any install.
  const sites = [
    { name: 'andreitarasov.dev', source: resolve(andrei), route: '/' },
    { name: 'sikorsky.design', source: resolve(pavel), route: '/autoload/' },
    { name: 'theme-fixture', source: join(themeRoot, 'fixtures/site'), route: '/long/' },
  ];
  for (const site of sites) await validateCheckout(site.source, site.name);
  const workspace = await mkdtemp(join(tmpdir(), 'sikorsky-check-'));
  const artifacts = resolve(artifactDir ?? join(themeRoot, '.artifacts', basename(workspace)));
  await mkdir(artifacts, { recursive: true });
  const report = { theme: await revision(themeRoot), node: process.version, consumers: [], status: 'running' };
  try {
    if (!tarball) {
      const packed = JSON.parse(await runCommand('npm', ['pack', '--json', '--pack-destination', artifacts], { cwd: themeRoot }));
      tarball = join(artifacts, packed[0].filename);
    }
    tarball = resolve(tarball);
    report.tarball = basename(tarball);
    report.sha256 = createHash('sha256').update(await readFile(tarball)).digest('hex');
    console.log(`Validating ${tarball}`);
    for (const site of sites) {
      const destination = join(workspace, site.name);
      const logFile = join(artifacts, `${site.name}.log`);
      const entry = { name: site.name, ...await revision(site.source), status: 'running' };
      report.consumers.push(entry);
      console.log(`Checking ${site.name} (${entry.commit ?? 'fixture'}${entry.includesLocalChanges ? ', includes local changes' : ''})`);
      await copyConsumer(site.source, destination);
      await runCommand('npm', ['ci', '--no-audit', '--no-fund'], { cwd: destination, logFile });
      await runCommand('npm', ['install', '--no-save', '--no-audit', '--no-fund', tarball], { cwd: destination, logFile });
      const installedPath = join(destination, 'node_modules/@sikorsky/site');
      if ((await lstat(installedPath)).isSymbolicLink()) throw new Error('Validation requires an installed tarball, not a symlink');
      const installed = JSON.parse(await readFile(join(installedPath, 'package.json'), 'utf8'));
      const expected = JSON.parse(await readFile(join(themeRoot, 'package.json'), 'utf8'));
      if (installed.name !== expected.name || installed.version !== expected.version) throw new Error('Installed theme version does not match checkout');
      entry.themeVersion = installed.version;
      await runCommand('npm', ['run', 'build'], { cwd: destination, logFile });
      await runCommand(process.execPath, [join(themeRoot, 'scripts/smoke-site.mjs'), destination, site.route], { cwd: themeRoot, logFile });
      if (site.name === 'theme-fixture') {
        const fixtureEnv = { ...cleanEnvironment(), THEME_FIXTURE_DIR: destination };
        await runCommand('npm', ['run', 'test:fixture'], { cwd: themeRoot, env: fixtureEnv, logFile });
        const mockEnv = { ...fixtureEnv, THEME_MOCK_LIKES: '1', PUBLIC_FIREBASE_API_KEY: 'fixture-key', PUBLIC_FIREBASE_DATABASE_URL: 'https://fixture.invalid', PUBLIC_FIREBASE_PROJECT_ID: 'fixture' };
        await runCommand('npm', ['run', 'build'], { cwd: destination, env: mockEnv, logFile });
        await runCommand('npm', ['run', 'test:fixture'], { cwd: themeRoot, env: mockEnv, logFile });
      }
      entry.status = 'passed';
    }
    report.status = 'passed';
    await rm(workspace, { recursive: true, force: true });
    console.log(`All checks passed. Tarball and evidence: ${artifacts}`);
  } catch (error) {
    report.status = 'failed'; report.error = error.message; report.workspace = workspace;
    console.error(`Validation failed. Logs: ${artifacts}\nDisposable files retained at ${workspace}; remove that directory after investigating.`);
    throw error;
  } finally {
    await writeFile(join(artifacts, 'validation.json'), JSON.stringify(report, null, 2) + '\n');
  }
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: {
    andrei: { type: 'string', default: join(themeRoot, '../andreitarasov.dev') },
    pavel: { type: 'string', default: join(themeRoot, '../sikorsky.design') },
    'artifact-dir': { type: 'string' }, tarball: { type: 'string' },
  } });
  checkConsumers({ ...values, artifactDir: values['artifact-dir'] }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
