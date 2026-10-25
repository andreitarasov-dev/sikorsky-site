import { readFile, realpath } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { themeRoot, validateCheckout } from './dev-sites.mjs';

function run(command, args, cwd, env, quiet = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let diagnostics = '';
    child.stdout.on('data', data => { output += data; diagnostics = (diagnostics + data).slice(-8000); if (!quiet) process.stdout.write(data); });
    child.stderr.on('data', data => { diagnostics = (diagnostics + data).slice(-8000); if (!quiet) process.stderr.write(data); });
    child.once('error', reject);
    child.once('close', code => code === 0 ? resolve(output.trim()) : reject(new Error(`${command} ${args.join(' ')} failed (${code}) in ${cwd}\n${diagnostics.trim()}`)));
  });
}
const json = async path => JSON.parse(await readFile(path, 'utf8'));

export async function upgradeSites({ version, andrei, pavel, env = process.env }) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version ?? '')) {
    throw new Error('Provide an exact stable version, for example --version 0.5.4');
  }
  if (env.SIKORSKY_THEME_DIR) throw new Error('Unset SIKORSKY_THEME_DIR before upgrading published dependencies');
  const childEnv = { ...env, PLAYWRIGHT_HTML_OPEN: 'never' };
  const git = (cwd, ...args) => run('git', args, cwd, childEnv, true);
  const sites = [
    { name: 'andreitarasov.dev', path: await realpath(andrei) },
    { name: 'sikorsky.design', path: await realpath(pavel) },
  ];
  if (sites[0].path === sites[1].path) throw new Error('Provide two different site checkouts');
  for (const site of sites) {
    await validateCheckout(site.path, site.name);
    if (await git(site.path, 'status', '--porcelain')) throw new Error(`A clean checkout is required: ${site.path}`);
    if (await git(site.path, 'branch', '--show-current') !== 'main') throw new Error(`Switch ${site.path} to main before upgrading`);
    if ((await git(site.path, 'rev-parse', '--show-toplevel')) !== site.path) throw new Error(`Expected a repository root: ${site.path}`);
    const pkg = await json(join(site.path, 'package.json'));
    if (!pkg.dependencies?.['@sikorsky/site']) throw new Error(`Missing @sikorsky/site dependency: ${site.path}`);
    await readFile(join(site.path, 'package-lock.json'));
    site.head = await git(site.path, 'rev-parse', 'HEAD');
  }
  const published = JSON.parse(await run('npm', ['view', `@sikorsky/site@${version}`, 'version', '--json'], themeRoot, childEnv, true));
  if (published !== version) throw new Error(`Version ${version} is not published`);
  const assertChanges = async site => {
    if (await git(site.path, 'rev-parse', 'HEAD') !== site.head || await git(site.path, 'branch', '--show-current') !== 'main') {
      throw new Error(`Checkout changed during validation: ${site.path}`);
    }
    const changed = [
      ...(await git(site.path, 'diff', 'HEAD', '--name-only')).split('\n'),
      ...(await git(site.path, 'ls-files', '--others', '--exclude-standard')).split('\n'),
    ].filter(Boolean);
    if (changed.some(path => !['package.json', 'package-lock.json'].includes(path))) throw new Error(`Unexpected file changes in ${site.path}; inspect them before committing`);
    const pkg = await json(join(site.path, 'package.json'));
    const lock = await json(join(site.path, 'package-lock.json'));
    const installed = await json(join(site.path, 'node_modules/@sikorsky/site/package.json'));
    if (pkg.dependencies['@sikorsky/site'] !== version || lock.packages?.['']?.dependencies?.['@sikorsky/site'] !== version || lock.packages?.['node_modules/@sikorsky/site']?.version !== version || installed.version !== version) {
      throw new Error(`Installed version or lockfile does not match ${version}: ${site.path}`);
    }
  };
  const dependencyFiles = async site => Promise.all(['package.json', 'package-lock.json'].map(file => readFile(join(site.path, file), 'utf8')));
  const assertValidated = async site => {
    await assertChanges(site);
    const current = await dependencyFiles(site);
    if (current.some((content, index) => content !== site.validated[index])) {
      throw new Error(`Dependency files changed after validation: ${site.path}`);
    }
  };
  const committed = [];
  try {
    for (const site of sites) {
      console.log(`Upgrading and testing ${site.name} with @sikorsky/site@${version}`);
      await run('npm', ['install', '--save-exact', '--no-audit', '--no-fund', `@sikorsky/site@${version}`], site.path, childEnv);
      const installedFiles = await dependencyFiles(site);
      await run('npm', ['run', 'build'], site.path, childEnv);
      await run('npm', ['test', '--', '--global-timeout=600000'], site.path, childEnv);
      await assertChanges(site);
      site.validated = installedFiles;
      await assertValidated(site);
    }
    // Both sites must still be in the validated state before either commit.
    for (const site of sites) await assertValidated(site);
    for (const site of sites) {
      await assertValidated(site);
      if (await git(site.path, 'diff', 'HEAD', '--name-only')) {
        await git(site.path, 'commit', '--only', '-m', `Upgrade @sikorsky/site to ${version}`, '--', 'package.json', 'package-lock.json');
        committed.push(site.name);
      }
    }
    console.log(`Both sites validated. Committed: ${committed.join(', ') || 'already up to date'}. Review and push each main branch to deploy.`);
  } catch (error) {
    console.error(`Upgrade stopped. Commits made: ${committed.join(', ') || 'none'}. Changes are retained for inspection; nothing was pushed.`);
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: {
    version: { type: 'string' },
    andrei: { type: 'string', default: join(themeRoot, '../andreitarasov.dev') },
    pavel: { type: 'string', default: join(themeRoot, '../sikorsky.design') },
  } });
  upgradeSites(values).catch(error => { console.error(error.message); process.exitCode = 1; });
}
