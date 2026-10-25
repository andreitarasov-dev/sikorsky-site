import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyRelease } from '../scripts/release.mjs';
const good = {
  version: '0.5.4', requested: '0.5.4', changelog: '## 0.5.4\nFixes',
  report: { status: 'passed', theme: { commit: 'abc', includesLocalChanges: false }, sha256: 'digest', consumers: ['andreitarasov.dev','sikorsky.design','theme-fixture'].map(name => ({ name, status: 'passed', includesLocalChanges: false, themeVersion: '0.5.4' })) },
  commit: 'abc', digest: 'digest',
};
test('release requires matching version, successful checks, clean sources, and the exact validated bytes', () => {
  assert.doesNotThrow(() => verifyRelease(good));
  for (const change of [
    { requested: '0.5.3' }, { changelog: '' }, { digest: 'other' }, { commit: 'other' },
    { report: { ...good.report, status: 'failed' } },
    { report: { ...good.report, consumers: [] } },
    { report: { ...good.report, theme: { commit: 'abc', includesLocalChanges: true } } },
  ]) assert.throws(() => verifyRelease({ ...good, ...change }));
});
