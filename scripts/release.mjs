import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCommand } from './check-consumers.mjs';

export function verifyRelease({ version, requested, changelog, report, commit, digest }) {
  assert.match(requested, /^\d+\.\d+\.\d+$/);
  assert.equal(version, requested, 'Requested version must match package.json');
  assert.ok(changelog.split('\n').includes(`## ${version}`), 'Version needs a changelog entry');
  assert.equal(report.status, 'passed');
  assert.equal(report.theme.commit, commit, 'Validation must belong to this exact commit');
  assert.equal(report.theme.includesLocalChanges, false, 'Release sources must be clean');
  assert.equal(report.sha256, digest, 'Publish only the validated tarball');
  for (const name of ['andreitarasov.dev', 'sikorsky.design', 'theme-fixture']) {
    const consumer = report.consumers.find(item => item.name === name);
    assert.ok(consumer, `Missing validation for ${name}`);
    assert.equal(consumer.status, 'passed');
    assert.equal(consumer.themeVersion, version);
    assert.equal(consumer.includesLocalChanges, false, `${name} must be a committed checkout`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [requested, artifactDir] = process.argv.slice(2);
  try {
    const pkg = JSON.parse(await readFile('package.json', 'utf8'));
    const report = JSON.parse(await readFile(join(artifactDir, 'validation.json'), 'utf8'));
    const tarball = join(artifactDir, `sikorsky-site-${pkg.version}.tgz`);
    verifyRelease({
      version: pkg.version, requested, report,
      changelog: await readFile('CHANGELOG.md', 'utf8'),
      commit: (await runCommand('git', ['rev-parse', 'HEAD'])).trim(),
      digest: createHash('sha256').update(await readFile(tarball)).digest('hex'),
    });
    const versions = JSON.parse(await runCommand('npm', ['view', '@sikorsky/site', 'versions', '--json']));
    assert.ok(![].concat(versions).includes(requested), `Version ${requested} is already published; choose a new version`);
    console.log(`Verified release candidate: ${tarball}`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
