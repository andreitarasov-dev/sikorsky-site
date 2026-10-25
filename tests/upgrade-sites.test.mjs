import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { upgradeSites } from '../scripts/upgrade-sites.mjs';

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), 'theme-upgrade-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const bin = join(root, 'bin'); await mkdir(bin);
  const npm = join(bin, 'npm');
  await writeFile(npm, `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
if(args[0] === 'view') { console.log(JSON.stringify('0.5.4')); process.exit(0); }
const pkg = JSON.parse(fs.readFileSync('package.json'));
if(args[0] === 'install') {
 pkg.dependencies['@sikorsky/site']='0.5.4';
 fs.writeFileSync('package.json',JSON.stringify(pkg));
 const lock={packages:{'':{dependencies:pkg.dependencies},'node_modules/@sikorsky/site':{version:'0.5.4'}}};
 fs.writeFileSync('package-lock.json',JSON.stringify(lock));
 fs.mkdirSync('node_modules/@sikorsky/site',{recursive:true});
 fs.writeFileSync('node_modules/@sikorsky/site/package.json',JSON.stringify({version:'0.5.4'}));
}
if(args[0] === 'test' && fs.existsSync('fail-test')) process.exit(2);
if(args[0] === 'test' && fs.existsSync('edit-first')) {
 const first='../andreitarasov.dev/package.json'; const edited=JSON.parse(fs.readFileSync(first)); edited.scripts={build:'untested-command'}; fs.writeFileSync(first,JSON.stringify(edited));
}
if(args[0] === 'test' && fs.existsSync('change-source')) fs.writeFileSync('source.txt','unexpected edit');
`);
  await chmod(npm, 0o755);
  const sites=[];
  for(const name of ['andreitarasov.dev','sikorsky.design']) {
    const dir=join(root,name); await mkdir(dir);
    await writeFile(join(dir,'package.json'),JSON.stringify({name,dependencies:{'@sikorsky/site':'0.5.3'}}));
    await writeFile(join(dir,'package-lock.json'),'{}');
    await writeFile(join(dir,'.gitignore'),'node_modules\n');
    await writeFile(join(dir,'source.txt'),'original');
    git(dir,'init','-b','main'); git(dir,'config','user.name','Test'); git(dir,'config','user.email','test@example.invalid');
    git(dir,'add','.'); git(dir,'commit','-qm','Initial'); sites.push(dir);
  }
  return {andrei:sites[0],pavel:sites[1],version:'0.5.4',env:{...process.env,PATH:bin+':'+process.env.PATH}};
}
test('rejects non-exact versions before modifying sites',async t=>{
 const opts=await setup(t); const before=await readFile(join(opts.andrei,'package.json'),'utf8');
 await assert.rejects(upgradeSites({...opts,version:'latest'}),/exact/);
 assert.equal(await readFile(join(opts.andrei,'package.json'),'utf8'),before);
});
test('dirty second checkout stops before changing the first',async t=>{
 const opts=await setup(t); await writeFile(join(opts.pavel,'mine.txt'),'user work');
 await assert.rejects(upgradeSites(opts),/clean/);
 assert.equal(git(opts.andrei,'status','--porcelain'),'');
 assert.equal(await readFile(join(opts.pavel,'mine.txt'),'utf8'),'user work');
});
test('a failing second site leaves both upgrades uncommitted',async t=>{
 const opts=await setup(t); await writeFile(join(opts.pavel,'fail-test'),''); git(opts.pavel,'add','.');git(opts.pavel,'commit','-qm','Fail fixture');
 const before=[git(opts.andrei,'rev-parse','HEAD'),git(opts.pavel,'rev-parse','HEAD')];
 await assert.rejects(upgradeSites(opts),/failed/);
 assert.deepEqual([git(opts.andrei,'rev-parse','HEAD'),git(opts.pavel,'rev-parse','HEAD')],before);
 assert.match(git(opts.andrei,'diff','--name-only'),/package.json/);
});
test('successful validation commits only dependencies in both sites',async t=>{
 const opts=await setup(t); await upgradeSites(opts);
 for(const dir of [opts.andrei,opts.pavel]) {
  assert.equal(git(dir,'status','--porcelain'),'');
  assert.deepEqual(git(dir,'diff-tree','--no-commit-id','--name-only','-r','HEAD').split('\n'),['package-lock.json','package.json']);
  assert.equal(JSON.parse(await readFile(join(dir,'package.json'))).dependencies['@sikorsky/site'],'0.5.4');
 }
});
test('unrelated changes made by build or tests prevent all commits',async t=>{
 const opts=await setup(t); await writeFile(join(opts.pavel,'change-source'),'');git(opts.pavel,'add','.');git(opts.pavel,'commit','-qm','Change fixture');
 const before=git(opts.andrei,'rev-parse','HEAD');
 await assert.rejects(upgradeSites(opts),/Unexpected/);
 assert.equal(git(opts.andrei,'rev-parse','HEAD'),before);
 assert.equal(await readFile(join(opts.pavel,'source.txt'),'utf8'),'unexpected edit');
});

test('dependency edits after validation prevent both commits',async t=>{
 const opts=await setup(t); await writeFile(join(opts.pavel,'edit-first'),'');git(opts.pavel,'add','.');git(opts.pavel,'commit','-qm','Concurrent edit fixture');
 const before=git(opts.andrei,'rev-parse','HEAD');
 await assert.rejects(upgradeSites(opts),/changed after validation/);
 assert.equal(git(opts.andrei,'rev-parse','HEAD'),before);
});
test('a rejected second commit exposes its cause and preserves the first commit',async t=>{
 const opts=await setup(t); const hook=join(opts.pavel,'.git/hooks/pre-commit');
 await writeFile(hook,'#!/bin/sh\necho "Release blocked by test hook" >&2\nexit 1\n');await chmod(hook,0o755);
 const before=[git(opts.andrei,'rev-parse','HEAD'),git(opts.pavel,'rev-parse','HEAD')];
 await assert.rejects(upgradeSites(opts),/Release blocked by test hook/);
 assert.notEqual(git(opts.andrei,'rev-parse','HEAD'),before[0]);
 assert.equal(git(opts.pavel,'rev-parse','HEAD'),before[1]);
 assert.match(git(opts.pavel,'diff','HEAD','--name-only'),/package.json/);
});
